'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { PlusCircleIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function ProductionStagesPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [modalOpen, setModalOpen] = useState(false);
    const [values, setValues] = useState({ 
        name: "", 
        slug: "",
        description: "", 
        color: "#6B7280", 
        icon: "Package",
        order: 0,
        isActive: true,
        estimatedDuration: 0,
        requirements: []
    });
    const [stages, setStages] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === 'loading') return;
        
        if (!session) {
            router.push('/login');
            return;
        }

        // Only production manager and admin can access
        if (session.user.role !== 'production-manager' && session.user.role !== 'admin') {
            router.push(`/dashboard/${session.user.role}`);
            return;
        }

        fetchStages();
    }, [session, status, router]);

    async function fetchStages() {
        try {
            const res = await fetch('/api/production-stages');
            const data = await res.json();
            setStages(data.success ? data.data : []);
        } catch (err) {
            console.error('Failed to fetch stages', err);
            toast.error('Failed to load production stages');
        } finally {
            setLoading(false);
        }
    }

    function openNew() {
        setValues({ 
            name: "", 
            slug: "",
            description: "", 
            color: "#6B7280", 
            icon: "Package",
            order: stages.length,
            isActive: true,
            estimatedDuration: 0,
            requirements: []
        });
        setEditingId(null);
        setModalOpen(true);
    }

    function openEdit(stage) {
        setValues({ 
            name: stage.name || '', 
            slug: stage.slug || '',
            description: stage.description || '', 
            color: stage.color || '#6B7280', 
            icon: stage.icon || 'Package',
            order: stage.order || 0,
            isActive: stage.isActive !== false,
            estimatedDuration: stage.estimatedDuration || 0,
            requirements: stage.requirements || []
        });
        setEditingId(stage._id);
        setModalOpen(true);
    }

    async function handleDelete(stage) {
        if (!confirm(`Delete production stage "${stage.name}"?`)) return;
        try {
            const res = await fetch(`/api/production-stages/${stage._id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                toast.success('Production stage deleted');
                fetchStages();
            } else {
                toast.error(data.error || 'Failed to delete stage');
            }
        } catch (err) {
            console.error('Failed to delete stage', err);
            toast.error('Failed to delete stage');
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!values.name.trim()) {
            toast.error('Please provide a stage name');
            return;
        }

        const slug = values.slug || values.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

        try {
            if (editingId) {
                const res = await fetch(`/api/production-stages/${editingId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...values, slug })
                });
                const data = await res.json();
                if (!data.success) {
                    toast.error(data.error || 'Failed to update stage');
                    return;
                }
                toast.success('Production stage updated');
            } else {
                const res = await fetch('/api/production-stages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...values, slug })
                });
                const data = await res.json();
                if (!data.success) {
                    toast.error(data.error || 'Failed to create stage');
                    return;
                }
                toast.success('Production stage created');
            }

            setModalOpen(false);
            setEditingId(null);
            fetchStages();
        } catch (err) {
            console.error('Failed to save stage', err);
            toast.error('Failed to save stage');
        }
    }

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-app-heading font-bold text-gray-900">Production Stages</h1>
                    <p className="text-gray-600 mt-1">Configure production workflow stages for approved SRDs.</p>
                </div>
                <div className="flex items-center space-x-3">
                    <Button
                        variant="outline"
                        className="flex items-center bg-black text-white border-gray-600 hover:bg-black/50"
                        onClick={openNew}
                    >
                        <PlusCircleIcon className="h-4 w-4 mr-2" />
                        Add Production Stage
                    </Button>
                </div>
            </div>

            <div className="mt-8">
                {stages.length === 0 ? (
                    <div className="text-gray-600">No production stages yet. Click &quot;Add Production Stage&quot; to create one.</div>
                ) : (
                    <div className="overflow-x-auto bg-white rounded shadow-sm">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-app-text font-medium text-gray-500 uppercase">Order</th>
                                    <th className="px-6 py-3 text-left text-app-text font-medium text-gray-500 uppercase">Name</th>
                                    <th className="px-6 py-3 text-left text-app-text font-medium text-gray-500 uppercase">Color</th>
                                    <th className="px-6 py-3 text-left text-app-text font-medium text-gray-500 uppercase">Duration (days)</th>
                                    <th className="px-6 py-3 text-left text-app-text font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-right text-app-text font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {stages.map((stage) => (
                                    <tr key={stage._id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-app-text text-gray-900">{stage.order}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div 
                                                    className="w-3 h-3 rounded-full mr-2" 
                                                    style={{ backgroundColor: stage.color }}
                                                />
                                                <span className="text-app-text text-gray-900">{stage.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-app-text text-gray-500">{stage.color}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-app-text text-gray-500">{stage.estimatedDuration || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-app-text rounded ${stage.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {stage.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-app-text font-medium text-right">
                                            <button
                                                className="text-blue-600 hover:text-blue-900 mr-4"
                                                onClick={() => openEdit(stage)}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                className="text-red-600 hover:text-red-900"
                                                onClick={() => handleDelete(stage)}
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {modalOpen && (
                <>
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setModalOpen(false)} />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl border overflow-y-auto max-h-[90vh]">
                            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
                                <h2 className="text-app-heading font-semibold">
                                    {editingId ? "Edit Production Stage" : "Add Production Stage"}
                                </h2>
                                <button className="text-gray-500 hover:text-gray-800 text-app-text" onClick={() => setModalOpen(false)}>×</button>
                            </div>

                            <form className="px-6 py-4 space-y-4" onSubmit={handleSubmit}>
                                <div>
                                    <label className="block text-app-text font-medium text-gray-700 mb-1">Stage Name *</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border border-gray-300 rounded"
                                        value={values.name}
                                        onChange={(e) => setValues({ ...values, name: e.target.value })}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-app-text font-medium text-gray-700 mb-1">Slug</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border border-gray-300 rounded"
                                        value={values.slug}
                                        onChange={(e) => setValues({ ...values, slug: e.target.value })}
                                        placeholder="Auto-generated if empty"
                                    />
                                </div>

                                <div>
                                    <label className="block text-app-text font-medium text-gray-700 mb-1">Description</label>
                                    <textarea
                                        className="w-full p-2 border border-gray-300 rounded"
                                        value={values.description}
                                        onChange={(e) => setValues({ ...values, description: e.target.value })}
                                        rows={3}
                                    />
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-app-text font-medium text-gray-700 mb-1">Color</label>
                                        <input
                                            type="color"
                                            className="w-full h-10 p-1 border border-gray-300 rounded"
                                            value={values.color}
                                            onChange={(e) => setValues({ ...values, color: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-app-text font-medium text-gray-700 mb-1">Order</label>
                                        <input
                                            type="number"
                                            className="w-full p-2 border border-gray-300 rounded"
                                            value={values.order}
                                            onChange={(e) => setValues({ ...values, order: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-app-text font-medium text-gray-700 mb-1">Duration (days)</label>
                                        <input
                                            type="number"
                                            className="w-full p-2 border border-gray-300 rounded"
                                            value={values.estimatedDuration}
                                            onChange={(e) => setValues({ ...values, estimatedDuration: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-app-text font-medium text-gray-700 mb-1">Icon (Lucide name)</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border border-gray-300 rounded"
                                        value={values.icon}
                                        onChange={(e) => setValues({ ...values, icon: e.target.value })}
                                        placeholder="e.g., Package, Truck, CheckCircle"
                                    />
                                </div>

                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        className="form-checkbox h-4 w-4"
                                        checked={values.isActive}
                                        onChange={(e) => setValues({ ...values, isActive: e.target.checked })}
                                    />
                                    <span className="text-app-text text-gray-700">Active</span>
                                </div>

                                <div className="flex justify-end pt-3 border-t">
                                    <button type="button" className="bg-gray-200 text-gray-700 px-4 py-2 rounded mr-2" onClick={() => setModalOpen(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                                        {editingId ? "Save changes" : "Create Stage"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </>
            )}
        </Layout>
    );
}

