'use client'
import { useState } from "react";

const Page = () => {
    const [srd, setSrd] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchRefNo, setSearchRefNo] = useState('');
    const [afterWashTrim, setAfterWashTrim] = useState(null);
    const [beforeWashTrim, setBeforeWashTrim] = useState(null);

    const fetchSRDByRefNo = async () => {
        if (!searchRefNo.trim()) {
            setError('Please enter a reference number');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Using the search parameter that already exists in your GET endpoint
            const response = await fetch(`/api/srd?search=${encodeURIComponent(searchRefNo)}&populate=true`);
            const data = await response.json();

            if (data.success && data.data.length > 0) {
                // Find exact match (case insensitive)
                const exactMatch = data.data.find(
                    item => item.refNo.toLowerCase() === searchRefNo.toLowerCase()
                );

                if (exactMatch) {
                    setSrd(exactMatch);

                    // Process the fields immediately from the exactMatch object
                    const fields = exactMatch.dynamicFields || [];
                    const aw = fields.filter(f => f.name === "After Wash Trim");
                    const bw = fields.filter(f => f.name === "Before Wash Trim");

                    console.log("After Wash Trim:", aw);
                    console.log("Before Wash Trim:", bw);

                    // Store in state if needed
                    setAfterWashTrim(aw);
                    setBeforeWashTrim(bw);
                } else {
                    setError('SRD not found with that reference number');
                    setSrd(null);
                }
            } else {
                setError('SRD not found');
                setSrd(null);
            }
        } catch (error) {
            console.error('Error fetching SRD:', error);
            setError('Failed to fetch SRD');
            setSrd(null);
        } finally {
            setLoading(false);
        }

    };

    // Handle Enter key press
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            fetchSRDByRefNo();
        }
    };



    return (
        <div className="p-4 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Search SRD</h1>

            <div className="flex gap-2 mb-4">
                <input
                    type="text"
                    value={searchRefNo}
                    onChange={(e) => setSearchRefNo(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter SRD Reference Number (e.g., SRD-1001)..."
                    className="border rounded px-3 py-2 flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                    onClick={fetchSRDByRefNo}
                    disabled={loading}
                    className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                    {loading ? 'Searching...' : 'Search'}
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            {srd && (
                <div className="bg-white border rounded-lg shadow-sm p-6">
                    <div className="flex justify-between items-start mb-4">
                        <h2 className="text-xl font-bold">{srd.refNo}</h2>
                        <span className={`px-3 py-1 rounded-full text-sm ${srd.status?.[0]?.value === 'approved' ? 'bg-green-100 text-green-800' :
                                srd.status?.[0]?.value === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                                    srd.status?.[0]?.value === 'flagged' ? 'bg-red-100 text-red-800' :
                                        'bg-gray-100 text-gray-800'
                            }`}>
                            {srd.status?.[0]?.value || 'Unknown'}
                        </span>
                    </div>

                    <div className="space-y-2">
                        <p><strong className="text-gray-700">Title:</strong> {srd.title}</p>
                        <p><strong className="text-gray-700">Created:</strong> {new Date(srd.createdAt).toLocaleString()}</p>
                        <p><strong className="text-gray-700">Last Updated:</strong> {new Date(srd.updatedAt).toLocaleString()}</p>

                        {srd.BuyerDetails && (
                            <p><strong className="text-gray-700">Buyer:</strong> {srd.BuyerDetails.name}</p>
                        )}

                        {srd.readyForProduction !== undefined && (
                            <p>
                                <strong className="text-gray-700">Ready for Production:</strong>
                                {srd.readyForProduction ? ' ✅ Yes' : ' ❌ No'}
                            </p>
                        )}

                        {srd.inProduction && (
                            <p><strong className="text-gray-700">In Production:</strong> ✅ Yes</p>
                        )}

                        {srd.isComplete && (
                            <p><strong className="text-gray-700">Status:</strong> ✅ Completed</p>
                        )}
                    </div>

                    {/* Display Specific Fields */}
                    {(afterWashTrim?.length > 0 || beforeWashTrim?.length > 0) && (
                        <div className="mt-4 pt-4 border-t">
                            <h3 className="font-semibold mb-2">Wash Trim Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {afterWashTrim?.length > 0 && (
                                    <div className="bg-blue-50 p-3 rounded">
                                        <h4 className="font-medium text-blue-800">After Wash Trim</h4>
                                        {afterWashTrim.map((field, idx) => (
                                             <div key={idx} className="mt-1">
                                                <div className="grid grid-cols-2">
                                                    <div className="text-app-heading">Item Name</div>
                                                    <div className="text-app-heading">Quantity</div>
                                                </div>
                                                {field.value?.rows?.map((r) => (
                                                    <>
                                                        <div className="grid grid-cols-2">
                                                            <div className="text-app-text">
                                                                {r[0]}
                                                            </div>
                                                            <div className="text-app-text">
                                                                {r[4]}
                                                            </div>
                                                        </div>
                                                    </>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {beforeWashTrim?.length > 0 && (
                                    <div className="bg-green-50 p-3 rounded">
                                        <h4 className="font-medium text-green-800">Before Wash Trim</h4>
                                        {beforeWashTrim.map((field, idx) => (
                                            <div key={idx} className="mt-1">
                                                <div className="grid grid-cols-2">
                                                    <div className="text-app-heading">Item Name</div>
                                                    <div className="text-app-heading">Quantity</div>
                                                </div>
                                                {field.value?.rows?.map((r) => (
                                                    <>
                                                        <div className="grid grid-cols-2">
                                                            <div className="text-app-text">
                                                                {r[0]}
                                                            </div>
                                                            <div className="text-app-text">
                                                                {r[4]}
                                                            </div>
                                                        </div>
                                                    </>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default Page;