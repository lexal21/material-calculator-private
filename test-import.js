// Test different import methods
console.log('Testing pdf-parse import methods...\n');

try {
  const method1 = require('pdf-parse');
  console.log('Method 1 (require pdf-parse):');
  console.log('Type:', typeof method1);
  console.log('Is function:', typeof method1 === 'function');
  console.log('Keys:', Object.keys(method1));
  console.log('');
} catch (err) {
  console.log('Method 1 failed:', err.message);
}

try {
  const method2 = require('pdf-parse').default;
  console.log('Method 2 (require pdf-parse.default):');
  console.log('Type:', typeof method2);
  console.log('');
} catch (err) {
  console.log('Method 2 failed:', err.message);
}
