'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { formatFieldValueForDisplay, getFirstImageUrlFromDynamicFields } from '@/lib/assetUtils';

function ReportPrintContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [srds, setSRDs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('detailed');
  const [reportFields, setReportFields] = useState([]);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const type = searchParams.get('reportType') || 'detailed';
        setReportType(type);

        // If dynamic report, fetch the report template fields
        if (type === 'dynamic') {
          const fieldsRes = await fetch('/api/newField?inReport=true');
          const fieldsData = await fieldsRes.json();
          if (Array.isArray(fieldsData)) {
            setReportFields(fieldsData.sort((a, b) => (a.inReportOrder || 0) - (b.inReportOrder || 0)));
          }
        }

        // Build query with filters
        const query = new URLSearchParams(searchParams);
        query.set('populate', 'true');

        const response = await fetch(`/api/srd?${query.toString()}`);
        const data = await response.json();
        if (data.success) {
          setSRDs(data.data);
        }
      } catch (error) {
        console.error('Error fetching data for report:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session, status, router, searchParams]);

  const getDynamicFieldValue = (srd, fieldName) => {
    if (!srd.dynamicFields) return '';

    const field = srd.dynamicFields.find(df =>
      df.name?.toLowerCase() === fieldName.toLowerCase() ||
      df.field?.name?.toLowerCase() === fieldName.toLowerCase()
    );

    if (!field || field.value === null || field.value === undefined) return '';

    return formatFieldValueForDisplay(field.value, field.type || field.field?.type);
  };

  const getStatusDisplay = (srd) => {
    if (srd.isComplete) return 'Completed';
    if (srd.inProduction) {
      if (srd.currentProductionStage && typeof srd.currentProductionStage === 'object') {
        return srd.currentProductionStage.displayName || srd.currentProductionStage.name || 'In Production';
      }
      return 'In Production';
    }
    return 'Pre-Production';
  };

  const getImage = (srd) => {
    return getFirstImageUrlFromDynamicFields(srd.dynamicFields);
  };

  const renderDynamicCellValue = (srd, field) => {
    // Special handling for image fields
    if (field.type === 'image') {
      const imgUrl = getDynamicFieldValue(srd, field.name);
      if (imgUrl) {
        return <img src={imgUrl} alt={field.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
      }
      return '';
    }
    return getDynamicFieldValue(srd, field.name);
  };

  if (loading) return <div className="p-8 text-center">Loading report data...</div>;

  return (
    <div className="p-4 max-w-full mx-auto bg-white">
      <style jsx global>{`
        @media print {
          @page {
            size: landscape;
            margin: 5mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: none;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
        }
        
        table {
          border-collapse: collapse;
          width: 100%;
          font-size: 9px;
        }
        
        th, td {
          border: 1px solid #000;
          padding: 4px 6px;
          text-align: left;
          vertical-align: middle;
        }
        
        th {
          background-color: #d3d3d3;
          font-weight: bold;
          text-transform: uppercase;
          font-size: 8px;
        }
        
        .img-cell {
          width: 60px;
          height: 60px;
          padding: 2px;
        }
        
        .img-cell img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      `}</style>

      <div className="flex justify-between items-center mb-4 no-print">
        <h1 className="text-2xl font-bold">
          {reportType === 'detailed' ? 'Detailed SRD Report' : reportType === 'summary' ? 'Summary SRD Report' : 'Dynamic SRD Report'}
        </h1>
        <button
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
        >
          Print / Save as PDF
        </button>
      </div>

      <div className="mb-4">
        <div className="text-sm text-gray-600">
          Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
        </div>
        <div className="text-sm text-gray-600">
          Total Records: {srds.length}
        </div>
      </div>

      {reportType === 'dynamic' ? (
        // DYNAMIC REPORT FORMAT — columns from inReport fields
        reportFields.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No fields are configured for the report template. Go to Reports page and configure the template.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                {reportFields.map(field => (
                  <th key={field._id}>{field.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {srds.map((srd) => (
                <tr key={srd._id}>
                  {reportFields.map(field => (
                    <td key={field._id} className={field.type === 'image' ? 'img-cell' : ''}>
                      {renderDynamicCellValue(srd, field)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )
      ) : reportType === 'detailed' ? (
        // DETAILED REPORT FORMAT
        <table>
          <thead>
            <tr>
              <th>DATE</th>
              <th>BRAND</th>
              <th>SAMPLE TYPE</th>
              <th>STYLE</th>
              <th>DESCRIPTION</th>
              <th>SIZE</th>
              <th>QTY/# OF PCS</th>
              <th>COLOR/WASH</th>
              <th>FABRIC</th>
              <th>SAMPLE RAISED</th>
              <th>INQUIRY #</th>
              <th>STATUS</th>
              <th>INQUIRY STATUS</th>
              <th>PICTURE</th>
              <th>ETD</th>
            </tr>
          </thead>
          <tbody>
            {srds.map((srd) => (
              <tr key={srd._id}>
                <td>{new Date(srd.createdAt).toLocaleDateString()}</td>
                <td>{getDynamicFieldValue(srd, 'brand')}</td>
                <td>{getDynamicFieldValue(srd, 'sample type')}</td>
                <td>{getDynamicFieldValue(srd, 'style')}</td>
                <td>{getDynamicFieldValue(srd, 'description')}</td>
                <td>{getDynamicFieldValue(srd, 'size')}</td>
                <td>{getDynamicFieldValue(srd, 'qty') || getDynamicFieldValue(srd, 'sample request qty')}</td>
                <td>{getDynamicFieldValue(srd, 'color') || getDynamicFieldValue(srd, 'wash / color')}</td>
                <td>{getDynamicFieldValue(srd, 'fabric')}</td>
                <td>{getDynamicFieldValue(srd, 'sample raised')}</td>
                <td>{srd.refNo}</td>
                <td>{getStatusDisplay(srd)}</td>
                <td>{getDynamicFieldValue(srd, 'inquiry status')}</td>
                <td className="img-cell">
                  {getImage(srd) && <img src={getImage(srd)} alt="Product" />}
                </td>
                <td>{getDynamicFieldValue(srd, 'etd')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        // SUMMARY REPORT FORMAT
        <table>
          <thead>
            <tr>
              <th>SR DATE</th>
              <th>INQUIRY</th>
              <th>PRIORITY</th>
              <th>BRAND</th>
              <th>STYLE</th>
              <th>DESCRIPTION</th>
              <th>SIZE</th>
              <th>QTY / PCS</th>
              <th>FABRIC</th>
              <th>COLOR/WASH</th>
              <th>SAMPLE TYPE</th>
              <th>ETD</th>
              <th>ALL TRIMS</th>
              <th>B/WASH EMBELLISH</th>
              <th>PATTERN</th>
              <th>CUTTING</th>
              <th>SEWING</th>
              <th>WASH</th>
              <th>A/WASH EMBELLISH</th>
              <th>SHIPPED</th>
              <th>REJECT</th>
              <th>PICTURE</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {srds.map((srd) => (
              <tr key={srd._id}>
                <td>{new Date(srd.createdAt).toLocaleDateString()}</td>
                <td>{srd.refNo}</td>
                <td>{getDynamicFieldValue(srd, 'priority')}</td>
                <td>{getDynamicFieldValue(srd, 'brand')}</td>
                <td>{getDynamicFieldValue(srd, 'style')}</td>
                <td>{getDynamicFieldValue(srd, 'description')}</td>
                <td>{getDynamicFieldValue(srd, 'size')}</td>
                <td>{getDynamicFieldValue(srd, 'qty') || getDynamicFieldValue(srd, 'sample request qty')}</td>
                <td>{getDynamicFieldValue(srd, 'fabric')}</td>
                <td>{getDynamicFieldValue(srd, 'color') || getDynamicFieldValue(srd, 'wash / color')}</td>
                <td>{getDynamicFieldValue(srd, 'sample type')}</td>
                <td>{getDynamicFieldValue(srd, 'etd')}</td>
                <td>{getDynamicFieldValue(srd, 'all trims')}</td>
                <td>{getDynamicFieldValue(srd, 'b/wash embellish')}</td>
                <td>{getDynamicFieldValue(srd, 'pattern')}</td>
                <td>{getDynamicFieldValue(srd, 'cutting')}</td>
                <td>{getDynamicFieldValue(srd, 'sewing')}</td>
                <td>{getDynamicFieldValue(srd, 'wash')}</td>
                <td>{getDynamicFieldValue(srd, 'a/wash embellish')}</td>
                <td>{getDynamicFieldValue(srd, 'shipped')}</td>
                <td>{getDynamicFieldValue(srd, 'reject')}</td>
                <td className="img-cell">
                  {getImage(srd) && <img src={getImage(srd)} alt="Product" />}
                </td>
                <td>{getStatusDisplay(srd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-8 text-xs text-gray-500 text-right no-print">
        Report Generated by SRD System
      </div>
    </div>
  );
}

export default function ReportPrintPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ReportPrintContent />
    </Suspense>
  );
}
