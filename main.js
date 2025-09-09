
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged;


const PROJECT_DATA_DIR  = path.join(__dirname, 'data');                            
const PORTABLE_DATA_DIR = path.join(path.dirname(app.getPath('exe')), 'rossol-data'); 
const DATA_DIR = isDev
  ? PROJECT_DATA_DIR
  : (process.env.ROSSOL_PORTABLE ? PORTABLE_DATA_DIR : app.getPath('userData'));

function ensureDataDir() {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {}
}
const DATA_FILE = () => path.join(DATA_DIR, 'rossol-data.json');

function uid() {
  return (Date.now().toString(36) + Math.random().toString(36).slice(2, 7)).toUpperCase();
}

function ensureDataFile() {
  ensureDataDir();
  const file = DATA_FILE();
  if (!fs.existsSync(file)) {
    // Create an EMPTY dataset on first run (no Sugar/Flour/etc.)
    const seed = {
      version: 1,
      products: [],     // ← start empty
      dismissed: {}
    };
    fs.writeFileSync(file, JSON.stringify(seed, null, 2), 'utf8');
  }
}


function readData() {
  try {
    const obj = JSON.parse(fs.readFileSync(DATA_FILE(), 'utf8'));
    return {
      version: 1,
      products: Array.isArray(obj.products) ? obj.products : [],
      dismissed: obj.dismissed && typeof obj.dismissed === 'object' ? obj.dismissed : {}
    };
  } catch {
    return { version: 1, products: [], dismissed: {} };
  }
}

function writeData(payload) {
  ensureDataDir();
  const obj = {
    version: 1,
    products: Array.isArray(payload.products) ? payload.products : [],
    dismissed: payload.dismissed && typeof payload.dismissed === 'object' ? payload.dismissed : {}
  };
  fs.writeFileSync(DATA_FILE(), JSON.stringify(obj, null, 2), 'utf8');
  return obj;
}

function loadIndex(win) {
  const candidates = [
    path.join(__dirname, 'renderer', 'index.html'), 
    path.join(__dirname, 'index.html')
  ];
  const found = candidates.find(p => fs.existsSync(p));
  if (!found) {
    dialog.showErrorBox('Missing index.html', 'Tried:\n' + candidates.join('\n'));
    return;
  }
  console.log('Loading:', found);
  win.loadFile(found);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1080,
    height: 800,
    minWidth: 900,
    minHeight: 700,
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false 
    }
  });

  win.webContents.on('did-fail-load', (_e, code, desc, url) => {
    console.error('did-fail-load:', { code, desc, url });
  });
  win.webContents.on('render-process-gone', (_e, details) => {
    console.error('Renderer crashed:', details);
  });

  if (isDev) win.webContents.openDevTools({ mode: 'detach' });

  loadIndex(win);
}

app.whenReady().then(() => {
  ensureDataFile();
  console.log('Data directory:', DATA_DIR);
  console.log('Data file:', DATA_FILE());


  ipcMain.handle('data:load', () => readData());
  ipcMain.handle('data:save', (_evt, payload) => writeData(payload));



  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
