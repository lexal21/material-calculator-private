const fs = require('fs');
const pdf = require('pdf-parse-fork');

const pdfPath = '../Colleran_Loss.pdf';
const dataBuffer = fs.readFileSync(pdfPath);

pdf(dataBuffer, {
  // Force extraction of all pages
  max: 0, // 0 = all pages
  version: 'v1.10.100'
}).then(data => {
  console.log('Total pages:', data.numpages);
  console.log('Text length:', data.text.length);
  console.log('\n=== FULL TEXT ===');
  console.log(data.text);
  
  // Save to file
  fs.writeFileSync('../colleran-full-text.txt', data.text);
  console.log('\n\nSaved to colleran-full-text.txt');
}).catch(err => {
  console.error('Error:', err.message);
});
