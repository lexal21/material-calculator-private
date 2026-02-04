const fs = require('fs');
const path = require('path');

// Material pricing from Excel
const MATERIALS = {
  shingles: {
    name: 'Landmark PRO Shingles',
    unit: 'Bundle',
    price: 35
  },
  starter_course: {
    name: 'SwiftStart Starter Strip',
    unit: 'Bundle',
    price: 52
  },
  hip_ridge_cap: {
    name: 'Shadow Ridge Hip & Ridge Cap',
    unit: 'Bundle',
    price: 65.5
  },
  drip_edge: {
    name: 'Drip Edge (1-1/2 X 3-3/4")',
    unit: 'Piece',
    price: 9.25
  },
  ice_water_shield: {
    name: 'Ice & Water Shield',
    unit: 'Roll',
    price: 69
  },
  roofrunner: {
    name: 'RoofRunner Synthetic Underlayment',
    unit: 'Roll',
    price: 85.75
  },
  ridge_vent: {
    name: 'Ridge Vent (12" / 4 ft)',
    unit: 'Piece',
    price: 9
  },
  plywood: {
    name: '7/16 OSB Plywood',
    unit: 'Sheet',
    price: 15.99
  },
  roofing_nails: {
    name: '1-1/4" Roofing Nails',
    unit: 'Box',
    price: 39.99
  },
  button_caps: {
    name: 'Button Caps',
    unit: 'Box',
    price: 19.50
  },
  l_flashing: {
    name: 'L Flashing (Trim Coil)',
    unit: 'Roll',
    price: 134.50
  },
  step_flashing: {
    name: 'Step Flashing',
    unit: 'Bundle',
    price: 38.00
  },
  joint_sealant: {
    name: 'Joint Sealant 10z Black',
    unit: 'Tube',
    price: 7.29
  }
};

const TAX_RATE = 0.09; // 9%

/**
 * Calculate shingle bundles
 * @param {number} totalSquares - Total roof squares
 * @param {number} hipLength - Hip length in feet
 * @returns {number} Number of bundles
 */
function calculateShingles(totalSquares, hipLength) {
  const baseBundles = totalSquares * 3;
  const wasteMultiplier = hipLength > 100 ? 1.15 : 1.10;
  return Math.ceil(baseBundles * wasteMultiplier);
}

/**
 * Calculate starter course bundles
 * @param {number} rakeLength - Total rake edge length
 * @param {number} eaveLength - Total eave edge length
 * @returns {number} Number of bundles (116 LF each)
 */
function calculateStarterCourse(rakeLength, eaveLength) {
  const totalPerimeter = rakeLength + eaveLength;
  return Math.ceil(totalPerimeter / 116);
}

/**
 * Calculate hip and ridge cap bundles
 * @param {number} hipLength - Total hip length
 * @param {number} ridgeLength - Total ridge length
 * @returns {number} Number of bundles
 */
function calculateHipRidgeCap(hipLength, ridgeLength) {
  const totalLength = hipLength + ridgeLength;
  return Math.ceil(totalLength / 30);
}

/**
 * Calculate drip edge pieces
 * @param {number} rakeLength - Total rake edge length
 * @param {number} eaveLength - Total eave edge length
 * @returns {number} Number of pieces (10 LF each)
 */
function calculateDripEdge(rakeLength, eaveLength) {
  const totalPerimeter = rakeLength + eaveLength;
  const pieces = Math.ceil(totalPerimeter / 10);
  return pieces + 3; // Always add 3 extra
}

/**
 * Calculate ice and water shield rolls
 * @param {number} valleyLength - Total valley length
 * @returns {number} Number of rolls (63 LF each)
 */
function calculateIceWaterShield(valleyLength) {
  if (valleyLength === 0) return 0;
  return Math.ceil(valleyLength / 63);
}

/**
 * Calculate RoofRunner underlayment rolls
 * @param {number} totalSquares - Total roof squares
 * @param {string} location - 'coast' or 'inland' (Columbia/Lexington)
 * @returns {number} Number of rolls
 */
function calculateRoofRunner(totalSquares, location = 'inland') {
  const rollsPer10Squares = location === 'coast' ? 1.5 : 1;
  return Math.ceil((totalSquares / 10) * rollsPer10Squares);
}

/**
 * Calculate plywood sheets
 * @returns {number} Always 3 sheets per job
 */
function calculatePlywood() {
  return 3;
}

/**
 * Calculate roofing nails boxes
 * @param {number} totalSquares - Total roof squares
 * @returns {number} Number of boxes (1 per 16 squares)
 */
function calculateRoofingNails(totalSquares) {
  return Math.ceil(totalSquares / 16);
}

/**
 * Calculate button caps bags
 * @param {number} totalSquares - Total roof squares
 * @returns {number} Number of bags (1 per 24 squares)
 */
function calculateButtonCaps(totalSquares) {
  return Math.ceil(totalSquares / 24);
}

/**
 * Calculate L Flashing (Trim Coil) rolls
 * @param {number} flashingLength - Total flashing length in feet
 * @returns {number} Number of rolls (100 LF each)
 */
function calculateLFlashing(flashingLength) {
  return Math.ceil(flashingLength / 100);
}

/**
 * Calculate Step Flashing bundles
 * @param {number} stepFlashingLength - Total step flashing length in feet
 * @returns {number} Number of bundles (40 LF each)
 */
function calculateStepFlashing(stepFlashingLength) {
  return Math.ceil(stepFlashingLength / 40);
}

/**
 * Calculate ridge vent pieces
 * @param {number} ridgeLength - Total ridge length
 * @param {number} ridgeCount - Number of ridges
 * @returns {number} Number of pieces
 */
function calculateRidgeVent(ridgeLength, ridgeCount) {
  if (ridgeLength === 0) return 0;
  const adjusted = ridgeLength - (ridgeCount * 3);
  return Math.ceil(adjusted / 4);
}

/**
 * Parse measurements from Ridge Top report data
 * @param {object} data - Extracted PDF data
 * @returns {object} Parsed measurements
 */
function parseMeasurements(data) {
  return {
    roofSquares: parseFloat(data.roof_sq) || 0,
    hipLength: parseFloat(data.hip_length) || 0,
    rakeLength: parseFloat(data.rake_edge_length) || 0,
    eaveLength: parseFloat(data.eave_edge_length) || 0,
    ridgeLength: parseFloat(data.ridge_length) || 0,
    valleyLength: parseFloat(data.valley_length) || 0,
    ridgeCount: parseInt(data.ridge_count) || 1 // Default to 1 if not specified
  };
}

/**
 * Calculate all materials
 * @param {object} measurements - Parsed measurements
 * @param {string} location - 'coast' or 'inland' for RoofRunner calculation
 * @returns {array} Material list with quantities and prices
 */
function calculateMaterials(measurements, location = 'inland') {
  const materials = [];
  
  // Shingles
  const shingleQty = calculateShingles(measurements.roofSquares, measurements.hipLength);
  if (shingleQty > 0) {
    materials.push({
      name: MATERIALS.shingles.name,
      quantity: shingleQty,
      unit: MATERIALS.shingles.unit,
      unitPrice: MATERIALS.shingles.price,
      total: shingleQty * MATERIALS.shingles.price
    });
  }

  // Starter Course
  const starterQty = calculateStarterCourse(measurements.rakeLength, measurements.eaveLength);
  if (starterQty > 0) {
    materials.push({
      name: MATERIALS.starter_course.name,
      quantity: starterQty,
      unit: MATERIALS.starter_course.unit,
      unitPrice: MATERIALS.starter_course.price,
      total: starterQty * MATERIALS.starter_course.price
    });
  }

  // Hip & Ridge Cap
  const hipRidgeCapQty = calculateHipRidgeCap(measurements.hipLength, measurements.ridgeLength);
  if (hipRidgeCapQty > 0) {
    materials.push({
      name: MATERIALS.hip_ridge_cap.name,
      quantity: hipRidgeCapQty,
      unit: MATERIALS.hip_ridge_cap.unit,
      unitPrice: MATERIALS.hip_ridge_cap.price,
      total: hipRidgeCapQty * MATERIALS.hip_ridge_cap.price
    });
  }

  // Drip Edge
  const dripEdgeQty = calculateDripEdge(measurements.rakeLength, measurements.eaveLength);
  if (dripEdgeQty > 0) {
    materials.push({
      name: MATERIALS.drip_edge.name,
      quantity: dripEdgeQty,
      unit: MATERIALS.drip_edge.unit,
      unitPrice: MATERIALS.drip_edge.price,
      total: dripEdgeQty * MATERIALS.drip_edge.price
    });
  }

  // Ice & Water Shield
  const iceWaterQty = calculateIceWaterShield(measurements.valleyLength);
  if (iceWaterQty > 0) {
    materials.push({
      name: MATERIALS.ice_water_shield.name,
      quantity: iceWaterQty,
      unit: MATERIALS.ice_water_shield.unit,
      unitPrice: MATERIALS.ice_water_shield.price,
      total: iceWaterQty * MATERIALS.ice_water_shield.price
    });
  }

  // RoofRunner
  const roofRunnerQty = calculateRoofRunner(measurements.roofSquares, location);
  if (roofRunnerQty > 0) {
    materials.push({
      name: MATERIALS.roofrunner.name,
      quantity: roofRunnerQty,
      unit: MATERIALS.roofrunner.unit,
      unitPrice: MATERIALS.roofrunner.price,
      total: roofRunnerQty * MATERIALS.roofrunner.price
    });
  }

  // Ridge Vent
  const ridgeVentQty = calculateRidgeVent(measurements.ridgeLength, measurements.ridgeCount);
  if (ridgeVentQty > 0) {
    materials.push({
      name: MATERIALS.ridge_vent.name,
      quantity: ridgeVentQty,
      unit: MATERIALS.ridge_vent.unit,
      unitPrice: MATERIALS.ridge_vent.price,
      total: ridgeVentQty * MATERIALS.ridge_vent.price
    });
  }

  // Plywood
  const plywoodQty = calculatePlywood();
  materials.push({
    name: MATERIALS.plywood.name,
    quantity: plywoodQty,
    unit: MATERIALS.plywood.unit,
    unitPrice: MATERIALS.plywood.price,
    total: plywoodQty * MATERIALS.plywood.price
  });

  // Roofing Nails
  const nailsQty = calculateRoofingNails(measurements.roofSquares);
  if (nailsQty > 0) {
    materials.push({
      name: MATERIALS.roofing_nails.name,
      quantity: nailsQty,
      unit: MATERIALS.roofing_nails.unit,
      unitPrice: MATERIALS.roofing_nails.price,
      total: nailsQty * MATERIALS.roofing_nails.price
    });
  }

  // Button Caps
  const buttonCapsQty = calculateButtonCaps(measurements.roofSquares);
  if (buttonCapsQty > 0) {
    materials.push({
      name: MATERIALS.button_caps.name,
      quantity: buttonCapsQty,
      unit: MATERIALS.button_caps.unit,
      unitPrice: MATERIALS.button_caps.price,
      total: buttonCapsQty * MATERIALS.button_caps.price
    });
  }

  // L Flashing (Trim Coil) - calculated but set to 0, user decides if needed
  const lFlashingQty = measurements.flashingLength ? calculateLFlashing(measurements.flashingLength) : 0;
  materials.push({
    name: MATERIALS.l_flashing.name,
    quantity: 0, // Set to 0 by default, user can edit
    unit: MATERIALS.l_flashing.unit,
    unitPrice: MATERIALS.l_flashing.price,
    total: 0
  });

  // Step Flashing - calculated but set to 0, user decides if needed
  const stepFlashingQty = measurements.stepFlashing ? calculateStepFlashing(measurements.stepFlashing) : 0;
  materials.push({
    name: MATERIALS.step_flashing.name,
    quantity: 0, // Set to 0 by default, user can edit
    unit: MATERIALS.step_flashing.unit,
    unitPrice: MATERIALS.step_flashing.price,
    total: 0
  });

  // Joint Sealant - set to 0, user decides quantity needed
  materials.push({
    name: MATERIALS.joint_sealant.name,
    quantity: 0,
    unit: MATERIALS.joint_sealant.unit,
    unitPrice: MATERIALS.joint_sealant.price,
    total: 0
  });

  return materials;
}

/**
 * Format material list for output
 * @param {array} materials - Calculated materials
 * @param {object} jobInfo - Job information
 * @returns {string} Formatted output
 */
function formatOutput(materials, jobInfo = {}) {
  let output = '=== MATERIAL ORDER ===\\n\\n';
  
  if (jobInfo.customer) output += `Customer: ${jobInfo.customer}\\n`;
  if (jobInfo.address) output += `Address: ${jobInfo.address}\\n`;
  if (jobInfo.date) output += `Date: ${jobInfo.date}\\n`;
  output += '\\n';

  let subtotal = 0;

  materials.forEach(item => {
    output += `${item.name}\\n`;
    output += `  Quantity: ${item.quantity} ${item.unit}\\n`;
    output += `  Unit Price: $${item.unitPrice.toFixed(2)}\\n`;
    output += `  Total: $${item.total.toFixed(2)}\\n\\n`;
    subtotal += item.total;
  });

  const tax = subtotal * TAX_RATE;
  const grandTotal = subtotal + tax;

  output += `SUBTOTAL: $${subtotal.toFixed(2)}\\n`;
  output += `TAX (9%): $${tax.toFixed(2)}\\n`;
  output += `GRAND TOTAL: $${grandTotal.toFixed(2)}\\n`;

  return output;
}

module.exports = {
  calculateShingles,
  calculateStarterCourse,
  calculateHipRidgeCap,
  calculateDripEdge,
  calculateIceWaterShield,
  calculateRoofRunner,
  calculateRidgeVent,
  calculatePlywood,
  calculateRoofingNails,
  calculateButtonCaps,
  parseMeasurements,
  calculateMaterials,
  formatOutput
};
