import XLSX from 'xlsx';
const workbook = XLSX.readFile('/Users/manuchalud/Downloads/Bks excel/Catalogo_BKS.xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];

console.log('Rows:', Object.keys(sheet).filter(k => !k.startsWith('!')));

// Check a few cells for colors
const cells = ['A1', 'A2', 'A3', 'A4'];
cells.forEach(cell => {
  const s = sheet[cell];
  if(s && s.s) {
    console.log(`${cell}:`, JSON.stringify(s.s, null, 2));
  }
});
