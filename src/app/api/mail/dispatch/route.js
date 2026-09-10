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
  const awb        = dispatch.awb || '';

  const { attachments, cids } = buildImageAttachments(srd, `img${idx}`);

  // Collect all image cids in one flat list (front + back together, no labels)
  const allCids = [...cids.front, ...cids.back];

  const tableRow = `
    <tr>
      <td style="border:1px solid #d0d0d0;padding:5px 8px;font-size:13px;font-family:Calibri,Arial,sans-serif;">${esc(brand)}</td>
      <td style="border:1px solid #d0d0d0;padding:5px 8px;font-size:13px;font-family:Calibri,Arial,sans-serif;">${esc(sampleType)}</td>
      <td style="border:1px solid #d0d0d0;padding:5px 8px;font-size:13px;font-family:Calibri,Arial,sans-serif;">${esc(srd.refNo || '')}</td>
      <td style="border:1px solid #d0d0d0;padding:5px 8px;font-size:13px;font-family:Calibri,Arial,sans-serif;">${esc(styleRef)}</td>
      <td style="border:1px solid #d0d0d0;padding:5px 8px;font-size:13px;font-family:Calibri,Arial,sans-serif;">${esc(desc)}</td>
      <td style="border:1px solid #d0d0d0;padding:5px 8px;font-size:13px;font-family:Calibri,Arial,sans-serif;">${esc(fit)}</td>
      <td style="border:1px solid #d0d0d0;padding:5px 8px;font-size:13px;font-family:Calibri,Arial,sans-serif;">${esc(color)}</td>
      <td style="border:1px solid #d0d0d0;padding:5px 8px;font-size:13px;font-family:Calibri,Arial,sans-serif;">${esc(size)}</td>
      <td style="border:1px solid #d0d0d0;padding:5px 8px;font-size:13px;font-family:Calibri,Arial,sans-serif;">${esc(qty)}</td>
    </tr>`;

  const imagesHtml = allCids.length
    ? `<div style="margin:12px 0 16px 0;">
        ${allCids.map(cid =>
          `<img src="cid:${cid}" alt="Product" style="max-width:180px;max-height:200px;border:1px solid #ddd;margin:0 8px 0 0;display:inline-block;" />`
        ).join('')}
       </div>`
    : '';

  return {
    attachments,
    html: `
      <div style="margin:0 0 20px 0;">
        ${idx > 0 ? `<hr style="border:none;border-top:1px solid #e0e0e0;margin:0 0 20px 0;" />` : ''}

        <table style="border-collapse:collapse;width:100%;margin-bottom:14px;font-family:Calibri,Arial,sans-serif;">
          <thead>
            <tr style="background:#f2f2f2;">
              <td style="border:1px solid #d0d0d0;padding:5px 8px;font-size:13px;font-family:Calibri,Arial,sans-serif;text-align:left;font-weight:bold;color:#000;">Brand</td>
              <td style="border:1px solid #d0d0d0;padding:5px 8px;font-size:13px;font-family:Calibri,Arial,sans-serif;text-align:left;font-weight:bold;color:#000;">Sample Type</td>
              <td style="border:1px solid #d0d0d0;padding:5px 8px;font-size:13px;font-family:Calibri,Arial,sans-serif;text-align:left;font-weight:bold;color:#000;">Inq Ref No</td>
              <td style="border:1px solid #d0d0d0;padding:5px 8px;font-size:13px;font-family:Calibri,Arial,sans-serif;text-align:left;font-weight:bold;color:#000;">Buyer Style Ref.</td>
              <td style="border:1px solid #d0d0d0;padding:5px 8px;font-size:13px;font-family:Calibri,Arial,sans-serif;text-align:left;font-weight:bold;color:#000;">Description</td>
              <td style="border:1px solid #d0d0d0;padding:5px 8px;font-size:13px;font-family:Calibri,Arial,sans-serif;text-align:left;font-weight:bold;color:#000;">Fit</td>
              <td style="border:1px solid #d0d0d0;padding:5px 8px;font-size:13px;font-family:Calibri,Arial,sans-serif;text-align:left;font-weight:bold;color:#000;">Color</td>
              <td style="border:1px solid #d0d0d0;padding:5px 8px;font-size:13px;font-family:Calibri,Arial,sans-serif;text-align:left;font-weight:bold;color:#000;">Size</td>
              <td style="border:1px solid #d0d0d0;padding:5px 8px;font-size:13px;font-family:Calibri,Arial,sans-serif;text-align:left;font-weight:bold;color:#000;">Qty</td>
            </tr>
          </thead>
          <tbody>
            ${tableRow}
          </tbody>
        </table>

        ${imagesHtml}
      </div>`,
  };
}

function buildEmailHTML({ blocks, awb, dispatchDate, representativeName, representativeEmail }) {

  // Build representative contact block — bullet-list style like the screenshot
  let repLines = '';
  if (representativeName && representativeEmail) {
    repLines = `<li style="margin:2px 0;"><strong>${esc(representativeName)}:</strong> <a href="mailto:${esc(representativeEmail)}" style="color:#1a56b0;text-decoration:none;">${esc(representativeEmail)}</a></li>`;
  } else {
    repLines = `
      <li style="margin:2px 0;"><strong>Usman:</strong> <a href="mailto:Usman@lazienda.com.pk" style="color:#1a56b0;text-decoration:none;">Usman@lazienda.com.pk</a></li>
      <li style="margin:2px 0;"><strong>Tayyab:</strong> <a href="mailto:Tayyab@lazienda.com.pk" style="color:#1a56b0;text-decoration:none;">Tayyab@lazienda.com.pk</a></li>`;
  }

  const dhlUrl = `https://www.dhl.com/pk-en/home/tracking.html${awb ? `?tracking-id=${esc(awb)}` : ''}`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#ffffff;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:720px;margin:0 auto;padding:24px 28px;font-family:Calibri,Arial,sans-serif;font-size:14px;color:#1a1a1a;line-height:1.5;">
  <tr><td>

    <!-- Greeting -->
    <p style="margin:0 0 12px 0;font-size:14px;font-family:Calibri,Arial,sans-serif;"><strong>Dear Merchandising Team,</strong></p>

    <!-- Intro -->
    <p style="margin:0 0 12px 0;font-size:14px;font-family:Calibri,Arial,sans-serif;">Please find the shipment details below for your tracking convenience:</p>

    <!-- Per-SRD blocks (table + images) -->
    ${blocks.map(b => b.html).join('')}

    <!-- DHL tracking line -->
    <p style="margin:0 0 18px 0;font-size:14px;font-family:Calibri,Arial,sans-serif;">
      You can monitor the real-time status of your delivery directly on the official
      <a href="${dhlUrl}" style="color:#1a56b0;text-decoration:underline;" target="_blank">DHL Tracking Portal</a>.
    </p>

    <!-- Divider -->
    <hr style="border:none;border-top:1px solid #cccccc;margin:0 0 14px 0;" />

    <!-- Footer note -->
    <p style="margin:0 0 8px 0;font-size:13px;font-family:Calibri,Arial,sans-serif;color:#333;font-style:italic;">
      <strong style="font-style:normal;">Please note:</strong>
      This is a system-generated message. If you require immediate merchandise assistance, please do not hesitate to contact our account management team directly:
    </p>
    <ul style="margin:0 0 14px 0;padding-left:22px;font-size:13px;font-family:Calibri,Arial,sans-serif;color:#1a1a1a;">
      ${repLines}
    </ul>

    <!-- Sign-off -->
    <p style="margin:0 0 12px 0;font-size:14px;font-family:Calibri,Arial,sans-serif;">Thank you for your continued partnership.</p>

    <!-- Company -->
    <p style="margin:0 0 2px 0;font-size:14px;font-family:Calibri,Arial,sans-serif;"><strong>LAZIENDA DENIM (PVT) LTD.</strong></p>
    <p style="margin:0;font-size:12px;font-family:Calibri,Arial,sans-serif;color:#555;font-style:italic;">🌱 Think before you print. Save paper, save trees.</p>

  </td></tr>
</table>
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
