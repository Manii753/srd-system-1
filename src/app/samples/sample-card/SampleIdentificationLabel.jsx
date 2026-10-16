'use client';

import { useState } from 'react';
import { Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Sample Identification Label
 * Prints a 3cm × 5.5cm label with:
 *   DATE | BUYER | COLOR | INQUIRY | FIT | SAMPLE SIZE
 */
const SampleIdentificationLabel = ({ srd }) => {
  const [isPrinting, setIsPrinting] = useState(false);

  /* ── helpers ─────────────────────────────────────────────── */
  const getDynField = (srd, ...names) => {
    for (const name of names) {
      const f = srd?.dynamicFields?.find((df) => {
        const n = typeof df.field === 'object' ? df.field?.name : df.name;
        return n?.toLowerCase() === name.toLowerCase();
      });
      if (f?.value !== undefined && f?.value !== null && f?.value !== '') {
        return String(f.value);
      }
    }
    return '';
  };

  const formatDate = (value) => {
    if (!value) return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const d = new Date(value);
    if (isNaN(d)) return String(value);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  /* ── collect label rows ──────────────────────────────────── */
  const buildRows = () => {
    const date    = formatDate(srd?.createdAt || srd?.sampleRequestDate);
    const buyer   = getDynField(srd, 'brand', 'buyer', 'bhw-mr', 'buyer name');
    const color   = getDynField(srd, 'wash / color', 'wash/color', 'color', 'colour');
    const inquiry = srd?.refNo || '';
    const fit     = getDynField(srd, 'fit', 'fit type', 'garment construction');
    const size    = getDynField(srd, 'sample request size', 'sample size', 'size');

    return [
      { label: 'DATE',        value: date },
      { label: 'BUYER',       value: buyer },
      { label: 'COLOR',       value: color },
      { label: 'INQUIRY',     value: inquiry },
      { label: 'FIT',         value: fit },
      { label: 'SAMPLE SIZE', value: size },
    ];
  };

  /* ── print ───────────────────────────────────────────────── */
  const handlePrint = () => {
    setIsPrinting(true);
    try {
      const rows = buildRows();

      const rowsHTML = rows
        .map(
          ({ label, value }) => `
          <div class="row">
            <div class="lbl">${label}</div>
            <div class="val">${value || '—'}</div>
          </div>`
        )
        .join('');

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups to print.');
        setIsPrinting(false);
        return;
      }

      printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Sample Identification Label</title>
  <style>
    /* ── page: exact label size ── */
    @page {
      size: 3cm 5.5cm;
      margin: 0;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 3cm;
      height: 5.5cm;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 6.5pt;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      color: #000;
    }

    /* ── label card ── */
    .card {
      width: 3cm;
      height: 5.5cm;
      border: 1px solid #000;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* ── each field row ── */
    .row {
      display: flex;
      flex: 1;
      border-bottom: 1px solid #000;
      min-height: 0;
    }
    .row:last-child {
      border-bottom: none;
    }

    /* ── label cell ── */
    .lbl {
      width: 38%;
      padding: 0.6mm 1mm;
      font-weight: 700;
      font-size: 6pt;
      border-right: 1px solid #000;
      display: flex;
      align-items: center;
      line-height: 1.2;
      word-break: break-word;
    }

    /* ── value cell ── */
    .val {
      flex: 1;
      padding: 0.6mm 1mm;
      font-size: 6.5pt;
      font-weight: 600;
      display: flex;
      align-items: center;
      line-height: 1.2;
      word-break: break-word;
    }
  </style>
</head>
<body>
  <div class="card">
    ${rowsHTML}
  </div>
  <script>
    window.onload = function () { window.print(); };
  </script>
</body>
</html>`);

      printWindow.document.close();
      printWindow.focus();
    } catch (err) {
      console.error('Label print failed', err);
      alert('Failed to print identification label');
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <Button
      onClick={handlePrint}
      size="sm"
      variant="outline"
      className="h-6 px-2 py-0 text-blue-700 border-blue-300 bg-white hover:bg-blue-50"
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
          Print ID Label
        </>
      )}
    </Button>
  );
};

export default SampleIdentificationLabel;
