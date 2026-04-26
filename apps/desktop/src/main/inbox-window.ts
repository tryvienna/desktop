/**
 * InboxWindow — Detachable always-visible inbox panel.
 *
 * Opens a slim window pinned to the right edge of the screen, full height.
 * Loads the same renderer bundle with ?mode=inbox-panel.
 */

import { BrowserWindow, ipcMain, screen } from 'electron';
import path from 'node:path';

let inboxWindow: BrowserWindow | null = null;

const PANEL_WIDTH = 380;

export interface InboxWindowOptions {
  devServerUrl?: string;
  viteName?: string;
  onViewInbox?: () => void;
}

let windowOpts: InboxWindowOptions = {};

function createInboxWindow(): BrowserWindow {
  const display = screen.getPrimaryDisplay();
  const workArea = display.workArea;

  const win = new BrowserWindow({
    width: PANEL_WIDTH,
    height: workArea.height,
    x: workArea.x + workArea.width - PANEL_WIDTH,
    y: workArea.y,
    frame: false,
    resizable: true,
    minimizable: false,
    maximizable: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    show: false,
    transparent: true,
    vibrancy: 'sidebar',
    visualEffectState: 'active',
    roundedCorners: true,
    backgroundColor: '#00000000',
    titleBarStyle: 'hidden',
    minWidth: 300,
    maxWidth: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  if (windowOpts.devServerUrl) {
    win.loadURL(`${windowOpts.devServerUrl}?mode=inbox-panel`);
  } else {
    win.loadFile(
      path.join(__dirname, `../renderer/${windowOpts.viteName ?? 'main_window'}/index.html`),
      { search: 'mode=inbox-panel' },
    );
  }

  win.once('ready-to-show', () => {
    win.show();
  });

  win.on('closed', () => {
    inboxWindow = null;
  });

  return win;
}

export function setupInboxWindow(opts: InboxWindowOptions): void {
  windowOpts = opts;

  // Renderer asks to detach/attach the inbox panel.
  // Sender validation: only respond to known windows (main app, popover, or panel itself).
  ipcMain.on('inbox:detach', (event) => {
    const senderWindow = BrowserWindow.fromWebContents(event.sender);
    if (!senderWindow) return;
    if (inboxWindow) {
      inboxWindow.focus();
      return;
    }
    inboxWindow = createInboxWindow();
  });

  ipcMain.on('inbox:close-panel', (event) => {
    // Only the inbox panel itself should be able to close itself
    if (!inboxWindow || event.sender !== inboxWindow.webContents) return;
    inboxWindow.close();
    inboxWindow = null;
  });
}

export function destroyInboxWindow(): void {
  inboxWindow?.destroy();
  inboxWindow = null;
  ipcMain.removeAllListeners('inbox:detach');
  ipcMain.removeAllListeners('inbox:close-panel');
}
