const { app, BrowserWindow, Menu, ipcMain, shell, Notification } = require('electron');
const fs = require('fs');
const path = require('path');

// ─── Auto-Updater ───────────────────────────────────────────────────
const { checkForUpdates, initCrashDetection, registerUpdateIPC } = require('./updater');

// Auth page opened in system browser; after login it redirects to smartstudyhub://auth?token=...
// Host electron-auth.html at this URL (e.g. Firebase Hosting: smartstudyhub-46d44.web.app/electron-auth.html)
const AUTH_PAGE_URL = 'https://studio-9933447149-80d6a.web.app/electron-auth.html';

const PROTOCOL = 'smartstudyhub';

let mainWindow = null;

function createWindow() {
  const iconPath = [
    path.join(__dirname, 'icon.png'),
    path.join(__dirname, 'favicon.ico'),
    path.join(__dirname, 'favicon.png'),
    path.join(__dirname, 'public', 'icon.png'),
    path.join(__dirname, 'public', 'favicon.ico'),
    path.join(__dirname, 'public', 'favicon.png')
  ].find(p => fs.existsSync(p));

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow = win;
  win.setMenuBarVisibility(false);
  Menu.setApplicationMenu(null);
  
  // Open external links in default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  win.loadFile(path.join(__dirname, 'public', 'index.html'));
}

function handleAuthUrl(urlString) {
  if (!urlString || !urlString.startsWith(`${PROTOCOL}://`)) return;
  try {
    const u = new URL(urlString);
    // smartstudyhub://auth?token=... → hostname is "auth"
    if (u.hostname === 'auth' || u.pathname === '/auth') {
      const token = u.searchParams.get('token');
      const googleAccessToken = u.searchParams.get('googleAccessToken') || u.searchParams.get('accessToken');
      const provider = u.searchParams.get('provider') || 'google';
      if (token && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('google-signin-result', null, token, provider, googleAccessToken);
      }
    }
  } catch (_) {}
}

// ----- Gemini API Key secure loading IPC -----
ipcMain.handle('get-gemini-key', () => {
  try {
    const configPath = path.join(__dirname, 'config.json');
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(content);
      if (config.GEMINI_API_KEY) return config.GEMINI_API_KEY;
    }
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(/REACT_APP_GEMINI_API_KEY\s*=\s*(.*)/);
      if (match && match[1]) {
        return match[1].replace(/[\r\n\s'"]/g, '');
      }
    }
  } catch (e) {
    console.error('Failed to read config/env:', e);
  }
  return process.env.GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY || '';
});

// ----- Window controls (IPC) -----
ipcMain.on('window-minimize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});

ipcMain.on('window-close', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
});

// ----- OAuth: open system browser; return via deep link smartstudyhub://auth?token=...&provider=... -----
ipcMain.on('google-signin', () => {
  shell.openExternal(AUTH_PAGE_URL);
});

ipcMain.on('github-signin', () => {
  const url = AUTH_PAGE_URL + (AUTH_PAGE_URL.includes('?') ? '&' : '?') + 'provider=github';
  shell.openExternal(url);
});

ipcMain.on('vk-signin', () => {
  const url = AUTH_PAGE_URL + (AUTH_PAGE_URL.includes('?') ? '&' : '?') + 'provider=vk';
  shell.openExternal(url);
});

// ----- Links and Notifications -----
ipcMain.on('open-external', (e, url) => {
  if (url) shell.openExternal(url);
});

ipcMain.on('show-notification', (e, title, body) => {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
});

// ----- App lifecycle -----
app.whenReady().then(() => {
  // Register custom protocol (deep link). On Windows dev mode, pass execPath and argv[1].
  if (process.defaultApp) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
  } else {
    app.setAsDefaultProtocolClient(PROTOCOL);
  }

  // Single instance: when user opens smartstudyhub://... while app is running
  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) {
    app.quit();
    return;
  }

  app.on('second-instance', (_event, commandLine) => {
    const url = commandLine.find((arg) => arg.startsWith(`${PROTOCOL}://`));
    if (url) handleAuthUrl(url);
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.focus();
  });

  createWindow();

  // ─── Auto-Updater: crash detection & update check ─────────────
  initCrashDetection(mainWindow);
  registerUpdateIPC(mainWindow);

  // Check for updates 5 seconds after window is ready
  mainWindow.webContents.on('did-finish-load', () => {
    setTimeout(() => checkForUpdates(mainWindow), 5000);
  });

  // Cold start: app launched by protocol (e.g. from browser redirect)
  const argvUrl = process.argv.find((arg) => arg.startsWith(`${PROTOCOL}://`));
  if (argvUrl) handleAuthUrl(argvUrl);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
