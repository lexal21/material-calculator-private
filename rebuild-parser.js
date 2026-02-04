const fs = require('fs');

// Read original file
const original = fs.readFileSync('pdf-parser.js', 'utf8');
const lines = original.split('\n');

// Find where extractPitchData starts and ends
let startLine = null;
let endLine = null;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('function extractPitchData(text)')) {
    startLine = i;
  }
  if (startLine !== null && endLine === null && lines[i].trim() === '}' && i > startLine + 10) {
    endLine = i;
    break;
  }
}

console.log(`extractPitchData spans lines ${startLine} to ${endLine}`);

// New functions to insert
const newCode = `/**
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

/**
 * Extract pitch data from detailed slope table for steep charge calculation
 * @param {string} text - Full PDF text
 * @returns {object} Pitch data with square footage per tier
 */
function extractPitchData(text) {
  const pitchData = {
    slopes: [],
    tier_8_9: 0,
    tier_10_11: 0,
    tier_12_plus: 0
  };
  
  const lines = text.split('\\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    const tableMatch = line.match(/^(Main Level|Upper Level|Lower Level)F(\\d{1,2})([\\d.]+)$/i);
    
    if (tableMatch) {
      const level = tableMatch[1];
      const faceNum = tableMatch[2];
      const numbersStr = tableMatch[3];
      
      const parsed = parseConcatenatedNumbers(numbersStr);
      
      if (parsed) {
        const { sqFt, squares, pitch } = parsed;
        pitchData.slopes.push({ face: \`F\${faceNum}\`, level, sqFt, squares, pitch });
        
        if (pitch >= 8 && pitch < 10) {
          pitchData.tier_8_9 += squares;
        } else if (pitch >= 10 && pitch < 12) {
          pitchData.tier_10_11 += squares;
        } else if (pitch >= 12) {
          pitchData.tier_12_plus += squares;
        }
      }
    }
  }
  
  pitchData.tier_8_9 = Math.round(pitchData.tier_8_9 * 100) / 100;
  pitchData.tier_10_11 = Math.round(pitchData.tier_10_11 * 100) / 100;
  pitchData.tier_12_plus = Math.round(pitchData.tier_12_plus * 100) / 100;
  
  return pitchData;
}`;

// Build new file
const newLines = [
  ...lines.slice(0, startLine),
  ...newCode.split('\n'),
  ...lines.slice(endLine + 1)
];

fs.writeFileSync('pdf-parser-rebuilt.js', newLines.join('\n'));
console.log('Rebuilt file saved to pdf-parser-rebuilt.js');
