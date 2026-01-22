'use client';
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  GripVertical, 
  Save, 
  Eye, 
  Trash2, 
  Plus,
  Grid3x3,
  Copy,
  Layout,
  CheckCircle2,
  Filter
} from 'lucide-react';
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
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const DEPARTMENTS = ['vmd', 'cad', 'commercial', 'mmc'];

const GRID_SIZES = [
  { value: 1, label: '1 Column' },
  { value: 2, label: '2 Columns' },
  { value: 3, label: '3 Columns' },
  { value: 4, label: '4 Columns' },
  { value: 6, label: '6 Columns' },
];

const CELL_HEIGHTS = [
  { value: 'auto', label: 'Auto' },
  { value: 'small', label: 'Small (40px)' },
  { value: 'medium', label: 'Medium (80px)' },
  { value: 'large', label: 'Large (120px)' },
  { value: 'xlarge', label: 'Extra Large (200px)' },
];

// Sortable template cell component
function SortableTemplateCell({ id, field, position, onRemove, onResize }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    gridColumn: `span ${position.colSpan || 1}`,
    minHeight: position.height === 'small' ? '40px' : 
               position.height === 'medium' ? '80px' :
               position.height === 'large' ? '120px' :
               position.height === 'xlarge' ? '200px' : 'auto',
  };

  const getFieldIcon = (type) => {
    switch(type) {
      case 'heading': return '📁';
      case 'text': return '📝';
      case 'number': return '🔢';
      case 'date': return '📅';
      case 'boolean': return '☑️';
      case 'textarea': return '📄';
      case 'image': return '🖼️';
      default: return '📋';
    }
  };

  const getDeptColor = (dept) => {
    switch(dept) {
      case 'vmd': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'cad': return 'bg-green-100 text-green-700 border-green-300';
      case 'commercial': return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'mmc': return 'bg-orange-100 text-orange-700 border-orange-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        border-2 border-dashed rounded-lg p-3 transition-all
        ${getDeptColor(field.department)}
        hover:shadow-md
        ${isDragging ? 'shadow-lg z-50' : ''}
      `}
    >
      <div className="flex items-start justify-between mb-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab hover:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </div>
        
        <div className="flex items-center space-x-1">
          <select
            className="text-xs border rounded px-1 py-0.5 bg-white"
            value={position.colSpan || 1}
            onChange={(e) => onResize(id, 'colSpan', parseInt(e.target.value))}
            onClick={(e) => e.stopPropagation()}
          >
            {[1, 2, 3, 4, 6].map(span => (
              <option key={span} value={span}>{span} col</option>
            ))}
          </select>
          
          <select
            className="text-xs border rounded px-1 py-0.5 bg-white"
            value={position.height || 'auto'}
            onChange={(e) => onResize(id, 'height', e.target.value)}
            onClick={(e) => e.stopPropagation()}
          >
            {CELL_HEIGHTS.map(h => (
              <option key={h.value} value={h.value}>{h.label}</option>
            ))}
          </select>
          
          <button
            onClick={() => onRemove(id)}
            className="text-red-500 hover:text-red-700 p-1"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
      
      <div className="text-sm font-medium">
        {getFieldIcon(field.type)} {field.name}
      </div>
      
      <div className="flex items-center space-x-2 mt-2">
        <Badge variant="outline" className="text-xs">
          {field.department?.toUpperCase() || 'ALL'}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {field.type}
        </Badge>
        {field.isRequired && (
          <Badge variant="destructive" className="text-xs">Required</Badge>
        )}
      </div>
    </div>
  );
}

// Available fields sidebar
function AvailableFieldsList({ allFields, onAddField, filterDepartment, setFilterDepartment }) {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredFields = allFields.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = filterDepartment === 'all' || f.department === filterDepartment;
    return matchesSearch && matchesDept;
  });

  const getFieldIcon = (type) => {
    switch(type) {
      case 'heading': return '📁';
      case 'text': return '📝';
      case 'number': return '🔢';
      case 'date': return '📅';
      case 'boolean': return '☑️';
      case 'textarea': return '📄';
      case 'image': return '🖼️';
      default: return '📋';
    }
  };

  const getDeptColor = (dept) => {
    switch(dept) {
      case 'vmd': return 'border-blue-300 hover:border-blue-500 hover:bg-blue-50';
      case 'cad': return 'border-green-300 hover:border-green-500 hover:bg-green-50';
      case 'commercial': return 'border-purple-300 hover:border-purple-500 hover:bg-purple-50';
      case 'mmc': return 'border-orange-300 hover:border-orange-500 hover:bg-orange-50';
      default: return 'border-gray-300 hover:border-gray-500 hover:bg-gray-50';
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b space-y-3">
        <h3 className="font-semibold text-gray-900">All Department Fields</h3>
        
        <Input
          placeholder="Search fields..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="text-sm"
        />
        
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="flex-1 text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value="all">All Departments</option>
            {DEPARTMENTS.map(dept => (
              <option key={dept} value={dept}>{dept.toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredFields.map(field => (
          <button
            key={field._id}
            onClick={() => onAddField(field)}
            className={`w-full text-left p-3 border-2 rounded-lg transition-all ${getDeptColor(field.department)}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="font-medium text-sm text-gray-900">
                  {getFieldIcon(field.type)} {field.name}
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                    {field.type}
                  </span>
                  <span className="text-xs font-medium text-gray-600">
                    {field.department?.toUpperCase() || 'ALL'}
                  </span>
                </div>
              </div>
              <Plus className="h-4 w-4 text-gray-400" />
            </div>
          </button>
        ))}
        
        {filteredFields.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            No fields found
          </div>
        )}
      </div>
    </div>
  );
}

export default function PrintTemplateDesigner() {
  const [allFields, setAllFields] = useState([]);
  const [templateCells, setTemplateCells] = useState([]);
  const [gridColumns, setGridColumns] = useState(6);
  const [templateName, setTemplateName] = useState('');
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTemplateId, setActiveTemplateId] = useState(null);
  const [filterDepartment, setFilterDepartment] = useState('all');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchAllFields();
    fetchTemplates();
  }, []);

  const fetchAllFields = async () => {
    try {
      // Fetch fields from all departments
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
      console.error('Failed to fetch fields', err);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/printTemplate');
      const data = await res.json();
      setSavedTemplates(Array.isArray(data) ? data : []);
      
      // Find active template
      const active = data.find(t => t.isActive);
      if (active) {
        setActiveTemplateId(active._id);
      }
    } catch (err) {
      console.error('Failed to fetch templates', err);
    }
  };

  const addFieldToTemplate = (field) => {
    const newCell = {
      id: `cell-${Date.now()}-${Math.random()}`,
      fieldId: field._id,
      field: field,
      position: {
        colSpan: 1,
        height: field.type === 'textarea' ? 'large' : 
                field.type === 'image' ? 'xlarge' : 
                field.type === 'heading' ? 'medium' : 'auto',
      }
    };
    setTemplateCells([...templateCells, newCell]);
  };

  const removeCell = (cellId) => {
    setTemplateCells(templateCells.filter(c => c.id !== cellId));
  };

  const resizeCell = (cellId, dimension, value) => {
    setTemplateCells(templateCells.map(cell => 
      cell.id === cellId 
        ? { ...cell, position: { ...cell.position, [dimension]: value } }
        : cell
    ));
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setTemplateCells((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const saveTemplate = async () => {
    if (!templateName.trim()) {
      alert('Please enter a template name');
      return;
    }

    setSaving(true);
    try {
      const templateData = {
        name: templateName,
        gridColumns,
        cells: templateCells.map(cell => ({
          fieldId: cell.fieldId,
          position: cell.position,
        })),
        isActive: false, // Don't auto-activate
      };

      const res = await fetch('/api/printTemplate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData),
      });

      if (res.ok) {
        alert('Template saved successfully!');
        fetchTemplates();
        setTemplateName('');
      } else {
        const errorData = await res.json();
        console.error('Failed to save template:', errorData);
        alert(`Failed to save template: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Failed to save template', err);
      alert('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const loadTemplate = async (template) => {
    setTemplateName(template.name);
    setGridColumns(template.gridColumns || 6);
    
    // Reconstruct cells with field data
    const cells = template.cells.map((cell) => {
      const field = allFields.find(f => f._id === cell.fieldId);
      return {
        id: `cell-${Date.now()}-${Math.random()}`,
        fieldId: cell.fieldId,
        field: field || { name: 'Unknown Field', type: 'text', department: 'unknown' },
        position: cell.position,
      };
    });
    
    setTemplateCells(cells);
  };

  const setActiveTemplate = async (templateId) => {
    try {
      // Deactivate all templates first
      await fetch('/api/printTemplate/setActive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId }),
      });
      
      setActiveTemplateId(templateId);
      fetchTemplates();
      alert('Template set as active!');
    } catch (err) {
      console.error('Failed to set active template', err);
      alert('Failed to set active template');
    }
  };

  const deleteTemplate = async (templateId) => {
    if (!confirm('Delete this template?')) return;
    
    try {
      await fetch(`/api/printTemplate?id=${templateId}`, { method: 'DELETE' });
      fetchTemplates();
      if (activeTemplateId === templateId) {
        setActiveTemplateId(null);
      }
    } catch (err) {
      console.error('Failed to delete template', err);
    }
  };

  // Group template cells by department for stats
  const cellsByDepartment = templateCells.reduce((acc, cell) => {
    const dept = cell.field.department || 'unknown';
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Print Template Designer</h1>
            <p className="text-sm text-gray-600 mt-1">
              Create a unified print layout with fields from all departments
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => setShowPreview(!showPreview)}
              variant="outline"
            >
              <Eye className="h-4 w-4 mr-2" />
              {showPreview ? 'Hide' : 'Show'} Preview
            </Button>
          </div>
        </div>
        
        {/* Template Controls */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Input
              placeholder="Template name..."
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-64"
            />
            
            <div className="flex items-center space-x-2">
              <Label className="text-sm">Grid:</Label>
              <select
                value={gridColumns}
                onChange={(e) => setGridColumns(parseInt(e.target.value))}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              >
                {GRID_SIZES.map(size => (
                  <option key={size.value} value={size.value}>{size.label}</option>
                ))}
              </select>
            </div>
            
            <Button onClick={saveTemplate} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Template'}
            </Button>
            
            <Button
              onClick={() => {
                setTemplateCells([]);
                setTemplateName('');
              }}
              variant="outline"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          </div>
          
          {/* Department Stats */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Fields:</span>
            {DEPARTMENTS.map(dept => (
              cellsByDepartment[dept] > 0 && (
                <Badge key={dept} variant="outline" className="text-xs">
                  {dept.toUpperCase()}: {cellsByDepartment[dept]}
                </Badge>
              )
            ))}
            <Badge variant="outline" className="text-xs font-semibold">
              Total: {templateCells.length}
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Available Fields Sidebar */}
        <div className="w-80 bg-white border-r overflow-hidden">
          <AvailableFieldsList 
            allFields={allFields} 
            onAddField={addFieldToTemplate}
            filterDepartment={filterDepartment}
            setFilterDepartment={setFilterDepartment}
          />
        </div>

        {/* Template Canvas */}
        <div className="flex-1 overflow-auto p-6">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Template Canvas - All Departments</span>
                <div className="text-sm font-normal text-gray-600">
                  {templateCells.length} fields added
                </div>
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              {templateCells.length === 0 ? (
                <div className="text-center py-12">
                  <Grid3x3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Start Building Your Template
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Click on fields from the left sidebar to add them to your template
                  </p>
                  <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-blue-200 rounded"></div>
                      <span>VMD</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-green-200 rounded"></div>
                      <span>CAD</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-purple-200 rounded"></div>
                      <span>Commercial</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-orange-200 rounded"></div>
                      <span>MMC</span>
                    </div>
                  </div>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={templateCells.map(c => c.id)}
                    strategy={rectSortingStrategy}
                  >
                    <div
                      className="grid gap-3"
                      style={{
                        gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`,
                      }}
                    >
                      {templateCells.map((cell) => (
                        <SortableTemplateCell
                          key={cell.id}
                          id={cell.id}
                          field={cell.field}
                          position={cell.position}
                          onRemove={removeCell}
                          onResize={resizeCell}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Saved Templates Sidebar */}
        <div className="w-80 bg-white border-l overflow-auto p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Saved Templates</h3>
          
          {savedTemplates.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              No saved templates yet
            </div>
          ) : (
            <div className="space-y-2">
              {savedTemplates.map(template => (
                <div
                  key={template._id}
                  className={`border-2 rounded-lg p-3 transition-all ${
                    activeTemplateId === template._id 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-200 hover:border-blue-400'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <div className="font-medium text-sm">{template.name}</div>
                        {activeTemplateId === template._id && (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {template.cells?.length || 0} fields · {template.gridColumns} columns
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => loadTemplate(template)}
                      className="flex-1 text-xs"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Load
                    </Button>
                    
                    {activeTemplateId !== template._id && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActiveTemplate(template._id)}
                        className="flex-1 text-xs text-green-600 hover:bg-green-50"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Set Active
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteTemplate(template._id)}
                      className="text-xs text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-8">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Print Preview - All Departments</h2>
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Close
              </Button>
            </div>
            
            <div className="p-8">
              <div className="bg-white border rounded-lg p-6">
                <div className="text-center border-b pb-4 mb-4">
                  <h1 className="text-2xl font-bold">Sample Request and Development Form</h1>
                  <div className="grid grid-cols-4 gap-4 mt-3 text-sm">
                    <div><strong>SRD REF:</strong> SAMPLE-001</div>
                    <div><strong>VMD:</strong> Pending</div>
                    <div><strong>CAD:</strong> Pending</div>
                    <div><strong>Commercial:</strong> Pending</div>
                  </div>
                </div>
                
                <div
                  className="grid gap-4"
                  style={{
                    gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`,
                  }}
                >
                  {templateCells.map((cell) => (
                    <div
                      key={cell.id}
                      className="border border-gray-300 rounded p-3"
                      style={{
                        gridColumn: `span ${cell.position.colSpan || 1}`,
                        minHeight: cell.position.height === 'small' ? '40px' : 
                                   cell.position.height === 'medium' ? '80px' :
                                   cell.position.height === 'large' ? '120px' :
                                   cell.position.height === 'xlarge' ? '200px' : 'auto',
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-sm font-medium text-gray-700">
                          {cell.field.name}
                          {cell.field.isRequired && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {cell.field.department?.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="border-b border-gray-300 min-h-[24px]"></div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 pt-4 border-t grid grid-cols-3 gap-6 text-sm">
                  <div className="text-center">
                    <div className="font-bold mb-2">PREPARED BY:</div>
                    <div className="border-b border-dotted border-gray-400 h-8 mb-1"></div>
                    <div className="text-xs">SIGNATURE & DATE</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold mb-2">REVIEWED BY:</div>
                    <div className="border-b border-dotted border-gray-400 h-8 mb-1"></div>
                    <div className="text-xs">SIGNATURE & DATE</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold mb-2">APPROVED BY:</div>
                    <div className="border-b border-dotted border-gray-400 h-8 mb-1"></div>
                    <div className="text-xs">SIGNATURE & DATE</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}