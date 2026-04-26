import { app, BrowserWindow, Menu, Tray, nativeImage, screen, ipcMain } from 'electron';
import path from 'node:path';

let tray: Tray | null = null;
let popover: BrowserWindow | null = null;
let badgeCount = 0;
let label = '';
let iconEmpty: Electron.NativeImage;
let iconBadge: Electron.NativeImage;
let ready = false;

// ── Icon loading ───────────────────────────────────────────────────────────

function loadIcon(filename: string): Electron.NativeImage {
  const iconPath = path.resolve(__dirname, '../../resources', filename);
  const img = nativeImage.createFromPath(iconPath);
  img.setTemplateImage(false);
  return img;
}

// ── Window helpers ─────────────────────────────────────────────────────────

/** Reference to the main application window, set via setupTray. */
let mainWindow: BrowserWindow | null = null;

function showMainWindow(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
  }
}

function updateTray(): void {
  if (!tray) return;
  // Use empty image when we have a label (emoji) — only show the text.
  // Fall back to badge icon when there are unread items and no label.
  if (label) {
    tray.setImage(iconEmpty);
    const dot = badgeCount > 0 ? '🔴' : '';
    tray.setTitle(`${label}${dot}`);
  } else {
    tray.setImage(badgeCount > 0 ? iconBadge : iconEmpty);
    tray.setTitle('');
  }
}

function updateDockBadge(): void {
  if (process.platform !== 'darwin') return;
  if (badgeCount <= 0) {
    app.dock?.setBadge('');
  } else {
    app.dock?.setBadge(badgeCount > 9 ? '9+' : String(badgeCount));
  }
}

// ── Popover window ─────────────────────────────────────────────────────────

const POPOVER_WIDTH = 360;
const POPOVER_HEIGHT = 480;

function createPopover(opts: TrayOptions): BrowserWindow {
  const win = new BrowserWindow({
    width: POPOVER_WIDTH,
    height: POPOVER_HEIGHT,
    frame: false,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    transparent: true,
    vibrancy: 'popover',
    visualEffectState: 'active',
    roundedCorners: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  // Load the same renderer with ?mode=tray
  if (opts.devServerUrl) {
    win.loadURL(`${opts.devServerUrl}?mode=tray`);
  } else {
    win.loadFile(
      path.join(__dirname, `../renderer/${opts.viteName ?? 'main_window'}/index.html`),
      { search: 'mode=tray' },
    );
  }

  // Dismiss on blur
  win.on('blur', () => {
    win.hide();
  });

  // Intercept close to hide instead — the popover is never truly closed during
  // the app lifetime so it can re-show instantly. Only win.destroy() (called
  // from destroyTray) will actually dispose of it.
  win.on('close', (e) => {
    e.preventDefault();
    win.hide();
  });

  return win;
}

function positionPopover(): void {
  if (!tray || !popover) return;

  const trayBounds = tray.getBounds();
  const display = screen.getDisplayNearestPoint({ x: trayBounds.x, y: trayBounds.y });
  const workArea = display.workArea;

  let x = Math.round(trayBounds.x + trayBounds.width / 2 - POPOVER_WIDTH / 2);
  const y = trayBounds.y + trayBounds.height + 4;

  if (x + POPOVER_WIDTH > workArea.x + workArea.width) {
    x = workArea.x + workArea.width - POPOVER_WIDTH - 8;
  }
  if (x < workArea.x) {
    x = workArea.x + 8;
  }

  popover.setPosition(x, y, false);
}

function togglePopover(opts: TrayOptions): void {
  if (!ready) {
    showMainWindow();
    return;
  }

  if (!popover) {
    popover = createPopover(opts);
  }

  if (popover.isVisible()) {
    popover.hide();
  } else {
    positionPopover();
    popover.show();
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

export interface TrayOptions {
  onViewInbox?: () => void;
  devServerUrl?: string;
  viteName?: string;
}

export function setupTray(initialLabel: string, opts: TrayOptions = {}): void {
  iconEmpty = nativeImage.createEmpty();
  iconBadge = loadIcon('trayBadge.png');

  tray = new Tray(iconEmpty);
  tray.setToolTip('Vienna');
  label = initialLabel;
  tray.setTitle(label);

  // Left-click: toggle popover
  tray.on('click', () => {
    togglePopover(opts);
  });

  // Right-click: native context menu
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'View Inbox',
      click: () => {
        if (popover?.isVisible()) popover.hide();
        showMainWindow();
        opts.onViewInbox?.();
      },
    },
    { label: 'Open Vienna', click: showMainWindow },
    { type: 'separator' },
    { label: 'Quit Vienna', click: () => app.quit() },
  ]);

  tray.on('right-click', () => {
    tray?.popUpContextMenu(contextMenu);
  });

  // IPC: popover renderer asks to open the main inbox view
  ipcMain.on('tray:open-inbox', (event) => {
    // Only respond to messages from the popover window
    if (popover && event.sender === popover.webContents) {
      popover.hide();
      showMainWindow();
      opts.onViewInbox?.();
    }
  });
}

/** Call after IPC handlers are registered to enable the popover. */
export function setTrayReady(): void {
  ready = true;
}

/** Set the main application window reference so showMainWindow can target it reliably. */
export function setMainWindow(win: BrowserWindow): void {
  mainWindow = win;
}

export function setTrayBadgeCount(count: number): void {
  if (badgeCount === count) return;
  badgeCount = count;
  updateTray();
  updateDockBadge();
}

export function setTrayLabel(newLabel: string): void {
  label = newLabel;
  updateTray();
}

export function destroyTray(): void {
  popover?.destroy();
  popover = null;
  tray?.destroy();
  tray = null;
  ipcMain.removeAllListeners('tray:open-inbox');
}
