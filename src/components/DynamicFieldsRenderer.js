'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';

export default function DynamicFieldsRenderer({ 
  fields, 
  values, 
  onChange, 
  className = "" 
}) {
  // Group fields by headings and maintain order
  const renderFields = () => {
    const result = [];
    let currentGroup = [];
    
    fields.forEach((field, index) => {
      if (field.type === 'heading') {
        // Render previous group if exists
        if (currentGroup.length > 0) {
          result.push(
            <div key={`group-${index}`} className="space-y-4">
              {currentGroup}
            </div>
          );
          currentGroup = [];
        }
        
        // Add heading
        result.push(
          <div key={field._id} className="pt-6 first:pt-0">
            <div className="flex items-center space-x-4 mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{field.name}</h3>
              <Separator className="flex-1" />
            </div>
          </div>
        );
      } else {
        // Add regular field to current group
        currentGroup.push(renderField(field));
      }
    });
    
    // Add remaining fields
    if (currentGroup.length > 0) {
      result.push(
        <div key="final-group" className="space-y-4">
          {currentGroup}
        </div>
      );
    }
    
    return result;
  };

  const renderField = (field) => {
    const value = values[field._id] ?? '';
    
    return (
      <div key={field._id} className="space-y-2">
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
          <div className="flex items-center space-x-2">
            <input
              id={field._id}
              type="checkbox"
              checked={!!value}
              onChange={(e) => onChange(field._id, e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <Label htmlFor={field._id} className="text-sm text-gray-700">
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
      </div>
    );
  };

  return (
    <div className={className}>
      {fields.length === 0 ? (
        <div className="text-gray-600 text-center py-8">
          No fields defined for this department. Contact admin to add fields.
        </div>
      ) : (
        <div className="space-y-6">
          {renderFields()}
        </div>
      )}
    </div>
  );
}