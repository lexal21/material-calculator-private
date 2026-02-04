// Test parsing the concatenated numbers

const testCases = [
  { str: "869.48.6910", expected: { sqft: 869.4, squares: 8.69, pitch: 10 } },
  { str: "192.961.9310", expected: { sqft: 192.96, squares: 1.93, pitch: 10 } },
  { str: "17.220.177.5", expected: { sqft: 17.22, squares: 0.17, pitch: 7.5 } },
  { str: "30.210.37.13", expected: { sqft: 30.21, squares: 0.3, pitch: 7.13 } },
];

testCases.forEach(({ str, expected }) => {
  console.log(`\nParsing: "${str}"`);
  console.log(`Expected: sqft=${expected.sqft}, squares=${expected.squares}, pitch=${expected.pitch}`);
  
  // Try to extract numbers using regex
  const numbers = str.match(/\d+\.?\d*/g);
  console.log(`Matched numbers:`, numbers);
});
