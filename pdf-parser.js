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
 * Extract pitch data from Annotations section for steep charge calculation
 * @param {string} text - Full PDF text
 * @returns {object} Pitch data with square footage per tier
 */
function extractPitchData(text) {
  const pitchData = {
    slopes: [],
    tier_8_9: 0,    // 8-9/12 pitch squares
    tier_10_11: 0,  // 10-11/12 pitch squares
    tier_12_plus: 0 // 12/12+ pitch squares
  };
  
  // Find all slope entries in Annotations section
  // Format: Main LevelF1682.756.837
  // Pattern breakdown: F[1-2 digits][sqft with .##][squares with .## or .#][pitch 1-2 digits]
  // Both sqft and squares always have 2 decimal places: ###.## and #.## or ##.##
  const slopePattern = /(?:Main Level|Upper Level|Lower Level)F(\d{1,2}?)(\d+\.\d{2})(\d+\.\d{1,2})(\d{1,2})$/gm;
  
  let match;
  while ((match = slopePattern.exec(text)) !== null) {
    const faceNum = match[1];
    const sqFt = parseFloat(match[2]);
    const squares = parseFloat(match[3]);
    const pitch = parseFloat(match[4]); // Parse as float to handle decimals like 9.5, 11.5
    
    if (!isNaN(pitch) && !isNaN(squares) && !isNaN(sqFt)) {
      pitchData.slopes.push({ face: `F${faceNum}`, sqFt, squares, pitch });
      
      // Categorize by tier (8/12 and above triggers steep charges)
      // 8-9.5 pitch: $5/sq, 10-11.5 pitch: $10/sq, 12+ pitch: $20/sq
      if (pitch >= 8 && pitch <= 9.5) {
        pitchData.tier_8_9 += squares;
      } else if (pitch >= 10 && pitch <= 11.5) {
        pitchData.tier_10_11 += squares;
      } else if (pitch >= 12) {
        pitchData.tier_12_plus += squares;
      }
    }
  }
  
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
