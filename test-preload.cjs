const { app, BrowserWindow } = require('electron');
const path = require('path');
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <h1>Test</h1>
    <script>
      console.log("window.electronAPI:", window.electronAPI);
      if (window.electronAPI) {
        document.body.innerHTML += "<p>preload worked!</p>";
      } else {
        document.body.innerHTML += "<p>preload FAILED!</p>";
      }
    </script>
  `);
});

server.listen(3001, () => {
  app.whenReady().then(() => {
    const win = new BrowserWindow({
      webPreferences: {
        preload: path.join(__dirname, 'electron/preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    });
    
    win.loadURL('http://localhost:3001');
    setTimeout(() => {
      app.quit();
      server.close();
    }, 3000);
  });
});
