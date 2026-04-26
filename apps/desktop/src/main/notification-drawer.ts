/**
 * NotificationDrawer — Transparent floating notification overlay.
 *
 * Fixed-size frameless window anchored to the right edge of the screen.
 * With the Loom click-through patch, macOS natively passes clicks through
 * transparent pixels and captures clicks on opaque pixels (the cards).
 * No IPC mouse tracking or dynamic resizing needed.
 */

import { BrowserWindow, ipcMain, screen } from 'electron';
import path from 'node:path';

let drawerWindow: BrowserWindow | null = null;

const DRAWER_WIDTH = 400;

export interface NotificationDrawerOptions {
  devServerUrl?: string;
  viteName?: string;
  onViewInbox?: () => void;
}

let windowOpts: NotificationDrawerOptions = {};

function createDrawerWindow(): BrowserWindow {
  const display = screen.getPrimaryDisplay();
  const workArea = display.workArea;

  const win = new BrowserWindow({
    width: DRAWER_WIDTH,
    height: workArea.height,
    x: workArea.x + workArea.width - DRAWER_WIDTH,
    y: workArea.y,
    frame: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    transparent: true,
    hasShadow: false,
    focusable: true,
    roundedCorners: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  if (windowOpts.devServerUrl) {
    win.loadURL(`${windowOpts.devServerUrl}?mode=notification-drawer`);
  } else {
    win.loadFile(
      path.join(__dirname, `../renderer/${windowOpts.viteName ?? 'main_window'}/index.html`),
      { search: 'mode=notification-drawer' },
    );
  }

  win.webContents.on('dom-ready', () => {
    win.webContents.insertCSS('html, body { background: transparent !important; }');
  });

  win.on('closed', () => {
    drawerWindow = null;
  });

  return win;
}

export function showNotificationDrawer(): void {
  if (!drawerWindow) {
    drawerWindow = createDrawerWindow();
  }

  const display = screen.getPrimaryDisplay();
  const workArea = display.workArea;
  drawerWindow.setBounds({
    x: workArea.x + workArea.width - DRAWER_WIDTH,
    y: workArea.y,
    width: DRAWER_WIDTH,
    height: workArea.height,
  });

  if (!drawerWindow.isVisible()) {
    drawerWindow.showInactive();
  }

  drawerWindow.webContents.send('notification-drawer:show');
}

export function hideNotificationDrawer(): void {
  if (drawerWindow?.isVisible()) {
    drawerWindow.hide();
  }
}

export function setupNotificationDrawer(opts: NotificationDrawerOptions): void {
  windowOpts = opts;

  ipcMain.on('notification-drawer:empty', (event) => {
    if (drawerWindow && event.sender === drawerWindow.webContents) {
      drawerWindow.hide();
    }
  });

  ipcMain.on('notification-drawer:dismiss-all', (event) => {
    if (drawerWindow && event.sender === drawerWindow.webContents) {
      drawerWindow.hide();
    }
  });

  ipcMain.on('notification-drawer:open-vienna', (event) => {
    if (drawerWindow && event.sender === drawerWindow.webContents) {
      drawerWindow.hide();
      const mainWin = BrowserWindow.getAllWindows().find((w) => {
        const url = w.webContents.getURL();
        return !url.includes('mode=');
      });
      if (mainWin) {
        mainWin.show();
        mainWin.focus();
      }
      opts.onViewInbox?.();
    }
  });
}

export function destroyNotificationDrawer(): void {
  drawerWindow?.destroy();
  drawerWindow = null;
  ipcMain.removeAllListeners('notification-drawer:empty');
  ipcMain.removeAllListeners('notification-drawer:dismiss-all');
  ipcMain.removeAllListeners('notification-drawer:open-vienna');
}
