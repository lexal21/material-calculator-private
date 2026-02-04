// Parse with validation using sqft ≈ squares * 100
function parseNumbers(str) {
  const parts = str.split('.');
  const numDecimals = parts.length - 1;
  
  if (numDecimals === 2) {
    // Try both 1-decimal and 2-decimal sqft
    for (let sqftDecimals = 1; sqftDecimals <= 2; sqftDecimals++) {
      const sqft = parseFloat(parts[0] + '.' + parts[1].substring(0, sqftDecimals));
      
      // Squares: rest of parts[1] + "." + first 2 chars of parts[2]
      const squaresInt = parts[1].substring(sqftDecimals);
      const squaresDec = parts[2].substring(0, 2);
      const squares = parseFloat(squaresInt + '.' + squaresDec);
      
      // Pitch: rest of parts[2]
      const pitch = parseFloat(parts[2].substring(2));
      
      // Validate: squares should be approximately sqft / 100
      const expectedSquares = sqft / 100;
      const diff = Math.abs(expectedSquares - squares);
      const tolerance = expectedSquares * 0.05; // 5% tolerance
      
      if (diff < tolerance && pitch >= 4 && pitch <= 16) {
        return { sqft, squares, pitch };
      }
    }
  } else if (numDecimals === 3) {
    // Format with decimal pitch: XXX.YY.ZZ.W (e.g., "17.220.177.5")
    // Pitch has a decimal, so parts[3] is the pitch decimal
    
    // Try both 1-decimal and 2-decimal sqft
    for (let sqftDecimals = 1; sqftDecimals <= 2; sqftDecimals++) {
      const sqft = parseFloat(parts[0] + '.' + parts[1].substring(0, sqftDecimals));
      
      // Squares: rest of parts[1] + "." + parts[2] (first 1-2 chars)
      const squaresInt = parts[1].substring(sqftDecimals);
      
      // Try 1 or 2 decimal places for squares
      for (let squaresDec = 1; squaresDec <= Math.min(2, parts[2].length); squaresDec++) {
        const squaresDecStr = parts[2].substring(0, squaresDec);
        const squares = parseFloat(squaresInt + '.' + squaresDecStr);
        
        // Pitch: rest of parts[2] + "." + parts[3]
        const pitchInt = parts[2].substring(squaresDec);
        const pitch = parseFloat(pitchInt + '.' + parts[3]);
        
        // Validate
        const expectedSquares = sqft / 100;
        const diff = Math.abs(expectedSquares - squares);
        const tolerance = Math.max(expectedSquares * 0.05, 0.01);
        
        if (diff < tolerance && pitch >= 4 && pitch <= 16) {
          return { sqft, squares, pitch };
        }
      }
    }
  }
  
  return null;
}

// Test
console.log('Test 1:', parseNumbers('869.48.6910')); // 869.4, 8.69, 10
console.log('Test 2:', parseNumbers('192.961.9310')); // 192.96, 1.93, 10
console.log('Test 3:', parseNumbers('745.187.4510')); // 745.18, 7.45, 10
console.log('Test 4:', parseNumbers('17.220.177.5')); // 17.22, 0.17, 7.5
