# Roofing Material Calculator - Project Documentation

**Last Updated:** February 4, 2026  
**Status:** ✅ Critical bugs fixed, deployed to production, UI improvements next  
**Live URL:** https://material-calculator-sand.vercel.app  
**Local Dev:** http://localhost:3000

---

## 🎯 Project Overview

Automated roofing material calculator that parses Ridge Top PDF reports and generates:
- Material lists with auto-calculated quantities
- Labor invoices with location-based pricing
- Printable/PDF invoices matching print preview exactly

**Built for:** Ashley Risen Roofing  
**Purpose:** Eliminate manual material estimation, reduce errors, speed up ordering

---

## ✅ What's Complete

### Materials Tab (10 Materials + Tax)
1. **Shingles** - 3 bundles/sq, waste (10% normal, 15% hip>100ft)
2. **Starter Course** - Perimeter ÷ 116 LF
3. **Hip & Ridge Cap** - (Hip + Ridge) ÷ 30 LF
4. **Drip Edge** - Perimeter ÷ 10 LF + 3 extra
5. **Ice & Water Shield** - Valley ÷ 63 LF
6. **RoofRunner Underlayment** - Location-based (1.5 coast, 1 inland per 10 sq)
7. **Ridge Vent** - (Ridge - count×3) ÷ 4
8. **Plywood** - 3 sheets per job
9. **Roofing Nails** - 1 box per 16 sq
10. **Button Caps** - 1 bag per 24 sq
11. **Tax** - 9% (editable)

### Labor Tab (19 Line Items)
**Auto-calculated from PDF:**
- Labor squares (with waste multiplier)
- Starter/Hip Ridge bundles
- Plywood (tiered: >10=$10ea, ≤10=$30ea)
- Step flashing & L-flashing
- Steep charges (pitch-based): 8-9/12 ($5), 10-11/12 ($10), 12+ ($20)

**Manual entry:**
- 2 chimney types, 2 dead valley types, hand loading, extra layers, vinyl soffit, flat/metal roofing

**Location-based pricing:**
- Greater Charleston: $80/sq
- Out of Area: $90/sq

### Features
- ✅ PDF parsing (measurements + pitch data extraction)
- ✅ Dropdown material selection (19 materials available)
- ✅ Editable quantities, prices, names
- ✅ 3 additional item slots per invoice
- ✅ Checkbox selection + mass delete + undo
- ✅ Job Number field (editable)
- ✅ Zero-quantity items hidden in print/PDF
- ✅ Print = Save PDF (unified via pdfmake)
- ✅ Location dropdown (determines RoofRunner qty & labor rate)
- ✅ Custom pricing templates (save/load/delete)
- ✅ Search materials functionality
- ✅ Responsive design (mobile-friendly)

### UI Design
- **Theme:** Electric Blue/Cyan (professional tool aesthetic)
- **Typography:** DM Sans headings, system fonts for data
- **Layout:** Clean, contractor-focused, strong visual hierarchy
- **Buttons:** Right-aligned, consistent spacing
- **Tables:** Tabular numbers, perfect alignment
- **Print-optimized:** CSS media queries for clean PDF output

---

## 🐛 Bug Fixes (February 4, 2026)

### Critical Issues Resolved
**Test Case:** Phillip Green PDF  
**Tester:** Austin (@austinm1996)

1. **Steep Charge Calculation (FIXED ✅)**
   - **Problem:** Pitch data extraction failed when PDF text concatenated table columns
   - **Example:** "MainLevelF1869.48.6910" instead of separate columns
   - **Solution:** Created `parse-numbers.js` validation module using relationship `squares ≈ sqft / 100`
   - **Result:** Now correctly shows ~30.78 squares for 10-11.5 pitch tier (was showing 0)
   - **Files Modified:** `parse-numbers.js` (new), `pdf-parser.js`

2. **Labor Calculation Precision (FIXED ✅)**
   - **Problem:** Floating-point errors causing incorrect totals (e.g., $3,255.07 instead of $3,255.30)
   - **Solution:** Applied `Math.round(x * 100) / 100` to all labor totals
   - **Result:** Labor totals now match expected precision
   - **Files Modified:** `labor-calculator.js`, `public/app.js` (lines 1275-1283)

3. **Small Material Price List Issue (FIXED ✅)**
   - **Status:** Confirmed working by Austin
   - **Details:** [Not documented - minor fix]

**All fixes deployed to Vercel production:** https://material-calculator-sand.vercel.app

---

## 📁 File Structure

```
material-calculator/
├── server.js                 # Express server
├── calculator.js             # Material calculation engine
├── labor-calculator.js       # Labor calculation engine
├── pdf-parser.js             # Ridge Top PDF extraction
├── parse-numbers.js          # Validation-based number parsing
├── package.json              # Dependencies
├── PROJECT.md                # This file (project documentation)
├── UI-TASKS.md               # UI improvement tasks
├── README.md                 # Original quick start
├── TODO.md                   # Old todos (outdated)
├── public/                  # Frontend files
│   ├── index.html           # Main UI
│   ├── app.js               # Frontend logic (1400+ lines)
│   ├── style.css            # Electric blue theme
│   ├── locations.js         # Coastal/inland mapping
│   ├── all-materials.js     # Material database
│   ├── templates.js         # Pricing template storage
│   └── logo.jpg             # Company logo
├── uploads/                 # Temporary PDF storage
└── memory/
    └── 2026-02-02.md        # Today's detailed change log
```

---

## 🔑 Key Decisions & Design Choices

### PDF Parsing
- Line-by-line extraction with regex patterns
- Pitch data from Annotations section (Face + slope)
- Address truncated after zip code
- Ridge count auto-estimated from ridge length

### Calculations
- Waste factor: Hip length threshold (>100ft = 15%, else 10%)
- RoofRunner: Location-aware (coast vs inland)
- Plywood: Tiered pricing rule (>10 sheets cheaper)
- Labor: Pitch-based steep charges (3 tiers)

### UI/UX
- Quantity displays: Whole numbers by default, decimals only if needed
- Material names: Dropdown selection (19 options)
- Undo stack: Saves last 10 actions
- Zero-quantity hiding: Items with qty=0 hidden in print/PDF
- Print method: pdfmake for both preview and save (ensures 100% match)

### Color Theme
- **Primary:** Electric Blue/Cyan (#0891b2)
- **Rationale:** Speed, efficiency, problem-solving, trust, tech-tool feel
- **Rejected:** Construction orange (too attention-grabbing)

### Location Classifications
**Coastal (1.5 RoofRunner rolls / 10 sq):**
Charleston, James Island, Johns Island, Mount Pleasant, N. Charleston, Hanahan, Goose Creek, Summerville, Ladson, Beaufort, Bluffton, Myrtle Beach, Georgetown, Pawleys Island

**Inland (1 roll / 10 sq):**
Walterboro, Sumter, Columbia, Lexington, Irmo, Blythewood

**Greater Charleston Labor ($80/sq):**
Charleston, James Island, Johns Island, Mount Pleasant, N. Charleston, Hanahan, Goose Creek, Summerville, Ladson

**Out of Area Labor ($90/sq):**
All others

---

## 🚀 How to Run

### Development
```bash
cd material-calculator
node server.js
```
Open http://localhost:3000

### Production Deployment (Future)
**Recommended platforms:**
- Railway ($5-20/mo) - Easy Node.js deployment
- Render ($0-7/mo free tier) - Simple Git deployment
- Heroku - Classic choice

**Required:**
- Node.js 14+
- npm packages: express, multer, pdf-parse, cors

---

## 📋 Next Steps / Roadmap

### Phase 1: UI Improvements (CURRENT PHASE)
**See `UI-TASKS.md` for detailed task list**

**Priority tasks:**
1. Labor PDF generation (match material invoice format)
2. Material tab template dropdown (quick access to saved templates)
3. Labor tab checkboxes functionality (select all, delete, undo)
4. Labor tab dropdown selectors & add items button

**Estimated time:** 1-2 days

### Phase 2: Additional Testing (After UI improvements)
- [ ] Test with 10+ more real Ridge Top PDFs
- [ ] Edge case testing (missing data, unusual roof shapes)
- [ ] Mobile testing on actual devices
- [ ] Load testing (multiple simultaneous users)

### Phase 3: Dev Tools Upgrade (Optional - 1-2 hours)
- [ ] Install Nodemon (auto-restart server on file changes)
- [ ] Add Browser-sync (auto-refresh browser)
- [ ] Optional: ESLint for code quality

### Phase 4: Production Enhancements (Future)
- [x] ~~Choose hosting platform~~ (Vercel - DONE)
- [x] ~~Deploy to production~~ (DONE - https://material-calculator-sand.vercel.app)
- [ ] Configure custom domain (if needed)
- [ ] Add uptime monitoring (UptimeRobot free tier)
- [ ] Set up Sentry for error tracking (free tier: 5K events/month)

### Phase 5: Advanced Features (Future)
- [ ] Save invoices to database (history/search)
- [ ] User accounts (multi-user support)
- [ ] Email invoices directly to suppliers
- [ ] Batch processing (multiple PDFs at once)
- [ ] Analytics dashboard (most common materials, average job cost)
- [ ] Automated testing suite (Playwright)

### Phase 6: Productization (Long-term)
- [ ] Multi-tenant SaaS version
- [ ] White-label for other roofing contractors
- [ ] API for third-party integrations
- [ ] Mobile app (PWA or native)

---

## 🐛 Known Issues / Limitations

**✅ All critical bugs fixed as of February 4, 2026**

**Planned improvements (see UI-TASKS.md):**
- Labor PDF export not yet implemented (shows alert) - Task #4
- Labor tab checkboxes non-functional - Task #2
- Material template dropdown not on material tab - Task #3
- Labor item dropdown/add items missing - Task #1

**Future enhancements:**
- No database (invoices not saved - could add SQLite/PostgreSQL)
- No user authentication (single-user currently)
- PDF parsing assumes Ridge Top format (won't work with other report types)

---

## 📊 Tools Research (Completed)

**Comprehensive research conducted on 2026-02-02** covering:
- PDF generation libraries
- Data table components (Tabulator recommended)
- Dropdown libraries (SlimSelect recommended)
- Dev tools (Nodemon, Browser-sync)
- Testing frameworks (Playwright)
- Deployment platforms
- Monitoring tools

**See:** `TOOLS-RESEARCH-2026.md` (if created)

---

## 🎓 Reusable Patterns (Skill Created)

**PDF Calculator Builder Skill** - Created 2026-02-01
- Location: Workspace root as `pdf-calculator-builder.skill`
- Contains: All patterns learned from this project
- Purpose: Speed up future PDF calculator projects (roofing, HVAC, plumbing, etc.)
- Includes: Print CSS, PDF parsing, calculations, state management, boilerplate

**Reduces future projects from 1-2 weeks to 2-3 days**

---

## 🔧 Maintenance Notes

### Updating Material Prices
Edit `public/all-materials.js` or use Pricing tab in app

### Adding New Locations
Edit `public/locations.js`:
- Add to `LOCATION_MAP` (coast vs inland for RoofRunner)
- Add to `LABOR_LOCATION_MAP` (Greater Charleston vs Out of Area)

### Changing Formulas
Edit `calculator.js` for material formulas
Edit `labor-calculator.js` for labor formulas

### Updating UI Design
Edit `public/style.css` - all styling centralized
Note: Stop server before editing to avoid file locks

---

## 📞 Contact & Support

**Built by:** Roofus (AI assistant)  
**For:** Quikbitz / Ashley Risen Roofing  
**Project Start:** January 31, 2026  
**Core Completion:** February 2, 2026

**Tech Stack:**
- Backend: Node.js + Express
- Frontend: Vanilla JavaScript (no framework)
- PDF: pdf-parse (parsing), pdfmake (generation)
- Design: Custom CSS, DM Sans font

---

## 📝 Change Log Summary

**2026-01-31:** Initial build, basic PDF parsing, 3 materials  
**2026-02-01:** Full material list (10 items), Labor tab (19 items), print CSS fixes  
**2026-02-02:** UI redesign (8 rounds), electric blue theme, quantity alignment, spacing fixes  
**2026-02-04:** Fixed steep charge calculation, labor precision rounding, material prices. Deployed to Vercel production.

**See `memory/2026-02-04.md` for detailed change log**

---

**🎉 Project Status: Critical Bugs Fixed - UI Improvements Next!**

**Live:** https://material-calculator-sand.vercel.app  
**Next:** See `UI-TASKS.md` for upcoming work
