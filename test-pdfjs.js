const fs = require('fs');
const path = require('path');

async function testExtraction() {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  
  const dataBuffer = fs.readFileSync('../Colleran_Loss.pdf');
  
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(dataBuffer),
    useSystemFonts: true,
    disableFontFace: true,
    standardFontDataUrl: null
  });
  
  const pdfDocument = await loadingTask.promise;
  const numPages = pdfDocument.numPages;
  
  console.log(`Total pages: ${numPages}`);
  
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    
    console.log(`\n=== PAGE ${pageNum} (${pageText.length} chars) ===`);
    if (pageNum === 3 || pageNum === 4) {
      console.log(pageText.substring(0, 1000));
    }
  }
}

testExtraction().catch(console.error);
