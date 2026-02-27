const line = "13. Digital satellite system - Detach & reset 1.00 EA 47 48 0.00 47 A8 (0.00) 4748";

console.log('Testing line:', line);
console.log('');

// Test current regex
const regex1 = /^(\d+)[.,]\s+(.+?)\s+(\d+\.?\d*)\s+(SQ|LF|EA|SF)\s+([\d\s.]+)\s+([\d\s.]+)\s+([\d,\s.]+)\s+\(([\d,\s.]+)\)\s+([\d,\sA-Z.]+)$/i;

console.log('Current regex:');
const match1 = line.match(regex1);
if (match1) {
  console.log('MATCH!', match1.slice(1));
} else {
  console.log('NO MATCH');
}

// Try with more constrained pattern - limit spaces within numbers
// Pattern: number can have ONE internal space (for OCR "47 48") but fields separated by 2+ spaces or specific patterns
const regex2 = /^(\d+)[.,]\s+(.+?)\s+(\d+\.?\d*)\s+(SQ|LF|EA|SF)\s+([\d\sA-Z.]{1,10}?)\s{2,}([\d\sA-Z.]{1,10}?)\s{2,}([\d,\sA-Z.]+?)\s+\(([\d,\sA-Z.]+)\)\s+([\d,\sA-Z.]+)$/i;

console.log('\nWith constrained spaces:');
const match2 = line.match(regex2);
if (match2) {
  console.log('MATCH!', match2.slice(1));
  
  // Test cleanNumber function
  const cleanNumber = (val) => {
    if (!val) return 0;
    const cleaned = val.replace(/\s+/g, '').replace(/[A-Z]/gi, '');
    if (/^\d{3,}$/.test(cleaned) && !cleaned.includes('.')) {
      return parseFloat(cleaned.slice(0, -2) + '.' + cleaned.slice(-2));
    }
    return parseFloat(cleaned) || 0;
  };
  
  console.log('\nCleaned numbers:');
  console.log('Unit price:', cleanNumber(match2[5]));
  console.log('Tax:', cleanNumber(match2[6]));
  console.log('RCV:', cleanNumber(match2[7]));
  console.log('Deprec:', cleanNumber(match2[8]));
  console.log('ACV:', cleanNumber(match2[9]));
} else {
  console.log('NO MATCH');
  
  // Try splitting by multiple spaces
  console.log('\nTrying split approach:');
  const afterUnit = line.substring(line.indexOf('EA') + 2).trim();
  console.log('After unit:', afterUnit);
  const parts = afterUnit.split(/\s{2,}/); // Split on 2+ spaces
  console.log('Parts:', parts);
}
