import * as XLSX from 'xlsx';

const wb = XLSX.utils.book_new();
const ws = {};
const a1 = { t: 's', v: 'Header', w: 'Header' };
a1.s = {
  font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFFFF' } },
  fill: { patternType: 'solid', fgColor: { rgb: 'FF4472C4' } },
  alignment: { horizontal: 'center' },
};
ws['A1'] = a1;
ws['!ref'] = 'A1:A1';
XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

const buf = XLSX.write(wb, { bookType: 'xls', type: 'array' });

const wb2 = XLSX.read(buf, { type: 'array', cellStyles: true, cellNF: true });
const ws2 = wb2.Sheets['Sheet1'];
console.log('cell keys:', Object.keys(ws2).filter(k => k[0] !== '!'));
console.log('A1:', ws2['A1']);
console.log('!sidx:', ws2['A1'] && ws2['A1'].sidx);
console.log('workbook keys:', Object.keys(wb2));

// Also test xlsx round trip
const buf3 = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
const wb3 = XLSX.read(buf3, { type: 'array', cellStyles: true });
const ws3 = wb3.Sheets['Sheet1'];
console.log('--- xlsx roundtrip ---');
console.log('A1.s:', ws3['A1']?.s);
