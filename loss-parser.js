const fs = require('fs');
const pdf = require('pdf-parse-fork');
const { 
  MATERIALS,
  calculateRoofRunner,
  calculateStarterCourse,
  calculateHipRidgeCap,
  calculateButtonCaps,
  calculatePlywood
} = require('./calculator');

/**
 * Parse insurance loss sheet completely - extracts customer info, measurements, line items
 * Returns same structure as /upload route for compatibility with displayResults()
 * @param {string} pdfPath - Path to PDF file
 * @param {object} options - { shed_included: boolean }
 * @returns {Promise<object>}
 */
async function parseCompleteLossSheet(pdfPath, options = {}) {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdf(dataBuffer);
    const text = data.text;
    const lines = text.split('\n');
    
    console.log('[LOSS-PARSER] Parsing complete loss sheet...');
    
    // Initialize result structure
    const result = {
      success: true,
      source: 'loss',
      shed_included: options.shed_included !== false,
      shed_squares: 0,
      raw: {},
      measurements: {},
      materials: [],
      labor: { items: [] },
      lossItems: [],
      subtotal: 0,
      tax: 0,
      grandTotal: 0
    };
    
    // ==========================================
    // EXTRACT CUSTOMER INFO
    // ==========================================
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Insured name
      if (!result.raw.customer_name && /insured/i.test(line)) {
        const nameMatch = lines[i + 1]?.trim();
        if (nameMatch && nameMatch.length > 2) {
          result.raw.customer_name = nameMatch;
        }
      }
      
      // Property address
      if (!result.raw.address && /property\s+address|loss\s+address/i.test(line)) {
        const addrMatch = lines[i + 1]?.trim();
        if (addrMatch && addrMatch.length > 5) {
          result.raw.address = addrMatch;
        }
      }
    }
    
    // ==========================================
    // EXTRACT ROOF MEASUREMENTS
    // ==========================================
    let mainRoofSquares = 0;
    let shedSquares = 0;
    let ridgeLength = 0;
    let hipLength = 0;
    let perimeterLength = 0;
    let dripEdgeEaveRake = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Number of Squares (main roof) - handles "25.54Number of Squares" (no space)
      if (/number\s*of\s*squares/i.test(line)) {
        const sqMatch = line.match(/(\d+\.?\d*)Number\s*of\s*Squares/i) || 
                        line.match(/number\s*of\s*squares\s*(\d+\.?\d*)/i) ||
                        lines[i + 1]?.match(/(\d+\.?\d*)/);
        if (sqMatch) {
          mainRoofSquares = parseFloat(sqMatch[1]);
          console.log('[LOSS-PARSER] Found main roof squares:', mainRoofSquares);
        }
      }
      
      // Shed squares from "Other Structure" or "Shed" section
      if ((/other\s+structure|shed/i.test(line)) && /roof/i.test(line)) {
        const shedMatch = line.match(/(\d+\.?\d*)\s*(SQ)/i) || lines[i + 1]?.match(/(\d+\.?\d*)\s*(SQ)/i);
        if (shedMatch) {
          shedSquares = parseFloat(shedMatch[1]);
          console.log('[LOSS-PARSER] Found shed squares:', shedSquares);
        }
      }
      
      // Total Ridge Length - handles "41.14Total Ridge Length" (no space)
      if (/total\s*ridge\s*length/i.test(line)) {
        const ridgeMatch = line.match(/(\d+\.?\d*)Total\s*Ridge\s*Length/i) ||
                           line.match(/total\s*ridge\s*length\s*(\d+\.?\d*)/i) ||
                           lines[i + 1]?.match(/(\d+\.?\d*)/);
        if (ridgeMatch) {
          ridgeLength = parseFloat(ridgeMatch[1]);
          console.log('[LOSS-PARSER] Found ridge length:', ridgeLength);
        }
      }
      
      // Total Perimeter Length - handles "304.30Total Perimeter Length" (no space)
      if (/total\s*perimeter\s*length/i.test(line)) {
        const perimMatch = line.match(/(\d+\.?\d*)Total\s*Perimeter\s*Length/i) ||
                           line.match(/total\s*perimeter\s*length\s*(\d+\.?\d*)/i) ||
                           lines[i + 1]?.match(/(\d+\.?\d*)/);
        if (perimMatch && !perimeterLength) {
          perimeterLength = parseFloat(perimMatch[1]);
          console.log('[LOSS-PARSER] Found perimeter length:', perimeterLength);
        }
      }
      
      // Total Hip Length - handles "76.66Total Hip Length" (no space)
      if (/total\s*hip\s*length/i.test(line)) {
        const hipMatch = line.match(/(\d+\.?\d*)Total\s*Hip\s*Length/i) ||
                         line.match(/total\s*hip\s*length\s*(\d+\.?\d*)/i) ||
                         lines[i + 1]?.match(/(\d+\.?\d*)/);
        if (hipMatch) {
          hipLength = parseFloat(hipMatch[1]);
          console.log('[LOSS-PARSER] Found hip length:', hipLength);
        }
      }
      
      // Drip edge EAVE+RAKE quantity (most reliable for perimeter)
      if (/drip\s+edge/i.test(line) && /eave.*rake|eave\s*\+\s*rake/i.test(line)) {
        const dripMatch = line.match(/(\d+\.?\d*)\s*(LF)/i);
        if (dripMatch) {
          dripEdgeEaveRake = parseFloat(dripMatch[1]);
          console.log('[LOSS-PARSER] Found drip edge EAVE+RAKE:', dripEdgeEaveRake);
        }
      }
    }
    
    // Store shed data
    result.shed_squares = shedSquares;
    
    // Calculate total squares (include or exclude shed based on option)
    let totalSquares = mainRoofSquares;
    if (result.shed_included && shedSquares > 0) {
      totalSquares += shedSquares;
    }
    
    // Use drip edge quantity if available, otherwise perimeter
    const actualPerimeter = dripEdgeEaveRake > 0 ? dripEdgeEaveRake : perimeterLength;
    
    // Split perimeter into eave/rake (50/50 estimate)
    const eaveLength = actualPerimeter / 2;
    const rakeLength = actualPerimeter / 2;
    
    result.raw.roof_sq = totalSquares;
    result.raw.ridge_length = ridgeLength;
    result.raw.eave_edge_length = eaveLength;
    result.raw.rake_edge_length = rakeLength;
    
    result.measurements = {
      roofSquares: totalSquares,
      ridgeLength: ridgeLength,
      eaveLength: eaveLength,
      rakeLength: rakeLength,
      valleyLength: 0,
      hipLength: hipLength,
      ridgeCount: Math.ceil(ridgeLength / 12)
    };
    
    console.log('[LOSS-PARSER] Measurements - Squares:', totalSquares, 'Ridge:', ridgeLength, 'Perimeter:', actualPerimeter);
    
    // ==========================================
    // EXTRACT LINE ITEMS FROM LOSS
    // ==========================================
    
    let shingleSquares = totalSquares; // Default to calculated squares
    let tearOffSquares = 0;
    let iceWaterFoundOnLoss = false; // Track if ice & water was explicitly on loss sheet
    const lineItems = {
      shingles: null,
      underlayment: null,
      hipRidge: null,
      ridgeVent: null,
      dripEdge: null,
      pipeBoots: null,
      stepFlashing: null,
      lFlashing: null,
      fascia: [],
      siding: [],
      windowWrap: [],
      soffit: [],
      gutters: [],
      downspouts: []
    };
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Shingles (primary source of SQ measurement)
      if (/comp.*shingle|laminated.*shingle|shingle.*rfg|3.?tab.*shingle|architectural.*shingle/i.test(line)) {
        // Check current line first, then next line
        const searchLine = /(\d+\.?\d*)\s*SQ/i.test(line) ? line : (lines[i + 1] || '');
        const match = searchLine.match(/(\d+\.?\d*)\s*SQ/i);
        if (match) {
          const val = parseFloat(match[1]);
          // Only use if greater than what we have (waste-adjusted shingle SQ is always > raw squares)
          if (val > shingleSquares) {
            shingleSquares = val;
            lineItems.shingles = { quantity: shingleSquares, unit: 'SQ' };
            console.log('[LOSS-PARSER] SHINGLE SQ EXTRACTED:', shingleSquares);
          }
        }
      }
      
      // Tear off (extract for labor only)
      if (/tear\s*off|remove.*shingle/i.test(line)) {
        const match = line.match(/(\d+\.?\d*)\s*(SQ)/i);
        if (match) {
          tearOffSquares = parseFloat(match[1]);
        }
      }
      
      // Roofing felt / underlayment
      if (/roofing\s+felt|underlayment|15.*felt|30.*felt/i.test(line)) {
        const match = line.match(/(\d+\.?\d*)\s*(SQ)/i);
        if (match) {
          lineItems.underlayment = { quantity: parseFloat(match[1]), unit: 'SQ' };
        }
      }
      
      // Hip/Ridge cap
      if (/hip.*ridge.*cap|ridge.*cap/i.test(line)) {
        const match = line.match(/(\d+\.?\d*)\s*(LF)/i);
        if (match) {
          lineItems.hipRidge = { quantity: parseFloat(match[1]), unit: 'LF' };
          console.log('[LOSS-PARSER] Found hip/ridge cap:', match[1], 'LF from line:', line);
        }
      }
      
      // Ridge vent
      if (/ridge\s+vent/i.test(line)) {
        const match = line.match(/(\d+\.?\d*)\s*(LF)/i);
        if (match) {
          lineItems.ridgeVent = { quantity: parseFloat(match[1]), unit: 'LF' };
        }
      }
      
      // Drip edge
      if (/drip\s+edge/i.test(line)) {
        const match = line.match(/(\d+\.?\d*)\s*(LF)/i);
        if (match) {
          lineItems.dripEdge = { quantity: parseFloat(match[1]), unit: 'LF' };
        }
      }
      
      // Ice & water shield detection
      if (/ice.*water|ice\s*&\s*water/i.test(line)) {
        iceWaterFoundOnLoss = true;
        // Check current line and next line for SF quantity
        const searchLine = /(\d+\.?\d*)\s*SF/i.test(line) ? line : (lines[i + 1] || '');
        const sfMatch = searchLine.match(/(\d+\.?\d*)\s*SF/i);
        if (sfMatch) {
          const sfQty = parseFloat(sfMatch[1]);
          result.measurements.valleyLength = Math.ceil(sfQty / 3);
          console.log('[LOSS-PARSER] ICE & WATER SF FOUND:', sfQty, '→ valleyLength set to:', result.measurements.valleyLength);
        }
      }
      
      // Pipe jacks / pipe boots - quantity can be on same line OR next line
      if (/pipe\s+jack|flashing.*pipe|pipe.*boot/i.test(line)) {
        const sameLine = line.match(/(\d+\.?\d*)\s*(EA)/i);
        if (sameLine) {
          lineItems.pipeBoots = { quantity: parseFloat(sameLine[1]), unit: 'EA' };
        } else {
          for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
            const nextMatch = lines[j].trim().match(/^(\d+\.?\d*)\s*(EA)/i);
            if (nextMatch) {
              lineItems.pipeBoots = { quantity: parseFloat(nextMatch[1]), unit: 'EA' };
              break;
            }
          }
        }
      }
      
      // Fascia without R&R prefix (Griston and similar carriers)
      if (!lineItems.fascia.length && /fascia/i.test(line) && !/R&R|Replace/i.test(line)) {
        const sameLine = line.match(/(\d+\.?\d*)\s*(LF)/i);
        if (sameLine) {
          lineItems.fascia.push({ name: 'Fascia', quantity: parseFloat(sameLine[1]), unit: 'LF' });
        } else {
          for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
            const nextMatch = lines[j].trim().match(/^(\d+\.?\d*)\s*(LF)/i);
            if (nextMatch) {
              lineItems.fascia.push({ name: 'Fascia', quantity: parseFloat(nextMatch[1]), unit: 'LF' });
              break;
            }
          }
        }
      }
      
      // Soffit without R&R prefix
      if (!lineItems.soffit.length && /soffit/i.test(line) && !/R&R|Replace/i.test(line)) {
        const sameLine = line.match(/(\d+\.?\d*)\s*(LF|SF)/i);
        if (sameLine) {
          lineItems.soffit.push({ name: 'Soffit', quantity: parseFloat(sameLine[1]), unit: sameLine[2].toUpperCase() });
        } else {
          for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
            const nextMatch = lines[j].trim().match(/^(\d+\.?\d*)\s*(LF|SF)/i);
            if (nextMatch) {
              lineItems.soffit.push({ name: 'Soffit', quantity: parseFloat(nextMatch[1]), unit: nextMatch[2].toUpperCase() });
              break;
            }
          }
        }
      }
      
      // Gutters without R&R prefix
      if (!lineItems.gutters.length && /gutter/i.test(line) && !/R&R|Replace/i.test(line)) {
        const sameLine = line.match(/(\d+\.?\d*)\s*(LF)/i);
        if (sameLine) {
          lineItems.gutters.push({ name: 'Gutter', quantity: parseFloat(sameLine[1]), unit: 'LF' });
        } else {
          for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
            const nextMatch = lines[j].trim().match(/^(\d+\.?\d*)\s*(LF)/i);
            if (nextMatch) {
              lineItems.gutters.push({ name: 'Gutter', quantity: parseFloat(nextMatch[1]), unit: 'LF' });
              break;
            }
          }
        }
      }
      
      // Downspouts without R&R prefix
      if (!lineItems.downspouts.length && /downspout/i.test(line) && !/R&R|Replace/i.test(line)) {
        const sameLine = line.match(/(\d+\.?\d*)\s*(LF|EA)/i);
        if (sameLine) {
          lineItems.downspouts.push({ name: 'Downspout', quantity: parseFloat(sameLine[1]), unit: sameLine[2].toUpperCase() });
        } else {
          for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
            const nextMatch = lines[j].trim().match(/^(\d+\.?\d*)\s*(LF|EA)/i);
            if (nextMatch) {
              lineItems.downspouts.push({ name: 'Downspout', quantity: parseFloat(nextMatch[1]), unit: nextMatch[2].toUpperCase() });
              break;
            }
          }
        }
      }
      
      // Siding without R&R prefix
      if (!lineItems.siding && /vinyl\s+siding|hardboard\s+siding|siding.*lap|lap.*siding/i.test(line) && !/R&R|Replace/i.test(line)) {
        const sameLine = line.match(/(\d+\.?\d*)\s*(SQ|SF)/i);
        if (sameLine) {
          lineItems.siding = { quantity: parseFloat(sameLine[1]), unit: sameLine[2].toUpperCase() };
        } else {
          for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
            const nextMatch = lines[j].trim().match(/^(\d+\.?\d*)\s*(SQ|SF)/i);
            if (nextMatch) {
              lineItems.siding = { quantity: parseFloat(nextMatch[1]), unit: nextMatch[2].toUpperCase() };
              break;
            }
          }
        }
      }
      
      // Step flashing
      if (/step\s+flashing/i.test(line)) {
        const match = line.match(/(\d+\.?\d*)\s*(LF)/i);
        if (match) {
          lineItems.stepFlashing = { quantity: parseFloat(match[1]), unit: 'LF' };
        }
      }
      
      // L flashing / trim coil
      if (/flashing.*14|l\s+flashing|trim\s+coil/i.test(line)) {
        const match = line.match(/(\d+\.?\d*)\s*(LF)/i);
        if (match) {
          lineItems.lFlashing = { quantity: parseFloat(match[1]), unit: 'LF' };
        }
      }
      
      // R&R items (only if contains R&R or Replace)
      // COLUMN-AGNOSTIC APPROACH: Find description line, then look for next line starting with number + unit
      if (/R&R|Replace/i.test(line)) {
        
        // Helper: Find next line starting with number + unit (ignores column positions)
        const findQuantityInNextLines = (startIndex, unitPattern) => {
          // Check next 5 lines for a line starting with a number followed by the expected unit
          for (let j = startIndex + 1; j < Math.min(startIndex + 6, lines.length); j++) {
            const nextLine = lines[j].trim();
            // Look for line starting with number (with optional whitespace/formatting)
            const match = nextLine.match(new RegExp(`^\\s*(\\d+\\.?\\d*)\\s*(${unitPattern})`, 'i'));
            if (match) {
              return { quantity: parseFloat(match[1]), unit: match[2].toUpperCase() };
            }
          }
          return null;
        };
        
        // Fascia - DEBUG LOGGING ENABLED
        if (/fascia/i.test(line)) {
          console.log('[LOSS-PARSER] FASCIA DEBUG:');
          console.log('  Description line:', line);
          for (let j = i + 1; j <= Math.min(i + 5, lines.length - 1); j++) {
            console.log(`  Next line [+${j-i}]:`, lines[j]);
          }
          
          const fasciaFound = findQuantityInNextLines(i, 'LF|SF');
          console.log('  Extraction result:', fasciaFound);
          
          if (fasciaFound) {
            lineItems.fascia.push({
              name: line.replace(/R&R|Replace/i, '').trim() || 'Fascia',
              quantity: fasciaFound.quantity,
              unit: fasciaFound.unit
            });
            console.log('  ✅ Extracted:', lineItems.fascia[lineItems.fascia.length - 1]);
          } else {
            console.log('  ❌ No quantity found in next 5 lines');
          }
        }
        
        // Siding
        if (/siding/i.test(line)) {
          const sidingFound = findQuantityInNextLines(i, 'SF');
          if (sidingFound) {
            lineItems.siding.push({
              name: line.replace(/R&R|Replace/i, '').trim() || 'Siding',
              quantity: sidingFound.quantity,
              unit: sidingFound.unit
            });
          }
        }
        
        // Window wrap
        if (/wrap.*window|window.*wrap/i.test(line)) {
          const wrapFound = findQuantityInNextLines(i, 'EA|LF');
          if (wrapFound) {
            lineItems.windowWrap.push({
              name: line.replace(/R&R|Replace/i, '').trim() || 'Window Wrap',
              quantity: wrapFound.quantity,
              unit: wrapFound.unit
            });
          }
        }
        
        // Soffit
        if (/soffit/i.test(line)) {
          const soffitFound = findQuantityInNextLines(i, 'SF');
          if (soffitFound) {
            lineItems.soffit.push({
              name: line.replace(/R&R|Replace/i, '').trim() || 'Soffit',
              quantity: soffitFound.quantity,
              unit: soffitFound.unit
            });
          }
        }
        
        // Gutters
        if (/gutter/i.test(line)) {
          const gutterFound = findQuantityInNextLines(i, 'LF');
          if (gutterFound) {
            lineItems.gutters.push({
              name: line.replace(/R&R|Replace/i, '').trim() || 'Gutter',
              quantity: gutterFound.quantity,
              unit: gutterFound.unit
            });
          }
        }
        
        // Downspouts
        if (/downspout/i.test(line)) {
          const downspoutFound = findQuantityInNextLines(i, 'LF');
          if (downspoutFound) {
            lineItems.downspouts.push({
              name: line.replace(/R&R|Replace/i, '').trim() || 'Downspout',
              quantity: downspoutFound.quantity,
              unit: downspoutFound.unit
            });
          }
        }
        
        // L flashing (from R&R section) - DEBUG LOGGING ENABLED
        if (/l\s+flashing|flashing.*l\s|flashing.*galvanized/i.test(line)) {
          console.log('[LOSS-PARSER] L FLASHING DEBUG:');
          console.log('  Description line:', line);
          for (let j = i + 1; j <= Math.min(i + 5, lines.length - 1); j++) {
            console.log(`  Next line [+${j-i}]:`, lines[j]);
          }
          
          const lFlashFound = findQuantityInNextLines(i, 'LF');
          console.log('  Extraction result:', lFlashFound);
          
          if (lFlashFound) {
            // Store in lineItems.lFlashing (not an array, just overwrite if found)
            if (!lineItems.lFlashing) {
              lineItems.lFlashing = { quantity: lFlashFound.quantity, unit: lFlashFound.unit };
              console.log('  ✅ Extracted L flashing from R&R section:', lineItems.lFlashing);
            }
          } else {
            console.log('  ❌ No quantity found in next 5 lines');
          }
        }
      }
    }
    
    // Use shingle SQ as primary squares value
    if (shingleSquares !== totalSquares) {
      console.log('[LOSS-PARSER] Overriding calculated squares with shingle line item:', shingleSquares, '(was', totalSquares, ')');
      result.raw.roof_sq = shingleSquares;
      result.measurements.roofSquares = shingleSquares;
    } else {
      console.log('[LOSS-PARSER] WARNING: No shingle line item found, using calculated squares:', totalSquares);
    }
    
    // ==========================================
    // BUILD MATERIALS LIST
    // ==========================================
    
    // Calculate shingles (bundles) - shingleSquares already includes waste
    const bundlesPerSq = 3;
    const shingleBundles = Math.ceil(shingleSquares * bundlesPerSq);
    console.log('[LOSS-PARSER] BUNDLE CALCULATION: shingleSquares =', shingleSquares, '→ bundles =', shingleBundles);
    result.materials.push({
      name: MATERIALS.shingles.name,
      quantity: shingleBundles,
      unit: MATERIALS.shingles.unit,
      unitPrice: MATERIALS.shingles.price,
      total: shingleBundles * MATERIALS.shingles.price
    });
    
    // Underlayment - use calculateRoofRunner from calculator.js
    const location = options.location || 'inland';
    const roofRunnerQty = calculateRoofRunner(shingleSquares, location);
    result.materials.push({
      name: MATERIALS.roofrunner.name,
      quantity: roofRunnerQty,
      unit: MATERIALS.roofrunner.unit,
      unitPrice: MATERIALS.roofrunner.price,
      total: roofRunnerQty * MATERIALS.roofrunner.price
    });
    
    // Starter strip - use calculateStarterCourse from calculator.js
    const starterBundles = calculateStarterCourse(rakeLength, eaveLength);
    result.materials.push({
      name: MATERIALS.starter_course.name,
      quantity: starterBundles,
      unit: MATERIALS.starter_course.unit,
      unitPrice: MATERIALS.starter_course.price,
      total: starterBundles * MATERIALS.starter_course.price
    });
    
    // Hip & Ridge - use calculateHipRidgeCap from calculator.js
    // Use hipLength from measurements (already extracted above)
    if (lineItems.hipRidge || ridgeLength > 0) {
      console.log('[LOSS-PARSER] Hip & Ridge calculation - hipLength:', result.measurements.hipLength, 'ridgeLength:', ridgeLength);
      const hipRidgeBundles = calculateHipRidgeCap(result.measurements.hipLength, ridgeLength);
      console.log('[LOSS-PARSER] Hip & Ridge bundles result:', hipRidgeBundles);
      result.materials.push({
        name: MATERIALS.hip_ridge_cap.name,
        quantity: hipRidgeBundles,
        unit: MATERIALS.hip_ridge_cap.unit,
        unitPrice: MATERIALS.hip_ridge_cap.price,
        total: hipRidgeBundles * MATERIALS.hip_ridge_cap.price
      });
    }
    
    // Ice & water shield - use correct formula: ceil(valleyLength / 63)
    const valleyLength = result.measurements.valleyLength || 0;
    const iceWaterRolls = valleyLength === 0 ? 1 : Math.ceil(valleyLength / 63);
    const iceMissing = iceWaterRolls === 0 && !iceWaterFoundOnLoss;
    const iceWaterItem = {
      name: MATERIALS.ice_water_shield.name,
      quantity: iceWaterRolls,
      unit: MATERIALS.ice_water_shield.unit,
      unitPrice: MATERIALS.ice_water_shield.price,
      total: iceWaterRolls * MATERIALS.ice_water_shield.price
    };
    if (iceMissing) {
      iceWaterItem.missingData = true;
      iceWaterItem.missingReason = 'Measurement not on loss sheet — verify manually';
    }
    result.materials.push(iceWaterItem);
    
    // Ridge vent - use correct formula: ceil((ridgeLength - (ridgeCount × 3)) / 4)
    if (ridgeLength > 0) {
      const ridgeCount = result.measurements.ridgeCount || Math.ceil(ridgeLength / 12);
      const adjustedLength = ridgeLength - (ridgeCount * 3);
      const pieces = Math.ceil(adjustedLength / 4);
      result.materials.push({
        name: MATERIALS.ridge_vent.name,
        quantity: pieces,
        unit: MATERIALS.ridge_vent.unit,
        unitPrice: MATERIALS.ridge_vent.price,
        total: pieces * MATERIALS.ridge_vent.price
      });
    }
    
    // Drip edge - use correct formula: ceil(perimeter / 10) + 3
    if (lineItems.dripEdge) {
      const pieces = Math.ceil(lineItems.dripEdge.quantity / 10) + 3;
      result.materials.push({
        name: MATERIALS.drip_edge.name,
        quantity: pieces,
        unit: MATERIALS.drip_edge.unit,
        unitPrice: MATERIALS.drip_edge.price,
        total: pieces * MATERIALS.drip_edge.price
      });
    } else if (actualPerimeter > 0) {
      const pieces = Math.ceil(actualPerimeter / 10) + 3;
      result.materials.push({
        name: MATERIALS.drip_edge.name,
        quantity: pieces,
        unit: MATERIALS.drip_edge.unit,
        unitPrice: MATERIALS.drip_edge.price,
        total: pieces * MATERIALS.drip_edge.price
      });
    }
    
    // Roofing nails (calculated)
    const nailBoxes = Math.ceil(shingleSquares / 25);
    result.materials.push({
      name: MATERIALS.roofing_nails.name,
      quantity: nailBoxes,
      unit: MATERIALS.roofing_nails.unit,
      unitPrice: MATERIALS.roofing_nails.price,
      total: nailBoxes * MATERIALS.roofing_nails.price
    });
    
    // OSB Plywood - use calculatePlywood from calculator.js (always 3 per job)
    const plywoodQty = calculatePlywood();
    result.materials.push({
      name: MATERIALS.plywood.name,
      quantity: plywoodQty,
      unit: MATERIALS.plywood.unit,
      unitPrice: MATERIALS.plywood.price,
      total: plywoodQty * MATERIALS.plywood.price
    });
    
    // Pipe boots
    if (lineItems.pipeBoots) {
      result.materials.push({
        name: 'Pipe Boot',
        quantity: lineItems.pipeBoots.quantity,
        unit: 'Piece',
        unitPrice: 12.00,
        total: lineItems.pipeBoots.quantity * 12.00
      });
    }
    
    // Step flashing - always add (0 if not found, matching roof report behavior)
    const stepFlashingQty = lineItems.stepFlashing ? Math.ceil(lineItems.stepFlashing.quantity / 10) : 0;
    const stepFlashingItem = {
      name: MATERIALS.step_flashing.name,
      quantity: stepFlashingQty,
      unit: MATERIALS.step_flashing.unit,
      unitPrice: MATERIALS.step_flashing.price,
      total: stepFlashingQty * MATERIALS.step_flashing.price
    };
    if (!lineItems.stepFlashing) {
      stepFlashingItem.missingData = true;
      stepFlashingItem.missingReason = 'Measurement not on loss sheet — verify manually';
    }
    result.materials.push(stepFlashingItem);
    if (lineItems.stepFlashing) {
      result.raw.step_flashing = lineItems.stepFlashing.quantity;
    }
    
    // L flashing - always add (0 if not found, matching roof report behavior)
    const lFlashingQty = lineItems.lFlashing ? Math.ceil(lineItems.lFlashing.quantity / 50) : 0;
    const lFlashingItem = {
      name: MATERIALS.l_flashing.name,
      quantity: lFlashingQty,
      unit: MATERIALS.l_flashing.unit,
      unitPrice: MATERIALS.l_flashing.price,
      total: lFlashingQty * MATERIALS.l_flashing.price
    };
    if (!lineItems.lFlashing) {
      lFlashingItem.missingData = true;
      lFlashingItem.missingReason = 'Measurement not on loss sheet — verify manually';
    }
    result.materials.push(lFlashingItem);
    if (lineItems.lFlashing) {
      result.raw.flashing_length = lineItems.lFlashing.quantity;
    }
    
    // Button caps - use calculateButtonCaps from calculator.js
    const buttonCaps = calculateButtonCaps(shingleSquares);
    result.materials.push({
      name: MATERIALS.button_caps.name,
      quantity: buttonCaps,
      unit: MATERIALS.button_caps.unit,
      unitPrice: MATERIALS.button_caps.price,
      total: buttonCaps * MATERIALS.button_caps.price
    });
    
    // Sealant - always 2 tubes per job (matching calculator.js)
    result.materials.push({
      name: MATERIALS.joint_sealant.name,
      quantity: 2,
      unit: MATERIALS.joint_sealant.unit,
      unitPrice: MATERIALS.joint_sealant.price,
      total: 2 * MATERIALS.joint_sealant.price
    });
    
    // ==========================================
    // BUILD LABOR ITEMS
    // ==========================================
    
    // Labor - Squares
    if (shingleSquares > 0) {
      result.labor.items.push({
        name: 'Labor - Squares',
        quantity: shingleSquares,
        unit: 'SQ',
        unitPrice: 90,
        total: shingleSquares * 90
      });
    }
    
    // Tear off
    if (tearOffSquares > 0 || shingleSquares > 0) {
      const qty = tearOffSquares > 0 ? tearOffSquares : shingleSquares;
      result.labor.items.push({
        name: 'Tear Off - 1 Layer',
        quantity: qty,
        unit: 'SQ',
        unitPrice: 25,
        total: qty * 25
      });
    }
    
    // Starter per bundle
    if (starterBundles > 0) {
      result.labor.items.push({
        name: 'Starter per Bundle',
        quantity: starterBundles,
        unit: 'BD',
        unitPrice: 25,
        total: starterBundles * 25
      });
    }
    
    // Hip & Ridge labor
    if (lineItems.hipRidge) {
      const bundles = Math.ceil(lineItems.hipRidge.quantity / 20);
      result.labor.items.push({
        name: 'Hip and Ridge Cap per Bundle',
        quantity: bundles,
        unit: 'BD',
        unitPrice: 25,
        total: bundles * 25
      });
    }
    
    // Step flashing install
    if (lineItems.stepFlashing) {
      result.labor.items.push({
        name: 'Step Flashing Install',
        quantity: lineItems.stepFlashing.quantity,
        unit: 'LF',
        unitPrice: 2,
        total: lineItems.stepFlashing.quantity * 2
      });
    }
    
    // L flashing install
    if (lineItems.lFlashing) {
      result.labor.items.push({
        name: 'L Flashing (Trim Coil) Install',
        quantity: lineItems.lFlashing.quantity,
        unit: 'LF',
        unitPrice: 2,
        total: lineItems.lFlashing.quantity * 2
      });
    }
    
    // Labor subtotal
    result.labor.subtotal = result.labor.items.reduce((sum, item) => sum + item.total, 0);
    
    // ==========================================
    // BUILD LOSS ITEMS (FROM LOSS tagged)
    // ==========================================
    
    [...lineItems.fascia, ...lineItems.siding, ...lineItems.windowWrap, 
     ...lineItems.soffit, ...lineItems.gutters, ...lineItems.downspouts].forEach(item => {
      result.lossItems.push({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: 0,  // User must enter pricing for loss-sourced items
        source: 'loss',
        color: ''
      });
    });
    
    // ==========================================
    // CALCULATE TOTALS
    // ==========================================
    
    result.subtotal = result.materials.reduce((sum, m) => sum + m.total, 0);
    result.tax = result.subtotal * 0.09;
    result.grandTotal = result.subtotal + result.tax;
    
    console.log('[LOSS-PARSER] Complete. Materials:', result.materials.length, 'Labor:', result.labor.items.length, 'Loss items:', result.lossItems.length);
    
    return result;
    
  } catch (error) {
    console.error('[LOSS-PARSER] Error:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Detect if PDF is likely a loss sheet
 * @param {string} pdfPath
 * @returns {Promise<boolean>}
 */
async function isLossSheet(pdfPath) {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdf(dataBuffer);
    const text = data.text;
    
    // Strong loss sheet indicators
    return text.includes('Replacement Cost Value') ||
           text.includes('Actual Cash Value') ||
           text.includes('Line Item Total');
  } catch (error) {
    console.error('[LOSS-PARSER] Error detecting:', error);
    return false;
  }
}

/**
 * Legacy function for simple exterior item extraction
 */
async function parseLossSheet(pdfPath) {
  return parseCompleteLossSheet(pdfPath);
}

module.exports = {
  parseCompleteLossSheet,
  parseLossSheet,
  isLossSheet,
  processDocuments: async function(pdfPaths) {
    const results = { success: true, lossItems: [] };
    
    for (const p of pdfPaths) {
      const isLoss = await isLossSheet(p);
      if (isLoss) {
        const parsed = await parseCompleteLossSheet(p);
        if (parsed.success) {
          results.lossItems = parsed.lossItems || [];
        }
      } else {
        results.roofReport = { detected: true };
      }
    }
    
    return results;
  }
};
