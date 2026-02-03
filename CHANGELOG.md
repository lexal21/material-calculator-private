# Changelog - Material Calculator

## 2026-02-01 Morning Session

### UI/Design Improvements ✨
- **Enhanced spacing**: Increased section margins from 40px to 48px
- **Better shadows**: Softer, more professional box shadows (0 4px 6px)
- **Typography polish**: 
  - Tabular number formatting for aligned digits
  - Improved label styling (uppercase, better spacing)
  - Better font weights and line heights
- **Table improvements**:
  - Lighter borders (#E5E7EB)
  - Right-aligned numbers
  - Smooth hover transitions (150ms)
  - Better header styling
- **Measurement cards**: Enhanced with better spacing and shadows
- **Button states**: Added active/pressed state (scale 0.98)

### New Features 🎯

#### 3 Miscellaneous Line Items
- Added 3 blank line items below materials
- Each has item name input, quantity, and price
- Automatically included in subtotal/grand total calculations
- Useful for custom/additional materials not in standard list

#### Price List Template System
- **Save templates**: Save current pricing as named template
- **Load templates**: Quickly switch between different manufacturer price lists
- **Template dropdown**: Easy access to saved templates
- **Use cases**: 
  - CertainTeed Landmark PRO pricing
  - Different manufacturer lists
  - Seasonal/promotional pricing
  - Customer-specific pricing

#### Search Filter on Pricing Tab
- Real-time search across all materials
- Filters table as you type
- Helpful as material list grows

### Technical Changes
- Created `templates.js` for template management system
- Added template storage using localStorage
- Enhanced `pricing.js` with search and template functions
- Updated `app.js` to handle misc items in calculations
- CSS variables for consistent theming

### Files Modified
- `public/style.css` - UI improvements
- `public/index.html` - Template UI and misc items
- `public/app.js` - Misc item calculations
- `public/pricing.js` - Search and template functions
- `public/templates.js` - NEW: Template management
- `CHANGELOG.md` - NEW: This file

### Server Status
🔴 Still offline - awaiting user direction to restart
