'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { resolveCosting } from '@/lib/costingGrid';

// ─── number helpers ───────────────────────────────────────────────────────────
const n = (v) => Number(v) || 0;
const fmtN = (v) => { const num = n(v); if (num === 0) return ''; return parseFloat(num.toFixed(4)).toString(); };
const fmtAmt = (v) => { const num = n(v); return parseFloat(num.toFixed(2)).toString(); };
const fmtUsd = (v) => n(v).toFixed(2);

function rowAmt(row) { return n(row.amount ?? row.consumption * row.price); }
function secSum(rows) { return (rows || []).reduce((s, r) => s + rowAmt(r), 0); }

function calcAll(d) {
  const tFab = secSum(d.fabrics);
  const tBW  = secSum(d.beforeWashTrims);
  const tAW  = secSum(d.afterWashTrims);
  const tEmb = secSum(d.embellishment);
  const sub  = tFab + tBW + tAW + tEmb;
  const prod = sub + n(d.cmtLevel) + n(d.washingLevel) + n(d.fob);
  const base = prod + n(d.extraCut) + n(d.ldMargin) + n(d.testingCharges);
  const comm = base * (n(d.commission) / 100);
  const total = base + comm;
  const rate  = n(d.currencyRate) || 265;
  return {
    tFab, tBW, tAW, tEmb, base, comm,
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
  const sp    = useSearchParams();
  const srdId = sp.get('srdId');
  const type  = sp.get('type') || 'post';
  const isPre = type === 'pre';

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

  const data    = { ...d, ...resolveCosting(d).resolvedData };
  const T       = calcAll(data);
  const EC      = data.extraCols || [];
  const imageSrc = assetUrl(data.images?.[0]);

  // ── SR-form-identical CSS ─────────────────────────────────────────────────
  const css = `
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

    /* ── top header — identical to SR form ── */
    .header {
      margin-top: 10px;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }
    .header-main { flex: 1; min-width: 0; }
    .header h1 {
      font-size: 13px;
      margin: 0 0 5px 0;
      font-weight: 700;
      text-transform: uppercase;
      color: #1a1a1a;
      border-bottom: 1px solid #1a1a1a;
      padding-bottom: 2px;
    }
    .header-meta {
      font-size: 11px;
      color: #555;
      margin-top: 3px;
    }
    .header-image {
      width: 150px;
      flex-shrink: 0;
    }
    .header-image-frame {
      width: 150px;
      height: 100px;
      border: 1px solid #d1d5db;
      background: #fff;
      padding: 2px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .header-image-img { width:100%; height:100%; object-fit:contain; display:block; }

    /* ── section heading — identical to SR form (.heading-content) ── */
    .section-heading {
      font-weight: 700;
      text-transform: capitalize;
      font-size: 13px;
      background-color: #f3f4f6;
      text-align: left;
      width: 100%;
      padding: 4px;
      margin-top: 6px;
      margin-bottom: 2px;
    }

    /* ── field grid (info fields) — identical to SR form ── */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(12, minmax(0, 1fr));
      gap: 4px 1px;
      margin-bottom: 8px;
    }
    .field-cell {
      grid-column: span 4;
      padding: 2px 0 0 0;
      background: white;
      display: flex;
      min-height: 15px;
      flex-direction: column;
      justify-content: flex-start;
    }
    .cell-content {
      display: flex;
      align-items: flex-start;
      width: 100%;
      gap: 4px;
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
      min-height: 10px;
      padding: 0 2px;
      display: flex;
      align-items: center;
      white-space: pre-wrap;
      width: 100%;
      line-height: 1.2;
      margin-right: 10px;
    }

    /* ── tables — identical to SR form (.print-table) ── */
    .tbl-block { margin-top: 4px; margin-bottom: 4px; break-inside: avoid; }
    .tbl-label {
      font-size: 11px;
      font-weight: 700;
      color: #333;
      text-transform: capitalize;
      background: #f3f4f6;
      padding: 2px 4px;
      border-bottom: 1px solid #ddd;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .print-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      border: 0.5px solid #ccc;
    }
    .print-table th {
      background-color: #f3f4f6;
      padding: 2px 4px;
      text-align: left;
      font-weight: 700;
      font-size: 11px;
      color: #333;
      text-transform: capitalize;
      border: 0.5px solid #ccc;
    }
    .print-table th.r { text-align: right; }
    .print-table td {
      padding: 2px 4px;
      border: 0.5px solid #ccc;
      font-size: 11px;
      color: #000;
    }
    .print-table td.r { text-align: right; }
    .print-table td.bold { font-weight: 700; }
    .print-table td.label-col { font-weight: 700; color: #333; }
  `;

  // ── table builders ────────────────────────────────────────────────────────

  const itemTable = (label, rows, sectionTotal) => (
    <div className="tbl-block">
      <div className="tbl-label">
        <span>{label}</span>
        {sectionTotal > 0 && <span>{fmtAmt(sectionTotal)}</span>}
      </div>
      <table className="print-table">
        <thead>
          <tr>
            <th style={{ width: '35%' }}>Description</th>
            <th style={{ width: '20%' }}>Code</th>
            <th className="r" style={{ width: '12%' }}>Cons</th>
            <th className="r" style={{ width: '12%' }}>Rate</th>
            <th className="r" style={{ width: EC.length ? '11%' : '21%' }}>Amount</th>
            {EC.map(c => <th key={c.id} style={{ width: '10%', textAlign: 'center' }}>{c.name}</th>)}
          </tr>
        </thead>
        <tbody>
          {(rows || []).map((r, i) => (
            <tr key={i}>
              <td>{r.description}</td>
              <td>{r.code || ''}</td>
              <td className="r">{fmtN(r.consumption)}</td>
              <td className="r">{fmtN(r.price)}</td>
              <td className="r bold">{fmtAmt(rowAmt(r))}</td>
              {EC.map(c => <td key={c.id} style={{ textAlign: 'center' }}>{r?.extra?.[c.id] || ''}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const costTable = (label, rows) => (
    <div className="tbl-block">
      <div className="tbl-label"><span>{label}</span></div>
      <table className="print-table">
        <thead>
          <tr>
            <th style={{ width: '60%' }}>Description</th>
            <th style={{ width: '20%' }}>Code</th>
            <th className="r" style={{ width: '20%' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([lbl, code, val], i) => (
            <tr key={i}>
              <td>{lbl}</td>
              <td>{code || ''}</td>
              <td className="r bold">{val}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const kvTable = (label, rows) => (
    <div className="tbl-block">
      <div className="tbl-label"><span>{label}</span></div>
      <table className="print-table">
        <tbody>
          {rows.map(([lbl, val, bold], i) => (
            <tr key={i}>
              <td className="label-col" style={{ width: '60%' }}>{lbl}</td>
              <td className={`r${bold ? ' bold' : ''}`}>{val}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // ── info fields (same layout as SR form) ─────────────────────────────────
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

  return (
    <div style={{ width: '100%', padding: '4px' }}>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* ── HEADER — matches SR form exactly ── */}
      <div className="header">
        <div className="header-main">
          <h1>{isPre ? 'Pre Costing Form' : 'Costing Form'}</h1>
          <div className="header-meta">
            {pocNumber
              ? <span>POC-{pocNumber}</span>
              : srd?.refNo ? <span>{srd.refNo}</span> : null}
            {' '}&nbsp;Currency: {d.currency || 'USD'}
            {d.status && <span>&nbsp;&nbsp;Status: {d.status}</span>}
          </div>
        </div>
        <div className="header-image">
          <div className="header-image-frame">
            {imageSrc
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={imageSrc} alt="Product" className="header-image-img" />
              : null}
          </div>
        </div>
      </div>

      {/* ── BASIC INFO — same section-heading style as SR form ── */}
      <div className="section-heading">Basic Info</div>
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

      {/* ── FABRICS ── */}
      <div className="section-heading">Fabrics</div>
      {itemTable('', data.fabrics, T.tFab)}

      {/* ── BEFORE WASH TRIMS ── */}
      <div className="section-heading">Before Wash Trims</div>
      {itemTable('', data.beforeWashTrims, T.tBW)}

      {/* ── AFTER WASH TRIMS ── */}
      <div className="section-heading">After Wash Trims</div>
      {itemTable('', data.afterWashTrims, T.tAW)}

      {/* ── EMBELLISHMENT ── */}
      <div className="section-heading">Embellishment</div>
      {itemTable('', data.embellishment, T.tEmb)}

      {/* ── PRODUCTION COST ── */}
      <div className="section-heading">Production Cost</div>
      {costTable('', [
        ['Cmt (Codes Req Level 1 2 3)', data.cmtLevelCode || '', fmtAmt(data.cmtLevel)],
        ['Washing (Codes Req Level 1 2 3)', data.washingLevelCode || '', fmtAmt(data.washingLevel)],
        ['Fob', '', fmtAmt(data.fob)],
      ])}

      {/* ── MARGIN & COMMISSION ── */}
      <div className="section-heading">Margin &amp; Commission</div>
      {kvTable('', [
        ['Extra Cut',        fmtAmt(data.extraCut),       false],
        ['Ld Margin',        fmtAmt(data.ldMargin),       false],
        ['Testing Charges',  fmtAmt(data.testingCharges), false],
        ['Commission',       n(data.commission) ? `(${n(data.commission)}%) ${fmtAmt(T.comm)}` : fmtAmt(T.comm), true],
      ])}

      {/* ── SUMMARY ── */}
      <div className="section-heading">Summary</div>
      {kvTable('', [
        ['Total Price PKR',        Math.round(T.totalPkr).toLocaleString('en-US'), true],
        ['Currency (USD / Euro)',   String(n(data.currencyRate) || 265),            false],
        ['Final Fob Us$',          '$' + fmtUsd(T.finalFob),                       true],
      ])}

      {/* ── QUOTE TRACKING ── */}
      <div className="section-heading">Quote Tracking</div>
      {kvTable('', [
        ['First Quoted', '$' + fmtUsd(data.firstQuoted),   false],
        ['Target $',     '$' + fmtUsd(data.targetPrice),   false],
        ['Difference',   '$' + fmtUsd(T.diff),             false],
        ['2nd Quote $',  '$' + fmtUsd(data.secondQuote),   false],
        ['Confirmed',    '$' + fmtUsd(data.confirmedPrice), true],
      ])}

      {/* ── NOTES ── */}
      {d.notes && (
        <>
          <div className="section-heading">Notes</div>
          <div style={{ fontSize: 11, padding: '2px 4px', borderBottom: '0.4px solid #999' }}>{d.notes}</div>
        </>
      )}
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
