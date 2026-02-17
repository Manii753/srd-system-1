async function main() {
    try {
        const res = await fetch('http://localhost:3000/api/srd', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: 'Test SRD for Dynamic Fields ' + Date.now(),
                // dynamicFields omitted to test auto-population
            })
        });

        const data = await res.json();
        console.log('Response status:', res.status);
        if (data.success) {
            console.log('SRD Created:', data.data.refNo);
            const outputFields = data.data.dynamicFields;
            console.log('Dynamic Fields Count:', outputFields ? outputFields.length : 0);

            if (outputFields && outputFields.length > 0) {
                console.log('First dynamic field example:', JSON.stringify(outputFields[0], null, 2));

                // Basic validation
                const nullFields = outputFields.filter(f => f.value === null);
                console.log(`Fields with null value: ${nullFields.length} / ${outputFields.length}`);

                if (nullFields.length === outputFields.length) {
                    console.log('SUCCESS: All fields initialized with null values as expected.');
                } else {
                    console.log('NOTICE: Some fields have non-null values (unexpected if we sent none).');
                }
            } else {
                console.log('WARNING: No dynamic fields returned. Are there active fields in the DB?');
            }
        } else {
            console.error('Error from API:', data.error);
        }
    } catch (err) {
        console.error('Fetch error:', err);
    }
}

main();
