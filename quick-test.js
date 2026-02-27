const lossParser = require('./loss-parser');
const path = require('path');

async function test() {
  const pdfs = ['test1.pdf', 'test2.pdf'];
  
  for (const pdf of pdfs) {
    console.log(`\n=== ${pdf} ===`);
    try {
      const result = await lossParser.parseCompleteLossSheet(path.join('..', pdf));
      console.log(`Carrier: ${result.raw.carrier || 'Unknown'}`);
      console.log(`Line items: ${result.lossItems.length}`);
    } catch (err) {
      console.log(`Error: ${err.message}`);
    }
  }
}

test();
