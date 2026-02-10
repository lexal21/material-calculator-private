# Material Calculator - Project Status

**Last Updated:** February 6, 2026 - 23:09 EST  
**Status:** ✅ Production Ready  
**URL:** https://material-calculator-sand.vercel.app  
**GitHub:** https://github.com/lexal21/material-calculator-private (auto-deploys from master)

---

## Current Features

### ✅ Core Functionality
- **PDF Upload & Parsing** - Ridge Top PDF extraction
- **Material Calculator** - Auto-calculates materials from measurements
- **Labor Calculator** - Auto-calculates labor costs (Greater Charleston $80/sq, Out of Area $90/sq)
- **Pricing Management** - Editable material prices with templates
- **PDF Generation** - Materials invoice + Labor invoice with embedded logo
- **Tax Calculation** - Editable tax rate (default 9%)

### ✅ Project Management (NEW!)
- **Auto-Save** - Saves to localStorage on every change
- **Refresh Protection** - Data restores automatically on page reload
- **Named Projects** - Save up to 20 projects with custom names
- **Project Switching** - Dropdown to switch between saved projects
- **New Project Button** - Start fresh without losing current work

### ✅ Templates
- **Price Templates** - Save/load price lists
- **2/26 Pricing** - Default template with Austin's rates
- **CertainTeed Landmark PRO** - Alternative pricing template
- **Custom Templates** - Save your own pricing configurations

### ✅ Customization
- **Misc Items** - Add custom materials to invoice
- **Editable Prices** - Override any material price on-the-fly
- **Customer Info** - Name, address, job number, shingle color
- **Shingle Colors** - 16 CertainTeed Landmark PRO colors

---

## Recent Fixes (Feb 6, 2026)

### Session 1 (22:20 - 22:44 EST)
- ✅ Fixed template switching to update pricing table immediately
- ✅ Fixed materials tab template switching to sync with pricing
- ✅ Fixed custom items in labor tab (now prompts for name/unit/price)
- ✅ Fixed custom items from pricing appearing in materials dropdowns
- ✅ Fixed delete button encoding (× character)

### Session 2 (22:53 - 23:09 EST)
- ✅ Added Project Management System (auto-save, named projects, switching)
- ✅ Fixed refresh issue (data now persists in localStorage)
- ✅ Fixed UTF-8 emoji encoding in headers
- ✅ Fixed undo button arrows
- ✅ Fixed auto-restore on page load (script load order)

---

## File Structure

```
material-calculator/
├── public/
│   ├── index.html              # Main app
│   ├── app.js                  # Core calculator logic
│   ├── pricing.js              # Pricing management
│   ├── project-manager.js      # NEW: Auto-save & project management
│   ├── templates.js            # Price templates
│   ├── all-materials.js        # Material dropdown lists
│   ├── locations.js            # Job location list
│   ├── styles.css              # Styling
│   └── logo.jpg                # Ashley River Roofing logo
├── labor-calculator.js         # Labor calculation logic
├── pdf-parser.js               # PDF text extraction
├── parse-numbers.js            # Number validation
└── server.js                   # Express server
```

---

## Technical Details

### Data Flow
1. **Upload** → Ridge Top PDF → `pdf-parser.js` extracts text
2. **Parse** → `parse-numbers.js` validates measurements
3. **Calculate** → `labor-calculator.js` computes labor costs
4. **Display** → `app.js` renders materials + labor tables
5. **Save** → `project-manager.js` stores to localStorage
6. **PDF** → `pdfmake` generates invoices with logo

### Storage
- **localStorage Keys:**
  - `calculator-current-session` - Auto-saved work
  - `calculator-projects` - Array of named projects (max 20)
  - `materialPricing` - Current pricing
  - `priceTemplates` - Saved price templates
  - `pricingVersion` - Version tracking for auto-updates
  - `templatesVersion` - Template format version

### Auto-Save Triggers
- Material row changes
- Labor row changes
- Misc item changes
- Customer info edits (name, address, job #, color)
- Tax rate changes
- PDF upload completion

---

## Team

**Client:** Quikbitz (@quikbitz)  
- Telegram ID: 1762887771  
- Role: Owner, Ashley River Roofing  

**Tester:** Austin Matte (@austinm1996)  
- Telegram ID: 7687379719  
- Email: austin@ashleyriverroofing.com  
- Role: Team member, material calculator testing  

**Developer:** Roofus (AI Assistant)  
- Role: Builder, bug fixes, feature implementation  

---

## Git History (Last 10 Commits)

```
ea51517 - Fix UTF-8 emoji encoding and project manager initialization
bc224b0 - Add Project Management System with auto-save and localStorage
754082a - Fix delete button encoding and template custom items sync
6aebd37 - Fix custom items: labor tab prompt and materials tab sync with pricing
7e65619 - Fix template switching and UI improvements
fd49b70 - Re-encode logo.jpg to base64 and update embedded image data in PDFs
cdf486f - Fix labor buttons (print vs save) and template dropdown updates
a577e35 - Fix labor tab buttons to use PDF generation
503ae16 - Add pricing version system to auto-update localStorage
c2c2f22 - Update pricing to Austin's 2/26 rates
```

---

## Known Limitations

- **PDF Format:** Only works with Ridge Top PDF format
- **Storage:** localStorage limit ~5-10MB (supports 100+ projects)
- **Offline:** Must load page once online to cache files
- **Browser:** Chrome/Edge/Firefox recommended (Safari may have localStorage quirks)

---

## Future Enhancements (Planned)

### Phase 1: Multi-User SaaS
- User authentication (Clerk/Auth0)
- Company accounts & team management
- Subdomain-based tenancy
- Database storage (PostgreSQL)
- Subscription billing (Stripe)

### Phase 2: Advanced Features
- PDF template customization
- Email invoice delivery
- Project history & analytics
- Mobile app (React Native)
- Bulk PDF processing

**Documentation:** See `SAAS-RESEARCH.md` and `TECH-QUICK-REF.md` for SaaS implementation details.

---

## Testing Checklist

- [x] Upload Ridge Top PDF
- [x] Verify measurements display correctly
- [x] Check material calculations
- [x] Check labor calculations
- [x] Edit customer info
- [x] Add misc items
- [x] Change tax rate
- [x] Generate materials PDF
- [x] Generate labor PDF
- [x] Switch tabs
- [x] Refresh page (should restore data)
- [x] Save project with name
- [x] Switch between projects
- [x] Start new project
- [x] Edit pricing
- [x] Create custom template
- [x] Apply template
- [x] Add custom items to pricing
- [x] Verify custom items appear in materials dropdowns

---

## Deployment

**Host:** Vercel (Free Plan)  
**Domain:** material-calculator-sand.vercel.app  
**Auto-Deploy:** Push to `master` branch → Vercel builds & deploys automatically  
**Build Time:** ~30 seconds  
**Server:** Node.js 25.x  

---

## Support & Maintenance

**Primary Contact:** Quikbitz (Telegram @quikbitz)  
**Developer:** Roofus (via OpenClaw)  
**Repository:** Private GitHub repo (lexal21/material-calculator-private)  

**For Issues:**
1. Report via Telegram to @quikbitz
2. Include: what you were doing, expected result, actual result
3. Screenshots help!
4. If possible: save the PDF that caused the issue

---

**Status:** All critical features implemented and tested ✅  
**Next Step:** Production use & feedback collection
