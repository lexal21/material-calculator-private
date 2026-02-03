const pdfParser = require('./pdf-parser-v2');

async function debug() {
  const result = await pdfParser.extractMeasurements('../samples/measurements/ahl-ridgetop.pdf');
  console.log('=== RAW TEXT ===');
  console.log(result.rawText);
  console.log('\\n=== EXTRACTED MEASUREMENTS ===');
  console.log(JSON.stringify(result.measurements, null, 2));
}

debug().catch(console.error);
