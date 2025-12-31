import XLSX from 'xlsx-js-style';
const workbook = XLSX.readFile('./plantilla.xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];

console.log('=== Sheet properties ===');
console.log('Keys:', Object.keys(sheet).filter(k => k.startsWith('!')));
console.log('Data validations:', sheet['!dataValidations']);
console.log('\n=== Range ===');
console.log(sheet['!ref']);

// Check sample cells
console.log('\n=== Checking cell B2 ===');
if(sheet.B2) {
  console.log('Value:', sheet.B2.v);
  console.log('Style:', sheet.B2.s);
}

console.log('\n=== Full sheet structure ===');
console.log(JSON.stringify(Object.keys(sheet).slice(0, 20), null, 2));
