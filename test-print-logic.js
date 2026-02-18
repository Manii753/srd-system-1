const mongoose = require('mongoose');

// Mock data and helper functions from SRDPrintPageContent

async function testPrintLogic() {
    try {
        // 1. Fetch SRDs directly from DB (bypassing API network call for script simplicity, 
        //    but we want to test the query logic if possible. 
        //    Actually, better to use fetch if the server is running.
        //    The user said "npm run dev (in f:\work\srd-system-1, running for ...)" so server is running.

        // Fetch Fields
        console.log('Fetching fields...');
        const fieldsRes = await fetch('http://localhost:3000/api/newField');
        const fieldsData = await fieldsRes.json();

        let activeQuickFields = [];
        if (Array.isArray(fieldsData)) {
            activeQuickFields = fieldsData
                .filter(f => f.isShownInQuickDetails && f.active)
                .sort((a, b) => (a.order || 0) - (b.order || 0));
        }
        console.log('Active Quick Fields:', activeQuickFields.map(f => f.name).join(', '));

        // Fetch SRDs with populate
        console.log('Fetching SRDs with populate=true...');
        const response = await fetch('http://localhost:3000/api/srd?populate=true');
        const data = await response.json();

        if (!data.success) {
            console.error('Failed to fetch SRDs:', data.error);
            return;
        }

        const srds = data.data;
        console.log(`Fetched ${srds.length} SRDs.`);

        if (srds.length === 0) return;

        // Test logic on first ID
        const srd = srds[0];
        console.log(`\nTesting logic on SRD: ${srd.refNo}`);

        // Logic from SRDPrintPageContent
        const getDynamicFieldValue = (srd, fieldDef) => {
            if (!srd.dynamicFields) return '';

            const field = srd.dynamicFields.find(df =>
                (df.field && df.field._id === fieldDef._id) ||
                (df.originalFieldId === fieldDef._id) ||
                (df.name === fieldDef.name)
            );

            if (!field || field.value === null || field.value === undefined) return '';
            if (Array.isArray(field.value)) return field.value.join(', ');
            return String(field.value);
        };

        activeQuickFields.forEach(field => {
            const val = getDynamicFieldValue(srd, field);
            console.log(`  Field "${field.name}": ${val}`);
        });

        const getLatestApprovedDept = (srd) => {
            if (!srd.status) return 'None';
            const approvedDepts = Object.entries(srd.status)
                .filter(([_, status]) => status === 'approved')
                .map(([dept]) => dept);

            if (approvedDepts.length === 0) return 'None';

            if (srd.audit && Array.isArray(srd.audit)) {
                const approvalLogs = srd.audit
                    .filter(a => a.action && a.action.toLowerCase().includes('approved'))
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

                if (approvalLogs.length > 0) {
                    const latest = approvalLogs[0];
                    return `${latest.department?.toUpperCase()} (${new Date(latest.timestamp).toLocaleDateString()})`;
                }
            }
            return approvedDepts.map(d => d.toUpperCase()).join(', ');
        };

        console.log(`  Latest Approved: ${getLatestApprovedDept(srd)}`);
        console.log(`  Status: ${srd.isComplete ? 'Completed' : (srd.inProduction ? 'In Production' : 'Pre-Production')}`);

    } catch (err) {
        console.error('Test error:', err);
    }
}

testPrintLogic();
