'use client'
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { PlusCircleIcon } from "lucide-react";
import { useEffect, useState } from "react";

export default function DepartmentsPage() {
    const [modalOpen, setModalOpen] = useState(false);
    const [values, setValues] = useState({
        name: "",
        slug: "",
        description: "",
        type: "support",
        accessLevel: "canEditOnlyOwnDepartmentFields"
    });
    const [departments, setDepartments] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDepartments();
    }, []);

    async function fetchDepartments() {
        try {
            const res = await fetch('/api/departments');
            const data = await res.json();
            setDepartments(data.success ? data.data : []);
        } catch (err) {
            console.error('Failed to fetch departments', err);
        } finally {
            setLoading(false);
        }
    }

    function openNew() {
        setValues({ name: "", slug: "", description: "", type: "support", accessLevel: "canEditOnlyOwnDepartmentFields" });
        setEditingId(null);
        setModalOpen(true);
    }

    function openEdit(dept) {
        setValues({
            name: dept.name || '',
            slug: dept.slug || '',
            description: dept.description || '',
            type: dept.type || 'support',
            accessLevel: dept.accessLevel || 'canEditOnlyOwnDepartmentFields'
        });
        setEditingId(dept._id);
        setModalOpen(true);
    }

    async function handleDelete(dept) {
        if (!confirm(`Delete department "${dept.name}"? This action cannot be undone.`)) return;
        try {
            const res = await fetch(`/api/departments/${dept._id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                fetchDepartments();
            } else {
                alert('Failed to delete department: ' + data.error);
            }
        } catch (err) {
            console.error('Failed to delete department', err);
            alert('Failed to delete department');
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!values.name.trim()) return alert('Please provide a department name.');

        // Auto-generate slug if not provided
        const slug = values.slug || values.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

        try {
            if (editingId) {
                const res = await fetch(`/api/departments/${editingId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...values, slug })
                });
                const data = await res.json();
                if (!data.success) {
                    alert('Failed to update department: ' + data.error);
                    return;
                }
            } else {
                const res = await fetch('/api/departments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...values, slug })
                });
                const data = await res.json();
                if (!data.success) {
                    alert('Failed to create department: ' + data.error);
                    return;
                }
            }

            setModalOpen(false);
            setEditingId(null);
            fetchDepartments();
        } catch (err) {
            console.error('Failed to save department', err);
            alert('Failed to save department');
        }
    }

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-600">Loading departments...</div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-app-heading font-bold text-gray-900">Manage Departments</h1>
                    <p className="text-gray-600 mt-1">Configure departments for your organization.</p>
                </div>
                <div className="flex items-center space-x-3">
                    <Button
                        variant="outline"
                        className="flex items-center bg-black text-white border-gray-600 hover:bg-black/50 hover:border-gray-500"
                        onClick={openNew}
                    >
                        <PlusCircleIcon className="h-4 w-4 mr-2" />
                        Add New Department
                    </Button>
                </div>
            </div>

            {/* Content Area */}
            <div className="mt-8">
                {departments.length === 0 ? (
                    <div className="text-gray-600">No departments yet. Click &quot;Add New Department&quot; to create one.</div>
                ) : (
                    <div className="overflow-x-auto bg-white rounded shadow-sm">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-app-text font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-3 text-left text-app-text font-medium text-gray-500 uppercase tracking-wider">Slug</th>
                                    <th className="px-6 py-3 text-left text-app-text font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-3 text-left text-app-text font-medium text-gray-500 uppercase tracking-wider">Access Level</th>
                                    <th className="px-6 py-3 text-left text-app-text font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                    <th className="px-6 py-3 text-right text-app-text font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {departments.map((dept) => (
                                    <tr key={dept._id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-app-text font-medium text-gray-900">{dept.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-app-text text-gray-500">{dept.slug}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-app-text font-medium ${dept.type === 'support' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                                                {dept.type || '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-app-text text-gray-500 text-xs">{dept.accessLevel || '-'}</td>
                                        <td className="px-6 py-4 text-app-text text-gray-500">{dept.description || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-app-text font-medium text-right">
                                            <button
                                                className="text-blue-600 hover:text-blue-900 mr-4"
                                                onClick={() => openEdit(dept)}
                                                aria-label={`Edit ${dept.name}`}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                className="text-red-600 hover:text-red-900"
                                                onClick={() => handleDelete(dept)}
                                                aria-label={`Delete ${dept.name}`}
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
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-gray-200 overflow-hidden">
                            <div className="flex items-center justify-between px-6 py-4 border-b">
                                <h2 className="text-app-heading font-semibold">
                                    {editingId ? "Edit Department" : "Add New Department"}
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
                                        Department Name *
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
                                        placeholder="e.g., visual-merchandising"
                                    />
                                </div>

                                {/* Type */}
                                <div>
                                    <label className="block text-app-text font-medium text-gray-700 mb-1">
                                        Type *
                                    </label>
                                    <select
                                        className="w-full p-2 border border-gray-300 rounded bg-white"
                                        value={values.type}
                                        onChange={(e) => setValues({ ...values, type: e.target.value })}
                                        required
                                    >
                                        <option value="support">Support — requires SRD approval</option>
                                        <option value="production">Production — handles manufacturing stages</option>
                                    </select>
                                </div>

                                {/* Access Level */}
                                <div>
                                    <label className="block text-app-text font-medium text-gray-700 mb-1">
                                        Access Level *
                                    </label>
                                    <select
                                        className="w-full p-2 border border-gray-300 rounded bg-white"
                                        value={values.accessLevel}
                                        onChange={(e) => setValues({ ...values, accessLevel: e.target.value })}
                                        required
                                    >
                                        <option value="canEditOnlyOwnDepartmentFields">Own Fields Only — can edit own department fields</option>
                                        <option value="canEditAllDepartmentFields">All Fields — can edit all fields &amp; raise SRDs</option>
                                        <option value="admin">Admin — full access</option>
                                    </select>
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
                                        placeholder="Brief description of the department's role"
                                    />
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
                                        {editingId ? "Save changes" : "Create Department"}
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

