// Price List Templates System

const DEFAULT_TEMPLATES = {
  'certainteed-landmark-pro': {
    name: 'CertainTeed Landmark PRO',
    pricing: {
      'Landmark PRO Shingles': { unit: 'Bundle', price: 35 },
      'SwiftStart Starter Strip': { unit: 'Bundle', price: 52 },
      'Shadow Ridge Hip & Ridge Cap': { unit: 'Bundle', price: 65.5 },
      'Drip Edge (1-1/2 X 3-3/4")': { unit: 'Piece', price: 9.25 },
      'Ice & Water Shield': { unit: 'Roll', price: 69 },
      'RoofRunner Synthetic Underlayment': { unit: 'Roll', price: 82 },
      'Ridge Vent (12" / 4 ft)': { unit: 'Piece', price: 9 },
      '7/16 OSB Plywood': { unit: 'Sheet', price: 15.99 },
      '1-1/4" Roofing Nails': { unit: 'Box', price: 39.99 },
      'Button Caps': { unit: 'Bag', price: 27 }
    }
  }
};

// Load templates from localStorage or use defaults
function loadTemplates() {
  const stored = localStorage.getItem('priceTemplates');
  return stored ? JSON.parse(stored) : { ...DEFAULT_TEMPLATES };
}

// Save templates to localStorage
function saveTemplates(templates) {
  localStorage.setItem('priceTemplates', JSON.stringify(templates));
}

// Get list of template names
function getTemplateNames() {
  const templates = loadTemplates();
  return Object.keys(templates).map(key => ({
    id: key,
    name: templates[key].name
  }));
}

// Load a specific template
function loadTemplate(templateId) {
  const templates = loadTemplates();
  return templates[templateId];
}

// Save current pricing as a new template
function saveCurrentAsTemplate(templateName) {
  const currentPricing = getCurrentPricing();
  const templates = loadTemplates();
  
  const templateId = templateName.toLowerCase().replace(/\s+/g, '-');
  templates[templateId] = {
    name: templateName,
    pricing: currentPricing
  };
  
  saveTemplates(templates);
  return templateId;
}

// Apply a template to current pricing
function applyTemplate(templateId) {
  const template = loadTemplate(templateId);
  if (template) {
    savePricing(template.pricing);
    populatePricingTable();
    return true;
  }
  return false;
}

// Delete a template
function deleteTemplate(templateId) {
  const templates = loadTemplates();
  delete templates[templateId];
  saveTemplates(templates);
}

// Export for use in other scripts
window.priceTemplates = {
  load: loadTemplates,
  save: saveTemplates,
  getNames: getTemplateNames,
  loadTemplate: loadTemplate,
  saveCurrentAsTemplate: saveCurrentAsTemplate,
  applyTemplate: applyTemplate,
  deleteTemplate: deleteTemplate
};
