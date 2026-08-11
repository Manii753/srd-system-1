import ExcelJS from 'exceljs';

const wb = new ExcelJS.Workbook();
const ws = wb.addWorksheet('Sheet1');
ws.getCell('A1').value = 'Hello';
ws.getCell('A1').font = { bold: true, color: { argb: 'FFFFFFFF' } };
ws.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
ws.getCell('A2').value = 'World';
ws.getCell('A2').value = null;
ws.getCell('B1').value = 123;

const buf1 = await wb.xlsx.writeBuffer();
console.log('First write OK, bytes:', buf1.byteLength);

// Simulate what ExcelPreview does: load, modify values, write back
const wb2 = new ExcelJS.Workbook();
await wb2.xlsx.load(buf1);
const ws2 = wb2.worksheets[0];

// Simulate syncHotToWorksheet writing cell values
ws2.getCell(1, 1).value = 'Changed';
ws2.getCell(1, 2).value = null;
ws2.getCell(2, 2).value = 'New cell';

// Apply a style like applyCellStyle does
ws2.getCell(1, 1).font = { ...ws2.getCell(1, 1).font, color: { argb: 'FFFF0000' } };

const buf2 = await wb2.xlsx.writeBuffer();
console.log('Second write OK, bytes:', buf2.byteLength);

// Round trip check
const wb3 = new ExcelJS.Workbook();
await wb3.xlsx.load(buf2);
const ws3 = wb3.worksheets[0];
console.log('A1 value:', ws3.getCell('A1').value, '| A1 color:', ws3.getCell('A1').font?.color);
console.log('B2 value:', ws3.getCell('B2').value);
