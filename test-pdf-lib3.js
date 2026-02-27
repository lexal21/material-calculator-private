const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

async function extractRawPage4() {
  const pdfBytes = fs.readFileSync('../Colleran_Loss.pdf');
  const pdfDoc = await PDFDocument.load(pdfBytes);
  
  const page = pdfDoc.getPage(3); // Page 4 (0-indexed)
  
  // Access the raw page object
  const pageNode = page.node;
  const context = pageNode.context;
  const contentsObj = pageNode.Contents();
  
  console.log('Contents type:', contentsObj?.constructor?.name);
  
  if (!contentsObj) {
    console.log('No contents found');
    return;
  }
  
  let streams = [];
  
  // Handle both single stream and array of streams
  if (contentsObj.asArray) {
    streams = contentsObj.asArray();
    console.log(`Found ${streams.length} streams in array`);
  } else {
    streams = [contentsObj];
    console.log('Found 1 stream');
  }
  
  let allText = '';
  
  for (let i = 0; i < streams.length; i++) {
    try {
      const streamRef = streams[i];
      const stream = context.lookup(streamRef);
      
      console.log(`\nStream ${i}:`, stream?.constructor?.name);
      
      if (stream && stream.dict) {
        // Try to get the contents
        const contents = stream.contents;
        if (contents) {
          const text = new TextDecoder('latin1').decode(contents);
          console.log(`  Raw contents length: ${text.length} chars`);
          console.log(`  First 300 chars:`);
          console.log(text.substring(0, 300));
          allText += `\n\n===== STREAM ${i} =====\n${text}`;
        } else {
          console.log(`  No contents property`);
        }
      }
    } catch (err) {
      console.log(`  Error: ${err.message}`);
    }
  }
  
  if (allText.length > 0) {
    fs.writeFileSync('../page4-raw-contents.txt', allText);
    console.log(`\n\nSaved to page4-raw-contents.txt (${allText.length} chars total)`);
  } else {
    console.log('\n\nNo content extracted');
  }
}

extractRawPage4().catch(console.error);
