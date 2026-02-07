'use client'
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation';
import { PlusCircleIcon, GripVertical, Folder, FolderOpen, ChevronDown, ChevronRight, Plus } from "lucide-react";
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
function SortableFieldItem({ field, onEdit, onDelete, isHeading, children, level = 0, isExpanded, onToggleExpanded, onToggleQuickDetails }) {
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

  if (isHeading) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`
          bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg shadow-sm hover:shadow-md transition-all
          ${isDragging ? 'z-50 shadow-lg' : ''}
        `}
      >
        {/* Heading Header */}
        <div className="flex items-center p-4">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab hover:cursor-grabbing mr-3 text-blue-500 hover:text-blue-700"
          >
            <GripVertical className="h-5 w-5" />
          </div>

          {/* Expand/Collapse Button */}
          <button
            onClick={() => onToggleExpanded(field._id)}
            className="mr-3 text-blue-600 hover:text-blue-800 transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </button>

          {/* Heading Icon */}
          <div className="mr-3">
            {isExpanded ? (
              <FolderOpen className="h-6 w-6 text-blue-600" />
            ) : (
              <Folder className="h-6 w-6 text-blue-600" />
            )}
          </div>

          {/* Heading Info */}
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              <span className="font-semibold text-blue-900 text-lg">
                📁 {field.name}
              </span>
              <span className="text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                Section Header
              </span>
              <span className="text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                {field.department?.toUpperCase() || 'GLOBAL'}
              </span>
            </div>
            {field.children && (
              <div className="text-sm text-blue-600 mt-1">
                {Array.isArray(field.children) ? field.children.length : 0} fields in this section
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <button
              className="text-blue-600 hover:text-blue-900 px-3 py-1 text-sm font-medium"
              onClick={() => onEdit(field)}
            >
              Edit
            </button>
            <button
              className="text-red-600 hover:text-red-900 px-3 py-1 text-sm font-medium"
              onClick={() => onDelete(field)}
            >
              Delete
            </button>
          </div>
        </div>

        {/* Collapsible Children */}
        {isExpanded && children && (
          <div className="px-4 pb-4">
            <div className="border-t border-blue-200 pt-3">
              {children}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Regular field item
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        bg-white border border-gray-200 rounded-md shadow-sm hover:shadow-md transition-shadow
        ${isDragging ? 'z-50' : ''}
        ${level > 0 ? 'ml-4' : ''}
      `}
    >
      <div className="flex items-center p-3">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab hover:cursor-grabbing mr-3 text-gray-400 hover:text-gray-600"
        >
          <GripVertical className="h-4 w-4" />
        </div>

        {/* Field Icon */}
        <div className="mr-3">
          <div className="w-3 h-3 rounded-full bg-gray-400"></div>
        </div>

        {/* Field Info */}
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <span className="font-medium text-gray-900">
              {field.name}
            </span>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {field.type}
            </span>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
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
          {!isHeading && (
            <label className="flex items-center space-x-1 cursor-pointer">
              <input
                type="checkbox"
                checked={field.isShownInQuickDetails || false}
                onChange={() => onToggleQuickDetails(field)}
                className="form-checkbox h-4 w-4 text-blue-600 rounded"
              />
              <span className="text-xs text-gray-600">Quick Details</span>
            </label>
          )}
          <button
            className="text-blue-600 hover:text-blue-900 px-2 py-1 text-sm"
            onClick={() => onEdit(field)}
          >
            Edit
          </button>
          <button
            className="text-red-600 hover:text-red-900 px-2 py-1 text-sm"
            onClick={() => onDelete(field)}
          >
            Delete
          </button>
        </div>
      </div>
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
    parentHeading: null,
    isShownInQuickDetails: false,
    isConnectedTo: false,
    connectedFieldId: null,
    connectionType: null
  });
  const router = useRouter();
  const [fields, setFields] = useState([]);
  const [allFields, setAllFields] = useState([]); // All fields from all departments for connection dropdown
  const [editingId, setEditingId] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState('vmd');
  const [saving, setSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState(new Set());
  const [connectedFieldSearch, setConnectedFieldSearch] = useState('');
  const [showFieldDropdown, setShowFieldDropdown] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchFields();
  }, [selectedDepartment]);

  // Auto-expand all sections when fields are loaded
  useEffect(() => {
    const headingIds = fields.filter(f => f.type === 'heading').map(f => f._id);
    setExpandedSections(new Set(headingIds));
  }, [fields]);

  async function fetchFields() {
    try {
      const res = await fetch(`/api/newField?department=${selectedDepartment}`);
      const data = await res.json();
      setFields(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch fields', err);
    }
  }

  // Fetch all fields from all departments for connected field dropdown
  async function fetchAllFields() {
    try {
      const allFieldsData = [];
      for (const dept of DEPARTMENTS) {
        const res = await fetch(`/api/newField?department=${dept}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          allFieldsData.push(...data);
        }
      }
      setAllFields(allFieldsData);
    } catch (err) {
      console.error('Failed to fetch all fields', err);
    }
  }

  useEffect(() => {
    fetchAllFields();
  }, []);

  function toggleSection(headingId) {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(headingId)) {
        newSet.delete(headingId);
      } else {
        newSet.add(headingId);
      }
      return newSet;
    });
  }

  function openNew(parentHeading = null) {
    setValues({
      name: "",
      type: "",
      placeholder: "",
      department: selectedDepartment,
      isRequired: false,
      parentHeading: parentHeading,
      isShownInQuickDetails: false,
      isConnectedTo: false,
      connectedFieldId: null,
      connectionType: null
    });
    setEditingId(null);
    setModalOpen(true);
  }

  function openEdit(field) {
    // Handle connectedFieldId - it could be a populated object or just an ID
    const connectedId = field.connectedFieldId
      ? (typeof field.connectedFieldId === 'object' ? field.connectedFieldId._id : field.connectedFieldId)
      : null;

    setValues({
      name: field.name || '',
      type: field.type || 'text',
      placeholder: field.placeholder || '',
      department: field.department || selectedDepartment,
      isRequired: !!field.isRequired,
      parentHeading: field.parentHeading || null,
      isShownInQuickDetails: !!field.isShownInQuickDetails,
      isConnectedTo: !!field.isConnectedTo,
      connectedFieldId: connectedId,
      connectionType: field.connectionType || null
    });
    setEditingId(field._id);
    setModalOpen(true);
  }

  async function handleDelete(field) {
    if (!confirm(`Delete field "${field.name}"? This will disable the field for new SRDs but existing SRD values remain.`)) return;

    try {
      const res = await fetch(`/api/newField?id=${field._id}`, { method: 'DELETE' });
      await res.json(); // Process response but don't store in unused variable
      setFields((prev) => prev.filter((p) => p._id !== field._id));
    } catch (err) {
      console.error('Failed to delete field', err);
      alert('Failed to delete field');
    }
  }

  async function handleToggleQuickDetails(field) {
    try {
      const newValue = !field.isShownInQuickDetails;
      const res = await fetch(`/api/newField?id=${field._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isShownInQuickDetails: newValue })
      });
      const updated = await res.json();
      setFields((prev) => prev.map(f => f._id === updated._id ? updated : f));
    } catch (err) {
      console.error('Failed to toggle quick details', err);
      alert('Failed to update field');
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

      const draggedField = fields[oldIndex];
      let newFields = [...fields];

      // If dragging a heading (section), we need to move it and all its children together
      if (draggedField.type === 'heading') {
        // Find all child fields of this heading
        const childFields = fields.filter(f =>
          f.parentHeading && f.parentHeading.toString() === draggedField._id.toString()
        );

        // Create array of fields to move (heading + children)
        const fieldsToMove = [draggedField, ...childFields];

        // Remove the heading and all its children from their current positions
        newFields = newFields.filter(f => !fieldsToMove.some(moveField => moveField._id === f._id));

        // Calculate the correct insertion index
        let insertIndex;
        if (newIndex > oldIndex) {
          // Moving down - insert after the target
          insertIndex = Math.min(newFields.length, newIndex - fieldsToMove.length + 1);
        } else {
          // Moving up - insert at the target position
          insertIndex = Math.max(0, newIndex);
        }

        // Insert the heading and children at the new position
        newFields.splice(insertIndex, 0, ...fieldsToMove);
      } else {
        // Regular field dragging - use simple array move
        newFields = arrayMove(fields, oldIndex, newIndex);
      }

      setFields(newFields);

      // Update order in database
      try {
        const fieldOrders = newFields.map((field, index) => ({
          id: field._id,
          order: index,
          parentHeading: field.parentHeading
        }));

        const response = await fetch('/api/newField/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fieldOrders,
            department: selectedDepartment
          })
        });

        if (!response.ok) {
          throw new Error('Failed to update field order');
        }
      } catch (err) {
        console.error('Failed to update field order', err);
        // Revert on error
        fetchFields();
      } finally {
        setSaving(false);
      }
    }
  }

  // Group fields by headings for display
  const groupedFields = () => {
    const headings = fields.filter(f => f.type === 'heading');
    const regularFields = fields.filter(f => f.type !== 'heading');
    const result = [];

    // Add fields without parent heading first (orphan fields)
    const orphanFields = regularFields.filter(f => !f.parentHeading);
    result.push(...orphanFields);

    // Add headings with their children
    headings.forEach(heading => {
      const childFields = regularFields.filter(f => {
        if (!f.parentHeading) return false;
        // Handle both string and ObjectId comparisons
        const parentId = typeof f.parentHeading === 'object' ? f.parentHeading._id || f.parentHeading : f.parentHeading;
        const headingId = heading._id;
        return parentId.toString() === headingId.toString();
      });

      // Add heading with children property
      result.push({
        ...heading,
        children: childFields,
        isHeading: true
      });
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
          <p className="text-gray-600 mt-1">Organize fields into sections and drag to reorder. Click sections to expand/collapse.</p>
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
            onClick={() => router.push('/print-templates')}
            className="flex items-center"
          >

            Print Templates
          </Button>

          <Button
            variant="outline"
            className="flex items-center bg-black text-white border-gray-600 hover:bg-black/50 hover:border-gray-500"
            onClick={() => openNew()}
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
            <p className="mt-1 text-sm text-gray-500">Get started by creating your first field or section.</p>
            <div className="mt-6 flex justify-center space-x-3">
              <Button onClick={() => openNew()}>
                <PlusCircleIcon className="h-4 w-4 mr-2" />
                Add Field
              </Button>
              <Button variant="outline" onClick={() => openNew()}>
                <Folder className="h-4 w-4 mr-2" />
                Add Section
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
              items={fields.map(f => f._id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {displayFields.map((field) => {
                  if (field.type === 'heading') {
                    const isExpanded = expandedSections.has(field._id);
                    return (
                      <div key={field._id} className="space-y-2">
                        <SortableFieldItem
                          field={field}
                          onEdit={openEdit}
                          onDelete={handleDelete}
                          isHeading={true}
                          isExpanded={isExpanded}
                          onToggleExpanded={toggleSection}
                        >
                          {/* Render child fields inside the section */}
                          {isExpanded && field.children && field.children.length > 0 && (
                            <div className="space-y-2 mt-3">
                              {field.children.map((childField) => (
                                <SortableFieldItem
                                  key={childField._id}
                                  field={childField}
                                  onEdit={openEdit}
                                  onDelete={handleDelete}
                                  isHeading={false}
                                  level={1}
                                  onToggleQuickDetails={handleToggleQuickDetails}
                                />
                              ))}
                            </div>
                          )}
                        </SortableFieldItem>

                        {/* Add Field to Section Button */}
                        {isExpanded && (
                          <div className="ml-8">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openNew(field._id)}
                              className="text-blue-600 border-blue-200 hover:bg-blue-50"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Field to "{field.name}"
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  } else {
                    // Only render orphan fields (fields without parent heading) here
                    if (!field.parentHeading) {
                      return (
                        <SortableFieldItem
                          key={field._id}
                          field={field}
                          onEdit={openEdit}
                          onDelete={handleDelete}
                          isHeading={false}
                          onToggleQuickDetails={handleToggleQuickDetails}
                        />
                      );
                    }
                    return null;
                  }
                })}
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
                      Group Under Section (Optional)
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

                {/* Show in Quick Details */}
                {values.type !== 'heading' && (
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      className="form-checkbox h-4 w-4"
                      checked={values.isShownInQuickDetails}
                      onChange={(e) => setValues({ ...values, isShownInQuickDetails: e.target.checked })}
                    />
                    <span className="text-sm text-gray-700">Show in Quick Details</span>
                  </div>
                )}

                {/* Connected Field Settings */}
                {values.type !== 'heading' && (
                  <div className="border-t pt-4 mt-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <input
                        type="checkbox"
                        className="form-checkbox h-4 w-4"
                        checked={values.isConnectedTo}
                        onChange={(e) => setValues({
                          ...values,
                          isConnectedTo: e.target.checked,
                          connectedFieldId: e.target.checked ? values.connectedFieldId : null,
                          connectionType: e.target.checked ? values.connectionType : null
                        })}
                      />
                      <span className="text-sm font-medium text-gray-700">🔗 Connect to another field</span>
                    </div>

                    {values.isConnectedTo && (
                      <div className="space-y-3 pl-6 border-l-2 border-blue-200">
                        {/* Select Connected Field */}
                        <div className="relative">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Connected Field
                          </label>
                          <input
                            type="text"
                            className="w-full p-2 border border-gray-300 rounded"
                            placeholder="Click to search fields..."
                            value={connectedFieldSearch}
                            onChange={(e) => setConnectedFieldSearch(e.target.value)}
                            onFocus={() => setShowFieldDropdown(true)}
                          />
                          {values.connectedFieldId && (
                            <div className="mt-1 text-sm text-blue-600 flex items-center justify-between">
                              <span>✓ Selected: {allFields.find(f => f._id?.toString() === values.connectedFieldId?.toString())?.name || 'Unknown'}</span>
                              <button
                                type="button"
                                className="text-red-500 text-xs hover:underline"
                                onClick={() => setValues({ ...values, connectedFieldId: null })}
                              >
                                Clear
                              </button>
                            </div>
                          )}
                          {showFieldDropdown && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                              <div className="sticky top-0 bg-gray-100 px-3 py-2 border-b flex justify-between items-center">
                                <span className="text-xs font-medium text-gray-500">Available Fields</span>
                                <button
                                  type="button"
                                  className="text-gray-500 hover:text-gray-700 text-lg leading-none"
                                  onClick={() => setShowFieldDropdown(false)}
                                >
                                  ×
                                </button>
                              </div>
                              {allFields
                                .filter(f => f.type !== 'heading' && f._id !== editingId)
                                .filter(f => {
                                  if (!connectedFieldSearch) return true;
                                  const searchLower = connectedFieldSearch.toLowerCase();
                                  const headingName = f.parentHeading?.name || '';
                                  return f.name.toLowerCase().includes(searchLower) ||
                                    f.department?.toLowerCase().includes(searchLower) ||
                                    headingName.toLowerCase().includes(searchLower);
                                })
                                .map((f) => (
                                  <div
                                    key={f._id}
                                    className={`px-3 py-2 cursor-pointer hover:bg-blue-50 border-b border-gray-100 last:border-b-0 ${values.connectedFieldId?.toString() === f._id?.toString() ? 'bg-blue-100' : ''}`}
                                    onClick={() => {
                                      setValues({ ...values, connectedFieldId: f._id });
                                      setShowFieldDropdown(false);
                                      setConnectedFieldSearch('');
                                    }}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium text-gray-900">{f.name}</span>
                                      <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">{f.department?.toUpperCase()}</span>
                                    </div>
                                    {f.parentHeading?.name && (
                                      <div className="text-xs text-gray-500 mt-0.5">📁 {f.parentHeading.name}</div>
                                    )}
                                  </div>
                                ))}
                              {allFields.filter(f => f.type !== 'heading' && f._id !== editingId).filter(f => {
                                if (!connectedFieldSearch) return true;
                                const searchLower = connectedFieldSearch.toLowerCase();
                                return f.name.toLowerCase().includes(searchLower) || f.department?.toLowerCase().includes(searchLower);
                              }).length === 0 && (
                                  <div className="px-3 py-4 text-center text-gray-500 text-sm">No fields found</div>
                                )}
                            </div>
                          )}
                        </div>

                        {/* Connection Type */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Connection Type
                          </label>
                          <select
                            className="w-full p-2 border border-gray-300 rounded"
                            value={values.connectionType || ''}
                            onChange={(e) => setValues({ ...values, connectionType: e.target.value || null })}
                          >
                            <option value="">Select connection type</option>
                            <option value="auto-true">Auto-True (When this field is true, connected field becomes true)</option>
                            <option value="toggle-active">Toggle-Active (This field is active only when connected field is false)</option>
                          </select>
                        </div>
                      </div>
                    )}
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
      )
      }
    </Layout >
  );
}