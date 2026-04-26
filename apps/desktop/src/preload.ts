import { contextBridge, ipcRenderer } from 'electron';
import { expose } from '@vienna/ipc/preload';
import { api, events } from './ipc';

expose(contextBridge, ipcRenderer, api, events);

// Expose tray/inbox panel APIs for secondary windows
contextBridge.exposeInMainWorld('trayApi', {
  openInbox: () => ipcRenderer.send('tray:open-inbox'),
  detachInbox: () => ipcRenderer.send('inbox:detach'),
  closePanel: () => ipcRenderer.send('inbox:close-panel'),
  onInboxChanged: (callback: () => void) => {
    ipcRenderer.on('inbox:changed', callback);
    return () => { ipcRenderer.removeListener('inbox:changed', callback); };
  },
});
