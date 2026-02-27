const fs = require('fs');
const pdfParse = require('pdf-parse');

const pdfPath = 'C:\\Users\\power\\.openclaw\\media\\inbound\\file_64---a862624e-f737-45af-84f7-752df8da23b6.pdf';

async function parseHeritagePDF() {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdfParse(dataBuffer);
    const text = data.text;
    
    const lines = text.split('\n');
    const lineItems = [];
    
    // Look for line items (numbered items with descriptions)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Match pattern: "1. Description text"
      const itemMatch = line.match(/^(\d+)\.\s+(.+)/);
      if (itemMatch) {
        const itemNum = itemMatch[1];
        let description = itemMatch[2];
        
        // Look ahead for quantity (next few lines typically have QUANTITY UNIT PRICE etc.)
        let quantity = null;
        let unit = null;
        
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const nextLine = lines[j].trim();
          // Look for quantity pattern like "31.45 SQ" or "85.00 LF"
          const qtyMatch = nextLine.match(/^([\d.]+)\s+([A-Z]+)\s/);
          if (qtyMatch) {
            quantity = qtyMatch[1];
            unit = qtyMatch[2];
            break;
          }
        }
        
        lineItems.push({
          item: itemNum,
          description: description,
          quantity: quantity ? `${quantity} ${unit}` : 'N/A'
        });
      }
    }
    
    console.log(JSON.stringify(lineItems, null, 2));
    
  } catch (error) {
    console.error('Parse error:', error.message);
  }
}

parseHeritagePDF();
