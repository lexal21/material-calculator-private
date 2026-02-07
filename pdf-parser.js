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
  
  // NEW format: "F1916.93 ft²9.17 sq6:12" is concatenated
  // Strategy: Match the whole pattern, then parse backwards using squares as anchor
  const lines = text.split('\n');
  
  for (const line of lines) {
    // Look for facet lines: starts with F followed by numbers
    const match = line.match(/^F(\d+)([\d,.]+)\s*ft[²2]([\d,.]+)\s*sq(\d+):(\d+)/i);
    if (!match) continue;
    
    const fullFacetNum = match[1]; // This might be "1916" instead of "1"
    const areaStr = match[2].replace(/,/g, '');
    const squares = parseFloat(match[3].replace(/,/g, ''));
    const rise = parseInt(match[4]);
    const run = parseInt(match[5]);
    
    // Expected area from squares (squares ≈ area / 100)
    const expectedArea = squares * 100;
    
    // The fullFacetNum is concatenated: "1916" when it should be facet="1", area start="916"
    // We need to figure out where facet ends and area begins
    // Facets are typically 1-2 digits: F1, F2, F3, ... F14, etc.
    
    let facetNum = fullFacetNum;
    let area = parseFloat(areaStr);
    
    // Try to find the correct split point
    for (let facetLen = 1; facetLen <= 2 && facetLen < fullFacetNum.length; facetLen++) {
      const testFacet = fullFacetNum.substring(0, facetLen);
      const remainingDigits = fullFacetNum.substring(facetLen);
      const testArea = parseFloat(remainingDigits + areaStr);
      
      // Check if this matches expected area better
      const error = Math.abs(testArea - expectedArea);
      if (error < expectedArea * 0.1) { // Within 10%
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
  }
  
  console.log(`  ✓ Found ${pitchData.length} facets with pitch data`);
  return pitchData;
}

module.exports = { parseRidgeTopPDF };
