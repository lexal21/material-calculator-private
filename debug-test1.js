const lossParser = require('./loss-parser');
const path = require('path');

lossParser.parseCompleteLossSheet(path.join('..', 'test1.pdf'))
  .then(result => {
    console.log('Carrier:', result.raw.carrier || 'Unknown');
    console.log('Line items:', result.lossItems.length);
    console.log('\nFirst 500 chars of extracted text:');
    console.log(result._debugText?.substring(0, 500));
  });
