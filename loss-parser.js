/*
 * loss-parser.js
 * QuikBitz - Insurance Loss Sheet Parser
 * Detects carrier by content, extracts line items and quantities
 */

const fs = require('fs');
const pdf = require('pdf-parse-fork');

// ── Carrier / adjuster detection signatures ───────────────────────────────
const CARRIER_SIGNATURES = [
  { name: 'USAA', patterns: ['USAA', 'USAA CASUALTY', 'USAA GENERAL INDEMNITY'] },
  { name: 'State Farm', patterns: ['State Farm', 'STATE FARM'] },
  { name: 'Allstate', patterns: ['Allstate', 'ALLSTATE'] },
  { name: 'Travelers', patterns: ['Travelers', 'TRAVELERS'] },
  { name: 'Farmers', patterns: ['Farmers Insurance', 'FARMERS'] },
  { name: 'Liberty Mutual', patterns: ['Liberty Mutual', 'LIBERTY MUTUAL'] },
  { name: 'Nationwide', patterns: ['Nationwide', 'NATIONWIDE'] },
  { name: 'American Family', patterns: ['American Family', 'AMERICAN FAMILY'] },
  { name: 'Chubb', patterns: ['Chubb', 'CHUBB'] },
  { name: 'Erie Insurance', patterns: ['Erie Insurance', 'ERIE INSURANCE'] },
  { name: 'Auto-Owners', patterns: ['Auto-Owners', 'AUTO-OWNERS'] },
  { name: 'Cincinnati Insurance', patterns: ['Cincinnati Insurance'] },
  { name: 'SafeCo', patterns: ['SafeCo', 'SAFECO'] },
  { name: 'Hartford', patterns: ['Hartford', 'THE HARTFORD'] },
  { name: 'Hippo', patterns: ['Hippo Insurance', 'HIPPO'] },
  { name: 'Universal Property', patterns: ['Universal Property'] },
  { name: 'Heritage Insurance', patterns: ['Heritage Insurance', 'Heritage Property'] },
  { name: 'Citizens Property', patterns: ['Citizens Property', 'Citizens Insurance'] },
  { name: 'Security First', patterns: ['Security First'] },
  { name: 'Tower Hill', patterns: ['Tower Hill'] },
  { name: 'David Morse & Associates', patterns: ['David Morse'] },
  { name: 'Pilot Catastrophe', patterns: ['Pilot Catastrophe', 'Pilot Cat'] },
  { name: 'Eberl Claims', patterns: ['Eberl'] },
  { name: 'Crawford', patterns: ['Crawford & Company', 'Crawford and Company'] },
  { name: 'Sedgwick', patterns: ['Sedgwick'] },
  { name: 'Gallagher Bassett', patterns: ['Gallagher Bassett'] },
];

// Loss sheet field signatures (to confirm it IS a loss sheet)
const LOSS_SHEET_FIELDS = [
  'Replacement Cost Value', 'Actual Cash Value', 'Net Claim',
  'Recoverable Depreciation', 'Policy Number', 'Date of Loss',
  'Line Item Total', 'Price List:'
];

// Roof report field signatures
const ROOF_REPORT_FIELDS = [
  'RidgeTop', 'EagleView', 'GAF QuickMeasure', 'Hover', 'RoofScope',
  'Roof Squares', 'Number of Squares', 'Waste Factor',
  'Hip Length', 'Ridge Length', 'Valley Length'
];

/**
 * Detect what type of document a PDF is
 * Returns: 'loss' | 'roof' | 'unknown'
 */
async function detectDocumentType(pdfPath) {
  const buffer = fs.readFileSync(pdfPath);
  const data = await pdf(buffer);
  const text = data.text;

  // Check loss sheet
  const lossScore = LOSS_SHEET_FIELDS.filter(f => text.includes(f)).length;
  const roofScore = ROOF_REPORT_FIELDS.filter(f => text.includes(f)).length;

  if (lossScore >= 2) return { type: 'loss', text };
  if (roofScore >= 2) return { type: 'roof', text };

  // Fallback: check carrier names
  for (const carrier of CARRIER_SIGNATURES) {
    for (const pattern of carrier.patterns) {
      if (text.includes(pattern)) return { type: 'loss', text };
    }
  }

  return { type: 'unknown', text };
}

/**
 * Extract carrier name from text
 */
function extractCarrier(text) {
  for (const carrier of CARRIER_SIGNATURES) {
    for (const pattern of carrier.patterns) {
      if (text.includes(pattern)) return carrier.name;
    }
  }
  // Try generic Insurance Company: line
  const match = text.match(/Insurance\s+Company[:\s]+([A-Z][A-Za-z &]+?)(?:\n|\r| )/);
  if (match) return match[1].trim().substring(0, 40);
  return 'Unknown Carrier';
}

/**
 * Extract insured name from loss sheet
 */
function extractInsured(text) {
  const patterns = [
    /Insured[:\s]+([A-Za-z ,.'-]+?)(?:\n|\r|Cell|Phone|E-mail)/,
    /Name of Insured[:\s]+([A-Za-z ,.'-]+?)(?:\n|\r)/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1].trim().substring(0, 50);
  }
  return '';
}

/**
 * Extract RCV total from loss sheet
 */
function extractRCV(text) {
  const patterns = [
    /Replacement Cost Value\s+\$?([\d,]+\.?\d*)/,
    /RCV\s+\$?([\d,]+\.?\d*)/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return '$' + m[1];
  }
  return '';
}

/**
 * Parse loss sheet line items from Xactimate-style estimates
 * Handles formats from USAA, State Farm, Allstate, etc.
 */
function parseLossLineItems(text) {
  const lineItems = [];
  const lines = text.split('\n');

  let currentDescription = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Match numbered line item description: "1. Tear off, haul..."
    const descMatch = line.match(/^(\d+)\.\s+(.+)/);
    if (descMatch) {
      currentDescription = descMatch[2].trim();
      continue;
    }

    // Match quantity line: "33.31 SQ  71.91 ..."
    const qtyMatch = line.match(/^([\d,]+\.?\d*)\s+(SQ|LF|EA|SF|SY|BD|RL|BX|PR|HR|DY|MO|AL|LS)\b/i);
    if (qtyMatch && currentDescription) {
      const quantity = parseFloat(qtyMatch[1].replace(/,/g, ''));
      const unit = qtyMatch[2].toUpperCase();

      // Try to extract RCV from the line
      const numbers = line.match(/[\d,]+\.\d{2}/g) || [];
      let rcv = null;
      if (numbers.length >= 3) {
        const vals = numbers.map(n => parseFloat(n.replace(/,/g, '')));
        rcv = Math.max(...vals);
      }

      lineItems.push({ description: currentDescription, quantity, unit, rcv });
      currentDescription = null;
    }
  }

  return lineItems;
}

/**
 * Items that appear on loss sheets but NOT on roof reports
 */
const LOSS_ONLY_ITEM_PATTERNS = [
  { pattern: /pipe\s+jack|pipe\s+boot|boot\s+flash/i, note: 'Count pipe penetrations on site' },
  { pattern: /gable\s+cornice|cornice\s+return/i, note: 'Verify count of gable returns on site' },
  { pattern: /fascia/i, note: 'Field measure damaged fascia runs' },
  { pattern: /L\s+flash|l-flash/i, note: 'Field verify brick/wall tie-in length' },
  { pattern: /sheathing\s+patch|decking\s+patch|roof\s+sheathing\s+patch/i, note: 'Inspect decking during tear-off' },
  { pattern: /skylight/i, note: 'Confirm skylight count and size on site' },
  { pattern: /chimney\s+flash/i, note: 'Field measure chimney flashing' },
  { pattern: /drip\s+edge|rake\s+edge|eave\s+drip/i, note: 'Verify against roof report perimeter if available' },
];

/**
 * Flag line items that are loss-sheet-only
 */
function flagSupplementItems(lineItems) {
  return lineItems.filter(item => {
    return LOSS_ONLY_ITEM_PATTERNS.some(p => p.pattern.test(item.description));
  }).map(item => {
    const match = LOSS_ONLY_ITEM_PATTERNS.find(p => p.pattern.test(item.description));
    return { ...item, note: match ? match.note : 'Field verify' };
  });
}

/**
 * Parse roof report measurements from text
 */
function parseRoofMeasurements(text) {
  const m = {};

  const sqMatch = text.match(/Roof\s+(?:sq|squares?)\s*([\d.]+)/i);
  if (sqMatch) m.roofSquares = parseFloat(sqMatch[1]);

  const areaMatch = text.match(/Roof\s+area\s*([\d,]+\.?\d*)/i);
  if (areaMatch) m.roofArea = parseFloat(areaMatch[1].replace(/,/g, ''));

  const ridgeMatch = text.match(/Ridge\s*(?:length)?\s*([\d.]+)\s*ft/i);
  if (ridgeMatch) m.ridgeLength = parseFloat(ridgeMatch[1]);

  const hipMatch = text.match(/Hip\s*(?:length)?\s*([\d.]+)\s*ft/i);
  if (hipMatch) m.hipLength = parseFloat(hipMatch[1]);

  const valleyMatch = text.match(/Valley\s*(?:length)?\s*([\d.]+)\s*ft/i);
  if (valleyMatch) m.valleyLength = parseFloat(valleyMatch[1]);

  const eaveMatch = text.match(/Eave\s*(?:edge\s*)?(?:length)?\s*([\d.]+)\s*ft/i);
  if (eaveMatch) m.eaveEdge = parseFloat(eaveMatch[1]);

  const rakeMatch = text.match(/Rake\s*(?:edge\s*)?(?:length)?\s*([\d.]+)\s*ft/i);
  if (rakeMatch) m.rakeEdge = parseFloat(rakeMatch[1]);

  const stepMatch = text.match(/Step\s+[Ff]lashing\s*([\d.]+)\s*ft/i);
  if (stepMatch) m.stepFlashing = parseFloat(stepMatch[1]);

  const wallMatch = text.match(/(?:Wall|Flashing)\s+[Ff]lashing\s*([\d.]+)\s*ft/i);
  if (wallMatch) m.wallFlashing = parseFloat(wallMatch[1]);

  // Fallback: old concatenated format
  if (!m.roofSquares) {
    const oldMatch = text.match(/(\d+\.?\d*)\s*sq\s*²\s*([\d.]+)\s*ft\s*([\d.]+)\s*ft\s*([\d.]+)\s*ft\s*([\d.]+)\s*ft\s*([\d.]+)\s*ft\s*([\d.]+)\s*ft\s*([\d.]+)\s*ft/i);
    if (oldMatch) {
      m.roofSquares = parseFloat(oldMatch[1]);
      m.hipLength = parseFloat(oldMatch[2]);
      m.ridgeLength = parseFloat(oldMatch[3]);
      m.rakeEdge = parseFloat(oldMatch[4]);
      m.valleyLength = parseFloat(oldMatch[5]);
      m.eaveEdge = parseFloat(oldMatch[6]);
      m.wallFlashing = parseFloat(oldMatch[7]);
      m.stepFlashing = parseFloat(oldMatch[8]);
    }
  }

  return m;
}

/**
 * Extract loss sheet measurements for comparison
 */
function parseLossSheetMeasurements(lineItems) {
  const m = {};

  for (const item of lineItems) {
    const desc = item.description.toLowerCase();
    const qty = item.quantity;
    const unit = item.unit;

    if (/tear off|haul.*dispose/.test(desc) && unit === 'SQ') m.tearOffSQ = qty;
    if (/shingle|laminated.*comp|comp.*shingle/.test(desc) && unit === 'SQ') m.shinglesSQ = qty;
    if (/felt|underlayment|roofing felt/.test(desc) && unit === 'SQ') m.underlaymentSQ = qty;
    if (/ridge vent/.test(desc) && unit === 'LF') m.ridgeVentLF = qty;
    if (/hip.*ridge.*cap|ridge.*cap|hip.*cap/.test(desc) && unit === 'LF') m.hipRidgeCapLF = qty;
    if (/valley/.test(desc) && unit === 'LF') m.valleyLF = qty;
    if (/step flash/.test(desc) && unit === 'LF') m.stepFlashingLF = qty;
    if (/drip edge|eave.*drip|rake.*drip/.test(desc) && unit === 'LF') {
      m.dripEdgeLF = (m.dripEdgeLF || 0) + qty;
    }
  }

  return m;
}

/**
 * Build comparison rows between roof report and loss sheet
 */
function buildComparison(roofM, lossM) {
  const rows = [];

  function row(item, roofVal, lossVal, roofUnit, lossUnit) {
    const rv = roofVal != null ? `${roofVal} ${roofUnit}` : '—';
    const lv = lossVal != null ? `${lossVal} ${lossUnit || roofUnit}` : 'Not listed';
    let diff = '—';
    let status = 'ok';

    if (roofVal != null && lossVal != null) {
      const delta = Math.round((lossVal - roofVal) * 100) / 100;
      if (Math.abs(delta) > 0.5) {
        diff = `${delta > 0 ? '+' : ''}${delta} ${roofUnit}`;
        status = 'flagged';
      } else {
        diff = 'Match';
      }
    } else if (roofVal != null && lossVal == null) {
      diff = 'Missing from loss';
      status = 'flagged';
    }

    rows.push({ item, roofValue: rv, lossValue: lv, difference: diff, status });
  }

  if (roofM.roofSquares || lossM.tearOffSQ) row('Roof Area (Squares)', roofM.roofSquares, lossM.tearOffSQ, 'SQ', 'SQ');
  if (roofM.roofSquares || lossM.shinglesSQ) {
    const roofWithWaste = roofM.roofSquares ? Math.round(roofM.roofSquares * 1.10 * 100) / 100 : null;
    row('Shingles (w/ waste)', roofWithWaste, lossM.shinglesSQ, 'SQ', 'SQ');
  }
  if (roofM.roofSquares || lossM.underlaymentSQ) row('Underlayment / Felt', roofM.roofSquares, lossM.underlaymentSQ, 'SQ', 'SQ');
  if (roofM.ridgeLength || lossM.ridgeVentLF) row('Ridge Length / Ridge Vent', roofM.ridgeLength, lossM.ridgeVentLF, 'LF', 'LF');
  if (roofM.hipLength || lossM.hipRidgeCapLF) row('Hip Length / Hip Cap', roofM.hipLength, lossM.hipRidgeCapLF, 'LF', 'LF');
  if (roofM.valleyLength || lossM.valleyLF) row('Valley Length', roofM.valleyLength, lossM.valleyLF, 'LF', 'LF');
  if (roofM.stepFlashing || lossM.stepFlashingLF) row('Step Flashing', roofM.stepFlashing, lossM.stepFlashingLF, 'LF', 'LF');
  if (roofM.eaveEdge || roofM.rakeEdge || lossM.dripEdgeLF) {
    const roofPerim = (roofM.eaveEdge || 0) + (roofM.rakeEdge || 0);
    row('Drip Edge (Eave + Rake)', roofPerim > 0 ? roofPerim : null, lossM.dripEdgeLF, 'LF', 'LF');
  }

  return rows;
}

/**
 * Main entry: parse one or two PDFs and return structured result
 */
async function processDocuments(pdfPaths) {
  const docs = [];
  for (const p of pdfPaths) {
    const detected = await detectDocumentType(p);
    docs.push({ path: p, ...detected });
  }

  const roofDoc = docs.find(d => d.type === 'roof');
  const lossDoc = docs.find(d => d.type === 'loss');
  const result = { success: true };

  if (roofDoc) {
    const roofM = parseRoofMeasurements(roofDoc.text);
    const addrMatch = roofDoc.text.match(/(\d+\s+[A-Za-z\s]+(?:Circle|Drive|Street|Road|Way|Court|Lane|Avenue|Blvd)[,\s]+[A-Za-z\s]+,?\s*[A-Z]{2})/i);
    result.roofReport = {
      provider: extractReportProvider(roofDoc.text),
      address: addrMatch ? addrMatch[1].trim() : '',
      measurements: roofM
    };
  }

  if (lossDoc) {
    const lineItems = parseLossLineItems(lossDoc.text);
    const supplementItems = flagSupplementItems(lineItems);
    const lossM = parseLossSheetMeasurements(lineItems);
    result.lossSheet = {
      carrier: extractCarrier(lossDoc.text),
      insured: extractInsured(lossDoc.text),
      rcv: extractRCV(lossDoc.text),
      lineItems,
      measurements: lossM
    };
    result.supplementItems = supplementItems;
  }

  if (roofDoc && lossDoc) {
    result.comparison = buildComparison(
      result.roofReport.measurements,
      result.lossSheet.measurements
    );
  }

  return result;
}

function extractReportProvider(text) {
  const providers = ['RidgeTop', 'EagleView', 'GAF QuickMeasure', 'Hover', 'RoofScope'];
  for (const p of providers) {
    if (text.includes(p)) return p;
  }
  return 'Roof Report';
}

module.exports = { processDocuments, detectDocumentType };
