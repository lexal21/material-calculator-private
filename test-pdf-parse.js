const parser = require('./pdf-parser');

// Test with the Phillip Green PDF Austin sent
async function test() {
  try {
    const pdfPath = 'C:\\Users\\power\\.openclaw\\media\\inbound\\file_33---6fe0527b-a6cc-407b-ac45-3fc42e6bec97.pdf';
    const result = await parser.parseRidgeTopPDF(pdfPath);
    
    console.log('\n=== PITCH DATA ===');
    console.log('Slopes found:', result.pitch_data.slopes.length);
    console.log('\nFirst 5 slopes:');
    result.pitch_data.slopes.slice(0, 5).forEach(s => {
      console.log(`  ${s.face}: ${s.sqFt} sqft, ${s.squares} sq, pitch ${s.pitch}/12`);
    });
    
    console.log('\n=== TOTALS ===');
    console.log('8-9.5 tier:', result.pitch_data.tier_8_9);
    console.log('10-11.5 tier:', result.pitch_data.tier_10_11);
    console.log('12+ tier:', result.pitch_data.tier_12_plus);
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
