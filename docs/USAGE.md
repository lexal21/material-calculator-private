# Material Calculator - Usage Guide

## Quick Start

### Web App (Recommended)
1. Open `web-app.html` in your browser
2. Enter measurements from Ridge Top report
3. Click "Calculate Materials"
4. Copy results or print material order

### Command Line
```bash
node test.js
```
Runs test calculations on sample data.

## Input Fields

### Required Measurements
- **Roof Squares** - Total roof area in squares (from Ridge Top "Roof sq")
- **Hip Length** - Hip length in feet (determines waste factor)
- **Rake Edge Length** - Rake edges in feet
- **Eave Edge Length** - Eave edges in feet
- **Ridge Length** - Total ridge length in feet
- **Number of Ridges** - Count of separate ridge lines

### Optional Fields
- **Customer Name** - For the material order
- **Address** - Job site address
- **Shingle Color** - Color selection (Driftwood, Weathered Wood, Moire Black, etc.)

## Calculation Logic

### Shingles
- Base: 3 bundles per square
- Waste: 10% (hip ≤100 LF) or 15% (hip >100 LF)
- Formula: `ceil((squares × 3) × waste_multiplier)`

### Drip Edge
- Covers all perimeter (rakes + eaves)
- 10 LF per piece
- Always add 3 extra pieces
- Formula: `ceil(perimeter / 10) + 3`

### Ridge Vent
- Based on ridge length and count
- Formula: `ceil((ridge_length - (ridge_count × 3)) / 4)`

## Output

Material order includes:
- Item name and description
- Quantity needed
- Unit price
- Line total
- Grand total cost

## Tips

1. **Hip Detection**: If hip length > 100 LF, automatically uses 15% waste
2. **Multiple Slopes**: Sum all slopes for total squares before entering
3. **Ridge Count**: Count separate ridge lines on the roof (usually 1-4)
4. **Rounding**: All quantities round up to ensure enough material

## Next Steps

- [ ] Add PDF upload/parsing
- [ ] Save/export material orders
- [ ] Material pricing updates
- [ ] Integration with suppliers
- [ ] Mobile app version
