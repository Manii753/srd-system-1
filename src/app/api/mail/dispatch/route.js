import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import dbConnect from '@/lib/db';
import SRD from '@/models/SRD';
import Dispatch from '@/models/Dispatch';
import Buyer from '@/models/Buyer';

// Build the HTML email body matching the design in the screenshot
function buildEmailHTML({ awb, dispatchDate, rows, buyerName, contactName, pictures = false }) {
  const formattedDate = dispatchDate
    ? new Date(dispatchDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: '2-digit' })
    : '—';

  const tableRows = rows.map(r => `
    <tr>
      <td style="border:1px solid #ccc;padding:4px 8px;font-size:12px;">${r.brand || ''}</td>
      <td style="border:1px solid #ccc;padding:4px 8px;font-size:12px;">${r.sampleType || 'DEVELOPMENT'}</td>
      <td style="border:1px solid #ccc;padding:4px 8px;font-size:12px;">${r.refNo || ''}</td>
      <td style="border:1px solid #ccc;padding:4px 8px;font-size:12px;">${r.buyerStyleRef || ''}</td>
      <td style="border:1px solid #ccc;padding:4px 8px;font-size:12px;">${r.description || ''}</td>
      <td style="border:1px solid #ccc;padding:4px 8px;font-size:12px;">${r.fit || ''}</td>
      <td style="border:1px solid #ccc;padding:4px 8px;font-size:12px;">${r.color || ''}</td>
      <td style="border:1px solid #ccc;padding:4px 8px;font-size:12px;">${r.size || ''}</td>
      <td style="border:1px solid #ccc;padding:4px 8px;font-size:12px;">${r.qty || ''}</td>
    </tr>`).join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Calibri,Arial,sans-serif;font-size:13px;color:#222;margin:0;padding:20px;">

  <p style="margin:0 0 6px 0;">Hi,</p>
  <p style="margin:0 0 16px 0;">
    Pls note courier no <strong>DHL ${awb || '—'}</strong> of below mentioned samples dispatch on Dated
    <strong>${formattedDate}</strong>
  </p>

  <table style="border-collapse:collapse;width:100%;margin-bottom:16px;">
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

  ${pictures ? `<p style="color:#2e7d32;font-style:italic;margin:0 0 12px 0;"><strong>Pictures attached</strong></p>` : ''}

  <p style="font-style:italic;margin:0 0 16px 0;">
    If you have any questions relating to the above, please do not hesitate to contact
    <strong>Usman and Tayyab</strong> directly at
    <a href="mailto:Usman@lazienda.com.pk" style="color:#1a73e8;">Usman@lazienda.com.pk</a> or
    <a href="mailto:Tayyab@lazienda.com.pk" style="color:#1a73e8;">Tayyab@lazienda.com.pk</a>
  </p>

  <p style="margin:0;">Thanks,<br>Regards,<br>Vmd Team<br>
    <strong>Lazienda Denim Pvt Ltd</strong> | Lahore Office - 22km Ferozpur Road Near Khan Khaca Railway Station
  </p>

</body>
</html>`;
}

// Extract a dynamic field value from SRD
function getDynField(srd, ...names) {
  for (const name of names) {
    const f = srd.dynamicFields?.find(
      f => f.name?.toLowerCase() === name.toLowerCase()
    );
    if (f?.value) return f.value;
  }
  return '';
}

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { srdIds, to, cc, subject, merge } = body;

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

    // Build rows for each SRD
    const buildRows = (srd) => [{
      brand:         getDynField(srd, 'brand', 'Brand'),
      sampleType:    getDynField(srd, 'sample type', 'Sample Type', 'sampleType') || 'DEVELOPMENT',
      refNo:         srd.refNo || '',
      buyerStyleRef: getDynField(srd, 'buyer style ref', 'Buyer Style Ref', 'style ref'),
      description:   getDynField(srd, 'description', 'Description', 'style', 'Style'),
      fit:           getDynField(srd, 'fit', 'Fit'),
      color:         getDynField(srd, 'color', 'Color'),
      size:          getDynField(srd, 'size', 'Size'),
      qty:           srd.DispatchDetails?.dispatchQuantity || getDynField(srd, 'qty', 'Qty', 'quantity'),
    }];

    // Create transporter
    const transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const fromName  = process.env.SMTP_FROM_NAME  || 'VMD Team';
    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

    if (merge) {
      // --- MERGE: one email with all SRDs in one table ---
      const allRows = srds.flatMap(buildRows);
      const firstSrd = srds[0];
      const dispatch = firstSrd.DispatchDetails;
      const awb  = dispatch?.awb || '';
      const date = dispatch?.sampleDispatchDate || null;
      const hasPics = !!(dispatch?.images?.[0]?.front?.length || dispatch?.images?.[0]?.back?.length);

      const html = buildEmailHTML({ awb, dispatchDate: date, rows: allRows, pictures: hasPics });
      const subjectLine = subject || `SDD-Development Sample-${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: '2-digit' })}`;

      await transporter.sendMail({
        from:    `"${fromName}" <${fromEmail}>`,
        to:      Array.isArray(to) ? to.join(', ') : to,
        cc:      cc ? (Array.isArray(cc) ? cc.join(', ') : cc) : undefined,
        subject: subjectLine,
        html,
      });

      return NextResponse.json({ success: true, sent: 1 });

    } else {
      // --- SEND: one email per SRD ---
      let sentCount = 0;
      for (const srd of srds) {
        const rows    = buildRows(srd);
        const dispatch = srd.DispatchDetails;
        const awb  = dispatch?.awb || '';
        const date = dispatch?.sampleDispatchDate || null;
        const hasPics = !!(dispatch?.images?.[0]?.front?.length || dispatch?.images?.[0]?.back?.length);

        const html = buildEmailHTML({ awb, dispatchDate: date, rows, pictures: hasPics });
        const subjectLine = subject || `SDD-Development Sample-${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: '2-digit' })}`;

        await transporter.sendMail({
          from:    `"${fromName}" <${fromEmail}>`,
          to:      Array.isArray(to) ? to.join(', ') : to,
          cc:      cc ? (Array.isArray(cc) ? cc.join(', ') : cc) : undefined,
          subject: subjectLine,
          html,
        });
        sentCount++;
      }

      return NextResponse.json({ success: true, sent: sentCount });
    }

  } catch (error) {
    console.error('Mail send error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
