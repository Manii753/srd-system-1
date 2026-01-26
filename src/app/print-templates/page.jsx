'use client';
import React, { useState, useEffect, useCallback } from 'react';
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
  Zap,
  Type,
  AlignLeft,
  Square,
  FileText,
  Heading1,
  SeparatorHorizontal,
  X,
  Edit3,
  Move
} from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  MeasuringStrategy,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  verticalListSortingStrategy,
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

// Custom element types that can be added to the template
const CUSTOM_ELEMENT_TYPES = [
  { 
    type: 'custom-heading', 
    label: 'Custom Heading', 
    icon: Heading1,
    description: 'Add a section heading',
    defaultValue: 'Section Heading',
    color: 'from-indigo-100 to-indigo-200 border-indigo-300'
  },
  { 
    type: 'custom-text', 
    label: 'Static Text', 
    icon: Type,
    description: 'Add static text/label',
    defaultValue: 'Enter text here',
    color: 'from-teal-100 to-teal-200 border-teal-300'
  },
  { 
    type: 'custom-empty-field', 
    label: 'Empty Field', 
    icon: Square,
    description: 'Add an empty input field for handwriting',
    defaultValue: 'Field Label',
    color: 'from-amber-100 to-amber-200 border-amber-300'
  },
  { 
    type: 'custom-textarea', 
    label: 'Empty Text Area', 
    icon: AlignLeft,
    description: 'Add a larger empty area for notes',
    defaultValue: 'Notes',
    color: 'from-rose-100 to-rose-200 border-rose-300'
  },
  { 
    type: 'custom-separator', 
    label: 'Separator Line', 
    icon: SeparatorHorizontal,
    description: 'Add a horizontal divider line',
    defaultValue: '',
    color: 'from-gray-100 to-gray-200 border-gray-400'
  },
  { 
    type: 'custom-signature', 
    label: 'Signature Box', 
    icon: Edit3,
    description: 'Add a signature area',
    defaultValue: 'Signature',
    color: 'from-violet-100 to-violet-200 border-violet-300'
  },
];

// Edit Modal for custom elements
function EditCustomElementModal({ element, onSave, onClose }) {
  const [editValue, setEditValue] = useState(element?.customValue || element?.field?.name || '');
  const [editPlaceholder, setEditPlaceholder] = useState(element?.customPlaceholder || '');

  if (!element) return null;

  const customType = element.customType;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4">
          <h3 className="font-semibold text-lg flex items-center">
            <Edit3 className="h-5 w-5 mr-2" />
            Edit Element
          </h3>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <Label className="text-sm font-medium text-gray-700">
              {customType === 'custom-heading' ? 'Heading Text' :
               customType === 'custom-text' ? 'Text Content' :
               customType === 'custom-empty-field' ? 'Field Label' :
               customType === 'custom-textarea' ? 'Area Label' :
               customType === 'custom-signature' ? 'Signature Label' :
               'Label'}
            </Label>
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder="Enter text..."
              className="mt-1"
            />
          </div>
          
          {(customType === 'custom-empty-field' || customType === 'custom-textarea') && (
            <div>
              <Label className="text-sm font-medium text-gray-700">
                Placeholder Text (optional)
              </Label>
              <Input
                value={editPlaceholder}
                onChange={(e) => setEditPlaceholder(e.target.value)}
                placeholder="e.g., Enter value here..."
                className="mt-1"
              />
            </div>
          )}
        </div>
        
        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={() => {
              onSave(element.id, editValue, editPlaceholder);
              onClose();
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

// Drag overlay component - shows what's being dragged
function DragOverlayContent({ cell }) {
  if (!cell) return null;
  
  const displayName = cell.isCustom ? (cell.customValue || 'Custom Element') : cell.field?.name;
  
  const getCellColor = () => {
    if (cell.isCustom) {
      const customTypeInfo = CUSTOM_ELEMENT_TYPES.find(t => t.type === cell.customType);
      if (customTypeInfo) {
        return `bg-gradient-to-br ${customTypeInfo.color}`;
      }
    }
    const dept = cell.field?.department;
    switch(dept) {
      case 'vmd': return 'bg-gradient-to-br from-blue-100 to-blue-200 border-blue-300';
      case 'cad': return 'bg-gradient-to-br from-green-100 to-green-200 border-green-300';
      case 'commercial': return 'bg-gradient-to-br from-purple-100 to-purple-200 border-purple-300';
      case 'mmc': return 'bg-gradient-to-br from-orange-100 to-orange-200 border-orange-300';
      default: return 'bg-gradient-to-br from-gray-100 to-gray-200 border-gray-300';
    }
  };

  return (
    <div 
      className={`
        border-2 border-dashed rounded-xl p-4 shadow-2xl
        ${getCellColor()}
        opacity-90 rotate-3 scale-105
      `}
      style={{ width: '200px' }}
    >
      <div className="flex items-center">
        <Move className="h-4 w-4 mr-2 text-gray-600" />
        <span className="text-sm font-semibold truncate">{displayName}</span>
      </div>
    </div>
  );
}

// Enhanced Sortable template cell component
function SortableTemplateCell({ 
  id, 
  field, 
  position, 
  onRemove, 
  onResize, 
  onEdit, 
  isCustom, 
  customType, 
  customValue, 
  customPlaceholder,
  isDraggingThis,
  isOverThis
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ 
    id,
    transition: {
      duration: 200,
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    gridColumn: `span ${position.colSpan || 1}`,
    gridRow: `span ${position.rowSpan || 1}`,
    minHeight: position.height === 'small' ? '40px' : 
               position.height === 'medium' ? '80px' :
               position.height === 'large' ? '120px' :
               position.height === 'xlarge' ? '200px' : 'auto',
  };

  const getFieldIcon = (type) => {
    if (isCustom) {
      const customTypeInfo = CUSTOM_ELEMENT_TYPES.find(t => t.type === customType);
      if (customTypeInfo) {
        const IconComponent = customTypeInfo.icon;
        return <IconComponent className="h-4 w-4" />;
      }
    }
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

  const getCellColor = () => {
    if (isCustom) {
      const customTypeInfo = CUSTOM_ELEMENT_TYPES.find(t => t.type === customType);
      if (customTypeInfo) {
        return `bg-gradient-to-br ${customTypeInfo.color}`;
      }
    }
    
    const dept = field?.department;
    switch(dept) {
      case 'vmd': return 'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-800 border-blue-300 shadow-blue-100';
      case 'cad': return 'bg-gradient-to-br from-green-100 to-green-200 text-green-800 border-green-300 shadow-green-100';
      case 'commercial': return 'bg-gradient-to-br from-purple-100 to-purple-200 text-purple-800 border-purple-300 shadow-purple-100';
      case 'mmc': return 'bg-gradient-to-br from-orange-100 to-orange-200 text-orange-800 border-orange-300 shadow-orange-100';
      default: return 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-800 border-gray-300 shadow-gray-100';
    }
  };

  const displayName = isCustom ? (customValue || 'Custom Element') : field?.name;
  const displayType = isCustom ? customType?.replace('custom-', '') : field?.type;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        border-2 border-dashed rounded-xl p-4 transition-all duration-200
        ${getCellColor()}
        ${isDragging ? 'opacity-30 scale-95 border-blue-500 border-solid' : 'opacity-100'}
        ${isOverThis ? 'ring-4 ring-blue-400 ring-offset-2 scale-[1.02]' : ''}
        hover:shadow-lg
        relative overflow-hidden
      `}
    >
      {/* Drop indicator */}
      {isOverThis && (
        <div className="absolute inset-0 bg-blue-500/20 rounded-xl flex items-center justify-center z-20">
          <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
            Drop here
          </div>
        </div>
      )}
      
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
            className="cursor-grab hover:cursor-grabbing p-2 rounded-md hover:bg-white/50 transition-colors active:cursor-grabbing"
            title="Drag to reorder"
          >
            <GripVertical className="h-5 w-5 text-gray-600" />
          </div>
          
          <div className="flex items-center space-x-1">
            {isCustom && (
              <button
                onClick={() => onEdit(id)}
                className="text-blue-600 hover:text-blue-800 p-1 rounded-md hover:bg-white/50 transition-colors"
                title="Edit element"
              >
                <Edit3 className="h-3 w-3" />
              </button>
            )}
            
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
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(span => (
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
          <span className="mr-2">{getFieldIcon(field?.type)}</span>
          <span className="truncate">{displayName}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isCustom ? (
              <Badge variant="secondary" className="text-xs font-bold bg-white/80">
                CUSTOM
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs font-bold">
                {field?.department?.toUpperCase() || 'ALL'}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs bg-white/80">
              {displayType}
            </Badge>
          </div>
          {!isCustom && field?.isRequired && (
            <Badge variant="destructive" className="text-xs animate-pulse">
              Required
            </Badge>
          )}
        </div>
        
        {customPlaceholder && (
          <div className="mt-2 text-xs text-gray-600 truncate">
            Placeholder: {customPlaceholder}
          </div>
        )}
      </div>
    </div>
  );
}

// Custom Elements Panel
function CustomElementsPanel({ onAddCustomElement }) {
  return (
    <div className="bg-gradient-to-b from-indigo-50 to-white border-t border-indigo-100 p-4">
      <h4 className="font-semibold text-gray-800 text-sm mb-3 flex items-center">
        <Plus className="h-4 w-4 mr-2 text-indigo-600" />
        Add Custom Elements
      </h4>
      <p className="text-xs text-gray-600 mb-3">
        Add custom elements that will appear on print but aren't tied to database fields
      </p>
      
      <div className="grid grid-cols-2 gap-2">
        {CUSTOM_ELEMENT_TYPES.map((elementType) => {
          const IconComponent = elementType.icon;
          return (
            <button
              key={elementType.type}
              onClick={() => onAddCustomElement(elementType)}
              className={`
                text-left p-3 border-2 rounded-lg transition-all duration-200 
                transform hover:scale-[1.02] hover:shadow-md
                bg-gradient-to-br ${elementType.color}
              `}
            >
              <div className="flex items-center mb-1">
                <IconComponent className="h-4 w-4 mr-2" />
                <span className="text-xs font-semibold">{elementType.label}</span>
              </div>
              <p className="text-xs text-gray-600">{elementType.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Enhanced Available fields sidebar
function AvailableFieldsList({ allFields, onAddField, onAddCustomElement, filterDepartment, setFilterDepartment }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [activeTab, setActiveTab] = useState('fields');
  
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
      {/* Tab Switcher */}
      <div className="flex border-b bg-white">
        <button
          onClick={() => setActiveTab('fields')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'fields' 
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          <FileText className="h-4 w-4 inline mr-2" />
          Database Fields
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'custom' 
              ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' 
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          <Plus className="h-4 w-4 inline mr-2" />
          Custom Elements
        </button>
      </div>

      {activeTab === 'custom' ? (
        <div className="flex-1 overflow-y-auto">
          <CustomElementsPanel onAddCustomElement={onAddCustomElement} />
        </div>
      ) : (
        <>
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
        </>
      )}
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
  const [editingElement, setEditingElement] = useState(null);
  
  // Drag state
  const [activeId, setActiveId] = useState(null);
  const [overId, setOverId] = useState(null);

  // Configure sensors with better activation constraints
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
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
      isCustom: false,
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

  const addCustomElementToTemplate = (elementType) => {
    const newCell = {
      id: `custom-${Date.now()}-${Math.random()}`,
      isCustom: true,
      customType: elementType.type,
      customValue: elementType.defaultValue,
      customPlaceholder: '',
      field: {
        name: elementType.defaultValue,
        type: elementType.type,
        department: null,
      },
      position: {
        colSpan: elementType.type === 'custom-separator' ? 6 : 
                 elementType.type === 'custom-heading' ? 6 : 
                 elementType.type === 'custom-textarea' ? 3 : 
                 elementType.type === 'custom-signature' ? 2 : 1,
        rowSpan: elementType.type === 'custom-textarea' ? 2 : 
                 elementType.type === 'custom-signature' ? 2 : 1,
        height: elementType.type === 'custom-textarea' ? 'large' : 
                elementType.type === 'custom-signature' ? 'medium' :
                elementType.type === 'custom-heading' ? 'small' : 'auto',
      }
    };
    setTemplateCells([...templateCells, newCell]);
  };

  const updateCustomElement = (cellId, newValue, newPlaceholder) => {
    setTemplateCells(templateCells.map(cell => 
      cell.id === cellId 
        ? { 
            ...cell, 
            customValue: newValue, 
            customPlaceholder: newPlaceholder,
            field: { ...cell.field, name: newValue }
          }
        : cell
    ));
  };

  const handleEditElement = (cellId) => {
    const cell = templateCells.find(c => c.id === cellId);
    if (cell && cell.isCustom) {
      setEditingElement(cell);
    }
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

  // Improved drag handlers
  const handleDragStart = useCallback((event) => {
    setActiveId(event.active.id);
  }, []);

  const handleDragOver = useCallback((event) => {
    const { over } = event;
    setOverId(over?.id || null);
  }, []);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    
    setActiveId(null);
    setOverId(null);

    if (!over || active.id === over.id) {
      return;
    }

    setTemplateCells((items) => {
      const oldIndex = items.findIndex(item => item.id === active.id);
      const newIndex = items.findIndex(item => item.id === over.id);
      
      if (oldIndex === -1 || newIndex === -1) {
        return items;
      }
      
      return arrayMove(items, oldIndex, newIndex);
    });
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setOverId(null);
  }, []);

  // Get the active cell for drag overlay
  const activeCell = activeId ? templateCells.find(c => c.id === activeId) : null;

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
          fieldId: cell.isCustom ? null : cell.fieldId,
          isCustom: cell.isCustom || false,
          customType: cell.customType || null,
          customValue: cell.customValue || null,
          customPlaceholder: cell.customPlaceholder || null,
          position: cell.position,
        })),
        isActive: false,
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
    
    const cells = template.cells.map((cell) => {
      if (cell.isCustom) {
        return {
          id: `custom-${Date.now()}-${Math.random()}`,
          isCustom: true,
          customType: cell.customType,
          customValue: cell.customValue,
          customPlaceholder: cell.customPlaceholder,
          field: {
            name: cell.customValue,
            type: cell.customType,
            department: null,
          },
          position: {
            ...cell.position,
            rowSpan: cell.position.rowSpan || 1,
          },
        };
      } else {
        const field = allFields.find(f => f._id === cell.fieldId);
        return {
          id: `cell-${Date.now()}-${Math.random()}`,
          fieldId: cell.fieldId,
          field: field || { name: 'Unknown Field', type: 'text', department: 'unknown' },
          isCustom: false,
          position: {
            ...cell.position,
            rowSpan: cell.position.rowSpan || 1,
          },
        };
      }
    });
    
    setTemplateCells(cells);
  };

  const setActiveTemplate = async (templateId) => {
    try {
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

  // Count cells by type
  const cellsByDepartment = templateCells.reduce((acc, cell) => {
    if (cell.isCustom) {
      acc['custom'] = (acc['custom'] || 0) + 1;
    } else {
      const dept = cell.field?.department || 'unknown';
      acc[dept] = (acc[dept] || 0) + 1;
    }
    return acc;
  }, {});

  // Preview render function for custom elements
  const renderCustomElementPreview = (cell) => {
    const { customType, customValue, customPlaceholder } = cell;
    
    switch (customType) {
      case 'custom-heading':
        return (
          <div className="bg-gray-100 border border-gray-400 p-2 text-center font-bold text-sm uppercase">
            {customValue}
          </div>
        );
      
      case 'custom-text':
        return (
          <div className="p-2 text-sm">
            {customValue}
          </div>
        );
      
      case 'custom-empty-field':
        return (
          <div className="p-2">
            <div className="text-xs font-medium text-gray-700 mb-1">
              {customValue}
            </div>
            <div className="border-b border-gray-400 min-h-[20px]">
              {customPlaceholder && (
                <span className="text-xs text-gray-400 italic">{customPlaceholder}</span>
              )}
            </div>
          </div>
        );
      
      case 'custom-textarea':
        return (
          <div className="p-2 h-full">
            <div className="text-xs font-medium text-gray-700 mb-1">
              {customValue}
            </div>
            <div className="border border-gray-400 min-h-[40px] h-full">
              {customPlaceholder && (
                <span className="text-xs text-gray-400 italic p-1">{customPlaceholder}</span>
              )}
            </div>
          </div>
        );
      
      case 'custom-separator':
        return (
          <div className="flex items-center justify-center py-2">
            <div className="flex-1 border-t-2 border-gray-400"></div>
          </div>
        );
      
      case 'custom-signature':
        return (
          <div className="p-2 text-center">
            <div className="text-xs font-bold text-gray-800 mb-2 uppercase">
              {customValue}
            </div>
            <div className="border-b border-dotted border-gray-400 min-h-[30px] mb-1"></div>
            <div className="text-xs text-gray-500">SIGNATURE & DATE</div>
          </div>
        );
      
      default:
        return (
          <div className="p-2 text-xs text-gray-500">
            Custom element
          </div>
        );
    }
  };

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
                Create unified print layouts with fields from all departments + custom elements
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
          
          {/* Enhanced Stats */}
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-700">Elements:</span>
            {DEPARTMENTS.map(dept => (
              cellsByDepartment[dept] > 0 && (
                <Badge key={dept} variant="secondary" className="text-xs font-bold">
                  {dept.toUpperCase()}: {cellsByDepartment[dept]}
                </Badge>
              )
            ))}
            {cellsByDepartment['custom'] > 0 && (
              <Badge variant="secondary" className="text-xs font-bold bg-indigo-100 text-indigo-800">
                CUSTOM: {cellsByDepartment['custom']}
              </Badge>
            )}
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
            onAddCustomElement={addCustomElementToTemplate}
            filterDepartment={filterDepartment}
            setFilterDepartment={setFilterDepartment}
          />
        </div>

        {/* Template Canvas */}
        <div className="flex-1 overflow-auto p-6">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  Template Canvas
                  {activeId && (
                    <Badge className="ml-3 bg-blue-500 animate-pulse">
                      <Move className="h-3 w-3 mr-1" />
                      Dragging...
                    </Badge>
                  )}
                </span>
                <div className="text-sm font-normal text-gray-600">
                  {templateCells.length} elements added • Drag to reorder
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
                    Add database fields or custom elements from the left sidebar
                  </p>
                  <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
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
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-indigo-200 rounded"></div>
                      <span>Custom</span>
                    </div>
                  </div>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  onDragCancel={handleDragCancel}
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
                          onEdit={handleEditElement}
                          isCustom={cell.isCustom}
                          customType={cell.customType}
                          customValue={cell.customValue}
                          customPlaceholder={cell.customPlaceholder}
                          isDraggingThis={activeId === cell.id}
                          isOverThis={overId === cell.id && activeId !== cell.id}
                        />
                      ))}
                    </div>
                  </SortableContext>
                  
                  {/* Drag Overlay - shows the dragged item */}
                  <DragOverlay dropAnimation={{
                    duration: 200,
                    easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
                  }}>
                    {activeCell ? <DragOverlayContent cell={activeCell} /> : null}
                  </DragOverlay>
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
                        {template.cells?.length || 0} elements · {template.gridColumns} columns
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

      {/* Edit Modal */}
      {editingElement && (
        <EditCustomElementModal
          element={editingElement}
          onSave={updateCustomElement}
          onClose={() => setEditingElement(null)}
        />
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-8">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Print Preview - All Departments + Custom Elements</h2>
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
                      className="border border-gray-300 rounded"
                      style={{
                        gridColumn: `span ${cell.position.colSpan || 1}`,
                        gridRow: `span ${cell.position.rowSpan || 1}`,
                        minHeight: cell.position.height === 'small' ? '40px' : 
                                   cell.position.height === 'medium' ? '80px' :
                                   cell.position.height === 'large' ? '120px' :
                                   cell.position.height === 'xlarge' ? '200px' : 'auto',
                      }}
                    >
                      {cell.isCustom ? (
                        renderCustomElementPreview(cell)
                      ) : (
                        <div className="p-3">
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
                      )}
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