import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from './types';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const electronAPI: ElectronAPI = {
  // Window management
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),

  // System operations
  getSystemInfo: () => ipcRenderer.invoke('system:info'),
  openExternal: (url: string) => ipcRenderer.invoke('system:openExternal', url),
  showItemInFolder: (path: string) => ipcRenderer.invoke('system:showItemInFolder', path),

  // File operations
  selectFile: (options) => ipcRenderer.invoke('file:select', options),
  selectFiles: (options) => ipcRenderer.invoke('file:selectMultiple', options),
  selectDirectory: (options) => ipcRenderer.invoke('file:selectDirectory', options),
  saveFile: (options) => ipcRenderer.invoke('file:save', options),

  // Notifications
  showNotification: (options) => ipcRenderer.invoke('notification:show', options),

  // Store operations
  store: {
    get: <T>(key: string) => ipcRenderer.invoke('store:get', key) as Promise<T | undefined>,
    set: <T>(key: string, value: T) => ipcRenderer.invoke('store:set', key, value),
    delete: (key: string) => ipcRenderer.invoke('store:delete', key),
    clear: () => ipcRenderer.invoke('store:clear'),
  },

  // Backend server management
  backend: {
    start: () => ipcRenderer.invoke('backend:start'),
    stop: () => ipcRenderer.invoke('backend:stop'),
    getStatus: () => ipcRenderer.invoke('backend:status'),
  },

  // Event listeners
  on: (channel: string, callback: (...args: any[]) => void) => {
    const validChannels = [
      'window:maximized',
      'window:unmaximized',
      'backend:started',
      'backend:stopped',
      'backend:error',
      'notification:clicked',
      'update:available',
      'update:downloaded',
    ];
    
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => callback(...args));
    }
  },

  off: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, callback);
  },

  once: (channel: string, callback: (...args: any[]) => void) => {
    const validChannels = [
      'window:maximized',
      'window:unmaximized',
      'backend:started',
      'backend:stopped',
      'backend:error',
      'notification:clicked',
      'update:available',
      'update:downloaded',
    ];
    
    if (validChannels.includes(channel)) {
      ipcRenderer.once(channel, (_event, ...args) => callback(...args));
    }
  },
};

// Use contextBridge to expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Log preload script loaded
console.log('[Preload] Context bridge established');