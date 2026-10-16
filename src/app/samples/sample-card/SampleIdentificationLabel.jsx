'use client';

import { useState } from 'react';
import { Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Sample Identification Label — 3cm × 5.5cm
 * Compact rows, no excess padding, matches the Excel mockup exactly.
 */
const SampleIdentificationLabel = ({ srd }) => {
  const [isPrinting, setIsPrinting] = useState(false);

  /* ── dynamic field helper ─────────────────────────────────── */
  const getDynField = (...names) => {
    for (const name of names) {
      const f = srd?.dynamicFields?.find((df) => {
        const n = (typeof df.field === 'object' ? df.field?.name : df.name) || '';
        return n.toLowerCase() === name.toLowerCase();
      });
      if (f?.value !== undefined && f?.value !== null && f?.value !== '')
        return String(f.value);
    }
    return '';
  };

  /* ── date formatter ───────────────────────────────────────── */
  const formatDate = (value) => {
    const d = value ? new Date(value) : new Date();
    if (isNaN(d)) return String(value);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  /* ── build rows ───────────────────────────────────────────── */
  const buildRows = () => [
    { label: 'DATE',        value: formatDate(srd?.sampleRequestDate || srd?.createdAt) },
    { label: 'BUYER',       value: getDynField('brand', 'buyer', 'bhw-mr', 'buyer name') },
    { label: 'COLOR',       value: getDynField('wash / color', 'wash/color', 'color', 'colour') },
    { label: 'INQUIRY',     value: srd?.refNo || '' },
    { label: 'FIT',       value: getDynField('fit', 'fit type', 'garment construction') },
    { label: 'S.SIZE',    value: getDynField('sample request size', 'sample size', 'size') },
  ];

  /* ── print handler ────────────────────────────────────────── */
  const handlePrint = () => {
    setIsPrinting(true);
    try {
      const rows = buildRows();

      const rowsHTML = rows
        .map(({ label, value }) => `
          <tr>
            <td class="lbl">${label}</td>
            <td class="val">${value || ''}</td>
          </tr>`)
        .join('');

      const win = window.open('', '_blank');
      if (!win) { alert('Please allow popups to print.'); setIsPrinting(false); return; }

      win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Sample Identification Label</title>
  <style>
    @page {
      size: 3in 5.5in;
      margin: 0;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 3in;
      height: 5.5in;
      font-family: Arial, Helvetica, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      color: #000;
    }

    /* outer border */
    table {
      width: 3in;
      height: 5.5in;
      border-collapse: collapse;
      border: 1.5px solid #000;
      table-layout: fixed;
    }

    tr { height: calc(5.5in / 6); }

    /* label column — wide enough for "S.SIZE" on one line */
    .lbl {
      width: 1.05in;
      border-right: 1px solid #000;
      border-bottom: 1px solid #000;
      padding: 0 5px;
      font-size: 11pt;
      font-weight: 700;
      vertical-align: middle;
      line-height: 1.3;
      white-space: nowrap;
    }

    /* value column */
    .val {
      border-bottom: 1px solid #000;
      padding: 0 8px;
      font-size: 11pt;
      font-weight: 700;
      vertical-align: middle;
      line-height: 1.3;
      word-break: break-word;
    }

    /* last row — no bottom border leaking outside outer box */
    tr:last-child .lbl,
    tr:last-child .val {
      border-bottom: none;
    }
  </style>
</head>
<body>
  <table>
    <tbody>
      ${rowsHTML}
    </tbody>
  </table>
  <script>window.onload = function(){ window.print(); };</script>
</body>
</html>`);

      win.document.close();
      win.focus();
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
      className="h-6 px-2 py-0 text-app-text bg-white text-blue-700 border-white hover:bg-blue-50"
      disabled={isPrinting}
    >
      {isPrinting
        ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Wait...</>
        : <><Printer className="h-3 w-3 mr-1" />Print ID Label</>}
    </Button>
  );
};

export default SampleIdentificationLabel;
