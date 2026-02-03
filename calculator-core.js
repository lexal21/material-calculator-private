// Material pricing
const MATERIALS = {
  shingles: {
    name: 'Landmark PRO Shingles',
    unit: 'Bundle',
    price: 35
  },
  drip_edge: {
    name: 'Drip Edge (1-1/2 X 3-3/4")',
    unit: 'Piece',
    price: 9.25
  },
  ridge_vent: {
    name: 'Ridge Vent (12" / 4 ft)',
    unit: 'Piece',
    price: 9
  }
};

function calculateShingles(totalSquares, hipLength) {
  const baseBundles = totalSquares * 3;
  const wasteMultiplier = hipLength > 100 ? 1.15 : 1.10;
  return Math.ceil(baseBundles * wasteMultiplier);
}

function calculateDripEdge(rakeLength, eaveLength) {
  const totalPerimeter = rakeLength + eaveLength;
  const pieces = Math.ceil(totalPerimeter / 10);
  return pieces + 3;
}

function calculateRidgeVent(ridgeLength, ridgeCount) {
  if (ridgeLength === 0) return 0;
  const adjusted = ridgeLength - (ridgeCount * 3);
  return Math.ceil(adjusted / 4);
}

function calculateMaterials(measurements, shingleColor = 'Standard') {
  const shingleQty = calculateShingles(measurements.roofSquares, measurements.hipLength);
  const dripEdgeQty = calculateDripEdge(measurements.rakeLength, measurements.eaveLength);
  const ridgeVentQty = calculateRidgeVent(measurements.ridgeLength, measurements.ridgeCount);

  const materials = [];
  
  if (shingleQty > 0) {
    materials.push({
      name: `${MATERIALS.shingles.name} (${shingleColor})`,
      quantity: shingleQty,
      unit: MATERIALS.shingles.unit,
      unitPrice: MATERIALS.shingles.price,
      total: shingleQty * MATERIALS.shingles.price
    });
  }

  if (dripEdgeQty > 0) {
    materials.push({
      name: MATERIALS.drip_edge.name,
      quantity: dripEdgeQty,
      unit: MATERIALS.drip_edge.unit,
      unitPrice: MATERIALS.drip_edge.price,
      total: dripEdgeQty * MATERIALS.drip_edge.price
    });
  }

  if (ridgeVentQty > 0) {
    materials.push({
      name: MATERIALS.ridge_vent.name,
      quantity: ridgeVentQty,
      unit: MATERIALS.ridge_vent.unit,
      unitPrice: MATERIALS.ridge_vent.price,
      total: ridgeVentQty * MATERIALS.ridge_vent.price
    });
  }

  return materials;
}

// Export for Node.js (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateShingles,
    calculateDripEdge,
    calculateRidgeVent,
    calculateMaterials
  };
}
