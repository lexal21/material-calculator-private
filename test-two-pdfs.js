const lossParser = require('./loss-parser');
const path = require('path');

async function testPDFs() {
  const pdfs = [
    'Greene__David_Revised_Loss.pdf',
    'Nelson__Michael_Loss.pdf'
  ];
  
  for (const pdf of pdfs) {
    const pdfPath = path.join(__dirname, '..', pdf);
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing: ${pdf}`);
    console.log('='.repeat(60));
    
    try {
      const result = await lossParser.parseCompleteLossSheet(pdfPath);
      console.log(`Carrier: ${result.raw.carrier || 'Unknown'}`);
      console.log(`Line items: ${result.lossItems.length}`);
    } catch (err) {
      console.log(`Error: ${err.message}`);
    }
  }
}

testPDFs();
