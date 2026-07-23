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
  return { totalFabrics, totalBeforeWash, totalAfterWash, totalEmbellishment, totalPricePkr, finalFobUs, difference };
}

function V({ children }) {
  if (!children && children !== 0) return <span style={{ color: '#bbb' }}>—</span>;
  return <>{children}</>;
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
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [loading, d, error]);

  if (loading) return <div style={{ padding: 40, fontFamily: 'Arial', fontSize: 14 }}>Loading...</div>;
  if (error) return <div style={{ padding: 40, fontFamily: 'Arial', fontSize: 14, color: 'red' }}>Error: {error}</div>;
  if (!d) return null;

  const totals = calcAll(d);

  return (
    <div style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 8, color: '#111', lineHeight: 1.25 }}>
      <style>{`
        @page { size: A4 portrait; margin: 6mm 6mm 6mm 6mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; width: 210mm; }
        body { transform-origin: top left; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 1px 2px; border: 0.5px solid #d1d5db; font-size: 7px; line-height: 1.2; }
        th { background: #f0f0f0; font-weight: 700; text-transform: uppercase; font-size: 6px; letter-spacing: 0.3px; color: #555; }
        .sh { background: #e8e8e8; font-weight: 700; font-size: 7px; text-transform: uppercase; letter-spacing: 0.3px; color: #333; }
        .sh td { padding: 1.5px 2px; border-top: 0.5px solid #999; border-bottom: 0.5px solid #999; }
        .r { text-align: right; font-variant-numeric: tabular-nums; }
        .tr { background: #1a1a1a; color: white; font-weight: 700; }
        .tr td { padding: 2px 2px; font-size: 7.5px; }
        .b { font-weight: 700; }
        .sub td { background: #f7f7f7; font-weight: 600; }
      `}</style>

      <div>
        {/* ── COMPACT META ROW ── */}
        <table style={{ marginBottom: 1 }}>
          <tbody>
            <tr>
              <td style={{ width: '12%', fontWeight: 700, fontSize: 7, color: '#888' }}>Date</td>
              <td style={{ width: '13%' }}><V>{d.date}</V></td>
              <td style={{ width: '10%', fontWeight: 700, fontSize: 7, color: '#888' }}>Brand</td>
              <td style={{ width: '13%' }}><V>{d.brand}</V></td>
              <td style={{ width: '11%', fontWeight: 700, fontSize: 7, color: '#888' }}>Fit Code</td>
              <td style={{ width: '13%' }}><V>{d.fitSpecsCode}</V></td>
              <td style={{ width: '8%', fontWeight: 700, fontSize: 7, color: '#888' }}>Fit</td>
              <td style={{ width: '10%' }}><V>{d.fit}</V></td>
              <td style={{ width: '10%', fontWeight: 700, fontSize: 7, color: '#888' }}>Size</td>
              <td><V>{d.sampleSize}</V></td>
            </tr>
            <tr>
              <td style={{ fontWeight: 700, fontSize: 7, color: '#888' }}>Description</td>
              <td><V>{d.description}</V></td>
              <td style={{ fontWeight: 700, fontSize: 7, color: '#888' }}>Fabric Type</td>
              <td><V>{d.fabricType}</V></td>
              <td style={{ fontWeight: 700, fontSize: 7, color: '#888' }}>Embellish</td>
              <td><V>{d.embellishmentYesNo || 'No'}</V></td>
              <td style={{ fontWeight: 700, fontSize: 7, color: '#888' }}>Base</td>
              <td><V>{d.costingBase}</V></td>
              <td style={{ fontWeight: 700, fontSize: 7, color: '#888' }}>POC</td>
              <td>{pocNumber ? `POC-${pocNumber}` : <V>{srd?.refNo}</V>}</td>
            </tr>
          </tbody>
        </table>

        {/* ── FABRICS ── */}
        <table style={{ marginBottom: 1 }}>
          <thead>
            <tr><th style={{ width: '35%' }}>Description</th><th style={{ width: '15%' }}>Code</th><th className="r" style={{ width: '12%' }}>Cons</th><th className="r" style={{ width: '14%' }}>Rate</th><th className="r" style={{ width: '16%' }}>Amount</th></tr>
          </thead>
          <tbody>
            <tr className="sh"><td colSpan={5}>Fabrics</td></tr>
            {(d.fabrics || []).map((r, i) => (
              <tr key={i}>
                <td>{r.description || '—'}</td>
                <td>{r.code || '—'}</td>
                <td className="r">{r.consumption ? fmt2(r.consumption) : '—'}</td>
                <td className="r">{r.price ? fmt2(r.price) : '—'}</td>
                <td className="r b">{r.amount ? fmt2(r.amount) : '—'}</td>
              </tr>
            ))}
            {totals.totalFabrics > 0 && <tr className="sub"><td colSpan={4} className="r">Total</td><td className="r b">{fmt2(totals.totalFabrics)}</td></tr>}
          </tbody>
        </table>

        {/* ── BEFORE WASH TRIMS ── */}
        <table style={{ marginBottom: 1 }}>
          <thead>
            <tr><th style={{ width: '44%' }}>Description</th><th className="r" style={{ width: '16%' }}>Cons</th><th className="r" style={{ width: '16%' }}>Rate</th><th className="r" style={{ width: '18%' }}>Amount</th></tr>
          </thead>
          <tbody>
            <tr className="sh"><td colSpan={4}>Before Wash Trims</td></tr>
            {(d.beforeWashTrims || []).map((r, i) => (
              <tr key={i}>
                <td>{r.description || '—'}</td>
                <td className="r">{r.consumption ? fmt2(r.consumption) : '—'}</td>
                <td className="r">{r.price ? fmt2(r.price) : '—'}</td>
                <td className="r b">{r.amount ? fmt2(r.amount) : '—'}</td>
              </tr>
            ))}
            {totals.totalBeforeWash > 0 && <tr className="sub"><td colSpan={3} className="r">Total</td><td className="r b">{fmt2(totals.totalBeforeWash)}</td></tr>}
          </tbody>
        </table>

        {/* ── AFTER WASH TRIMS ── */}
        <table style={{ marginBottom: 1 }}>
          <thead>
            <tr><th style={{ width: '44%' }}>Description</th><th className="r" style={{ width: '16%' }}>Cons</th><th className="r" style={{ width: '16%' }}>Rate</th><th className="r" style={{ width: '18%' }}>Amount</th></tr>
          </thead>
          <tbody>
            <tr className="sh"><td colSpan={4}>After Wash Trims</td></tr>
            {(d.afterWashTrims || []).map((r, i) => (
              <tr key={i}>
                <td>{r.description || '—'}</td>
                <td className="r">{r.consumption ? fmt2(r.consumption) : '—'}</td>
                <td className="r">{r.price ? fmt2(r.price) : '—'}</td>
                <td className="r b">{r.amount ? fmt2(r.amount) : '—'}</td>
              </tr>
            ))}
            {totals.totalAfterWash > 0 && <tr className="sub"><td colSpan={3} className="r">Total</td><td className="r b">{fmt2(totals.totalAfterWash)}</td></tr>}
          </tbody>
        </table>

        {/* ── EMBELLISHMENT ── */}
        <table style={{ marginBottom: 1 }}>
          <thead>
            <tr><th style={{ width: '44%' }}>Description</th><th className="r" style={{ width: '16%' }}>Cons</th><th className="r" style={{ width: '16%' }}>Rate</th><th className="r" style={{ width: '18%' }}>Amount</th></tr>
          </thead>
          <tbody>
            <tr className="sh"><td colSpan={4}>Embellishment</td></tr>
            {(d.embellishment || []).map((r, i) => (
              <tr key={i}>
                <td>{r.description || '—'}</td>
                <td className="r">{r.consumption ? fmt2(r.consumption) : '—'}</td>
                <td className="r">{r.price ? fmt2(r.price) : '—'}</td>
                <td className="r b">{r.amount ? fmt2(r.amount) : '—'}</td>
              </tr>
            ))}
            {totals.totalEmbellishment > 0 && <tr className="sub"><td colSpan={3} className="r">Total</td><td className="r b">{fmt2(totals.totalEmbellishment)}</td></tr>}
          </tbody>
        </table>

        {/* ── PRODUCTION + FREIGHT + MARGIN in one compact table ── */}
        <table style={{ marginBottom: 1 }}>
          <tbody>
            <tr className="sh"><td colSpan={2}>Production Cost</td></tr>
            <tr><td>CMT (Codes Req Level 1 2 3)</td><td className="r">{n(d.cmtLevel) ? fmt2(d.cmtLevel) : '—'}</td></tr>
            <tr><td>Washing (Codes Req Level 1 2 3)</td><td className="r">{n(d.washingLevel) ? fmt2(d.washingLevel) : '—'}</td></tr>
            <tr><td>FOB</td><td className="r">{n(d.fob) ? fmt2(d.fob) : '—'}</td></tr>
            <tr className="sh"><td colSpan={2}>Freight</td></tr>
            <tr><td>Freight</td><td className="r">{n(d.freight) ? fmt2(d.freight) : '—'}</td></tr>
            <tr className="sh"><td colSpan={2}>Margin & Commission</td></tr>
            <tr><td>Percentage %</td><td className="r">{n(d.marginPct) ? `${d.marginPct}%` : '—'}</td></tr>
            <tr><td>Extra Cut</td><td className="r">{n(d.extraCut) ? fmt2(d.extraCut) : '—'}</td></tr>
            <tr><td>Ld Margin</td><td className="r">{n(d.ldMargin) ? fmt2(d.ldMargin) : '—'}</td></tr>
            <tr><td>Testing Charges</td><td className="r">{n(d.testingCharges) ? fmt2(d.testingCharges) : '—'}</td></tr>
            <tr><td>Commission</td><td className="r">{n(d.commission) ? fmt2(d.commission) : '—'}</td></tr>
          </tbody>
        </table>

        {/* ── TOTAL + QUOTE in two columns side by side ── */}
        <table style={{ marginBottom: 1 }}>
          <tbody>
            <tr className="tr">
              <td style={{ width: '50%', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Price PKR</td>
              <td className="r b" style={{ width: '50%' }}>{fmt2(totals.totalPricePkr)}</td>
            </tr>
            <tr>
              <td>Currency Rate (PKR/USD)</td>
              <td className="r">{n(d.currencyRate) || 265}</td>
            </tr>
            <tr style={{ background: '#eee', fontWeight: 700 }}>
              <td>Final FOB US$</td>
              <td className="r">${fmt2(totals.finalFobUs)}</td>
            </tr>
          </tbody>
        </table>

        {/* ── QUOTE TRACKING ── */}
        <table style={{ marginTop: 1 }}>
          <tbody>
            <tr className="sh"><td colSpan={5}>Quote Tracking</td></tr>
            <tr>
              <td style={{ textAlign: 'center', width: '20%' }}><span style={{ fontSize: 6, color: '#888', textTransform: 'uppercase' }}>First Quoted</span><br/><span className="b">${fmt2(d.firstQuoted)}</span></td>
              <td style={{ textAlign: 'center', width: '20%' }}><span style={{ fontSize: 6, color: '#888', textTransform: 'uppercase' }}>Target</span><br/><span className="b">${fmt2(d.targetPrice)}</span></td>
              <td style={{ textAlign: 'center', width: '20%', background: '#eff6ff' }}><span style={{ fontSize: 6, color: '#888', textTransform: 'uppercase' }}>Difference</span><br/><span className="b" style={{ color: '#2563eb' }}>${fmt2(totals.difference)}</span></td>
              <td style={{ textAlign: 'center', width: '20%' }}><span style={{ fontSize: 6, color: '#888', textTransform: 'uppercase' }}>2nd Quote</span><br/><span className="b">${fmt2(d.secondQuote)}</span></td>
              <td style={{ textAlign: 'center', width: '20%' }}><span style={{ fontSize: 6, color: '#888', textTransform: 'uppercase' }}>Confirmed</span><br/><span className="b">${fmt2(d.confirmedPrice)}</span></td>
            </tr>
          </tbody>
        </table>

        {/* ── FOOTER ── */}
        <div style={{ marginTop: 2, borderTop: '0.5px solid #ccc', paddingTop: 2, display: 'flex', justifyContent: 'space-between', fontSize: 6, color: '#aaa' }}>
          <span>Generated: {new Date().toLocaleDateString()}</span>
          <span>{[d.brand, d.fitSpecsCode, d.fit].filter(Boolean).join(' · ')}</span>
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
