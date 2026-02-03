const calculator = require('./calculator');

console.log('=== Testing Material Calculator ===\\n');

// Test Case 1: Ahl job
console.log('TEST 1: Ahl Job');
const ahlData = {
  roof_sq: '22.58',
  hip_length: '128.07',
  rake_edge_length: '52.89',
  eave_edge_length: '189.56',
  ridge_length: '29',
  valley_length: '56.95',
  ridge_count: '1' // Assuming 1 ridge
};

const ahlMeasurements = calculator.parseMeasurements(ahlData);
console.log('Measurements:', ahlMeasurements);

const ahlMaterials = calculator.calculateMaterials(ahlMeasurements);
console.log('\\nCalculated Materials:');
ahlMaterials.forEach(m => {
  console.log(`- ${m.name}: ${m.quantity} ${m.unit} @ $${m.unitPrice} = $${m.total}`);
});

const ahlOutput = calculator.formatOutput(ahlMaterials, {
  customer: 'WILLIAM AHL',
  address: '239 Maywood Drive, Moncks Corner, SC 29461',
  date: 'MAR 24, 2025'
});
console.log('\\n' + ahlOutput);

// Test Case 2: Alewine job
console.log('\\n\\n=== TEST 2: Alewine Job ===');
const alewineData = {
  roof_sq: '23.32',
  hip_length: '0',
  rake_edge_length: '131.7',
  eave_edge_length: '92.92',
  ridge_length: '90.48',
  valley_length: '70.06',
  ridge_count: '4' // Based on formula example
};

const alewineMeasurements = calculator.parseMeasurements(alewineData);
console.log('Measurements:', alewineMeasurements);

const alewineMaterials = calculator.calculateMaterials(alewineMeasurements);
console.log('\\nCalculated Materials:');
alewineMaterials.forEach(m => {
  console.log(`- ${m.name}: ${m.quantity} ${m.unit} @ $${m.unitPrice} = $${m.total}`);
});

const alewineOutput = calculator.formatOutput(alewineMaterials, {
  customer: 'JOHNIE ALEWINE',
  address: '109 Garden Trail Lane, Lexington, SC 29072',
  date: 'APR 01, 2025'
});
console.log('\\n' + alewineOutput);

// Compare with actual orders
console.log('\\n\\n=== COMPARISON WITH ACTUAL ORDERS ===');
console.log('\\nAhl (Expected: 75 bundles, 28 drip edge, 5 ridge vent):');
console.log(`Calculated: ${ahlMaterials[0]?.quantity || 0} bundles, ${ahlMaterials[1]?.quantity || 0} drip edge, ${ahlMaterials[2]?.quantity || 0} ridge vent`);

console.log('\\nAlewine (Expected: 77 bundles, 26 drip edge, 21 ridge vent):');
console.log(`Calculated: ${alewineMaterials[0]?.quantity || 0} bundles, ${alewineMaterials[1]?.quantity || 0} drip edge, ${alewineMaterials[2]?.quantity || 0} ridge vent`);
