const fs = require('fs');
const pdf = require('pdf-parse-fork');
const { MATERIALS } = require('./calculator');

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
    let perimeterLength = 0;
    let dripEdgeEaveRake = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Number of Squares (main roof) - handles "25.54 Number of Squares" OR "Number of Squares 25.54"
      if (/number\s+of\s+squares/i.test(line)) {
        // Try number before label first, then number after label
        const sqMatch = line.match(/(\d+\.?\d*)\s+number\s+of\s+squares/i) || 
                        line.match(/number\s+of\s+squares\s+(\d+\.?\d*)/i) ||
                        lines[i + 1]?.match(/(\d+\.?\d*)/);
        if (sqMatch) {
          mainRoofSquares = parseFloat(sqMatch[1]);
          console.log('[LOSS-PARSER] Found main roof squares:', mainRoofSquares);
        }
      }
      
      // Shed squares from "Other Structure" or "Shed" section
      if ((/other\s+structure|shed/i.test(line)) && /roof/i.test(line)) {
        const shedMatch = line.match(/(\d+\.?\d*)\s*SQ/i) || lines[i + 1]?.match(/(\d+\.?\d*)\s*SQ/i);
        if (shedMatch) {
          shedSquares = parseFloat(shedMatch[1]);
          console.log('[LOSS-PARSER] Found shed squares:', shedSquares);
        }
      }
      
      // Total Ridge Length - handles "41.14 Total Ridge Length" OR "Total Ridge Length 41.14"
      if (/total\s+ridge\s+length/i.test(line)) {
        const ridgeMatch = line.match(/(\d+\.?\d*)\s+total\s+ridge\s+length/i) ||
                           line.match(/total\s+ridge\s+length\s+(\d+\.?\d*)/i) ||
                           lines[i + 1]?.match(/(\d+\.?\d*)/);
        if (ridgeMatch) {
          ridgeLength = parseFloat(ridgeMatch[1]);
          console.log('[LOSS-PARSER] Found ridge length:', ridgeLength);
        }
      }
      
      // Total Perimeter Length - handles "304.30 Total Perimeter Length" OR "Total Perimeter Length 304.30"
      if (/total\s+perimeter\s+length/i.test(line)) {
        const perimMatch = line.match(/(\d+\.?\d*)\s+total\s+perimeter\s+length/i) ||
                           line.match(/total\s+perimeter\s+length\s+(\d+\.?\d*)/i) ||
                           lines[i + 1]?.match(/(\d+\.?\d*)/);
        if (perimMatch) {
          perimeterLength = parseFloat(perimMatch[1]);
          console.log('[LOSS-PARSER] Found perimeter length:', perimeterLength);
        }
      }
      
      // Total Hip Length - handles "76.66 Total Hip Length" OR "Total Hip Length 76.66"
      if (/total\s+hip\s+length/i.test(line)) {
        const hipMatch = line.match(/(\d+\.?\d*)\s+total\s+hip\s+length/i) ||
                         line.match(/total\s+hip\s+length\s+(\d+\.?\d*)/i) ||
                         lines[i + 1]?.match(/(\d+\.?\d*)/);
        if (hipMatch) {
          const hipLength = parseFloat(hipMatch[1]);
          result.measurements.hipLength = hipLength;
          console.log('[LOSS-PARSER] Found hip length:', hipLength);
        }
      }
      
      // Drip edge EAVE+RAKE quantity (most reliable for perimeter)
      if (/drip\s+edge/i.test(line) && /eave.*rake|eave\s*\+\s*rake/i.test(line)) {
        const dripMatch = line.match(/(\d+\.?\d*)\s*LF/i);
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
      hipLength: 0,
      ridgeCount: Math.ceil(ridgeLength / 12)
    };
    
    console.log('[LOSS-PARSER] Measurements - Squares:', totalSquares, 'Ridge:', ridgeLength, 'Perimeter:', actualPerimeter);
    
    // ==========================================
    // EXTRACT LINE ITEMS FROM LOSS
    // ==========================================
    
    let shingleSquares = totalSquares; // Default to calculated squares
    let tearOffSquares = 0;
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
      if ((/comp.*shingle|laminated|3-tab|architectural.*shingle/i.test(line)) && /(\d+\.?\d*)\s*SQ/i.test(line)) {
        const match = line.match(/(\d+\.?\d*)\s*SQ/i);
        if (match) {
          shingleSquares = parseFloat(match[1]);
          lineItems.shingles = { quantity: shingleSquares, unit: 'SQ' };
        }
      }
      
      // Tear off (extract for labor only)
      if (/tear\s*off|remove.*shingle/i.test(line) && /(\d+\.?\d*)\s*SQ/i.test(line)) {
        const match = line.match(/(\d+\.?\d*)\s*SQ/i);
        if (match) {
          tearOffSquares = parseFloat(match[1]);
        }
      }
      
      // Roofing felt / underlayment
      if (/roofing\s+felt|underlayment|15.*felt|30.*felt/i.test(line) && /(\d+\.?\d*)\s*SQ/i.test(line)) {
        const match = line.match(/(\d+\.?\d*)\s*SQ/i);
        if (match) {
          lineItems.underlayment = { quantity: parseFloat(match[1]), unit: 'SQ' };
        }
      }
      
      // Hip/Ridge cap
      if (/hip.*ridge.*cap|ridge.*cap/i.test(line) && /(\d+\.?\d*)\s*LF/i.test(line)) {
        const match = line.match(/(\d+\.?\d*)\s*LF/i);
        if (match) {
          lineItems.hipRidge = { quantity: parseFloat(match[1]), unit: 'LF' };
        }
      }
      
      // Ridge vent
      if (/ridge\s+vent/i.test(line) && /(\d+\.?\d*)\s*LF/i.test(line)) {
        const match = line.match(/(\d+\.?\d*)\s*LF/i);
        if (match) {
          lineItems.ridgeVent = { quantity: parseFloat(match[1]), unit: 'LF' };
        }
      }
      
      // Drip edge
      if (/drip\s+edge/i.test(line) && /(\d+\.?\d*)\s*LF/i.test(line)) {
        const match = line.match(/(\d+\.?\d*)\s*LF/i);
        if (match) {
          lineItems.dripEdge = { quantity: parseFloat(match[1]), unit: 'LF' };
        }
      }
      
      // Pipe jacks / pipe boots
      if (/pipe\s+jack|flashing.*pipe|pipe.*boot/i.test(line) && /(\d+\.?\d*)\s*EA/i.test(line)) {
        const match = line.match(/(\d+\.?\d*)\s*EA/i);
        if (match) {
          lineItems.pipeBoots = { quantity: parseFloat(match[1]), unit: 'EA' };
        }
      }
      
      // Step flashing
      if (/step\s+flashing/i.test(line) && /(\d+\.?\d*)\s*LF/i.test(line)) {
        const match = line.match(/(\d+\.?\d*)\s*LF/i);
        if (match) {
          lineItems.stepFlashing = { quantity: parseFloat(match[1]), unit: 'LF' };
        }
      }
      
      // L flashing / trim coil
      if ((/flashing.*14|l\s+flashing|trim\s+coil/i.test(line)) && /(\d+\.?\d*)\s*LF/i.test(line)) {
        const match = line.match(/(\d+\.?\d*)\s*LF/i);
        if (match) {
          lineItems.lFlashing = { quantity: parseFloat(match[1]), unit: 'LF' };
        }
      }
      
      // R&R items (only if contains R&R or Replace)
      if (/R&R|Replace/i.test(line)) {
        // Fascia
        if (/fascia/i.test(line)) {
          const match = line.match(/(\d+\.?\d*)\s*(LF|SF)/i);
          if (match) {
            const desc = line.replace(/^\d+\.?\s*/, '').split(/\d+\.?\d*\s*(LF|SF)/i)[0].trim();
            lineItems.fascia.push({
              name: desc || 'Fascia',
              quantity: parseFloat(match[1]),
              unit: match[2].toUpperCase()
            });
          }
        }
        
        // Siding
        if (/siding/i.test(line)) {
          const match = line.match(/(\d+\.?\d*)\s*SF/i);
          if (match) {
            const desc = line.replace(/^\d+\.?\s*/, '').split(/\d+\.?\d*\s*SF/i)[0].trim();
            lineItems.siding.push({
              name: desc || 'Siding',
              quantity: parseFloat(match[1]),
              unit: 'SF'
            });
          }
        }
        
        // Window wrap
        if (/wrap.*window|window.*wrap/i.test(line)) {
          const match = line.match(/(\d+\.?\d*)\s*(EA|LF)/i);
          if (match) {
            const desc = line.replace(/^\d+\.?\s*/, '').split(/\d+\.?\d*\s*(EA|LF)/i)[0].trim();
            lineItems.windowWrap.push({
              name: desc || 'Window Wrap',
              quantity: parseFloat(match[1]),
              unit: match[2].toUpperCase()
            });
          }
        }
        
        // Soffit
        if (/soffit/i.test(line)) {
          const match = line.match(/(\d+\.?\d*)\s*SF/i);
          if (match) {
            const desc = line.replace(/^\d+\.?\s*/, '').split(/\d+\.?\d*\s*SF/i)[0].trim();
            lineItems.soffit.push({
              name: desc || 'Soffit',
              quantity: parseFloat(match[1]),
              unit: 'SF'
            });
          }
        }
        
        // Gutters
        if (/gutter/i.test(line)) {
          const match = line.match(/(\d+\.?\d*)\s*LF/i);
          if (match) {
            const desc = line.replace(/^\d+\.?\s*/, '').split(/\d+\.?\d*\s*LF/i)[0].trim();
            lineItems.gutters.push({
              name: desc || 'Gutter',
              quantity: parseFloat(match[1]),
              unit: 'LF'
            });
          }
        }
        
        // Downspouts
        if (/downspout/i.test(line)) {
          const match = line.match(/(\d+\.?\d*)\s*LF/i);
          if (match) {
            const desc = line.replace(/^\d+\.?\s*/, '').split(/\d+\.?\d*\s*LF/i)[0].trim();
            lineItems.downspouts.push({
              name: desc || 'Downspout',
              quantity: parseFloat(match[1]),
              unit: 'LF'
            });
          }
        }
      }
    }
    
    // Use shingle SQ as primary squares value
    if (shingleSquares !== totalSquares) {
      console.log('[LOSS-PARSER] Using shingle SQ from loss sheet:', shingleSquares);
      result.raw.roof_sq = shingleSquares;
      result.measurements.roofSquares = shingleSquares;
    }
    
    // ==========================================
    // BUILD MATERIALS LIST
    // ==========================================
    
    // Calculate shingles (bundles) - shingleSquares already includes waste
    const bundlesPerSq = 3;
    const shingleBundles = Math.ceil(shingleSquares * bundlesPerSq);
    result.materials.push({
      name: MATERIALS.shingles.name,
      quantity: shingleBundles,
      unit: MATERIALS.shingles.unit,
      unitPrice: MATERIALS.shingles.price,
      total: shingleBundles * MATERIALS.shingles.price
    });
    
    // Underlayment
    if (lineItems.underlayment) {
      const rolls = Math.ceil(lineItems.underlayment.quantity / 4);
      result.materials.push({
        name: MATERIALS.roofrunner.name,
        quantity: rolls,
        unit: MATERIALS.roofrunner.unit,
        unitPrice: MATERIALS.roofrunner.price,
        total: rolls * MATERIALS.roofrunner.price
      });
    } else {
      // Calculate based on squares
      const rolls = Math.ceil(shingleSquares / 4);
      result.materials.push({
        name: MATERIALS.roofrunner.name,
        quantity: rolls,
        unit: MATERIALS.roofrunner.unit,
        unitPrice: MATERIALS.roofrunner.price,
        total: rolls * MATERIALS.roofrunner.price
      });
    }
    
    // Starter strip (calculated)
    const starterPerimeter = lineItems.dripEdge?.quantity || actualPerimeter;
    const starterBundles = Math.ceil(starterPerimeter / 120);
    result.materials.push({
      name: MATERIALS.starter_course.name,
      quantity: starterBundles,
      unit: MATERIALS.starter_course.unit,
      unitPrice: MATERIALS.starter_course.price,
      total: starterBundles * MATERIALS.starter_course.price
    });
    
    // Hip & Ridge
    if (lineItems.hipRidge) {
      const bundles = Math.ceil(lineItems.hipRidge.quantity / 20);
      result.materials.push({
        name: MATERIALS.hip_ridge_cap.name,
        quantity: bundles,
        unit: MATERIALS.hip_ridge_cap.unit,
        unitPrice: MATERIALS.hip_ridge_cap.price,
        total: bundles * MATERIALS.hip_ridge_cap.price
      });
    } else if (ridgeLength > 0) {
      const bundles = Math.ceil(ridgeLength / 20);
      result.materials.push({
        name: MATERIALS.hip_ridge_cap.name,
        quantity: bundles,
        unit: MATERIALS.hip_ridge_cap.unit,
        unitPrice: MATERIALS.hip_ridge_cap.price,
        total: bundles * MATERIALS.hip_ridge_cap.price
      });
    }
    
    // Ice & water shield (calculated)
    const iceWaterPerimeter = starterPerimeter / 2; // Eave estimate
    const iceWaterRolls = Math.ceil((iceWaterPerimeter / 2) / 75);
    result.materials.push({
      name: MATERIALS.ice_water_shield.name,
      quantity: iceWaterRolls,
      unit: MATERIALS.ice_water_shield.unit,
      unitPrice: MATERIALS.ice_water_shield.price,
      total: iceWaterRolls * MATERIALS.ice_water_shield.price
    });
    
    // Ridge vent
    if (lineItems.ridgeVent) {
      const pieces = Math.ceil(lineItems.ridgeVent.quantity / 4);
      result.materials.push({
        name: MATERIALS.ridge_vent.name,
        quantity: pieces,
        unit: MATERIALS.ridge_vent.unit,
        unitPrice: MATERIALS.ridge_vent.price,
        total: pieces * MATERIALS.ridge_vent.price
      });
    }
    
    // Drip edge
    if (lineItems.dripEdge) {
      const pieces = Math.ceil(lineItems.dripEdge.quantity / 10);
      result.materials.push({
        name: MATERIALS.drip_edge.name,
        quantity: pieces,
        unit: MATERIALS.drip_edge.unit,
        unitPrice: MATERIALS.drip_edge.price,
        total: pieces * MATERIALS.drip_edge.price
      });
    } else if (actualPerimeter > 0) {
      const pieces = Math.ceil(actualPerimeter / 10);
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
    
    // Step flashing
    if (lineItems.stepFlashing) {
      const bundles = Math.ceil(lineItems.stepFlashing.quantity / 10);
      result.materials.push({
        name: MATERIALS.step_flashing.name,
        quantity: bundles,
        unit: MATERIALS.step_flashing.unit,
        unitPrice: MATERIALS.step_flashing.price,
        total: bundles * MATERIALS.step_flashing.price
      });
      result.raw.step_flashing = lineItems.stepFlashing.quantity;
    }
    
    // L flashing
    if (lineItems.lFlashing) {
      const rolls = Math.ceil(lineItems.lFlashing.quantity / 50);
      result.materials.push({
        name: MATERIALS.l_flashing.name,
        quantity: rolls,
        unit: MATERIALS.l_flashing.unit,
        unitPrice: MATERIALS.l_flashing.price,
        total: rolls * MATERIALS.l_flashing.price
      });
      result.raw.flashing_length = lineItems.lFlashing.quantity;
    }
    
    // Button caps (calculated)
    const buttonCaps = Math.ceil(actualPerimeter / 16);
    result.materials.push({
      name: MATERIALS.button_caps.name,
      quantity: buttonCaps,
      unit: MATERIALS.button_caps.unit,
      unitPrice: MATERIALS.button_caps.price,
      total: buttonCaps * MATERIALS.button_caps.price
    });
    
    // Sealant (calculated)
    const sealantTubes = Math.ceil(shingleSquares / 5);
    result.materials.push({
      name: MATERIALS.joint_sealant.name,
      quantity: sealantTubes,
      unit: MATERIALS.joint_sealant.unit,
      unitPrice: MATERIALS.joint_sealant.price,
      total: sealantTubes * MATERIALS.joint_sealant.price
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
