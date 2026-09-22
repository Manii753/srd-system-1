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
  const wFrt  = prod + n(d.freight);
  const wMgn  = wFrt + wFrt * (n(d.marginPct) / 100);
  const total = wMgn + n(d.extraCut) + n(d.ldMargin) + n(d.testingCharges) + n(d.commission);
  const rate  = n(d.currencyRate) || 265;
  return {
    tFab, tBW, tAW, tEmb,
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

  // ── generic SR-style label/value table (2 columns) ──────────────────────────
  const rowsBy2 = (rows) => (
    <table className="print-table">
      <tbody>
        {rows.map(([label, value, opts = {}], i) => (
          <tr key={i} style={opts.bg ? { background: opts.bg } : {}}>
            <td className="table-field-label" style={opts.labelBold ? { fontWeight: 700 } : {}}>{label}</td>
            <td className="table-field-cell" style={{ textAlign: 'right' }}>
              <span className="table-field-underline" style={opts.amountColor ? { color: opts.amountColor, fontWeight: 700 } : { fontWeight: opts.bold ? 700 : 400 }}>
                {value}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  // ── section block: items table (fabrics with Code, trims/embellishment without) ──
  const itemBlock = (label, rows, showCode, sectionTotal) => (
    <div className="table-block">
      <div className="table-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{label}</span>
        {sectionTotal > 0 && <span style={{ fontWeight: 600 }}>{fmtAmt(sectionTotal)}</span>}
      </div>
      <table className="print-table">
        <thead>
          <tr>
            <th className="table-header" colSpan={showCode ? 1 : 2} style={{ width: showCode ? '30%' : '40%' }}>Description</th>
            <th className="table-header num-right" style={{ width: '15%' }}>Cons</th>
            <th className="table-header num-right" style={{ width: '15%' }}>Rate</th>
            <th className="table-header num-right" style={{ width: EC.length ? '14%' : '30%' }}>Amount</th>
            {EC.map((c) => (
              <th key={c.id} className="table-header" style={{ width: '12%', textAlign: 'center' }}>{c.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(rows || []).map((r, i) => (
            <tr key={i}>
              {showCode ? (
                <td className="table-field-label"><span className="table-field-underline">{r.description}</span></td>
              ) : (
                <td colSpan={showCode ? 1 : 2} className="table-field-label"><span className="table-field-underline">{r.description}</span></td>
              )}
              {showCode && <td className="table-field-cell"><span className="table-field-underline">{r.code || ''}</span></td>}
              <td className="table-field-cell">
                <span className="table-field-underline" style={{ textAlign: 'right', fontWeight: 400 }}>{fmtN(r.consumption)}</span>
              </td>
              <td className="table-field-cell">
                <span className="table-field-underline" style={{ textAlign: 'right', fontWeight: 400 }}>{fmtN(r.price)}</span>
              </td>
              <td className="table-field-cell" style={{ textAlign: 'right' }}>
                <span className="table-field-underline" style={{ fontWeight: 700 }}>{fmtAmt(rowAmt(r))}</span>
              </td>
              {EC.map((c) => (
                <td key={c.id} className="table-field-cell" style={{ textAlign: 'center' }}>
                  <span className="table-field-underline" style={{ fontWeight: 400 }}>{r?.extra?.[c.id] || ''}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="print-page">
      <style>{`
        @page { size: A4; margin: 0.05in; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body {
          background: #fff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          font-size: 10px;
          text-transform: capitalize !important;
          line-height: 1.1;
        }
        .print-page { width: 100%; }

        /* ── header (title left, image right, like the SR print) ── */
        .header {
          margin-top: 4px;
          margin-bottom: 6px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }
        .header-main { flex: 1; min-width: 0; }
        .header h1 {
          font-size: 14px;
          margin: 0 0 3px 0;
          font-weight: 700;
          text-transform: uppercase;
          color: #1a1a1a;
          border-bottom: 1.5px solid #1a1a1a;
          padding-bottom: 2px;
        }
        .header-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 4px 12px;
          font-size: 11px;
          font-weight: 600;
          color: #333;
          margin-top: 2px;
        }
        .header-meta .meta-key { color: #6b7280; font-weight: 600; }
        .header-image { flex-shrink: 0; width: 170px; }
        .header-image-frame {
          width: 170px;
          height: 170px;
          border: 1px solid #d1d5db;
          background: #fff;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .header-image-img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          display: block;
        }
        .header-image-empty {
          font-size: 9px;
          color: #9ca3af;
          font-style: italic;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          text-transform: none;
        }

        /* ── field cells (label + underlined value), like the SR grid ── */
        .info-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 4px 1px;
          margin-bottom: 8px;
        }
        .field-cell {
          grid-column: span 2;
          padding: 2px 0 0 0;
          background: white;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
        }
        .field-cell.is-wide { grid-column: span 6; }
        .cell-content {
          display: flex;
          align-items: flex-start;
          width: 100%;
          gap: 6px;
          height: 100%;
        }
        .cell-label-group { width: 120px; flex-shrink: 0; }
        .cell-label {
          font-size: 11px;
          font-weight: 700;
          color: #333;
          white-space: normal;
          text-transform: capitalize;
          line-height: 10px;
        }
        .cell-underline {
          font-size: 11px;
          color: #000;
          flex-grow: 1;
          border-bottom: 0.4px solid #999;
          min-height: 12px;
          padding: 0 2px;
          display: flex;
          align-items: flex-end;
          white-space: pre-wrap;
          line-height: 1.2;
          word-break: break-word;
        }

        /* ── print tables, like the SR print tables ── */
        .table-block { margin-top: 4px; margin-bottom: 4px; break-inside: avoid; }
        .table-label {
          font-size: 12px;
          font-weight: 700;
          color: #333;
          text-transform: capitalize;
          background: #f3f4f6;
          padding: 2px 4px;
          border-bottom: 1px solid #ddd;
        }
        .print-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
          border: 0.5px solid #ccc;
        }
        .print-table .table-header {
          background-color: #f3f4f6;
          padding: 2px 4px;
          text-align: left;
          font-weight: 700;
          font-size: 11px;
          color: #333;
          text-transform: capitalize;
          border: 0.5px solid #ccc;
        }
        .print-table .table-field-label {
          padding: 2px 4px;
          text-align: left;
          font-size: 11px;
          font-weight: 700;
          color: #333;
          text-transform: capitalize;
          white-space: normal;
          word-break: break-word;
          border: 0.5px solid #ccc;
        }
        .print-table .table-field-cell {
          padding: 2px 4px;
          text-align: left;
          border: 0.5px solid #ccc;
        }
        .print-table .table-field-underline {
          font-size: 11px;
          color: #000;
          display: inline-block;
          width: calc(100% - 5px);
          border-bottom: 0.4px solid #999;
          min-height: 14px;
          padding: 0 2px;
          line-height: 14px;
          white-space: pre-wrap;
        }
        .print-table .num-right { text-align: right; }

        /* ── signature footer, like the SR print ── */
        .footer {
          margin-top: 18px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          font-size: 7px;
        }
        .signature-box {
          border-top: 0.5px solid #000;
          padding-top: 3px;
        }
        .signature-title {
          font-weight: bold;
          margin-bottom: 15px;
          font-size: 11px;
          color: #000;
        }
      `}</style>

      {/* ════════════════════════════════════════
          HEADER  (title + meta left, product image right)
          ════════════════════════════════════════ */}
      <div className="header">
        <div className="header-main">
          <h1>{isPre ? 'Pre Costing Form' : 'Costing Form'}</h1>
          <div className="header-meta">
            {pocNumber
              ? <span><span className="meta-key">POC:</span> POC-{pocNumber}</span>
              : srd?.refNo
                ? <span><span className="meta-key">Ref:</span> {srd.refNo}</span>
                : null}
            <span><span className="meta-key">Currency:</span> {d.currency || 'USD'}</span>
            {d.status && <span><span className="meta-key">Status:</span> {d.status}</span>}
          </div>
        </div>
        <div className="header-image">
          <div className="header-image-frame">
            {imageSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageSrc} alt="Product" className="header-image-img" />
            ) : (
              <span className="header-image-empty">No Image</span>
            )}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════
          INFO FIELDS  (label + underlined values)
          ════════════════════════════════════════ */}
      <div className="info-grid">
        {headerFields.map(([label, value]) => (
          <div key={label} className="field-cell">
            <div className="cell-content">
              <div className="cell-label-group">
                <span className="cell-label">{label}</span>
              </div>
              <span className="cell-underline">{value || ''}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ════════════════════════════════════════
          MASTER COST SECTIONS
          ════════════════════════════════════════ */}

      {/* ── FABRICS ─────────────────────────────── */}
      {itemBlock('Fabrics', data.fabrics, true, T.tFab)}

      {/* ── BEFORE WASH TRIMS ───────────────────── */}
      {itemBlock('Before Wash Trims', data.beforeWashTrims, false, T.tBW)}

      {/* ── AFTER WASH TRIMS ────────────────────── */}
      {itemBlock('After Wash Trims', data.afterWashTrims, false, T.tAW)}

      {/* ── EMBELLISHMENT ───────────────────────── */}
      {itemBlock('Embellishment', data.embellishment, false, T.tEmb)}

      {/* ── PRODUCTION COST ─────────────────────── */}
      <div className="table-block">
        <div className="table-label">Production Cost</div>
        {rowsBy2([
          ['Cmt (Codes Req Level 1 2 3)', fmtAmt(data.cmtLevel)],
          ['Washing (Codes Req Level 1 2 3)', fmtAmt(data.washingLevel)],
          ['Fob', fmtAmt(data.fob)],
        ])}
      </div>

      {/* ── FREIGHT ─────────────────────────────── */}
      <div className="table-block">
        <div className="table-label">Freight</div>
        {rowsBy2([['Freight', fmtAmt(data.freight)]])}
      </div>

      {/* ── MARGIN & COMMISSION ─────────────────── */}
      <div className="table-block">
        <div className="table-label">Margin &amp; Commission</div>
        {rowsBy2([
          ['Percentage %', n(data.marginPct) ? n(data.marginPct) + ' %' : ''],
          ['Extra Cut', fmtAmt(data.extraCut)],
          ['Ld Margin', fmtAmt(data.ldMargin)],
          ['Testing Charges', fmtAmt(data.testingCharges)],
          ['Commission', fmtAmt(data.commission)],
        ])}
      </div>

      {/* ── SUMMARY ─────────────────────────────── */}
      <div className="table-block">
        <div className="table-label">Summary</div>
        {rowsBy2([
          ['Total Price PKR', Math.round(T.totalPkr).toLocaleString('en-US'), { bold: true }],
          ['Currency (USD / Euro)', String(n(data.currencyRate) || 265)],
          ['Final Fob Us$', '$' + fmtUsd(T.finalFob), { bold: true }],
        ])}
      </div>

      {/* ── QUOTE TRACKING ──────────────────────── */}
      <div className="table-block">
        <div className="table-label">Quote Tracking</div>
        {rowsBy2([
          ['First Quoted', '$' + fmtUsd(data.firstQuoted), { bg: '#92d050', labelBold: true, amountColor: '#000' }],
          ['Target $', '$' + fmtUsd(data.targetPrice), { amountColor: '#5b9bd5' }],
          ['Difference', '$' + fmtUsd(T.diff), { amountColor: '#5b9bd5' }],
          ['2nd Quote $', '$' + fmtUsd(data.secondQuote), { bg: '#ffff00', labelBold: true, amountColor: '#f97316' }],
          ['Confirmed', '$' + fmtUsd(data.confirmedPrice), { bg: '#92d050', labelBold: true, amountColor: '#f97316' }],
        ])}
      </div>

      {/* ── NOTES ───────────────────────────────── */}
      {d.notes && (
        <div className="field-cell is-wide" style={{ marginTop: 4 }}>
          <div className="cell-content">
            <div className="cell-label-group">
              <span className="cell-label">Notes</span>
            </div>
            <span className="cell-underline">{d.notes}</span>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          SIGNATURE FOOTER
          ════════════════════════════════════════ */}
      <div className="footer">
        <div className="signature-box">
          <div className="signature-title">Prepared By</div>
        </div>
        <div className="signature-box">
          <div className="signature-title">Checked By</div>
        </div>
        <div className="signature-box">
          <div className="signature-title">Approved By</div>
        </div>
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