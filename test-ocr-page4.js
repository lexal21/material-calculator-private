const fs = require('fs');
const tesseract = require('node-tesseract-ocr');
const pdfToPng = require('pdf-to-png');

const tesseractConfig = {
  lang: 'eng',
  oem: 1,
  psm: 3,
  tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz .,/$()-',
  // Specify tesseract path
  tesseract_cmd: 'C:\\Program Files\\Tesseract-OCR\\tesseract.exe'
};

async function ocrPage4() {
  console.log('Converting PDF page 4 to PNG...');
  
  const pdfPath = '../Colleran_Loss.pdf';
  
  // Convert PDF to images
  const pngPages = await pdfToPng.pdfToPng(pdfPath, {
    outputFolder: '../ocr-temp',
    viewportScale: 2.0, // Higher resolution for better OCR
    pagesToProcess: [4], // Only page 4
    strictPagesToProcess: false,
    verbosityLevel: 0
  });
  
  console.log(`Generated ${pngPages.length} image(s)`);
  
  if (pngPages.length === 0) {
    console.log('No images generated');
    return;
  }
  
  const imagePath = pngPages[0].path;
  console.log(`\nRunning OCR on: ${imagePath}`);
  console.log('This may take 10-20 seconds...\n');
  
  try {
    const text = await tesseract.recognize(imagePath, tesseractConfig);
    
    console.log('=== OCR RESULT ===');
    console.log(`Extracted ${text.length} characters\n`);
    console.log(text);
    
    // Save to file
    fs.writeFileSync('../page4-ocr.txt', text);
    console.log('\nSaved to page4-ocr.txt');
    
    // Clean up temp folder
    fs.rmSync('../ocr-temp', { recursive: true, force: true });
    console.log('Cleaned up temp images');
    
  } catch (err) {
    console.error('OCR Error:', err.message);
  }
}

ocrPage4().catch(console.error);
