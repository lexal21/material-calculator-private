const fs = require('fs');
const pdf = require('pdf-parse-fork');

/**
 * Parse insurance loss sheet for exterior materials
 * Extracts: Fascia, Siding, Window wrap, Soffit
 * Only includes items with "R&R" or "Replace" in description
 * @param {string} pdfPath - Path to PDF file
 * @returns {Promise<object>} { success: boolean, lossItems: array }
 */
async function parseLossSheet(pdfPath) {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdf(dataBuffer);
    const text = data.text;
    
    console.log('[LOSS-PARSER] Scanning for loss sheet items...');
    
    const lossItems = [];
    const lines = text.split('\n');
    
    // Track items we've seen to avoid duplicates (prefer Replace over Remove)
    const seenItems = new Map(); // key: normalized name, value: item object
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Skip if line doesn't contain R&R or Replace
      if (!line.match(/R&R|Replace/i)) continue;
      
      // Check for target materials (case insensitive)
      let materialType = null;
      let originalDescription = line;
      
      if (/fascia/i.test(line)) {
        materialType = 'fascia';
      } else if (/window\s+wrap/i.test(line)) {
        materialType = 'window wrap';
      } else if (/siding/i.test(line)) {
        materialType = 'siding';
      } else if (/soffit/i.test(line)) {
        materialType = 'soffit';
      }
      
      if (!materialType) continue;
      
      // Extract description (everything before the quantity)
      // Typical format: "8. R&R Fascia - metal - 10" 8.00 LF 8.25 2.06 0.00 68.06"
      const descMatch = line.match(/^[\d.]*\s*(.*?)\s+(\d+(?:\.\d+)?)\s+(LF|SF|EA)/i);
      
      if (!descMatch) {
        // Try alternate format without line number
        const altMatch = line.match(/(.*?)\s+(\d+(?:\.\d+)?)\s+(LF|SF|EA)/i);
        if (!altMatch) continue;
        
        const [, desc, qty, unit] = altMatch;
        const cleanDesc = desc.replace(/^[\d.]+\s*/, '').trim(); // Remove line number
        const quantity = parseFloat(qty);
        
        // Normalize key for deduplication (lowercase, no special chars)
        const normalizedKey = cleanDesc.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        // Skip "Remove" only lines or prefer Replace over Remove
        if (/^remove\b/i.test(cleanDesc) && !/replace/i.test(cleanDesc)) {
          // Mark as seen but don't add (in case Replace line comes later)
          if (!seenItems.has(normalizedKey)) {
            seenItems.set(normalizedKey, null);
          }
          continue;
        }
        
        const item = {
          name: cleanDesc,
          quantity: quantity,
          unit: unit.toUpperCase(),
          source: 'loss',
          materialType: materialType,
          color: '' // Will be filled in by user
        };
        
        // Add or replace item
        if (!seenItems.has(normalizedKey) || seenItems.get(normalizedKey) === null) {
          seenItems.set(normalizedKey, item);
        }
        
        continue;
      }
      
      const [, desc, qty, unit] = descMatch;
      const cleanDesc = desc.replace(/^[\d.]+\s*/, '').trim(); // Remove line number if present
      const quantity = parseFloat(qty);
      
      // Normalize key for deduplication
      const normalizedKey = cleanDesc.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // Skip "Remove" only lines
      if (/^remove\b/i.test(cleanDesc) && !/replace/i.test(cleanDesc)) {
        if (!seenItems.has(normalizedKey)) {
          seenItems.set(normalizedKey, null);
        }
        continue;
      }
      
      const item = {
        name: cleanDesc,
        quantity: quantity,
        unit: unit.toUpperCase(),
        source: 'loss',
        materialType: materialType,
        color: ''
      };
      
      // Add or replace item (prefer Replace over Remove)
      if (!seenItems.has(normalizedKey) || seenItems.get(normalizedKey) === null) {
        seenItems.set(normalizedKey, item);
      }
    }
    
    // Convert map to array, filtering out null entries
    for (const item of seenItems.values()) {
      if (item !== null) {
        lossItems.push(item);
      }
    }
    
    console.log(`[LOSS-PARSER] Found ${lossItems.length} loss sheet items`);
    
    return {
      success: true,
      lossItems: lossItems
    };
    
  } catch (error) {
    console.error('[LOSS-PARSER] Error parsing loss sheet:', error);
    return {
      success: false,
      lossItems: [],
      error: error.message
    };
  }
}

/**
 * Detect if PDF is likely a loss sheet (vs roof report)
 * @param {string} pdfPath
 * @returns {Promise<boolean>}
 */
async function isLossSheet(pdfPath) {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdf(dataBuffer);
    const text = data.text.toLowerCase();
    
    // Loss sheet indicators
    const hasLossIndicators = 
      text.includes('insurance') ||
      text.includes('claim') ||
      text.includes('depreciation') ||
      text.includes('rcv') ||
      text.includes('acv') ||
      (text.includes('r&r') && text.includes('replace'));
    
    // Roof report indicators (should NOT be present)
    const hasRoofIndicators =
      text.includes('ridge top') ||
      text.includes('eagleview') ||
      text.includes('roof squares') ||
      text.includes('waste factor');
    
    return hasLossIndicators && !hasRoofIndicators;
  } catch (error) {
    console.error('[LOSS-PARSER] Error detecting file type:', error);
    return false;
  }
}

module.exports = {
  parseLossSheet,
  isLossSheet,
  processDocuments: async function(pdfPaths) {
    const results = { success: true, lossItems: [] };
    
    for (const p of pdfPaths) {
      const isLoss = await isLossSheet(p);
      if (isLoss) {
        const parsed = await parseLossSheet(p);
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
