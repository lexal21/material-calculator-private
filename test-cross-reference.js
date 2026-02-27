const fs = require('fs');
const pdfParse = require('pdf-parse');

const heritagePath = 'C:\\Users\\power\\.openclaw\\media\\inbound\\file_64---a862624e-f737-45af-84f7-752df8da23b6.pdf';
const ridgeTopPath = 'C:\\Users\\power\\.openclaw\\media\\inbound\\file_63---7a2f4f4a-7622-49b9-a5c1-43a66aadab1c.pdf';

async function crossReference() {
  try {
    // Parse Heritage estimate
    const heritageBuffer = fs.readFileSync(heritagePath);
    const heritageData = await pdfParse(heritageBuffer);
    const heritageText = heritageData.text;
    
    // Parse Ridge Top measurements
    const ridgeTopBuffer = fs.readFileSync(ridgeTopPath);
    const ridgeTopData = await pdfParse(ridgeTopBuffer);
    const ridgeTopText = ridgeTopData.text;
    
    console.log('=== RIDGE TOP MEASUREMENTS ===\n');
    
    // Extract measurements from Ridge Top
    const measurements = {
      roofArea: ridgeTopText.match(/Roof area\s+([\d.]+)\s*ft\s*²/)?.[1],
      roofSq: ridgeTopText.match(/Roof sq\s+([\d.]+)\s*sq/)?.[1],
      hipLength: ridgeTopText.match(/Hip length\s+([\d.]+)\s*ft/)?.[1],
      ridgeLength: ridgeTopText.match(/Ridge length\s+([\d.]+)\s*ft/)?.[1],
      rakeEdge: ridgeTopText.match(/Rake edge length\s+([\d.]+)\s*ft/)?.[1],
      valleyLength: ridgeTopText.match(/Valley length\s+([\d.]+)\s*ft/)?.[1],
      eaveEdge: ridgeTopText.match(/Eave edge length\s+([\d.]+)\s*ft/)?.[1],
      flashingLength: ridgeTopText.match(/Flashing length\s+([\d.]+)\s*ft/)?.[1],
      stepFlashing: ridgeTopText.match(/Step flashing\s+([\d.]+)\s*ft/)?.[1]
    };
    
    console.log('Roof Area:', measurements.roofArea, 'ft²');
    console.log('Roof Squares:', measurements.roofSq, 'sq');
    console.log('Hip Length:', measurements.hipLength, 'ft');
    console.log('Ridge Length:', measurements.ridgeLength, 'ft');
    console.log('Rake Edge:', measurements.rakeEdge, 'ft');
    console.log('Valley Length:', measurements.valleyLength, 'ft');
    console.log('Eave Edge:', measurements.eaveEdge, 'ft');
    console.log('Flashing Length:', measurements.flashingLength, 'ft');
    console.log('Step Flashing:', measurements.stepFlashing, 'ft');
    
    console.log('\n=== HERITAGE ESTIMATE LINE ITEMS ===\n');
    
    // Extract line items from Heritage
    const lineItems = [];
    const lines = heritageText.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const itemMatch = line.match(/^(\d+)\.\s+(.+)/);
      
      if (itemMatch) {
        const itemNum = itemMatch[1];
        const restOfLine = itemMatch[2];
        
        // Try to extract quantity and unit from the same or next lines
        let quantity = null;
        let unit = null;
        let description = restOfLine;
        
        // Check if quantity is in the same line
        const inlineQty = restOfLine.match(/([\d.]+)\s*(SQ|LF|SF|EA|DA)/);
        if (inlineQty) {
          quantity = inlineQty[1];
          unit = inlineQty[2];
          description = restOfLine.substring(0, inlineQty.index).trim();
        }
        
        lineItems.push({
          item: itemNum,
          description: description,
          quantity: quantity,
          unit: unit
        });
      }
    }
    
    console.log('\n=== CROSS-REFERENCE RESULTS ===\n');
    
    // Cross-reference logic
    lineItems.forEach(item => {
      const desc = item.description.toLowerCase();
      let match = null;
      let source = null;
      
      if (desc.includes('tear off') || desc.includes('dispose')) {
        match = measurements.roofSq;
        source = 'Roof Squares';
      } else if (desc.includes('laminated') && desc.includes('shingle')) {
        match = measurements.roofSq;
        source = 'Roof Squares (with waste)';
      } else if (desc.includes('sheathing') && desc.includes('osb')) {
        match = 'N/A';
        source = 'Damage-specific (not in measurements)';
      } else if (desc.includes('starter')) {
        match = measurements.eaveEdge;
        source = 'Eave Edge Length';
      } else if (desc.includes('drip edge')) {
        const total = parseFloat(measurements.rakeEdge || 0) + parseFloat(measurements.eaveEdge || 0);
        match = total.toFixed(2);
        source = 'Rake + Eave Edge';
      } else if (desc.includes('ice') && desc.includes('water')) {
        match = measurements.eaveEdge;
        source = 'Eave Edge (3ft up)';
      } else if (desc.includes('felt')) {
        match = measurements.roofSq;
        source = 'Roof Squares';
      } else if (desc.includes('hip') && desc.includes('ridge')) {
        const total = parseFloat(measurements.hipLength || 0) + parseFloat(measurements.ridgeLength || 0);
        match = total.toFixed(2);
        source = 'Hip + Ridge Length';
      } else if (desc.includes('ridge vent')) {
        match = measurements.ridgeLength;
        source = 'Ridge Length';
      } else if (desc.includes('fascia')) {
        match = 'N/A';
        source = 'Field measurement required';
      } else if (desc.includes('gutter')) {
        match = 'N/A';
        source = 'Field measurement required';
      } else if (desc.includes('pipe jack') || desc.includes('flashing')) {
        match = measurements.flashingLength || measurements.stepFlashing;
        source = 'Flashing/Step Flashing Length';
      } else if (desc.includes('steep roof')) {
        match = measurements.roofSq;
        source = 'Roof Squares (labor multiplier)';
      }
      
      const status = match && match !== 'N/A' ? '✓' : '✗';
      console.log(`${status} Item ${item.item}: ${item.description}`);
      console.log(`   Heritage: ${item.quantity || 'N/A'} ${item.unit || ''}`);
      console.log(`   Ridge Top: ${match || 'N/A'} (${source})`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

crossReference();
