const lossParser = require('./loss-parser');
const path = require('path');

const pdfPath = path.join(__dirname, '..', 'Colleran_Loss.pdf');

lossParser.parseCompleteLossSheet(pdfPath)
  .then(result => {
    console.log('\n=== CARRIER DETECTION ===');
    console.log('Carrier:', result.raw.carrier || 'Unknown');
    
    console.log('\n=== LINE ITEMS ===');
    console.log('Total items:', result.lossItems.length);
    
    result.lossItems.forEach((item, idx) => {
      console.log(`\n${idx + 1}. ${item.description}`);
      console.log(`   Qty: ${item.quantity} ${item.unit} | Unit Price: $${item.unit_price} | RCV: $${item.rcv} | ACV: $${item.acv}`);
    });
    
    console.log('\n=== TOTALS ===');
    console.log('Subtotal:', result.subtotal);
    console.log('Tax:', result.tax);
    console.log('Grand Total:', result.grandTotal);
  })
  .catch(err => {
    console.error('Parse error:', err.message);
  });
