'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

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

function rowAmt(row) { return n(row.consumption) * n(row.price); }
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

// ─── shared cell style ────────────────────────────────────────────────────────
const B  = '0.5px solid #aaa';   // inner border
const BO = '1px solid #000';     // outer / section border

const td = (extra = {}) => ({
  border: B,
  padding: '1.5px 3px',
  fontSize: '7.5pt',
  fontFamily: 'Arial, Helvetica, sans-serif',
  verticalAlign: 'middle',
  ...extra,
});

const tdB = (extra = {}) => td({ fontWeight: 700, ...extra });   // bold cell
const tdR = (extra = {}) => td({ textAlign: 'right', ...extra }); // right-align

// ─── reusable row renderers ───────────────────────────────────────────────────

// Section label row (colored bold text, spans all 5 cols)
const SecRow = ({ label, color }) => (
  <tr>
    <td colSpan={5} style={tdB({ color, borderTop: BO, borderBottom: B, borderLeft: BO, borderRight: BO })}>
      {label}
    </td>
  </tr>
);

// Col-header row for fabrics (5 cols with Code)
const FabHdr = () => (
  <tr style={{ background: '#f5f5f5' }}>
    <td style={tdB({ width: '30%', borderLeft: BO })}>Description</td>
    <td style={tdB({ width: '14%' })}>Code</td>
    <td style={tdB({ width: '14%', textAlign: 'right' })}>Consumption</td>
    <td style={tdB({ width: '14%', textAlign: 'right' })}>Rate</td>
    <td style={tdB({ width: '14%', textAlign: 'right', borderRight: BO })}>Amount</td>
  </tr>
);

// Fabric data row
const FabRow = ({ r }) => (
  <tr>
    <td style={td({ borderLeft: BO })}>{r.description}</td>
    <td style={td()}>{r.code || ''}</td>
    <td style={tdR()}>{fmtN(r.consumption)}</td>
    <td style={tdR()}>{fmtN(r.price)}</td>
    <td style={tdR({ borderRight: BO })}>{fmtAmt(rowAmt(r))}</td>
  </tr>
);

// Trim/embellishment data row (Description spans 2 cols)
const TrimRow = ({ r }) => (
  <tr>
    <td colSpan={2} style={td({ borderLeft: BO })}>{r.description}</td>
    <td style={tdR()}>{fmtN(r.consumption)}</td>
    <td style={tdR()}>{fmtN(r.price)}</td>
    <td style={tdR({ borderRight: BO })}>{fmtAmt(rowAmt(r))}</td>
  </tr>
);

// Generic 2-col row: label (spans 4) + right-aligned value
const Row2 = ({ label, value, bold, indent }) => (
  <tr>
    <td colSpan={4} style={td({
      borderLeft: BO,
      fontWeight: bold ? 700 : 400,
      paddingLeft: indent ? 10 : 3,
    })}>
      {label}
    </td>
    <td style={tdR({ borderRight: BO, fontWeight: bold ? 700 : 400 })}>{value}</td>
  </tr>
);

// Production row: label (spans 2) + level (1 col) + empty + amount
const ProdRow = ({ label, level, amount }) => (
  <tr>
    <td colSpan={2} style={td({ borderLeft: BO })}>{label}</td>
    <td style={td({ textAlign: 'center' })}>{level != null && level !== 0 ? level : ''}</td>
    <td style={td()}></td>
    <td style={tdR({ borderRight: BO })}>{fmtAmt(amount)}</td>
  </tr>
);

// Quote row: label (spans 3) + dollar sign + amount value
const QuoteRow = ({ label, dollarColor, amountColor, amount, bg, labelBold }) => (
  <tr style={bg ? { background: bg } : {}}>
    <td colSpan={3} style={tdB({ borderLeft: BO, fontWeight: labelBold ? 700 : 400 })}>{label}</td>
    <td style={td({ textAlign: 'right', color: dollarColor || '#000', fontWeight: 700 })}>$</td>
    <td style={tdR({ borderRight: BO, color: amountColor || '#000', fontWeight: 700 })}>
      {amount ? fmtUsd(amount) : ''}
    </td>
  </tr>
);

// ─── main print component ─────────────────────────────────────────────────────

function PrintContent() {
  const sp     = useSearchParams();
  const srdId  = sp.get('srdId');
  const type   = sp.get('type') || 'post';

  const [d,         setD]         = useState(null);
  const [srd,       setSrd]       = useState(null);
  const [pocNumber, setPocNumber] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  useEffect(() => {
    if (!srdId) { setError('No costing ID provided.'); setLoading(false); return; }
    (async () => {
      try {
        const res  = await fetch(`/api/costing/${srdId}`);
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Failed to load');
        const side = type === 'pre' ? json.data?.preCost : json.data?.postCost;
        setD(side || {});
        setSrd(json.srd);
        setPocNumber(json.data?.pocNumber ?? null);
      } catch (e) { setError(e.message); }
      finally     { setLoading(false); }
    })();
  }, [srdId, type]);

  useEffect(() => {
    if (!loading && d && !error) {
      const t = setTimeout(() => window.print(), 500);
      return () => clearTimeout(t);
    }
  }, [loading, d, error]);

  if (loading) return <div style={{ padding: 40, fontFamily: 'Arial', fontSize: 13 }}>Loading…</div>;
  if (error)   return <div style={{ padding: 40, fontFamily: 'Arial', fontSize: 13, color: 'red' }}>Error: {error}</div>;
  if (!d)      return null;

  const T = calcAll(d);

  return (
    <div style={{
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '7.5pt',
      color: '#000',
      background: '#fff',
      width: '190mm',
      margin: '0 auto',
    }}>
      <style>{`
        @page { size: A4 portrait; margin: 10mm 10mm 10mm 10mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        table { width: 100%; border-collapse: collapse; }
      `}</style>

      {/* ════════════════════════════════════════
          TITLE
          ════════════════════════════════════════ */}
      <div style={{
        textAlign: 'center', fontWeight: 700, fontSize: '11pt',
        border: '1px solid #000', padding: '3px 0', marginBottom: 6,
      }}>
        Costing Form
      </div>

      {/* ════════════════════════════════════════
          HEADER INFO (no border on the label rows, values underlined)
          ════════════════════════════════════════ */}
      <table style={{ marginBottom: 5, borderCollapse: 'collapse', width: '60%' }}>
        <colgroup>
          <col style={{ width: '38%' }} />
          <col style={{ width: '62%' }} />
        </colgroup>
        <tbody>
          {[
            ['Costing date',   d.date],
            ['Brand',          d.brand],
            ['Fit Specs Code', d.fitSpecsCode],
            ['Fit',            d.fit],
            ['Description',    d.description],
            ['Fabric Type',    d.fabricType],
            ['Embellishment',  d.embellishmentYesNo || ''],
            ['Costing Base',   d.costingBase || ''],
            ['Sample Size',    d.sampleSize],
          ].map(([lbl, val]) => (
            <tr key={lbl}>
              <td style={{ fontSize: '7.5pt', padding: '0.8px 2px', fontWeight: 600, color: '#222' }}>{lbl}</td>
              <td style={{
                fontSize: '7.5pt', padding: '0.8px 2px',
                fontWeight: val ? 700 : 400,
                textDecoration: val ? 'underline' : 'none',
                textAlign: 'center',
              }}>
                {val || ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ════════════════════════════════════════
          MASTER TABLE  (5 columns throughout)
          Col widths: Description | Code | Consumption | Rate | Amount
          ════════════════════════════════════════ */}
      <table style={{ border: BO }}>
        <colgroup>
          <col style={{ width: '30%' }} />
          <col style={{ width: '16%' }} />
          <col style={{ width: '16%' }} />
          <col style={{ width: '16%' }} />
          <col style={{ width: '16%' }} />
        </colgroup>
        <tbody>

          {/* ── FABRICS ─────────────────────────────── */}
          <SecRow label="Fabrics" color="#c00" />
          <FabHdr />
          {(d.fabrics || []).map((r, i) => <FabRow key={i} r={r} />)}

          {/* ── BEFORE WASH TRIMS ───────────────────── */}
          <SecRow label="Before Wash Trims" color="#007000" />
          {(d.beforeWashTrims || []).map((r, i) => <TrimRow key={i} r={r} />)}

          {/* ── AFTER WASH TRIMS ────────────────────── */}
          <SecRow label="After Wash Trims" color="#c00" />
          {(d.afterWashTrims || []).map((r, i) => <TrimRow key={i} r={r} />)}

          {/* ── EMBELLISHMENT ───────────────────────── */}
          <SecRow label="Embellishment" color="#c07000" />
          {(d.embellishment || []).map((r, i) => <TrimRow key={i} r={r} />)}

          {/* ── PRODUCTION COST ─────────────────────── */}
          {/* Header row for this section: label + "LEVEL" header in col 3 */}
          <tr>
            <td colSpan={2} style={tdB({ color: '#c00', borderTop: BO, borderLeft: BO })}>Production Cost</td>
            <td style={tdB({ textAlign: 'center', borderTop: BO })}>LEVEL</td>
            <td style={td({ borderTop: BO })}></td>
            <td style={td({ borderTop: BO, borderRight: BO })}></td>
          </tr>
          <ProdRow label="Cmt (Codes Req Level 1 2 3)"     level={n(d.cmtLevel) || ''}     amount={d.cmtLevel} />
          <ProdRow label="Washing (Codes Req Level 1 2 3)" level={n(d.washingLevel) || ''} amount={d.washingLevel} />
          <ProdRow label="Fob"                              level=""                        amount={d.fob} />

          {/* ── FREIGHT ─────────────────────────────── */}
          <tr>
            <td colSpan={4} style={td({ borderLeft: BO, borderTop: BO })}>Freight</td>
            <td style={tdR({ borderTop: BO, borderRight: BO })}>{fmtAmt(d.freight)}</td>
          </tr>

          {/* ── MARGIN & COMMISSION ─────────────────── */}
          {/* Header: label + "Percentage %" column header */}
          <tr>
            <td colSpan={2} style={tdB({ color: '#c00', borderTop: BO, borderLeft: BO })}>Margin &amp; Commission</td>
            <td style={tdB({ textAlign: 'center', borderTop: BO })}>Percentage %</td>
            <td style={td({ borderTop: BO })}></td>
            <td style={td({ borderTop: BO, borderRight: BO })}></td>
          </tr>
          {/* Percentage % row — value in col 3, computed amount in col 5 */}
          <tr>
            <td colSpan={2} style={td({ borderLeft: BO })}>Percentage %</td>
            <td style={td({ textAlign: 'center' })}>{n(d.marginPct) || ''}</td>
            <td style={td()}></td>
            <td style={tdR({ borderRight: BO })}>
              {fmtAmt((n(d.cmtLevel) + n(d.washingLevel) + n(d.fob) +
                secSum(d.fabrics) + secSum(d.beforeWashTrims) +
                secSum(d.afterWashTrims) + secSum(d.embellishment) +
                n(d.freight)) * (n(d.marginPct) / 100))}
            </td>
          </tr>
          <Row2 label="Extra Cut"       value={fmtAmt(d.extraCut)} />
          <Row2 label="Ld Margin"       value={fmtAmt(d.ldMargin)} />
          {/* blank spacer row */}
          <tr><td colSpan={4} style={td({ borderLeft: BO, padding: '1px 3px' })}></td><td style={td({ borderRight: BO })}></td></tr>
          <Row2 label="Testing Charges" value={fmtAmt(d.testingCharges)} />
          <Row2 label="Commission"      value={fmtAmt(d.commission)} />

          {/* ── SUMMARY ─────────────────────────────── */}
          <Row2 label="Total Price PKR" value={Math.round(T.totalPkr)} bold />

          {/* Currency row: label | value | USD/Euro label | rate | empty */}
          <tr>
            <td style={td({ borderLeft: BO })}>Currency</td>
            <td style={td()}></td>
            <td style={td()}>USD/ Euro</td>
            <td style={tdR()}>{n(d.currencyRate) || 265}</td>
            <td style={td({ borderRight: BO })}></td>
          </tr>

          <Row2 label="Final Fob Us$" value={`$${fmtUsd(T.finalFob)}`} bold />

          {/* ── QUOTE TRACKING ──────────────────────── */}
          {/* First Quoted — green bg */}
          <QuoteRow
            label="First Quoted"
            bg="#92d050"
            labelBold
            dollarColor="#000"
            amountColor="#000"
            amount={d.firstQuoted}
          />
          {/* Target $ — white */}
          <QuoteRow
            label="Target $"
            dollarColor="#5b9bd5"
            amountColor="#5b9bd5"
            amount={d.targetPrice}
          />
          {/* Difference — white */}
          <QuoteRow
            label="Difference"
            dollarColor="#5b9bd5"
            amountColor="#5b9bd5"
            amount={T.diff}
          />
          {/* 2nd Quote — yellow bg */}
          <QuoteRow
            label="2nd Quote $"
            bg="#ffff00"
            labelBold
            dollarColor="#f97316"
            amountColor="#f97316"
            amount={d.secondQuote}
          />
          {/* Confirmed — green bg */}
          <QuoteRow
            label="Confirmed"
            bg="#92d050"
            labelBold
            dollarColor="#f97316"
            amountColor="#f97316"
            amount={d.confirmedPrice}
          />

        </tbody>
      </table>

      {/* ════════════════════════════════════════
          PRODUCT IMAGE  (right-aligned, below table)
          ════════════════════════════════════════ */}
      {(d.images || []).length > 0 && (
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={d.images[0].url}
            alt="Product"
            style={{ maxWidth: 180, maxHeight: 220, objectFit: 'contain' }}
          />
        </div>
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
