const fs = require('fs');
const PDFParser = require('pdf2json');

const pdfPath = '../Colleran_Loss.pdf';
const pdfParser = new PDFParser();

pdfParser.on("pdfParser_dataError", errData => console.error(errData.parserError));

pdfParser.on("pdfParser_dataReady", pdfData => {
  console.log(`Total pages: ${pdfData.Pages.length}`);
  
  pdfData.Pages.forEach((page, idx) => {
    const pageNum = idx + 1;
    const textItems = page.Texts || [];
    const pageText = textItems.map(t => decodeURIComponent(t.R[0].T)).join(' ');
    
    console.log(`\n=== PAGE ${pageNum} ===`);
    console.log(`Text items: ${textItems.length}`);
    console.log(`Text length: ${pageText.length} chars`);
    console.log(`Raw data size: ${JSON.stringify(page).length} bytes`);
    
    if (pageNum === 3 || pageNum === 4) {
      console.log(`First 500 chars:`);
      console.log(pageText.substring(0, 500));
    }
  });
  
  // Extract all text
  const fullText = pdfData.Pages.map((page, idx) => {
    const textItems = page.Texts || [];
    return textItems.map(t => decodeURIComponent(t.R[0].T)).join(' ');
  }).join('\n');
  
  console.log(`\n\nTotal extracted text length: ${fullText.length}`);
  fs.writeFileSync('../colleran-pdf2json.txt', fullText);
  console.log('Saved to colleran-pdf2json.txt');
});

pdfParser.loadPDF(pdfPath);
