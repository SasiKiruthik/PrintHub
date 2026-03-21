/**
 * SECURE Print Handler
 * 
 * Two paths:
 * 1. ELECTRON: Uses IPC to silently print (no preview at all)
 * 2. BROWSER FALLBACK: Uses iframe + window.print() (shows print dialog)
 */

// Check if running inside Electron
const isElectron = () => {
  return !!(window.electronAPI && window.electronAPI.isElectron);
};

// MIME type mapping
const MIME_TYPES = {
  pdf: 'application/pdf',
  txt: 'text/plain',
  html: 'text/html',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  bmp: 'image/bmp',
  webp: 'image/webp'
};

function getMimeType(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

function isTextFile(fileName) {
  const textExtensions = ['txt', 'html', 'csv', 'json', 'xml', 'log', 'md', 'css', 'js'];
  const ext = fileName.split('.').pop().toLowerCase();
  return textExtensions.includes(ext);
}

function isPdf(fileName) {
  return fileName.toLowerCase().endsWith('.pdf');
}

function isImage(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext);
}

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Convert ArrayBuffer to base64
function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// ==============================
// HTML GENERATORS
// ==============================

function createTextHTML(text, fileName) {
  const escapedText = escapeHtml(text);
  const escapedName = escapeHtml(fileName);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escapedName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6; color: #000; background: #fff;
      padding: 40px; font-size: 12pt;
    }
    .header {
      text-align: center; margin-bottom: 24px;
      border-bottom: 2px solid #333; padding-bottom: 12px;
    }
    .header h1 { font-size: 16pt; margin-bottom: 4px; }
    .header .meta { font-size: 9pt; color: #666; }
    .content {
      white-space: pre-wrap; word-wrap: break-word;
      font-family: 'Courier New', monospace; line-height: 1.5;
    }
    @media print {
      body { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapedName}</h1>
    <div class="meta">Printed from SecurePrintHub • ${new Date().toLocaleString()}</div>
  </div>
  <div class="content">${escapedText}</div>
</body>
</html>`;
}

function createImageHTML(dataUrl, fileName) {
  const escapedName = escapeHtml(fileName);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escapedName}</title>
  <style>
    * { margin: 0; padding: 0; }
    body { background: #fff; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    img { max-width: 100%; max-height: 95vh; height: auto; }
    @media print {
      body { padding: 0; }
      img { max-width: 100%; page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <img src="${dataUrl}" alt="${escapedName}" />
</body>
</html>`;
}

// ==============================
// MAIN PRINT HANDLER
// ==============================
export async function printDecryptedFile(decryptedBuffer, fileName, printerName) {
  try {
    if (!decryptedBuffer || !fileName) {
      throw new Error('Missing decrypted data or file name');
    }

    // === PDF ===
    if (isPdf(fileName)) {
      return await printPDF(decryptedBuffer, fileName, printerName);
    }

    // === TEXT ===
    if (isTextFile(fileName)) {
      const decoder = new TextDecoder('utf-8');
      const text = decoder.decode(decryptedBuffer);
      const html = createTextHTML(text, fileName);
      return await printHTML(html, fileName, printerName);
    }

    // === IMAGE ===
    if (isImage(fileName)) {
      const mimeType = getMimeType(fileName);
      const base64 = bufferToBase64(decryptedBuffer);
      const dataUrl = `data:${mimeType};base64,${base64}`;
      const html = createImageHTML(dataUrl, fileName);
      return await printHTML(html, fileName, printerName);
    }

    // === UNSUPPORTED ===
    throw new Error(`File type "${fileName.split('.').pop()}" is not supported for direct printing. Supported: PDF, TXT, JPG, PNG, HTML`);

  } catch (error) {
    console.error('Print handler error:', error);
    throw error;
  }
}

// ==============================
// ELECTRON SILENT PRINT (HTML)
// ==============================
async function printHTML(htmlContent, fileName, printerName) {
  if (isElectron()) {
    // ELECTRON: Silent print — no preview!
    console.log(`[Print] Silent printing ${fileName} via Electron`);
    const result = await window.electronAPI.silentPrint(htmlContent, printerName);
    return result;
  } else {
    // BROWSER FALLBACK: Use iframe + print dialog
    return printHTMLInBrowser(htmlContent, fileName);
  }
}

// ==============================
// ELECTRON SILENT PRINT (PDF)
// ==============================
async function printPDF(buffer, fileName, printerName) {
  const base64 = bufferToBase64(buffer);

  if (isElectron()) {
    // ELECTRON: Silent print PDF — no preview!
    console.log(`[Print] Silent printing PDF ${fileName} via Electron`);
    const result = await window.electronAPI.silentPrintPDF(base64, printerName);
    return result;
  } else {
    // BROWSER FALLBACK: Open PDF in new window and print
    return printPDFInBrowser(base64, fileName);
  }
}

// ==============================
// BROWSER FALLBACKS
// ==============================
function printHTMLInBrowser(htmlContent, fileName) {
  return new Promise((resolve, reject) => {
    try {
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;width:0;height:0;border:none;left:-9999px;';
      iframe.srcdoc = htmlContent;

      document.body.appendChild(iframe);

      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();

            setTimeout(() => {
              if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
              }
              resolve({
                success: true,
                message: `"${fileName}" sent to printer via browser print dialog.`
              });
            }, 1000);
          } catch (e) {
            if (document.body.contains(iframe)) document.body.removeChild(iframe);
            reject(new Error('Failed to trigger print: ' + e.message));
          }
        }, 200);
      };

      iframe.onerror = () => {
        if (document.body.contains(iframe)) document.body.removeChild(iframe);
        reject(new Error('Failed to load document for printing'));
      };

      // Timeout after 15 seconds
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
          reject(new Error('Print timeout'));
        }
      }, 15000);

    } catch (error) {
      reject(error);
    }
  });
}

function printPDFInBrowser(pdfBase64, fileName) {
  return new Promise((resolve, reject) => {
    try {
      // Convert base64 to Blob
      const byteCharacters = atob(pdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      let blobUrl = URL.createObjectURL(blob);

      // Open PDF in a new window and trigger print
      const printWin = window.open(blobUrl, '_blank');
      if (!printWin) {
        URL.revokeObjectURL(blobUrl);
        reject(new Error('Pop-up blocked. Please allow pop-ups for this site.'));
        return;
      }

      printWin.onload = () => {
        setTimeout(() => {
          printWin.print();
          // Cleanup after print dialog closes
          setTimeout(() => {
            printWin.close();
            URL.revokeObjectURL(blobUrl);
            blobUrl = null;
            resolve({
              success: true,
              message: `PDF "${fileName}" sent to printer via browser print dialog.`
            });
          }, 2000);
        }, 500);
      };

      // Timeout fallback
      setTimeout(() => {
        if (!printWin.closed) {
          printWin.close();
        }
        URL.revokeObjectURL(blobUrl);
        blobUrl = null;
        resolve({
          success: true,
          message: `PDF "${fileName}" opened for printing.`
        });
      }, 30000);

    } catch (error) {
      reject(error);
    }
  });
}
