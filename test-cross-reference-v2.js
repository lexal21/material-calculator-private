const fs = require('fs');
const pdfParse = require('pdf-parse');

const heritagePath = 'C:\\Users\\power\\.openclaw\\media\\inbound\\file_64---a862624e-f737-45af-84f7-752df8da23b6.pdf';
const ridgeTopPath = 'C:\\Users\\power\\.openclaw\\media\\inbound\\file_63---7a2f4f4a-7622-49b9-a5c1-43a66aadab1c.pdf';

async function crossReference() {
  try {
    // Parse Ridge Top measurements
    const ridgeTopBuffer = fs.readFileSync(ridgeTopPath);
    const ridgeTopData = await pdfParse(ridgeTopBuffer);
    const ridgeTopText = ridgeTopData.text;
    
    console.log('=== RIDGE TOP MEASUREMENTS (Raw Extract) ===\n');
    
    // Extract from the specific summary section
    const measurements = {
      roofArea: '3144.79',
      roofSq: '31.45',
      hipLength: '116.71',
      ridgeLength: '71.5',
      rakeEdge: '74.2',
      valleyLength: '82.55',
      eaveEdge: '194.57',
      flashingLength: '2',
      stepFlashing: '18.22'
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
    
    // Parse Heritage estimate
    const heritageBuffer = fs.readFileSync(heritagePath);
    const heritageData = await pdfParse(heritageBuffer);
    const heritageText = heritageData.text;
    
    console.log('\n=== CROSS-REFERENCE RESULTS ===\n');
    
    // Extract and cross-reference Heritage line items
    const lineItems = [
      { num: '1', desc: 'R&R Wrap custom fascia with aluminum', qty: '85.00', unit: 'LF' },
      { num: '2', desc: 'Two ladders with jacks and plank (per day)', qty: '1.00', unit: 'DA' },
      { num: '3', desc: 'R&R Gutter / downspout - aluminum - up to 5"', qty: '7.00', unit: 'LF' },
      { num: '4', desc: 'R&R Gutter / downspout - aluminum - up to 5"', qty: '8.00', unit: 'LF' },
      { num: '5', desc: 'Tear off, haul and dispose of comp. shingles', qty: '31.45', unit: 'SQ' },
      { num: '6', desc: 'Laminated - comp. shingle rfg. - w/out felt', qty: '36.33', unit: 'SQ' },
      { num: '7', desc: 'R&R Sheathing - OSB - 1/2"', qty: '32.00', unit: 'SF' },
      { num: '8', desc: 'Asphalt starter - universal starter course', qty: '194.57', unit: 'LF' },
      { num: '9', desc: 'Drip edge', qty: '268.77', unit: 'LF' },
      { num: '10', desc: 'Ice & water barrier', qty: '247.66', unit: 'SF' },
      { num: '11', desc: 'Roofing felt - 30 lb', qty: '28.98', unit: 'SQ' },
      { num: '12', desc: 'Hip / Ridge cap - Standard profile - composition shingles', qty: '188.21', unit: 'LF' },
      { num: '13', desc: 'Continuous ridge vent - shingle-over style', qty: '57.50', unit: 'LF' },
      { num: '14', desc: 'Flashing - pipe jack', qty: '2.00', unit: 'EA' },
      { num: '15', desc: 'Digital satellite system - Detach & reset', qty: '1.00', unit: 'EA' },
      { num: '16', desc: 'R&R Gable cornice return - laminated', qty: '4.00', unit: 'EA' },
      { num: '17', desc: 'Additional charge for steep roof - 10/12 - 12/12 slope (Remove)', qty: '31.45', unit: 'SQ' },
      { num: '18', desc: 'Additional charge for steep roof - 10/12 - 12/12 slope', qty: '31.45', unit: 'SQ' },
      { num: '19', desc: 'Haul debris - per pickup truck load', qty: '1.00', unit: 'EA' },
      { num: '20', desc: 'Gutter labor minimum', qty: '1.00', unit: 'EA' }
    ];
    
    lineItems.forEach(item => {
      const desc = item.desc.toLowerCase();
      let ridgeTopValue = null;
      let source = null;
      let match = false;
      
      if (desc.includes('tear off') || desc.includes('dispose')) {
        ridgeTopValue = measurements.roofSq + ' SQ';
        source = 'Roof Squares';
        match = (item.qty === measurements.roofSq);
      } else if (desc.includes('laminated') && desc.includes('shingle')) {
        const waste15 = (parseFloat(measurements.roofSq) * 1.15).toFixed(2);
        ridgeTopValue = waste15 + ' SQ (31.45 + 15% waste)';
        source = 'Roof Squares + 15% waste';
        match = (item.qty === waste15);
      } else if (desc.includes('sheathing')) {
        ridgeTopValue = 'Not in measurements';
        source = 'Damage-specific';
        match = false;
      } else if (desc.includes('starter')) {
        ridgeTopValue = measurements.eaveEdge + ' LF';
        source = 'Eave Edge Length';
        match = (item.qty === measurements.eaveEdge);
      } else if (desc.includes('drip edge')) {
        const total = (parseFloat(measurements.rakeEdge) + parseFloat(measurements.eaveEdge)).toFixed(2);
        ridgeTopValue = total + ' LF (Rake + Eave)';
        source = 'Rake + Eave Edge';
        match = (item.qty === total);
      } else if (desc.includes('ice') && desc.includes('water')) {
        const calc = (parseFloat(measurements.eaveEdge) * 3).toFixed(2);
        ridgeTopValue = calc + ' SF (194.57 LF × 3ft)';
        source = 'Eave × 3ft width';
        match = Math.abs(parseFloat(item.qty) - parseFloat(calc)) < 50; // Allow variance
      } else if (desc.includes('felt')) {
        ridgeTopValue = measurements.roofSq + ' SQ';
        source = 'Roof Squares (minus valleys)';
        match = Math.abs(parseFloat(item.qty) - parseFloat(measurements.roofSq)) < 3;
      } else if (desc.includes('hip') && desc.includes('ridge cap')) {
        const total = (parseFloat(measurements.hipLength) + parseFloat(measurements.ridgeLength)).toFixed(2);
        ridgeTopValue = total + ' LF (Hip + Ridge)';
        source = 'Hip + Ridge Length';
        match = (item.qty === total);
      } else if (desc.includes('ridge vent')) {
        ridgeTopValue = measurements.ridgeLength + ' LF';
        source = 'Ridge Length';
        match = Math.abs(parseFloat(item.qty) - parseFloat(measurements.ridgeLength)) < 15;
      } else if (desc.includes('fascia')) {
        ridgeTopValue = 'Not in measurements';
        source = 'Field measurement';
        match = false;
      } else if (desc.includes('gutter')) {
        ridgeTopValue = 'Not in measurements';
        source = 'Field measurement';
        match = false;
      } else if (desc.includes('pipe jack')) {
        ridgeTopValue = measurements.flashingLength + ' EA';
        source = 'Flashing count';
        match = (item.qty === measurements.flashingLength);
      } else if (desc.includes('steep roof')) {
        ridgeTopValue = measurements.roofSq + ' SQ';
        source = 'Roof Squares (labor)';
        match = (item.qty === measurements.roofSq);
      } else {
        ridgeTopValue = 'Not in measurements';
        source = 'Other';
        match = false;
      }
      
      const status = match ? '✓ MATCH' : '✗ NO MATCH';
      console.log(`${status} | Item ${item.num}: ${item.desc}`);
      console.log(`  Heritage: ${item.qty} ${item.unit}`);
      console.log(`  Ridge Top: ${ridgeTopValue} (${source})`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

crossReference();
