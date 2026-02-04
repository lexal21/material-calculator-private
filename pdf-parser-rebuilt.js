const fs = require('fs');
const pdf = require('pdf-parse-fork');

/**
 * Extract measurements from Ridge Top PDF report
 * @param {string} pdfPath - Path to PDF file
 * @returns {Promise<object>} Extracted measurements
 */
async function parseRidgeTopPDF(pdfPath) {
  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdf(dataBuffer);
  
  const text = data.text;
  
  // Ridge Top format has labels on one line, values on the next
  // Find the "Roof Summary" section
  const summaryMatch = text.match(/Roof Summary[\s\S]*?([\d.]+)\s*ft\s*²([\d.]+)\s*sq\s*²([\d.]+)\s*ft([\d.]+)\s*ft([\d.]+)\s*ft([\d.]+)\s*ft([\d.]+)\s*ft([\d.]+)\s*ft([\d.]+)\s*ft/i);
  
  let measurements = {
    roof_sq: '0',
    hip_length: '0',
    ridge_length: '0',
    rake_edge_length: '0',
    valley_length: '0',
    eave_edge_length: '0',
    flashing_length: '0',
    step_flashing: '0',
    address: extractAddress(text),
    order_number: extractOrderNumber(text)
  };
  
  if (summaryMatch) {
    measurements = {
      roof_area: summaryMatch[1],      // 2257.74 ft²
      roof_sq: summaryMatch[2],         // 22.58 sq
      hip_length: summaryMatch[3],      // 128.07 ft
      ridge_length: summaryMatch[4],    // 29 ft
      rake_edge_length: summaryMatch[5], // 52.89 ft
      valley_length: summaryMatch[6],   // 56.95 ft
      eave_edge_length: summaryMatch[7], // 189.56 ft
      flashing_length: summaryMatch[8], // 28.15 ft
      step_flashing: summaryMatch[9],   // 14.56 ft
      address: extractAddress(text),
      order_number: extractOrderNumber(text),
      customer_name: extractCustomerName(text)
    };
  }
  
  // Estimate ridge count based on complexity
  measurements.ridge_count = estimateRidgeCount(measurements);
  
  // Extract pitch data for steep charges
  measurements.pitch_data = extractPitchData(text);
  
  return measurements;
}

/**
 * Extract a numeric value using regex
 * @param {string} text - Full PDF text
 * @param {RegExp} pattern - Regex pattern to match
 * @returns {string} Extracted value or '0'
 */
function extractValue(text, pattern) {
  const match = text.match(pattern);
  return match ? match[1] : '0';
}

/**
 * Extract address from PDF
 * @param {string} text - Full PDF text
 * @returns {string} Address
 */
function extractAddress(text) {
  // Ridge Top PDFs have address at the very beginning
  // Format: "239 MAYWOOD \nDRIVE, \nMONCKS \nCORNER, SC \n29461, USA"
  
  const lines = text.split('\n');
  const addressParts = [];
  
  // Look for the address in first 8 lines (before "Order #")
  for (let i = 0; i < Math.min(lines.length, 8); i++) {
    const line = lines[i].trim();
    
    // Stop if we hit metadata
    if (/Order #|Insured name|This report/i.test(line)) {
      break;
    }
    
    // Skip empty lines
    if (!line) continue;
    
    // Collect address parts
    addressParts.push(line);
  }
  
  // Join and clean up
  let address = addressParts.join(' ').replace(/\s+/g, ' ').trim();
  
  // Truncate after zip code (5 digits, optionally followed by -4 digits)
  // This removes "United States" or any trailing text after zip
  const zipMatch = address.match(/^(.*?\d{5}(?:-\d{4})?)/);
  if (zipMatch) {
    address = zipMatch[1].trim();
  }
  
  // Remove trailing commas
  address = address.replace(/,\s*$/, '');
  
  return address || '';
}

/**
 * Extract order number from PDF
 * @param {string} text - Full PDF text
 * @returns {string} Order number
 */
function extractOrderNumber(text) {
  const match = text.match(/Order #:\s*(\d+)/i);
  return match ? match[1] : '';
}

/**
 * Extract customer/insured name from PDF
 * @param {string} text - Full PDF text
 * @returns {string} Customer name
 */
function extractCustomerName(text) {
  const match = text.match(/Insured name:\s*([^\n]+)/i);
  return match ? match[1].trim() : '';
}

/**
 * Estimate ridge count based on measurements
 * Simple heuristic: more complex roofs have multiple ridges
 * @param {object} measurements - Extracted measurements
 * @returns {number} Estimated ridge count
 */
function estimateRidgeCount(measurements) {
  const ridgeLength = parseFloat(measurements.ridge_length) || 0;
  
  // If ridge length is 0, no ridges
  if (ridgeLength === 0) return 0;
  
  // Simple heuristic: 
  // - Short ridges (< 50 ft): likely 1 ridge
  // - Medium ridges (50-80 ft): likely 2-3 ridges
  // - Long ridges (> 80 ft): likely 4+ ridges
  if (ridgeLength < 50) return 1;
  if (ridgeLength < 80) return Math.ceil(ridgeLength / 30);
  return Math.ceil(ridgeLength / 25);
}

/**
 * Extract pitch data from detailed slope table for steep charge calculation
 * @param {string} text - Full PDF text
 * @returns {object} Pitch data with square footage per tier
 */
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
  
  const lines = text.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    const tableMatch = line.match(/^(Main Level|Upper Level|Lower Level)F(\d{1,2})([\d.]+)$/i);
    
    if (tableMatch) {
      const level = tableMatch[1];
      const faceNum = tableMatch[2];
      const numbersStr = tableMatch[3];
      
      const parsed = parseConcatenatedNumbers(numbersStr);
      
      if (parsed) {
        const { sqFt, squares, pitch } = parsed;
        pitchData.slopes.push({ face: `F${faceNum}`, level, sqFt, squares, pitch });
        
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
}
      
      if (!isNaN(pitch) && !isNaN(squares) && !isNaN(sqFt)) {
        pitchData.slopes.push({ face: `F${faceNum}`, level, sqFt, squares, pitch });
        
        // Categorize by tier (8/12 and above triggers steep charges)
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
  
  // Round to 2 decimal places to avoid floating point errors
  pitchData.tier_8_9 = Math.round(pitchData.tier_8_9 * 100) / 100;
  pitchData.tier_10_11 = Math.round(pitchData.tier_10_11 * 100) / 100;
  pitchData.tier_12_plus = Math.round(pitchData.tier_12_plus * 100) / 100;
  
  return pitchData;
}

/**
 * Parse PDF and calculate materials in one step
 * @param {string} pdfPath - Path to PDF file
 * @param {string} location - 'coast' or 'inland' for RoofRunner calculation
 * @returns {Promise<object>} Measurements and calculated materials
 */
async function parseAndCalculate(pdfPath, location = 'inland') {
  const calculator = require('./calculator');
  
  const rawMeasurements = await parseRidgeTopPDF(pdfPath);
  const measurements = calculator.parseMeasurements(rawMeasurements);
  const materials = calculator.calculateMaterials(measurements, location);
  
  return {
    raw: rawMeasurements,
    measurements,
    materials,
    output: calculator.formatOutput(materials, {
      address: rawMeasurements.address,
      order: rawMeasurements.order_number
    })
  };
}

module.exports = {
  parseRidgeTopPDF,
  extractValue,
  extractAddress,
  extractOrderNumber,
  extractCustomerName,
  estimateRidgeCount,
  extractPitchData,
  parseAndCalculate
};
