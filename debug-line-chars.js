const fs = require('fs');
const pdf = require('pdf-parse-fork');

async function debugPDF() {
  const pdfPath = 'C:\\Users\\power\\.openclaw\\media\\inbound\\file_33---6fe0527b-a6cc-407b-ac45-3fc42e6bec97.pdf';
  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdf(dataBuffer);
  
  const lines = data.text.split('\n');
  
  // Find line 88 which has "Main LevelF1869.48.6910"
  const line = lines[88];
  console.log('Line 88:');
  console.log('Content:', line);
  console.log('Length:', line.length);
  console.log('Char codes:', [...line].map((c, i) => `${i}:${c}(${c.charCodeAt(0)})`).join(' '));
}

debugPDF().catch(console.error);
