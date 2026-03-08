'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';


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
                // Fetch report fields configuration from all departments
                const allReportFields = [];
                for (const dept of ['vmd', 'cad', 'commercial', 'mmc']) {
                    const fieldsRes = await fetch(`/api/newField?department=${dept}`);
                    const fieldsData = await fieldsRes.json();
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
            // Handle arrays, comma-separated strings, or single URL
            let firstImage = '';
            if (Array.isArray(field.value)) {
                firstImage = field.value[0] || '';
            } else if (typeof field.value === 'string') {
                firstImage = field.value.split(',')[0].trim();
            }

            if (firstImage) {
                return (
                    <div className="relative w-12 h-12 mx-auto flex-shrink-0">
                        <img
                            src={firstImage}
                            alt={fieldDef.name}
                            className="object-cover w-full h-full rounded"
                            style={{ maxHeight: '48px', maxWidth: '48px' }}
                        />
                    </div>
                );
            }
            return '';
        }

        if (Array.isArray(field.value)) return field.value.join(', ');

        return String(field.value);
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
        if (srd.isComplete) return 'Completed';
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
        <div className="p-8 max-w-[297mm] mx-auto print:max-w-none bg-white">
            <style jsx global>{`
                @media print {
                    @page {
                        size: landscape;
                        margin: 10mm;
                    }
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .bg-gray-200 {
                        background-color: #e5e7eb !important;
                    }
                }
            `}</style>
            <div className="flex justify-between items-center mb-6 print:hidden">
                <h1 className="text-2xl font-bold">SRD Report</h1>
                <button
                    onClick={() => window.print()}
                    className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
                >
                    Print / Save as PDF
                </button>
            </div>

            <div className="mb-4">
                <h2 className="text-xl font-bold text-center mb-2">SRD Status Report</h2>
                <div className="text-sm text-center text-gray-600">
                    Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                </div>
            </div>

            <table className="w-full border-collapse border border-gray-300 text-xs" style={{ whiteSpace: 'nowrap' }}>
                <thead>
                    <tr className="bg-gray-200">
                        <th className="border border-gray-300 p-2 text-left bg-gray-200">Date</th>
                        <th className="border border-gray-300 p-2 text-left bg-gray-200">Inquiry #</th>

                        {/* Dynamic Report Columns */}
                        {reportFields.map(field => (
                            <th key={field._id} className="border border-gray-300 p-2 text-left bg-gray-200">
                                {field.name}
                            </th>
                        ))}

                        <th className="border border-gray-300 p-2 text-left bg-gray-200">Status</th>
                        <th className="border border-gray-300 p-2 text-left bg-gray-200">Latest Approved</th>
                    </tr>
                </thead>
                <tbody>
                    {srds.length > 0 ? (
                        srds.map((srd) => {
                            return (
                                <tr key={srd._id} className="break-inside-avoid">
                                    <td className="border border-gray-300 p-2">
                                        {new Date(srd.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="border border-gray-300 p-2 font-medium">
                                        {srd.refNo}
                                    </td>

                                    {/* Dynamic Report Values */}
                                    {reportFields.map(field => (
                                        <td key={field._id} className="border border-gray-300 p-2">
                                            {getDynamicFieldValue(srd, field)}
                                        </td>
                                    ))}

                                    <td className="border border-gray-300 p-2">
                                        {getStatusDisplay(srd)}
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                        {getLatestApprovedDept(srd)}
                                    </td>
                                </tr>
                            );
                        })
                    ) : (
                        <tr>
                            <td colSpan={4 + reportFields.length} className="border border-gray-300 p-8 text-center text-gray-500">
                                No SRDs found matching the criteria.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            <div className="mt-8 text-xs text-gray-500 text-right print:fixed print:bottom-4 print:right-4">
                Report Generated by SRD System
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
