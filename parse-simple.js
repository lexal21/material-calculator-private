// Simplest approach: split by decimals and use positional logic
function parseNumbers(str) {
  // Count decimals
  const parts = str.split('.');
  const numDecimals = parts.length - 1;
  
  console.log(`String: ${str}, Decimals: ${numDecimals}, Parts:`, parts);
  
  if (numDecimals === 2) {
    // Format: XXX.YY.ZZ where:
    // - XXX.Y is sqft (e.g., "869.4" from parts "869" and "4...")
    // - Y.ZZ is squares (e.g., "8.69" from parts "...8" and "69...")  
    // - ZZ is pitch (e.g., "10" from parts "...10")
    
    // The trick: parts[1] contains BOTH the sqft decimal AND the squares integer
    // Example: ["869", "48", "6910"]
    // - sqft = "869." + first char of "48" = "869.4"
    // - squares = remaining chars of "48" + "." + first 2 chars of "6910" = "8.69"
    // - pitch = remaining chars of "6910" = "10"
    
    // Assume sqft has 1 decimal place (most common)
    const sqft = parseFloat(parts[0] + '.' + parts[1].charAt(0));
    
    // Squares: rest of parts[1] + "." + first 2 chars of parts[2]
    const squaresInt = parts[1].substring(1);
    const squaresDec = parts[2].substring(0, 2);
    const squares = parseFloat(squaresInt + '.' + squaresDec);
    
    // Pitch: rest of parts[2]
    const pitch = parseFloat(parts[2].substring(2));
    
    return { sqft, squares, pitch };
  }
  
  return null;
}

// Test
console.log(parseNumbers('869.48.6910'));
console.log(parseNumbers('192.961.9310'));
console.log(parseNumbers('745.187.4510'));
