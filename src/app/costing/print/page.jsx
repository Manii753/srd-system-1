'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { resolveCosting } from '@/lib/costingGrid';

// ─── number helpers ───────────────────────────────────────────────────────────
const n  = (v) => Number(v) || 0;
const fmtN   = (v) => { const x = n(v); return x === 0 ? '' : parseFloat(x.toFixed(4)).toString(); };
const fmtAmt = (v) => parseFloat(n(v).toFixed(2)).toString();
const fmtUsd = (v) => n(v).toFixed(2);

function rowAmt(r) { return n(r.amount ?? r.consumption * r.price); }
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
  return { tFab, tBW, tAW, tEmb, base, comm,
    totalPkr: total,
    finalFob: rate > 0 ? total / rate : 0,
    diff: n(d.firstQuoted) - n(d.targetPrice),
  };
}

function assetUrl(e) {
  if (!e) return '';
  if (typeof e === 'string') return e;
  return e.url || e.src || e.path || '';
}

// ─── EXACT SR-form CSS ────────────────────────────────────────────────────────
const SR_CSS = `
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

  /* ── header — identical to SR form ── */
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
  .header-qr {
    width: 150px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .header-qr-frame {
    width: 150px;
    height: 100px;
    border: 1px solid #d1d5db;
    background: #fff;
    padding: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .header-qr-image { width:100%; height:100%; object-fit:contain; display:block; }

  /* ── template grid — same as SR form (gridColumns * 2 = 12 cols) ── */
  .template-grid {
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
    gap: 4px 1px;
    margin-bottom: 10px;
  }

  /* ── field cell — exact copy ── */
  .field-cell {
    padding: 2px 0 0 0;
    background: white;
    display: flex;
    min-height: 15px !important;
    flex-direction: column;
    justify-content: flex-start;
  }
  .cell-heading {
    background-color: #f3f4f6;
    justify-content: start;
    align-items: center;
  }
  .heading-content {
    font-weight: 700;
    text-transform: capitalize;
    font-size: 13px;
    background-color: #f3f4f6;
    text-align: left;
    width: 100%;
    padding: 4px;
  }
  .cell-content {
    display: flex;
    align-items: flex-start;
    width: 100%;
    gap: 4px;
    height: 100%;
  }
  .cell-label-group {
    width: 120px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .cell-label {
    width: 120px;
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

  /* ── image cell — exact copy ── */
  .cell-image { padding: 1px; height: auto; }
  .cell-image-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  .image-label {
    font-size: 11px;
    font-weight: 700;
    color: #333;
    text-transform: capitalize;
    padding: 1px 2px;
    background: #f9f9f9;
    border-bottom: 0.5px solid #ddd;
    flex-shrink: 0;
  }
  .image-stack {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 4px;
    width: 100%;
    align-content: start;
  }
  .img-wrapper {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    min-height: 72px;
    aspect-ratio: 4 / 3;
    border: 0.5px solid #ddd;
    background: #fff;
  }
  .img-print {
    max-width: 100%;
    max-height: 100%;
    width: 100%;
    height: 100%;
    display: block;
    object-fit: contain;
  }

  /* ── table cell — exact copy ── */
  .cell-table { padding: 1px; height: auto; }
  .cell-table-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  .table-label {
    font-size: 12px;
    font-weight: 700;
    color: #333;
    text-transform: capitalize;
    padding: 0px;
    flex-shrink: 0;
  }
  .print-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
    margin-top: 8px;
    border: none;
  }
  .print-table .table-header {
    background-color: #f3f4f6;
    border: none;
    padding: 2px 3px;
    text-align: left;
    font-weight: 700;
    font-size: 11px;
    color: #333;
    text-transform: capitalize;
  }
  .print-table .table-header.r { text-align: right; }
  .print-table .table-field-label {
    padding: 2px 3px;
    text-align: left;
    font-size: 11px;
    font-weight: 700;
    color: #333;
    text-transform: capitalize;
    white-space: normal;
    word-break: break-word;
    border: none;
  }
  .print-table .table-field-cell {
    padding: 2px 3px;
    text-align: left;
    border: none;
  }
  .print-table .table-field-cell.r { text-align: right; }
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
  .print-table .table-field-underline.bold { font-weight: 700; }

  /* section total — floated right next to section name */
  .section-total {
    font-size: 11px;
    font-weight: 700;
    color: #000;
    float: right;
  }
`;

// ─── Field helper ─────────────────────────────────────────────────────────────
function Field({ label, value }) {
  return (
    <div className="field-cell" style={{ gridColumn: 'span 4' }}>
      <div className="cell-content">
        <div className="cell-label-group">
          <span className="cell-label">{label}</span>
        </div>
        <span className="cell-underline">{value || ''}</span>
      </div>
    </div>
  );
}

// ─── Section heading spanning full 12 cols ────────────────────────────────────
function SectionHead({ title, total }) {
  return (
    <div className="field-cell cell-heading" style={{ gridColumn: 'span 12' }}>
      <div className="heading-content">
        {title}
        {total != null && total > 0 && (
          <span className="section-total">{fmtAmt(total)}</span>
        )}
      </div>
    </div>
  );
}

// ─── Items table (Fabrics / Trims / Embellishment) ────────────────────────────
function ItemTable({ rows, EC }) {
  return (
    <div className="field-cell cell-table" style={{ gridColumn: 'span 12' }}>
      <div className="cell-table-container">
        <table className="print-table">
          <thead>
            <tr>
              <th className="table-header" style={{ width: '35%' }}>Description</th>
              <th className="table-header" style={{ width: '20%' }}>Code</th>
              <th className="table-header r" style={{ width: '12%' }}>Cons</th>
              <th className="table-header r" style={{ width: '12%' }}>Rate</th>
              <th className="table-header r" style={{ width: EC.length ? '11%' : '21%' }}>Amount</th>
              {EC.map(c => (
                <th key={c.id} className="table-header" style={{ width: '10%', textAlign: 'center' }}>{c.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(rows || []).map((r, i) => (
              <tr key={i}>
                <td className="table-field-label">
                  <span className="table-field-underline">{r.description}</span>
                </td>
                <td className="table-field-cell">
                  <span className="table-field-underline">{r.code || ''}</span>
                </td>
                <td className="table-field-cell r">
                  <span className="table-field-underline" style={{ textAlign: 'right' }}>{fmtN(r.consumption)}</span>
                </td>
                <td className="table-field-cell r">
                  <span className="table-field-underline" style={{ textAlign: 'right' }}>{fmtN(r.price)}</span>
                </td>
                <td className="table-field-cell r">
                  <span className="table-field-underline bold" style={{ textAlign: 'right' }}>{fmtAmt(rowAmt(r))}</span>
                </td>
                {EC.map(c => (
                  <td key={c.id} className="table-field-cell" style={{ textAlign: 'center' }}>
                    <span className="table-field-underline">{r?.extra?.[c.id] || ''}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Production cost table ────────────────────────────────────────────────────
function CostTable({ rows }) {
  return (
    <div className="field-cell cell-table" style={{ gridColumn: 'span 12' }}>
      <div className="cell-table-container">
        <table className="print-table">
          <thead>
            <tr>
              <th className="table-header" style={{ width: '60%' }}>Description</th>
              <th className="table-header" style={{ width: '20%' }}>Code</th>
              <th className="table-header r" style={{ width: '20%' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([lbl, code, val], i) => (
              <tr key={i}>
                <td className="table-field-label"><span className="table-field-underline">{lbl}</span></td>
                <td className="table-field-cell"><span className="table-field-underline">{code || ''}</span></td>
                <td className="table-field-cell r"><span className="table-field-underline bold" style={{ textAlign: 'right' }}>{val}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── KV table (Summary / Margin) ──────────────────────────────────────────────
function KvTable({ rows }) {
  return (
    <div className="field-cell cell-table" style={{ gridColumn: 'span 12' }}>
      <div className="cell-table-container">
        <table className="print-table">
          <tbody>
            {rows.map(([lbl, val, bold], i) => (
              <tr key={i}>
                <td className="table-field-label" style={{ width: '60%' }}>
                  <span className="table-field-underline">{lbl}</span>
                </td>
                <td className="table-field-cell r">
                  <span className={`table-field-underline${bold ? ' bold' : ''}`} style={{ textAlign: 'right' }}>{val}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main print component ─────────────────────────────────────────────────────
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

  if (loading) return <div style={{ padding: 40, fontFamily: 'Segoe UI', fontSize: 13 }}>Loading…</div>;
  if (error)   return <div style={{ padding: 40, fontFamily: 'Segoe UI', fontSize: 13, color: 'red' }}>Error: {error}</div>;
  if (!d)      return null;

  const data = { ...d, ...resolveCosting(d).resolvedData };
  const T    = calcAll(data);
  const EC   = data.extraCols || [];

  // collect all product images
  const imageUrls = (data.images || []).map(assetUrl).filter(Boolean);

  const refLabel = pocNumber
    ? `POC-${pocNumber}`
    : srd?.refNo || '';

  return (
    <div style={{ width: '100%' }}>
      {/* ── exact SR-form CSS injected ── */}
      <style dangerouslySetInnerHTML={{ __html: SR_CSS }} />

      {/* ════ HEADER — identical to SR form ════ */}
      <div className="header">
        <div className="header-main">
          <h1>{isPre ? 'Pre Costing Form' : 'Costing Form'}</h1>
        </div>
        {/* image top-right like SR form's QR frame */}
        <div className="header-qr">
          <div className="header-qr-frame">
            {imageUrls[0]
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={imageUrls[0]} alt="Product" className="header-qr-image" />
              : null}
          </div>
        </div>
      </div>

      {/* ════ 12-column template grid — same as SR form ════ */}
      <div className="template-grid">

        {/* ── Row 1: meta line (POC / currency / status) full width ── */}
        <div className="field-cell" style={{ gridColumn: 'span 12' }}>
          <div className="cell-content">
            <span className="cell-underline" style={{ border: 'none', color: '#555' }}>
              {refLabel}{refLabel ? '  ' : ''}Currency: {d.currency || 'USD'}
              {d.status ? `  Status: ${d.status}` : ''}
            </span>
          </div>
        </div>

        {/* ════════════════════════════════════════════
            THREE-COLUMN TOP SECTION — exactly like SR:
            Col 1 (span 4): BASIC INFO
            Col 2 (span 4): COSTING DETAILS  (= Construction equivalent)
            Col 3 (span 4): IMAGES SECTION
            ════════════════════════════════════════════ */}

        {/* ── BASIC INFO heading ── */}
        <div className="field-cell cell-heading" style={{ gridColumn: 'span 4' }}>
          <div className="heading-content">Basic Info</div>
        </div>
        {/* ── COSTING DETAILS heading ── */}
        <div className="field-cell cell-heading" style={{ gridColumn: 'span 4' }}>
          <div className="heading-content">Costing Details</div>
        </div>
        {/* ── IMAGES SECTION heading ── */}
        <div className="field-cell cell-heading" style={{ gridColumn: 'span 4' }}>
          <div className="heading-content">Images Section</div>
        </div>

        {/* ── BASIC INFO fields (col 1, span 4 each row via inner grid) ── */}
        {/* We use a nested approach: each "column" is a span-4 cell containing its own flex column */}

        {/* Column 1 — Basic Info */}
        <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {[
            ['Costing Date',  d.date],
            ['Brand',         d.brand],
            ['Fit',           d.fit],
            ['Description',   d.description],
            ['Embellishment', d.embellishmentYesNo || ''],
            ['Costing Base',  d.costingBase || ''],
            ['Sample Size',   d.sampleSize],
          ].map(([label, value]) => (
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

        {/* Column 2 — Costing Details */}
        <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {[
            ['Fit Specs Code', d.fitSpecsCode],
            ['Fabric Type',    d.fabricType],
            ['Currency',       d.currency || 'USD'],
            ['Currency Rate',  d.currencyRate ? String(d.currencyRate) : '265'],
            ['Status',         d.status],
            ['Commission %',   d.commission ? String(d.commission) + '%' : ''],
          ].map(([label, value]) => (
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

        {/* Column 3 — Images Section */}
        <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div className="field-cell cell-image">
            <div className="cell-image-container">
              <div className="image-label">Upload Image</div>
              {imageUrls.length > 0 ? (
                <div className="image-stack">
                  {imageUrls.map((src, i) => (
                    <div key={i} className="img-wrapper">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={`Product ${i + 1}`} className="img-print" />
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 10, color: '#999', padding: 4, fontStyle: 'italic' }}>No images</div>
              )}
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════
            FULL-WIDTH SECTIONS BELOW — span 12
            ════════════════════════════════════════════ */}

        {/* ── FABRICS ── */}
        <SectionHead title="Fabrics" total={T.tFab} />
        <ItemTable rows={data.fabrics} EC={EC} />

        {/* ── BEFORE WASH TRIMS ── */}
        <SectionHead title="Before Wash Trims" total={T.tBW} />
        <ItemTable rows={data.beforeWashTrims} EC={EC} />

        {/* ── AFTER WASH TRIMS ── */}
        <SectionHead title="After Wash Trims" total={T.tAW} />
        <ItemTable rows={data.afterWashTrims} EC={EC} />

        {/* ── EMBELLISHMENT ── */}
        <SectionHead title="Embellishment" total={T.tEmb} />
        <ItemTable rows={data.embellishment} EC={EC} />

        {/* ── PRODUCTION COST ── */}
        <SectionHead title="Production Cost" />
        <CostTable rows={[
          ['Cmt (Codes Req Level 1 2 3)', data.cmtLevelCode || '', fmtAmt(data.cmtLevel)],
          ['Washing (Codes Req Level 1 2 3)', data.washingLevelCode || '', fmtAmt(data.washingLevel)],
          ['Fob', '', fmtAmt(data.fob)],
        ]} />

        {/* ── MARGIN & COMMISSION ── */}
        <SectionHead title="Margin &amp; Commission" />
        <KvTable rows={[
          ['Extra Cut',       fmtAmt(data.extraCut),       false],
          ['Ld Margin',       fmtAmt(data.ldMargin),       false],
          ['Testing Charges', fmtAmt(data.testingCharges), false],
          ['Commission',      n(data.commission) ? `(${n(data.commission)}%) ${fmtAmt(T.comm)}` : fmtAmt(T.comm), true],
        ]} />

        {/* ── SUMMARY ── */}
        <SectionHead title="Summary" />
        <KvTable rows={[
          ['Total Price PKR',       Math.round(T.totalPkr).toLocaleString('en-US'), true],
          ['Currency (USD / Euro)', String(n(data.currencyRate) || 265),            false],
          ['Final Fob Us$',         '$' + fmtUsd(T.finalFob),                      true],
        ]} />

        {/* ── QUOTE TRACKING ── */}
        <SectionHead title="Quote Tracking" />
        <KvTable rows={[
          ['First Quoted', '$' + fmtUsd(data.firstQuoted),    false],
          ['Target $',     '$' + fmtUsd(data.targetPrice),    false],
          ['Difference',   '$' + fmtUsd(T.diff),              false],
          ['2nd Quote $',  '$' + fmtUsd(data.secondQuote),    false],
          ['Confirmed',    '$' + fmtUsd(data.confirmedPrice), true],
        ]} />

        {/* ── NOTES ── */}
        {d.notes && (
          <>
            <SectionHead title="Notes" />
            <div className="field-cell" style={{ gridColumn: 'span 12' }}>
              <div className="cell-content">
                <span className="cell-underline">{d.notes}</span>
              </div>
            </div>
          </>
        )}

      </div>{/* end .template-grid */}
    </div>
  );
}

export default function CostingPrintPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, fontFamily: 'Segoe UI', fontSize: 13 }}>Loading…</div>}>
      <PrintContent />
    </Suspense>
  );
}
