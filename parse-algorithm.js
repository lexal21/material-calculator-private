// Algorithm to parse concatenated numbers like "869.48.6910"
// Expected format: SQFT SQUARES PITCH where decimals run together
// From Austin's screenshot: 869.4 | 8.69 | 10

function parseNumbers(str) {
  // Work backwards from the end
  // Pitch is always at the end: 1-2 digits, optionally with decimal
  // Examples: "10", "7.5", "7.13"
  
  // Strategy: pitch won't have consecutive digits before a decimal
  // So "10" is pitch, ".6910" is what remains
  // Or "7.5" is pitch (but we'd see "...7.5" at end)
  
  // Actually, let's look at what we know:
  // Squares is always X.XX format (1-2 digits, dot, 2 digits after)
  // So in "869.48.6910", the "8.69" part is squares
  // And "10" at the end is pitch
  
  // New approach: Use the fact that squares is ALWAYS X.XX or XX.XX
  // Match pattern: (anything)(X.XX or XX.XX)(pitch)
  
  // Regex: capture sqft, then X.XX or XX.XX for squares, then remaining for pitch
  const pattern = /([\d.]+?)(\d{1,2}\.\d{2})([\d.]+)$/;
  const match = str.match(pattern);
  
  if (match) {
    return {
      sqft: parseFloat(match[1]),
      squares: parseFloat(match[2]),
      pitch: parseFloat(match[3])
    };
  }
  return null;
}

// Test cases
console.log('Test 1:', parseNumbers('869.48.6910')); // Should be: 869.4, 8.69, 10
console.log('Test 2:', parseNumbers('192.961.9310')); // Should be: 192.96, 1.93, 10
console.log('Test 3:', parseNumbers('17.220.177.5')); // Should be: 17.22, 0.17, 7.5
console.log('Test 4:', parseNumbers('30.210.37.13')); // Should be: 30.21, 0.3, 7.13
console.log('Test 5:', parseNumbers('0.650.0110')); // Should be: 0.65, 0.01, 10
