const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');
const tesseract = require('node-tesseract-ocr');

const tesseractConfig = {
  lang: 'eng',
  oem: 1,
  psm: 6, // Assume uniform block of text
  tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz .,/$()-:#%&',
  tesseract_cmd: 'C:\\Program Files\\Tesseract-OCR\\tesseract.exe'
};

async function renderPdfPageToImage(pdfPath, pageNum) {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  
  const dataBuffer = fs.readFileSync(pdfPath);
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(dataBuffer),
    useSystemFonts: true,
    disableFontFace: true
  });
  
  const pdfDocument = await loadingTask.promise;
  const page = await pdfDocument.getPage(pageNum);
  
  // Render at 2x scale for better OCR
  const viewport = page.getViewport({ scale: 2.0 });
  const canvas = createCanvas(viewport.width, viewport.height);
  const context = canvas.getContext('2d');
  
  // Set white background
  context.fillStyle = 'white';
  context.fillRect(0, 0, viewport.width, viewport.height);
  
  const renderContext = {
    canvasContext: context,
    viewport: viewport
  };
  
  await page.render(renderContext).promise;
  
  return canvas;
}

async function ocrPage4() {
  try {
    console.log('Rendering PDF page 4 to image...');
    const canvas = await renderPdfPageToImage('../Colleran_Loss.pdf', 4);
    
    // Save to temp file
    const tempImagePath = path.join('../', 'page4-temp.png');
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(tempImagePath, buffer);
    
    console.log(`Image saved: ${buffer.length} bytes`);
    console.log('Running Tesseract OCR... (15-30 seconds)\n');
    
    const text = await tesseract.recognize(tempImagePath, tesseractConfig);
    
    console.log('=== OCR RESULT ===');
    console.log(`Extracted ${text.length} characters\n`);
    console.log(text.substring(0, 2000));
    
    if (text.length > 2000) {
      console.log('\n... (truncated, see page4-ocr.txt for full text)');
    }
    
    // Save full text
    fs.writeFileSync('../page4-ocr.txt', text);
    console.log('\nFull text saved to page4-ocr.txt');
    
    // Clean up
    fs.unlinkSync(tempImagePath);
    
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
  }
}

ocrPage4();
