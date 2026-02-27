const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

async function extractRawPage4() {
  const pdfBytes = fs.readFileSync('../Colleran_Loss.pdf');
  const pdfDoc = await PDFDocument.load(pdfBytes);
  
  const page = pdfDoc.getPage(3); // Page 4 (0-indexed)
  const pageRef = page.ref;
  const context = pdfDoc.context;
  
  // Get page dictionary
  const pageDict = context.lookup(pageRef);
  const contentsRef = pageDict.get(context.obj('Contents'));
  
  console.log('Contents ref:', contentsRef?.constructor?.name);
  
  if (contentsRef && contentsRef.asArray) {
    const streamRefs = contentsRef.asArray();
    console.log(`Found ${streamRefs.length} content streams\n`);
    
    let allRawText = '';
    
    for (let i = 0; i < streamRefs.length; i++) {
      try {
        const streamObj = context.lookup(streamRefs[i]);
        
        if (streamObj && streamObj.decode) {
          const decoded = streamObj.decode();
          const text = new TextDecoder('latin1').decode(decoded);
          
          console.log(`Stream ${i}: ${text.length} chars`);
          allRawText += `\n===== STREAM ${i} =====\n${text}\n`;
          
          if (i < 3 || text.length > 100) {
            console.log(`Sample (first 500 chars):`);
            console.log(text.substring(0, 500));
            console.log('');
          }
        }
      } catch (err) {
        console.log(`Stream ${i} error:`, err.message);
      }
    }
    
    if (allRawText.length > 0) {
      fs.writeFileSync('../page4-all-streams.txt', allRawText);
      console.log(`\nSaved all streams to page4-all-streams.txt (${allRawText.length} chars)`);
    }
  }
}

extractRawPage4().catch(console.error);
