import { app, BrowserWindow, ipcMain, shell, dialog, Notification, Menu, Tray, nativeImage } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { ChildProcess, fork } from 'child_process';
import Store from 'electron-store';
import type { AppConfig, WindowState, BackendStatus } from './types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize electron-store for persistent config
const store = new Store<AppConfig>({
  name: 'vtms-config',
  defaults: {
    theme: 'system',
    autoStart: false,
    minimizeToTray: true,
    startMinimized: false,
    backendPort: 3001,
    enableNotifications: true,
  },
});

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let backendProcess: ChildProcess | null = null;
let backendPort = 3001;

const isDev = process.env.NODE_ENV === 'development';
const PRELOAD_PATH = join(__dirname, 'preload.js');
const RENDERER_DIST = join(__dirname, '../frontend/dist');

function createWindow(): void {
  // Restore previous window state
  const windowState = store.get('windowState') as WindowState | undefined;
  
  mainWindow = new BrowserWindow({
    width: windowState?.bounds.width || 1400,
    height: windowState?.bounds.height || 900,
    x: windowState?.bounds.x,
    y: windowState?.bounds.y,
    minWidth: 1024,
    minHeight: 768,
    title: 'VTMS Desktop',
    show: false,
    backgroundColor: '#1e293b',
    webPreferences: {
      preload: PRELOAD_PATH,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  });

  // Restore maximized state
  if (windowState?.isMaximized) {
    mainWindow.maximize();
  }

  // Save window state on close
  mainWindow.on('close', () => {
    if (mainWindow) {
      const bounds = mainWindow.getBounds();
      const isMaximized = mainWindow.isMaximized();
      const isFullScreen = mainWindow.isFullScreen();
      
      store.set('windowState', {
        bounds,
        isMaximized,
        isFullScreen,
      });
    }
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(RENDERER_DIST, 'index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Handle window maximize/unmaximize events
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window:maximized');
  });

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window:unmaximized');
  });

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray(): void {
  const iconPath = join(__dirname, '../build/icon.png');
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  
  tray = new Tray(icon);
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show VTMS',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    {
      label: 'Hide VTMS',
      click: () => {
        mainWindow?.hide();
      },
    },
    { type: 'separator' },
    {
      label: 'Backend Status',
      enabled: false,
    },
    {
      label: backendProcess ? '● Running' : '○ Stopped',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ]);
  
  tray.setToolTip('VTMS Desktop');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    mainWindow?.isVisible() ? mainWindow.hide() : mainWindow?.show();
  });
}

async function startBackendServer(): Promise<{ port: number; pid: number }> {
  return new Promise((resolve, reject) => {
    const backendPath = isDev
      ? join(__dirname, '../backend/src/index.ts')
      : join(__dirname, '../backend/dist/index.js');

    backendProcess = fork(backendPath, [], {
      env: {
        ...process.env,
        PORT: backendPort.toString(),
        NODE_ENV: isDev ? 'development' : 'production',
      },
      silent: false,
    });

    backendProcess.on('error', (err) => {
      console.error('[Backend] Failed to start:', err);
      mainWindow?.webContents.send('backend:error', err.message);
      reject(err);
    });

    backendProcess.on('exit', (code) => {
      console.log(`[Backend] Process exited with code ${code}`);
      backendProcess = null;
      mainWindow?.webContents.send('backend:stopped');
    });

    // Wait for backend to be ready
    setTimeout(() => {
      if (backendProcess && backendProcess.pid) {
        console.log(`[Backend] Started on port ${backendPort} (PID: ${backendProcess.pid})`);
        mainWindow?.webContents.send('backend:started', { port: backendPort, pid: backendProcess.pid });
        resolve({ port: backendPort, pid: backendProcess.pid });
      } else {
        reject(new Error('Backend failed to start'));
      }
    }, 2000);
  });
}

async function stopBackendServer(): Promise<void> {
  return new Promise((resolve) => {
    if (backendProcess) {
      backendProcess.once('exit', () => {
        backendProcess = null;
        resolve();
      });
      backendProcess.kill();
    } else {
      resolve();
    }
  });
}

// IPC Handlers
function setupIPCHandlers(): void {
  // Window management
  ipcMain.handle('window:minimize', () => {
    mainWindow?.minimize();
  });

  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.handle('window:close', () => {
    mainWindow?.close();
  });

  ipcMain.handle('window:isMaximized', () => {
    return mainWindow?.isMaximized() || false;
  });

  // System operations
  ipcMain.handle('system:info', () => {
    return {
      platform: process.platform,
      arch: process.arch,
      version: process.version,
      appVersion: app.getVersion(),
      electronVersion: process.versions.electron,
      chromeVersion: process.versions.chrome,
      nodeVersion: process.versions.node,
    };
  });

  ipcMain.handle('system:openExternal', async (_event, url: string) => {
    await shell.openExternal(url);
  });

  ipcMain.handle('system:showItemInFolder', async (_event, path: string) => {
    shell.showItemInFolder(path);
  });

  // File operations
  ipcMain.handle('file:select', async (_event, options) => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      ...options,
      properties: ['openFile'],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('file:selectMultiple', async (_event, options) => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      ...options,
      properties: ['openFile', 'multiSelections'],
    });
    return result.canceled ? null : result.filePaths;
  });

  ipcMain.handle('file:selectDirectory', async (_event, options) => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      ...options,
      properties: ['openDirectory'],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('file:save', async (_event, options) => {
    const result = await dialog.showSaveDialog(mainWindow!, options);
    return result.canceled ? null : result.filePath;
  });

  // Notifications
  ipcMain.handle('notification:show', async (_event, options) => {
    const notification = new Notification({
      title: options.title,
      body: options.body,
      icon: options.icon,
      silent: options.silent,
      urgency: options.urgency,
    });
    notification.show();
  });

  // Store operations
  ipcMain.handle('store:get', (_event, key: string) => {
    return store.get(key);
  });

  ipcMain.handle('store:set', (_event, key: string, value: any) => {
    store.set(key, value);
  });

  ipcMain.handle('store:delete', (_event, key: string) => {
    store.delete(key as any);
  });

  ipcMain.handle('store:clear', () => {
    store.clear();
  });

  // Backend server management
  ipcMain.handle('backend:start', async () => {
    return await startBackendServer();
  });

  ipcMain.handle('backend:stop', async () => {
    await stopBackendServer();
  });

  ipcMain.handle('backend:status', (): BackendStatus => {
    return {
      running: backendProcess !== null,
      port: backendProcess ? backendPort : undefined,
      pid: backendProcess?.pid,
    };
  });
}

// App lifecycle
app.whenReady().then(async () => {
  setupIPCHandlers();
  createWindow();
  createTray();

  // Start backend server automatically
  try {
    await startBackendServer();
  } catch (error) {
    console.error('[Main] Failed to start backend:', error);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  await stopBackendServer();
});

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('[Main] Uncaught exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('[Main] Unhandled rejection:', error);
});