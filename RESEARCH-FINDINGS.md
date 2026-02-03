# Research Findings: Material Calculator Improvements

**Research Date:** February 1, 2026  
**Purpose:** Identify design, accessibility, and feature improvements for roofing material calculator

---

## 1. Calculator UI/UX Best Practices (Nielsen Norman Group)

### Key Findings:
**✅ What we're doing right:**
- Embedded calculator directly in page (not popup)
- Immediate results shown on screen
- Easy input adjustments without restart
- No forced registration

**🔧 Recommended Improvements:**

#### A. **Explain Input Purpose**
- Add small help icons (?) next to complex fields
- Example: "Ridge Count" could have tooltip: "Number of separate roof peaks. Auto-estimated but you can adjust."
- Rationale increases user confidence

#### B. **Provide Input Examples**
- Show "what others commonly enter" for reference
- Example placeholders: "Typical: 20-40 sq" for roof squares

#### C. **Contextualize Outputs**
- Current: Just shows dollar amounts
- Better: Add visual indicators like:
  - "📊 This is 15% above average for this size job"
  - "💡 Coast locations typically use 50% more RoofRunner"
  - Comparison framework (similar to mortgage calculators)

#### D. **Show Algorithm Transparency**
- Add expandable "How we calculate this" section
- Show formulas in plain English
- Builds trust, especially for new users

#### E. **Avoid Misleading Defaults**
- Currently using 9% tax - good!
- Consider: Auto-detect tax rate by location (SC counties vary)

### Priority: **Medium-High** | Impact: **Trust & Conversion**

---

## 2. Data Table UI Design

### Current State Analysis:
- ✅ Good: Clean, readable layout
- ✅ Good: Editable inline fields
- ⚠️ Can improve: Visual hierarchy, interactions

### Recommended Improvements:

#### A. **Zebra Striping**
```css
.materials-table tbody tr:nth-child(odd) {
  background: #F9FAFB;
}
```
- Improves scannability by 20-30%
- Helps users track across rows

#### B. **Row Heights**
- Current: ~16px padding
- Recommendation: Use "Regular" sizing (48px row height)
- Better for touch targets and readability

#### C. **Fixed Header on Scroll**
```css
.materials-table thead {
  position: sticky;
  top: 0;
  background: white;
  z-index: 10;
}
```
- Keeps column labels visible when scrolling
- Critical for mobile/long lists

#### D. **Hover States**
- Already have basic hover
- Add: Row highlighting on hover for better focus

#### E. **Number Alignment**
- ✅ Already doing: Right-aligned numbers
- Good for comparison

#### F. **Interactive Elements**
- Consider: Click row to expand details
- Show formula/calculation for that item
- "Why 78 bundles?" → Shows formula breakdown

### Priority: **Medium** | Impact: **Usability & Professional Look**

---

## 3. Print CSS & PDF Generation

### Current Issues:
- Grand total appearing on every page (fixed!)
- Using html2pdf.js (older, limited)

### Print CSS Best Practices:

#### A. **Page Break Control**
```css
@media print {
  .materials-table {
    page-break-inside: avoid; /* Keep table together */
  }
  
  .section {
    page-break-inside: avoid; /* Don't split sections */
  }
  
  thead {
    display: table-header-group; /* Repeat headers on each page */
  }
  
  .grand-total-row {
    page-break-before: avoid; /* Keep with last item */
  }
}
```

#### B. **Page Margins for Print**
```css
@page {
  size: letter portrait;
  margin: 1in 0.75in;
}

@page :first {
  margin-top: 0.5in; /* Less margin on first page */
}
```

#### C. **Print-Specific Styling**
```css
@media print {
  /* Hide UI elements */
  .btn-primary, .btn-secondary, .actions { display: none; }
  
  /* Show links */
  a[href]:after { content: " (" attr(href) ")"; }
  
  /* Better typography */
  body { font-size: 11pt; line-height: 1.4; }
}
```

### PDF Generation Library Comparison:

| Library | Client/Server | Pros | Cons | Recommendation |
|---------|---------------|------|------|----------------|
| **html2pdf.js** (current) | Client | Easy, HTML-based | Buggy, unmaintained, poor rendering | ❌ Replace |
| **jsPDF** | Client | Lightweight, reliable | Manual layout code | ✅ Good for simple docs |
| **pdfmake** | Both | Declarative, auto-pagination | Learning curve | ✅✅ **Best for our use case** |
| **Puppeteer** | Server | Perfect rendering | Heavy, needs Chrome | ⚠️ Overkill |
| **PDF-lib** | Both | Modify existing PDFs | More complex API | ⚠️ For advanced needs |

#### **Recommendation: Switch to pdfmake**
**Why:**
- Declarative document definition (JSON-like)
- Built-in table support with auto-pagination
- Handles headers/footers automatically
- 35KB gzipped (vs html2pdf's 100KB+)
- Active maintenance
- Perfect for structured reports/invoices

**Migration effort:** ~2-3 hours

**Example:**
```javascript
const docDefinition = {
  content: [
    { text: 'Material List', style: 'header' },
    {
      table: {
        headerRows: 1,
        widths: ['*', 'auto', 'auto', 'auto'],
        body: [
          ['Item', 'Quantity', 'Unit Price', 'Total'],
          ...materialsData.map(item => [
            item.name,
            `${item.quantity} ${item.unit}`,
            `$${item.unitPrice}`,
            `$${item.total}`
          ])
        ]
      }
    },
    { text: `Grand Total: $${grandTotal}`, style: 'total' }
  ],
  styles: {
    header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
    total: { fontSize: 14, bold: true, alignment: 'right' }
  }
};

pdfMake.createPdf(docDefinition).download('material-list.pdf');
```

### Priority: **HIGH** | Impact: **Core Functionality**

---

## 4. Accessibility (WCAG 2.1/2.2)

### Current Gaps:

#### A. **Table Accessibility**
```html
<!-- Add proper scope to headers -->
<th scope="col">Item</th>
<th scope="col">Quantity</th>

<!-- Add caption for screen readers -->
<table>
  <caption class="sr-only">Roofing Materials List</caption>
  ...
</table>
```

#### B. **Form Labels & ARIA**
```html
<!-- Explicit labels for inputs -->
<label for="miscQty1" class="sr-only">Additional Item 1 Quantity</label>
<input id="miscQty1" type="number" aria-label="Quantity" />

<!-- Error announcements -->
<div role="alert" aria-live="assertive" id="errorMessage"></div>
```

#### C. **Keyboard Navigation**
- Add focus indicators
- Tab order should be logical
- ESC to clear/cancel edits

```css
input:focus, select:focus {
  outline: 3px solid #5BA8D4;
  outline-offset: 2px;
}
```

#### D. **Color Contrast**
- Check all text meets WCAG AA (4.5:1 ratio)
- Test with tools like WebAIM Contrast Checker
- Current blue (#5BA8D4) on white = 2.9:1 ⚠️ (fails)
- Darken to #2B7BA3 for 4.5:1 ✅

#### E. **Screen Reader Support**
```html
<!-- Status announcements -->
<div role="status" aria-live="polite" id="calculationStatus">
  Calculation complete: 10 materials, $3,052.50 total
</div>
```

### Priority: **Medium** | Impact: **Legal Compliance & Inclusivity**

---

## 5. Roofing Industry Competitive Analysis

### Top Competitors:

**1. Roofr** (roofr.com)
- Instant estimates from satellite imagery
- CRM integration
- Payment processing
- **Takeaway:** Photos + measurements together

**2. RoofSnap** (roofsnap.com)
- DIY sketch tool
- Good/Better/Best pricing options
- Professional branded PDFs
- **Takeaway:** Multiple pricing tiers for upselling

**3. AccuLynx**
- AI-powered lead intelligence
- Real-time analytics
- **Takeaway:** Data insights from past jobs

**4. iRoofing App**
- Digital catalogs of material brands
- Waste factors, haul-away fees
- **Takeaway:** More comprehensive cost factors

### Features We're Missing:

#### A. **Photo Integration**
- Upload job site photos
- Attach to PDF report
- Before/after capabilities

#### B. **Multiple Pricing Tiers**
- "Good / Better / Best" options
- Different shingle types/brands
- Let customer choose quality level

#### C. **Material Brand Selection**
- Currently: Generic "Landmark PRO"
- Better: Dropdown for CertainTeed, Owens Corning, GAF, etc.
- Different brands = different prices

#### D. **Waste Factor Customization**
- Current: Fixed 10% or 15%
- Better: Let user adjust based on roof complexity

#### E. **Additional Cost Items**
- Haul-away / disposal fees
- Permits
- Labor costs (separate from materials)
- Dump fees

#### F. **Job Notes / Inspection Comments**
- Free text area
- "Existing damage on north side"
- Attach to PDF

#### G. **Customer Contact Info**
- Name, phone, email
- Auto-populate from Ridge Top PDF if available

#### H. **Expiration Date**
- "Quote valid for 30 days"
- Professional touch

### Priority: **Low-Medium** | Impact: **Competitive Advantage**

---

## 6. Mobile Responsiveness

### Current Status: Unknown (need to test)

### Best Practices:

#### A. **Responsive Tables**
```css
@media (max-width: 768px) {
  /* Card-based layout instead of table */
  .materials-table thead { display: none; }
  .materials-table tr {
    display: block;
    margin-bottom: 1rem;
    border: 1px solid #E5E7EB;
  }
  .materials-table td {
    display: block;
    text-align: right;
    padding: 0.5rem;
  }
  .materials-table td:before {
    content: attr(data-label);
    float: left;
    font-weight: bold;
  }
}
```

#### B. **Touch Targets**
- Minimum 44x44px for buttons/inputs
- Adequate spacing between interactive elements

#### C. **Viewport Settings**
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

### Priority: **HIGH** | Impact: **50%+ of users are mobile**

---

## 7. Quick Wins (Can Implement Today)

### 1. **Add Zebra Striping** (5 min)
### 2. **Fix Color Contrast** (10 min)
### 3. **Add Sticky Table Header** (15 min)
### 4. **Add Tooltips for Inputs** (30 min)
### 5. **Print CSS Improvements** (45 min)

### Medium-Term (This Week):
### 6. **Switch to pdfmake** (2-3 hours)
### 7. **Add Mobile Responsiveness** (3-4 hours)
### 8. **Accessibility Improvements** (2-3 hours)

### Long-Term (Next Phase):
### 9. **Photo Upload** (1-2 days)
### 10. **Multiple Pricing Tiers** (2-3 days)
### 11. **Material Brand Selection** (1 day)

---

## 8. Recommended Priority Order

**Phase 1: Fix What's Broken**
1. ✅ Fix PDF generation (switch to pdfmake) - **CRITICAL**
2. ✅ Mobile responsiveness - **HIGH**
3. ✅ Print CSS improvements - **HIGH**

**Phase 2: Polish & Professionalism**
4. Zebra striping, sticky headers, tooltips
5. Color contrast fixes
6. Accessibility improvements

**Phase 3: Competitive Features**
7. Good/Better/Best pricing tiers
8. Photo upload
9. Material brand selection
10. Additional cost items (labor, disposal, permits)

**Phase 4: Advanced**
11. Analytics (track common job sizes, pricing trends)
12. Customer database / CRM light
13. Email quotes directly to customers

---

## Key Resources

- **Calculator UX:** https://www.nngroup.com/articles/recommendations-calculator/
- **Table Design:** https://wpdatatables.com/table-ui-design/
- **PDF Libraries:** https://www.nutrient.io/blog/top-js-pdf-libraries/
- **Print CSS:** https://www.docuseal.com/blog/css-print-page-style
- **WCAG Tables:** https://www.w3.org/WAI/tutorials/tables/
- **Tabulator.js:** https://tabulator.info/ (advanced table library if needed)

---

**Next Steps:**
1. Review these recommendations with Quikbitz
2. Prioritize based on business goals
3. Start with Phase 1 (critical fixes)
4. Iterate based on user feedback
