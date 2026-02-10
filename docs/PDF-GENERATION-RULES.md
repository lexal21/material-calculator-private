# PDF Generation Rules

## pdfmake Async Handling

- **pdfmake cannot handle Promises in content arrays**
- If using async operations (like loading images), **load them BEFORE building the docDefinition**, not inside it
- When using async functions in PDF generation, **ALL calling functions** (printResults, generatePDF, etc.) must also be async and await the result

## pdfmake Styling Limitations

- **pdfmake table cell fillColor doesn't always render properly**
- Use `canvas` with `absolutePosition` for reliable background colors
- For cover photos, use simple layouts
- Complex two-column branded designs are hard to get right in pdfmake

## Variable Naming Consistency

- Be consistent with variable names across functions
- If you define `jobAddress`, don't reference it as `address` elsewhere
- When adding new variables to a function, search the entire function for any existing references that need updating

## Photo Storage in Material Calculator

- Photos are stored in `window.currentPhotos.materials` and `window.currentPhotos.labor`
- **NOT** in `project.photos`
- Always check where data is actually stored before writing functions that access it

## Logo/Image File Transparency

- Transparent PNGs show checkerboard pattern in editors
- Solid color background means NO transparency
- **Black background is NOT the same as transparent**
- `remove.bg` works better on **WHITE backgrounds** than black backgrounds
- For logos on dark backgrounds:
  - Either get true transparency
  - OR match the background color exactly

## Lessons from QuikBitz Branded Cover Page Attempt

The QuikBitz branded cover page was reverted because:

1. Complex two-column layout was difficult to perfect in pdfmake
2. Logo transparency issues on dark backgrounds
3. Canvas backgrounds with absolutePosition were finicky
4. Simple cover photo layout is more reliable and maintainable
5. Async logo loading added complexity throughout the codebase

**Decision:** Keep cover pages simple until pdfmake limitations are better understood.
