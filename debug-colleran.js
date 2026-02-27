const lossParser = require('./loss-parser');
const fs = require('fs');
const path = require('path');

const pdfPath = path.join(__dirname, '..', 'Colleran_Loss.pdf');

lossParser.parseCompleteLossSheet(pdfPath)
  .then(result => {
    console.log('\n=== DEBUG OUTPUT ===');
    console.log('\nCarrier detection:');
    console.log('  Detected:', result.raw.carrier || 'Unknown');
    
    console.log('\nMeasurements:');
    console.log('  Squares:', result.measurements.squares || 0);
    console.log('  Ridge:', result.measurements.ridgeLength || 0);
    console.log('  Perimeter:', result.measurements.perimeter || 0);
    
    console.log('\nLine items found:', result.lossItems.length);
    
    if (result.lossItems.length > 0) {
      console.log('\nFirst 3 line items:');
      result.lossItems.slice(0, 3).forEach((item, idx) => {
        console.log(`\n${idx + 1}. ${item.description}`);
        console.log(`   Qty: ${item.quantity} ${item.unit} | Unit: $${item.unit_price} | RCV: $${item.rcv}`);
      });
    } else {
      console.log('\nNo line items parsed. Checking raw text extraction...');
      
      // Save extracted text for debugging
      const debugPath = path.join(__dirname, '..', 'colleran-extracted-debug.txt');
      fs.writeFileSync(debugPath, result._debugText || 'No debug text available');
      console.log(`\nExtracted text saved to: ${debugPath}`);
      console.log('Check this file to see what OCR actually extracted.');
    }
    
    console.log('\n=== MATERIALS CALCULATED ===');
    console.log('Materials:', result.materials.length);
    console.log('Labor items:', result.labor?.items?.length || 0);
    
  })
  .catch(err => {
    console.error('Parse error:', err.message);
    console.error(err.stack);
  });
