import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import { setupConfigHandlers } from './config-manager';
import { WebhookServer } from './webhook-server';

let mainWindow: BrowserWindow | null = null;
let webhookServer: WebhookServer | null = null;

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
    icon: join(__dirname, '../../resources/icon.png')
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
