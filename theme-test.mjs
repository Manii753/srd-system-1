import ExcelJS from 'exceljs';

const wb = new ExcelJS.Workbook();
const ws = wb.addWorksheet('Sheet1');
for (let t = 0; t < 10; t++) {
  ws.getCell(t + 1, 1).value = `theme ${t}`;
  ws.getCell(t + 1, 1).font = { color: { theme: t, tint: 0 } };
  ws.getCell(t + 1, 2).value = 'fill';
  ws.getCell(t + 1, 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { theme: t } };
}

const buf = await wb.xlsx.writeBuffer();
const wb2 = new ExcelJS.Workbook();
await wb2.xlsx.load(buf);
const ws2 = wb2.worksheets[0];
for (let t = 0; t < 10; t++) {
  const cell = ws2.getCell(t + 1, 1);
  console.log(`theme ${t}: font.color=${JSON.stringify(cell.font?.color)} fill.fgColor=${JSON.stringify(cell.fill?.fgColor)}`);
}
