// New simplified extractPitchData function

function extractPitchData(text) {
  const pitchData = {
    slopes: [],
    tier_8_9: 0,
    tier_10_11: 0,
    tier_12_plus: 0
  };
  
  const lines = text.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    const tableMatch = line.match(/^(Main Level|Upper Level|Lower Level)F(\d{1,2})([\d.]+)$/i);
    
    if (tableMatch) {
      const level = tableMatch[1];
      const faceNum = tableMatch[2];
      const numbersStr = tableMatch[3];
      
      // Use regex to extract all numbers (with or without decimals)
      // This matches patterns like: 869.4, 8.69, 10  or  17.22, 0.17, 7.5
      const matches = numbersStr.match(/\d+\.\d+|\d+/g);
      
      if (matches && matches.length >= 3) {
        const sqFt = parseFloat(matches[0]);
        const squares = parseFloat(matches[1]);
        const pitch = parseFloat(matches[2]);
        
        if (!isNaN(pitch) && !isNaN(squares) && !isNaN(sqFt)) {
          pitchData.slopes.push({ face: `F${faceNum}`, level, sqFt, squares, pitch });
          
          if (pitch >= 8 && pitch < 10) {
            pitchData.tier_8_9 += squares;
          } else if (pitch >= 10 && pitch < 12) {
            pitchData.tier_10_11 += squares;
          } else if (pitch >= 12) {
            pitchData.tier_12_plus += squares;
          }
        }
      }
    }
  }
  
  pitchData.tier_8_9 = Math.round(pitchData.tier_8_9 * 100) / 100;
  pitchData.tier_10_11 = Math.round(pitchData.tier_10_11 * 100) / 100;
  pitchData.tier_12_plus = Math.round(pitchData.tier_12_plus * 100) / 100;
  
  return pitchData;
}

// Test it
const testStr = "Main LevelF1869.48.6910";
const matches = testStr.match(/F(\d{1,2})([\d.]+)$/);
if (matches) {
  const numbersStr = matches[2];
  const nums = numbersStr.match(/\d+\.\d+|\d+/g);
  console.log('Numbers found:', nums);
}
