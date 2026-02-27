const fs = require('fs');
const path = require('path');
const poppler = require('pdf-poppler');
const tesseract = require('node-tesseract-ocr');

// Add Tesseract to PATH
process.env.PATH = `C:\\Program Files\\Tesseract-OCR;${process.env.PATH}`;

const tesseractConfig = {
  lang: 'eng',
  oem: 1,
  psm: 6
};

async function ocrPage(pdfPath, pageNum) {
  const outputDir = path.join(path.dirname(pdfPath), '.ocr-temp');
  
  try {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    console.log(`Rendering page ${pageNum} to image...`);
    
    const opts = {
      format: 'png',
      out_dir: outputDir,
      out_prefix: `page${pageNum}`,
      page: pageNum,
      scale: 2048
    };
    
    await poppler.convert(pdfPath, opts);
    
    const files = fs.readdirSync(outputDir).filter(f => f.startsWith(`page${pageNum}`));
    
    if (files.length === 0) {
      return '';
    }
    
    const imagePath = path.join(outputDir, files[0]);
    
    console.log(`Running OCR on page ${pageNum}...`);
    const text = await tesseract.recognize(imagePath, tesseractConfig);
    
    return text;
    
  } catch (err) {
    console.log(`OCR error on page ${pageNum}:`, err.message);
    return '';
  } finally {
    try {
      if (fs.existsSync(outputDir)) {
        fs.rmSync(outputDir, { recursive: true, force: true });
      }
    } catch (cleanupErr) {
      // Ignore
    }
  }
}

async function extractPdfText(dataBuffer) {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(dataBuffer),
    useSystemFonts: true,
    disableFontFace: true,
    standardFontDataUrl: null
  });
  
  const pdfDocument = await loadingTask.promise;
  const numPages = pdfDocument.numPages;
  let fullText = '';
  
  console.log(`Processing ${numPages} pages...\n`);
  
  // Save to temp file for poppler
  const tempPdfPath = path.join('C:\\Users\\power\\Downloads', 'temp-nelson.pdf');
  fs.writeFileSync(tempPdfPath, dataBuffer);
  
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);
    const textContent = await page.getTextContent();
    let pageText = textContent.items.map(item => item.str).join(' ');
    
    // If page is empty/whitespace, use OCR
    if (pageText.trim().length < 50) {
      console.log(`Page ${pageNum}: Empty, using OCR fallback`);
      pageText = await ocrPage(tempPdfPath, pageNum);
    } else {
      console.log(`Page ${pageNum}: Extracted ${pageText.length} chars`);
    }
    
    fullText += pageText + '\n\n';
  }
  
  // Clean up temp PDF
  try {
    fs.unlinkSync(tempPdfPath);
  } catch (e) {}
  
  return fullText;
}

async function processNelson() {
  try {
    const pdfPath = 'C:\\Users\\power\\Downloads\\Nelson, Michael Loss.pdf';
    const dataBuffer = fs.readFileSync(pdfPath);
    
    const fullText = await extractPdfText(dataBuffer);
    
    // Detect carrier
    const carriers = ['AAA', 'Allstate', 'State Farm', 'USAA', 'Farmers', 'Liberty Mutual', 
                      'Progressive', 'Nationwide', 'Travelers', 'GEICO'];
    const foundCarrier = carriers.find(c => fullText.includes(c)) || 'Unknown';
    
    // Count line items
    const lines = fullText.split('\n');
    const lineItems = lines.filter(l => /^\d{1,2}\.\s+/.test(l.trim()));
    
    console.log('\n=== RESULTS ===');
    console.log('Carrier:', foundCarrier);
    console.log('Line items:', lineItems.length);
    
    fs.writeFileSync('C:\\Users\\power\\.openclaw\\workspace\\nelson-ocr-full.txt', fullText);
    console.log('\nFull text saved to nelson-ocr-full.txt');
    
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
  }
}

processNelson();
