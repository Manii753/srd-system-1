'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { resolveCosting } from '@/lib/costingGrid';

// ─── number helpers ───────────────────────────────────────────────────────────
const n = (v) => Number(v) || 0;

// show number without trailing zeros; empty string for zero
const fmtN = (v) => {
  const num = n(v);
  if (num === 0) return '';
  return parseFloat(num.toFixed(4)).toString();
};

// always show a number (even 0) for Amount column
const fmtAmt = (v) => {
  const num = n(v);
  return parseFloat(num.toFixed(2)).toString();
};

const fmtUsd = (v) => n(v).toFixed(2);

function rowAmt(row) { return n(row.amount ?? row.consumption * row.price); }
function secSum(rows) { return (rows || []).reduce((s, r) => s + rowAmt(r), 0); }

function calcAll(d) {
  const tFab  = secSum(d.fabrics);
  const tBW   = secSum(d.beforeWashTrims);
  const tAW   = secSum(d.afterWashTrims);
  const tEmb  = secSum(d.embellishment);
  const sub   = tFab + tBW + tAW + tEmb;
  const prod  = sub  + n(d.cmtLevel) + n(d.washingLevel) + n(d.fob);
  // Commission is a % of everything above the margin block
  // (sections + production + Extra Cut + Ld Margin + Testing Charges).
  const base  = prod + n(d.extraCut) + n(d.ldMargin) + n(d.testingCharges);
  const comm  = base * (n(d.commission) / 100);
  const total = base + comm;
  const rate  = n(d.currencyRate) || 265;
  return {
    tFab, tBW, tAW, tEmb,
    base, comm,
    totalPkr: total,
    finalFob: rate > 0 ? total / rate : 0,
    diff: n(d.firstQuoted) - n(d.targetPrice),
  };
}

function assetUrl(entry) {
  if (!entry) return '';
  if (typeof entry === 'string') return entry;
  return entry.url || entry.src || entry.path || '';
}

function PrintContent() {
  const sp     = useSearchParams();
  const srdId  = sp.get('srdId');
  const type   = sp.get('type') || 'post';
  const isPre  = type === 'pre';

  const [d,         setD]         = useState(null);
  const [srd,       setSrd]       = useState(null);
  const [pocNumber, setPocNumber] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  useEffect(() => {
    (async () => {
      if (!srdId) { setError('No costing ID provided.'); setLoading(false); return; }
      try {
        const res  = await fetch(`/api/costing/${srdId}`);
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Failed to load');
        const side = isPre ? json.data?.preCost : json.data?.postCost;
        setD(side || {});
        setSrd(json.srd);
        setPocNumber(json.data?.pocNumber ?? null);
      } catch (e) { setError(e.message); }
      finally     { setLoading(false); }
    })();
  }, [srdId, isPre]);

  useEffect(() => {
    if (!loading && d && !error) {
      const t = setTimeout(() => window.print(), 500);
      return () => clearTimeout(t);
    }
  }, [loading, d, error]);

  if (loading) return <div style={{ padding: 40, fontFamily: 'Arial', fontSize: 13 }}>Loading…</div>;
  if (error)   return <div style={{ padding: 40, fontFamily: 'Arial', fontSize: 13, color: 'red' }}>Error: {error}</div>;
  if (!d)      return null;

  // Resolve any formula cells (=C7*2, =SUM(...), ...) to plain numbers for printing.
  const data = { ...d, ...resolveCosting(d).resolvedData };
  const T = calcAll(data);
  const EC = data.extraCols || [];

  const imageSrc = assetUrl(data.images?.[0]);

  const headerFields = [
    ['Costing Date',   d.date],
    ['Brand',          d.brand],
    ['Fit Specs Code', d.fitSpecsCode],
    ['Fit',            d.fit],
    ['Description',    d.description],
    ['Fabric Type',    d.fabricType],
    ['Embellishment',  d.embellishmentYesNo || ''],
    ['Costing Base',   d.costingBase || ''],
    ['Sample Size',    d.sampleSize],
  ];

  // ── generic SR-style table with headers
  const itemTable = (label, rows, showCode, sectionTotal) => (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <h3 className="text-app-heading font-bold">{label}</h3>
        {sectionTotal > 0 && <span className="font-bold">{fmtAmt(sectionTotal)}</span>}
      </div>
      <table className="w-full border-collapse border border-gray-300 text-app-text">
        <thead>
          <tr className="bg-gray-200">
            <th className="border border-gray-300 p-2 text-left bg-gray-200">Description</th>
            {showCode && <th className="border border-gray-300 p-2 text-left bg-gray-200">Code</th>}
            <th className="border border-gray-300 p-2 text-right bg-gray-200">Cons</th>
            <th className="border border-gray-300 p-2 text-right bg-gray-200">Rate</th>
            <th className="border border-gray-300 p-2 text-right bg-gray-200">Amount</th>
            {EC.map((c) => (
              <th key={c.id} className="border border-gray-300 p-2 text-center bg-gray-200">{c.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(rows || []).map((r, i) => (
            <tr key={i}>
              <td className="border border-gray-300 p-2">{r.description}</td>
              {showCode && <td className="border border-gray-300 p-2">{r.code || ''}</td>}
              <td className="border border-gray-300 p-2 text-right">{fmtN(r.consumption)}</td>
              <td className="border border-gray-300 p-2 text-right">{fmtN(r.price)}</td>
              <td className="border border-gray-300 p-2 text-right font-semibold">{fmtAmt(rowAmt(r))}</td>
              {EC.map((c) => (
                <td key={c.id} className="border border-gray-300 p-2 text-center">{r?.extra?.[c.id] || ''}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Production cost table
  const costTable = (label, rows) => (
    <div className="mb-4">
      <h3 className="text-app-heading font-bold mb-1">{label}</h3>
      <table className="w-full border-collapse border border-gray-300 text-app-text">
        <thead>
          <tr className="bg-gray-200">
            <th className="border border-gray-300 p-2 text-left bg-gray-200">Description</th>
            <th className="border border-gray-300 p-2 text-center bg-gray-200">Code</th>
            <th className="border border-gray-300 p-2 text-right bg-gray-200">Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([rowLabel, level, value], i) => (
            <tr key={i}>
              <td className="border border-gray-300 p-2">{rowLabel}</td>
              <td className="border border-gray-300 p-2 text-center">{level || ''}</td>
              <td className="border border-gray-300 p-2 text-right font-semibold">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Label/value table (2 columns)
  const summaryTable = (label, rows) => (
    <div className="mb-4">
      <h3 className="text-app-heading font-bold mb-1">{label}</h3>
      <table className="w-full border-collapse border border-gray-300 text-app-text">
        <tbody>
          {rows.map(([label, value, opts = {}], i) => (
            <tr key={i} style={opts.bg ? { background: opts.bg } : {}}>
              <td className="border border-gray-300 p-2 font-semibold bg-gray-50 w-1/2" style={opts.labelBold ? { fontWeight: 700 } : {}}>
                {label}
              </td>
              <td className="border border-gray-300 p-2 text-right" style={opts.amountColor ? { color: opts.amountColor, fontWeight: 700 } : { fontWeight: opts.bold ? 700 : 400 }}>
                {value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="p-4 max-w-[297mm] mx-auto print:max-w-none bg-white">
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 8mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .bg-gray-200 {
            background-color: #e5e7eb !important;
          }
          table {
            font-size: 10pt;
          }
          td, th {
            padding: 4px 6px !important;
          }
        }
      `}</style>

      <div className="flex justify-between items-center mb-2 print:hidden">
        <h1 className="text-app-heading font-bold text-lg">{isPre ? 'PRE COSTING FORM' : 'COSTING FORM'}</h1>
        <button
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
        >
          Print / Save as PDF
        </button>
      </div>

      <div className="mb-2">
        <h2 className="text-app-heading font-bold text-center text-lg">{isPre ? 'PRE COSTING FORM' : 'COSTING FORM'}</h2>
        <div className="text-app-text text-center text-gray-600 text-sm">
          {pocNumber ? `POC-${pocNumber}` : srd?.refNo ? srd.refNo : ''} | Currency: {d.currency || 'USD'} | Status: {d.status || 'Draft'}
        </div>
      </div>

      {/* Header Info with Image */}
      <div className="flex gap-4 mb-4">
        <div className="flex-1">
          <table className="w-full border-collapse border border-gray-300 text-app-text">
            <tbody>
              {headerFields.map(([label, value]) => (
                <tr key={label}>
                  <td className="border border-gray-300 p-2 font-semibold bg-gray-50 w-1/3">{label}</td>
                  <td className="border border-gray-300 p-2">{value || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {imageSrc && (
          <div className="flex-shrink-0" style={{ width: '170px', height: '170px' }}>
            <img src={imageSrc} alt="Product" className="w-full h-full object-contain border border-gray-300" />
          </div>
        )}
      </div>

      {/* Fabrics */}
      {itemTable('Fabrics', data.fabrics, true, T.tFab)}

      {/* Before Wash Trims */}
      {itemTable('Before Wash Trims', data.beforeWashTrims, true, T.tBW)}

      {/* After Wash Trims */}
      {itemTable('After Wash Trims', data.afterWashTrims, true, T.tAW)}

      {/* Embellishment */}
      {itemTable('Embellishment', data.embellishment, true, T.tEmb)}

      {/* Production Cost */}
      {costTable('Production Cost', [
        ['Cmt (Codes Req Level 1 2 3)', data.cmtLevelCode || '', fmtAmt(data.cmtLevel)],
        ['Washing (Codes Req Level 1 2 3)', data.washingLevelCode || '', fmtAmt(data.washingLevel)],
        ['Fob', '', fmtAmt(data.fob)],
      ])}

      {/* Margin & Commission */}
      {summaryTable('Margin & Commission', [
        ['Extra Cut', fmtAmt(data.extraCut)],
        ['Ld Margin', fmtAmt(data.ldMargin)],
        ['Testing Charges', fmtAmt(data.testingCharges)],
        ['Commission', n(data.commission) ? `(${n(data.commission)}%) ${fmtAmt(T.comm)}` : fmtAmt(T.comm), { bold: true }],
      ])}

      {/* Summary */}
      {summaryTable('Summary', [
        ['Total Price PKR', Math.round(T.totalPkr).toLocaleString('en-US'), { bold: true }],
        ['Currency (USD / Euro)', String(n(data.currencyRate) || 265)],
        ['Final Fob Us$', '$' + fmtUsd(T.finalFob), { bold: true }],
      ])}

      {/* Quote Tracking */}
      {summaryTable('Quote Tracking', [
        ['First Quoted', '$' + fmtUsd(data.firstQuoted), { bg: '#92d050', labelBold: true, amountColor: '#000' }],
        ['Target $', '$' + fmtUsd(data.targetPrice), { amountColor: '#5b9bd5' }],
        ['Difference', '$' + fmtUsd(T.diff), { amountColor: '#5b9bd5' }],
        ['2nd Quote $', '$' + fmtUsd(data.secondQuote), { bg: '#ffff00', labelBold: true, amountColor: '#f97316' }],
        ['Confirmed', '$' + fmtUsd(data.confirmedPrice), { bg: '#92d050', labelBold: true, amountColor: '#f97316' }],
      ])}

      {/* Notes */}
      {d.notes && (
        <div className="mb-4">
          <table className="w-full border-collapse border border-gray-300 text-app-text">
            <tbody>
              <tr>
                <td className="border border-gray-300 p-2 font-semibold bg-gray-50 w-1/6">Notes</td>
                <td className="border border-gray-300 p-2">{d.notes}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 text-app-text text-gray-500 text-right text-sm">
        Report Generated by MMS
      </div>
    </div>
  );
}

export default function CostingPrintPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, fontFamily: 'Arial', fontSize: 13 }}>Loading…</div>}>
      <PrintContent />
    </Suspense>
  );
}