import { Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const DispatchCardPrint = ({ srd }) => {
  const [isPrinting, setIsPrinting] = useState(false)

  const handlePrint = async () => {
    setIsPrinting(true)
    try {
      const res = await fetch('/api/dispatchCardFields')
      const { dispatchCardFields } = await res.json()
      // Build a set of Field _ids that are marked inDispatchCard
      const dispatchFieldIds = new Set(dispatchCardFields.map(f => f._id.toString()))
      // Match them against the SRD's dynamicFields
      const filteredFields = srd.dynamicFields.filter(df => {
        const fieldId = typeof df.field === 'object' ? df.field?._id?.toString() : df.field?.toString()
        return fieldId && dispatchFieldIds.has(fieldId)
      })

      if (filteredFields.length === 0) {
        alert('No dispatch card fields found for this SRD.')
        setIsPrinting(false)
        return
      }

      // Build value display for each field
      const renderValue = (field) => {
        const val = field.value
        if (val === null || val === undefined || val === '') return '-'

        if (field.type === 'boolean') {
          return val ? 'Yes' : 'No'
        }
        if (field.type === 'image') {
          if (Array.isArray(val)) {
            return val.map(img => `<img src="${img}" class="field-image" />`).join('')
          }
          if (typeof val === 'string' && val) {
            return `<img src="${val}" class="field-image" />`
          }
          return '-'
        }
        if (field.type === 'table') {
          if (typeof val === 'object' && !Array.isArray(val)) {
            const headers = Array.isArray(val.headers) ? val.headers : []
            const rows = Array.isArray(val.rows) ? val.rows : []
            if (headers.length === 0) return '-'
            return `
              <table class="field-table">
                <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
                <tbody>${rows.map(row =>
                  `<tr>${(Array.isArray(row) ? row : []).map(cell => `<td>${cell || ''}</td>`).join('')}</tr>`
                ).join('')}</tbody>
              </table>
            `
          }
          return '-'
        }

        return String(val)
      }

      // Build rows HTML
      const rowsHTML = filteredFields.map(field => `
        <tr>
          <td class="label-cell">${field.name || 'Unnamed'}</td>
          <td class="value-cell">${renderValue(field)}</td>
        </tr>
      `).join('')

      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        alert('Please allow popups to print the dispatch card.')
        setIsPrinting(false)
        return
      }

      const printContent = `<!DOCTYPE html>
<html>
<head>
  <title>Dispatch Card - ${srd.refNo || ''}</title>
  <style>
    @page {
      size: A4;
      margin: 0.4in;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 12px;
      margin: 0;
      padding: 20px;
      color: #1a1a1a;
      -webkit-print-color-adjust: exact;
      color-adjust: exact;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 2px solid #1a1a1a;
      padding-bottom: 10px;
    }
    .header h1 {
      font-size: 18px;
      margin: 0 0 4px 0;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .header .ref-no {
      font-size: 14px;
      font-weight: 600;
      color: #333;
    }
    .dispatch-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    .dispatch-table th {
      background: #f3f4f6;
      text-align: left;
      padding: 8px 10px;
      font-size: 12px;
      font-weight: 700;
      border: 1px solid #d1d5db;
      text-transform: uppercase;
    }
    .dispatch-table .label-cell {
      width: 35%;
      font-weight: 600;
      padding: 6px 10px;
      border: 1px solid #d1d5db;
      background: #fafafa;
      vertical-align: top;
      text-transform: capitalize;
    }
    .dispatch-table .value-cell {
      padding: 6px 10px;
      border: 1px solid #d1d5db;
      vertical-align: top;
      text-transform: capitalize;
    }
    .field-image {
      max-width: 200px;
      max-height: 150px;
      object-fit: contain;
      margin: 4px 2px;
    }
    .field-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    .field-table th {
      background: #e5e7eb;
      padding: 4px 6px;
      border: 1px solid #d1d5db;
      font-weight: 600;
      text-align: left;
    }
    .field-table td {
      padding: 4px 6px;
      border: 1px solid #d1d5db;
    }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Dispatch Card</h1>
    <div class="ref-no">SRD Ref: ${srd.refNo || 'N/A'}</div>
    ${srd.title ? `<div style="font-size: 13px; margin-top: 4px;">${srd.title}</div>` : ''}
  </div>
  <table class="dispatch-table">
    <thead>
      <tr>
        <th>Field</th>
        <th>Value</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHTML}
    </tbody>
  </table>
</body>
</html>`

      printWindow.document.write(printContent)
      printWindow.document.close()
    } catch (err) {
      console.error('Failed to print dispatch card', err)
      alert('Failed to print dispatch card')
    } finally {
      setIsPrinting(false)
    }
  }

  return (
    <Button
      onClick={handlePrint}
      size="sm"
      variant="outline"
      className="h-6 px-2 py-0 text-xs bg-white text-blue-700 border-white hover:bg-blue-50"
      disabled={isPrinting}
    >
      {isPrinting ? (
        <>
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Wait...
        </>
      ) : (
        <>
          <Printer className="h-3 w-3 mr-1" />
          Print Dispatch Card
        </>
      )}
    </Button>
  );
}

export default DispatchCardPrint;