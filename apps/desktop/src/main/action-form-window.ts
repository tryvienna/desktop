/**
 * ActionFormWindow — Floating overlay for the action form bar.
 *
 * Fixed-size transparent window at the bottom-center of the screen.
 * With the Loom click-through patch, macOS natively passes clicks through
 * transparent pixels and captures clicks on opaque pixels. No IPC mouse
 * tracking or dynamic resizing needed.
 *
 * Pre-created at startup so it's instantly ready when an action handler
 * calls ctx.prompt().
 */

import { BrowserWindow, ipcMain, screen } from 'electron';
import path from 'node:path';

let formWindow: BrowserWindow | null = null;

const FORM_WIDTH = 800;
const FORM_HEIGHT = 400;

export interface ActionFormWindowOptions {
  devServerUrl?: string;
  viteName?: string;
}

let windowOpts: ActionFormWindowOptions = {};

function createFormWindow(): BrowserWindow {
  const display = screen.getPrimaryDisplay();
  const workArea = display.workArea;
  const x = Math.round(workArea.x + (workArea.width - FORM_WIDTH) / 2);
  const y = workArea.y + workArea.height - FORM_HEIGHT - 20;

  const win = new BrowserWindow({
    width: FORM_WIDTH,
    height: FORM_HEIGHT,
    x,
    y,
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
    roundedCorners: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  if (windowOpts.devServerUrl) {
    win.loadURL(`${windowOpts.devServerUrl}?mode=action-form`);
  } else {
    win.loadFile(
      path.join(__dirname, `../renderer/${windowOpts.viteName ?? 'main_window'}/index.html`),
      { search: 'mode=action-form' },
    );
  }

  win.webContents.on('dom-ready', () => {
    win.webContents.insertCSS('html, body { background: transparent !important; }');
  });

  win.on('closed', () => {
    formWindow = null;
  });

  return win;
}

export function showActionFormWindow(): void {
  if (!formWindow) return;
  const display = screen.getPrimaryDisplay();
  const workArea = display.workArea;
  formWindow.setBounds({
    x: Math.round(workArea.x + (workArea.width - FORM_WIDTH) / 2),
    y: workArea.y + workArea.height - FORM_HEIGHT - 20,
    width: FORM_WIDTH,
    height: FORM_HEIGHT,
  });
  if (!formWindow.isVisible()) {
    formWindow.show();
    formWindow.focus();
  }
}

export function hideActionFormWindow(): void {
  if (formWindow?.isVisible()) {
    formWindow.hide();
  }
}

export function setupActionFormWindow(opts: ActionFormWindowOptions): void {
  windowOpts = opts;
  formWindow = createFormWindow();

  ipcMain.on('action-form:dismiss', (event) => {
    if (formWindow && event.sender === formWindow.webContents) {
      formWindow.hide();
    }
  });
}

export function destroyActionFormWindow(): void {
  formWindow?.destroy();
  formWindow = null;
  ipcMain.removeAllListeners('action-form:dismiss');
}

export function isMainWindowVisible(): boolean {
  const mainWin = BrowserWindow.getAllWindows().find((w) => {
    const url = w.webContents.getURL();
    return !url.includes('mode=');
  });
  return mainWin?.isVisible() ?? false;
}
