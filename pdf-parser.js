const fs = require('fs');
const pdf = require('pdf-parse-fork');
const { parseConcatenatedNumbers } = require('./parse-numbers');

/**
 * Extract measurements from Ridge Top PDF report (supports old and new formats)
 * @param {string} pdfPath - Path to PDF file
 * @returns {Promise<object>} Extracted measurements
 */
async function parseRidgeTopPDF(pdfPath) {
  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdf(dataBuffer);
  
  const text = data.text;
  
  console.log('Attempting to parse Ridge Top PDF...');
  
  // Try NEW format first (2025+ format)
  let measurements = parseNewFormat(text);
  
  // If new format failed, try OLD format
  if (!measurements || !measurements.roof_sq || parseFloat(measurements.roof_sq) === 0) {
    console.log('New format failed, trying old format...');
    measurements = parseOldFormat(text);
  } else {
    console.log('Successfully parsed NEW format!');
  }
  
  // Extract common fields
  measurements.address = extractAddress(text);
  measurements.order_number = extractOrderNumber(text);
  measurements.customer_name = extractCustomerName(text);
  measurements.ridge_count = estimateRidgeCount(measurements);
  measurements.pitch_data = extractPitchData(text);
  
  return measurements;
}

/**
 * Parse NEW Ridge Top format (2025+)
 * Clean labeled format with "Roof Area3,078.69 ft²" style
 */
function parseNewFormat(text) {
  console.log('Trying NEW format parser...');
  
  const measurements = {};
  
  // Extract roof squares
  const roofSqMatch = text.match(/Roof\s+Squares\s*([\d,]+(?:\.\d+)?)\s*sq/i);
  if (roofSqMatch) {
    measurements.roof_sq = roofSqMatch[1].replace(/,/g, '');
    console.log('  ✓ Roof Squares:', measurements.roof_sq);
  }
  
  // Extract roof area
  const roofAreaMatch = text.match(/Roof\s+Area\s*([\d,]+(?:\.\d+)?)\s*ft/i);
  if (roofAreaMatch) {
    measurements.roof_area = roofAreaMatch[1].replace(/,/g, '');
    console.log('  ✓ Roof Area:', measurements.roof_area);
  }
  
  // Extract perimeter
  const perimeterMatch = text.match(/Perimeter\s*([\d,]+)\s*['"]?\s*(\d+)?/i);
  if (perimeterMatch) {
    const feet = perimeterMatch[1].replace(/,/g, '');
    const inches = perimeterMatch[2] || '0';
    measurements.perimeter = parseFloat(feet) + (parseFloat(inches) / 12);
    console.log('  ✓ Perimeter:', measurements.perimeter);
  }
  
  // Extract eave
  const eaveMatch = text.match(/Eave\s*([\d,]+)\s*['"]?\s*(\d+)?/i);
  if (eaveMatch) {
    const feet = eaveMatch[1].replace(/,/g, '');
    const inches = eaveMatch[2] || '0';
    measurements.eave_edge_length = parseFloat(feet) + (parseFloat(inches) / 12);
    console.log('  ✓ Eave:', measurements.eave_edge_length);
  }
  
  // Extract rake
  const rakeMatch = text.match(/Rake\s*([\d,]+)\s*['"]?/i);
  if (rakeMatch) {
    measurements.rake_edge_length = rakeMatch[1].replace(/,/g, '');
    console.log('  ✓ Rake:', measurements.rake_edge_length);
  }
  
  // Extract ridge
  const ridgeMatch = text.match(/Ridge\s*([\d,]+)\s*['"]?\s*(\d+)?/i);
  if (ridgeMatch) {
    const feet = ridgeMatch[1].replace(/,/g, '');
    const inches = ridgeMatch[2] || '0';
    measurements.ridge_length = parseFloat(feet) + (parseFloat(inches) / 12);
    console.log('  ✓ Ridge:', measurements.ridge_length);
  }
  
  // Extract hip
  const hipMatch = text.match(/Hip\s*([\d,]+)\s*['"]?/i);
  if (hipMatch) {
    measurements.hip_length = hipMatch[1].replace(/,/g, '');
    console.log('  ✓ Hip:', measurements.hip_length);
  }
  
  // Extract valley
  const valleyMatch = text.match(/Valley\s*([\d,]+)\s*['"]?\s*(\d+)?/i);
  if (valleyMatch) {
    const feet = valleyMatch[1].replace(/,/g, '');
    const inches = valleyMatch[2] || '0';
    measurements.valley_length = parseFloat(feet) + (parseFloat(inches) / 12);
    console.log('  ✓ Valley:', measurements.valley_length);
  }
  
  // Extract step flashing
  const stepMatch = text.match(/Step\s+Flashing\s*([\d,]+)\s*['"]?\s*(\d+)?/i);
  if (stepMatch) {
    const feet = stepMatch[1].replace(/,/g, '');
    const inches = stepMatch[2] || '0';
    measurements.step_flashing = parseFloat(feet) + (parseFloat(inches) / 12);
    console.log('  ✓ Step Flashing:', measurements.step_flashing);
  }
  
  // Extract wall flashing (if present)
  const wallMatch = text.match(/Wall\s+Flashing\s*([\d,]+)\s*['"]?\s*(\d+)?/i);
  if (wallMatch) {
    const feet = wallMatch[1].replace(/,/g, '');
    const inches = wallMatch[2] || '0';
    measurements.flashing_length = parseFloat(feet) + (parseFloat(inches) / 12);
    console.log('  ✓ Wall Flashing:', measurements.flashing_length);
  }
  
  // Check if we got key data
  if (!measurements.roof_sq || parseFloat(measurements.roof_sq) === 0) {
    console.log('  ✗ NEW format: Missing roof_sq');
    return null;
  }
  
  console.log('  ✓ NEW format successfully parsed!');
  return measurements;
}

/**
 * Parse OLD Ridge Top format (legacy)
 * Concatenated format that was harder to parse
 */
function parseOldFormat(text) {
  console.log('Trying OLD format parser...');
  
  // Old regex pattern (from original pdf-parser.js)
  const summaryMatch = text.match(/Roof Summary[\s\S]*?([\d.]+)\s*ft\s*²([\d.]+)\s*sq\s*²([\d.]+)\s*ft([\d.]+)\s*ft([\d.]+)\s*ft([\d.]+)\s*ft([\d.]+)\s*ft([\d.]+)\s*ft([\d.]+)\s*ft/i);
  
  if (summaryMatch) {
    console.log('  ✓ OLD format matched!');
    return {
      roof_area: summaryMatch[1],
      roof_sq: summaryMatch[2],
      hip_length: summaryMatch[3],
      ridge_length: summaryMatch[4],
      rake_edge_length: summaryMatch[5],
      valley_length: summaryMatch[6],
      eave_edge_length: summaryMatch[7],
      flashing_length: summaryMatch[8],
      step_flashing: summaryMatch[9]
    };
  }
  
  console.log('  ✗ OLD format: No match');
  return null;
}

/**
 * Extract address from PDF
 */
function extractAddress(text) {
  // NEW format has address early in document
  // Look for pattern: "127 Chesterbrook Lane, Lexington, SC 29072"
  const addressMatch = text.match(/(\d+\s+[A-Za-z\s]+(?:Lane|Street|Road|Drive|Avenue|Court|Circle|Way|Blvd|Boulevard)[,\s]+[A-Za-z\s]+,?\s*[A-Z]{2}\s*\d{5})/i);
  if (addressMatch) {
    return addressMatch[1].trim();
  }
  
  // Fallback: look in first few lines
  const lines = text.split('\n');
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i].trim();
    if (/\d+.*(?:Lane|Street|Road|Drive|Ave|Court)/i.test(line)) {
      return line;
    }
  }
  
  return '';
}

/**
 * Extract order number
 */
function extractOrderNumber(text) {
  const match = text.match(/Order\s*#:\s*(\d+)/i);
  return match ? match[1] : '';
}

/**
 * Extract customer name
 */
function extractCustomerName(text) {
  const match = text.match(/Customer\/Insured\s*([^\n]+)/i);
  if (match && match[1] && match[1].trim() !== 'N/A') {
    return match[1].trim();
  }
  return '';
}

/**
 * Estimate ridge count based on ridge length
 */
function estimateRidgeCount(measurements) {
  const ridgeLength = parseFloat(measurements.ridge_length) || 0;
  if (ridgeLength < 50) return 1;
  if (ridgeLength < 80) return Math.ceil(ridgeLength / 30);
  return Math.ceil(ridgeLength / 25);
}

/**
 * Extract pitch data from Variables section
 */
function extractPitchData(text) {
  const pitchData = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    // Try NEW format first: "F1916.93 ft²9.17 sq6:12"
    const newMatch = line.match(/^F(\d+)([\d,.]+)\s*ft[²2]([\d,.]+)\s*sq(\d+):(\d+)/i);
    if (newMatch) {
      const fullFacetNum = newMatch[1];
      const areaStr = newMatch[2].replace(/,/g, '');
      const squares = parseFloat(newMatch[3].replace(/,/g, ''));
      const rise = parseInt(newMatch[4]);
      const run = parseInt(newMatch[5]);
      
      // Parse concatenated facet number (see logic below)
      const expectedArea = squares * 100;
      let facetNum = fullFacetNum;
      let area = parseFloat(areaStr);
      
      for (let facetLen = 1; facetLen <= 2 && facetLen < fullFacetNum.length; facetLen++) {
        const testFacet = fullFacetNum.substring(0, facetLen);
        const remainingDigits = fullFacetNum.substring(facetLen);
        const testArea = parseFloat(remainingDigits + areaStr);
        
        const error = Math.abs(testArea - expectedArea);
        if (error < expectedArea * 0.1) {
          facetNum = testFacet;
          area = testArea;
          break;
        }
      }
      
      pitchData.push({
        label: `F${facetNum}`,
        area: area,
        squares: squares,
        pitch: `${rise}:${run}`,
        rise: rise,
        run: run
      });
      continue;
    }
    
    // Try OLD format: "Main LevelF11165.9711.666" = F1, 1165.97 sqft, 11.66 squares, 6/12 pitch
    const oldMatch = line.match(/^(Main Level|Upper Level|Lower Level)F(\d)([\d.]+)$/i);
    if (!oldMatch) continue;
    
    const facetNum = oldMatch[2]; // Single digit facet (F1, F2, etc.)
    const numbersStr = oldMatch[3]; // Everything after: "1165.9711.666"
    
    // Old format pattern: AREA.XXXXXXSQUARES.XXXXPITCH
    // e.g., "1165.9711.666" = 1165.97 sqft, 11.66 squares, 6/12 pitch
    // The trick: we know squares ≈ area / 100, so use that to split correctly
    
    // Split by decimals
    const parts = numbersStr.split('.');
    if (parts.length < 3) continue; // Need at least 2 decimals
    
    // Try different split points
    let sqFt, squares, rise;
    let bestMatch = null;
    
    // Try area with 2 decimal places (most common)
    // Pattern: XXX.XXYYY.ZZPITCH or XXXX.XXYY.ZZPITCH
    for (let areaDecimals = 2; areaDecimals <= 2; areaDecimals++) {
      if (parts[1].length < areaDecimals) continue;
      
      const areaInt = parts[0];
      const areaDec = parts[1].substring(0, areaDecimals);
      const testArea = parseFloat(areaInt + '.' + areaDec);
      
      // Remaining digits after area decimals
      const remaining = parts[1].substring(areaDecimals);
      
      // Try squares with 2 decimal places
      if (remaining.length >= 1 && parts.length >= 3 && parts[2].length >= 3) {
        const squaresInt = remaining;
        const squaresDec = parts[2].substring(0, 2);
        const testSquares = parseFloat(squaresInt + '.' + squaresDec);
        
        // Rise is after squares decimals
        const testRise = parseInt(parts[2].substring(2));
        
        // Validate: squares should be ≈ area / 100
        const expectedSquares = testArea / 100;
        const error = Math.abs(expectedSquares - testSquares);
        const tolerance = Math.max(expectedSquares * 0.1, 0.5);
        
        if (error < tolerance && testRise >= 4 && testRise <= 16) {
          sqFt = testArea;
          squares = testSquares;
          rise = testRise;
          break;
        }
      }
    }
    
    if (sqFt && squares && rise) {
      pitchData.push({
        label: `F${facetNum}`,
        area: sqFt,
        squares: squares,
        pitch: `${rise}:12`,
        rise: rise,
        run: 12
      });
    }
  }
  
  console.log(`  ✓ Found ${pitchData.length} facets with pitch data`);
  
  // Calculate tier totals from facets (for labor calculator compatibility)
  const tiers = {
    tier_8_9: 0,
    tier_10_11: 0,
    tier_12_plus: 0
  };
  
  pitchData.forEach(facet => {
    const facetRise = facet.rise;
    const facetSquares = facet.squares;
    
    if (facetRise >= 8 && facetRise <= 9) {
      tiers.tier_8_9 += facetSquares;
    } else if (facetRise >= 10 && facetRise <= 11) {
      tiers.tier_10_11 += facetSquares;
    } else if (facetRise >= 12) {
      tiers.tier_12_plus += facetSquares;
    }
  });
  
  // Round to 2 decimals
  tiers.tier_8_9 = Math.round(tiers.tier_8_9 * 100) / 100;
  tiers.tier_10_11 = Math.round(tiers.tier_10_11 * 100) / 100;
  tiers.tier_12_plus = Math.round(tiers.tier_12_plus * 100) / 100;
  
  console.log(`  ✓ Calculated tiers: 8-9=${tiers.tier_8_9}, 10-11=${tiers.tier_10_11}, 12+=${tiers.tier_12_plus}`);
  
  // Return object with both facet array AND tier totals
  return {
    facets: pitchData,
    ...tiers
  };
}

/**
 * Parse PDF and calculate materials (wrapper for server.js compatibility)
 * @param {string} pdfPath - Path to PDF file
 * @param {string} location - Job location (inland/coastal)
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
  parseAndCalculate
};
