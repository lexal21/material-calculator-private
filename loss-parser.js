const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const tesseract = require('node-tesseract-ocr');
const { 
  MATERIALS,
  calculateRoofRunner,
  calculateStarterCourse,
  calculateHipRidgeCap,
  calculateButtonCaps,
  calculatePlywood
} = require('./calculator');

// Add Tesseract to PATH (Windows only - Railway Linux has it in system PATH)
if (process.platform === 'win32') {
  process.env.PATH = `C:\\Program Files\\Tesseract-OCR;${process.env.PATH}`;
}

const tesseractConfig = {
  lang: 'eng',
  oem: 1,
  psm: 6 // Assume uniform block of text
};

/**
 * OCR a single page by rendering to PNG and running Tesseract
 */
async function ocrPage(pdfPath, pageNum) {
  const outputDir = path.join(path.dirname(pdfPath), '.ocr-temp');
  
  try {
    // Create temp directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    console.log(`[LOSS-PARSER] OCR fallback: rendering page ${pageNum}...`);
    
    const outputPrefix = path.join(outputDir, `page${pageNum}`);
    
    // Use pdftoppm directly (installed via nixpacks on Railway, bundled on Windows)
    const pdftopmCmd = process.platform === 'win32'
      ? `pdftoppm -png -f ${pageNum} -l ${pageNum} -scale-to 2048 "${pdfPath}" "${outputPrefix}"`
      : `pdftoppm -png -f ${pageNum} -l ${pageNum} -scale-to 2048 "${pdfPath}" "${outputPrefix}"`;
    
    execSync(pdftopmCmd, { stdio: 'ignore' });
    
    // Find generated image (pdftoppm adds page number suffix)
    const files = fs.readdirSync(outputDir).filter(f => f.startsWith(`page${pageNum}`) && f.endsWith('.png'));
    
    if (files.length === 0) {
      console.log(`[LOSS-PARSER] OCR: No image generated for page ${pageNum}`);
      return '';
    }
    
    const imagePath = path.join(outputDir, files[0]);
    
    console.log(`[LOSS-PARSER] Running Tesseract on page ${pageNum}...`);
    const text = await tesseract.recognize(imagePath, tesseractConfig);
    
    console.log(`[LOSS-PARSER] OCR extracted ${text.length} chars from page ${pageNum}`);
    
    return text;
    
  } catch (err) {
    console.log(`[LOSS-PARSER] OCR error on page ${pageNum}:`, err.message);
    return '';
  } finally {
    // Clean up temp files
    try {
      if (fs.existsSync(outputDir)) {
        fs.rmSync(outputDir, { recursive: true, force: true });
      }
    } catch (cleanupErr) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Hybrid PDF text extractor: tries normal extraction first, falls back to OCR for empty pages
 */
async function extractPdfText(dataBuffer, pdfPath = null) {
  // Dynamic import for ESM module (legacy build for Node.js)
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(dataBuffer),
    useSystemFonts: true,
    disableFontFace: true,
    standardFontDataUrl: null
  });
  
  const pdfDocument = await loadingTask.promise;
  const numPages = pdfDocument.numPages;
  let fullText = '';
  let ocrPagesCount = 0;
  
  console.log(`[LOSS-PARSER] Extracting text from ${numPages} pages...`);
  
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    
    // If page has no extractable text but we have a PDF path, try OCR
    if (pageText.trim().length === 0 && pdfPath) {
      console.log(`[LOSS-PARSER] Page ${pageNum} empty, attempting OCR...`);
      const ocrText = await ocrPage(pdfPath, pageNum);
      fullText += ocrText + '\n';
      if (ocrText.length > 0) {
        ocrPagesCount++;
      }
    } else {
      fullText += pageText + '\n';
    }
  }
  
  if (ocrPagesCount > 0) {
    console.log(`[LOSS-PARSER] OCR processed ${ocrPagesCount} page(s)`);
  }
  
  return {
    text: fullText,
    numpages: numPages,
    ocrPages: ocrPagesCount
  };
}

// ==========================================
// PARSER CONSTANTS & HELPERS
// ==========================================

// FIX 3: Allstate boilerplate markers
const ALLSTATE_BOILERPLATE_START = 'Your guide to reading your adjuster summary';
const ALLSTATE_BOILERPLATE_END = 'This is a sample guide to your adjuster summary';

// FIX 5: Category subheader patterns to skip
const SKIP_PATTERNS = [
  /^DWELLING$/,
  /^ORDINANCE AND LAW$/,
  /^FULL ROOF REPLACEMENT$/,
  /^Roof Components$/,
  /^Shingles & Felt:$/,
  /^Starter and Drip:$/,
  /^Ridge & Hip:$/,
  /^Flashing & Metal:$/,
  /^Roof Elements:$/,
  /^Content Manipulation$/,
  /^Masking$/,
  /^Ceiling Repair$/,
  /^Wall Repair$/,
  /^General Items$/,
  /^Labor Minimums Applied$/,
  // Catch-all: ALL CAPS line with no digits
  /^[A-Z][A-Z\s\-&:]+$/
];

// FIX 7: Parse stop markers (document-end only, not intermediate section totals)
const PARSE_STOP_MARKERS = [
  'Factor Detail',
  'Roof Surface Payment Schedule',
  'Unfactored Items',
  'Your guide to contents depreciation recovery'
];

// FIX 12: Inline note patterns to skip
const NOTE_PATTERNS = [
  /^Per newly enforced/i,
  /^Auto Calculated Waste/i,
  /^Options:/i,
  /^Orig\. Desc/i,
  /^https?:\/\//i,
  /^\[%\]/,
  /^\[M\]/
];

// FIX 9: Strip Allstate data markers from numeric columns
function stripAllstateMarkers(value) {
  if (!value) return value;
  return value.replace(/\[M\]/g, '').replace(/\[%\]/g, '').trim();
}

// FIX 10: Parse depreciation values in parentheses
function parseDepreciation(val) {
  if (!val) return 0;
  const clean = val.toString().replace(/[(),\s]/g, '');
  return parseFloat(clean) || 0;
}

// FIX 11: Strip commas from numeric values
function parseAmount(val) {
  if (!val) return 0;
  return parseFloat(val.toString().replace(/[,$\s]/g, '')) || 0;
}

// FIX 5: Check if line should be skipped (category subheader)
function shouldSkipLine(line) {
  return SKIP_PATTERNS.some(pattern => pattern.test(line.trim()));
}

// FIX 7: Check if parsing should stop at this line
function shouldStopParsing(line) {
  return PARSE_STOP_MARKERS.some(marker => line.includes(marker));
}

// FIX 12: Check if line is an inline note
function isNoteLine(line) {
  return NOTE_PATTERNS.some(pattern => pattern.test(line.trim()));
}

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
    const data = await extractPdfText(dataBuffer, pdfPath); // Pass path for OCR fallback
    let text = data.text;
    
    // Strip boilerplate explanation pages before parsing
    // Match from the boilerplate heading until we find a page break (form feed \f) or estimate section
    const boilerplatePatterns = [
      /Understanding Your Property Estimate[\s\S]*?(?=\f|ESTIMATE|Estimate:|Item\s+\d+\.|\n\n\n)/gi,
      /Guide to Understanding Your Property Estimate[\s\S]*?(?=\f|ESTIMATE|Estimate:|Item\s+\d+\.|\n\n\n)/gi
    ];
    
    for (const pattern of boilerplatePatterns) {
      const beforeLength = text.length;
      text = text.replace(pattern, '\n\n');
      if (text.length < beforeLength) {
        console.log('[LOSS-PARSER] Stripped', beforeLength - text.length, 'chars of boilerplate');
      }
    }
    
    let lines = text.split('\n');
    
    console.log('[LOSS-PARSER] Parsing complete loss sheet...');
    
    // TEMP DEBUG: Dump first 100 lines with their index
    lines.slice(0, 100).forEach((line, i) => {
      if (line.trim().length > 0) {
        console.log(`[DEBUG LINE ${i}]: "${line}"`);
      }
    });
    
    // FIX 2: Detect Allstate extended column format
    const isAllstateFormat = text.includes('AGE/LIFE') && text.includes('DEP %');
    if (isAllstateFormat) {
      console.log('[LOSS-PARSER] Allstate extended column format detected');
    }
    
    // FIX 3: Skip Allstate consumer guide boilerplate pages
    let startParsingAt = 0;
    if (text.includes(ALLSTATE_BOILERPLATE_START)) {
      console.log('[LOSS-PARSER] Allstate boilerplate detected, skipping...');
      const lastBoilerplateEnd = text.lastIndexOf(ALLSTATE_BOILERPLATE_END);
      if (lastBoilerplateEnd > 0) {
        // Find line index where boilerplate ends
        let charCount = 0;
        for (let i = 0; i < lines.length; i++) {
          charCount += lines[i].length + 1; // +1 for newline
          if (charCount >= lastBoilerplateEnd) {
            startParsingAt = i + 1;
            console.log('[LOSS-PARSER] Skipping first', startParsingAt, 'lines (Allstate boilerplate)');
            break;
          }
        }
      }
    }
    
    // FIX 4: Skip Griston cover letter pages
    let gristonEstimateStart = -1;
    for (let i = startParsingAt; i < Math.min(startParsingAt + 200, lines.length); i++) {
      const line = lines[i].trim();
      const nextLine = lines[i + 1]?.trim() || '';
      // Find page with both "Claim Number:" and "Price List:" - marks start of Xactimate estimate
      if (line.includes('Claim Number:') && 
          (nextLine.includes('Price List:') || lines[i + 2]?.trim().includes('Price List:'))) {
        gristonEstimateStart = i;
        console.log('[LOSS-PARSER] Griston estimate start detected at line', i);
        break;
      }
    }
    if (gristonEstimateStart > startParsingAt) {
      startParsingAt = gristonEstimateStart;
    }
    
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
      grandTotal: 0,
      _isAllstateFormat: isAllstateFormat,
      _startParsingAt: startParsingAt
    };
    
    // ==========================================
    // DETECT CARRIER
    // ==========================================
    const carrierPatterns = [
      { pattern: /ALLSTATE/i, name: 'Allstate' },
      { pattern: /STATE\s+FARM/i, name: 'State Farm' },
      { pattern: /USAA/i, name: 'USAA' },
      { pattern: /FARMERS/i, name: 'Farmers' },
      { pattern: /LIBERTY\s+MUTUAL/i, name: 'Liberty Mutual' },
      { pattern: /PROGRESSIVE/i, name: 'Progressive' },
      { pattern: /GEICO/i, name: 'GEICO' },
      { pattern: /NATIONWIDE/i, name: 'Nationwide' },
      { pattern: /TRAVELERS/i, name: 'Travelers' },
      { pattern: /AMERICAN\s+FAMILY/i, name: 'American Family' },
      { pattern: /TYPTAP|TYP\s*TAP/i, name: 'TYPTAP' },
      { pattern: /GRISTON\s+CLAIM\s+MANAGEMENT/i, name: 'TYPTAP' }, // Griston manages TYPTAP claims
      { pattern: /SAFECO/i, name: 'Safeco' },
      { pattern: /MERCURY/i, name: 'Mercury' },
      { pattern: /METLIFE/i, name: 'MetLife' },
      { pattern: /HARTFORD/i, name: 'The Hartford' },
      { pattern: /CHUBB/i, name: 'Chubb' }
    ];
    
    for (const { pattern, name } of carrierPatterns) {
      if (pattern.test(text)) {
        result.raw.carrier = name;
        console.log(`[LOSS-PARSER] Carrier detected: ${name}`);
        break;
      }
    }
    
    // ==========================================
    // EXTRACT CUSTOMER INFO
    // ==========================================
    for (let i = startParsingAt; i < lines.length; i++) {
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
    
    for (let i = startParsingAt; i < lines.length; i++) {
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
    // PARSE ORIGINAL LINE ITEMS FROM PDF TABLE
    // ==========================================
    const parsedLineItems = [];
    const parsedItemNumbers = new Set();
    let parsingLineItems = false;
    
    // Liberty Mutual format: extract directly from raw text blob (not line-by-line)
    const isLibertyMutual = result.raw.carrier === 'Liberty Mutual';
    
    if (isLibertyMutual) {
      console.log('[LOSS-PARSER] Liberty Mutual format detected - using direct blob extraction');
      const itemRegex = /(\d+)\s{2,}((?:(?!\d+\s{2,}[A-Z])[\w,\.\s\/\-'"()])+?)\s{2,}(\d+\.?\d*)\s+\$[\d,.]+\s+(SQ|LF|EA|SF|DY|LS)\s+\$[\d,.]+\s+\$[\d,.]+\s+\$([\d,.]+)/g;
      let match;
      let matchCount = 0;
      
      console.log('[LM REGEX] First 10 raw matches:');
      while ((match = itemRegex.exec(text)) !== null) {
        if (matchCount < 10) {
          console.log(`  Match ${matchCount + 1}:`);
          console.log(`    [1] Item num: "${match[1]}"`);
          console.log(`    [2] Description: "${match[2]}"`);
          console.log(`    [3] Quantity: "${match[3]}"`);
          console.log(`    [4] Unit: "${match[4]}"`);
          console.log(`    [5] RCV: "${match[5]}"`);
        }
        
        parsedLineItems.push({
          item_number: parseInt(match[1]),
          description: match[2].trim(),
          quantity: parseFloat(match[3]),
          unit: match[4],
          rcv: parseFloat((match[5] || '0').replace(/[,$]/g, '')) || 0
        });
        parsedItemNumbers.add(parseInt(match[1]));
        matchCount++;
      }
      
      console.log(`[LOSS-PARSER] Liberty Mutual: ${parsedLineItems.length} items extracted`);
      // Skip ALL line-based parsing - jump straight to supplement extraction
      // Do NOT set lines = [] here, just fall through to the supplement matching code
    }
    
    // Only run line-based parsing for non-Liberty Mutual formats
    if (!isLibertyMutual) {
      // DEBUG: Log line count and structure
      console.log('[LOSS-PARSER] DEBUG: Total lines in text:', lines.length);
      console.log('[LOSS-PARSER] DEBUG: Lines[0] length:', lines[0] ? lines[0].length : 0);
      console.log('[LOSS-PARSER] DEBUG: Lines[1] length:', lines[1] ? lines[1].length : 0);
      console.log('[LOSS-PARSER] DEBUG: Lines[2] preview:', lines[2] ? lines[2].substring(0, 100) : 'N/A');
      
      // FIX: Split concatenated lines (common in Linux PDF extraction) - RECURSIVE
      function splitLongLine(line, depth) {
      depth = depth || 0;
      if (line.length <= 500 || depth > 5) return [line];
      
      const splits = [];
      const numberedItemRegex = /(?<![\d$.])(\d+(?:\.\s+|\s{2,}))(?=[A-Z])/g;
      let match;
      
      while ((match = numberedItemRegex.exec(line)) !== null) {
        splits.push(match.index);
      }
      
      // Also split on ALL CAPS section headers
      const headerRegex = /([A-Z][A-Z\s\-:]{3,}:?\s)/g;
      while ((match = headerRegex.exec(line)) !== null) {
        if (!splits.includes(match.index)) splits.push(match.index);
      }
      
      if (splits.length === 0) return [line];
      
      splits.sort((a, b) => a - b);
      
      const segments = [];
      let lastIndex = 0;
      for (const idx of splits) {
        if (idx > lastIndex) segments.push(line.substring(lastIndex, idx).trim());
        lastIndex = idx;
      }
      segments.push(line.substring(lastIndex).trim());
      
      // Recursively split any segments still over 500 chars
      const result = [];
      for (const seg of segments) {
        if (seg.length > 500) {
          result.push(...splitLongLine(seg, depth + 1));
        } else if (seg.length > 0) {
          result.push(seg);
        }
      }
      
      return result;
    }
    
    // Apply to all lines
    const splitLines = [];
    for (const line of lines) {
      splitLines.push(...splitLongLine(line));
    }
    
    console.log(`[LOSS-PARSER] After recursive splitting: ${lines.length} → ${splitLines.length} lines`);
    
    // Stop-marker splitting
    const finalLines = [];
    for (const line of splitLines) {
      let remaining = line;
      let foundMarker = false;
      
      for (const marker of PARSE_STOP_MARKERS) {
        const idx = remaining.indexOf(marker);
        if (idx > -1 && idx > 10) {
          finalLines.push(remaining.substring(0, idx).trim());
          finalLines.push(remaining.substring(idx).trim());
          foundMarker = true;
          break;
        }
      }
      
      if (!foundMarker) finalLines.push(remaining);
    }
    
    console.log(`[LOSS-PARSER] After stop-marker splitting: ${splitLines.length} → ${finalLines.length} lines`);
    lines = finalLines;
    
    // DEBUG: Test itemRegex against raw text
    console.log('[REGEX TEST] Testing itemRegex against raw text...');
    const itemRegex = /(\d+)\s{2,}([\w,\.\s\/\-'"()]+?)\s{2,}(\d+\.?\d*)\s+\$[\d,.]+\s+(SQ|LF|EA|SF|DY|LS)\s+\$[\d,.]+\s+\$[\d,.]+\s+\$([\d,.]+)/g;
    const allMatches = [...text.matchAll(itemRegex)];
    console.log(`[REGEX TEST] Found ${allMatches.length} matches in raw text`);
    console.log('[REGEX TEST] First 3 matches:');
    allMatches.slice(0, 3).forEach((match, idx) => {
      console.log(`  Match ${idx + 1}:`);
      console.log(`    [0] Full match: "${match[0].substring(0, 100)}"`);
      console.log(`    [1] Item num: "${match[1]}"`);
      console.log(`    [2] Description: "${match[2]}"`);
      console.log(`    [3] Quantity: "${match[3]}"`);
      console.log(`    [4] Unit: "${match[4]}"`);
      console.log(`    [5] RCV: "${match[5]}"`);
    });
    
    // DEBUG: Pre-scan for all numbered items before parsing
    const foundItemNumbers = new Set();
    const parsedItemNumbers = new Set();
    for (let i = startParsingAt; i < lines.length; i++) {
      const line = lines[i].trim();
      const itemMatch = line.match(/^(\d+[a-z]?)(?:\.\s|\s{2,})/i);
      if (itemMatch) {
        foundItemNumbers.add(parseInt(itemMatch[1]));
      }
    }
    console.log('[LOSS-PARSER] Pre-scan: Found', foundItemNumbers.size, 'numbered items (1-' + Math.max(...foundItemNumbers) + ')');
    
    for (let i = startParsingAt; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Debug: log lines that contain DESCRIPTION
      if (/DESCRIPTION/i.test(line) && line.length < 300) {
        console.log('[LOSS-PARSER] Line', i, 'with DESCRIPTION (len=' + line.length + '):', line.substring(0, 150));
        console.log('[LOSS-PARSER] Header test results:', {
          hasQuantity: /QUANTITY|QTY/i.test(line),
          hasUnit: /UNIT/i.test(line),
          hasPrice: /PRICE/i.test(line),
          hasRCV: /RCV|ACV/i.test(line)
        });
      }
      
      // Start parsing when we see the table header
      // Pattern 1: Standard format with DESCRIPTION (Heritage, Allstate, etc.)
      if (/DESCRIPTION.*(?:QUANTITY|QTY).*(?:UNIT.*PRICE|UNIT\s+PRICE).*(?:RCV|ACV)/i.test(line) && line.length < 300) {
        parsingLineItems = true;
        console.log('[LOSS-PARSER] ✓ Found line item table header at line', i, '(standard format)');
        continue;
      }
      
      // Pattern 2: Travelers format without DESCRIPTION or PRICE
      // Must have QUANTITY, UNIT, TAX, RCV and age/condition columns (order flexible)
      // Two common formats:
      //   A) QUANTITY UNIT TAX RCV AGE/LIFE COND DEP% DEPREC ACV
      //   B) QUANTITY UNIT RCV DEPREC ACV TAX AGE/LIFE
      const hasTravelersColumns = /\bQUANTITY\b/i.test(line) &&
                                  /\bUNIT\b/i.test(line) &&
                                  /\bTAX\b/i.test(line) &&
                                  /\bRCV\b/i.test(line) &&
                                  /\b(?:AGE|LIFE|COND|DEP)\b/i.test(line);
      
      if (hasTravelersColumns && 
          !/^\d+\.\s/.test(line) && // Not a numbered line item
          line.length < 300) {
        parsingLineItems = true;
        console.log('[LOSS-PARSER] ✓ Found line item table header at line', i, '(Travelers format)');
        console.log('[LOSS-PARSER] Header text:', line.substring(0, 150));
        continue;
      }
      
      // Pattern 3: Xactimate format header (no DESCRIPTION column)
      // "QUANTITY UNIT TAX RCV AGE/LIFE COND. DEP % DEPREC. ACV"
      if (/^QUANTITY\s+UNIT\s+TAX\s+RCV/i.test(line) && line.length < 300) {
        parsingLineItems = true;
        console.log('[LOSS-PARSER] ✓ Found Xactimate column header at line', i, '(Xactimate format)');
        continue;
      }
      
      // Stop at document-end markers (appendices, payment schedules, etc.)
      if (parsingLineItems && shouldStopParsing(line)) {
        console.log('[LOSS-PARSER] Stopping at document-end marker:', line.substring(0, 50));
        break;
      }
      
      // Fallback: Start parsing if we encounter a numbered item even without a header
      // Single-line format: "1. Description 10.5 LF 52.47 0.00 ..."
      // Two-line format (Xactimate): "1. Description" then next line "10.5 LF 52.47 0.00 ..."
      if (!parsingLineItems) {
        const isSingleLineItem = /^\d+[a-z]?(?:\.\s+|\s{2,}).+?\s+(?:Dwelling|Other Struc[^\s]*\s+)?\d+\.?\d*\s*(SQ|LF|EA|SF)\s+/i.test(line);
        const isNumberedDesc = /^(\d+[a-z]?)[.,]\s+.{5,}/i.test(line);
        const nextLineHasValues = /^\d+\.?\d*\s+(SQ|LF|EA|SF)\s+/i.test(lines[i + 1]?.trim() || '');
        
        if (isSingleLineItem || (isNumberedDesc && nextLineHasValues)) {
          console.log('[LOSS-PARSER] ✓ Found numbered line item without header at line', i, '- starting parse');
          console.log('[LOSS-PARSER] Format:', isSingleLineItem ? 'single-line' : 'two-line (Xactimate)');
          console.log('[LOSS-PARSER] Line:', line.substring(0, 100));
          parsingLineItems = true;
          // Fall through to parse this line
        }
      }
      
      // TEMP DEBUG: Check if items 15-16 are being skipped before parsing
      const debugItemCheck = line.match(/^(15|16)\s{2,}/);
      if (debugItemCheck) {
        console.log(`[TEMP DEBUG] Item ${debugItemCheck[1]} encountered at line ${i}, parsingLineItems=${parsingLineItems}`);
        if (!parsingLineItems) {
          console.log(`  ⚠️ SKIPPED - parsing not started yet`);
        }
      }
      
      // Skip lines when not in parsing mode
      if (!parsingLineItems) continue;
      
      // Parse numbered line items: "1. Description text QTY UNIT PRICE TAX RCV DEPREC ACV"
      // Two-stage approach: match the basic structure, then manually parse the numeric fields
      const basicMatch = line.match(/^(\d+[a-z]?)(?:[.,]\s+|\s{2,})(.+?)\s+(?:Dwelling|Other Struc[^\s]*\s+)?(\d+\.?\d*)\s*(?:\$[\d,.]+\s+)?(SQ|LF|EA|SF)\s+\$[\d,.]+\s+\$[\d,.]+\s+\$([\d,.]+)/i);
      
      // TEMP DEBUG: Log exact line text for items 15 and 16 (pipe jacks)
      const itemNumCheck = line.match(/^(\d+[a-z]?)(?:\.\s|\s{2,})/i);
      if (itemNumCheck && (itemNumCheck[1] === '15' || itemNumCheck[1] === '16')) {
        console.log(`[TEMP DEBUG] Item ${itemNumCheck[1]} at line ${i}:`);
        console.log(`  Line text: "${line}"`);
        console.log(`  basicMatch result: ${basicMatch ? 'MATCHED' : 'NULL'}`);
        if (basicMatch) {
          console.log(`  Captures: [1]="${basicMatch[1]}" [2]="${basicMatch[2]}" [3]="${basicMatch[3]}" [4]="${basicMatch[4]}" [5]="${basicMatch[5].substring(0, 50)}"`);
        }
      }
      
      // DEBUG: Log lines that look like items but don't match
      if (/^\d+\.\s+/.test(line) && !basicMatch && i >= 120 && i <= 140) {
        console.log(`[LOSS-PARSER] Line ${i} looks like item but doesn't match regex:`);
        console.log(`  Line: "${line.substring(0, 150)}"`);
        console.log(`  Starts with number: ${/^\d+\.\s+/.test(line)}`);
        console.log(`  Has unit (EA|LF|SQ|SF): ${/(EA|LF|SQ|SF)/i.test(line)}`);
      }
      
      if (basicMatch) {
        const [, itemNum, description, qty, unit, rcvCapture] = basicMatch;
        
        // Parse RCV from captured group
        const rcv = parseFloat((rcvCapture || '0').replace(/[,$]/g, '')) || 0;
        
        parsedLineItems.push({
          item_number: parseInt(itemNum),
          description: description.trim(),
          quantity: parseFloat(qty),
          unit: unit.toUpperCase(),
          rcv: rcv
        });
        
        parsedItemNumbers.add(parseInt(itemNum)); // Track successfully parsed item
        console.log(`[LOSS-PARSER] Parsed line item ${itemNum}: ${description.substring(0, 40)}... RCV: $${rcv}`);
      }
      // Handle multi-line descriptions where values might be on next line
      else if (/^(\d+[a-z]?)[.,]\s+(.+)/i.test(line)) {
        const numMatch = line.match(/^(\d+[a-z]?)[.,]\s+(.+)/i);
        if (numMatch) {
          const itemNum = numMatch[1];
          let description = numMatch[2];
          
          // Check next line for the numeric values
          const nextLine = lines[i + 1]?.trim();
          if (nextLine) {
            const valueMatch = nextLine.match(/^(\d+\.?\d*)\s+(SQ|LF|EA|SF)\s+\$[\d,.]+\s+\$[\d,.]+\s+\$([\d,.]+)/i);
            
            if (valueMatch) {
              const [, qty, unit, rcvCapture] = valueMatch;
              const rcv = parseFloat((rcvCapture || '0').replace(/[,$]/g, '')) || 0;
              
              parsedLineItems.push({
                item_number: parseInt(itemNum),
                description: description.trim(),
                quantity: parseFloat(qty),
                unit: unit.toUpperCase(),
                rcv: rcv
              });
              
              parsedItemNumbers.add(parseInt(itemNum)); // Track successfully parsed item
              console.log(`[LOSS-PARSER] Parsed multi-line item ${itemNum}: ${description.substring(0, 40)}... RCV: $${rcv}`);
              i++; // Skip next line since we consumed it
            }
          }
        }
      }
    }
    
    console.log(`[LOSS-PARSER] Parsed ${parsedLineItems.length} original line items from PDF`);
    
    // DEBUG: Show which numbered items were found but not parsed
    const skippedItems = Array.from(foundItemNumbers).filter(num => !parsedItemNumbers.has(num)).sort((a, b) => a - b);
    if (skippedItems.length > 0) {
      console.log(`[LOSS-PARSER] ⚠️  WARNING: ${skippedItems.length} numbered items were SKIPPED:`);
      console.log(`[LOSS-PARSER] Skipped item numbers: ${skippedItems.join(', ')}`);
      
      // Show first few skipped items with context
      const maxShow = 5;
      console.log(`[LOSS-PARSER] First ${Math.min(maxShow, skippedItems.length)} skipped items:`);
      for (let skip = 0; skip < Math.min(maxShow, skippedItems.length); skip++) {
        const itemNum = skippedItems[skip];
        for (let i = startParsingAt; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith(`${itemNum}. `)) {
            console.log(`  [${itemNum}] ${line.substring(0, 120)}`);
            break;
          }
        }
      }
    } else {
      console.log(`[LOSS-PARSER] ✓ All ${foundItemNumbers.size} numbered items successfully parsed`);
    }
    } // End if (!isLibertyMutual)
    
    result.lossItems = parsedLineItems;
    
    // DEBUG: Log all parsed descriptions for cross-reference matching
    console.log('[LOSS-PARSER] === ALL PARSED LINE ITEM DESCRIPTIONS ===');
    console.log(`[LOSS-PARSER] Total parsed line items: ${parsedLineItems.length}`);
    parsedLineItems.forEach((item, idx) => {
      console.log(`  ${idx + 1}. ${item.description}`);
    });
    console.log('[LOSS-PARSER] =======================================');
    
    // ==========================================
    // EXTRACT LINE ITEMS FROM LOSS (using parsedLineItems)
    // ==========================================
    
    console.log('[CROSS-REF DEBUG] Starting cross-reference extraction from parsedLineItems');
    console.log(`[CROSS-REF DEBUG] parsedLineItems.length = ${parsedLineItems.length}`);
    if (parsedLineItems.length >= 3) {
      console.log(`[CROSS-REF DEBUG] First 3 items:`);
      console.log(`  1. ${parsedLineItems[0].description} (${parsedLineItems[0].quantity} ${parsedLineItems[0].unit})`);
      console.log(`  2. ${parsedLineItems[1].description} (${parsedLineItems[1].quantity} ${parsedLineItems[1].unit})`);
      console.log(`  3. ${parsedLineItems[2].description} (${parsedLineItems[2].quantity} ${parsedLineItems[2].unit})`);
    } else if (parsedLineItems.length > 0) {
      console.log(`[CROSS-REF DEBUG] Only ${parsedLineItems.length} item(s) parsed`);
      parsedLineItems.forEach((item, idx) => {
        console.log(`  ${idx + 1}. ${item.description} (${item.quantity} ${item.unit})`);
      });
    } else {
      console.log(`[CROSS-REF DEBUG] ⚠️ WARNING: parsedLineItems is EMPTY!`);
    }
    
    let shingleSquares = totalSquares; // Default to calculated squares
    let tearOffSquares = 0;
    let iceWaterFoundOnLoss = false; // Track if ice & water was explicitly on loss sheet
    const lineItems = {
      pipeBoots: null,
      stepFlashing: null,
      lFlashing: null,
      fascia: null,
      siding: [],
      windowWrap: [],
      houseWrap: null,
      soffit: null,
      skylights: null,
      skylightFlashingKit: null,
      turtleVents: null,
      powerAtticFan: null
    };
    
    // Loop through already-parsed line items and extract field-measured items
    parsedLineItems.forEach((item, idx) => {
      const descLower = item.description.toLowerCase();
      const qty = parseFloat(item.quantity);
      const unit = item.unit;
      
      // Exclude tearoff-only lines BEFORE stripping suffixes
      if (/^(remove|tear out)\b/i.test(descLower) || /detach\s*&?\s*reset/i.test(descLower)) {
        return;
      }
      
      // Strip action suffixes THEN check for tear out suffix
      const cleanDesc = item.description.replace(/^(Replace|Remove|Tear Out|Rem\/Reset|Detach\s*&\s*Reset|R&R)\s*-?\s*/i, '')
        .replace(/\s*[-–]\s*(Tear Out|Remove|Supply|Install|Rem\/Reset)$/i, '').trim();
      
      // DEBUG: Log siding/vinyl/wrap/fascia items at exclusion check
      if (/siding|vinyl|wrap|fascia/i.test(item.description)) {
        const willExclude = /[-–]\s*(tear out|remove)$/i.test(item.description);
        console.log(`[EXCLUSION DEBUG] Item ${idx + 1}:`);
        console.log(`  Original: "${item.description}"`);
        console.log(`  descLower: "${descLower}"`);
        console.log(`  cleanDesc: "${cleanDesc}"`);
        console.log(`  Will exclude: ${willExclude}`);
      }
      
      // Exclude if suffix was "Tear Out" or "Remove"
      if (/[-–]\s*(tear out|remove)$/i.test(item.description)) {
        return;
      }
      
      console.log(`[CROSS-REF DEBUG] Item ${idx + 1}: "${item.description}"`);
      console.log(`  Quantity: ${qty} ${unit}`);
      
      // Fascia (sum duplicates - e.g., main house + shed)
      if (/fascia/i.test(cleanDesc) && !/replace|paint|caulk|seal|prime|clean|detach|reset/i.test(cleanDesc)) {
        console.log(`  ✓ FASCIA MATCHED`);
        if (lineItems.fascia) {
          lineItems.fascia.quantity += qty;
          console.log(`    Summing with existing: ${lineItems.fascia.quantity} ${unit}`);
        } else {
          lineItems.fascia = { quantity: qty, unit };
        }
      }
      
      // Pipe jacks/boots (sum ALL variations - 1.5", 2", 3", 4" etc - into single total count)
      if (/pipe\s+(jack|boot)|flashing.*pipe/i.test(cleanDesc)) {
        console.log(`  ✓ PIPE JACK MATCHED`);
        if (lineItems.pipeBoots) {
          lineItems.pipeBoots.quantity += qty;
          console.log(`    Summing with existing: ${lineItems.pipeBoots.quantity} ${unit}`);
        } else {
          lineItems.pipeBoots = { quantity: qty, unit };
        }
      }
      
      // Soffit (sum duplicates)
      if (/soffit/i.test(cleanDesc) && !/r&r|replace|paint|caulk|seal|prime|clean|detach|reset/i.test(cleanDesc)) {
        console.log(`  ✓ SOFFIT MATCHED`);
        if (lineItems.soffit) {
          lineItems.soffit.quantity += qty;
          console.log(`    Summing with existing: ${lineItems.soffit.quantity} ${unit}`);
        } else {
          lineItems.soffit = { quantity: qty, unit };
        }
      }
      
      // Step flashing (sum duplicates)
      if (/step\s*flashing/i.test(cleanDesc)) {
        console.log(`  ✓ STEP FLASHING MATCHED`);
        if (lineItems.stepFlashing) {
          lineItems.stepFlashing.quantity += qty;
          console.log(`    Summing with existing: ${lineItems.stepFlashing.quantity} ${unit}`);
        } else {
          lineItems.stepFlashing = { quantity: qty, unit };
        }
      }
      
      // L flashing / trim coil / counterflashing / apron flashing (sum duplicates)
      if (/l\s*flashing|flashing.*l\s*style|kick.?out\s*flashing|trim\s*coil|counterflashing|counter\s*flashing|apron\s*flashing/i.test(cleanDesc)) {
        console.log(`  ✓ L FLASHING / TRIM COIL MATCHED`);
        if (lineItems.lFlashing) {
          lineItems.lFlashing.quantity += qty;
          console.log(`    Summing with existing: ${lineItems.lFlashing.quantity} ${unit}`);
        } else {
          lineItems.lFlashing = { quantity: qty, unit };
        }
      }
      
      // Siding (sum duplicates - array format for multiple types)
      if (/vinyl\s*siding|hardboard\s*siding|siding.*lap|lap.*siding|siding.*vinyl/i.test(cleanDesc) && !/r&r|replace|paint|caulk|seal/i.test(cleanDesc)) {
        console.log(`  ✓ SIDING MATCHED`);
        lineItems.siding.push({
          name: cleanDesc.includes('vinyl') ? 'Vinyl Siding' : cleanDesc.includes('hardboard') ? 'Hardboard Siding' : 'Siding',
          quantity: qty,
          unit: unit
        });
      }
      
      // House wrap
      if (/house\s*wrap|air.*moisture.*barrier|moisture.*barrier/i.test(cleanDesc)) {
        console.log(`  ✓ HOUSE WRAP MATCHED`);
        if (lineItems.houseWrap) {
          lineItems.houseWrap.quantity += qty;
        } else {
          lineItems.houseWrap = { quantity: qty, unit };
        }
      }
      
      // Window wrap (sum duplicates - array format)
      if (/window.*wrap|trim.*window|window.*trim/i.test(cleanDesc)) {
        console.log(`  ✓ WINDOW WRAP MATCHED`);
        lineItems.windowWrap.push({
          name: 'Window Wrap',
          quantity: qty,
          unit: unit
        });
      }
      
      // Skylights (sum duplicates)
      if (/skylight/i.test(cleanDesc) && !/flashing/i.test(cleanDesc)) {
        console.log(`  ✓ SKYLIGHT MATCHED`);
        if (lineItems.skylights) {
          lineItems.skylights.quantity += qty;
          console.log(`    Summing with existing: ${lineItems.skylights.quantity} ${unit}`);
        } else {
          lineItems.skylights = { quantity: qty, unit };
        }
      }
      
      // Skylight flashing kit (sum duplicates)
      if (/skylight.*flashing|flashing.*skylight|skylight.*kit/i.test(cleanDesc)) {
        console.log(`  ✓ SKYLIGHT FLASHING KIT MATCHED`);
        if (lineItems.skylightFlashingKit) {
          lineItems.skylightFlashingKit.quantity += qty;
          console.log(`    Summing with existing: ${lineItems.skylightFlashingKit.quantity} ${unit}`);
        } else {
          lineItems.skylightFlashingKit = { quantity: qty, unit };
        }
      }
      
      // Turtle vents (sum duplicates)
      if (/turtle.*vent|static.*vent|roof.*vent/i.test(cleanDesc) && !/ridge\s*vent/i.test(cleanDesc)) {
        console.log(`  ✓ TURTLE VENT MATCHED`);
        if (lineItems.turtleVents) {
          lineItems.turtleVents.quantity += qty;
          console.log(`    Summing with existing: ${lineItems.turtleVents.quantity} ${unit}`);
        } else {
          lineItems.turtleVents = { quantity: qty, unit };
        }
      }
      
      // Power attic fan (sum duplicates)
      if (/power.*fan|attic.*fan|powered.*vent/i.test(cleanDesc)) {
        console.log(`  ✓ POWER ATTIC FAN MATCHED`);
        if (lineItems.powerAtticFan) {
          lineItems.powerAtticFan.quantity += qty;
          console.log(`    Summing with existing: ${lineItems.powerAtticFan.quantity} ${unit}`);
        } else {
          lineItems.powerAtticFan = { quantity: qty, unit };
        }
      }
      
      // Ice & water shield detection (for valley length calculation)
      if (/ice.*water|ice\s*&\s*water/i.test(cleanDesc)) {
        iceWaterFoundOnLoss = true;
        if (unit === 'SF') {
          result.measurements.valleyLength = Math.ceil(qty / 3);
          console.log(`  ✓ ICE & WATER MATCHED: ${qty} SF → valleyLength = ${result.measurements.valleyLength}`);
        }
      }
      
      // Tear off (for labor calculation)
      if (/tear\s*off|remove.*shingle|disposal.*shingle/i.test(cleanDesc) && unit === 'SQ') {
        tearOffSquares = qty;
        console.log(`  ✓ TEAR OFF MATCHED: ${qty} SQ`);
      }
      
      // Shingle squares (override calculated value)
      if (/laminated|composition.*shingle|architectural.*shingle/i.test(cleanDesc) && unit === 'SQ' && !/(tear|remove|disposal)/i.test(cleanDesc)) {
        shingleSquares = qty;
        console.log(`  ✓ SHINGLE SQUARES MATCHED: ${qty} SQ`);
      }
    });
    
    console.log('[CROSS-REF DEBUG] Cross-reference extraction complete');
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
    
    // DEBUG: Log cross-reference matching results
    console.log('[LOSS-PARSER] === CROSS-REFERENCE MATCHING RESULTS ===');
    Object.keys(lineItems).forEach(key => {
      if (Array.isArray(lineItems[key])) {
        if (lineItems[key].length > 0) {
          console.log(`  ✓ ${key}: ${lineItems[key].length} item(s)`);
        }
      } else if (lineItems[key]) {
        console.log(`  ✓ ${key}: ${lineItems[key].quantity} ${lineItems[key].unit}`);
      } else {
        console.log(`  ✗ ${key}: not found`);
      }
    });
    console.log('[LOSS-PARSER] =======================================');
    
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
    
    // Zero out step flashing if not found in loss sheet at all
    const hasStepFlashingInLoss = parsedLineItems.some(item => 
      /step\s*flashing/i.test(item.description)
    );
    if (!hasStepFlashingInLoss) {
      stepFlashingItem.quantity = 0;
      stepFlashingItem.total = 0;
      console.log('[LOSS-PARSER] Step flashing not found in loss sheet — zeroing material row');
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
    
    // Zero out L flashing if not found in loss sheet at all
    const hasLFlashingInLoss = parsedLineItems.some(item => 
      /l[\s-]*flashing|apron\s*flashing|counter\s*flashing/i.test(item.description)
    );
    if (!hasLFlashingInLoss) {
      lFlashingItem.quantity = 0;
      lFlashingItem.total = 0;
      console.log('[LOSS-PARSER] L flashing not found in loss sheet — zeroing material row');
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
    // BUILD SUPPLEMENT ITEMS (R&R items from loss)
    // ==========================================
    result.supplementItems = [];
    
    // Helper to generate unique IDs
    const generateSupplementId = () => `supplement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Field-measured items pulled directly from loss sheet (NOT from roof report)
    if (lineItems.fascia) {
      result.supplementItems.push({
        id: generateSupplementId(),
        name: 'Fascia',
        quantity: lineItems.fascia.quantity,
        unit: lineItems.fascia.unit,
        unitPrice: 0,
        source: 'loss',
        color: ''
      });
    }
    
    // Siding - sum all siding lines into one item
    const totalSidingSF = lineItems.siding.reduce((sum, s) => sum + s.quantity, 0);
    if (totalSidingSF > 0) {
      result.supplementItems.push({
        id: generateSupplementId(),
        name: 'Siding',
        quantity: totalSidingSF,
        unit: 'SF',
        unitPrice: 0,
        source: 'loss',
        color: ''
      });
    }
    
    // Window wrap - keep individual items
    lineItems.windowWrap.forEach(item => {
      result.supplementItems.push({
        id: generateSupplementId(),
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: 0,
        source: 'loss',
        color: ''
      });
    });
    
    // House wrap - only add if total siding > 250 SF
    if (lineItems.houseWrap && totalSidingSF > 250) {
      result.supplementItems.push({
        id: generateSupplementId(),
        name: 'House Wrap',
        quantity: lineItems.houseWrap.quantity,
        unit: lineItems.houseWrap.unit,
        unitPrice: 0,
        source: 'loss',
        color: ''
      });
    }
    
    if (lineItems.soffit) {
      result.supplementItems.push({
        id: generateSupplementId(),
        name: 'Soffit',
        quantity: lineItems.soffit.quantity,
        unit: lineItems.soffit.unit,
        unitPrice: 0,
        source: 'loss',
        color: ''
      });
    }
    
    // Pipe jacks - create one separate row per item (don't sum, split into individual rows)
    if (lineItems.pipeBoots) {
      const totalCount = Math.floor(parseFloat(lineItems.pipeBoots.quantity));
      for (let i = 0; i < totalCount; i++) {
        result.supplementItems.push({
          id: generateSupplementId(),
          name: 'Pipe Jack',
          quantity: 1,
          unit: 'EA',
          unitPrice: 0,
          source: 'loss',
          color: ''
        });
      }
    }
    
    // Step flashing and L flashing are NEVER extracted as supplement items
    // They are handled directly by the material list with zero-out logic
    
    
    if (lineItems.skylights) {
      result.supplementItems.push({
        id: generateSupplementId(),
        name: 'Skylight',
        quantity: parseFloat(lineItems.skylights.quantity),
        unit: lineItems.skylights.unit,
        unitPrice: 0,
        source: 'loss',
        color: ''
      });
    }
    
    if (lineItems.skylightFlashingKit) {
      result.supplementItems.push({
        id: generateSupplementId(),
        name: 'Skylight Flashing Kit',
        quantity: parseFloat(lineItems.skylightFlashingKit.quantity),
        unit: lineItems.skylightFlashingKit.unit,
        unitPrice: 0,
        source: 'loss',
        color: ''
      });
    }
    
    if (lineItems.turtleVents) {
      result.supplementItems.push({
        id: generateSupplementId(),
        name: 'Turtle Vent',
        quantity: parseFloat(lineItems.turtleVents.quantity),
        unit: lineItems.turtleVents.unit,
        unitPrice: 0,
        source: 'loss',
        color: ''
      });
    }
    
    if (lineItems.powerAtticFan) {
      result.supplementItems.push({
        id: generateSupplementId(),
        name: 'Power Attic Fan',
        quantity: parseFloat(lineItems.powerAtticFan.quantity),
        unit: lineItems.powerAtticFan.unit,
        unitPrice: 0,
        source: 'loss',
        color: ''
      });
    }
    
    // ==========================================
    // CALCULATE TOTALS
    // ==========================================
    
    result.subtotal = result.materials.reduce((sum, m) => sum + m.total, 0);
    result.tax = result.subtotal * 0.09;
    result.grandTotal = result.subtotal + result.tax;
    
    // Store extracted text for debugging
    result._debugText = text;
    
    console.log('[LOSS-PARSER] Complete. Materials:', result.materials.length, 'Labor:', result.labor.items.length, 'Loss items:', result.lossItems.length, 'Supplement items:', result.supplementItems.length);
    
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
    const data = await extractPdfText(dataBuffer, pdfPath);
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
    const results = { success: true, lossItems: [], supplementItems: [] };
    
    console.log('[PROCESS-DOCS] Starting loop, total files:', pdfPaths.length);
    console.log('[PROCESS-DOCS] File paths:', pdfPaths);
    
    for (let i = 0; i < pdfPaths.length; i++) {
      const p = pdfPaths[i];
      console.log(`[PROCESS-DOCS] Processing file ${i + 1}/${pdfPaths.length}: ${p}`);
      
      const isLoss = await isLossSheet(p);
      console.log(`[PROCESS-DOCS] isLossSheet() returned: ${isLoss} for ${p}`);
      
      if (isLoss) {
        console.log('[PROCESS-DOCS] ✓ Detected LOSS SHEET, parsing...');
        const parsed = await parseCompleteLossSheet(p);
        if (parsed.success) {
          results.lossItems = parsed.lossItems || [];
          results.supplementItems = parsed.supplementItems || [];
          console.log('[PROCESS-DOCS] Extracted', results.lossItems.length, 'loss items');
          console.log('[PROCESS-DOCS] Extracted', results.supplementItems.length, 'supplement items (cross-referenced)');
          console.log('[PROCESS-DOCS] Supplement items:', JSON.stringify(results.supplementItems, null, 2));
        } else {
          console.log('[PROCESS-DOCS] ✗ Loss sheet parse failed:', parsed.message);
        }
      } else {
        console.log('[PROCESS-DOCS] ✓ Detected ROOF REPORT (not a loss sheet)');
        results.roofReport = { detected: true };
      }
    }
    
    console.log('[PROCESS-DOCS] Loop complete. Final results:', {
      lossItems: results.lossItems.length,
      supplementItems: results.supplementItems.length,
      roofReport: !!results.roofReport
    });
    
    return results;
  }
};
