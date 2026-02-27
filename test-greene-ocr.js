const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');
const tesseract = require('node-tesseract-ocr');

const tesseractConfig = {
  lang: 'eng',
  oem: 1,
  psm: 6,
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
  
  const viewport = page.getViewport({ scale: 2.0 });
  const canvas = createCanvas(viewport.width, viewport.height);
  const context = canvas.getContext('2d');
  
  context.fillStyle = 'white';
  context.fillRect(0, 0, viewport.width, viewport.height);
  
  const renderContext = {
    canvasContext: context,
    viewport: viewport
  };
  
  await page.render(renderContext).promise;
  
  return canvas;
}

async function processGreene() {
  try {
    const pdfPath = 'C:\\Users\\power\\Downloads\\Greene, David Revised Loss.pdf';
    
    console.log('Loading PDF...');
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const dataBuffer = fs.readFileSync(pdfPath);
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(dataBuffer)
    });
    const pdfDocument = await loadingTask.promise;
    const numPages = pdfDocument.numPages;
    
    console.log(`Processing ${numPages} pages...\n`);
    
    let fullText = '';
    
    for (let i = 1; i <= numPages; i++) {
      console.log(`Page ${i}/${numPages}...`);
      const canvas = await renderPdfPageToImage(pdfPath, i);
      
      const tempImagePath = path.join('../', `greene-page${i}-temp.png`);
      const buffer = canvas.toBuffer('image/png');
      fs.writeFileSync(tempImagePath, buffer);
      
      const text = await tesseract.recognize(tempImagePath, tesseractConfig);
      fullText += text + '\n\n--- PAGE BREAK ---\n\n';
      
      fs.unlinkSync(tempImagePath);
    }
    
    // Detect carrier
    const carriers = ['AAA', 'Allstate', 'State Farm', 'USAA', 'Farmers', 'Liberty Mutual', 
                      'Progressive', 'Nationwide', 'Travelers', 'GEICO'];
    const foundCarrier = carriers.find(c => fullText.includes(c)) || 'Unknown';
    
    // Count line items (lines with dollar amounts)
    const lines = fullText.split('\n');
    const priceLines = lines.filter(l => /\$[\d,]+\.\d{2}/.test(l));
    
    console.log('\n=== RESULTS ===');
    console.log('Carrier:', foundCarrier);
    console.log('Line items:', priceLines.length);
    console.log('\nFull text saved to greene-ocr.txt');
    
    fs.writeFileSync('../greene-ocr.txt', fullText);
    
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
  }
}

processGreene();
