const poppler = require('pdf-poppler');
const tesseract = require('node-tesseract-ocr');
const fs = require('fs');
const path = require('path');

// Configure node-tesseract-ocr to use full path
process.env.PATH = `C:\\Program Files\\Tesseract-OCR;${process.env.PATH}`;

const tesseractConfig = {
  lang: 'eng',
  oem: 1,
  psm: 6
};

async function ocrPage4() {
  try {
    const pdfPath = path.resolve('../Colleran_Loss.pdf');
    const outputDir = path.resolve('../poppler-output');
    
    // Create output directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    console.log('Converting PDF page 4 to PNG using poppler...');
    
    const opts = {
      format: 'png',
      out_dir: outputDir,
      out_prefix: 'page',
      page: 4,
      scale: 2048 // Higher resolution for better OCR
    };
    
    await poppler.convert(pdfPath, opts);
    
    // Find the generated image
    const files = fs.readdirSync(outputDir);
    console.log(`Generated files:`, files);
    
    const imagePath = path.join(outputDir, files[0]);
    
    console.log(`Running OCR on: ${imagePath}`);
    console.log('This may take 15-30 seconds...\n');
    
    const text = await tesseract.recognize(imagePath, tesseractConfig);
    
    console.log('=== OCR RESULT ===');
    console.log(`Extracted ${text.length} characters\n`);
    console.log(text.substring(0, 2000));
    
    fs.writeFileSync('../page4-ocr.txt', text);
    console.log('\nFull text saved to page4-ocr.txt');
    
    // Clean up
    fs.rmSync(outputDir, { recursive: true, force: true });
    
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
  }
}

ocrPage4();
