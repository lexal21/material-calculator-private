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
  // Remove extra line breaks to join multi-line addresses
  const cleanedText = text.replace(/\n+/g, ' ').replace(/\s+/g, ' ');
  
  // Look for pattern: "122 LAKE LINDEN DRIVE, BLUFFTON, SC 29910"
  // OR: "801 BENT GREEN COURT, SUMMERVILLE, SOUTH CAROLINA 29485"
  // Supports: Lane, Street, Road, Drive, Avenue, Court, Circle, Way, Boulevard
  const addressMatch = cleanedText.match(/(\d+\s+[A-Za-z\s]+(?:Lane|Street|Road|Drive|Avenue|Court|Circle|Way|Blvd|Boulevard)[,\s]+[A-Za-z\s]+,?\s*(?:[A-Z]{2}|[A-Z][a-z]+\s+[A-Z][a-z]+)\s*\d{5})/i);
  if (addressMatch) {
    // Clean up the match (remove extra spaces and ", UNITED STATES")
    return addressMatch[1].replace(/\s+/g, ' ').replace(/, UNITED STATES$/, '').trim();
  }
  
  // Fallback: look for address pattern in first 500 chars
  const firstPart = text.substring(0, 500);
  const lines = firstPart.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Look for street number at start of line
    if (/^\d+\s+[A-Za-z]/i.test(line)) {
      // Try to build full address from consecutive lines
      let address = line;
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const nextLine = lines[j].trim();
        if (nextLine && !/^(Order|Insured|This report)/i.test(nextLine)) {
          address += ' ' + nextLine;
          // Stop if we found zip code
          if (/\d{5}/.test(nextLine)) break;
        }
      }
      if (/\d{5}/.test(address)) {
        return address.replace(/\s+/g, ' ').replace(/, USA$/, '').trim();
      }
    }
  }
  
  // Fallback for old Ridge Top format: "3100 HERBAL WAY, SUMTER, SC, USA"
  const oldFormatMatch = cleanedText.match(/(\d+\s+[A-Za-z\s]+(?:Lane|Street|Road|Drive|Avenue|Court|Circle|Way|Blvd|Boulevard|WAY|STREET|ROAD|DRIVE|AVENUE|COURT|CIRCLE|LANE|BLVD|BOULEVARD)[,\s]+[A-Za-z]+[,\s]+(?:[A-Z]{2}))(?:[,\s]+USA)?/i);
  if (oldFormatMatch) {
    return oldFormatMatch[1].replace(/,\s*USA$/i, '').trim();
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
 * Parse concatenated old format numbers: "30.050.312" = 30.05 sqft, 0.3 sq, 12/12 pitch
 */
function parseOldFormatNumbers(numbersStr) {
  const parts = numbersStr.split('.');
  if (parts.length < 3) return null; // Need at least 2 decimals
  
  // Try area with 2 decimal places (most common)
  // Pattern: XXX.XXYYY.ZZPITCH
  for (let areaDecimals = 1; areaDecimals <= 2; areaDecimals++) {
    if (parts[1].length < areaDecimals) continue;
    
    const areaInt = parts[0];
    const areaDec = parts[1].substring(0, areaDecimals);
    const testArea = parseFloat(areaInt + '.' + areaDec);
    
    // Remaining digits after area decimals
    const remaining = parts[1].substring(areaDecimals);
    
    // Try squares with 1-2 decimal places
    if (remaining.length >= 1 && parts.length >= 3 && parts[2].length >= 2) {
      const squaresInt = remaining;
      
      // Try 1 decimal place for squares (e.g., 0.3)
      if (parts[2].length >= 2) {
        const squaresDec1 = parts[2].substring(0, 1);
        const testSquares1 = parseFloat(squaresInt + '.' + squaresDec1);
        const testRise1 = parseInt(parts[2].substring(1));
        
        const expectedSquares1 = testArea / 100;
        const error1 = Math.abs(expectedSquares1 - testSquares1);
        const tolerance1 = Math.max(expectedSquares1 * 0.15, 0.5);
        
        if (error1 < tolerance1 && testRise1 >= 4 && testRise1 <= 16) {
          return { sqFt: testArea, squares: testSquares1, rise: testRise1 };
        }
      }
      
      // Try 2 decimal places for squares (e.g., 11.66)
      if (parts[2].length >= 3) {
        const squaresDec2 = parts[2].substring(0, 2);
        const testSquares2 = parseFloat(squaresInt + '.' + squaresDec2);
        const testRise2 = parseInt(parts[2].substring(2));
        
        const expectedSquares2 = testArea / 100;
        const error2 = Math.abs(expectedSquares2 - testSquares2);
        const tolerance2 = Math.max(expectedSquares2 * 0.15, 0.5);
        
        if (error2 < tolerance2 && testRise2 >= 4 && testRise2 <= 16) {
          return { sqFt: testArea, squares: testSquares2, rise: testRise2 };
        }
      }
    }
  }
  
  return null;
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
    // Also handles: "Main LevelF1030.050.312" = F10, 30.05 sqft, 0.3 squares, 12/12 pitch  
    const oldMatch = line.match(/^(Main Level|Upper Level|Lower Level)F(\d{1,2})([\d.]+)$/i);
    if (!oldMatch) continue;
    
    let facetNum = oldMatch[2]; // Could be 1 or 2 digits
    let numbersStr = oldMatch[3]; // Everything after facet number
    
    // IMPORTANT: When facet is 2 digits (F10), the first digit of numbersStr is actually part of the area!
    // e.g., "F1030.050.312" could be F10 + "30.050.312" OR F1 + "030.050.312"
    // We need to try both interpretations and validate
    
    let sqFt, squares, rise;
    let validParse = false;
    
    // Try as 2-digit facet first (if facetNum length is 2)
    if (facetNum.length === 2) {
      const parsed = parseOldFormatNumbers(numbersStr);
      if (parsed) {
        sqFt = parsed.sqFt;
        squares = parsed.squares;
        rise = parsed.rise;
        validParse = true;
      }
    }
    
    // If 2-digit failed or facet is single digit, try as 1-digit facet
    if (!validParse && facetNum.length === 2) {
      // Try treating first digit as facet, rest as area
      const realFacet = facetNum[0];
      const newNumbersStr = facetNum[1] + numbersStr;
      const parsed = parseOldFormatNumbers(newNumbersStr);
      if (parsed) {
        facetNum = realFacet;
        sqFt = parsed.sqFt;
        squares = parsed.squares;
        rise = parsed.rise;
        validParse = true;
      }
    }
    
    // Single digit facet
    if (!validParse && facetNum.length === 1) {
      const parsed = parseOldFormatNumbers(numbersStr);
      if (parsed) {
        sqFt = parsed.sqFt;
        squares = parsed.squares;
        rise = parsed.rise;
        validParse = true;
      }
    }
    
    if (validParse && sqFt && squares && rise) {
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
