import type { ElectronAPI } from '../../../electron/types';

/**
 * Electron API service
 * Provides a safe way to access Electron APIs in the renderer process
 */
class ElectronService {
  private api: ElectronAPI | null = null;

  constructor() {
    // Check if running in Electron environment
    if (typeof window !== 'undefined' && window.electronAPI) {
      this.api = window.electronAPI;
    }
  }

  /**
   * Check if running in Electron
   */
  isElectron(): boolean {
    return this.api !== null;
  }

  /**
   * Window management
   */
  async minimizeWindow(): Promise<void> {
    await this.api?.minimizeWindow();
  }

  async maximizeWindow(): Promise<void> {
    await this.api?.maximizeWindow();
  }

  async closeWindow(): Promise<void> {
    await this.api?.closeWindow();
  }

  async isMaximized(): Promise<boolean> {
    return (await this.api?.isMaximized()) || false;
  }

  /**
   * System operations
   */
  async getSystemInfo() {
    return await this.api?.getSystemInfo();
  }

  async openExternal(url: string): Promise<void> {
    if (this.isElectron()) {
      await this.api?.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  }

  async showItemInFolder(path: string): Promise<void> {
    await this.api?.showItemInFolder(path);
  }

  /**
   * File operations
   */
  async selectFile(options?: any): Promise<string | null> {
    return (await this.api?.selectFile(options)) || null;
  }

  async selectFiles(options?: any): Promise<string[] | null> {
    return (await this.api?.selectFiles(options)) || null;
  }

  async selectDirectory(options?: any): Promise<string | null> {
    return (await this.api?.selectDirectory(options)) || null;
  }

  async saveFile(options?: any): Promise<string | null> {
    return (await this.api?.saveFile(options)) || null;
  }

  /**
   * Notifications
   */
  async showNotification(title: string, body: string, options?: Partial<any>): Promise<void> {
    if (this.isElectron()) {
      await this.api?.showNotification({
        title,
        body,
        ...options,
      });
    } else {
      // Fallback to web notifications
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, ...options });
      }
    }
  }

  /**
   * Store operations
   */
  async storeGet<T>(key: string): Promise<T | undefined> {
    return await this.api?.store.get<T>(key);
  }

  async storeSet<T>(key: string, value: T): Promise<void> {
    await this.api?.store.set<T>(key, value);
  }

  async storeDelete(key: string): Promise<void> {
    await this.api?.store.delete(key);
  }

  async storeClear(): Promise<void> {
    await this.api?.store.clear();
  }

  /**
   * Backend server management
   */
  async startBackend(): Promise<{ port: number; pid: number } | null> {
    return (await this.api?.backend.start()) || null;
  }

  async stopBackend(): Promise<void> {
    await this.api?.backend.stop();
  }

  async getBackendStatus() {
    return await this.api?.backend.getStatus();
  }

  /**
   * Event listeners
   */
  on(channel: string, callback: (...args: any[]) => void): void {
    this.api?.on(channel, callback);
  }

  off(channel: string, callback: (...args: any[]) => void): void {
    this.api?.off(channel, callback);
  }

  once(channel: string, callback: (...args: any[]) => void): void {
    this.api?.once(channel, callback);
  }
}

// Export singleton instance
export const electronService = new ElectronService();