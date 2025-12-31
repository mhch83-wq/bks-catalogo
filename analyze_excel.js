import XLSX from 'xlsx-js-style';
const workbook = XLSX.readFile('./plantilla.xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];

console.log('=== Data Validations ===');
console.log(sheet['!dataValidations']);

console.log('\n=== Sample cells with validation ===');
// Check cells B2 and G2
if(sheet.B2 && sheet.B2.s && sheet.B2.s.dataValidation) {
  console.log('B2 validation:', JSON.stringify(sheet.B2.s.dataValidation, null, 2));
}

if(sheet.G2 && sheet.G2.s && sheet.G2.s.dataValidation) {
  console.log('G2 validation:', JSON.stringify(sheet.G2.s.dataValidation, null, 2));
}

console.log('\n=== First few rows ===');
const range = XLSX.utils.decode_range(sheet['!ref']);
for(let R = 1; R <= Math.min(range.e.r, 5); R++) {
  const estadoCell = XLSX.utils.encode_cell({ r: R, c: 1 });
  const registradaCell = XLSX.utils.encode_cell({ r: R, c: 6 });
  console.log(`Row ${R}:`);
  if(sheet[estadoCell]) {
    console.log(`  Estado: ${sheet[estadoCell].v}, validation:`, sheet[estadoCell].s?.dataValidation);
  }
  if(sheet[registradaCell]) {
    console.log(`  Registrada: ${sheet[registradaCell].v}, validation:`, sheet[registradaCell].s?.dataValidation);
  }
}
