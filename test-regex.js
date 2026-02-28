const testLine = '89. R&R Fascia - 1" x 4" - #1 pine 40.00 LF   7.31   3.72   296.12   10/75 yrs   Avg.   13.33%   <37.30>   258.82';
const pattern = /^(\d+)[.,]\s+(.+?)\s+(\d+\.?\d*)\s+(SQ|LF|EA|SF)\s+(.+)$/i;

console.log('===== REGEX PATTERN TEST =====');
console.log('Pattern:', pattern);
console.log('');
console.log('Test string:');
console.log('  "' + testLine + '"');
console.log('');
console.log('String length:', testLine.length);
console.log('Starts with number?', /^\d+\./.test(testLine));
console.log('Contains LF?', /LF/.test(testLine));
console.log('');

const match = testLine.match(pattern);
console.log('Match result:', match ? '✓ MATCH' : '✗ NO MATCH');

if (match) {
  console.log('');
  console.log('Captured groups:');
  console.log('  [1] Item number:', match[1]);
  console.log('  [2] Description:', match[2]);
  console.log('  [3] Quantity:', match[3]);
  console.log('  [4] Unit:', match[4]);
  console.log('  [5] Remaining:', match[5].substring(0, 100));
} else {
  console.log('');
  console.log('FAILURE ANALYSIS:');
  
  // Test each part individually
  const itemNumMatch = testLine.match(/^(\d+)[.,]\s+/);
  console.log('  Item number part:', itemNumMatch ? '✓' : '✗');
  
  if (itemNumMatch) {
    const afterItemNum = testLine.substring(itemNumMatch[0].length);
    console.log('  After item number: "' + afterItemNum.substring(0, 50) + '..."');
    
    const qtyUnitMatch = afterItemNum.match(/(\d+\.?\d*)\s+(SQ|LF|EA|SF)/i);
    console.log('  Quantity + unit part:', qtyUnitMatch ? '✓ (' + qtyUnitMatch[0] + ')' : '✗');
    
    if (qtyUnitMatch) {
      console.log('  Pattern found at position:', afterItemNum.indexOf(qtyUnitMatch[0]));
    }
  }
}
