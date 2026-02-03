#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const pdfParser = require('./pdf-parser-v2');
const calculator = require('./calculator');

async function main() {
  const pdfPath = process.argv[2];
  
  if (!pdfPath) {
    console.error('Usage: node index.js <path-to-ridgetop-pdf>');
    process.exit(1);
  }
  
  if (!fs.existsSync(pdfPath)) {
    console.error(`File not found: ${pdfPath}`);
    process.exit(1);
  }
  
  console.log(`Processing: ${pdfPath}\\n`);
  
  try {
    // Extract measurements from PDF
    const { measurements: rawData, jobInfo } = await pdfParser.extractMeasurements(pdfPath);
    
    // Parse and calculate
    const measurements = calculator.parseMeasurements(rawData);
    const materials = calculator.calculateMaterials(measurements);
    
    // Generate output
    const output = calculator.formatOutput(materials, jobInfo);
    
    console.log(output);
    
    // Optionally save to file
    const outputPath = pdfPath.replace('.pdf', '_materials.txt');
    fs.writeFileSync(outputPath, output);
    console.log(`\\nSaved to: ${outputPath}`);
    
  } catch (error) {
    console.error('Error processing PDF:', error.message);
    process.exit(1);
  }
}

main();
