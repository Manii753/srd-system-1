'use client';
import { Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const AirwayBillPrint = ({ srd }) => {
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const companyRes = await fetch('/api/company');
      const company = await companyRes.json();

      // Extract data from the srd object
      const dispatch = typeof srd.DispatchDetails === 'object' ? srd.DispatchDetails : null;
      const buyer = typeof srd.BuyerDetails === 'object' ? srd.BuyerDetails : null;
      const stages = srd.productionHistory || [];

      if (!dispatch) {
        alert('No dispatch details found for this SRD.');
        return;
      }

      const logoHTML = company.logo
        ? `<img src="${company.logo}" alt="logo" style="max-height:50px;max-width:100px;object-fit:contain;" />`
        : '<span style="font-size:20px;font-weight:bold;">LOGO</span>';

      // Format date helper
      const fmtDate = (d) => {
        if (!d) return '';
        const dt = new Date(d);
        if (isNaN(dt)) return '';
        return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      };

      // Approval info
      const approvedBy = srd.internalApprovedBy || '';
      const internalComments = srd.internalComments || '';

      // Buyer info
      const buyerName = buyer?.name || '';
      const buyerEmails = buyer?.email || [];
      const buyerPhones = buyer?.phone || [];
      const contactPersons = buyer?.contactPerson || [];

      // Dispatch info
      const awb = dispatch.awb || '';
      const dispatchQty = dispatch.dispatchQuantity || '';
      const dispatchAddress = dispatch.address || '';
      const sampleDispatchDate = fmtDate(dispatch.sampleDispatchDate);

      // Images
      const imgObj = dispatch.images && dispatch.images.length > 0 ? dispatch.images[0] : {};
      const frontImages = imgObj.front || [];
      const backImages = imgObj.back || [];

      // Departments from status
      const departments = srd.status ? Object.keys(srd.status) : [];

      // Build email rows
      const emailRows = buyerEmails.map((e, i) => 
        `<tr><td style="border:1px solid #000;padding:4px 8px;font-weight:bold;">${i === 0 ? 'Email' : ''}</td><td style="border:1px solid #000;padding:4px 8px;text-align:center;">${i + 1}</td><td style="border:1px solid #000;padding:4px 8px;" colspan="2"><a href="mailto:${e}">${e}</a></td></tr>`
      ).join('');

      // Build contact person rows
      const contactRows = contactPersons.map((cp, i) => 
        `<tr><td style="border:1px solid #000;padding:4px 8px;font-weight:bold;">${i === 0 ? 'Contact Person' : ''}</td><td style="border:1px solid #000;padding:4px 8px;" colspan="3">${cp.name || ''} ${cp.phone ? '(' + cp.phone + ')' : ''}</td></tr>`
      ).join('');

      // Build phone rows
      const phoneRows = buyerPhones.map((p, i) => 
        `<tr><td style="border:1px solid #000;padding:4px 8px;font-weight:bold;">${i === 0 ? 'Contact No.' : ''}</td><td style="border:1px solid #000;padding:4px 8px;" colspan="3">${p}</td></tr>`
      ).join('');

      // Build stages section
      const stageRows = stages.map(s => {
        const stageName = s.stageDisplayName || s.stageName || '';
        const startDate = fmtDate(s.startDate);
        const endDate = s.endDate ? fmtDate(s.endDate) : '';
        const status = s.status || '';
        const isCompleted = status === 'completed';
        const isInProgress = status === 'in-progress';
        const bgColor = isCompleted ? '#22c55e' : isInProgress ? '#eab308' : '#e5e7eb';
        const textColor = isCompleted || isInProgress ? '#fff' : '#000';
        
        // Left column: stage completed label
        const leftLabel = `${stageName} ${isCompleted ? 'Completed' : isInProgress ? 'In Progress' : status}`;
        // Right column: received by next stage
        const receivedLabel = isCompleted && endDate ? `Sample Rec. on ${endDate}` : isInProgress ? 'In Process' : '';

        return `<tr>
          <td style="border:1px solid #000;padding:4px 8px;font-weight:bold;background:${bgColor};color:${textColor};font-size:10px;">${leftLabel}</td>
          <td style="border:1px solid #000;padding:4px 8px;font-weight:bold;font-size:10px;background:${isInProgress ? '#eab308' : 'transparent'};color:${isInProgress ? '#fff' : '#000'};">${receivedLabel}</td>
          <td style="border:1px solid #000;padding:4px 8px;text-align:center;font-size:10px;" colspan="2">${isCompleted && endDate ? endDate : isInProgress ? 'In Process' : ''}</td>
        </tr>`;
      }).join('');

      // Front/back images
      const frontImgHTML = frontImages.length > 0
        ? frontImages.map(url => `<img src="${url}" style="max-height:80px;max-width:120px;object-fit:contain;margin:2px;" />`).join('')
        : '<span style="color:#999;font-size:10px;">No front images</span>';

      const backImgHTML = backImages.length > 0
        ? backImages.map(url => `<img src="${url}" style="max-height:80px;max-width:120px;object-fit:contain;margin:2px;" />`).join('')
        : '<span style="color:#999;font-size:10px;">No back images</span>';

      // Internal Rejected reasons from srd model
      const internalRejectReasons = srd.internalRejectedReasons || [];
      const rejectRows = (!srd.internalApproved && internalRejectReasons.length > 0)
        ? internalRejectReasons.map((r, i) => 
            `<tr><td style="border:1px solid #000;padding:3px 8px;font-weight:${i === 0 ? 'bold' : 'normal'};color:${i === 0 ? '#dc2626' : '#000'};font-size:10px;">${i === 0 ? 'Internal Rejected' : ''}</td><td style="border:1px solid #000;padding:3px 8px;font-size:10px;">Reasons</td><td style="border:1px solid #000;padding:3px 8px;font-weight:bold;font-size:10px;">${i + 1}</td><td style="border:1px solid #000;padding:3px 8px;text-transform:capitalize;font-size:10px;">${r.department || ''} — ${r.reason || ''}</td></tr>`
          ).join('')
        : '';

      // Buyer Rejected reasons from srd model
      const buyerRejectReasons = srd.BuyerRejectedReasons || [];
      const buyerRejectRows = (!srd.BuyerApproved && buyerRejectReasons.length > 0)
        ? buyerRejectReasons.map((r, i) => 
            `<tr><td style="border:1px solid #000;padding:3px 8px;font-weight:${i === 0 ? 'bold' : 'normal'};color:${i === 0 ? '#dc2626' : '#000'};font-size:10px;">${i === 0 ? 'Rejected' : ''}</td><td style="border:1px solid #000;padding:3px 8px;font-size:10px;">Reasons</td><td style="border:1px solid #000;padding:3px 8px;font-weight:bold;font-size:10px;">${i + 1}</td><td style="border:1px solid #000;padding:3px 8px;text-transform:capitalize;font-size:10px;">${r.department || ''} — ${r.reason || ''}</td></tr>`
          ).join('')
        : '';

      const printWindow = window.open('', '_blank');
      if (!printWindow) { alert('Please allow popups to print.'); return; }

      printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Air Waybill - ${srd.refNo || ''}</title>
  <style>
    @page { size: A4; margin: 1cm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      font-family: Arial, sans-serif;
      font-size: 11px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    table { width: 100%; border-collapse: collapse; }
    td { vertical-align: top; }
    .section-header {
      font-size: 11px;
      font-weight: bold;
      padding: 5px 8px;
      border: 1px solid #000;
      background: #f1f5f9;
    }
    a { color: #2563eb; }
  </style>
</head>
<body>
  <!-- Header -->
  <table>
    <tr>
      <td style="border:1.5px solid #000;padding:0;" colspan="3">
        <div style="display:flex;justify-content:space-between;align-items:stretch;">
          <div style="flex:1;">
            <div style="font-size:12px;font-weight:bold;padding:6px 8px;text-transform:uppercase;border-bottom:1.5px solid #000;">
              ${company.name || 'Company Name'}
            </div>
            <div style="font-size:12px;font-weight:bold;padding:6px 8px;">
              AIR WAYBILL / DISPATCH DETAILS
            </div>
          </div>
          <div style="border-left:1.5px solid #000;padding:6px 10px;display:flex;align-items:center;justify-content:center;">
            ${logoHTML}
          </div>
        </div>
      </td>
    </tr>
    <tr>
      <td style="border:1px solid #000;padding:4px 8px;font-size:10px;font-weight:bold;" colspan="3">
        SRD Ref: ${srd.refNo || ''} ${srd.title ? ' — ' + srd.title : ''}
      </td>
    </tr>
  </table>

  <!-- Conditions Section -->
  <table>
    <tr>
      <td class="section-header" colspan="4">Conditions</td>
    </tr>
    <tr>
      <td style="border:1px solid #000;padding:4px 8px;font-weight:bold;">Approved For Dispatch</td>
      <td style="border:1px solid #000;padding:4px 8px;">${srd.internalApproved ? '✅ Yes' : '❌ No'}</td>
      <td style="border:1px solid #000;padding:4px 8px;font-weight:bold;">Approved By</td>
      <td style="border:1px solid #000;padding:4px 8px;">${approvedBy}</td>
    </tr>
    ${rejectRows}
    ${internalComments ? `<tr>
      <td style="border:1px solid #000;padding:4px 8px;font-weight:bold;">Internal Comments</td>
      <td style="border:1px solid #000;padding:4px 8px;" colspan="3">${internalComments}</td>
    </tr>` : ''}
  </table>

  <!-- Buyer Approval Section -->
  <table>
    <tr>
      <td class="section-header" colspan="4">After Approval from Buyer we will fill below options</td>
    </tr>
    <tr>
      <td style="border:1px solid #000;padding:4px 8px;font-weight:bold;background:${srd.BuyerApproved ? '#22c55e' : '#f1f5f9'};color:${srd.BuyerApproved ? '#fff' : '#000'};">Approved</td>
      <td style="border:1px solid #000;padding:4px 8px;background:${srd.BuyerApproved ? '#dcfce7' : 'transparent'};" colspan="3">${srd.BuyerApproved ? '✅ Yes' : 'Pending'}</td>
    </tr>
    ${srd.BuyerComments ? `<tr>
      <td style="border:1px solid #000;padding:4px 8px;font-weight:bold;background:#fef9c3;">Approved With Comments</td>
      <td style="border:1px solid #000;padding:4px 8px;" colspan="2">${srd.BuyerComments}</td>
      <td style="border:1px solid #000;padding:4px 8px;font-weight:bold;">Attach Comments</td>
    </tr>` : ''}
    ${srd.BuyerApprovedDate && !srd.BuyerApproved ? `<tr>
      <td style="border:1px solid #000;padding:4px 8px;font-weight:bold;color:#dc2626;">Rejected</td>
      <td style="border:1px solid #000;padding:4px 8px;" colspan="3">${srd.BuyerComments || ''}</td>
    </tr>` : ''}
    ${buyerRejectRows}
  </table>

  <!-- Dispatch Details Section -->
  <table>
    <tr>
      <td class="section-header" colspan="4">Dispatch Details</td>
    </tr>
    <tr>
      <td style="border:1px solid #000;padding:4px 8px;font-weight:bold;width:25%;">Sample Dispatch Date</td>
      <td style="border:1px solid #000;padding:4px 8px;width:25%;">${sampleDispatchDate}</td>
      <td style="border:1px solid #000;padding:4px 8px;font-weight:bold;width:15%;">AWB #</td>
      <td style="border:1px solid #000;padding:4px 8px;width:35%;">${awb}</td>
    </tr>
    <tr>
      <td style="border:1px solid #000;padding:4px 8px;font-weight:bold;">Attach Picture Front</td>
      <td style="border:1px solid #000;padding:4px 8px;">${frontImgHTML}</td>
      <td style="border:1px solid #000;padding:4px 8px;font-weight:bold;">Attach Picture Back</td>
      <td style="border:1px solid #000;padding:4px 8px;">${backImgHTML}</td>
    </tr>
    <tr>
      <td style="border:1px solid #000;padding:4px 8px;font-weight:bold;">Dispatch Qty</td>
      <td style="border:1px solid #000;padding:4px 8px;">${dispatchQty}</td>
      <td style="border:1px solid #000;padding:4px 8px;font-weight:bold;">Buyer</td>
      <td style="border:1px solid #000;padding:4px 8px;">${buyerName}</td>
    </tr>

    ${contactRows || `<tr>
      <td style="border:1px solid #000;padding:4px 8px;font-weight:bold;">Contact Person</td>
      <td style="border:1px solid #000;padding:4px 8px;" colspan="3">-</td>
    </tr>`}

    <tr>
      <td style="border:1px solid #000;padding:4px 8px;font-weight:bold;">Department</td>
      <td style="border:1px solid #000;padding:4px 8px;" colspan="3">${departments.map(d => d.toUpperCase()).join(', ') || '-'}</td>
    </tr>
    <tr>
      <td style="border:1px solid #000;padding:4px 8px;font-weight:bold;">Address</td>
      <td style="border:1px solid #000;padding:4px 8px;" colspan="3">${dispatchAddress || '-'}</td>
    </tr>

    ${emailRows || `<tr>
      <td style="border:1px solid #000;padding:4px 8px;font-weight:bold;">Email</td>
      <td style="border:1px solid #000;padding:4px 8px;" colspan="3">-</td>
    </tr>`}

    ${phoneRows || `<tr>
      <td style="border:1px solid #000;padding:4px 8px;font-weight:bold;">Contact No.</td>
      <td style="border:1px solid #000;padding:4px 8px;" colspan="3">-</td>
    </tr>`}
  </table>

  <!-- Stages Section -->
  ${stages.length > 0 ? `
  <table>
    <tr>
      <td class="section-header" colspan="4">Stages</td>
    </tr>
    <tr>
      <td style="border:1px solid #000;padding:3px 8px;font-size:9px;color:#666;" colspan="4">
        For Status Need to fill below stages against each Inquiry
      </td>
    </tr>
    ${stageRows}
  </table>
  ` : ''}

  <script>window.onload = () => window.print();</script>
</body>
</html>`);
      printWindow.document.close();
    } catch (err) {
      console.error('Air Waybill print failed', err);
      alert('Failed to print Air Waybill');
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <Button
      onClick={handlePrint}
      size="sm"
      variant="outline"
      className="h-7 px-3 py-0 text-xs bg-white text-green-700 border-green-200 hover:bg-green-50"
      disabled={isPrinting}
    >
      {isPrinting ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Wait...</> : <><Printer className="h-3 w-3 mr-1" />Print Air Waybill</>}
    </Button>
  );
};

export default AirwayBillPrint;
