'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ChevronDown, ChevronRight, Folder, FolderOpen, FileSpreadsheet, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import Image from 'next/image';
import UploadImage from './UploadImage';
import UploadFile from './UploadFile';
import {
  getAssetUrl,
  getAssetLabel,
  normalizeAssetEntries,
} from '@/lib/assetUtils';

export default function DynamicFieldsRenderer({ 
  fields, 
  values, 
  onChange, 
  className = "",
  srdId = null
}) {
  const headingIds = useMemo(
    () => fields.filter(f => f.type === 'heading').map(f => f._id),
    [fields]
  );
  const [expandedSections, setExpandedSections] = useState(null);

  const toggleSection = (headingId) => {
    setExpandedSections(prev => {
      const baseSet = prev ?? new Set(headingIds);
      const newSet = new Set(baseSet);
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
    const headings = fields.filter(f => f.type === 'heading');
    const regularFields = fields.filter(f => f.type !== 'heading');
    
    // First, render orphan fields (fields without parent heading)
    const orphanFields = regularFields.filter(f => !f.parentHeading);
    orphanFields.forEach(field => {
      result.push(
        <div key={`orphan-${field._id}`} className="mb-4">
          {renderField(field)}
        </div>
      );
    });
    
    // Then render headings with their children
    headings.forEach(heading => {
      const childFields = regularFields.filter(f => {
        if (!f.parentHeading) return false;
        
        // Handle populated parentHeading object vs ObjectId
        let parentId;
        if (typeof f.parentHeading === 'object' && f.parentHeading !== null) {
          // parentHeading is populated with the actual heading object
          parentId = f.parentHeading._id;
        } else {
          // parentHeading is just an ObjectId string
          parentId = f.parentHeading;
        }
        
        const headingId = heading._id;
        return parentId && parentId.toString() === headingId.toString();
      });
      
      const activeExpandedSections = expandedSections ?? new Set(headingIds);
      const isExpanded = activeExpandedSections.has(heading._id);
      
      result.push(
        <div key={`section-${heading._id}`} className="mb-6">
          {/* Collapsible Heading */}
          <div 
            className="flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg cursor-pointer hover:from-blue-100 hover:to-indigo-100 transition-colors"
            onClick={() => toggleSection(heading._id)}
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
            <h3 className="text-app-heading font-semibold text-blue-900">
              📁 {heading.name}
            </h3>
            <div className="text-app-text text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
              {childFields.length} field{childFields.length !== 1 ? 's' : ''}
            </div>
          </div>
          
          {/* Collapsible Content */}
          {isExpanded && childFields.length > 0 && (
            <div className="mt-4 pl-6 space-y-4 border-l-4 border-blue-200">
              {childFields.map(field => renderField(field))}
            </div>
          )}
        </div>
      );
    });
    
    return result;
  };

  const renderField = (field) => {
    const value = values[field._id] ?? '';
    
    // Handle file upload
    if (field.type === 'file') {
      const fileAsset = normalizeAssetEntries(value, { kind: 'file' })[0] || null;
      const fileUrl = getAssetUrl(fileAsset);
      const fileLabel = getAssetLabel(fileAsset, 'Attached file');
      return (
        <div key={field._id} className="flex space-y-2 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
          <Label htmlFor={field._id}>
            {field.name}
            {field.isRequired && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <div className="w-full space-y-2">
            {fileUrl && (
              <div className="flex items-center p-2 bg-gray-50 border border-gray-200 rounded">
                <FileSpreadsheet className="h-4 w-4 text-green-600 mr-2 flex-shrink-0" />
                <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate flex-1 block" title={fileLabel}>
                  {fileLabel}
                </a>
                <button
                  type="button"
                  className="h-6 w-6 flex-shrink-0 inline-flex items-center justify-center rounded hover:bg-red-100"
                  onClick={() => onChange(field._id, null)}
                  title="Remove file"
                >
                  <X className="h-3 w-3 text-red-500" />
                </button>
              </div>
            )}
            {srdId && (
              <UploadFile
                srdId={srdId}
                fieldId={field._id}
                onUploaded={(assets) => {
                  const asset = Array.isArray(assets) ? assets[0] : assets;
                  if (asset) {
                    onChange(field._id, asset);
                  }
                }}
              />
            )}
            {!srdId && (
              <div className="rounded-md border border-dashed border-amber-200 bg-amber-50 px-4 py-3 text-app-text text-amber-900">
                Create the SRD first, then upload files.
              </div>
            )}
          </div>
        </div>
      );
    }
    
    // Handle image upload
    if (field.type === 'image') {
      const images = normalizeAssetEntries(value, { kind: 'image' });
      return (
        <div key={field._id} className="flex space-y-2 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
          <Label htmlFor={field._id}>
            {field.name}
            {field.isRequired && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <div className="w-full space-y-2">
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {images.map((asset, idx) => {
                  const imageUrl = getAssetUrl(asset);
                  if (!imageUrl) return null;
                  return (
                    <div key={idx} className="relative group rounded overflow-hidden border border-gray-200">
                      <Image
                        src={imageUrl}
                        alt={`${field.name}-${idx}`}
                        width={120}
                        height={120}
                        className="object-cover w-28 h-28"
                        unoptimized
                      />
                      <button
                        type="button"
                        className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 hover:bg-red-600 text-white inline-flex items-center justify-center"
                        onClick={() => {
                          const updated = images.filter((_, i) => i !== idx);
                          onChange(field._id, updated);
                        }}
                        title="Remove image"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            {srdId && (
              <UploadImage
                srdId={srdId}
                fieldId={field._id}
                compact
                onUploaded={(assets) => {
                  const imageArray = Array.isArray(assets) ? assets : [assets].filter(Boolean);
                  if (imageArray.length > 0) {
                    onChange(field._id, [...images, ...imageArray]);
                  }
                }}
              />
            )}
            {!srdId && (
              <div className="rounded-md border border-dashed border-amber-200 bg-amber-50 px-4 py-3 text-app-text text-amber-900">
                Create the SRD first, then upload images.
              </div>
            )}
          </div>
        </div>
      );
    }
    
    // Other field types
    return (
      <div key={field._id} className="flex space-y-2 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
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
            <Label htmlFor={field._id} className="text-app-text text-gray-700 cursor-pointer">
              {field.placeholder || 'Yes/No'}
            </Label>
          </div>
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
          <div className="text-app-text text-gray-500 mt-1">
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
          <h3 className="mt-2 text-app-text font-medium text-gray-900">No fields defined</h3>
          <p className="mt-1 text-app-text text-gray-500">
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

