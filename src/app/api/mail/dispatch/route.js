import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import dbConnect from '@/lib/db';
import SRD from '@/models/SRD';
import Dispatch from '@/models/Dispatch';
import Buyer from '@/models/Buyer';
import ReportGroup from '@/models/ReportGroup';
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
  const dispatch   = srd.DispatchDetails || {};
  const brand      = getDynField(srd, 'brand', 'Brand');
  const sampleType = getDynField(srd, 'sample type', 'Sample Type', 'sampleType') || 'PRODUCTION SAMPLE';
  const styleRef   = getDynField(srd, 'buyer style ref', 'style ref', 'Buyer Style Ref');
  const desc       = getDynField(srd, 'description', 'Description', 'style', 'Style');
  const fit        = getDynField(srd, 'fit', 'Fit');
  const color      = getDynField(srd, 'wash / color', 'wash/color', 'color/wash', 'color', 'wash');
  const size       = getDynField(srd, 'sample request size', 'size', 'Size');
  const qty        = dispatch.dispatchQuantity || getDynField(srd, 'sample request qty.', 'sample request qty', 'qty', 'quantity', 'Qty');

  const { attachments, cids } = buildImageAttachments(srd, `img${idx}`);
  const allCids = [...cids.front, ...cids.back];

  // Shared cell style strings to keep HTML compact
  const hCell = `border:1px solid #d0d0d0;padding:6px 10px;font-size:13px;font-family:Calibri,Arial,sans-serif;font-weight:bold;color:#000;text-align:left;white-space:nowrap;`;
  const dCell = `border:1px solid #d0d0d0;padding:6px 10px;font-size:13px;font-family:Calibri,Arial,sans-serif;color:#1a1a1a;`;

  const imagesHtml = allCids.length
    ? `<table cellpadding="0" cellspacing="0" style="margin:14px 0 0 0;"><tr>
        ${allCids.map(cid =>
          `<td style="padding:0 10px 0 0;vertical-align:top;">
            <img src="cid:${cid}" alt="Product" width="160" style="max-width:160px;max-height:200px;display:block;border:0;" />
           </td>`
        ).join('')}
       </tr></table>`
    : '';

  return {
    attachments,
    html: `
      ${idx > 0 ? `<table cellpadding="0" cellspacing="0" width="100%" style="margin:20px 0;"><tr><td style="border-top:1px solid #e0e0e0;font-size:0;line-height:0;">&nbsp;</td></tr></table>` : ''}

      <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;margin-bottom:0;table-layout:fixed;">
        <colgroup>
          <col style="width:13%;" />
          <col style="width:15%;" />
          <col style="width:10%;" />
          <col style="width:13%;" />
          <col style="width:18%;" />
          <col style="width:8%;" />
          <col style="width:10%;" />
          <col style="width:6%;" />
          <col style="width:5%;" />
        </colgroup>
        <tr style="background:#f2f2f2;">
          <td style="${hCell}">Brand</td>
          <td style="${hCell}">Sample Type</td>
          <td style="${hCell}">Inq Ref No</td>
          <td style="${hCell}">Buyer Style Ref.</td>
          <td style="${hCell}">Description</td>
          <td style="${hCell}">Fit</td>
          <td style="${hCell}">Color</td>
          <td style="${hCell}">Size</td>
          <td style="${hCell}">Qty</td>
        </tr>
        <tr>
          <td style="${dCell}">${esc(brand)}</td>
          <td style="${dCell}">${esc(sampleType)}</td>
          <td style="${dCell}">${esc(srd.refNo || '')}</td>
          <td style="${dCell}">${esc(styleRef)}</td>
          <td style="${dCell}">${esc(desc)}</td>
          <td style="${dCell}">${esc(fit)}</td>
          <td style="${dCell}">${esc(color)}</td>
          <td style="${dCell}">${esc(size)}</td>
          <td style="${dCell}">${esc(qty)}</td>
        </tr>
      </table>

      ${imagesHtml}`,
  };
}

function buildEmailHTML({ blocks, awb, representatives = [], representativeName, representativeEmail }) {
  const dhlUrl = `https://www.dhl.com/pk-en/home/tracking.html${awb ? `?tracking-id=${esc(awb)}` : ''}`;

  // Reps shown in the "contact our account management team" footer.
  // Priority: brand-group representatives -> single selected representative -> defaults.
  let repList = Array.isArray(representatives) && representatives.length
    ? representatives.filter(r => r && (r.name || '').trim() && (r.email || '').trim())
    : [];
  if (repList.length === 0 && representativeName && representativeEmail) {
    repList = [{ name: representativeName, email: representativeEmail }];
  }
  if (repList.length === 0) {
    repList = [
      { name: 'Usman', email: 'Usman@lazienda.com.pk' },
      { name: 'Tayyab', email: 'Tayyab@lazienda.com.pk' },
    ];
  }

  const repLines = repList
    .map(r => `<li style="margin:3px 0;font-family:Calibri,Arial,sans-serif;font-size:13px;">
          <strong>${esc(r.name)}:</strong>
          <a href="mailto:${esc(r.email)}" style="color:#1a56b0;text-decoration:none;">${esc(r.email)}</a>
        </li>`)
    .join('');

  // p style used throughout body
  const pStyle = `margin:0 0 14px 0;font-size:14px;font-family:Calibri,Arial,sans-serif;color:#1a1a1a;line-height:1.6;`;

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no" />
</head>
<body style="margin:0;padding:0;background:#ffffff;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

<!-- Outer wrapper -->
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#ffffff;">
  <tr>
    <td align="left" style="padding:28px 32px;font-family:Calibri,Arial,sans-serif;">

      <!-- Greeting -->
      <p style="${pStyle}"><strong>Dear Merchandising Team,</strong></p>

      <!-- Intro -->
      <p style="${pStyle}">Please find the shipment details below for your tracking convenience:</p>

      <!-- SRD blocks -->
      ${blocks.map(b => b.html).join('')}

      <!-- Spacer after last block -->
      <table cellpadding="0" cellspacing="0" width="100%"><tr><td style="padding:14px 0 0 0;font-size:0;line-height:0;">&nbsp;</td></tr></table>

      <!-- DHL line -->
      <p style="${pStyle}">
        You can monitor the real-time status of your delivery directly on the official
        <a href="${dhlUrl}" style="color:#1a56b0;text-decoration:underline;" target="_blank">DHL Tracking Portal</a>.
      </p>

      <!-- Divider -->
      <table cellpadding="0" cellspacing="0" width="100%" style="margin:4px 0 18px 0;">
        <tr><td style="border-top:1px solid #cccccc;font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>

      <!-- Footer note -->
      <p style="margin:0 0 8px 0;font-size:13px;font-family:Calibri,Arial,sans-serif;color:#333;font-style:italic;line-height:1.5;">
        <strong style="font-style:normal;">Please note:</strong>
        This is a system-generated message. If you require immediate merchandise assistance, please do not hesitate to contact our account management team directly:
      </p>
      <ul style="margin:0 0 16px 0;padding-left:22px;">
        ${repLines}
      </ul>

      <!-- Sign-off — wrap in span to prevent Gmail auto-linking -->
      <p style="${pStyle}"><span style="color:#1a1a1a;text-decoration:none;">Thank you for your continued partnership.</span></p>

      <!-- Company name -->
      <p style="margin:0 0 2px 0;font-size:14px;font-family:Calibri,Arial,sans-serif;color:#1a1a1a;"><strong>LAZIENDA DENIM (PVT) LTD.</strong></p>

      <!-- Eco note -->
      <p style="margin:0;font-size:12px;font-family:Calibri,Arial,sans-serif;color:#555;font-style:italic;">&#127807; Think before you print. Save paper, save trees.</p>

    </td>
  </tr>
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

    // Resolve brand-group representatives for the SRDs being emailed, so the
    // email footer shows the reps assigned to the group(s) those brands belong to.
    const groupReps = [];
    try {
      const groups = await ReportGroup.find({ isActive: true })
        .select('brands representatives')
        .lean();
      const seen = new Set();
      for (const srd of srds) {
        const brand = getDynField(srd, 'brand', 'Brand').trim().toLowerCase();
        if (!brand) continue;
        for (const g of groups) {
          const reps = g.representatives || [];
          if (!reps.length) continue;
          const matchesGroup = (g.brands || []).some(b => String(b).trim().toLowerCase() === brand);
          if (!matchesGroup) continue;
          for (const r of reps) {
            const email = (r?.email || '').trim().toLowerCase();
            if (email && !seen.has(email)) {
              seen.add(email);
              groupReps.push({ name: (r.name || '').trim(), email: r.email.trim() });
            }
          }
        }
      }
    } catch (groupError) {
      console.error('Error resolving group representatives:', groupError);
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
      representatives: groupReps,
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
