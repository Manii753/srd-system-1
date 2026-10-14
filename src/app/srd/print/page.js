'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import {
    formatFieldValueForDisplay,
    getPrimaryAsset,
    getAssetUrl,
} from '@/lib/assetUtils';


function SRDPrintPageContent() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [srds, setSRDs] = useState([]);
    const [loading, setLoading] = useState(true);
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
                // Fetch report fields configuration from all departments in parallel
                const deptRequests = ['vmd', 'cad', 'commercial', 'mmc'].map(dept =>
                    fetch(`/api/newField?department=${dept}`).then(r => r.json()).catch(() => [])
                );
                const fieldsResults = await Promise.all(deptRequests);
                const allReportFields = [];
                for (const fieldsData of fieldsResults) {
                    if (Array.isArray(fieldsData)) {
                        const reportFieldsForDept = fieldsData.filter(f => f.isShownInReport && f.active);
                        allReportFields.push(...reportFieldsForDept);
                    }
                }
                // Sort by reportColumnOrder
                allReportFields.sort((a, b) => (a.reportColumnOrder || 0) - (b.reportColumnOrder || 0));
                setReportFields(allReportFields);

                // Fetch SRDs with filters
                const query = new URLSearchParams(searchParams);
                query.set('populate', 'true'); // Ensure we get populated fields
                query.set('limit', '500'); // Print reports need the full matching set

                const response = await fetch(`/api/srd?${query.toString()}`);
                const data = await response.json();
                if (data.success) {
                    setSRDs(data.data);
                }
            } catch (error) {
                console.error('Error fetching data for print:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [session, status, router, searchParams]);

    const getDynamicFieldValue = (srd, fieldDef) => {
        if (!srd.dynamicFields) return '';

        const field = srd.dynamicFields.find(df =>
            (df.field && df.field._id === fieldDef._id) || // Match by populated field ID
            (df.originalFieldId === fieldDef._id) || // Match by stored original ID
            (df.name === fieldDef.name) // Fallback match by name
        );

        if (!field || field.value === null || field.value === undefined) return '';

        // If this is an image field, render the actual image instead of the path
        const isImageField = fieldDef.type === 'image' || field.type === 'image';
        if (isImageField && field.value) {
            const firstImage = getAssetUrl(getPrimaryAsset(field.value, { kind: 'image' }));

            if (firstImage) {
                    return (
                        <div className="relative w-8 h-8 mx-auto flex-shrink-0">
                            <img
                                src={firstImage}
                                alt={fieldDef.name}
                                className="object-cover w-full h-full rounded"
                                style={{ maxHeight: '32px', maxWidth: '32px' }}
                            />
                        </div>
                );
            }
            return '';
        }

        return formatFieldValueForDisplay(field.value, field.type || fieldDef.type);
    };

    const getLatestApprovedDept = (srd) => {
        // Check audit logs for "approved" actions
        // Or check status object. 
        // The prompt asks for "one column for the the latest department that it approved flagged with date"

        if (!srd.status) return 'None';

        // Find departments that are approved
        const approvedDepts = Object.entries(srd.status)
            .filter(([_, status]) => status === 'approved')
            .map(([dept]) => dept);

        if (approvedDepts.length === 0) return 'None';

        // We need dates. The status object in SRD doesn't store dates directly (it's just key-value).
        // We must rely on Audit logs if available, or just list the departments.
        // However, SRDReports logic implies we might have audit logs.
        // Let's try to find the latest approval in audit.

        if (srd.audit && Array.isArray(srd.audit)) {
            const approvalLogs = srd.audit
                .filter(a => a.action && a.action.toLowerCase().includes('approved'))
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            if (approvalLogs.length > 0) {
                const latest = approvalLogs[0];
                return `${latest.department?.toUpperCase()} (${new Date(latest.timestamp).toLocaleDateString()})`;
            }
        }

        // Fallback if no audit logs found but status is approved (legacy data?)
        return approvedDepts.map(d => d.toUpperCase()).join(', ');
    };

    const getStatusDisplay = (srd) => {
        if (srd.BuyerApproved) return 'Completed';
        const hasRejections = (srd.internalRejectedReasons?.length || 0) > 0 || (srd.BuyerRejectedReasons?.length || 0) > 0;
        if (hasRejections) return 'Rejected';
        if (srd.sampleDispatchedToBuyer || srd.isComplete || srd.inDispatch) return 'Dispatched';
        if (srd.inProduction) {
            // Check if we have current production stage info
            if (srd.currentProductionStage) {
                // Handle both populated object and potential string ID (though api populates it)
                if (typeof srd.currentProductionStage === 'object') {
                    return srd.currentProductionStage.displayName || srd.currentProductionStage.name || 'In Production';
                }
            }
            return 'In Production';
        }
        return 'Pre-Production'; // Default
    };



    if (loading) return <div className="p-8 text-center">Loading report data...</div>;

    return (
        <div className="print-page">
            <style>{`
                @page { size: landscape; margin: 0.3in; }
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
                .print-page { width: 100%; padding: 8px; }

                /* ── header ── */
                .header {
                    margin-bottom: 8px;
                }
                .header h1 {
                    font-size: 14px;
                    margin: 0 0 3px 0;
                    font-weight: 700;
                    text-transform: uppercase;
                    color: #1a1a1a;
                    border-bottom: 1.5px solid #1a1a1a;
                    padding-bottom: 2px;
                    text-align: center;
                }
                .header-meta {
                    text-align: center;
                    font-size: 10px;
                    color: #666;
                    margin-top: 2px;
                }

                /* ── print button (only on screen) ── */
                .print-button-container {
                    text-align: right;
                    margin-bottom: 8px;
                }
                .print-button {
                    background: #2563eb;
                    color: white;
                    padding: 8px 16px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 11px;
                    font-weight: 600;
                }
                .print-button:hover {
                    background: #1d4ed8;
                }
                @media print {
                    .print-button-container {
                        display: none;
                    }
                }

                /* ── print table ── */
                .print-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 11px;
                    border: 0.5px solid #ccc;
                }
                .print-table .table-header {
                    background-color: #f3f4f6;
                    padding: 3px 6px;
                    text-align: left;
                    font-weight: 700;
                    font-size: 11px;
                    color: #333;
                    text-transform: capitalize;
                    border: 0.5px solid #ccc;
                    white-space: nowrap;
                }
                .print-table .table-cell {
                    padding: 3px 6px;
                    text-align: left;
                    border: 0.5px solid #ccc;
                    font-size: 11px;
                    color: #000;
                    white-space: nowrap;
                }
                .print-table .table-cell-medium {
                    font-weight: 600;
                }
                .print-table .empty-cell {
                    padding: 32px;
                    text-align: center;
                    color: #999;
                    font-style: italic;
                }

                /* ── footer ── */
                .footer {
                    margin-top: 12px;
                    text-align: right;
                    font-size: 9px;
                    color: #999;
                }
            `}</style>

            <div className="print-button-container">
                <button
                    onClick={() => window.print()}
                    className="print-button"
                >
                    Print / Save as PDF
                </button>
            </div>

            <div className="header">
                <h1>SRD Status Report</h1>
                <div className="header-meta">
                    Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                </div>
            </div>

            <table className="print-table">
                <thead>
                    <tr>
                        <th className="table-header">Date</th>
                        <th className="table-header">Inquiry #</th>

                        {/* Dynamic Report Columns */}
                        {reportFields.map(field => (
                            <th key={field._id} className="table-header">
                                {field.name}
                            </th>
                        ))}

                        <th className="table-header">Status</th>
                        <th className="table-header">Latest Approved</th>
                    </tr>
                </thead>
                <tbody>
                    {srds.length > 0 ? (
                        srds.map((srd) => {
                            return (
                                <tr key={srd._id}>
                                    <td className="table-cell">
                                        {new Date(srd.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="table-cell table-cell-medium">
                                        {srd.refNo}
                                    </td>

                                    {/* Dynamic Report Values */}
                                    {reportFields.map(field => (
                                        <td key={field._id} className="table-cell">
                                            {getDynamicFieldValue(srd, field)}
                                        </td>
                                    ))}

                                    <td className="table-cell">
                                        {getStatusDisplay(srd)}
                                    </td>
                                    <td className="table-cell">
                                        {getLatestApprovedDept(srd)}
                                    </td>
                                </tr>
                            );
                        })
                    ) : (
                        <tr>
                            <td colSpan={4 + reportFields.length} className="empty-cell">
                                No SRDs found matching the criteria.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            <div className="footer">
                Report Generated by MMS
            </div>
        </div>
    );
}

export default function SRDPrintPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SRDPrintPageContent />
        </Suspense>
    );
}

