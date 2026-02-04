// Better algorithm
function parseNumbers(str) {
  // Squares is always X.XX or XX.XX (1-2 digits, dot, EXACTLY 2 digits)
  // Find this pattern, then split accordingly
  
  // Match pattern for squares: 1-2 digits, dot, exactly 2 digits
  // But we need to find the RIGHT occurrence
  
  // Strategy: Find all X.XX patterns, then use context to identify which is squares
  // Actually, let's be smarter: work backwards
  // 1. Extract pitch from the end (it's after the last X.XX pattern)
  // 2. Extract squares (the last X.XX pattern)
  // 3. What remains is sqft
  
  // Find the last occurrence of X.XX or XX.XX pattern
  const squaresPattern = /(\d{1,2})\.(\d{2})/g;
  let matches = [];
  let match;
  
  while ((match = squaresPattern.exec(str)) !== null) {
    matches.push({
      value: match[0],
      index: match.index,
      endIndex: match.index + match[0].length
    });
  }
  
  if (matches.length < 1) return null;
  
  // The LAST X.XX pattern is likely the squares
  const squaresMatch = matches[matches.length - 1];
  const squares = parseFloat(squaresMatch.value);
  
  // Everything after squares is pitch
  const pitchStr = str.substring(squaresMatch.endIndex);
  const pitch = parseFloat(pitchStr);
  
  // Everything before squares is sqft
  const sqftStr = str.substring(0, squaresMatch.index);
  const sqft = parseFloat(sqftStr);
  
  return { sqft, squares, pitch };
}

// Test cases
console.log('Test 1:', parseNumbers('869.48.6910')); // Should be: 869.4, 8.69, 10
console.log('Test 2:', parseNumbers('192.961.9310')); // Should be: 192.96, 1.93, 10
console.log('Test 3:', parseNumbers('17.220.177.5')); // Should be: 17.22, 0.17, 7.5
console.log('Test 4:', parseNumbers('30.210.37.13')); // Should be: 30.21, 0.3, 7.13
console.log('Test 5:', parseNumbers('0.650.0110')); // Should be: 0.65, 0.01, 10
console.log('Test 6:', parseNumbers('745.187.4510')); // Should be: 745.18, 7.45, 10
