import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { startServer } from './server.js';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !app.isPackaged;

let mainWindow = null;
let printWindow = null;
let serverInstance = null;
let serverPort = 3000;

// Get local network IP addresses
function getNetworkIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push({ name, address: iface.address });
      }
    }
  }
  return ips;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'SecurePrintHub - Shop Dashboard',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    backgroundColor: '#0a0e1a',
    autoHideMenuBar: true,
    show: false // Show after ready
  });

  // Show when ready to avoid flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (isDev) {
    // Dev: load from Vite dev server
    mainWindow.loadURL('http://localhost:5173/#/shop/dashboard');
  } else {
    // Production: load from HTTP fallback (localhost has crypto.subtle)
    mainWindow.loadURL(`http://localhost:${serverPort + 1}/#/shop/dashboard`);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ========================
// SILENT PRINT (HTML content)
// ========================
ipcMain.handle('silent-print', async (event, { htmlContent, printerName }) => {
  return new Promise((resolve, reject) => {
    try {
      printWindow = new BrowserWindow({
        show: false,
        width: 800,
        height: 600,
        webPreferences: {
          contextIsolation: true,
          nodeIntegration: false
        }
      });

      printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

      printWindow.webContents.on('did-finish-load', () => {
        const opts = {
          silent: true,
          printBackground: true,
          margins: { marginType: 'default' },
          pageSize: 'A4'
        };
        if (printerName) opts.deviceName = printerName;

        printWindow.webContents.print(opts, (success, failureReason) => {
          if (printWindow && !printWindow.isDestroyed()) {
            printWindow.close();
            printWindow = null;
          }
          resolve(success
            ? { success: true, message: 'Document printed silently ✅' }
            : { success: false, message: `Print failed: ${failureReason}` });
        });
      });

      printWindow.webContents.on('did-fail-load', (ev, code, desc) => {
        if (printWindow && !printWindow.isDestroyed()) { printWindow.close(); printWindow = null; }
        reject(new Error(`Load failed: ${desc}`));
      });
    } catch (err) {
      if (printWindow && !printWindow.isDestroyed()) { printWindow.close(); printWindow = null; }
      reject(err);
    }
  });
});

// ========================
// SILENT PRINT (PDF)
// ========================
ipcMain.handle('silent-print-pdf', async (event, { pdfBase64, printerName }) => {
  return new Promise((resolve, reject) => {
    try {
      printWindow = new BrowserWindow({
        show: false,
        width: 800,
        height: 600,
        webPreferences: {
          contextIsolation: true,
          nodeIntegration: false,
          plugins: true
        }
      });

      printWindow.loadURL(`data:application/pdf;base64,${pdfBase64}`);

      printWindow.webContents.on('did-finish-load', () => {
        setTimeout(() => {
          const opts = {
            silent: true,
            printBackground: true,
            margins: { marginType: 'default' },
            pageSize: 'A4'
          };
          if (printerName) opts.deviceName = printerName;

          printWindow.webContents.print(opts, (success, failureReason) => {
            if (printWindow && !printWindow.isDestroyed()) { printWindow.close(); printWindow = null; }
            resolve(success
              ? { success: true, message: 'PDF printed silently ✅' }
              : { success: false, message: `PDF print failed: ${failureReason}` });
          });
        }, 1000);
      });

      printWindow.webContents.on('did-fail-load', () => {
        if (printWindow && !printWindow.isDestroyed()) { printWindow.close(); printWindow = null; }
        reject(new Error('Failed to load PDF'));
      });
    } catch (err) {
      if (printWindow && !printWindow.isDestroyed()) { printWindow.close(); printWindow = null; }
      reject(err);
    }
  });
});

// Get printers
ipcMain.handle('get-printers', async () => {
  if (!mainWindow) return [];
  try {
    const printers = mainWindow.webContents.getPrintersAsync
      ? await mainWindow.webContents.getPrintersAsync()
      : mainWindow.webContents.getPrinters();
    return printers.map(p => ({
      name: p.name,
      displayName: p.displayName || p.name,
      isDefault: p.isDefault,
      status: p.status
    }));
  } catch {
    return [];
  }
});

// Get network info
ipcMain.handle('get-network-info', async () => {
  return {
    ips: getNetworkIPs(),
    port: serverPort,
    hostname: os.hostname()
  };
});

// ========================
// APP LIFECYCLE
// ========================
app.whenReady().then(async () => {
  // Start Express server
  try {
    serverInstance = await startServer(serverPort);
    console.log(`\n  🔐 SecurePrintHub is running!\n`);
    console.log(`  🔒 HTTPS server: https://localhost:${serverPort}`);
    console.log(`  📡 HTTP fallback: http://localhost:${serverPort + 1}`);
    const ips = getNetworkIPs();
    if (ips.length > 0) {
      console.log(`\n  📱 Tell students to open:\n`);
      ips.forEach(ip => {
        console.log(`     https://${ip.address}:${serverPort}`);
      });
      console.log(`\n  ⚠️  Students: click "Advanced" → "Proceed" on the browser warning`);
    }
    console.log('');
  } catch (err) {
    console.error('Failed to start server:', err);
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (serverInstance) {
    serverInstance.close();
  }
});
