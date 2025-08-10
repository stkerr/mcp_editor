import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import fixPath from 'fix-path';
import { setupConfigHandlers } from './config-manager';
import { WebhookServer } from './webhook-server';
import { setupUsageHandlers } from './usage-handlers';
import { 
  getClaudeCodeConfigPath,
  readClaudeCodeConfig,
  mergeHooksConfiguration,
  createConfigBackup,
  writeClaudeCodeConfig,
  checkHooksConfigured
} from './hooks-config-helpers';
import { promptHierarchyManager } from './file-operations';
import { IPC_CHANNELS } from '../shared/constants';
import { ClaudeCodeHooks } from '../shared/types';

// Fix PATH for macOS to include Homebrew paths
if (process.platform === 'darwin') {
  fixPath();
}

let mainWindow: BrowserWindow | null = null;
let webhookServer: WebhookServer | null = null;

// Handle --webhook argument for Claude Code hooks
function handleWebhookArgument() {
  const args = process.argv;
  const webhookIndex = args.findIndex(arg => arg === '--webhook');
  
  if (webhookIndex !== -1 && webhookIndex + 1 < args.length) {
    const webhookUrl = args[webhookIndex + 1];
    
    // Read stdin for the event data
    let inputData = '';
    process.stdin.setEncoding('utf8');
    
    process.stdin.on('data', (chunk) => {
      inputData += chunk;
    });
    
    process.stdin.on('end', async () => {
      try {
        // Forward the event to the webhook URL
        // Use http module instead of fetch for better reliability with localhost
        const http = await import('http');
        const url = new URL(webhookUrl);
        
        const response = await new Promise<{ ok: boolean; status: number }>((resolve, reject) => {
          const req = http.request({
            hostname: url.hostname,
            port: url.port || 80,
            path: url.pathname,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(inputData)
            }
          }, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
              resolve({
                ok: res.statusCode >= 200 && res.statusCode < 300,
                status: res.statusCode || 0
              });
            });
          });
          
          req.on('error', (err) => {
            console.error('HTTP request error:', err);
            reject(err);
          });
          
          req.write(inputData);
          req.end();
        });
        
        if (!response.ok) {
          console.error(`Failed to forward webhook: ${response.status}`);
          process.exit(1);
        }
        
        process.exit(0);
      } catch (error) {
        console.error('Error handling webhook:', error);
        process.exit(1);
      }
    });
    
    // Set a timeout
    setTimeout(() => {
      console.error('Timeout waiting for stdin');
      process.exit(1);
    }, 5000);
    
    return true;
  }
  
  return false;
}

// Check for webhook argument FIRST, before any Electron initialization
if (handleWebhookArgument()) {
  // We're in webhook mode - the handler will exit the process
  // Don't initialize Electron app
} else {
  // Normal app mode - initialize Electron
  
  function createWindow() {
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false
      },
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
      trafficLightPosition: { x: 16, y: 16 },
      icon: app.isPackaged 
        ? join(process.resourcesPath, 'icon.png')
        : join(__dirname, '../../resources/icon.png')
    });

    if (process.env.NODE_ENV === 'development') {
      mainWindow.loadURL('http://localhost:5173');
    } else {
      mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
    }

    mainWindow.on('closed', () => {
      mainWindow = null;
    });

    // Send webhook server status once window is ready
    mainWindow.webContents.on('did-finish-load', () => {
      if (webhookServer) {
        mainWindow?.webContents.send(IPC_CHANNELS.WEBHOOK_SERVER_STATUS, {
          status: 'running',
          port: 3001,
          message: 'Webhook server is running on port 3001'
        });
      } else {
        mainWindow?.webContents.send(IPC_CHANNELS.WEBHOOK_SERVER_STATUS, {
          status: 'not_started',
          port: 3001,
          message: 'Webhook server is not running'
        });
      }
    });
  }

  app.whenReady().then(async () => {
    setupConfigHandlers();
    setupUsageHandlers();
    
    // Handle check-hooks-configured IPC
    ipcMain.handle(IPC_CHANNELS.CHECK_HOOKS_CONFIGURED, async (_, hooks: ClaudeCodeHooks) => {
      try {
        const configured = await checkHooksConfigured(hooks);
        return { success: true, configured };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });
    
    // Handle apply-hooks-to-config IPC
    ipcMain.handle(IPC_CHANNELS.APPLY_HOOKS_TO_CONFIG, async (_, newHooks: ClaudeCodeHooks) => {
      try {
        // 1. Read existing config
        const configPath = getClaudeCodeConfigPath();
        const existingConfig = await readClaudeCodeConfig();
        
        // 2. Merge new hooks configuration
        const mergedConfig = mergeHooksConfiguration(existingConfig, newHooks);
        
        // 3. Create backup
        const backupPath = await createConfigBackup(configPath);
        
        // 4. Write updated config
        await writeClaudeCodeConfig(configPath, mergedConfig);
        
        // 5. Return success status with backup path
        return { 
          success: true, 
          message: 'Hooks configuration successfully applied',
          backupPath: backupPath || undefined
        };
      } catch (error) {
        // Return error status
        return { 
          success: false, 
          error: `Failed to apply hooks configuration: ${(error as Error).message}` 
        };
      }
    });
    
    // Set up global prompt hierarchy manager
    (global as any).promptHierarchyManager = promptHierarchyManager;
    
    // Start webhook server
    try {
      webhookServer = new WebhookServer(3001);
      await webhookServer.start();
      console.log('Webhook server started successfully');
      
      // Store webhook server globally so IPC handlers can access it
      (global as any).webhookServer = webhookServer;
      console.log('[MAIN DEBUG] Webhook server stored globally at', new Date().toISOString());
      console.log('[MAIN DEBUG] Global webhook server verification:', {
        stored: !!((global as any).webhookServer),
        hasGetDAGState: !!((global as any).webhookServer?.getDAGState),
        serverPort: webhookServer.getPort()
      });
      
      // Send status to any existing windows
      const windows = BrowserWindow.getAllWindows();
      windows.forEach(window => {
        if (window && !window.isDestroyed()) {
          window.webContents.send(IPC_CHANNELS.WEBHOOK_SERVER_STATUS, {
            status: 'running',
            port: 3001,
            message: 'Webhook server started successfully on port 3001'
          });
        }
      });
    } catch (error) {
      console.error('Failed to start webhook server:', error);
      
      // Send error status to any existing windows
      const windows = BrowserWindow.getAllWindows();
      windows.forEach(window => {
        if (window && !window.isDestroyed()) {
          window.webContents.send(IPC_CHANNELS.WEBHOOK_SERVER_STATUS, {
            status: 'error',
            port: 3001,
            message: `Failed to start webhook server: ${error instanceof Error ? error.message : 'Unknown error'}`,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      });
    }
    
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  app.on('window-all-closed', async () => {
    if (webhookServer) {
      try {
        await webhookServer.stop();
        console.log('Webhook server stopped');
      } catch (error) {
        console.error('Error stopping webhook server:', error);
      }
    }
    
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('before-quit', async () => {
    if (webhookServer) {
      try {
        await webhookServer.stop();
        console.log('Webhook server stopped before quit');
      } catch (error) {
        console.error('Error stopping webhook server before quit:', error);
      }
    }
  });
}