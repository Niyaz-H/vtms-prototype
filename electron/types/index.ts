export interface ElectronAPI {
  // Window management
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  isMaximized: () => Promise<boolean>;

  // System operations
  getSystemInfo: () => Promise<SystemInfo>;
  openExternal: (url: string) => Promise<void>;
  showItemInFolder: (path: string) => Promise<void>;

  // File operations
  selectFile: (options?: FileDialogOptions) => Promise<string | null>;
  selectFiles: (options?: FileDialogOptions) => Promise<string[] | null>;
  selectDirectory: (options?: DirectoryDialogOptions) => Promise<string | null>;
  saveFile: (options?: SaveDialogOptions) => Promise<string | null>;

  // Notifications
  showNotification: (options: NotificationOptions) => Promise<void>;

  // Store operations
  store: {
    get: <T>(key: string) => Promise<T | undefined>;
    set: <T>(key: string, value: T) => Promise<void>;
    delete: (key: string) => Promise<void>;
    clear: () => Promise<void>;
  };

  // Backend server management
  backend: {
    start: () => Promise<{ port: number; pid: number }>;
    stop: () => Promise<void>;
    getStatus: () => Promise<BackendStatus>;
  };

  // Event listeners
  on: (channel: string, callback: (...args: any[]) => void) => void;
  off: (channel: string, callback: (...args: any[]) => void) => void;
  once: (channel: string, callback: (...args: any[]) => void) => void;
}

export interface SystemInfo {
  platform: string;
  arch: string;
  version: string;
  appVersion: string;
  electronVersion: string;
  chromeVersion: string;
  nodeVersion: string;
}

export interface FileDialogOptions {
  title?: string;
  defaultPath?: string;
  buttonLabel?: string;
  filters?: FileFilter[];
  properties?: Array<'openFile' | 'multiSelections' | 'showHiddenFiles'>;
}

export interface DirectoryDialogOptions {
  title?: string;
  defaultPath?: string;
  buttonLabel?: string;
  properties?: Array<'openDirectory' | 'createDirectory' | 'showHiddenFiles'>;
}

export interface SaveDialogOptions {
  title?: string;
  defaultPath?: string;
  buttonLabel?: string;
  filters?: FileFilter[];
}

export interface FileFilter {
  name: string;
  extensions: string[];
}

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  silent?: boolean;
  urgency?: 'normal' | 'critical' | 'low';
}

export interface BackendStatus {
  running: boolean;
  port?: number;
  pid?: number;
  uptime?: number;
}

export interface WindowState {
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  isMaximized: boolean;
  isFullScreen: boolean;
}

export interface AppConfig {
  windowState?: WindowState;
  theme?: 'light' | 'dark' | 'system';
  autoStart?: boolean;
  minimizeToTray?: boolean;
  startMinimized?: boolean;
  backendPort?: number;
  enableNotifications?: boolean;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}