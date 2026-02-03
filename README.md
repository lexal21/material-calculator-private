# Material Calculator - Roofing Automation

## Overview
Automatically extract measurements from Ridge Top PDF reports and calculate material quantities with pricing.

## Components
1. **PDF Parser** - Extract measurements from Ridge Top reports
2. **Calculation Engine** - Apply formulas to generate material lists
3. **Output Generator** - Format material orders with quantities and pricing

## Formulas
- **Shingles:** 3 bundles/sq × waste (10% normal, 15% if hip > 100 LF)
- **Drip Edge:** Total perimeter + 3 pieces
- **Ridge Vent:** ceil((ridge_length - (ridge_count × 3)) ÷ 4)

## Usage
```bash
node calculator.js <path-to-ridgetop-pdf>
```

## Output
Material list with:
- Item name
- Quantity
- Unit price
- Line total
- Grand total
