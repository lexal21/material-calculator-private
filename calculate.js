#!/usr/bin/env node

const parser = require('./pdf-parser');
const path = require('path');

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node calculate.js <path-to-ridgetop-pdf>');
    console.log('');
    console.log('Example:');
    console.log('  node calculate.js ../samples/measurements/ahl-ridgetop.pdf');
    process.exit(1);
  }
  
  const pdfPath = args[0];
  
  try {
    console.log('Processing:', pdfPath);
    console.log('');
    
    const result = await parser.parseAndCalculate(pdfPath);
    
    console.log('=== EXTRACTED MEASUREMENTS ===');
    console.log(`Address: ${result.raw.address}`);
    console.log(`Order #: ${result.raw.order_number}`);
    console.log(`Roof Squares: ${result.measurements.roofSquares}`);
    console.log(`Hip Length: ${result.measurements.hipLength} ft`);
    console.log(`Ridge Length: ${result.measurements.ridgeLength} ft`);
    console.log(`Rake Length: ${result.measurements.rakeLength} ft`);
    console.log(`Eave Length: ${result.measurements.eaveLength} ft`);
    console.log(`Ridge Count: ${result.measurements.ridgeCount} (estimated)`);
    console.log('');
    
    console.log(result.output);
    
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
