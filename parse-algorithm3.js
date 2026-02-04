// Validation-based parsing
// Key insight: squares ≈ sqft / 100

function parseNumbers(str) {
  // Extract all possible numbers from the string
  const allMatches = str.match(/\d+\.?\d*/g);
  
  if (!allMatches || allMatches.length < 3) return null;
  
  // Try different combinations and validate
  // The validation is: squares should be approximately sqft / 100
  
  for (let i = 0; i < allMatches.length - 2; i++) {
    for (let j = i + 1; j < allMatches.length - 1; j++) {
      for (let k = j + 1; k < allMatches.length; k++) {
        const sqft = parseFloat(allMatches.slice(0, j).join('.'));
        const squares = parseFloat(allMatches.slice(j, k).join('.'));
        const pitch = parseFloat(allMatches.slice(k).join('.'));
        
        // Validation: squares should be close to sqft / 100
        const expectedSquares = sqft / 100;
        const diff = Math.abs(expectedSquares - squares);
        
        // Allow 5% tolerance
        if (diff / expectedSquares < 0.05 && pitch >= 4 && pitch <= 16) {
          return { sqft, squares, pitch };
        }
      }
    }
  }
  
  return null;
}

// Test cases
console.log('Test 1:', parseNumbers('869.48.6910')); // Should be: 869.4, 8.69, 10
console.log('Test 2:', parseNumbers('192.961.9310')); // Should be: 192.96, 1.93, 10
console.log('Test 3:', parseNumbers('17.220.177.5')); // Should be: 17.22, 0.17, 7.5
