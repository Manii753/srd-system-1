'use client';
import { Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const DispatchCardPrint = ({ srd, departmentValue, dispatchDate }) => {
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const [fieldsRes, companyRes, buyerRes] = await Promise.all([
        fetch('/api/dispatchCardFields'),
        fetch('/api/company'),
        srd.BuyerDetails && typeof srd.BuyerDetails === 'object' 
          ? Promise.resolve({ json: async () => ({ success: true, data: srd.BuyerDetails }) })
          : srd.BuyerDetails 
            ? fetch(`/api/buyers/${srd.BuyerDetails}`)
            : Promise.resolve({ json: async () => ({ success: false }) })
      ]);
      const { dispatchCardFields } = await fieldsRes.json();
      const company = await companyRes.json();
      const buyerData = await buyerRes.json();
      const buyer = buyerData.success ? buyerData.data : null;

      const dispatchFieldIds = new Set(dispatchCardFields.map(f => f._id.toString()));
      const filteredFields = (srd.dynamicFields || []).filter(df => {
        const id = typeof df.field === 'object' ? df.field?._id?.toString() : df.field?.toString();
        return id && dispatchFieldIds.has(id);
      });

      // Add Date, Buyer and Department as first rows if available
      const extraRows = [];
      
      // Format and display dispatch date if available
      if (dispatchDate) {
        try {
          const date = new Date(dispatchDate);
          if (!isNaN(date.getTime())) {
            const formattedDate = date.toLocaleDateString('en-GB', { 
              day: '2-digit', 
              month: 'short', 
              year: 'numeric' 
            });
            extraRows.push({ name: 'Date', value: formattedDate, type: 'text' });
          }
        } catch (e) {
          console.error('Error formatting date:', e);
        }
      }
      
      // Get brand name from dynamic fields
      const brandField = srd.dynamicFields?.find(f => {
        const fieldName = typeof f.field === 'object' ? f.field?.name : f.name;
        return fieldName?.toLowerCase() === 'brand';
      });
      const brandName = brandField?.value || buyer?.name || '';
      
      if (brandName) {
        extraRows.push({ name: 'Buyer', value: brandName, type: 'text' });
      }
      
      // Use passed department value or buyer department
      const deptValue = departmentValue || buyer?.department || '';
      
      // Always add Department row (even if empty - will show as dash)
      extraRows.push({ name: 'Department', value: deptValue || '—', type: 'text' });

      if (!filteredFields.length && !extraRows.length) {
        alert('No dispatch card fields found for this SRD.');
        return;
      }

      // Find and add Color field from "Wash / Color" dynamic field
      const washColorField = srd.dynamicFields?.find(f => {
        const fieldName = typeof f.field === 'object' ? f.field?.name : f.name;
        return fieldName?.toLowerCase() === 'wash / color' || 
               fieldName?.toLowerCase() === 'wash/color' ||
               fieldName?.toLowerCase() === 'color';
      });
      
      if (washColorField?.value) {
        extraRows.push({ name: 'Color', value: washColorField.value, type: 'text' });
      }

      const renderValue = (field) => {
        const val = field.value;
        if (val === null || val === undefined || val === '') return '—';
        if (field.type === 'boolean') return val ? 'Yes' : 'No';
        if (field.type === 'image') {
          const imgs = Array.isArray(val) ? val : [val];
          return imgs.map(img => {
            const src = typeof img === 'object' ? (img.url || img.path || '') : img;
            return `<img src="${src}" style="max-height:8mm;max-width:25mm;object-fit:contain;margin:0.5mm;" />`;
          }).join('');
        }
        if (field.type === 'table' && typeof val === 'object' && !Array.isArray(val)) {
          const headers = val.headers || [];
          const rows = val.rows || [];
          if (!headers.length) return '—';
          return `<table style="width:100%;border-collapse:collapse;font-size:6pt;margin:0.5mm 0;">
            <thead><tr>${headers.map(h => `<th style="border:0.5px solid #999;padding:0.5mm 1mm;background:#f5f5f5;font-size:6pt;">${typeof h === 'object' ? (h.name || '') : h}</th>`).join('')}</tr></thead>
            <tbody>${rows.map(row => `<tr>${(Array.isArray(row) ? row : []).map(cell => `<td style="border:0.5px solid #999;padding:0.5mm 1mm;font-size:6pt;">${cell || ''}</td>`).join('')}</tr>`).join('')}</tbody>
          </table>`;
        }
        return String(val);
      };

      // Map field names for display - rename "Sample Request Size" to "Sample Size"
      // Also filter out "Brand" field since it's duplicate of Buyer
      const rowsHTML = filteredFields
        .filter(f => f.name !== 'Brand') // Remove Brand field
        .map(f => {
          const displayName = f.name === 'Sample Request Size' ? 'Sample Size' : f.name;
          return `
        <div class="info-row">
          <div class="label">${displayName || ''}</div>
          <div class="value value-highlight">${renderValue(f)}</div>
        </div>`;
        }).join('');

      // Prepend buyer and department rows
      const allRowsHTML = [
        ...extraRows.map(r => `
          <div class="info-row">
            <div class="label">${r.name}</div>
            <div class="value value-highlight">${r.value}</div>
          </div>`),
        rowsHTML
      ].join('');

      const printWindow = window.open('', '_blank');
      if (!printWindow) { alert('Please allow popups to print.'); return; }

      printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Dispatch Card</title>
  <style>
    @page { size: 9cm 9cm; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 9cm;
      height: 6.5cm;
      font-family: 'Arial', 'Helvetica', sans-serif;
      font-size: 8pt;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      color: #000;
      line-height: 1.2;
    }
    .card {
      width: 6.5cm;
      border: 2px solid #000;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .spacer {
      padding: 2.5mm 2mm;
      border-bottom: 2px solid #000;
    }
    .content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .info-row {
      display: flex;
      border-bottom: 1px solid #ddd;
      min-height: 5.5mm;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .label {
      width: 35%;
      background: #f0f0f0;
      padding: 1mm 1.5mm;
      font-weight: 600;
      font-size: 7pt;
      border-right: 1px solid #ddd;
      display: flex;
      align-items: center;
    }
    .value {
      flex: 1;
      padding: 1mm 1.5mm;
      font-size: 7.5pt;
      display: flex;
      align-items: center;
      word-break: break-word;
    }
    .value-highlight {
      font-weight: 600;
      color: #000;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="spacer"></div>
    <div class="content">
      ${allRowsHTML}
    </div>
  </div>
  <script>window.print();</script>
</body>
</html>`);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => { try { printWindow.print(); } catch(e) {} }, 300);
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
      className="h-6 px-2 py-0 text-app-text bg-white text-blue-700 border-white hover:bg-blue-50"
      disabled={isPrinting}
    >
      {isPrinting ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Wait...</> : <><Printer className="h-3 w-3 mr-1" />Print Dispatch Card</>}
    </Button>
  );
};

export default DispatchCardPrint;
