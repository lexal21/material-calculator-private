// Default material pricing
const DEFAULT_PRICING = {
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
};

// Load pricing from localStorage or use defaults
function loadPricing() {
  const stored = localStorage.getItem('materialPricing');
  return stored ? JSON.parse(stored) : { ...DEFAULT_PRICING };
}

// Save pricing to localStorage
function savePricing(pricing) {
  localStorage.setItem('materialPricing', JSON.stringify(pricing));
}

// Get current pricing
function getCurrentPricing() {
  return loadPricing();
}

// Populate pricing table
function populatePricingTable() {
  const pricing = loadPricing();
  const tbody = document.getElementById('pricingTableBody');
  
  tbody.innerHTML = Object.entries(pricing).map(([name, data]) => `
    <tr>
      <td>${name}</td>
      <td>${data.unit}</td>
      <td>
        <input 
          type="number" 
          step="0.01" 
          value="${data.price}" 
          class="price-input"
          data-material="${name}"
          onchange="updatePrice('${name}', this.value)"
        />
      </td>
      <td>$${data.price.toFixed(2)}</td>
    </tr>
  `).join('');
}

// Update a single price
function updatePrice(materialName, newPrice) {
  const pricing = loadPricing();
  pricing[materialName].price = parseFloat(newPrice);
  savePricing(pricing);
  populatePricingTable();
}

// Reset all pricing to defaults
function resetPricing() {
  if (confirm('Reset all prices to default values?')) {
    savePricing({ ...DEFAULT_PRICING });
    populatePricingTable();
    alert('Pricing reset to defaults');
  }
}

// Filter pricing table by search
function filterPricingTable() {
  const searchTerm = document.getElementById('pricingSearch').value.toLowerCase();
  const rows = document.querySelectorAll('#pricingTableBody tr');
  
  rows.forEach(row => {
    const materialName = row.cells[0].textContent.toLowerCase();
    if (materialName.includes(searchTerm)) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

// Load selected template
function loadSelectedTemplate() {
  const select = document.getElementById('templateSelect');
  const templateId = select.value;
  
  if (templateId && window.priceTemplates) {
    if (confirm('Load this price template? This will replace current pricing.')) {
      window.priceTemplates.applyTemplate(templateId);
    }
  }
}

// Show save template dialog
function showSaveTemplateDialog() {
  const templateName = prompt('Enter a name for this price list template:');
  if (templateName && templateName.trim()) {
    if (window.priceTemplates) {
      window.priceTemplates.saveCurrentAsTemplate(templateName.trim());
      populateTemplateSelector();
      alert('Template saved successfully!');
    }
  }
}

// Delete selected template
function deleteSelectedTemplate() {
  const select = document.getElementById('templateSelect');
  const templateId = select.value;
  
  if (!templateId) {
    alert('Please select a template to delete.');
    return;
  }
  
  const templateName = select.options[select.selectedIndex].text;
  
  if (confirm(`Delete template "${templateName}"? This cannot be undone.`)) {
    if (window.priceTemplates) {
      window.priceTemplates.deleteTemplate(templateId);
      populateTemplateSelector();
      alert('Template deleted successfully!');
    }
  }
}

// Populate template selector
function populateTemplateSelector() {
  if (!window.priceTemplates) return;
  
  const select = document.getElementById('templateSelect');
  const templates = window.priceTemplates.getNames();
  
  // Keep "Current Pricing" option
  select.innerHTML = '<option value="">Current Pricing</option>';
  
  templates.forEach(template => {
    const option = document.createElement('option');
    option.value = template.id;
    option.textContent = template.name;
    select.appendChild(option);
  });
}

// Initialize pricing table when page loads
document.addEventListener('DOMContentLoaded', () => {
  populatePricingTable();
  if (window.priceTemplates) {
    populateTemplateSelector();
  }
});
