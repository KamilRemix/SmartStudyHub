const { contextBridge, ipcRenderer } = require('electron');

const ALLOWED_SEND_CHANNELS = [
  'window-minimize',
  'window-maximize',
  'window-close',
  'google-signin',
  'github-signin',
  'vk-signin',
  'show-notification',

  'open-external',
  // Auto-updater channels
  'update-info-received',
  'apply-update',
];

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,

  send(channel, ...args) {
    if (ALLOWED_SEND_CHANNELS.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    }
  },

  onGoogleSigninResult(callback) {
    ipcRenderer.on('google-signin-result', (_event, error, token, provider, googleAccessToken) => {
      callback(error, token, provider, googleAccessToken);
    });
  },

  getGeminiApiKey() {
    return ipcRenderer.invoke('get-gemini-key');
  },

  showNotification(title, body) {
    ipcRenderer.send('show-notification', title, body);
  },

  openExternal(url) {
    ipcRenderer.send('open-external', url);
  },

  // ─── Auto-Updater API ───────────────────────────────────────────
  checkForUpdates() {
    return ipcRenderer.invoke('check-for-updates');
  },

  startUpdateDownload() {
    return ipcRenderer.invoke('start-update-download');
  },

  applyUpdate() {
    ipcRenderer.send('apply-update');
  },

  onUpdateAvailable(callback) {
    ipcRenderer.on('update-available', (_event, info) => callback(info));
  },

  onUpdateDownloaded(callback) {
    ipcRenderer.on('update-downloaded', (_event, info) => callback(info));
  },

  onUpdateError(callback) {
    ipcRenderer.on('update-error', (_event, info) => callback(info));
  },

  onRollbackDetected(callback) {
    ipcRenderer.on('update-rollback-detected', (_event, info) => callback(info));
  },
});
