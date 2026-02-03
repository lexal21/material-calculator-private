const fs = require('fs');
const PDFParser = require('pdf2json');

/**
 * Extract measurements from Ridge Top PDF
 * @param {string} pdfPath - Path to PDF file
 * @returns {Promise<object>} Extracted measurements
 */
function extractMeasurements(pdfPath) {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();
    
    pdfParser.on('pdfParser_dataError', errData => reject(errData.parserError));
    pdfParser.on('pdfParser_dataReady', pdfData => {
      try {
        // Extract text from PDF
        const text = pdfParser.getRawTextContent();
        
        // Extract measurements using regex patterns
        const measurements = {
          roof_sq: extractValue(text, /Roof sq\\s+([\\d.]+)/i),
          hip_length: extractValue(text, /Hip length\\s+([\\d.]+)/i),
          ridge_length: extractValue(text, /Ridge length\\s+([\\d.]+)/i),
          rake_edge_length: extractValue(text, /Rake edge length\\s+([\\d.]+)/i),
          valley_length: extractValue(text, /Valley length\\s+([\\d.]+)/i),
          eave_edge_length: extractValue(text, /Eave edge length\\s+([\\d.]+)/i),
          flashing_length: extractValue(text, /Flashing length\\s+([\\d.]+)/i),
          step_flashing: extractValue(text, /Step flashing\\s+([\\d.]+)/i)
        };
        
        // Estimate ridge count
        measurements.ridge_count = estimateRidgeCount(text);
        
        // Extract address
        const addressMatch = text.match(/([\\d]+[^\\n]+ [A-Z]{2} \\d{5})/);
        const address = addressMatch ? addressMatch[1].trim() : 'Address not found';
        
        resolve({
          measurements,
          jobInfo: {
            address,
            date: new Date().toISOString().split('T')[0]
          },
          rawText: text
        });
      } catch (error) {
        reject(error);
      }
    });
    
    pdfParser.loadPDF(pdfPath);
  });
}

/**
 * Extract a numeric value from text using regex
 */
function extractValue(text, pattern) {
  const match = text.match(pattern);
  return match ? match[1] : '0';
}

/**
 * Estimate number of ridges
 */
function estimateRidgeCount(text) {
  // For now, default to 1
  // Can be improved by analyzing roof complexity
  return 1;
}

module.exports = {
  extractMeasurements
};
