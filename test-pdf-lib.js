const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

async function extractRawPage4() {
  const pdfBytes = fs.readFileSync('../Colleran_Loss.pdf');
  const pdfDoc = await PDFDocument.load(pdfBytes);
  
  console.log(`Total pages: ${pdfDoc.getPageCount()}`);
  
  // Get page 4 (index 3)
  const page = pdfDoc.getPage(3);
  
  console.log(`\n=== PAGE 4 RAW DATA ===`);
  console.log(`Width: ${page.getWidth()}, Height: ${page.getHeight()}`);
  
  // Try to get the content stream
  const pageDict = page.node;
  const contents = pageDict.Contents();
  
  if (contents) {
    console.log(`\nContent stream type: ${contents.constructor.name}`);
    
    let allText = '';
    
    // If it's a PDFArray, iterate through streams
    if (contents.asArray) {
      const streams = contents.asArray();
      console.log(`\nPDFArray with ${streams.length} streams`);
      
      streams.forEach((stream, idx) => {
        try {
          if (stream.dict && stream.dict.context) {
            const decoded = stream.decode();
            const text = new TextDecoder().decode(decoded);
            allText += text + '\n';
            console.log(`\nStream ${idx} length: ${text.length} chars`);
            if (idx === 0) {
              console.log(`First 1000 chars of stream ${idx}:`);
              console.log(text.substring(0, 1000));
            }
          }
        } catch (err) {
          console.log(`Stream ${idx} error:`, err.message);
        }
      });
    } else if (contents.decode) {
      const decoded = contents.decode();
      allText = new TextDecoder().decode(decoded);
      console.log(`\nDecoded stream length: ${allText.length} chars`);
    }
    
    if (allText.length > 0) {
      console.log(`\nTotal extracted: ${allText.length} chars`);
      fs.writeFileSync('../page4-raw.txt', allText);
      console.log(`Full raw content saved to page4-raw.txt`);
    } else {
      console.log(`\nNo text extracted`);
    }
  } else {
    console.log('No content stream found');
  }
}

extractRawPage4().catch(console.error);
