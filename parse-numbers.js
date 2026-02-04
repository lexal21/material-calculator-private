/**
 * Parse concatenated numbers using validation
 * @param {string} numbersStr - Concatenated numbers like "869.48.6910"
 * @returns {object|null} Parsed { sqFt, squares, pitch } or null
 */
function parseConcatenatedNumbers(numbersStr) {
  const parts = numbersStr.split('.');
  const numDecimals = parts.length - 1;
  
  if (numDecimals === 2) {
    for (let sqftDecimals = 1; sqftDecimals <= 2; sqftDecimals++) {
      const sqFt = parseFloat(parts[0] + '.' + parts[1].substring(0, sqftDecimals));
      const squaresInt = parts[1].substring(sqftDecimals);
      const squaresDec = parts[2].substring(0, 2);
      const squares = parseFloat(squaresInt + '.' + squaresDec);
      const pitch = parseFloat(parts[2].substring(2));
      
      const expectedSquares = sqFt / 100;
      const diff = Math.abs(expectedSquares - squares);
      const tolerance = expectedSquares * 0.05;
      
      if (diff < tolerance && pitch >= 4 && pitch <= 16 && !isNaN(sqFt) && !isNaN(squares) && !isNaN(pitch)) {
        return { sqFt, squares, pitch };
      }
    }
  } else if (numDecimals === 3) {
    for (let sqftDecimals = 1; sqftDecimals <= 2; sqftDecimals++) {
      const sqFt = parseFloat(parts[0] + '.' + parts[1].substring(0, sqftDecimals));
      const squaresInt = parts[1].substring(sqftDecimals);
      
      for (let squaresDec = 1; squaresDec <= Math.min(2, parts[2].length); squaresDec++) {
        const squaresDecStr = parts[2].substring(0, squaresDec);
        const squares = parseFloat(squaresInt + '.' + squaresDecStr);
        const pitchInt = parts[2].substring(squaresDec);
        const pitch = parseFloat(pitchInt + '.' + parts[3]);
        
        const expectedSquares = sqFt / 100;
        const diff = Math.abs(expectedSquares - squares);
        const tolerance = Math.max(expectedSquares * 0.05, 0.01);
        
        if (diff < tolerance && pitch >= 4 && pitch <= 16 && !isNaN(sqFt) && !isNaN(squares) && !isNaN(pitch)) {
          return { sqFt, squares, pitch };
        }
      }
    }
  }
  
  return null;
}

module.exports = { parseConcatenatedNumbers };
