const parser = require('./pdf-parser.js');

parser.parseRidgeTopPDF('C:\\Users\\power\\.openclaw\\media\\inbound\\file_21---98ff6043-abd7-4988-afbe-07fff0a2c33d.pdf').then(data => {
  console.log('Total slopes found:', data.pitch_data.slopes.length);
  console.log('\nFirst 5 slopes:');
  data.pitch_data.slopes.slice(0, 5).forEach(s => 
    console.log(`  ${s.face}: ${s.sqFt} sqft, ${s.squares} sq, ${s.pitch}/12 pitch`)
  );
  
  console.log('\nSteep Charge Tiers:');
  console.log('  8-9/12:', data.pitch_data.tier_8_9.toFixed(2), 'squares @ $5/sq = $' + (data.pitch_data.tier_8_9 * 5).toFixed(2));
  console.log('  10-11/12:', data.pitch_data.tier_10_11.toFixed(2), 'squares @ $10/sq = $' + (data.pitch_data.tier_10_11 * 10).toFixed(2));
  console.log('  12+/12:', data.pitch_data.tier_12_plus.toFixed(2), 'squares @ $20/sq = $' + (data.pitch_data.tier_12_plus * 20).toFixed(2));
  console.log('\nTotal steep charges: $' + ((data.pitch_data.tier_8_9 * 5) + (data.pitch_data.tier_10_11 * 10) + (data.pitch_data.tier_12_plus * 20)).toFixed(2));
});
