'use client'
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { PlusCircleIcon, GripVertical, Folder, FolderOpen } from "lucide-react";
import { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const DEPARTMENTS = [
  'vmd',
  'cad',
  'commercial',
  'mmc'
];

// Sortable Field Item Component
function SortableFieldItem({ field, onEdit, onDelete, isHeading, children, level = 0 }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow
        ${isDragging ? 'z-50' : ''}
        ${isHeading ? 'border-l-4 border-l-blue-500 bg-blue-50' : 'border-gray-200'}
        ${level > 0 ? 'ml-8' : ''}
      `}
    >
      <div className="flex items-center p-4">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab hover:cursor-grabbing mr-3 text-gray-400 hover:text-gray-600"
        >
          <GripVertical className="h-5 w-5" />
        </div>

        {/* Field Icon */}
        <div className="mr-3">
          {isHeading ? (
            <FolderOpen className="h-5 w-5 text-blue-600" />
          ) : (
            <div className="w-3 h-3 rounded-full bg-gray-400"></div>
          )}
        </div>

        {/* Field Info */}
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <span className={`font-medium ${isHeading ? 'text-blue-900' : 'text-gray-900'}`}>
              {field.name}
            </span>
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {field.type}
            </span>
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {field.department?.toUpperCase() || 'GLOBAL'}
            </span>
            {field.isRequired && (
              <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                Required
              </span>
            )}
          </div>
          {field.placeholder && (
            <div className="text-sm text-gray-500 mt-1">
              Placeholder: {field.placeholder}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          <button
            className="text-blue-600 hover:text-blue-900 px-3 py-1 text-sm"
            onClick={() => onEdit(field)}
          >
            Edit
          </button>
          <button
            className="text-red-600 hover:text-red-900 px-3 py-1 text-sm"
            onClick={() => onDelete(field)}
          >
            Delete
          </button>
        </div>
      </div>

      {/* Children (for nested fields under headings) */}
      {children && (
        <div className="pb-2">
          {children}
        </div>
      )}
    </div>
  );
}

export default function Page() {
  const [modalOpen, setModalOpen] = useState(false);
  const [values, setValues] = useState({ 
    name: "", 
    type: "", 
    placeholder: "", 
    department: 'vmd', 
    isRequired: false,
    parentHeading: null 
  });
  const [fields, setFields] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState('vmd');
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchFields();
  }, [selectedDepartment]);

  async function fetchFields() {
    try {
      const res = await fetch(`/api/newField?department=${selectedDepartment}`);
      const data = await res.json();
      setFields(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch fields', err);
    }
  }

  function openNew() {
    setValues({ 
      name: "", 
      type: "", 
      placeholder: "", 
      department: selectedDepartment, 
      isRequired: false,
      parentHeading: null 
    });
    setEditingId(null);
    setModalOpen(true);
  }

  function openEdit(field) {
    setValues({ 
      name: field.name || '', 
      type: field.type || 'text', 
      placeholder: field.placeholder || '', 
      department: field.department || selectedDepartment, 
      isRequired: !!field.isRequired,
      parentHeading: field.parentHeading || null
    });
    setEditingId(field._id);
    setModalOpen(true);
  }

  async function handleDelete(field) {
    if (!confirm(`Delete field "${field.name}"? This will disable the field for new SRDs but existing SRD values remain.`)) return;
    
    try {
      const res = await fetch(`/api/newField?id=${field._id}`, { method: 'DELETE' });
      const data = await res.json();
      setFields((prev) => prev.filter((p) => p._id !== field._id));
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

  async function handleDragEnd(event) {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setSaving(true);
      
      const oldIndex = fields.findIndex(field => field._id === active.id);
      const newIndex = fields.findIndex(field => field._id === over.id);
      
      const newFields = arrayMove(fields, oldIndex, newIndex);
      setFields(newFields);

      // Update order in database
      try {
        const fieldOrders = newFields.map((field, index) => ({
          id: field._id,
          order: index,
          parentHeading: field.parentHeading
        }));

        await fetch('/api/newField/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            fieldOrders, 
            department: selectedDepartment 
          })
        });
      } catch (err) {
        console.error('Failed to update field order', err);
        // Revert on error
        fetchFields();
      } finally {
        setSaving(false);
      }
    }
  }

  // Group fields by headings
  const groupedFields = () => {
    const headings = fields.filter(f => f.type === 'heading');
    const regularFields = fields.filter(f => f.type !== 'heading');
    const result = [];

    // Add fields without parent heading first
    const orphanFields = regularFields.filter(f => !f.parentHeading);
    result.push(...orphanFields);

    // Add headings with their children
    headings.forEach(heading => {
      result.push(heading);
      const childFields = regularFields.filter(f => 
        f.parentHeading && f.parentHeading.toString() === heading._id.toString()
      );
      result.push(...childFields);
    });

    return result;
  };

  const displayFields = groupedFields();
  const headingOptions = fields.filter(f => f.type === 'heading');

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage SRD Fields</h1>
          <p className="text-gray-600 mt-1">Drag and drop to reorder fields. Use headings to group related fields.</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            className="px-3 py-2 border border-gray-300 rounded-md"
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
          >
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept.toUpperCase()}
              </option>
            ))}
          </select>
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
        {saving && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="text-blue-800">Saving field order...</div>
          </div>
        )}

        {displayFields.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Folder className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No fields yet</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating your first field.</p>
            <div className="mt-6">
              <Button onClick={openNew}>
                <PlusCircleIcon className="h-4 w-4 mr-2" />
                Add New Field
              </Button>
            </div>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={displayFields.map(f => f._id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {displayFields.map((field) => (
                  <SortableFieldItem
                    key={field._id}
                    field={field}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    isHeading={field.type === 'heading'}
                    level={field.parentHeading ? 1 : 0}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
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
                    <option value="heading">📁 Heading (Section Separator)</option>
                    <option value="text">📝 Text</option>
                    <option value="number">🔢 Number</option>
                    <option value="date">📅 Date</option>
                    <option value="boolean">☑️ Boolean (Yes/No)</option>
                    <option value="textarea">📄 Textarea</option>
                    <option value="file">📎 File Upload</option>
                    <option value="image">🖼️ Image Upload</option>
                  </select>
                </div>

                {/* Parent Heading (only for non-heading fields) */}
                {values.type !== 'heading' && headingOptions.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Group Under Heading (Optional)
                    </label>
                    <select
                      className="w-full p-2 border border-gray-300 rounded"
                      value={values.parentHeading || ''}
                      onChange={(e) => setValues({ ...values, parentHeading: e.target.value || null })}
                    >
                      <option value="">No Grouping</option>
                      {headingOptions.map((heading) => (
                        <option key={heading._id} value={heading._id}>
                          📁 {heading.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Department */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded"
                    value={values.department}
                    onChange={(e) => setValues({ ...values, department: e.target.value })}
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Placeholder */}
                {values.type !== 'heading' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Placeholder (optional)
                    </label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-300 rounded"
                      value={values.placeholder}
                      onChange={(e) => setValues({ ...values, placeholder: e.target.value })}
                    />
                  </div>
                )}

                {/* Required */}
                {values.type !== 'heading' && (
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      className="form-checkbox h-4 w-4"
                      checked={values.isRequired}
                      onChange={(e) => setValues({ ...values, isRequired: e.target.checked })}
                    />
                    <span className="text-sm text-gray-700">Required</span>
                  </div>
                )}

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