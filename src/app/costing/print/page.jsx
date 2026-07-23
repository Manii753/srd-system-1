'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

const n = (v) => Number(v) || 0;
const fmt2 = (v) =>
  n(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function rowAmount(row) { return n(row.consumption) * n(row.price); }
function sectionSum(rows) { return (rows || []).reduce((s, r) => s + rowAmount(r), 0); }

function calcAll(d) {
  const totalFabrics = sectionSum(d.fabrics);
  const totalBeforeWash = sectionSum(d.beforeWashTrims);
  const totalAfterWash = sectionSum(d.afterWashTrims);
  const totalEmbellishment = sectionSum(d.embellishment);
  const subtotal = totalFabrics + totalBeforeWash + totalAfterWash + totalEmbellishment;
  const totalWithProduction = subtotal + n(d.cmtLevel) + n(d.washingLevel) + n(d.fob);
  const totalWithFreight = totalWithProduction + n(d.freight);
  const marginAmount = totalWithFreight * (n(d.marginPct) / 100);
  const totalWithMargin = totalWithFreight + marginAmount;
  const totalWithExtra = totalWithMargin + n(d.extraCut) + n(d.ldMargin) + n(d.testingCharges) + n(d.commission);
  const totalPricePkr = totalWithExtra;
  const currencyRate = n(d.currencyRate) || 265;
  const finalFobUs = totalPricePkr / currencyRate;
  const difference = n(d.firstQuoted) - n(d.targetPrice);
  return { totalFabrics, totalBeforeWash, totalAfterWash, totalEmbellishment, subtotal, totalWithProduction, totalWithFreight, marginAmount, totalWithMargin, totalPricePkr, finalFobUs, difference };
}

function PrintContent() {
  const searchParams = useSearchParams();
  const srdId = searchParams.get('srdId');
  const type = searchParams.get('type') || 'post';
  const [d, setD] = useState(null);
  const [srd, setSrd] = useState(null);
  const [pocNumber, setPocNumber] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!srdId) { setError('No costing ID provided.'); setLoading(false); return; }
    (async () => {
      try {
        const res = await fetch(`/api/costing/${srdId}`);
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Failed to load');
        const side = type === 'pre' ? json.data?.preCost : json.data?.postCost;
        setD(side || {});
        setSrd(json.srd);
        setPocNumber(json.data?.pocNumber ?? json.pocNumber ?? null);
      } catch (e) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, [srdId, type]);

  useEffect(() => {
    if (!loading && d && !error) {
      const t = setTimeout(() => window.print(), 500);
      return () => clearTimeout(t);
    }
  }, [loading, d, error]);

  if (loading) return <div style={{ padding: 40, fontFamily: 'Arial', fontSize: 14 }}>Loading costing data...</div>;
  if (error) return <div style={{ padding: 40, fontFamily: 'Arial', fontSize: 14, color: 'red' }}>Error: {error}</div>;
  if (!d) return null;

  const totals = calcAll(d);
  const typeLabel = type === 'pre' ? 'Pre-Costing' : 'Post-Costing';

  return (
    <div style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 10, color: '#1a1a1a', lineHeight: 1.4 }}>
      <style>{`
        @page { size: A4 portrait; margin: 12mm 10mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .print-page { padding: 0; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 10px; }
        .header-left h1 { font-size: 16px; font-weight: 700; margin: 0; }
        .header-left .ref { font-size: 11px; color: #555; margin-top: 2px; }
        .header-right { text-align: right; font-size: 10px; color: #555; }
        .header-right .poc { font-size: 13px; font-weight: 700; color: #2563eb; }
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; border: 1px solid #d1d5db; border-radius: 4px; overflow: hidden; margin-bottom: 10px; }
        .meta-cell { padding: 5px 8px; border-right: 1px solid #e5e7eb; }
        .meta-cell:last-child { border-right: none; }
        .meta-label { font-size: 8px; text-transform: uppercase; color: #9ca3af; font-weight: 600; letter-spacing: 0.5px; }
        .meta-value { font-size: 10px; font-weight: 600; color: #111; margin-top: 1px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
        th, td { padding: 3px 5px; text-align: left; border: 1px solid #e5e7eb; font-size: 9px; }
        th { background: #f3f4f6; font-weight: 600; text-transform: uppercase; font-size: 8px; letter-spacing: 0.3px; color: #6b7280; }
        .section-title { background: #f9fafb; font-weight: 700; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #374151; border-top: 2px solid #d1d5db; border-bottom: 2px solid #d1d5db; }
        .section-title td { padding: 4px 6px; }
        .col-desc { width: 38%; }
        .col-code { width: 14%; }
        .col-cons { width: 12%; text-align: right; }
        .col-rate { width: 14%; text-align: right; }
        .col-amt { width: 16%; text-align: right; }
        .col-del { width: 6%; }
        td.num { text-align: right; font-variant-numeric: tabular-nums; }
        .total-row { background: #111; color: white; font-weight: 700; }
        .total-row td { padding: 5px 6px; border-color: #374151; }
        .summary-row td { padding: 3px 6px; }
        .summary-label { font-weight: 600; text-transform: uppercase; font-size: 9px; }
        .summary-value { text-align: right; font-weight: 600; }
        .quote-section { border-top: 2px solid #d1d5db; margin-top: 8px; }
        .quote-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr 1fr; gap: 0; }
        .quote-cell { padding: 5px 8px; border: 1px solid #e5e7eb; text-align: center; }
        .quote-label { font-size: 7px; text-transform: uppercase; color: #9ca3af; font-weight: 600; }
        .quote-value { font-size: 12px; font-weight: 700; color: #111; margin-top: 2px; }
        .quote-value.highlight { color: #2563eb; }
        .footer { margin-top: 12px; border-top: 1px solid #d1d5db; padding-top: 6px; display: flex; justify-content: space-between; font-size: 8px; color: #9ca3af; }
        .images-section { margin-top: 8px; page-break-inside: avoid; }
        .images-grid { display: flex; gap: 8px; flex-wrap: wrap; }
        .images-grid img { width: 80px; height: 80px; object-fit: cover; border: 1px solid #e5e7eb; border-radius: 2px; }
      `}</style>

      <div className="print-page">
        {/* ── HEADER ── */}
        <div className="header">
          <div className="header-left">
            <h1>Costing Form</h1>
            <div className="ref">{typeLabel}</div>
          </div>
          <div className="header-right">
            {pocNumber && <div className="poc">POC-{pocNumber}</div>}
            {srd?.refNo && <div style={{ fontSize: 10, marginTop: 2 }}>{srd.refNo}</div>}
          </div>
        </div>

        {/* ── META FIELDS ── */}
        <div className="meta-grid">
          <div className="meta-cell"><div className="meta-label">Costing Date</div><div className="meta-value">{d.date || '—'}</div></div>
          <div className="meta-cell"><div className="meta-label">Brand</div><div className="meta-value">{d.brand || '—'}</div></div>
          <div className="meta-cell"><div className="meta-label">Fit Specs Code</div><div className="meta-value">{d.fitSpecsCode || '—'}</div></div>
          <div className="meta-cell"><div className="meta-label">Fit</div><div className="meta-value">{d.fit || '—'}</div></div>
          <div className="meta-cell"><div className="meta-label">Description</div><div className="meta-value">{d.description || '—'}</div></div>
          <div className="meta-cell"><div className="meta-label">Fabric Type</div><div className="meta-value">{d.fabricType || '—'}</div></div>
          <div className="meta-cell"><div className="meta-label">Embellishment</div><div className="meta-value">{d.embellishmentYesNo || 'No'}</div></div>
          <div className="meta-cell"><div className="meta-label">Costing Base</div><div className="meta-value">{d.costingBase || 'Image'}</div></div>
          <div className="meta-cell"><div className="meta-label">Sample Size</div><div className="meta-value">{d.sampleSize || '—'}</div></div>
        </div>

        {/* ── FABRICS ── */}
        <table>
          <thead>
            <tr><th className="col-desc">Description</th><th className="col-code">Code</th><th className="col-cons">Consumption</th><th className="col-rate">Rate</th><th className="col-amt">Amount</th></tr>
          </thead>
          <tbody>
            <tr className="section-title"><td colSpan={5}>Fabrics</td></tr>
            {(d.fabrics || []).map((r, i) => (
              <tr key={i}>
                <td>{r.description || '—'}</td>
                <td>{r.code || '—'}</td>
                <td className="num">{r.consumption ? fmt2(r.consumption) : '—'}</td>
                <td className="num">{r.price ? fmt2(r.price) : '—'}</td>
                <td className="num">{r.amount ? fmt2(r.amount) : '—'}</td>
              </tr>
            ))}
            {totals.totalFabrics > 0 && <tr style={{ fontWeight: 600, background: '#f9fafb' }}><td colSpan={4} style={{ textAlign: 'right' }}>Fabrics Total</td><td className="num">{fmt2(totals.totalFabrics)}</td></tr>}
          </tbody>
        </table>

        {/* ── BEFORE WASH TRIMS ── */}
        <table>
          <thead>
            <tr><th className="col-desc">Description</th><th className="col-cons" style={{ width: '16%' }}>Consumption</th><th className="col-rate" style={{ width: '16%' }}>Rate</th><th className="col-amt" style={{ width: '18%' }}>Amount</th></tr>
          </thead>
          <tbody>
            <tr className="section-title"><td colSpan={4}>Before Wash Trims</td></tr>
            {(d.beforeWashTrims || []).map((r, i) => (
              <tr key={i}>
                <td>{r.description || '—'}</td>
                <td className="num">{r.consumption ? fmt2(r.consumption) : '—'}</td>
                <td className="num">{r.price ? fmt2(r.price) : '—'}</td>
                <td className="num">{r.amount ? fmt2(r.amount) : '—'}</td>
              </tr>
            ))}
            {totals.totalBeforeWash > 0 && <tr style={{ fontWeight: 600, background: '#f9fafb' }}><td colSpan={3} style={{ textAlign: 'right' }}>Before Wash Total</td><td className="num">{fmt2(totals.totalBeforeWash)}</td></tr>}
          </tbody>
        </table>

        {/* ── AFTER WASH TRIMS ── */}
        <table>
          <thead>
            <tr><th className="col-desc">Description</th><th className="col-cons" style={{ width: '16%' }}>Consumption</th><th className="col-rate" style={{ width: '16%' }}>Rate</th><th className="col-amt" style={{ width: '18%' }}>Amount</th></tr>
          </thead>
          <tbody>
            <tr className="section-title"><td colSpan={4}>After Wash Trims</td></tr>
            {(d.afterWashTrims || []).map((r, i) => (
              <tr key={i}>
                <td>{r.description || '—'}</td>
                <td className="num">{r.consumption ? fmt2(r.consumption) : '—'}</td>
                <td className="num">{r.price ? fmt2(r.price) : '—'}</td>
                <td className="num">{r.amount ? fmt2(r.amount) : '—'}</td>
              </tr>
            ))}
            {totals.totalAfterWash > 0 && <tr style={{ fontWeight: 600, background: '#f9fafb' }}><td colSpan={3} style={{ textAlign: 'right' }}>After Wash Total</td><td className="num">{fmt2(totals.totalAfterWash)}</td></tr>}
          </tbody>
        </table>

        {/* ── EMBELLISHMENT ── */}
        <table>
          <thead>
            <tr><th className="col-desc">Description</th><th className="col-cons" style={{ width: '16%' }}>Consumption</th><th className="col-rate" style={{ width: '16%' }}>Rate</th><th className="col-amt" style={{ width: '18%' }}>Amount</th></tr>
          </thead>
          <tbody>
            <tr className="section-title"><td colSpan={4}>Embellishment</td></tr>
            {(d.embellishment || []).map((r, i) => (
              <tr key={i}>
                <td>{r.description || '—'}</td>
                <td className="num">{r.consumption ? fmt2(r.consumption) : '—'}</td>
                <td className="num">{r.price ? fmt2(r.price) : '—'}</td>
                <td className="num">{r.amount ? fmt2(r.amount) : '—'}</td>
              </tr>
            ))}
            {totals.totalEmbellishment > 0 && <tr style={{ fontWeight: 600, background: '#f9fafb' }}><td colSpan={3} style={{ textAlign: 'right' }}>Embellishment Total</td><td className="num">{fmt2(totals.totalEmbellishment)}</td></tr>}
          </tbody>
        </table>

        {/* ── PRODUCTION COST + FREIGHT + MARGIN ── */}
        <table>
          <tbody>
            <tr className="section-title"><td colSpan={3}>Production Cost</td></tr>
            <tr><td>CMT (Codes Req Level 1 2 3)</td><td className="num" colSpan={2}>{n(d.cmtLevel) ? fmt2(d.cmtLevel) : '—'}</td></tr>
            <tr><td>Washing (Codes Req Level 1 2 3)</td><td className="num" colSpan={2}>{n(d.washingLevel) ? fmt2(d.washingLevel) : '—'}</td></tr>
            <tr><td>FOB</td><td className="num" colSpan={2}>{n(d.fob) ? fmt2(d.fob) : '—'}</td></tr>

            <tr className="section-title"><td colSpan={3}>Freight</td></tr>
            <tr><td>Freight</td><td className="num" colSpan={2}>{n(d.freight) ? fmt2(d.freight) : '—'}</td></tr>

            <tr className="section-title"><td colSpan={3}>Margin & Commission</td></tr>
            <tr><td>Percentage %</td><td className="num" colSpan={2}>{n(d.marginPct) ? `${d.marginPct}%` : '—'}</td></tr>
            <tr><td>Extra Cut</td><td className="num" colSpan={2}>{n(d.extraCut) ? fmt2(d.extraCut) : '—'}</td></tr>
            <tr><td>Ld Margin</td><td className="num" colSpan={2}>{n(d.ldMargin) ? fmt2(d.ldMargin) : '—'}</td></tr>
            <tr><td>Testing Charges</td><td className="num" colSpan={2}>{n(d.testingCharges) ? fmt2(d.testingCharges) : '—'}</td></tr>
            <tr><td>Commission</td><td className="num" colSpan={2}>{n(d.commission) ? fmt2(d.commission) : '—'}</td></tr>
          </tbody>
        </table>

        {/* ── TOTAL ── */}
        <table>
          <tbody>
            <tr className="total-row">
              <td style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Price PKR</td>
              <td className="num" style={{ fontWeight: 700, fontSize: 11 }}>{fmt2(totals.totalPricePkr)}</td>
            </tr>
            <tr>
              <td>Currency Rate (PKR/USD)</td>
              <td className="num">{n(d.currencyRate) || 265}</td>
            </tr>
            <tr style={{ background: '#f3f4f6', fontWeight: 600 }}>
              <td>Final FOB US$</td>
              <td className="num" style={{ fontSize: 11 }}>${fmt2(totals.finalFobUs)}</td>
            </tr>
          </tbody>
        </table>

        {/* ── QUOTE TRACKING ── */}
        <div className="quote-section">
          <table>
            <tbody>
              <tr className="section-title"><td colSpan={5}>Quote Tracking</td></tr>
            </tbody>
          </table>
          <div className="quote-grid">
            <div className="quote-cell"><div className="quote-label">First Quoted</div><div className="quote-value">${fmt2(d.firstQuoted)}</div></div>
            <div className="quote-cell"><div className="quote-label">Target</div><div className="quote-value">${fmt2(d.targetPrice)}</div></div>
            <div className="quote-cell"><div className="quote-label">Difference</div><div className="quote-value highlight">${fmt2(totals.difference)}</div></div>
            <div className="quote-cell"><div className="quote-label">2nd Quote</div><div className="quote-value">${fmt2(d.secondQuote)}</div></div>
            <div className="quote-cell"><div className="quote-label">Confirmed</div><div className="quote-value">${fmt2(d.confirmedPrice)}</div></div>
          </div>
        </div>

        {/* ── IMAGES ── */}
        {d.images && d.images.length > 0 && (
          <div className="images-section">
            <div style={{ fontSize: 8, fontWeight: 600, textTransform: 'uppercase', color: '#9ca3af', marginBottom: 4 }}>Product Photos</div>
            <div className="images-grid">
              {d.images.map((img, i) => img.url && <img key={i} src={img.url} alt={img.caption || 'Product'} />)}
            </div>
          </div>
        )}

        {/* ── FOOTER ── */}
        <div className="footer">
          <span>Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</span>
          <span>{d.brand && `${d.brand} · `}{d.fitSpecsCode && `${d.fitSpecsCode} · `}{d.fit}</span>
        </div>
      </div>
    </div>
  );
}

export default function CostingPrintPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, fontFamily: 'Arial', fontSize: 14 }}>Loading...</div>}>
      <PrintContent />
    </Suspense>
  );
}
