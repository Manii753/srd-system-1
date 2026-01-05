'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ChevronDown, ChevronRight, Folder, FolderOpen } from 'lucide-react';
import { useState } from 'react';

export default function DynamicFieldsRenderer({ 
  fields, 
  values, 
  onChange, 
  className = "" 
}) {
  const [expandedSections, setExpandedSections] = useState(new Set());

  // Auto-expand all sections on first render
  useState(() => {
    const headingIds = fields.filter(f => f.type === 'heading').map(f => f._id);
    setExpandedSections(new Set(headingIds));
  });

  const toggleSection = (headingId) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(headingId)) {
        newSet.delete(headingId);
      } else {
        newSet.add(headingId);
      }
      return newSet;
    });
  };

  // Group fields by headings and maintain order
  const renderFields = () => {
    const result = [];
    let currentGroup = [];
    let currentHeading = null;
    
    fields.forEach((field) => {
      if (field.type === 'heading') {
        // Render previous group if exists
        if (currentGroup.length > 0 && currentHeading) {
          const isExpanded = expandedSections.has(currentHeading._id);
          result.push(
            <div key={`section-${currentHeading._id}`} className="mb-6">
              {/* Collapsible Heading */}
              <div 
                className="flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg cursor-pointer hover:from-blue-100 hover:to-indigo-100 transition-colors"
                onClick={() => toggleSection(currentHeading._id)}
              >
                <div className="text-blue-600">
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                </div>
                <div className="text-blue-600">
                  {isExpanded ? (
                    <FolderOpen className="h-6 w-6" />
                  ) : (
                    <Folder className="h-6 w-6" />
                  )}
                </div>
                <h3 className="text-lg font-semibold text-blue-900">
                  📁 {currentHeading.name}
                </h3>
                <div className="text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                  {currentGroup.length} field{currentGroup.length !== 1 ? 's' : ''}
                </div>
              </div>
              
              {/* Collapsible Content */}
              {isExpanded && (
                <div className="mt-4 pl-6 space-y-4 border-l-4 border-blue-200">
                  {currentGroup}
                </div>
              )}
            </div>
          );
          currentGroup = [];
        }
        
        // Set new heading
        currentHeading = field;
      } else {
        // Check if this field belongs to the current heading or is an orphan
        const fieldParentId = field.parentHeading ? 
          (typeof field.parentHeading === 'object' ? field.parentHeading._id || field.parentHeading : field.parentHeading) 
          : null;
        
        if (currentHeading && fieldParentId && fieldParentId.toString() === currentHeading._id.toString()) {
          // Field belongs to current heading
          currentGroup.push(renderField(field));
        } else if (!fieldParentId) {
          // Orphan field (no parent heading)
          if (currentGroup.length > 0 && currentHeading) {
            // Render previous group first
            const isExpanded = expandedSections.has(currentHeading._id);
            result.push(
              <div key={`section-${currentHeading._id}`} className="mb-6">
                <div 
                  className="flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg cursor-pointer hover:from-blue-100 hover:to-indigo-100 transition-colors"
                  onClick={() => toggleSection(currentHeading._id)}
                >
                  <div className="text-blue-600">
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5" />
                    ) : (
                      <ChevronRight className="h-5 w-5" />
                    )}
                  </div>
                  <div className="text-blue-600">
                    {isExpanded ? (
                      <FolderOpen className="h-6 w-6" />
                    ) : (
                      <Folder className="h-6 w-6" />
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-blue-900">
                    📁 {currentHeading.name}
                  </h3>
                  <div className="text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                    {currentGroup.length} field{currentGroup.length !== 1 ? 's' : ''}
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="mt-4 pl-6 space-y-4 border-l-4 border-blue-200">
                    {currentGroup}
                  </div>
                )}
              </div>
            );
            currentGroup = [];
            currentHeading = null;
          }
          
          // Add orphan field directly to result
          result.push(
            <div key={`orphan-${field._id}`} className="mb-4">
              {renderField(field)}
            </div>
          );
        }
      }
    });
    
    // Add remaining fields
    if (currentGroup.length > 0 && currentHeading) {
      const isExpanded = expandedSections.has(currentHeading._id);
      result.push(
        <div key={`section-${currentHeading._id}`} className="mb-6">
          <div 
            className="flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg cursor-pointer hover:from-blue-100 hover:to-indigo-100 transition-colors"
            onClick={() => toggleSection(currentHeading._id)}
          >
            <div className="text-blue-600">
              {isExpanded ? (
                <ChevronDown className="h-5 w-5" />
              ) : (
                <ChevronRight className="h-5 w-5" />
              )}
            </div>
            <div className="text-blue-600">
              {isExpanded ? (
                <FolderOpen className="h-6 w-6" />
              ) : (
                <Folder className="h-6 w-6" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-blue-900">
              📁 {currentHeading.name}
            </h3>
            <div className="text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
              {currentGroup.length} field{currentGroup.length !== 1 ? 's' : ''}
            </div>
          </div>
          
          {isExpanded && (
            <div className="mt-4 pl-6 space-y-4 border-l-4 border-blue-200">
              {currentGroup}
            </div>
          )}
        </div>
      );
    }
    
    return result;
  };

  const renderField = (field) => {
    const value = values[field._id] ?? '';
    
    return (
      <div key={field._id} className="space-y-2 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
        <Label htmlFor={field._id}>
          {field.name}
          {field.isRequired && <span className="text-red-500 ml-1">*</span>}
        </Label>
        
        {field.type === 'textarea' ? (
          <Textarea
            id={field._id}
            value={value}
            onChange={(e) => onChange(field._id, e.target.value)}
            placeholder={field.placeholder || ''}
            required={field.isRequired}
            className="min-h-[100px]"
          />
        ) : field.type === 'number' ? (
          <Input
            id={field._id}
            type="number"
            value={value}
            onChange={(e) => onChange(field._id, e.target.value)}
            placeholder={field.placeholder || ''}
            required={field.isRequired}
          />
        ) : field.type === 'date' ? (
          <Input
            id={field._id}
            type="date"
            value={value}
            onChange={(e) => onChange(field._id, e.target.value)}
            required={field.isRequired}
          />
        ) : field.type === 'boolean' ? (
          <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md">
            <input
              id={field._id}
              type="checkbox"
              checked={!!value}
              onChange={(e) => onChange(field._id, e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <Label htmlFor={field._id} className="text-sm text-gray-700 cursor-pointer">
              {field.placeholder || 'Yes/No'}
            </Label>
          </div>
        ) : field.type === 'file' ? (
          <Input
            id={field._id}
            type="file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                // Handle file upload here
                onChange(field._id, file.name);
              }
            }}
            required={field.isRequired}
            className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        ) : field.type === 'image' ? (
          <Input
            id={field._id}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                // Handle image upload here
                onChange(field._id, file.name);
              }
            }}
            required={field.isRequired}
            className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
          />
        ) : (
          <Input
            id={field._id}
            type="text"
            value={value}
            onChange={(e) => onChange(field._id, e.target.value)}
            placeholder={field.placeholder || ''}
            required={field.isRequired}
          />
        )}
        
        {field.placeholder && field.type !== 'boolean' && (
          <div className="text-xs text-gray-500 mt-1">
            {field.placeholder}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={className}>
      {fields.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Folder className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No fields defined</h3>
          <p className="mt-1 text-sm text-gray-500">
            Contact admin to add fields for this department.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {renderFields()}
        </div>
      )}
    </div>
  );
}