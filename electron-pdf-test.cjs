const { app, BrowserWindow } = require('electron');

app.whenReady().then(() => {
  const win = new BrowserWindow({
    show: true,
    webPreferences: { plugins: true }
  });

  // A tiny valid PDF (just a blank page) in base64
  const pdfBase64 = "JVBERi0xLjMKMyAwIG9iago8PC9UeXBlIC9QYWdlCi9QYXJlbnQgMSAwIFIKL1Jlc291cmNlcyAyIDAgUgovQ29udGVudHMgNCAwIFI+PgplbmRvYmoKNCAwIG9iago8PC9MZW5ndGggOT4+CnN0cmVhbQpxCjEK00xNTEwCnEKTWUKZW5kc3RyZWFtCmVuZG9iagoxIDAgb2JqCjw8L1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDE+PgplbmRvYmoKMiAwIG9iago8PC9Qcm9jU2V0IFsvUERGIC9UZXh0XQovaHlwaGVuYXRpb25bXS9Gb250ICA8PC9GMSAgPDwvVHlwZSAvRm9udAovU3VidHlwZSAvVHlwZTEKL0Jhc2VGb250IC9IZWx2ZXRpY2E+Pj4+Pj4KZW5kb2JqCjUgMCBvYmoKPDwvVHlwZSAvQ2F0YWxvZwovUGFnZXMgMSAwIFI+PgplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmCjAwMDAwMDAxMjIgMDAwMDAgbgowMDAwMDAwMTc2IDAwMDAwIG4KMDAwMDAwMDAxNSAwMDAwMCBuCjAwMDAwMDAwNjkgMDAwMDAgbgowMDAwMDAwMjk2IDAwMDAwIG4KdHJhaWxlcgo8PC9TaXplIDYKL1Jvb3QgNSAwIFIKPj4Kc3RhcnR4cmVmCjM0NQolJUVPRgo=";

  win.webContents.session.on('will-download', (event, item, webContents) => {
    console.log('[DEBUG] A download was triggered! filename:', item.getFilename());
    event.preventDefault(); // Stop the download
    app.quit();
  });

  win.loadURL(`data:application/pdf;base64,${pdfBase64}`);
  
  win.webContents.on('did-finish-load', () => {
    console.log('[DEBUG] PDF loaded successfully for viewing');
    setTimeout(() => app.quit(), 2000);
  });
});
