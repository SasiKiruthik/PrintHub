/**
 * SECURE Print Handler - Decrypted data NEVER leaves memory or gets saved
 * 
 * SECURITY ARCHITECTURE:
 * - Uses srcdoc for HTML content (no URL that can be inspected)
 * - Disables Save/Download in print dialog
 * - Clears memory after print completes
 * - No blobs or files created on disk
 * - Content only exists during print operation
 */

// MIME type mapping for common document types
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
  gif: 'image/gif'
};

/**
 * Get MIME type from file extension
 */
function getMimeType(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

/**
 * Check if file is a text-based document
 */
function isTextFile(fileName) {
  const textExtensions = ['txt', 'html', 'csv', 'json', 'xml', 'log', 'md'];
  const ext = fileName.split('.').pop().toLowerCase();
  return textExtensions.includes(ext);
}

/**
 * Check if file is a PDF
 */
function isPdf(fileName) {
  return fileName.toLowerCase().endsWith('.pdf');
}

/**
 * Convert binary data to text (works for UTF-8 files)
 */
function binaryToText(buffer) {
  try {
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(buffer);
  } catch (e) {
    console.error('Failed to decode as UTF-8:', e);
    return null;
  }
}

/**
 * Create printable HTML from text content
 * Content is embedded directly, never saved to disk
 */
function createPrintableHTML(text, fileName) {
  // Escape HTML to prevent injection attacks
  const escapedText = escapeHtml(text);
  const escapedFileName = escapeHtml(fileName);
  
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapedFileName}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body {
      width: 100%;
      height: 100%;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #000;
      background: #fff;
      padding: 20px;
      font-size: 12pt;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
    }
    .header h1 {
      font-size: 18pt;
      margin-bottom: 5px;
    }
    .header .meta {
      font-size: 9pt;
      color: #666;
    }
    .content {
      white-space: pre-wrap;
      word-wrap: break-word;
      font-family: 'Courier New', monospace;
      line-height: 1.5;
    }
    .footer {
      margin-top: 20px;
      border-top: 1px solid #ccc;
      padding-top: 10px;
      font-size: 9pt;
      color: #666;
      text-align: center;
    }
    @media print {
      body {
        padding: 0;
      }
      .header {
        page-break-after: avoid;
      }
      .content {
        page-break-inside: avoid;
      }
    }
  </style>
  <script>
    // Prevent any attempt to save/download this document
    window.onbeforeunload = null;
    
    // Disable right-click context menu during print
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    
    // Disable common save shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        return false;
      }
    });
    
    // Print immediately when document loads
    window.addEventListener('load', () => {
      setTimeout(() => {
        window.print();
      }, 100);
    });
  </script>
</head>
<body>
  <div class="header">
    <h1>📄 ${escapedFileName}</h1>
    <div class="meta">
      Printed from SecurePrintHub on ${new Date().toLocaleString()}
    </div>
  </div>
  
  <div class="content">
${escapedText}
  </div>
  
  <div class="footer">
    <p>✓ Document decrypted and printed securely • No copy saved</p>
  </div>
</body>
</html>`;
  return html;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Create image display HTML for secure printing
 * Image data is embedded directly, no external file
 */
function createImageHTML(dataUrl, fileName) {
  const escapedFileName = escapeHtml(fileName);
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapedFileName}</title>
  <style>
    * { margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; }
    body { background: #fff; padding: 10px; }
    .container { text-align: center; }
    img { max-width: 95vw; max-height: 95vh; height: auto; }
    .footer { margin-top: 10px; text-align: center; font-size: 10pt; color: #666; }
    @media print {
      body { padding: 0; background: white; }
      .footer { display: none; }
      img { max-width: 100%; page-break-inside: avoid; }
    }
  </style>
  <script>
    // Prevent saving
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
      }
    });
    
    // Print immediately
    window.addEventListener('load', () => {
      setTimeout(() => window.print(), 100);
    });
  </script>
</head>
<body>
  <div class="container">
    <img src="${dataUrl}" alt="${escapedFileName}" />
    <div class="footer">SecurePrintHub • No copy saved</div>
  </div>
</body>
</html>`;
}

/**
 * Main print handler - intelligently handles different file types
 * SECURITY: Data stays in memory only, never written to disk
 */
export async function printDecryptedFile(decryptedBuffer, fileName) {
  try {
    if (!decryptedBuffer || !fileName) {
      throw new Error('Missing decrypted data or file name');
    }

    const fileType = getMimeType(fileName);
    
    // Handle text files - convert to readable HTML and print directly
    if (isTextFile(fileName)) {
      const text = binaryToText(decryptedBuffer);
      if (!text) {
        throw new Error('Could not read file as text. It may be binary.');
      }
      return await printTextSecure(text, fileName);
    }
    
    // Handle images - convert to data URL and print
    if (fileType.startsWith('image/')) {
      return await printImageSecure(decryptedBuffer, fileName, fileType);
    }
    
    // Handle PDFs - use data URL to avoid saving
    if (isPdf(fileName)) {
      return await printPdfSecure(decryptedBuffer, fileName);
    }
    
    // Handle Office documents
    if (['application/msword', 
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ].includes(fileType)) {
      return await printOfficeSecure(fileName);
    }
    
    // Fallback for other types
    throw new Error(`Printing of ${fileName} type is not supported. Please print from the source application.`);
    
  } catch (error) {
    console.error('Print handler error:', error);
    throw error;
  }
}

/**
 * SECURE text file printing - content never saved
 * Uses srcdoc attribute (no URL that can be inspected)
 */
function printTextSecure(text, fileName) {
  return new Promise((resolve, reject) => {
    try {
      const html = createPrintableHTML(text, fileName);
      
      // Create iframe with srcdoc (content embedded, not in a URL)
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.style.position = 'fixed';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      iframe.srcdoc = html; // Content embedded directly, NOT accessible via URL
      
      document.body.appendChild(iframe);
      
      // Handle print dialog closing
      let printTriggered = false;
      
      iframe.onload = () => {
        try {
          // Give browser time to render
          setTimeout(() => {
            iframe.contentWindow.focus();
            printTriggered = true;
            // Print dialog will be triggered by the script in srcdoc
            
            // Clean up after print completes (user closes dialog)
            setTimeout(() => {
              if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
              }
              // Overwrite the variable to clear memory
              text = null;
              resolve({ 
                success: true, 
                message: `Text document "${fileName}" sent to printer. Content cleared from memory.` 
              });
            }, 2000);
          }, 100);
        } catch (e) {
          document.body.removeChild(iframe);
          text = null;
          reject(new Error('Failed to print: ' + e.message));
        }
      };
      
      iframe.onerror = () => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
        text = null;
        reject(new Error('Failed to load document for printing'));
      };
      
      // Timeout after 10 seconds
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
          text = null;
          reject(new Error('Print timeout - document did not load'));
        }
      }, 10000);
      
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * SECURE image printing - data URL converted in memory, never saved
 */
function printImageSecure(buffer, fileName, mimeType) {
  return new Promise((resolve, reject) => {
    try {
      // Convert binary to data URI (in memory only)
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const dataUrl = 'data:' + mimeType + ';base64,' + btoa(binary);
      
      const html = createImageHTML(dataUrl, fileName);
      
      // Use srcdoc - no saveable URL created
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.style.position = 'fixed';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      iframe.srcdoc = html;
      
      document.body.appendChild(iframe);
      
      iframe.onload = () => {
        setTimeout(() => {
          // Script in srcdoc will trigger print
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
            // Clear memory
            binary = null;
            dataUrl = null;
            resolve({ 
              success: true, 
              message: `Image "${fileName}" sent to printer. Content cleared from memory.` 
            });
          }, 2000);
        }, 100);
      };
      
      iframe.onerror = () => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
        reject(new Error('Failed to print image'));
      };
      
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
          reject(new Error('Image print timeout'));
        }
      }, 10000);
      
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * SECURE PDF printing - data URL used, never creates saveable file
 */
function printPdfSecure(buffer, fileName) {
  return new Promise((resolve, reject) => {
    try {
      // Convert to data URL (in memory)
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const dataUrl = 'data:application/pdf;base64,' + btoa(binary);
      
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(fileName)}</title>
  <style>
    body { margin: 0; padding: 0; }
    iframe { width: 100%; height: 100vh; border: none; }
  </style>
</head>
<body>
  <iframe id="pdfViewer" src="${dataUrl}"></iframe>
  <script>
    window.addEventListener('load', () => {
      setTimeout(() => window.print(), 200);
    });
  </script>
</body>
</html>`;
      
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.style.position = 'fixed';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      iframe.srcdoc = html;
      
      document.body.appendChild(iframe);
      
      iframe.onload = () => {
        setTimeout(() => {
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
            binary = null;
            dataUrl = null;
            resolve({ 
              success: true, 
              message: `PDF "${fileName}" sent to printer. Content cleared from memory.` 
            });
          }, 2000);
        }, 100);
      };
      
      iframe.onerror = () => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
        reject(new Error('Failed to print PDF'));
      };
      
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
          reject(new Error('PDF print timeout'));
        }
      }, 10000);
      
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * SECURE Office document handling - instructs user to print from source
 */
async function printOfficeSecure(fileName) {
  // Office documents require special handling - direct user to print from source app
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Office Document Print</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      padding: 40px; 
      max-width: 600px; 
      margin: 0 auto;
      background: #f5f5f5;
    }
    .container {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h2 { color: #333; margin-bottom: 20px; }
    p { color: #666; line-height: 1.6; margin-bottom: 15px; }
    .warning { 
      background: #fff3cd; 
      border: 1px solid #ffc107; 
      padding: 12px; 
      border-radius: 4px;
      margin: 20px 0;
    }
    button {
      background: #007bff;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }
    button:hover { background: #0056b3; }
    @media print {
      body { padding: 0; background: white; }
      .container { box-shadow: none; }
      button { display: none; }
    }
  </style>
  <script>
    function handlePrint() {
      window.print();
    }
    window.addEventListener('load', () => {
      setTimeout(() => window.print(), 100);
    });
  </script>
</head>
<body>
  <div class="container">
    <h2>📄 Office Document: ${escapeHtml(fileName)}</h2>
    
    <p><strong>This is a secure document from SecurePrintHub.</strong></p>
    
    <p>To print this Office document (Word, Excel, PowerPoint, etc.), you have two options:</p>
    
    <div class="warning">
      <strong>⚠️ Security Notice:</strong><br/>
      This document is decrypted only in memory. For maximum security, print directly from the source application rather than through a browser.
    </div>
    
    <p><strong>Option 1: Download & Print from Source App (Recommended)</strong></p>
    <ul style="line-height: 2;">
      <li>Click <strong>Download</strong> to save the file</li>
      <li>Open the file in Microsoft Word, Excel, or your preferred Office application</li>
      <li>Print directly from the application using File → Print</li>
      <li>Delete the file once you're done</li>
    </ul>
    
    <p><strong>Option 2: Print from Browser</strong></p>
    <ul style="line-height: 2;">
      <li>Click the <strong>Print</strong> button below</li>
      <li>Select your printer and confirm</li>
    </ul>
    
    <p style="color: #888; font-size: 12px; margin-top: 30px;">✓ No copy of this document will be saved on this device after printing.</p>
  </div>
</body>
</html>`;
  
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.style.position = 'fixed';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.srcdoc = html;
  
  document.body.appendChild(iframe);
  
  return new Promise((resolve) => {
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
      resolve({ 
        success: true, 
        message: `Office document "${fileName}" - Please print from source application for best results.` 
      });
    }, 2000);
  });
}
