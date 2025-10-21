# VTMS Desktop - Electron Application Setup

This document provides comprehensive instructions for setting up, developing, and deploying the VTMS Desktop application built with Electron.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Development](#development)
- [Building](#building)
- [Packaging](#packaging)
- [Project Structure](#project-structure)
- [Key Features](#key-features)
- [Security](#security)
- [Troubleshooting](#troubleshooting)

## Overview

VTMS Desktop is an Electron-based desktop application that provides a native experience for the Vessel Traffic Management System. It integrates the React frontend with a built-in backend server, offering offline capabilities, system tray integration, and native notifications.

## Architecture

```
┌─────────────────────────────────────────┐
│         Electron Main Process           │
│  ┌────────────────────────────────────┐ │
│  │    Window Management & IPC         │ │
│  │    - BrowserWindow                 │ │
│  │    - System Tray                   │ │
│  │    - Native Dialogs                │ │
│  │    - Backend Server Management     │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
           │                  │
           ↓                  ↓
┌──────────────────┐  ┌─────────────────┐
│  Preload Script  │  │  Backend Server │
│  (Context Bridge)│  │  (Node.js)      │
└──────────────────┘  └─────────────────┘
           │                  │
           ↓                  ↓
┌─────────────────────────────────────────┐
│      Renderer Process (React App)       │
│  ┌────────────────────────────────────┐ │
│  │   React + TypeScript + Vite        │ │
│  │   - Map Visualization              │ │
│  │   - Real-time Data Display         │ │
│  │   - User Interface                 │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## Prerequisites

- **Bun**: v1.0 or higher ([Install Bun](https://bun.sh))
- **Node.js**: v20+ (required for some build tools)
- **Operating System**:
  - Windows 10/11 (x64, arm64)
  - macOS 10.13+ (Intel, Apple Silicon)
  - Linux (x64, arm64)

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Niyaz-H/vtms-prototype.git
   cd vtms-prototype
   ```

2. **Install root dependencies**:
   ```bash
   bun install
   ```

3. **Install backend dependencies**:
   ```bash
   cd backend
   bun install
   cd ..
   ```

4. **Install frontend dependencies**:
   ```bash
   cd frontend
   bun install
   cd ..
   ```

5. **Install Electron dependencies**:
   ```bash
   cd electron
   bun install
   cd ..
   ```

## Development

### Running in Development Mode

1. **Start the backend server** (Terminal 1):
   ```bash
   cd backend
   bun run dev
   ```

2. **Start the Electron app** (Terminal 2):
   ```bash
   bun run dev:electron
   ```

   This will:
   - Start Vite dev server for hot reload
   - Launch Electron with DevTools open
   - Enable hot module replacement (HMR)

### Development Features

- **Hot Reload**: Changes to React components are immediately reflected
- **DevTools**: Chromium DevTools available for debugging
- **Source Maps**: Full source map support for debugging
- **IPC Debugging**: Console logs for all IPC communications

## Building

### Build for Production

```bash
# Build all components
bun run build

# Or build individually
bun run build:backend   # Build backend TypeScript
bun run build:frontend  # Build React app
bun run build:electron  # Compile Electron TypeScript
```

### Build Output

- `backend/dist/` - Compiled backend server
- `frontend/dist/` - Production React bundle
- `dist-electron/` - Compiled Electron main & preload scripts

## Packaging

### Package for Current Platform

```bash
# Windows
bun run package:win

# macOS
bun run package:mac

# Linux
bun run package:linux

# All platforms (requires platform-specific tooling)
bun run package:all
```

### Package Output

Installers and executables are created in the `release/` directory:

- **Windows**: `VTMS-Desktop-{version}-{arch}.exe` (NSIS installer)
- **macOS**: `VTMS-Desktop-{version}-{arch}.dmg`
- **Linux**: `VTMS-Desktop-{version}-{arch}.AppImage` and `.deb`

### Code Signing (Production)

For production releases, configure code signing:

**Windows:**
```bash
# Set environment variables
export CSC_LINK=/path/to/certificate.pfx
export CSC_KEY_PASSWORD=your_password
```

**macOS:**
```bash
# Set environment variables
export APPLE_ID=your@email.com
export APPLE_ID_PASSWORD=app-specific-password
export CSC_LINK=/path/to/certificate.p12
export CSC_KEY_PASSWORD=your_password
```

## Project Structure

```
vtms-prototype/
├── electron/                 # Electron main process
│   ├── main.ts              # Main process entry point
│   ├── preload.ts           # Preload script with context bridge
│   ├── types/               # TypeScript type definitions
│   │   └── index.ts         # ElectronAPI interface
│   ├── tsconfig.json        # TypeScript configuration
│   └── package.json         # Electron dependencies
├── frontend/                 # React application
│   ├── src/
│   │   ├── services/
│   │   │   └── electron.ts  # Electron API service wrapper
│   │   └── ...
│   └── dist/                # Built React app (after build)
├── backend/                  # Backend server
│   ├── src/
│   │   └── index.ts         # Express server entry point
│   └── dist/                # Compiled backend (after build)
├── build/                    # Build resources
│   ├── icon.ico             # Windows icon (256x256)
│   ├── icon.icns            # macOS icon
│   ├── icon.png             # Linux icon (512x512)
│   └── entitlements.mac.plist # macOS entitlements
├── dist-electron/            # Compiled Electron code
├── release/                  # Packaged installers
├── vite.config.ts           # Vite + Electron configuration
└── package.json             # Root package configuration
```

## Key Features

### 1. **Integrated Backend Server**

The Electron app automatically starts and manages the backend server:

```typescript
// Backend starts automatically on app launch
await electronService.startBackend();

// Check backend status
const status = await electronService.getBackendStatus();
console.log(`Backend running on port ${status.port}`);
```

### 2. **System Tray Integration**

The app can minimize to the system tray:

- Click tray icon to show/hide the app
- Right-click for context menu
- Shows backend server status

### 3. **Native Notifications**

```typescript
// Show desktop notification
await electronService.showNotification(
  'Collision Alert',
  'Two vessels are approaching each other'
);
```

### 4. **File System Access**

```typescript
// Select files
const filePath = await electronService.selectFile({
  title: 'Select AIS Data File',
  filters: [{ name: 'CSV Files', extensions: ['csv'] }]
});

// Save files
const savePath = await electronService.saveFile({
  title: 'Export Vessel Data',
  defaultPath: 'vessels.json',
  filters: [{ name: 'JSON', extensions: ['json'] }]
});
```

### 5. **Persistent Storage**

```typescript
// Store user preferences
await electronService.storeSet('theme', 'dark');

// Retrieve stored data
const theme = await electronService.storeGet<string>('theme');
```

### 6. **Window Management**

```typescript
// Minimize, maximize, close
await electronService.minimizeWindow();
await electronService.maximizeWindow();
await electronService.closeWindow();

// Check window state
const isMaximized = await electronService.isMaximized();
```

## Security

### Context Isolation

The app uses Electron's context isolation for security:

```typescript
// Preload script exposes limited API via contextBridge
contextBridge.exposeInMainWorld('electronAPI', {
  // Only safe, whitelisted methods are exposed
});
```

### Content Security Policy (CSP)

CSP headers are configured to prevent XSS attacks:

```typescript
// Restricts resource loading to trusted sources
webPreferences: {
  contextIsolation: true,
  sandbox: true,
  webSecurity: true,
}
```

### Sandboxing

The renderer process runs in a sandbox with limited privileges.

## Troubleshooting

### Build Issues

**Problem**: Electron fails to build
```bash
# Clear cache and reinstall
rm -rf node_modules dist-electron release
bun install
bun run build
```

**Problem**: Missing native dependencies
```bash
# Rebuild native modules for Electron
cd node_modules/electron
bun run install
```

### Runtime Issues

**Problem**: Backend server doesn't start
- Check if port 3001 is already in use
- Review logs in the Electron console
- Ensure backend is built: `bun run build:backend`

**Problem**: White screen on launch
- Open DevTools (Ctrl+Shift+I / Cmd+Option+I)
- Check console for errors
- Ensure frontend is built: `bun run build:frontend`

**Problem**: IPC communication fails
- Verify preload script is loaded
- Check that `window.electronAPI` is defined
- Review IPC channel names in main and preload scripts

### Platform-Specific Issues

**Windows**:
- Install Windows SDK if code signing fails
- Run as Administrator if installer build fails

**macOS**:
- Install Xcode Command Line Tools
- Configure Apple Developer certificate for notarization

**Linux**:
- Install required build tools: `sudo apt-get install rpm`
- Install dependencies for AppImage: `sudo apt-get install libfuse2`

## Type Checking

Run TypeScript type checking across all modules:

```bash
bun run type-check
```

This checks:
- Electron main process (`electron/`)
- React frontend (`frontend/src/`)
- Backend server (`backend/src/`)

## Additional Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [Electron Builder](https://www.electron.build/)
- [Vite Plugin Electron](https://github.com/electron-vite/vite-plugin-electron)
- [Security Best Practices](https://www.electronjs.org/docs/latest/tutorial/security)

## Support

For issues or questions:
- GitHub Issues: https://github.com/Niyaz-H/vtms-prototype/issues
- Email: support@marintel.com

---

**Built with ❤️ for safer maritime operations**