// Location mapping for RoofRunner calculation
const LOCATION_MAP = {
  // Coast locations (1.5 rolls per 10 squares)
  'Charleston': 'coast',
  'James Island': 'coast',
  'Johns Island': 'coast',
  'Mount Pleasant': 'coast',
  'North Charleston': 'coast',
  'Hanahan': 'coast',
  'Goose Creek': 'coast',
  'Summerville': 'coast',
  'Ladson': 'coast',
  'Beaufort': 'coast',
  'Bluffton': 'coast',
  'Myrtle Beach': 'coast',
  'Georgetown': 'coast',
  'Pawleys Island': 'coast',
  
  // Inland locations (1 roll per 10 squares)
  'Walterboro': 'inland',
  'Sumter': 'inland',
  'Columbia': 'inland',
  'Lexington': 'inland',
  'Irmo': 'inland',
  'Blythewood': 'inland'
};

function getLocationType(locationName) {
  return LOCATION_MAP[locationName] || 'inland';
}

// Labor location mapping (Greater Charleston vs Out of Area)
const LABOR_LOCATION_MAP = {
  // Greater Charleston Area ($80/sq)
  'Charleston': 'Greater Charleston',
  'James Island': 'Greater Charleston',
  'Johns Island': 'Greater Charleston',
  'Mount Pleasant': 'Greater Charleston',
  'North Charleston': 'Greater Charleston',
  'Hanahan': 'Greater Charleston',
  'Goose Creek': 'Greater Charleston',
  'Summerville': 'Greater Charleston',
  'Ladson': 'Greater Charleston',
  
  // Out of Area ($90/sq)
  'Walterboro': 'Out of Area',
  'Sumter': 'Out of Area',
  'Columbia': 'Out of Area',
  'Lexington': 'Out of Area',
  'Irmo': 'Out of Area',
  'Blythewood': 'Out of Area',
  'Beaufort': 'Out of Area',
  'Bluffton': 'Out of Area',
  'Myrtle Beach': 'Out of Area',
  'Georgetown': 'Out of Area',
  'Pawleys Island': 'Out of Area'
};

function getLaborLocation(locationName) {
  return LABOR_LOCATION_MAP[locationName] || 'Out of Area';
}

// Export for use in app.js
window.getLocationType = getLocationType;
window.getLaborLocation = getLaborLocation;
