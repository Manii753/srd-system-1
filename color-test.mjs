import ExcelJS from 'exceljs';
import { excelStyleToCss, argbToCss } from './src/lib/excelStyleUtils.js';

const wb = new ExcelJS.Workbook();
const ws = wb.addWorksheet('Sheet1');

ws.getCell('A1').value = 'Header';
ws.getCell('A1').font = { bold: true, color: { argb: 'FFFFFFFF' } };
ws.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };

ws.getCell('A2').value = 'ThemeFill';
ws.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { theme: 4 } };

ws.getCell('A3').value = 'ThemeTint';
ws.getCell('A3').fill = { type: 'pattern', pattern: 'solid', fgColor: { theme: 4, tint: -0.25 } };

ws.getCell('A4').value = 'BgFill';
ws.getCell('A4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEB3B' } };

ws.getCell('A5').value = 'NoFill';

ws.getCell('A6').value = 'Red font';
ws.getCell('A6').font = { color: { theme: 3, tint: -0.249977111117893 } };

ws.getCell('A7').value = 'Standard red';
ws.getCell('A7').font = { color: { argb: 'FFFF0000' } };

ws.getCell('A8').value = 'Bg only fill';
ws.getCell('A8').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '00000000' } };

console.log('=== argbToCss direct ===');
console.log('string FF000000:', argbToCss('FF000000'));
console.log('string #FF0000:', argbToCss('#FF0000'));
console.log('obj argb FF0000:', argbToCss({ argb: 'FF0000' }));

console.log('\n=== excelStyleToCss for cells ===');
for (let r = 1; r <= 8; r++) {
  const cell = ws.getCell(r, 1);
  const css = excelStyleToCss(cell.style);
  console.log(`Row ${r} ("${cell.value}"):`, css);
}

const buf = await wb.xlsx.writeBuffer();
const wb2 = new ExcelJS.Workbook();
await wb2.xlsx.load(buf);
const ws2 = wb2.worksheets[0];
console.log('\n=== Round-trip: styles after write/load ===');
for (let r = 1; r <= 8; r++) {
  const cell = ws2.getCell(r, 1);
  console.log(`Row ${r} ("${cell.value}"):`, excelStyleToCss(cell.style));
}
