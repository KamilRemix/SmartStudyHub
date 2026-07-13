const { contextBridge, ipcRenderer } = require('electron');

const ALLOWED_SEND_CHANNELS = [
  'window-minimize',
  'window-maximize',
  'window-close',
  'google-signin',
  'github-signin',
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
  }
});
