'use client';
import { Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const DispatchCardPrint = ({ srd }) => {
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const [fieldsRes, companyRes] = await Promise.all([
        fetch('/api/dispatchCardFields'),
        fetch('/api/company'),
      ]);
      const { dispatchCardFields } = await fieldsRes.json();
      const company = await companyRes.json();

      const dispatchFieldIds = new Set(dispatchCardFields.map(f => f._id.toString()));
      const filteredFields = (srd.dynamicFields || []).filter(df => {
        const id = typeof df.field === 'object' ? df.field?._id?.toString() : df.field?.toString();
        return id && dispatchFieldIds.has(id);
      });

      if (!filteredFields.length) {
        alert('No dispatch card fields found for this SRD.');
        return;
      }

      const renderValue = (field) => {
        const val = field.value;
        if (val === null || val === undefined || val === '') return '-';
        if (field.type === 'boolean') return val ? 'Yes' : 'No';
        if (field.type === 'image') {
          const imgs = Array.isArray(val) ? val : [val];
          return imgs.map(img => {
            const src = typeof img === 'object' ? (img.url || img.path || '') : img;
            return `<img src="${src}" style="max-height:40px;max-width:80px;object-fit:contain;" />`;
          }).join('');
        }
        if (field.type === 'table' && typeof val === 'object' && !Array.isArray(val)) {
          const headers = val.headers || [];
          const rows = val.rows || [];
          if (!headers.length) return '-';
          return `<table style="width:100%;border-collapse:collapse;font-size:9px;">
            <thead><tr>${headers.map(h => `<th style="border:1px solid #000;padding:2px 4px;">${h}</th>`).join('')}</tr></thead>
            <tbody>${rows.map(row => `<tr>${(Array.isArray(row) ? row : []).map(cell => `<td style="border:1px solid #000;padding:2px 4px;">${cell || ''}</td>`).join('')}</tr>`).join('')}</tbody>
          </table>`;
        }
        return String(val);
      };

      const rowsHTML = filteredFields.map(f => `
        <tr>
          <td style="border:1.5px solid #000;padding:4px 8px;font-weight:bold;white-space:nowrap;width:40%;">${f.name || ''}</td>
          <td style="border:1.5px solid #000;padding:4px 8px;text-align:center;">${renderValue(f)}</td>
        </tr>`).join('');

      const logoHTML = company.logo
        ? `<img src="${company.logo}" alt="logo" style="max-height:55px;max-width:110px;object-fit:contain;" />`
        : '<span style="font-size:20px;font-weight:bold;">LOGO</span>';

      const printWindow = window.open('', '_blank');
      if (!printWindow) { alert('Please allow popups to print.'); return; }

      printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Dispatch Card</title>
  <style>
    @page { size: 5in 3in; margin: 0.2in; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 5in;
      font-family: Arial, sans-serif;
      font-size: 10px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  </style>
</head>
<body>
  <table style="width:100%;border-collapse:collapse;">
    <tr>
      <td style="border:1.5px solid #000;border-bottom:none;padding:5px 8px;">
        <div style="font-size:12px;font-weight:bold;">${company.name || 'Company Name'}</div>
      </td>
      <td rowspan="2" style="border:1.5px solid #000;background:yellow;text-align:center;vertical-align:middle;width:1.2in;">${logoHTML}</td>
    </tr>
    <tr>
      <td style="border:1.5px solid #000;border-top:none;padding:5px 8px;">
        <div style="font-size:12px;font-weight:bold;">SAMPLE DISPATCH CARD</div>
      </td>
    </tr>
    ${rowsHTML}
  </table>
  <script>window.onload = () => window.print();</script>
</body>
</html>`);
      printWindow.document.close();
    } catch (err) {
      console.error('Print failed', err);
      alert('Failed to print dispatch card');
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <Button
      onClick={handlePrint}
      size="sm"
      variant="outline"
      className="h-6 px-2 py-0 text-xs bg-white text-blue-700 border-white hover:bg-blue-50"
      disabled={isPrinting}
    >
      {isPrinting ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Wait...</> : <><Printer className="h-3 w-3 mr-1" />Print Dispatch Card</>}
    </Button>
  );
};

export default DispatchCardPrint;
