// ============================================
// MANUFACTURER DATABASE
// Version: 2026-02-13
// Complete shingle systems by manufacturer
// ============================================

console.log('[MANUFACTURERS] Database loaded');

window.manufacturerDatabase = {

  // ==========================================
  // CERTAINTEED
  // ==========================================
  certainteed: {
    name: "CertainTeed",
    shingleLines: {
      landmark: {
        name: "Landmark",
        type: "Architectural",
        windRating: 110,
        warranty: "Lifetime",
        pricePerBundle: 35.00,
        bundlesPerSquare: 3,
        colors: [
          "Burnt Sienna", "Charcoal Black", "Cobblestone Gray", "Colonial Slate",
          "Driftwood", "Georgetown Gray", "Heather Blend", "Moire Black",
          "Pewter", "Resawn Shake", "Shenandoah", "Silver Birch", "Weathered Wood"
        ],
        systemComponents: {
          starter: { name: "SwiftStart Starter Strip", unit: "Bundle", coverage: 120, pricePerUnit: 52.00 },
          hipRidge: { name: "Shadow Ridge Hip & Ridge", unit: "Bundle", coverage: 20, pricePerUnit: 65.50 },
          underlayment: { name: "DiamondDeck Synthetic Underlayment", unit: "Roll", coverage: 10, pricePerUnit: 85.75 },
          iceWater: { name: "WinterGuard Ice & Water Shield", unit: "Roll", coverage: 2, pricePerUnit: 69.00 },
          ridgeVent: { name: "Ridge Vent 4ft", unit: "Piece", coverage: 4, pricePerUnit: 9.00 },
          dripEdge: { name: "Drip Edge 1-1/2 x 3-3/4", unit: "Piece", coverage: 10, pricePerUnit: 9.25 },
          nails: { name: "1-1/4\" Roofing Nails", unit: "Box", coverage: 25, pricePerUnit: 39.99 },
          sealant: { name: "Roof Sealant 10oz", unit: "Tube", coverage: 0, pricePerUnit: 7.29, qtyPerJob: 2 }
        }
      },
      landmarkPro: {
        name: "Landmark PRO",
        type: "Premium Architectural",
        windRating: 110,
        warranty: "Lifetime",
        pricePerBundle: 42.00,
        bundlesPerSquare: 3,
        colors: [
          "Burnt Sienna", "Charcoal Black", "Coastal Blue", "Cobblestone Gray",
          "Colonial Slate", "Driftwood", "Espresso", "Georgetown Gray",
          "Heather Blend", "Moire Black", "Mojave Tan", "Pewter", "Red Oak",
          "Resawn Shake", "Shenandoah", "Silver Birch", "Weathered Wood"
        ],
        systemComponents: {
          starter: { name: "SwiftStart Starter Strip", unit: "Bundle", coverage: 120, pricePerUnit: 52.00 },
          hipRidge: { name: "Shadow Ridge Hip & Ridge", unit: "Bundle", coverage: 20, pricePerUnit: 65.50 },
          underlayment: { name: "DiamondDeck Synthetic Underlayment", unit: "Roll", coverage: 10, pricePerUnit: 85.75 },
          iceWater: { name: "WinterGuard Ice & Water Shield", unit: "Roll", coverage: 2, pricePerUnit: 69.00 },
          ridgeVent: { name: "Ridge Vent 4ft", unit: "Piece", coverage: 4, pricePerUnit: 9.00 },
          dripEdge: { name: "Drip Edge 1-1/2 x 3-3/4", unit: "Piece", coverage: 10, pricePerUnit: 9.25 },
          nails: { name: "1-1/4\" Roofing Nails", unit: "Box", coverage: 25, pricePerUnit: 39.99 },
          sealant: { name: "Roof Sealant 10oz", unit: "Tube", coverage: 0, pricePerUnit: 7.29, qtyPerJob: 2 }
        }
      },
      landmarkPremium: {
        name: "Landmark Premium",
        type: "Ultra Premium Architectural",
        windRating: 110,
        warranty: "Lifetime",
        pricePerBundle: 48.00,
        bundlesPerSquare: 3,
        colors: [
          "Burnt Sienna", "Charcoal Black", "Cobblestone Gray", "Colonial Slate",
          "Driftwood", "Georgetown Gray", "Heather Blend", "Max Def Moire Black",
          "Max Def Pewter", "Resawn Shake", "Shenandoah", "Weathered Wood"
        ],
        systemComponents: {
          starter: { name: "SwiftStart Starter Strip", unit: "Bundle", coverage: 120, pricePerUnit: 52.00 },
          hipRidge: { name: "Shadow Ridge Hip & Ridge", unit: "Bundle", coverage: 20, pricePerUnit: 65.50 },
          underlayment: { name: "DiamondDeck Synthetic Underlayment", unit: "Roll", coverage: 10, pricePerUnit: 85.75 },
          iceWater: { name: "WinterGuard Ice & Water Shield", unit: "Roll", coverage: 2, pricePerUnit: 69.00 },
          ridgeVent: { name: "Ridge Vent 4ft", unit: "Piece", coverage: 4, pricePerUnit: 9.00 },
          dripEdge: { name: "Drip Edge 1-1/2 x 3-3/4", unit: "Piece", coverage: 10, pricePerUnit: 9.25 },
          nails: { name: "1-1/4\" Roofing Nails", unit: "Box", coverage: 25, pricePerUnit: 39.99 },
          sealant: { name: "Roof Sealant 10oz", unit: "Tube", coverage: 0, pricePerUnit: 7.29, qtyPerJob: 2 }
        }
      },
      grandManor: {
        name: "Grand Manor",
        type: "Luxury",
        windRating: 110,
        warranty: "Lifetime",
        pricePerBundle: 85.00,
        bundlesPerSquare: 4,
        colors: [
          "Brownstone", "Colonial Slate", "Gatehouse Slate", "Georgian Brick",
          "Sherwood Forest", "Stonegate Gray", "Tudor Brown", "Weathered Wood"
        ],
        systemComponents: {
          starter: { name: "SwiftStart Starter Strip", unit: "Bundle", coverage: 120, pricePerUnit: 52.00 },
          hipRidge: { name: "Cedar Crest Hip & Ridge", unit: "Bundle", coverage: 16, pricePerUnit: 95.00 },
          underlayment: { name: "DiamondDeck Synthetic Underlayment", unit: "Roll", coverage: 10, pricePerUnit: 85.75 },
          iceWater: { name: "WinterGuard Ice & Water Shield", unit: "Roll", coverage: 2, pricePerUnit: 69.00 },
          ridgeVent: { name: "Ridge Vent 4ft", unit: "Piece", coverage: 4, pricePerUnit: 9.00 },
          dripEdge: { name: "Drip Edge 1-1/2 x 3-3/4", unit: "Piece", coverage: 10, pricePerUnit: 9.25 },
          nails: { name: "1-1/4\" Roofing Nails", unit: "Box", coverage: 20, pricePerUnit: 39.99 },
          sealant: { name: "Roof Sealant 10oz", unit: "Tube", coverage: 0, pricePerUnit: 7.29, qtyPerJob: 2 }
        }
      }
    }
  },

  // ==========================================
  // GAF
  // ==========================================
  gaf: {
    name: "GAF",
    shingleLines: {
      timberlineHDZ: {
        name: "Timberline HDZ",
        type: "Architectural",
        windRating: 130,
        warranty: "Lifetime",
        pricePerBundle: 36.00,
        bundlesPerSquare: 3,
        colors: [
          "Barkwood", "Charcoal", "Hickory", "Hunter Green", "Mission Brown",
          "Pewter Gray", "Shakewood", "Slate", "Weathered Wood", "Birchwood",
          "White", "Copper Canyon", "Golden Amber"
        ],
        systemComponents: {
          starter: { name: "Pro-Start Starter Strip", unit: "Bundle", coverage: 120, pricePerUnit: 48.00 },
          hipRidge: { name: "Seal-A-Ridge Hip & Ridge", unit: "Bundle", coverage: 25, pricePerUnit: 62.00 },
          underlayment: { name: "FeltBuster Synthetic Underlayment", unit: "Roll", coverage: 10, pricePerUnit: 82.00 },
          iceWater: { name: "StormGuard Ice & Water Shield", unit: "Roll", coverage: 2, pricePerUnit: 72.00 },
          ridgeVent: { name: "Cobra Ridge Vent", unit: "Piece", coverage: 4, pricePerUnit: 11.00 },
          dripEdge: { name: "Drip Edge", unit: "Piece", coverage: 10, pricePerUnit: 8.50 },
          nails: { name: "1-1/4\" Roofing Nails", unit: "Box", coverage: 25, pricePerUnit: 39.99 },
          sealant: { name: "Roof Sealant 10oz", unit: "Tube", coverage: 0, pricePerUnit: 7.29, qtyPerJob: 2 }
        }
      },
      timberlineUHDZ: {
        name: "Timberline UHDZ",
        type: "Ultra Premium Architectural",
        windRating: 130,
        warranty: "Lifetime",
        pricePerBundle: 52.00,
        bundlesPerSquare: 3,
        colors: [
          "Barkwood", "Charcoal", "Pewter Gray", "Shakewood", "Slate", "Weathered Wood"
        ],
        systemComponents: {
          starter: { name: "Pro-Start Starter Strip", unit: "Bundle", coverage: 120, pricePerUnit: 48.00 },
          hipRidge: { name: "TimberTex Premium Ridge", unit: "Bundle", coverage: 20, pricePerUnit: 78.00 },
          underlayment: { name: "Tiger Paw Premium Underlayment", unit: "Roll", coverage: 10, pricePerUnit: 95.00 },
          iceWater: { name: "StormGuard Ice & Water Shield", unit: "Roll", coverage: 2, pricePerUnit: 72.00 },
          ridgeVent: { name: "Cobra Ridge Vent", unit: "Piece", coverage: 4, pricePerUnit: 11.00 },
          dripEdge: { name: "Drip Edge", unit: "Piece", coverage: 10, pricePerUnit: 8.50 },
          nails: { name: "1-1/4\" Roofing Nails", unit: "Box", coverage: 25, pricePerUnit: 39.99 },
          sealant: { name: "Roof Sealant 10oz", unit: "Tube", coverage: 0, pricePerUnit: 7.29, qtyPerJob: 2 }
        }
      }
    }
  },

  // ==========================================
  // OWENS CORNING
  // ==========================================
  owensCorning: {
    name: "Owens Corning",
    shingleLines: {
      oakridge: {
        name: "Oakridge",
        type: "Entry Architectural",
        windRating: 110,
        warranty: "Lifetime",
        pricePerBundle: 32.00,
        bundlesPerSquare: 3,
        colors: [
          "Brownwood", "Chateau Green", "Desert Tan", "Driftwood", "Estate Gray",
          "Onyx Black", "Shasta White", "Sierra Gray", "Teak", "Twilight Black"
        ],
        systemComponents: {
          starter: { name: "Starter Strip Plus", unit: "Bundle", coverage: 105, pricePerUnit: 45.00 },
          hipRidge: { name: "DecoRidge Hip & Ridge", unit: "Bundle", coverage: 20, pricePerUnit: 58.00 },
          underlayment: { name: "Deck Defense Synthetic", unit: "Roll", coverage: 10, pricePerUnit: 78.00 },
          iceWater: { name: "WeatherLock Ice & Water", unit: "Roll", coverage: 2, pricePerUnit: 68.00 },
          ridgeVent: { name: "VentSure Ridge Vent", unit: "Piece", coverage: 4, pricePerUnit: 10.00 },
          dripEdge: { name: "Drip Edge", unit: "Piece", coverage: 10, pricePerUnit: 8.75 },
          nails: { name: "1-1/4\" Roofing Nails", unit: "Box", coverage: 25, pricePerUnit: 39.99 },
          sealant: { name: "Roof Sealant 10oz", unit: "Tube", coverage: 0, pricePerUnit: 7.29, qtyPerJob: 2 }
        }
      },
      duration: {
        name: "TruDefinition Duration",
        type: "Architectural",
        windRating: 130,
        warranty: "Lifetime",
        pricePerBundle: 38.00,
        bundlesPerSquare: 3,
        colors: [
          "Brownwood", "Chateau Green", "Driftwood", "Estate Gray", "Harbor Blue",
          "Onyx Black", "Quarry Gray", "Sand Dune", "Sedona Canyon", "Sierra Gray",
          "Summer Harvest", "Teak", "Terra Cotta", "Weathered Wood", "Williamsburg Gray"
        ],
        systemComponents: {
          starter: { name: "Starter Strip Plus", unit: "Bundle", coverage: 105, pricePerUnit: 45.00 },
          hipRidge: { name: "DecoRidge Hip & Ridge", unit: "Bundle", coverage: 20, pricePerUnit: 58.00 },
          underlayment: { name: "Deck Defense Synthetic", unit: "Roll", coverage: 10, pricePerUnit: 78.00 },
          iceWater: { name: "WeatherLock Ice & Water", unit: "Roll", coverage: 2, pricePerUnit: 68.00 },
          ridgeVent: { name: "VentSure Ridge Vent", unit: "Piece", coverage: 4, pricePerUnit: 10.00 },
          dripEdge: { name: "Drip Edge", unit: "Piece", coverage: 10, pricePerUnit: 8.75 },
          nails: { name: "1-1/4\" Roofing Nails", unit: "Box", coverage: 25, pricePerUnit: 39.99 },
          sealant: { name: "Roof Sealant 10oz", unit: "Tube", coverage: 0, pricePerUnit: 7.29, qtyPerJob: 2 }
        }
      }
    }
  },

  // ==========================================
  // IKO
  // ==========================================
  iko: {
    name: "IKO",
    shingleLines: {
      cambridge: {
        name: "Cambridge",
        type: "Architectural",
        windRating: 110,
        warranty: "Lifetime",
        pricePerBundle: 34.00,
        bundlesPerSquare: 3,
        colors: [
          "Charcoal Grey", "Driftwood", "Dual Black", "Dual Brown",
          "Dual Grey", "Harvard Slate", "Weatherwood"
        ],
        systemComponents: {
          starter: { name: "Leading Edge Plus Starter", unit: "Bundle", coverage: 120, pricePerUnit: 48.00 },
          hipRidge: { name: "Ultra HP Hip & Ridge", unit: "Bundle", coverage: 20, pricePerUnit: 60.00 },
          underlayment: { name: "RoofGard-Cool Grey Synthetic", unit: "Roll", coverage: 10, pricePerUnit: 80.00 },
          iceWater: { name: "ArmourGard Ice & Water", unit: "Roll", coverage: 2, pricePerUnit: 65.00 },
          ridgeVent: { name: "Ridge Vent", unit: "Piece", coverage: 4, pricePerUnit: 9.50 },
          dripEdge: { name: "Drip Edge", unit: "Piece", coverage: 10, pricePerUnit: 8.50 },
          nails: { name: "1-1/4\" Roofing Nails", unit: "Box", coverage: 25, pricePerUnit: 39.99 },
          sealant: { name: "Roof Sealant 10oz", unit: "Tube", coverage: 0, pricePerUnit: 7.29, qtyPerJob: 2 }
        }
      },
      dynasty: {
        name: "Dynasty",
        type: "Premium Architectural",
        windRating: 130,
        warranty: "Lifetime",
        pricePerBundle: 45.00,
        bundlesPerSquare: 3,
        colors: [
          "Atlantic Blue", "Biscayne", "Castle Grey", "Cornerstone",
          "Frostone Grey", "Glacier", "Monaco Red", "Sedona",
          "Shadow Black", "Shadow Brown"
        ],
        systemComponents: {
          starter: { name: "Leading Edge Plus Starter", unit: "Bundle", coverage: 120, pricePerUnit: 48.00 },
          hipRidge: { name: "Ultra HP Hip & Ridge", unit: "Bundle", coverage: 20, pricePerUnit: 60.00 },
          underlayment: { name: "RoofGard-Cool Grey Synthetic", unit: "Roll", coverage: 10, pricePerUnit: 80.00 },
          iceWater: { name: "ArmourGard Ice & Water", unit: "Roll", coverage: 2, pricePerUnit: 65.00 },
          ridgeVent: { name: "Ridge Vent", unit: "Piece", coverage: 4, pricePerUnit: 9.50 },
          dripEdge: { name: "Drip Edge", unit: "Piece", coverage: 10, pricePerUnit: 8.50 },
          nails: { name: "1-1/4\" Roofing Nails", unit: "Box", coverage: 25, pricePerUnit: 39.99 },
          sealant: { name: "Roof Sealant 10oz", unit: "Tube", coverage: 0, pricePerUnit: 7.29, qtyPerJob: 2 }
        }
      }
    }
  },

  // ==========================================
  // TAMKO
  // ==========================================
  tamko: {
    name: "TAMKO",
    shingleLines: {
      heritage: {
        name: "Heritage",
        type: "Architectural",
        windRating: 110,
        warranty: "Lifetime",
        pricePerBundle: 32.00,
        bundlesPerSquare: 3,
        colors: [
          "Antique Slate", "Black Walnut", "Brownstone", "Rustic Black",
          "Rustic Cedar", "Rustic Redwood", "Rustic Slate",
          "Thunderstorm Grey", "Weathered Wood"
        ],
        systemComponents: {
          starter: { name: "Tam-Pro Edge Starter", unit: "Bundle", coverage: 120, pricePerUnit: 42.00 },
          hipRidge: { name: "Tam-Pro Ridge", unit: "Bundle", coverage: 20, pricePerUnit: 55.00 },
          underlayment: { name: "Tam-Pro Synthetic Underlayment", unit: "Roll", coverage: 10, pricePerUnit: 75.00 },
          iceWater: { name: "Tam-Shield Ice & Water", unit: "Roll", coverage: 2, pricePerUnit: 62.00 },
          ridgeVent: { name: "Ridge Vent", unit: "Piece", coverage: 4, pricePerUnit: 9.00 },
          dripEdge: { name: "Drip Edge", unit: "Piece", coverage: 10, pricePerUnit: 8.00 },
          nails: { name: "1-1/4\" Roofing Nails", unit: "Box", coverage: 25, pricePerUnit: 39.99 },
          sealant: { name: "Roof Sealant 10oz", unit: "Tube", coverage: 0, pricePerUnit: 7.29, qtyPerJob: 2 }
        }
      }
    }
  },

  // ==========================================
  // ATLAS
  // ==========================================
  atlas: {
    name: "Atlas",
    shingleLines: {
      pinnaclePristine: {
        name: "Pinnacle Pristine",
        type: "Architectural",
        windRating: 130,
        warranty: "Lifetime",
        pricePerBundle: 38.00,
        bundlesPerSquare: 3,
        colors: [
          "Antique Pewter", "Charcoal", "Coastal Granite", "Desert Shake",
          "Hearthstone Gray", "Midnight Surf", "Oyster", "Pristine Black",
          "Restorative Gray", "Weathered Timber"
        ],
        systemComponents: {
          starter: { name: "Pro-Cut Starter", unit: "Bundle", coverage: 120, pricePerUnit: 45.00 },
          hipRidge: { name: "Pro-Cut Hip & Ridge", unit: "Bundle", coverage: 20, pricePerUnit: 58.00 },
          underlayment: { name: "Summit Synthetic Underlayment", unit: "Roll", coverage: 10, pricePerUnit: 78.00 },
          iceWater: { name: "WeatherMaster Ice & Water", unit: "Roll", coverage: 2, pricePerUnit: 66.00 },
          ridgeVent: { name: "Ridge Vent", unit: "Piece", coverage: 4, pricePerUnit: 9.00 },
          dripEdge: { name: "Drip Edge", unit: "Piece", coverage: 10, pricePerUnit: 8.50 },
          nails: { name: "1-1/4\" Roofing Nails", unit: "Box", coverage: 25, pricePerUnit: 39.99 },
          sealant: { name: "Roof Sealant 10oz", unit: "Tube", coverage: 0, pricePerUnit: 7.29, qtyPerJob: 2 }
        }
      }
    }
  },

  // ==========================================
  // MALARKEY
  // ==========================================
  malarkey: {
    name: "Malarkey",
    shingleLines: {
      vista: {
        name: "Vista AR",
        type: "Architectural",
        windRating: 110,
        warranty: "Lifetime",
        pricePerBundle: 35.00,
        bundlesPerSquare: 3,
        colors: [
          "Antique Brown", "Black Oak", "Midnight Black", "Natural Wood",
          "Silvered Gray", "Storm Grey", "Weathered Wood"
        ],
        systemComponents: {
          starter: { name: "Secure Start Starter", unit: "Bundle", coverage: 120, pricePerUnit: 46.00 },
          hipRidge: { name: "RidgeFlex Hip & Ridge", unit: "Bundle", coverage: 20, pricePerUnit: 60.00 },
          underlayment: { name: "Secure Start Plus Underlayment", unit: "Roll", coverage: 10, pricePerUnit: 82.00 },
          iceWater: { name: "Right Start Ice & Water", unit: "Roll", coverage: 2, pricePerUnit: 68.00 },
          ridgeVent: { name: "Ridge Vent", unit: "Piece", coverage: 4, pricePerUnit: 9.50 },
          dripEdge: { name: "Drip Edge", unit: "Piece", coverage: 10, pricePerUnit: 8.50 },
          nails: { name: "1-1/4\" Roofing Nails", unit: "Box", coverage: 25, pricePerUnit: 39.99 },
          sealant: { name: "Roof Sealant 10oz", unit: "Tube", coverage: 0, pricePerUnit: 7.29, qtyPerJob: 2 }
        }
      },
      legacy: {
        name: "Legacy",
        type: "Premium Architectural",
        windRating: 110,
        warranty: "Lifetime",
        pricePerBundle: 48.00,
        bundlesPerSquare: 3,
        colors: [
          "Antique Brown", "Black Oak", "Heather", "Midnight Black",
          "Natural Wood", "Silvered Gray", "Storm Grey", "Weathered Wood"
        ],
        systemComponents: {
          starter: { name: "Secure Start Starter", unit: "Bundle", coverage: 120, pricePerUnit: 46.00 },
          hipRidge: { name: "RidgeFlex Hip & Ridge", unit: "Bundle", coverage: 20, pricePerUnit: 60.00 },
          underlayment: { name: "Secure Start Plus Underlayment", unit: "Roll", coverage: 10, pricePerUnit: 82.00 },
          iceWater: { name: "Right Start Ice & Water", unit: "Roll", coverage: 2, pricePerUnit: 68.00 },
          ridgeVent: { name: "Ridge Vent", unit: "Piece", coverage: 4, pricePerUnit: 9.50 },
          dripEdge: { name: "Drip Edge", unit: "Piece", coverage: 10, pricePerUnit: 8.50 },
          nails: { name: "1-1/4\" Roofing Nails", unit: "Box", coverage: 25, pricePerUnit: 39.99 },
          sealant: { name: "Roof Sealant 10oz", unit: "Tube", coverage: 0, pricePerUnit: 7.29, qtyPerJob: 2 }
        }
      }
    }
  }

};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function getManufacturers() {
  return Object.keys(window.manufacturerDatabase).map(key => ({
    id: key,
    name: window.manufacturerDatabase[key].name
  }));
}

function getShingleLines(manufacturerId) {
  const manufacturer = window.manufacturerDatabase[manufacturerId];
  if (!manufacturer) return [];
  
  return Object.keys(manufacturer.shingleLines).map(key => ({
    id: key,
    ...manufacturer.shingleLines[key]
  }));
}

function getShingleColors(manufacturerId, shingleLineId) {
  const manufacturer = window.manufacturerDatabase[manufacturerId];
  if (!manufacturer) return [];
  
  const shingleLine = manufacturer.shingleLines[shingleLineId];
  if (!shingleLine) return [];
  
  return shingleLine.colors || [];
}

function getShingleData(manufacturerId, shingleLineId) {
  const manufacturer = window.manufacturerDatabase[manufacturerId];
  if (!manufacturer) return null;
  
  const shingleLine = manufacturer.shingleLines[shingleLineId];
  if (!shingleLine) return null;
  
  return {
    manufacturer: manufacturer.name,
    manufacturerId: manufacturerId,
    shingleLineId: shingleLineId,
    ...shingleLine
  };
}

function calculateSystemMaterials(manufacturerId, shingleLineId, measurements) {
  const shingleData = getShingleData(manufacturerId, shingleLineId);
  if (!shingleData) return [];
  
  // Check for custom pricing
  const customPricing = typeof getCustomPricingForSystem === 'function' ? getCustomPricingForSystem(manufacturerId, shingleLineId) : null;
  
  const materials = [];
  const squares = measurements.squares || 0;
  const ridgeLength = measurements.ridgeLength || 0;
  const hipLength = measurements.hipLength || 0;
  const eaveLength = measurements.eaveLength || 0;
  const rakeLength = measurements.rakeLength || 0;
  const valleyLength = measurements.valleyLength || 0;
  
  const hipRidgeTotal = ridgeLength + hipLength;
  const perimeter = eaveLength + rakeLength;
  const iceWaterLF = valleyLength + eaveLength;
  
  // Shingles
  const shinglePrice = customPricing?.shingles || shingleData.pricePerBundle;
  const shingleBundles = Math.ceil(squares * shingleData.bundlesPerSquare * 1.1);
  materials.push({
    name: shingleData.name + ' Shingles',
    quantity: shingleBundles,
    unit: "Bundle",
    unitPrice: shinglePrice,
    total: shingleBundles * shinglePrice,
    category: "Shingles"
  });
  
  const components = shingleData.systemComponents;
  
  // Starter Strip
  if (components.starter) {
    const price = customPricing?.starter || components.starter.pricePerUnit;
    const qty = Math.ceil(perimeter / components.starter.coverage);
    materials.push({
      name: components.starter.name,
      quantity: qty,
      unit: components.starter.unit,
      unitPrice: price,
      total: qty * price,
      category: "Starter"
    });
  }
  
  // Hip & Ridge
  if (components.hipRidge && hipRidgeTotal > 0) {
    const price = customPricing?.hipRidge || components.hipRidge.pricePerUnit;
    const qty = Math.ceil(hipRidgeTotal / components.hipRidge.coverage);
    materials.push({
      name: components.hipRidge.name,
      quantity: qty,
      unit: components.hipRidge.unit,
      unitPrice: price,
      total: qty * price,
      category: "Hip & Ridge"
    });
  }
  
  // Underlayment
  if (components.underlayment) {
    const price = customPricing?.underlayment || components.underlayment.pricePerUnit;
    const qty = Math.ceil(squares / components.underlayment.coverage);
    materials.push({
      name: components.underlayment.name,
      quantity: qty,
      unit: components.underlayment.unit,
      unitPrice: price,
      total: qty * price,
      category: "Underlayment"
    });
  }
  
  // Ice & Water Shield
  if (components.iceWater && iceWaterLF > 0) {
    const price = customPricing?.iceWater || components.iceWater.pricePerUnit;
    const iceWaterSq = (iceWaterLF * 3) / 100;
    const qty = Math.ceil(iceWaterSq / components.iceWater.coverage);
    materials.push({
      name: components.iceWater.name,
      quantity: Math.max(qty, 1),
      unit: components.iceWater.unit,
      unitPrice: price,
      total: Math.max(qty, 1) * price,
      category: "Ice & Water"
    });
  }
  
  // Ridge Vent
  if (components.ridgeVent && ridgeLength > 0) {
    const price = customPricing?.ridgeVent || components.ridgeVent.pricePerUnit;
    const qty = Math.ceil(ridgeLength / components.ridgeVent.coverage);
    materials.push({
      name: components.ridgeVent.name,
      quantity: qty,
      unit: components.ridgeVent.unit,
      unitPrice: price,
      total: qty * price,
      category: "Ventilation"
    });
  }
  
  // Drip Edge
  if (components.dripEdge) {
    const price = customPricing?.dripEdge || components.dripEdge.pricePerUnit;
    const qty = Math.ceil(perimeter / components.dripEdge.coverage);
    materials.push({
      name: components.dripEdge.name,
      quantity: qty,
      unit: components.dripEdge.unit,
      unitPrice: price,
      total: qty * price,
      category: "Drip Edge"
    });
  }
  
  // Nails
  if (components.nails) {
    const price = customPricing?.nails || components.nails.pricePerUnit;
    const qty = Math.ceil(squares / components.nails.coverage);
    materials.push({
      name: components.nails.name,
      quantity: qty,
      unit: components.nails.unit,
      unitPrice: price,
      total: qty * price,
      category: "Fasteners"
    });
  }
  
  // Sealant
  if (components.sealant) {
    const price = customPricing?.sealant || components.sealant.pricePerUnit;
    const qty = components.sealant.qtyPerJob || 2;
    materials.push({
      name: components.sealant.name,
      quantity: qty,
      unit: components.sealant.unit,
      unitPrice: price,
      total: qty * price,
      category: "Sealant"
    });
  }
  
  return materials;
}

// Export functions to window
window.getManufacturers = getManufacturers;
window.getShingleLines = getShingleLines;
window.getShingleColors = getShingleColors;
window.getShingleData = getShingleData;
window.calculateSystemMaterials = calculateSystemMaterials;



// Debug logs for script loading
console.log('[MANUFACTURERS] Database ready. Manufacturers:', Object.keys(window.manufacturerDatabase));
console.log('[MANUFACTURERS] getManufacturers available:', typeof getManufacturers === 'function');
