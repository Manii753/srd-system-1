'use client'
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { PlusCircleIcon } from "lucide-react";
import { useEffect, useState } from "react";

const DEPARTMENTS = [
    'global',
    'vmd',
    'cad',
    'commercial',
    'mmc'
];

export default function Page() {
    const [modalOpen, setModalOpen] = useState(false);
    // form values mirror Field model
    const [values, setValues] = useState({ name: "", type: "", placeholder: "", department: 'global', isRequired: false });
    // fields from API
    const [fields, setFields] = useState([]);
    // current editing id
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        // fetch fields on mount
        async function fetchFields() {
            try {
                const res = await fetch('/api/newField');
                const data = await res.json();
                setFields(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('Failed to fetch fields', err);
            }
        }
        fetchFields();
    }, []);

    function openNew() {
        setValues({ name: "", type: "", placeholder: "", department: 'global', isRequired: false });
        setEditingId(null);
        setModalOpen(true);
    }

    function openEdit(idx) {
        const f = fields[idx];
        if (!f) return;
        setValues({ name: f.name || '', type: f.type || 'text', placeholder: f.placeholder || '', department: f.department || 'global', isRequired: !!f.isRequired });
        setEditingId(f._id);
        setModalOpen(true);
    }

    async function handleDelete(idx) {
        const f = fields[idx];
        if (!f) return;
        if (!confirm(`Delete field "${f.name}"? This will disable the field for new SRDs but existing SRD values remain.`)) return;
        try {
            const res = await fetch(`/api/newField?id=${f._id}`, { method: 'DELETE' });
            const data = await res.json();
            // update list (soft-delete will set active=false and API returns updated doc)
            setFields((prev) => prev.filter((p) => p._id !== f._id));
        } catch (err) {
            console.error('Failed to delete field', err);
            alert('Failed to delete field');
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!values.name.trim()) return alert('Please provide a field name.');
        if (!values.type) return alert('Please select a field type.');

        try {
            if (editingId) {
                const res = await fetch(`/api/newField?id=${editingId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(values)
                });
                const updated = await res.json();
                setFields((prev) => prev.map(f => f._id === updated._id ? updated : f));
            } else {
                const res = await fetch('/api/newField', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(values)
                });
                const created = await res.json();
                setFields((prev) => [...prev, created]);
            }

            setModalOpen(false);
            setEditingId(null);
        } catch (err) {
            console.error('Failed to save field', err);
            alert('Failed to save field');
        }
    }

    return (
        <Layout>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Edit SRD Fields</h1>
                    <p className="text-gray-600 mt-1">Manage SRD fields used in records.</p>
                </div>
                <div className="flex items-center space-x-3">
                    <Button
                        variant="outline"
                        className="flex items-center bg-black text-white border-gray-600 hover:bg-black/50 hover:border-gray-500"
                        onClick={openNew}
                    >
                        <PlusCircleIcon className="h-4 w-4 mr-2" />
                        Add New Field
                    </Button>
                </div>
            </div>

            {/* Content Area */}
            <div className="mt-8">
                {fields.length === 0 ? (
                    <div className="text-gray-600">No fields yet. Click &quot;Add New Field&quot; to create one.</div>
                ) : (
                    <div className="overflow-x-auto bg-white rounded shadow-sm">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Required</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {fields.map((f, idx) => (
                                    <tr key={f._id || idx}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{f.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{f.type}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{f.department || 'global'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{f.isRequired ? "Yes" : "No"}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                                            <button
                                                className="text-blue-600 hover:text-blue-900 mr-4"
                                                onClick={() => openEdit(idx)}
                                                aria-label={`Edit ${f.name}`}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                className="text-red-600 hover:text-red-900"
                                                onClick={() => handleDelete(idx)}
                                                aria-label={`Delete ${f.name}`}
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
          <h2 className="text-lg font-semibold">
            {editingId ? "Edit SRD Field" : "Add New SRD Field"}
          </h2>
          <button
            className="text-gray-500 hover:text-gray-800 text-2xl leading-none"
            onClick={() => setModalOpen(false)}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <form className="px-6 py-4 space-y-4" onSubmit={handleSubmit}>
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Field Name
            </label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded"
              value={values.name}
              onChange={(e) => setValues({ ...values, name: e.target.value })}
              required
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Field Type
            </label>
            <select
              className="w-full p-2 border border-gray-300 rounded"
              value={values.type}
              onChange={(e) => setValues({ ...values, type: e.target.value })}
              required
            >
              <option value="">Select Type</option>
              <option value="heading">Add Heading</option>
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="date">Date</option>
              <option value="boolean">Boolean</option>
              <option value="textarea">Textarea</option>
              <option value="file">File Upload</option>
              <option value="image">Image Upload</option>
            </select>
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department
            </label>
            <select
              className="w-full p-2 border border-gray-300 rounded"
              value={values.department}
              onChange={(e) =>
                setValues({ ...values, department: e.target.value })
              }
            >
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Placeholder */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Placeholder (optional)
            </label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded"
              value={values.placeholder}
              onChange={(e) =>
                setValues({ ...values, placeholder: e.target.value })
              }
            />
          </div>

          {/* Required */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              className="form-checkbox h-4 w-4"
              checked={values.isRequired}
              onChange={(e) =>
                setValues({ ...values, isRequired: e.target.checked })
              }
            />
            <span className="text-sm text-gray-700">Required</span>
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
              {editingId ? "Save changes" : "Save"}
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