const fs = require('fs');
const pdf = require('pdf-parse-fork');
const path = require('path');

async function debugPDF() {
  const pdfPath = path.join('..', 'samples', 'measurements', 'ahl-ridgetop.pdf');
  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdf(dataBuffer);
  
  console.log('=== RAW PDF TEXT ===\n');
  console.log(data.text);
  console.log('\n=== END ===');
}

debugPDF().catch(console.error);
