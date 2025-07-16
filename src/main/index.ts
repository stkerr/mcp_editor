import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import { setupConfigHandlers } from './config-manager';
import { WebhookServer } from './webhook-server';
import { 
  getClaudeCodeConfigPath,
  readClaudeCodeConfig,
  mergeHooksConfiguration,
  createConfigBackup,
  writeClaudeCodeConfig
} from './hooks-config-helpers';
import { IPC_CHANNELS } from '../shared/constants';
import { ClaudeCodeHooks } from '../shared/types';

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
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: inputData
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
  }

  app.whenReady().then(async () => {
    setupConfigHandlers();
    
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
    
    // Start webhook server
    try {
      webhookServer = new WebhookServer(3001);
      await webhookServer.start();
      console.log('Webhook server started successfully');
    } catch (error) {
      console.error('Failed to start webhook server:', error);
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