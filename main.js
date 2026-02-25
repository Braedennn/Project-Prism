const { app, BrowserWindow, ipcMain, dialog, shell, Tray, Menu, Notification, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFile, exec, spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');

// ─── App Identity ────────────────────────────────────────────────────────────
app.setAppUserModelId('com.prism.launcher');
app.setName('Prism Launcher');

// ─── Paths ───────────────────────────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, 'data');
const LIBRARY_PATH = path.join(DATA_DIR, 'games-library.json');
const SETTINGS_PATH = path.join(DATA_DIR, 'settings.json');
const ICONS_DIR = path.join(__dirname, 'extracted-icons');
const ICON_PATH = path.join(__dirname, 'src', 'assets', 'icons', 'icon.ico');

// Ensure directories exist
[DATA_DIR, ICONS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Ensure library file exists
if (!fs.existsSync(LIBRARY_PATH)) {
  fs.writeFileSync(LIBRARY_PATH, JSON.stringify({ games: [], lastPlayed: null }, null, 2));
}

// ─── Settings (main process) ─────────────────────────────────────────────────
let mainSettings = {
  minToTray: false,
  minOnLaunch: false,
  confirmRemove: true,
  notifications: true
};

function loadMainSettings() {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const raw = fs.readFileSync(SETTINGS_PATH, 'utf-8');
      mainSettings = { ...mainSettings, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.warn('Failed to load settings:', err);
  }
}

function saveMainSettings() {
  try {
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(mainSettings, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to save settings:', err);
  }
}

loadMainSettings();

// ─── Active Game Sessions (for playtime tracking) ────────────────────────────
// Map of gameId → { startTime, pid }
const activeSessions = new Map();

// ─── Tray ────────────────────────────────────────────────────────────────────
let tray = null;

function createTray() {
  if (tray) return;
  const icon = nativeImage.createFromPath(ICON_PATH);
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip('Prism Launcher');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show Prism Launcher', click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } } },
    { type: 'separator' },
    { label: 'Quit', click: () => { forceQuit = true; app.quit(); } }
  ]));
  tray.on('double-click', () => {
    if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
  });
}

// ─── Window ──────────────────────────────────────────────────────────────────
let mainWindow = null;
let forceQuit = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    frame: false,
    transparent: false,
    backgroundColor: '#080808',
    icon: ICON_PATH,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle close — minimize to tray if enabled
  mainWindow.on('close', (e) => {
    if (mainSettings.minToTray && !forceQuit) {
      e.preventDefault();
      mainWindow.hide();
      createTray();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  // Before quitting, finalize any active sessions
  finalizeAllSessions();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  forceQuit = true;
  finalizeAllSessions();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ─── IPC: Window Controls ────────────────────────────────────────────────────
ipcMain.handle('app:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('app:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
  return mainWindow?.isMaximized();
});

ipcMain.handle('app:close', () => {
  if (mainSettings.minToTray) {
    mainWindow?.hide();
    createTray();
  } else {
    finalizeAllSessions();
    mainWindow?.close();
  }
});

// ─── IPC: Settings Sync ─────────────────────────────────────────────────────
ipcMain.handle('settings:set', (event, key, value) => {
  mainSettings[key] = value;
  saveMainSettings();
  // If tray was disabled, destroy it
  if (key === 'minToTray' && !value && tray) {
    tray.destroy();
    tray = null;
  }
  return { success: true };
});

ipcMain.handle('settings:get', () => {
  return mainSettings;
});

ipcMain.handle('settings:set-all', (event, newSettings) => {
  mainSettings = { ...mainSettings, ...newSettings };
  saveMainSettings();
  if (!mainSettings.minToTray && tray) {
    tray.destroy();
    tray = null;
  }
  return { success: true };
});

ipcMain.handle('app:get-version', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));
  return pkg.version;
});

// ─── IPC: File Dialog ────────────────────────────────────────────────────────
ipcMain.handle('dialog:open-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Game Executable',
    filters: [
      { name: 'Executables', extensions: ['exe'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
});

// ─── IPC: Icon Extraction ────────────────────────────────────────────────────
ipcMain.handle('icon:extract', async (event, exePath) => {
  const gameId = uuidv4();
  const outputPath = path.join(ICONS_DIR, `${gameId}.png`);

  // Attempt 1: PowerShell .NET System.Drawing
  try {
    const extracted = await extractWithPowerShell(exePath, outputPath);
    if (extracted) return { success: true, iconPath: outputPath, gameId };
  } catch (err) {
    console.warn('PowerShell extraction failed:', err.message);
  }

  // Attempt 2: exe-icon-extractor (if installed)
  try {
    const extracted = await extractWithModule(exePath, outputPath);
    if (extracted) return { success: true, iconPath: outputPath, gameId };
  } catch (err) {
    console.warn('exe-icon-extractor failed or not installed:', err.message);
  }

  // Attempt 3: No icon
  console.warn('All icon extraction methods failed.');
  return { success: false, iconPath: null, gameId };
});

async function extractWithPowerShell(exePath, outputPath) {
  return new Promise((resolve, reject) => {
    const os = require('os');
    const scriptPath = path.join(os.tmpdir(), `prism_icon_${Date.now()}.ps1`);

    const psScript = [
      'Add-Type -AssemblyName System.Drawing',
      'try {',
      `  $icon = [System.Drawing.Icon]::ExtractAssociatedIcon("${exePath.replace(/"/g, '`"')}")`,
      '  if ($icon -ne $null) {',
      '    $bitmap = $icon.ToBitmap()',
      `    $bitmap.Save("${outputPath.replace(/"/g, '`"')}", [System.Drawing.Imaging.ImageFormat]::Png)`,
      '    $bitmap.Dispose()',
      '    $icon.Dispose()',
      '    Write-Output "SUCCESS"',
      '  } else {',
      '    Write-Output "FAIL"',
      '  }',
      '} catch {',
      '  Write-Output "FAIL: $_"',
      '}'
    ].join('\r\n');

    fs.writeFileSync(scriptPath, psScript, 'utf-8');

    exec(`powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`,
      { timeout: 15000 },
      (error, stdout) => {
        try { fs.unlinkSync(scriptPath); } catch (e) {}

        if (error) {
          reject(error);
          return;
        }

        const output = (stdout || '').trim();
        if (output.includes('SUCCESS') && fs.existsSync(outputPath)) {
          resolve(true);
        } else {
          reject(new Error(`PowerShell extraction failed: ${output}`));
        }
      }
    );
  });
}

async function extractWithModule(exePath, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const iconExtractor = require('exe-icon-extractor');
      const iconBuffer = iconExtractor.extractIcon(exePath, 'large');
      if (iconBuffer && iconBuffer.length > 0) {
        fs.writeFileSync(outputPath, iconBuffer);
        resolve(true);
      } else {
        reject(new Error('Empty icon buffer'));
      }
    } catch (err) {
      reject(err);
    }
  });
}

// ─── IPC: Library CRUD ───────────────────────────────────────────────────────
ipcMain.handle('library:load', async () => {
  try {
    const raw = fs.readFileSync(LIBRARY_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load library:', err);
    return { games: [], lastPlayed: null };
  }
});

ipcMain.handle('library:save', async (event, data) => {
  try {
    fs.writeFileSync(LIBRARY_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true };
  } catch (err) {
    console.error('Failed to save library:', err);
    return { success: false, error: err.message };
  }
});

// ─── IPC: Game Launcher (with playtime tracking) ─────────────────────────────
ipcMain.handle('game:launch', async (event, exePath, gameId) => {
  if (!fs.existsSync(exePath)) {
    return { success: false, error: 'Executable not found' };
  }

  try {
    const child = spawn(exePath, [], {
      cwd: path.dirname(exePath),
      detached: true,
      stdio: 'ignore'
    });

    const pid = child.pid;
    const startTime = Date.now();

    // Track the session
    activeSessions.set(gameId, { startTime, pid });

    child.on('exit', () => {
      finalizeSession(gameId);
    });

    child.on('error', () => {
      finalizeSession(gameId);
    });

    child.unref();

    return { success: true, pid };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ─── IPC: Get active session status ──────────────────────────────────────────
ipcMain.handle('game:session-status', async (event, gameId) => {
  const session = activeSessions.get(gameId);
  if (!session) return { active: false, elapsed: 0 };

  return {
    active: true,
    elapsed: Math.floor((Date.now() - session.startTime) / 1000)
  };
});

// ─── Playtime Session Management ─────────────────────────────────────────────

/**
 * Finalize a single game session — calculates elapsed time and saves to library
 */
function finalizeSession(gameId) {
  const session = activeSessions.get(gameId);
  if (!session) return;

  const elapsedSeconds = Math.floor((Date.now() - session.startTime) / 1000);
  activeSessions.delete(gameId);

  // Only count sessions longer than 5 seconds (filter out crashes/instant closes)
  if (elapsedSeconds < 5) return;

  // Read library, update playtime, save
  try {
    const raw = fs.readFileSync(LIBRARY_PATH, 'utf-8');
    const data = JSON.parse(raw);
    const game = data.games.find(g => g.id === gameId);

    if (game) {
      game.totalPlaytime = (game.totalPlaytime || 0) + elapsedSeconds;
      fs.writeFileSync(LIBRARY_PATH, JSON.stringify(data, null, 2), 'utf-8');
      console.log(`Session ended for "${game.title}": +${elapsedSeconds}s (total: ${game.totalPlaytime}s)`);

      // Send OS desktop notification if enabled
      if (mainSettings.notifications && Notification.isSupported()) {
        const mins = Math.floor(elapsedSeconds / 60);
        const timeStr = mins >= 60
          ? `${Math.floor(mins / 60)}h ${mins % 60}m`
          : mins > 0 ? `${mins}m` : `${elapsedSeconds}s`;
        new Notification({
          title: 'Prism Launcher',
          body: `${game.title} — Session ended (${timeStr} played)`,
          icon: ICON_PATH
        }).show();
      }

      // Notify renderer to refresh
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('game:session-ended', {
          gameId,
          elapsed: elapsedSeconds,
          totalPlaytime: game.totalPlaytime
        });
        // Restore window if it was minimized on launch
        if (mainSettings.minOnLaunch && !mainWindow.isVisible()) {
          mainWindow.show();
        }
      }
    }
  } catch (err) {
    console.error('Failed to save playtime:', err);
  }
}

/**
 * Finalize all active sessions (called on app quit)
 */
function finalizeAllSessions() {
  for (const gameId of activeSessions.keys()) {
    finalizeSession(gameId);
  }
}

// ─── IPC: Open Data Directory ────────────────────────────────────────────────
ipcMain.handle('shell:open-data-dir', async () => {
  try {
    await shell.openPath(DATA_DIR);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ─── IPC: Open External URL ──────────────────────────────────────────────────
ipcMain.handle('shell:open-external', async (event, url) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ─── IPC: Shell Open Path ────────────────────────────────────────────────────
ipcMain.handle('shell:open-path', async (event, targetPath) => {
  try {
    await shell.openPath(targetPath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
