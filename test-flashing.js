const parser = require('./pdf-parser');
const calculator = require('./calculator');

async function test() {
  try {
    const pdfPath = 'C:\\Users\\power\\.openclaw\\media\\inbound\\file_33---6fe0527b-a6cc-407b-ac45-3fc42e6bec97.pdf';
    const rawMeasurements = await parser.parseRidgeTopPDF(pdfPath);
    
    console.log('\n=== RAW MEASUREMENTS FROM PDF ===');
    console.log('Flashing length:', rawMeasurements.flashing_length);
    console.log('Step flashing:', rawMeasurements.step_flashing);
    
    console.log('\n=== PARSED MEASUREMENTS ===');
    const measurements = calculator.parseMeasurements(rawMeasurements);
    console.log('flashingLength:', measurements.flashingLength);
    console.log('stepFlashing:', measurements.stepFlashing);
    
    console.log('\n=== CALCULATED MATERIALS ===');
    const materials = calculator.calculateMaterials(measurements, 'inland');
    const lFlashing = materials.find(m => m.name.includes('L Flashing'));
    const stepFlashing = materials.find(m => m.name.includes('Step Flashing'));
    
    console.log('L Flashing:', lFlashing ? `${lFlashing.quantity} ${lFlashing.unit}` : 'NOT FOUND');
    console.log('Step Flashing:', stepFlashing ? `${stepFlashing.quantity} ${stepFlashing.unit}` : 'NOT FOUND');
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
