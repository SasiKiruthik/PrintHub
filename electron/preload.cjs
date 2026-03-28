const { contextBridge, ipcRenderer } = require('electron');

// Expose secure IPC bridge to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Silent print HTML content (text, images)
  silentPrint: (htmlContent, printerName, printOptions) =>
    ipcRenderer.invoke('silent-print', { htmlContent, printerName, printOptions }),

  // Silent print PDF (base64 encoded)
  silentPrintPDF: (pdfBase64, printerName, printOptions) =>
    ipcRenderer.invoke('silent-print-pdf', { pdfBase64, printerName, printOptions }),

  // Get list of available printers
  getPrinters: () =>
    ipcRenderer.invoke('get-printers'),

  // Get network info (local IPs)
  getNetworkInfo: () =>
    ipcRenderer.invoke('get-network-info'),

  // Check if running in Electron
  isElectron: true
});
