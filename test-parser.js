const parser = require('./pdf-parser');
const path = require('path');

async function testParser() {
  console.log('=== Testing PDF Parser ===\n');
  
  // Test Ahl PDF
  console.log('TEST 1: Ahl Ridge Top Report');
  const ahlPath = path.join('..', 'samples', 'measurements', 'ahl-ridgetop.pdf');
  
  try {
    const ahlResult = await parser.parseAndCalculate(ahlPath);
    
    console.log('\nExtracted Measurements:');
    console.log(JSON.stringify(ahlResult.raw, null, 2));
    
    console.log('\nParsed Measurements:');
    console.log(JSON.stringify(ahlResult.measurements, null, 2));
    
    console.log('\nCalculated Materials:');
    ahlResult.materials.forEach(m => {
      console.log(`- ${m.name}: ${m.quantity} ${m.unit} @ $${m.unitPrice} = $${m.total}`);
    });
    
    console.log('\n' + ahlResult.output);
  } catch (err) {
    console.error('Error parsing Ahl PDF:', err.message);
  }
  
  // Test Alewine PDF
  console.log('\n\n=== TEST 2: Alewine Ridge Top Report ===');
  const alewinePath = path.join('..', 'samples', 'measurements', 'alewine-ridgetop.pdf');
  
  try {
    const alewineResult = await parser.parseAndCalculate(alewinePath);
    
    console.log('\nExtracted Measurements:');
    console.log(JSON.stringify(alewineResult.raw, null, 2));
    
    console.log('\nParsed Measurements:');
    console.log(JSON.stringify(alewineResult.measurements, null, 2));
    
    console.log('\nCalculated Materials:');
    alewineResult.materials.forEach(m => {
      console.log(`- ${m.name}: ${m.quantity} ${m.unit} @ $${m.unitPrice} = $${m.total}`);
    });
    
    console.log('\n' + alewineResult.output);
  } catch (err) {
    console.error('Error parsing Alewine PDF:', err.message);
  }
}

testParser().catch(console.error);
