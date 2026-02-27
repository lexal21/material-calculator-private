const fs = require('fs');
const pdf = require('pdf-parse-fork');

const pdfPath = '../Colleran_Loss.pdf';
const dataBuffer = fs.readFileSync(pdfPath);

pdf(dataBuffer).then(data => {
  console.log(data.text);
});
