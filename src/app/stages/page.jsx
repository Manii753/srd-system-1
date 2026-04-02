'use client'
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { PlusCircleIcon } from "lucide-react";
import { useEffect, useState } from "react";

export default function StagesPage() {
    const [modalOpen, setModalOpen] = useState(false);
    const [values, setValues] = useState({ 
        name: "", 
        slug: "",
        description: "", 
        color: "#6B7280", 
        icon: "Circle",
        order: 0,
        isActive: true,
        departments: [],
        isAutomatic: false
    });
    const [stages, setStages] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        try {
            const [stagesRes, deptsRes] = await Promise.all([
                fetch('/api/stages'),
                fetch('/api/departments')
            ]);
            const stagesData = await stagesRes.json();
            const deptsData = await deptsRes.json();
            
            setStages(stagesData.success ? stagesData.data : []);
            setDepartments(deptsData.success ? deptsData.data : []);
        } catch (err) {
            console.error('Failed to fetch data', err);
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
            icon: "Circle",
            order: stages.length,
            isActive: true,
            departments: [],
            isAutomatic: false
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
            icon: stage.icon || 'Circle',
            order: stage.order || 0,
            isActive: stage.isActive !== false,
            departments: stage.departments?.map(d => d._id || d) || [],
            isAutomatic: stage.isAutomatic || false
        });
        setEditingId(stage._id);
        setModalOpen(true);
    }

    async function handleDelete(stage) {
        if (!confirm(`Delete stage "${stage.name}"? This will deactivate the stage.`)) return;
        try {
            const res = await fetch(`/api/stages/${stage._id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                fetchData();
            } else {
                alert('Failed to delete stage: ' + data.error);
            }
        } catch (err) {
            console.error('Failed to delete stage', err);
            alert('Failed to delete stage');
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!values.name.trim()) return alert('Please provide a stage name.');

        // Auto-generate slug if not provided
        const slug = values.slug || values.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

        try {
            if (editingId) {
                const res = await fetch(`/api/stages/${editingId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...values, slug })
                });
                const data = await res.json();
                if (!data.success) {
                    alert('Failed to update stage: ' + data.error);
                    return;
                }
            } else {
                const res = await fetch('/api/stages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...values, slug })
                });
                const data = await res.json();
                if (!data.success) {
                    alert('Failed to create stage: ' + data.error);
                    return;
                }
            }

            setModalOpen(false);
            setEditingId(null);
            fetchData();
        } catch (err) {
            console.error('Failed to save stage', err);
            alert('Failed to save stage');
        }
    }

    function toggleDepartment(deptId) {
        setValues(prev => ({
            ...prev,
            departments: prev.departments.includes(deptId)
                ? prev.departments.filter(id => id !== deptId)
                : [...prev.departments, deptId]
        }));
    }

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-600">Loading stages...</div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-app-heading font-bold text-gray-900">Manage Stages</h1>
                    <p className="text-gray-600 mt-1">Configure workflow stages for your SRD system.</p>
                </div>
                <div className="flex items-center space-x-3">
                    <Button
                        variant="outline"
                        className="flex items-center bg-black text-white border-gray-600 hover:bg-black/50 hover:border-gray-500"
                        onClick={openNew}
                    >
                        <PlusCircleIcon className="h-4 w-4 mr-2" />
                        Add New Stage
                    </Button>
                </div>
            </div>

            {/* Content Area */}
            <div className="mt-8">
                {stages.length === 0 ? (
                    <div className="text-gray-600">No stages yet. Click &quot;Add New Stage&quot; to create one.</div>
                ) : (
                    <div className="overflow-x-auto bg-white rounded shadow-sm">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-app-text font-medium text-gray-500 uppercase tracking-wider">Order</th>
                                    <th className="px-6 py-3 text-left text-app-text font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-3 text-left text-app-text font-medium text-gray-500 uppercase tracking-wider">Color</th>
                                    <th className="px-6 py-3 text-left text-app-text font-medium text-gray-500 uppercase tracking-wider">Departments</th>
                                    <th className="px-6 py-3 text-left text-app-text font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-right text-app-text font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
                                        <td className="px-6 py-4 text-app-text text-gray-500">
                                            {stage.departments?.length > 0 
                                                ? stage.departments.map(d => d.name).join(', ')
                                                : 'All'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-app-text rounded ${stage.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {stage.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-app-text font-medium text-right">
                                            <button
                                                className="text-blue-600 hover:text-blue-900 mr-4"
                                                onClick={() => openEdit(stage)}
                                                aria-label={`Edit ${stage.name}`}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                className="text-red-600 hover:text-red-900"
                                                onClick={() => handleDelete(stage)}
                                                aria-label={`Delete ${stage.name}`}
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

            {/* Modal */}
            {modalOpen && (
                <>
                    {/* Overlay */}
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                        onClick={() => setModalOpen(false)}
                    />

                    {/* Centered modal */}
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl border border-gray-200 overflow-hidden max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
                                <h2 className="text-app-heading font-semibold">
                                    {editingId ? "Edit Stage" : "Add New Stage"}
                                </h2>
                                <button
                                    className="text-gray-500 hover:text-gray-800 text-app-text leading-none"
                                    onClick={() => setModalOpen(false)}
                                    aria-label="Close modal"
                                >
                                    ×
                                </button>
                            </div>

                            <form className="px-6 py-4 space-y-4" onSubmit={handleSubmit}>
                                {/* Name */}
                                <div>
                                    <label className="block text-app-text font-medium text-gray-700 mb-1">
                                        Stage Name *
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border border-gray-300 rounded"
                                        value={values.name}
                                        onChange={(e) => setValues({ ...values, name: e.target.value })}
                                        required
                                    />
                                </div>

                                {/* Slug */}
                                <div>
                                    <label className="block text-app-text font-medium text-gray-700 mb-1">
                                        Slug (auto-generated if empty)
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border border-gray-300 rounded"
                                        value={values.slug}
                                        onChange={(e) => setValues({ ...values, slug: e.target.value })}
                                        placeholder="e.g., in-progress"
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-app-text font-medium text-gray-700 mb-1">
                                        Description
                                    </label>
                                    <textarea
                                        className="w-full p-2 border border-gray-300 rounded"
                                        value={values.description}
                                        onChange={(e) => setValues({ ...values, description: e.target.value })}
                                        rows={3}
                                    />
                                </div>

                                {/* Color and Order */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-app-text font-medium text-gray-700 mb-1">
                                            Color
                                        </label>
                                        <input
                                            type="color"
                                            className="w-full h-10 p-1 border border-gray-300 rounded"
                                            value={values.color}
                                            onChange={(e) => setValues({ ...values, color: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-app-text font-medium text-gray-700 mb-1">
                                            Order
                                        </label>
                                        <input
                                            type="number"
                                            className="w-full p-2 border border-gray-300 rounded"
                                            value={values.order}
                                            onChange={(e) => setValues({ ...values, order: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                </div>

                                {/* Icon */}
                                <div>
                                    <label className="block text-app-text font-medium text-gray-700 mb-1">
                                        Icon (Lucide icon name)
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border border-gray-300 rounded"
                                        value={values.icon}
                                        onChange={(e) => setValues({ ...values, icon: e.target.value })}
                                        placeholder="e.g., Circle, CheckCircle, Clock"
                                    />
                                </div>

                                {/* Departments */}
                                <div>
                                    <label className="block text-app-text font-medium text-gray-700 mb-2">
                                        Applicable Departments (leave empty for all)
                                    </label>
                                    <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded p-3">
                                        {departments.map((dept) => (
                                            <div key={dept._id} className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    className="form-checkbox h-4 w-4"
                                                    checked={values.departments.includes(dept._id)}
                                                    onChange={() => toggleDepartment(dept._id)}
                                                />
                                                <span className="text-app-text text-gray-700">{dept.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Checkboxes */}
                                <div className="space-y-2">
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            className="form-checkbox h-4 w-4"
                                            checked={values.isActive}
                                            onChange={(e) => setValues({ ...values, isActive: e.target.checked })}
                                        />
                                        <span className="text-app-text text-gray-700">Active</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            className="form-checkbox h-4 w-4"
                                            checked={values.isAutomatic}
                                            onChange={(e) => setValues({ ...values, isAutomatic: e.target.checked })}
                                        />
                                        <span className="text-app-text text-gray-700">Automatic (system-controlled)</span>
                                    </div>
                                </div>

                                {/* Buttons */}
                                <div className="flex justify-end pt-3 border-t border-gray-200">
                                    <button
                                        type="button"
                                        className="bg-gray-200 text-gray-700 px-4 py-2 rounded mr-2"
                                        onClick={() => setModalOpen(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                                    >
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

