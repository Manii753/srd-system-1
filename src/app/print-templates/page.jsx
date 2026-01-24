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
  CheckCircle2,
  Filter,
  Download,
  Upload,
  Settings,
  Palette,
  Maximize2,
  Minimize2,
  RotateCcw,
  Zap
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
  { value: 1, label: '1 Column', icon: '│' },
  { value: 2, label: '2 Columns', icon: '││' },
  { value: 3, label: '3 Columns', icon: '│││' },
  { value: 4, label: '4 Columns', icon: '││││' },
  { value: 6, label: '6 Columns', icon: '││││││' },
];

const CELL_HEIGHTS = [
  { value: 'auto', label: 'Auto Height', px: 'auto' },
  { value: 'small', label: 'Small', px: '40px' },
  { value: 'medium', label: 'Medium', px: '80px' },
  { value: 'large', label: 'Large', px: '120px' },
  { value: 'xlarge', label: 'Extra Large', px: '200px' },
];

const TEMPLATE_THEMES = [
  { value: 'default', label: 'Default', colors: 'bg-white border-gray-300' },
  { value: 'modern', label: 'Modern', colors: 'bg-gray-50 border-gray-400' },
  { value: 'professional', label: 'Professional', colors: 'bg-blue-50 border-blue-300' },
  { value: 'minimal', label: 'Minimal', colors: 'bg-white border-gray-200' },
];

// Enhanced Sortable template cell component
function SortableTemplateCell({ id, field, position, onRemove, onResize, theme = 'default' }) {
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
    gridRow: `span ${position.rowSpan || 1}`,
    minHeight: position.height === 'small' ? '40px' : 
               position.height === 'medium' ? '80px' :
               position.height === 'large' ? '120px' :
               position.height === 'xlarge' ? '200px' : 'auto',
  };

  const getFieldIcon = (type) => {
    switch(type) {
      case 'heading': return '📋';
      case 'text': return '📝';
      case 'number': return '🔢';
      case 'date': return '📅';
      case 'boolean': return '☑️';
      case 'textarea': return '📄';
      case 'image': return '🖼️';
      case 'select': return '📋';
      default: return '📋';
    }
  };

  const getDeptColor = (dept) => {
    switch(dept) {
      case 'vmd': return 'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-800 border-blue-300 shadow-blue-100';
      case 'cad': return 'bg-gradient-to-br from-green-100 to-green-200 text-green-800 border-green-300 shadow-green-100';
      case 'commercial': return 'bg-gradient-to-br from-purple-100 to-purple-200 text-purple-800 border-purple-300 shadow-purple-100';
      case 'mmc': return 'bg-gradient-to-br from-orange-100 to-orange-200 text-orange-800 border-orange-300 shadow-orange-100';
      default: return 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-800 border-gray-300 shadow-gray-100';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        border-2 border-dashed rounded-xl p-4 transition-all duration-200
        ${getDeptColor(field.department)}
        hover:shadow-lg hover:scale-[1.02]
        ${isDragging ? 'shadow-2xl z-50 rotate-2' : 'shadow-md'}
        relative overflow-hidden
      `}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="w-full h-full" style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, currentColor 10px, currentColor 11px)`
        }}></div>
      </div>
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab hover:cursor-grabbing p-1 rounded-md hover:bg-white/50 transition-colors"
            title="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </div>
          
          <div className="flex items-center space-x-1">
            <select
              className="text-xs border rounded-md px-2 py-1 bg-white/90 backdrop-blur-sm font-medium"
              value={position.colSpan || 1}
              onChange={(e) => onResize(id, 'colSpan', parseInt(e.target.value))}
              onClick={(e) => e.stopPropagation()}
              title="Column span"
            >
              {[1, 2, 3, 4, 6].map(span => (
                <option key={span} value={span}>W: {span}</option>
              ))}
            </select>

            <select
              className="text-xs border rounded-md px-2 py-1 bg-white/90 backdrop-blur-sm font-medium"
              value={position.rowSpan || 1}
              onChange={(e) => onResize(id, 'rowSpan', parseInt(e.target.value))}
              onClick={(e) => e.stopPropagation()}
              title="Row span"
            >
              {[1, 2, 3, 4, 5, 6,7,8,9,10,11,12].map(span => (
                <option key={span} value={span}>H: {span}</option>
              ))}
            </select>
            
            <select
              className="text-xs border rounded-md px-2 py-1 bg-white/90 backdrop-blur-sm font-medium"
              value={position.height || 'auto'}
              onChange={(e) => onResize(id, 'height', e.target.value)}
              onClick={(e) => e.stopPropagation()}
              title="Cell height"
            >
              {CELL_HEIGHTS.map(h => (
                <option key={h.value} value={h.value}>{h.label}</option>
              ))}
            </select>
            
            <button
              onClick={() => onRemove(id)}
              className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-white/50 transition-colors"
              title="Remove field"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
        
        <div className="text-sm font-semibold mb-2 flex items-center">
          <span className="mr-2">{getFieldIcon(field.type)}</span>
          <span className="truncate">{field.name}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="text-xs font-bold">
              {field.department?.toUpperCase() || 'ALL'}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {field.type}
            </Badge>
          </div>
          {field.isRequired && (
            <Badge variant="destructive" className="text-xs animate-pulse">
              Required
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

// Enhanced Available fields sidebar
function AvailableFieldsList({ allFields, onAddField, filterDepartment, setFilterDepartment }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name'); // name, department, type
  
  const filteredFields = allFields.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = filterDepartment === 'all' || f.department === filterDepartment;
    return matchesSearch && matchesDept;
  }).sort((a, b) => {
    switch(sortBy) {
      case 'department':
        return (a.department || '').localeCompare(b.department || '');
      case 'type':
        return a.type.localeCompare(b.type);
      default:
        return a.name.localeCompare(b.name);
    }
  });

  const getFieldIcon = (type) => {
    switch(type) {
      case 'heading': return '📋';
      case 'text': return '📝';
      case 'number': return '🔢';
      case 'date': return '📅';
      case 'boolean': return '☑️';
      case 'textarea': return '📄';
      case 'image': return '🖼️';
      case 'select': return '📋';
      default: return '📋';
    }
  };

  const getDeptColor = (dept) => {
    switch(dept) {
      case 'vmd': return 'border-blue-300 hover:border-blue-500 hover:bg-blue-50 hover:shadow-blue-100';
      case 'cad': return 'border-green-300 hover:border-green-500 hover:bg-green-50 hover:shadow-green-100';
      case 'commercial': return 'border-purple-300 hover:border-purple-500 hover:bg-purple-50 hover:shadow-purple-100';
      case 'mmc': return 'border-orange-300 hover:border-orange-500 hover:bg-orange-50 hover:shadow-orange-100';
      default: return 'border-gray-300 hover:border-gray-500 hover:bg-gray-50 hover:shadow-gray-100';
    }
  };

  const fieldsByDepartment = DEPARTMENTS.reduce((acc, dept) => {
    acc[dept] = filteredFields.filter(f => f.department === dept).length;
    return acc;
  }, {});

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-gray-50 to-white">
      <div className="p-4 border-b bg-white shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-lg">Available Fields</h3>
          <Badge variant="outline" className="font-semibold">
            {filteredFields.length} fields
          </Badge>
        </div>
        
        <Input
          placeholder="🔍 Search fields..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="text-sm"
        />
        
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="flex-1 text-sm border border-gray-300 rounded-md px-3 py-2 bg-white"
          >
            <option value="all">All Departments</option>
            {DEPARTMENTS.map(dept => (
              <option key={dept} value={dept}>
                {dept.toUpperCase()} ({fieldsByDepartment[dept] || 0})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <Settings className="h-4 w-4 text-gray-500" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="flex-1 text-sm border border-gray-300 rounded-md px-3 py-2 bg-white"
          >
            <option value="name">Sort by Name</option>
            <option value="department">Sort by Department</option>
            <option value="type">Sort by Type</option>
          </select>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredFields.map(field => (
          <button
            key={field._id}
            onClick={() => onAddField(field)}
            className={`w-full text-left p-4 border-2 rounded-xl transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg ${getDeptColor(field.department)}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="font-semibold text-sm text-gray-900 mb-1 flex items-center">
                  <span className="mr-2">{getFieldIcon(field.type)}</span>
                  <span className="truncate">{field.name}</span>
                  {field.isRequired && (
                    <span className="ml-2 text-red-500 text-xs">*</span>
                  )}
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <span className="text-xs bg-white px-2 py-1 rounded-full font-medium border">
                    {field.type}
                  </span>
                  <span className="text-xs font-bold text-gray-700">
                    {field.department?.toUpperCase() || 'ALL'}
                  </span>
                </div>
              </div>
              <div className="ml-3 p-2 rounded-full bg-white/50">
                <Plus className="h-4 w-4 text-gray-600" />
              </div>
            </div>
          </button>
        ))}
        
        {filteredFields.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No fields found</h3>
            <p className="text-gray-500 text-sm">
              Try adjusting your search or filter criteria
            </p>
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
  const [templateTheme, setTemplateTheme] = useState('default');
  const [isFullscreen, setIsFullscreen] = useState(false);

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
        rowSpan: 1,
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
        theme: templateTheme,
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
        alert('✅ Template saved successfully!');
        fetchTemplates();
        setTemplateName('');
      } else {
        const errorData = await res.json();
        console.error('Failed to save template:', errorData);
        alert(`❌ Failed to save template: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Failed to save template', err);
      alert('❌ Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const loadTemplate = async (template) => {
    setTemplateName(template.name);
    setGridColumns(template.gridColumns || 6);
    setTemplateTheme(template.theme || 'default');
    
    // Reconstruct cells with field data
    const cells = template.cells.map((cell) => {
      const field = allFields.find(f => f._id === cell.fieldId);
      return {
        id: `cell-${Date.now()}-${Math.random()}`,
        fieldId: cell.fieldId,
        field: field || { name: 'Unknown Field', type: 'text', department: 'unknown' },
        position: {
          ...cell.position,
          rowSpan: cell.position.rowSpan || 1,
        },
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
      alert('✅ Template set as active!');
    } catch (err) {
      console.error('Failed to set active template', err);
      alert('❌ Failed to set active template');
    }
  };

  const deleteTemplate = async (templateId) => {
    if (!confirm('🗑️ Delete this template? This action cannot be undone.')) return;
    
    try {
      await fetch(`/api/printTemplate?id=${templateId}`, { method: 'DELETE' });
      fetchTemplates();
      if (activeTemplateId === templateId) {
        setActiveTemplateId(null);
      }
      alert('✅ Template deleted successfully!');
    } catch (err) {
      console.error('Failed to delete template', err);
      alert('❌ Failed to delete template');
    }
  };

  const exportTemplate = () => {
    const templateData = {
      name: templateName,
      gridColumns,
      theme: templateTheme,
      cells: templateCells,
      exportedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(templateData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${templateName || 'template'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importTemplate = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const templateData = JSON.parse(e.target.result);
        setTemplateName(templateData.name || '');
        setGridColumns(templateData.gridColumns || 6);
        setTemplateTheme(templateData.theme || 'default');
        setTemplateCells(templateData.cells || []);
        alert('✅ Template imported successfully!');
      } catch (err) {
        alert('❌ Invalid template file');
      }
    };
    reader.readAsText(file);
  };

  // Group template cells by department for stats
  const cellsByDepartment = templateCells.reduce((acc, cell) => {
    const dept = cell.field.department || 'unknown';
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {});

  const quickTemplates = [
    {
      name: 'Basic Form',
      cells: ['title', 'description', 'fabric', 'color', 'size'],
      columns: 3
    },
    {
      name: 'Detailed Form',
      cells: ['title', 'description', 'fabric', 'color', 'size', 'measurements', 'construction', 'finishing'],
      columns: 4
    },
    {
      name: 'Image Heavy',
      cells: ['title', 'images', 'fabric', 'color', 'construction'],
      columns: 2
    }
  ];

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50' : 'h-screen'} flex flex-col bg-gradient-to-br from-gray-50 to-gray-100`}>
      {/* Enhanced Header */}
      <div className="bg-white border-b shadow-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Zap className="h-8 w-8 text-blue-600 mr-3" />
                Print Template Designer
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Create unified print layouts with fields from all departments
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => setIsFullscreen(!isFullscreen)}
              variant="outline"
              size="sm"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            
            <Button
              onClick={() => setShowPreview(!showPreview)}
              variant="outline"
              className="bg-blue-50 hover:bg-blue-100 border-blue-200"
            >
              <Eye className="h-4 w-4 mr-2" />
              {showPreview ? 'Hide' : 'Show'} Preview
            </Button>
          </div>
        </div>
        
        {/* Enhanced Template Controls */}
        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Input
              placeholder="✨ Template name..."
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-64 border-2 border-gray-200 focus:border-blue-400"
            />
            
            <div className="flex items-center space-x-2">
              <Label className="text-sm font-medium">Grid:</Label>
              <select
                value={gridColumns}
                onChange={(e) => setGridColumns(parseInt(e.target.value))}
                className="border-2 border-gray-200 rounded-md px-3 py-2 text-sm font-medium bg-white"
              >
                {GRID_SIZES.map(size => (
                  <option key={size.value} value={size.value}>
                    {size.icon} {size.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <Palette className="h-4 w-4 text-gray-500" />
              <select
                value={templateTheme}
                onChange={(e) => setTemplateTheme(e.target.value)}
                className="border-2 border-gray-200 rounded-md px-3 py-2 text-sm font-medium bg-white"
              >
                {TEMPLATE_THEMES.map(theme => (
                  <option key={theme.value} value={theme.value}>{theme.label}</option>
                ))}
              </select>
            </div>
            
            <Button onClick={saveTemplate} disabled={saving} className="bg-green-600 hover:bg-green-700">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Template'}
            </Button>
            
            <Button onClick={exportTemplate} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".json"
                onChange={importTemplate}
                className="hidden"
              />
              <Button variant="outline" size="sm" asChild>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </span>
              </Button>
            </label>
            
            <Button
              onClick={() => {
                if (confirm('🗑️ Clear all fields? This action cannot be undone.')) {
                  setTemplateCells([]);
                  setTemplateName('');
                }
              }}
              variant="outline"
              size="sm"
              className="text-red-600 hover:bg-red-50 border-red-200"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          </div>
          
          {/* Enhanced Department Stats */}
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-700">Fields:</span>
            {DEPARTMENTS.map(dept => (
              cellsByDepartment[dept] > 0 && (
                <Badge key={dept} variant="secondary" className="text-xs font-bold">
                  {dept.toUpperCase()}: {cellsByDepartment[dept]}
                </Badge>
              )
            ))}
            <Badge variant="default" className="text-xs font-bold bg-blue-600">
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
                        gridRow: `span ${cell.position.rowSpan || 1}`,
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