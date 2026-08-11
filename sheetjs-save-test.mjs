import * as XLSX from 'xlsx';

const wb = XLSX.utils.book_new();
const ws = {};
ws['A1'] = { t: 's', v: 'Header', w: 'Header' };
ws['A2'] = { t: 's', v: 'World', w: 'World' };
ws['!ref'] = 'A1:A2';
XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

const buf = XLSX.write(wb, { bookType: 'biff8', type: 'array' });
console.log('created .xls bytes:', buf.byteLength);

const loaded = XLSX.read(buf, { type: 'array', cellDates: true, cellFormula: true, codepage: 1252 });
console.log('SheetNames:', loaded.SheetNames);

const hotData = [['Header'], ['Changed value']];
const wsL = loaded.Sheets['Sheet1'];
for (let r = 0; r < hotData.length; r++) {
  for (let c = 0; c < hotData[0].length; c++) {
    const addr = XLSX.utils.encode_cell({ r, c });
    const value = hotData[r][c];
    if (value === '' || value == null) delete wsL[addr];
    else wsL[addr] = { v: value, w: String(value), t: 's' };
  }
}
wsL['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 1, c: 0 } });

const out = XLSX.write(loaded, { bookType: 'biff8', type: 'array' });
console.log('wrote back .xls bytes:', out.byteLength);

const reloaded = XLSX.read(out, { type: 'array' });
console.log('reloaded A2:', reloaded.Sheets['Sheet1']['A2']);
