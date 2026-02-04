/**
 * Labor Calculator Module
 * Calculates labor costs based on Ridge Top PDF measurements
 */

/**
 * Calculate all labor items from measurements and materials
 * @param {object} measurements - Parsed measurements from PDF
 * @param {array} materials - Calculated materials array
 * @param {string} location - 'Greater Charleston' or 'Out of Area'
 * @returns {object} Labor items with quantities and totals
 */
function calculateLabor(measurements, materials, location = 'Out of Area') {
  const squares = parseFloat(measurements.roof_sq) || 0;
  const hipLength = parseFloat(measurements.hip_length) || 0;
  const pitchData = measurements.pitch_data || { tier_8_9: 0, tier_10_11: 0, tier_12_plus: 0 };
  
  // Determine base labor rate per square
  const baseRate = location === 'Greater Charleston' ? 80 : 90;
  
  // Calculate waste factor (10% or 15% based on hip length)
  const wasteMultiplier = hipLength > 100 ? 1.15 : 1.10;
  const squaresWithWaste = squares * wasteMultiplier;
  
  // Find material quantities
  const starterBundles = findMaterialQuantity(materials, 'Starter course');
  const hipRidgeBundles = findMaterialQuantity(materials, 'Hip & ridge cap');
  const plywoodSheets = findMaterialQuantity(materials, 'Plywood');
  const flashingLength = parseFloat(measurements.flashing_length) || 0;
  const stepFlashingLength = parseFloat(measurements.step_flashing) || 0;
  
  // Build labor items array
  const laborItems = [
    {
      name: 'Labor - Squares',
      quantity: squaresWithWaste,
      unit: 'SQ',
      unitPrice: baseRate,
      total: squaresWithWaste * baseRate,
      editable: false
    },
    {
      name: 'Starter per Bundle',
      quantity: starterBundles,
      unit: 'BD',
      unitPrice: 25.00,
      total: starterBundles * 25.00,
      editable: false
    },
    {
      name: 'Hip and Ridge Cap per Bundle',
      quantity: hipRidgeBundles,
      unit: 'BD',
      unitPrice: 25.00,
      total: hipRidgeBundles * 25.00,
      editable: false
    },
    {
      name: 'Steep Charge for 8-9.5/12 pitch',
      quantity: pitchData.tier_8_9,
      unit: 'SQ',
      unitPrice: 5.00,
      total: pitchData.tier_8_9 * 5.00,
      editable: true
    },
    {
      name: 'Steep Charge for 10-11.5/12 pitch',
      quantity: pitchData.tier_10_11,
      unit: 'SQ',
      unitPrice: 10.00,
      total: pitchData.tier_10_11 * 10.00,
      editable: true
    },
    {
      name: 'Steep Charge for 12/12 pitch or Greater',
      quantity: pitchData.tier_12_plus,
      unit: 'SQ',
      unitPrice: 20.00,
      total: pitchData.tier_12_plus * 20.00,
      editable: true
    },
    {
      name: 'Plywood Replacement',
      quantity: plywoodSheets,
      unit: 'SH',
      unitPrice: plywoodSheets > 10 ? 10.00 : 30.00,
      total: plywoodSheets * (plywoodSheets > 10 ? 10.00 : 30.00),
      editable: true
    },
    {
      name: 'Install Step Flashing per LF',
      quantity: stepFlashingLength,
      unit: 'LF',
      unitPrice: 2.00,
      total: stepFlashingLength * 2.00,
      editable: true
    },
    {
      name: 'Install L-Flashing per LF',
      quantity: flashingLength,
      unit: 'LF',
      unitPrice: 2.00,
      total: flashingLength * 2.00,
      editable: true
    },
    // Manual entry items (default to 0)
    {
      name: 'Flash Chimney',
      quantity: 0,
      unit: 'EA',
      unitPrice: 75.00,
      total: 0,
      editable: true,
      manualEntry: true
    },
    {
      name: 'Flash Brick Chimney',
      quantity: 0,
      unit: 'EA',
      unitPrice: 150.00,
      total: 0,
      editable: true,
      manualEntry: true
    },
    {
      name: 'Install Pan for Dead Valley (Brick)',
      quantity: 0,
      unit: 'EA',
      unitPrice: 150.00,
      total: 0,
      editable: true,
      manualEntry: true
    },
    {
      name: 'Install Pan for Dead Valley (Vinyl)',
      quantity: 0,
      unit: 'EA',
      unitPrice: 75.00,
      total: 0,
      editable: true,
      manualEntry: true
    },
    {
      name: 'Load roof by hand',
      quantity: 0,
      unit: 'SQ',
      unitPrice: 10.00,
      total: 0,
      editable: true,
      manualEntry: true
    },
    {
      name: 'Load roof greater than two storys',
      quantity: 0,
      unit: 'SQ',
      unitPrice: 20.00,
      total: 0,
      editable: true,
      manualEntry: true
    },
    {
      name: 'Tear Off Extra Layer',
      quantity: 0,
      unit: 'SQ',
      unitPrice: 5.00,
      total: 0,
      editable: true,
      manualEntry: true
    },
    {
      name: 'Reattach Vinyl Soffit (per 100 SF)',
      quantity: 0,
      unit: 'EA',
      unitPrice: 100.00,
      total: 0,
      editable: true,
      manualEntry: true
    },
    {
      name: 'Flat Roof Installation (Bitumen)',
      quantity: 0,
      unit: 'SQ',
      unitPrice: 100.00,
      total: 0,
      editable: true,
      manualEntry: true
    },
    {
      name: 'Metal Roof Installation (tear-off + install)',
      quantity: 0,
      unit: 'SQ',
      unitPrice: 300.00,
      total: 0,
      editable: true,
      manualEntry: true
    }
  ];
  
  // Calculate totals
  const subtotal = laborItems.reduce((sum, item) => sum + item.total, 0);
  const tax = 0; // Labor typically not taxed
  const grandTotal = subtotal + tax;
  
  return {
    location,
    baseRate,
    items: laborItems,
    subtotal,
    tax,
    grandTotal
  };
}

/**
 * Find a material's quantity from materials array
 * @param {array} materials - Materials array
 * @param {string} name - Material name to search for
 * @returns {number} Quantity or 0 if not found
 */
function findMaterialQuantity(materials, name) {
  const material = materials.find(m => m.name.toLowerCase().includes(name.toLowerCase()));
  return material ? material.quantity : 0;
}

module.exports = {
  calculateLabor,
  findMaterialQuantity
};
