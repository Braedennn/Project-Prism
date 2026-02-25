const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('prismAPI', {
  // Window Controls
  minimize: () => ipcRenderer.invoke('app:minimize'),
  maximize: () => ipcRenderer.invoke('app:maximize'),
  close: () => ipcRenderer.invoke('app:close'),
  getVersion: () => ipcRenderer.invoke('app:get-version'),

  // File Dialog
  openFileDialog: () => ipcRenderer.invoke('dialog:open-file'),

  // Icon Extraction
  extractIcon: (exePath) => ipcRenderer.invoke('icon:extract', exePath),

  // Library
  loadLibrary: () => ipcRenderer.invoke('library:load'),
  saveLibrary: (data) => ipcRenderer.invoke('library:save', data),

  // Game Launching (now passes gameId for playtime tracking)
  launchGame: (exePath, gameId) => ipcRenderer.invoke('game:launch', exePath, gameId),

  // Playtime session status
  getSessionStatus: (gameId) => ipcRenderer.invoke('game:session-status', gameId),

  // Listen for session-ended events from main process
  onSessionEnded: (callback) => {
    ipcRenderer.on('game:session-ended', (event, data) => callback(data));
  },

  // Shell
  openPath: (targetPath) => ipcRenderer.invoke('shell:open-path', targetPath),
  openDataDir: () => ipcRenderer.invoke('shell:open-data-dir'),
  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),

  // Settings sync with main process
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  getMainSettings: () => ipcRenderer.invoke('settings:get'),
  setAllSettings: (settings) => ipcRenderer.invoke('settings:set-all', settings),

  // Window actions
  minimizeWindow: () => ipcRenderer.invoke('app:minimize')
});
