import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import dbConnect from '@/lib/db';
import SRD from '@/models/SRD';
import Dispatch from '@/models/Dispatch';
import Buyer from '@/models/Buyer';
import { resolveUploadAbsolutePath } from '@/lib/serverAssetUtils';

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toAbsolutePath(url) {
  return resolveUploadAbsolutePath(url);
}

function formatDate(value) {
  return value
    ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: '2-digit' })
    : '—';
}

function getDynField(srd, ...names) {
  const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normNames = names.map(norm);
  for (const f of (srd.dynamicFields || [])) {
    if (f?.value != null && String(f.value) !== '') {
      if (normNames.includes(norm(f.name || ''))) return String(f.value);
    }
  }
  return '';
}

function buildImageAttachments(srd, prefix) {
  const attachments = [];
  const cids = { front: [], back: [] };
  const dispatch = srd.DispatchDetails;
  const imgObj = (dispatch?.images && dispatch.images.length > 0) ? dispatch.images[0] : {};

  for (const side of ['front', 'back']) {
    const urls = Array.isArray(imgObj[side]) ? imgObj[side] : [];
    urls.forEach((url, i) => {
      const absolutePath = toAbsolutePath(url);
      if (!absolutePath) return;
      const cid = `${prefix}_${side}_${i}`;
      cids[side].push(cid);
      attachments.push({
        filename: `${side}-${i + 1}.jpg`,
        path: absolutePath,
        cid,
      });
    });
  }

  return { attachments, cids };
}

function buildDispatchBlock(srd, idx) {
  const dispatch = srd.DispatchDetails || {};
  const brand      = getDynField(srd, 'brand', 'Brand');
  const sampleType = getDynField(srd, 'sample type', 'Sample Type', 'sampleType') || 'PRODUCTION SAMPLE';
  const styleRef   = getDynField(srd, 'buyer style ref', 'style ref', 'Buyer Style Ref');
  const desc       = getDynField(srd, 'description', 'Description', 'style', 'Style');
  const fit        = getDynField(srd, 'fit', 'Fit');
  const color      = getDynField(srd, 'wash / color', 'wash/color', 'color/wash', 'color', 'wash');
  const size       = getDynField(srd, 'sample request size', 'size', 'Size');
  const qty        = dispatch.dispatchQuantity || getDynField(srd, 'sample request qty.', 'sample request qty', 'qty', 'quantity', 'Qty');

  const { attachments, cids } = buildImageAttachments(srd, `img${idx}`);

  const tableRows = `
    <tr>
      <td style="border:1px solid #ccc;padding:4px 8px;font-size:12px;">${esc(brand)}</td>
      <td style="border:1px solid #ccc;padding:4px 8px;font-size:12px;">${esc(sampleType)}</td>
      <td style="border:1px solid #ccc;padding:4px 8px;font-size:12px;">${esc(srd.refNo || '')}</td>
      <td style="border:1px solid #ccc;padding:4px 8px;font-size:12px;">${esc(styleRef)}</td>
      <td style="border:1px solid #ccc;padding:4px 8px;font-size:12px;">${esc(desc)}</td>
      <td style="border:1px solid #ccc;padding:4px 8px;font-size:12px;">${esc(fit)}</td>
      <td style="border:1px solid #ccc;padding:4px 8px;font-size:12px;">${esc(color)}</td>
      <td style="border:1px solid #ccc;padding:4px 8px;font-size:12px;">${esc(size)}</td>
      <td style="border:1px solid #ccc;padding:4px 8px;font-size:12px;">${esc(qty)}</td>
    </tr>`;

  const renderImages = (side, label) => {
    if (!cids[side].length) return '';
    return `
      <div style="margin:0 0 12px 0;">
        <p style="margin:0 0 6px 0;font-size:13px;"><strong>${esc(label)}</strong></p>
        ${cids[side].map(cid => `<img src="cid:${cid}" alt="${esc(label)}" style="max-width:220px;max-height:220px;border:1px solid #ccc;border-radius:4px;margin:0 6px 6px 0;" />`).join('')}
      </div>`;
  };

  return {
    attachments,
    html: `
      <div style="margin:0 0 20px 0;">
        ${idx > 0 ? `<hr style="border:none;border-top:2px solid #eee;margin:0 0 20px 0;" />` : ''}

        <table style="border-collapse:collapse;width:100%;margin-bottom:12px;">
          <thead>
            <tr style="background:#f2f2f2;">
              <th style="border:1px solid #ccc;padding:4px 8px;font-size:12px;text-align:left;">Brand</th>
              <th style="border:1px solid #ccc;padding:4px 8px;font-size:12px;text-align:left;">Sample Type</th>
              <th style="border:1px solid #ccc;padding:4px 8px;font-size:12px;text-align:left;">Inq Ref No</th>
              <th style="border:1px solid #ccc;padding:4px 8px;font-size:12px;text-align:left;">Buyer Style Ref.</th>
              <th style="border:1px solid #ccc;padding:4px 8px;font-size:12px;text-align:left;">Description</th>
              <th style="border:1px solid #ccc;padding:4px 8px;font-size:12px;text-align:left;">Fit</th>
              <th style="border:1px solid #ccc;padding:4px 8px;font-size:12px;text-align:left;">Color</th>
              <th style="border:1px solid #ccc;padding:4px 8px;font-size:12px;text-align:left;">Size</th>
              <th style="border:1px solid #ccc;padding:4px 8px;font-size:12px;text-align:left;">Qty</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        ${renderImages('front', 'Front Pictures')}
        ${renderImages('back', 'Back Pictures')}
      </div>`,
  };
}

function buildEmailHTML({ blocks, awb, dispatchDate, representativeName, representativeEmail }) {
  const formattedDate = formatDate(dispatchDate);
  const dhlLink = awb
    ? `<a href="https://www.dhl.com/pk-en/home/tracking.html?tracking-id=${esc(awb)}" style="color:#1a73e8;text-decoration:underline;" target="_blank">${esc(awb)}</a>`
    : '—';

  const repBlock = (representativeName && representativeEmail)
    ? `${esc(representativeName)}: <a href="mailto:${esc(representativeEmail)}" style="color:#1a73e8;">${esc(representativeEmail)}</a>`
    : `Usman: <a href="mailto:Usman@lazienda.com.pk" style="color:#1a73e8;">Usman@lazienda.com.pk</a>
       Tayyab: <a href="mailto:Tayyab@lazienda.com.pk" style="color:#1a73e8;">Tayyab@lazienda.com.pk</a>`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Calibri,Arial,sans-serif;font-size:13px;color:#222;margin:0;padding:20px;">

  <p style="margin:0 0 16px 0;">Dear Merchandising Team,</p>
  <p style="margin:0 0 16px 0;">
    Please find the shipment details below for your tracking convenience:
  </p>

  ${blocks.map(b => b.html).join('')}

  <p style="margin:0 0 10px 0;">
    You can monitor the real-time status of your delivery directly on the official
    <a href="https://www.dhl.com/pk-en/home/tracking.html${awb ? `?tracking-id=${esc(awb)}` : ''}" style="color:#1a73e8;text-decoration:underline;" target="_blank">DHL Tracking Portal</a>.
  </p>

  <p style="margin:0 0 16px 0;font-size:12px;color:#555;">
    Please note: This is a system-generated message. If you require immediate merchandise assistance, please do not hesitate to contact our account management team directly:<br/>
    ${repBlock}
  </p>

  <p style="margin:0 0 4px 0;">Thank you for your continued partnership.</p>
  <p style="margin:0 0 4px 0;"><strong>LAZIENDA DENIM (PVT) LTD.</strong></p>
  <p style="margin:0;font-size:11px;color:#888;">🌱 Think before you print. Save paper, save trees.</p>

</body>
</html>`;
}

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { srdIds, to, cc, subject, merge, representativeName, representativeEmail } = body;

    if (!srdIds?.length) {
      return NextResponse.json({ error: 'No SRD IDs provided' }, { status: 400 });
    }
    if (!to?.length) {
      return NextResponse.json({ error: 'No recipient email provided' }, { status: 400 });
    }

    // Fetch all SRDs
    const srds = await SRD.find({ _id: { $in: srdIds } })
      .populate('BuyerDetails')
      .populate('DispatchDetails')
      .lean();

    if (!srds.length) {
      return NextResponse.json({ error: 'SRDs not found' }, { status: 404 });
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 10000,
      greetingTimeout:   10000,
      socketTimeout:     15000,
    });

    const fromName  = process.env.SMTP_FROM_NAME  || 'VMD Team';
    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
    const defaultSubject = `SDD-Development Sample-${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: '2-digit' })}`;

    const blocks = srds.map((srd, i) => buildDispatchBlock(srd, i));
    const allAttachments = blocks.flatMap(b => b.attachments);
    const firstSrd = srds[0];
    const firstDispatch = firstSrd.DispatchDetails || {};
    const html = buildEmailHTML({
      blocks,
      awb: firstDispatch.awb || '',
      dispatchDate: firstDispatch.sampleDispatchDate || null,
      representativeName,
      representativeEmail,
    });
    const subjectLine = subject || defaultSubject;

    await transporter.sendMail({
      from:    `"${fromName}" <${fromEmail}>`,
      to:      Array.isArray(to) ? to.join(', ') : to,
      cc:      cc ? (Array.isArray(cc) ? cc.join(', ') : cc) : undefined,
      subject: subjectLine,
      html,
      attachments: allAttachments,
    });

    // Mark all SRDs as completed after successful email send
    for (const srd of srds) {
      try {
        await SRD.findByIdAndUpdate(srd._id, {
          $set: {
            isComplete: true,
            inProduction: false,
            currentProductionStage: null,
            productionEndDate: srd.productionEndDate || new Date(),
          }
        });
      } catch (err) {
        console.error(`Failed to mark SRD ${srd.refNo} as complete:`, err);
      }
    }

    return NextResponse.json({ success: true, sent: srds.length });

  } catch (error) {
    console.error('Mail send error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
