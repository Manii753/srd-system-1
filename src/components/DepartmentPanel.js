'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, X, ChevronLeft, ChevronRight, Trash2, Star, Edit, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import UploadImage from './UploadImage';
import UploadFile from './UploadFile';
import { useToast } from '@/lib/use-toast';
import {
  getAssetKey,
  getAssetLabel,
  getAssetUrl,
  normalizeAssetEntries,
} from '@/lib/assetUtils';

export default function DepartmentPanel({
  srd,
  department,
  onUpdate,
  canEdit
}) {
  const { toast } = useToast();
  const [status, setStatus] = useState(srd.status?.[department] || 'pending');
  const [fields, setFields] = useState(srd.dynamicFields?.filter(f => f.department === department) || []);
  const [fieldDefs, setFieldDefs] = useState([]);
  const [editingFields, setEditingFields] = useState(new Set());
  const [updateComment, setUpdateComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageModalIndex, setImageModalIndex] = useState(0);
  const [modalImages, setModalImages] = useState([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Auto-save functionality
  const autoSaveTimeoutRef = useRef(null);
  const lastSavedFieldsRef = useRef(JSON.stringify(fields));

  // Auto-save function with debouncing
  const debouncedAutoSave = useCallback(async (fieldsToSave) => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(async () => {
      const currentFieldsString = JSON.stringify(fieldsToSave);

      // Only save if fields have actually changed
      if (currentFieldsString !== lastSavedFieldsRef.current && !isSubmitting) {
        try {
          setIsSubmitting(true);

          const updateData = {
            status: status,
            fields: fieldsToSave,
          };



          await onUpdate(updateData);

          // Update the last saved reference
          lastSavedFieldsRef.current = currentFieldsString;
          setHasUnsavedChanges(false);

          // Show subtle success indication
          toast({
            title: 'Auto-saved',
            description: 'Changes saved automatically',
            duration: 2000,
          });

        } catch (error) {
          console.error('[Auto-save] Failed:', error);
          toast({
            title: 'Auto-save failed',
            description: 'Please try saving manually',
            variant: 'destructive',
            duration: 3000,
          });
        } finally {
          setIsSubmitting(false);
        }
      }
    }, 1500); // 1.5 second delay
  }, [status, onUpdate, isSubmitting, toast]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Auto-save when fields change
  useEffect(() => {
    const currentFieldsString = JSON.stringify(fields);
    if (currentFieldsString !== lastSavedFieldsRef.current) {
      setHasUnsavedChanges(true);
      debouncedAutoSave(fields);
    }
  }, [fields, debouncedAutoSave]);
  useEffect(() => {
    // Sync status from SRD
    setStatus(srd.status?.[department] || 'pending');

    // Get fields for this department
    const srdDynamicFields = srd.dynamicFields?.filter(f => f.department === department) || [];

    if (srdDynamicFields.length > 0) {
      // Use the immutable snapshots from the SRD to build field definitions
      const fieldDefsFromSRD = srdDynamicFields.map(f => {
        // Robust ID extraction
        const fieldId = f.originalFieldId ||
          (f.field && typeof f.field === 'object' ? f.field._id : f.field) ||
          f._id;

        return {
          _id: fieldId,
          name: f.name,
          type: f.type,
          placeholder: f.placeholder || '',
          isRequired: f.isRequired || false,
          order: f.order || 0,
          parentHeading: f.parentHeading,
          active: true,
          // Connection properties
          isConnectedTo: f.isConnectedTo || false,
          connectedFieldId: f.connectedFieldId || null,
          connectionType: f.connectionType || null
        };
      });

      setFieldDefs(fieldDefsFromSRD);
      setFields(srdDynamicFields);

      // Update the reference for auto-save comparison
      lastSavedFieldsRef.current = JSON.stringify(srdDynamicFields);
    } else {
      // Fallback for new SRDs or departments without fields yet
      async function fetchFields() {
        try {
          const res = await fetch(`/api/newField?department=${department}`);
          const data = await res.json();
          const activeFields = Array.isArray(data) ? data.filter(f => f.active) : [];
          setFieldDefs(activeFields);

          // Initialize fields from definitions
          const newFields = activeFields.map(fieldDef => ({
            name: fieldDef.name,
            value: fieldDef.type === 'boolean' ? false : '',
            department: department,
            type: fieldDef.type, // Preserve type for consistency
            isRequired: fieldDef.isRequired,
            placeholder: fieldDef.placeholder,
            order: fieldDef.order,
            parentHeading: fieldDef.parentHeading?.name || fieldDef.parentHeading
          }));

          setFields(newFields);

          // Update the reference for auto-save comparison
          lastSavedFieldsRef.current = JSON.stringify(newFields);
        } catch (err) {
          console.error('Failed to fetch fields', err);
        }
      }
      fetchFields();
    }
  }, [department, srd]);

  const handleFieldChange = (name, value, fieldDef = null) => {
    if (!editingFields.has(name)) {
      setEditingFields(prev => new Set(prev).add(name));
    }

    setFields(prev => {
      let newFields = [...prev];
      const existingFieldIndex = newFields.findIndex(f => f.name === name);

      if (existingFieldIndex > -1) {
        newFields[existingFieldIndex] = { ...newFields[existingFieldIndex], value };
      } else {
        newFields = [...newFields, { name, value, department }];
      }

      // Handle auto-true connection: when this field becomes true, update connected field
      if (fieldDef && fieldDef.isConnectedTo && fieldDef.connectionType === 'auto-true' && value === true) {
        const connectedFieldId = fieldDef.connectedFieldId;
        if (connectedFieldId) {
          // Find the connected field in all SRD dynamic fields
          const connectedSrdField = srd.dynamicFields?.find(f => {
            const fId = f.originalFieldId || (f.field && typeof f.field === 'object' ? f.field._id : f.field) || f._id;
            return fId?.toString() === connectedFieldId?.toString();
          });

          if (connectedSrdField) {
            // Check if connected field is in this department
            const connectedInThisDept = newFields.findIndex(f => f.name === connectedSrdField.name);
            if (connectedInThisDept > -1) {
              newFields[connectedInThisDept] = { ...newFields[connectedInThisDept], value: true };
            }
          }
        }
      }

      return newFields;
    });

    // Mark as having unsaved changes
    setHasUnsavedChanges(true);
  };

  const toggleEditMode = (fieldName) => {
    setEditingFields(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fieldName)) {
        newSet.delete(fieldName);
      } else {
        newSet.add(fieldName);
      }
      return newSet;
    });
  };

  const hasFieldValue = (fieldName) => {
    const field = fields.find(f => f.name === fieldName);
    if (!field) return false;
    if (typeof field.value === 'boolean') return true;
    if (Array.isArray(field.value)) return field.value.length > 0;
    return field.value && field.value.toString().trim() !== '';
  };

  const handleRemoveImage = (fieldName, imageIndex, allImages) => {
    const imageToRemove = allImages[imageIndex];
    const fieldValue = fields.find(f => f.name === fieldName)?.value ?? '';
    const deptImages = normalizeAssetEntries(fieldValue, { kind: 'image' });
    const imageKey = getAssetKey(imageToRemove);
    const updatedImages = deptImages.filter((asset) => getAssetKey(asset) !== imageKey);

    if (updatedImages.length !== deptImages.length) {
      handleFieldChange(fieldName, updatedImages);
      toast({
        title: 'Image removed',
        description: 'Changes will be saved automatically',
      });
    } else {
      toast({
        title: 'Cannot remove',
        description: 'The selected image could not be found in this field.',
        variant: 'destructive',
      });
    }
  };

  const handleSetCoverImage = (fieldName, imageIndex, allImages) => {
    const coverImage = allImages[imageIndex];
    const fieldValue = fields.find(f => f.name === fieldName)?.value ?? '';
    const deptImages = normalizeAssetEntries(fieldValue, { kind: 'image' });
    const coverKey = getAssetKey(coverImage);
    const otherImages = deptImages.filter((asset) => getAssetKey(asset) !== coverKey);
    const reorderedImages = [coverImage, ...otherImages];
    handleFieldChange(fieldName, reorderedImages);
    toast({
      title: 'Cover image set',
      description: 'Changes will be saved automatically',
    });
  };

  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
  };

  const handleSaveChanges = async () => {
    if (status === 'flagged' && !updateComment.trim()) {
      toast({
        title: 'Comment required',
        description: 'Please describe what is the issue',
        variant: 'destructive',
      });
      return;
    }
    const commentToSave = updateComment.trim() || null;
    await handleUpdate(status, commentToSave);
    setUpdateComment('');
  };

  const handleUpdate = async (newStatus, comment = null) => {
    setIsSubmitting(true);
    const updateData = {
      status: newStatus,
      fields: fields,
    };
    if (comment) {
      updateData.comment = {
        author: srd.createdBy?.name || 'Unknown',
        role: srd.createdBy?.role || 'user',
        text: comment,
      };
    }
    try {
      await onUpdate(updateData);
      setEditingFields(new Set());
    } catch (error) {
      console.error('Update failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if a field should be hidden based on toggle-active connection
  const isFieldHidden = (field) => {
    if (!field.isConnectedTo || field.connectionType !== 'toggle-active') {
      return false;
    }

    const connectedFieldId = field.connectedFieldId;
    if (!connectedFieldId) return false;

    // Find the connected field value in all SRD dynamic fields
    const connectedSrdField = srd.dynamicFields?.find(f => {
      const fId = f.originalFieldId || (f.field && typeof f.field === 'object' ? f.field._id : f.field) || f._id;
      return fId?.toString() === connectedFieldId?.toString();
    });

    // If connected field is true, hide this field
    return connectedSrdField?.value === true;
  };

  const renderDynamicFields = () => {
    if (!fieldDefs.length)
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No fields defined for this department.</AlertDescription>
        </Alert>
      );

    // Group fields by headings
    const headings = fieldDefs.filter(f => f.type === 'heading');
    const regularFields = fieldDefs.filter(f => f.type !== 'heading');
    const result = [];

    // Track which fields are assigned to a heading
    const assignedFieldIds = new Set();

    // Render headings with their children
    headings.forEach(heading => {
      const childFields = regularFields.filter(f => {
        if (!f.parentHeading) return false;

        // Handle populated parentHeading object vs ObjectId vs Name
        let parentIdentifier = f.parentHeading;
        if (typeof f.parentHeading === 'object' && f.parentHeading !== null) {
          parentIdentifier = f.parentHeading._id || f.parentHeading.name;
        }

        // Match by ID
        if (heading._id && parentIdentifier && parentIdentifier.toString() === heading._id.toString()) {
          return true;
        }

        // Match by Name
        if (heading.name && parentIdentifier === heading.name) {
          return true;
        }

        return false;
      });

      if (childFields.length > 0) {
        childFields.forEach(f => assignedFieldIds.add(f._id));

        result.push(
          <div key={`section-${heading._id}`} className="mb-8">
            {/* Section Heading */}
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-gray-700 border-b-2 border-blue-200 pb-2 mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-2 rounded-lg">
                📁 {heading.name}
              </h3>
            </div>

            {/* Section Fields */}
            <div className="pl-4 border-l-4 border-blue-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {childFields.map(field => renderField(field))}
              </div>
            </div>
          </div>
        );
      }
    });

    // Render orphan fields (fields not assigned to any heading)
    const orphanFields = regularFields.filter(f => !assignedFieldIds.has(f._id));

    if (orphanFields.length > 0) {
      result.unshift(
        <div key="orphan-fields" className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {orphanFields.map(field => renderField(field))}
          </div>
        </div>
      );
    }

    return <div className="space-y-6">{result}</div>;
  };

  const renderField = (field) => {
    // Check if field should be hidden due to toggle-active connection
    if (isFieldHidden(field)) {
      return null;
    }

    const { _id, name, type, placeholder, isRequired } = field;
    const fieldValue = fields.find(f => f.name === name)?.value ?? '';

    switch (type) {
      case 'text':
      case 'number':
      case 'date':
        const hasValue = hasFieldValue(name);
        const isEditing = editingFields.has(name);
        return (
          <div key={name}>
            <Label htmlFor={name}>{name}</Label>
            <div className="relative mt-1">
              {hasValue && !isEditing ? (
                <div className="relative">
                  <div className="mt-1 p-3 bg-gray-50 border rounded-md min-h-[40px] flex items-center pr-10">
                    <span className="text-sm font-medium text-gray-900">
                      {type === 'date' && fieldValue ? new Date(fieldValue).toLocaleDateString() : fieldValue}
                    </span>
                  </div>
                  {canEdit && (
                    <Button variant="ghost" size="icon" onClick={() => toggleEditMode(name)} className="absolute top-1/2 right-1 -translate-y-1/2 h-8 w-8">
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <Input
                    id={name} type={type} placeholder={placeholder || ''} value={fieldValue}
                    onChange={(e) => handleFieldChange(name, e.target.value)}
                    required={isRequired} disabled={!canEdit} className="mt-1 pr-10"
                  />
                  {isEditing && canEdit && (
                    <Button variant="ghost" size="icon" onClick={() => toggleEditMode(name)} className="absolute top-1/2 right-1 -translate-y-1/2 h-8 w-8">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        );

      case 'textarea':
        const hasTextValue = hasFieldValue(name);
        const isTextEditing = editingFields.has(name);
        return (
          <div key={_id}>
            <Label htmlFor={name}>{name}</Label>
            <div className="relative mt-1">
              {hasTextValue && !isTextEditing ? (
                <div className="relative">
                  <div className="mt-1 p-3 bg-gray-50 border rounded-md min-h-[80px] pr-10">
                    <span className="text-sm text-gray-900 whitespace-pre-wrap">{fieldValue}</span>
                  </div>
                  {canEdit && (
                    <Button variant="ghost" size="icon" onClick={() => toggleEditMode(name)} className="absolute top-2 right-1 h-8 w-8">
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <Textarea
                    id={name} placeholder={placeholder || ''} value={fieldValue}
                    onChange={(e) => handleFieldChange(name, e.target.value)}
                    required={isRequired} disabled={!canEdit} className="mt-1 pr-10"
                  />
                  {isTextEditing && canEdit && (
                    <Button variant="ghost" size="icon" onClick={() => toggleEditMode(name)} className="absolute top-2 right-1 h-8 w-8">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        );


      case 'boolean':
        const hasBoolValue = hasFieldValue(name);
        const isBoolEditing = editingFields.has(name);
        return (
          <div key={_id} className="flex flex-col">
            <Label htmlFor={name} className="mb-2">{name}</Label>
            <div className="flex items-center justify-between">
              {hasBoolValue && !isBoolEditing ? (
                <div className="flex items-center gap-2">
                  <div className="px-3 py-2 bg-gray-50 border rounded-md">
                    <span className={`text-sm font-medium ${fieldValue ? 'text-green-700' : 'text-gray-600'}`}>{fieldValue ? 'Yes' : 'No'}</span>
                  </div>
                  {canEdit && (
                    <Button variant="ghost" size="icon" onClick={() => toggleEditMode(name)} className="h-8 w-8">
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Switch id={name} checked={!!fieldValue} onCheckedChange={(checked) => handleFieldChange(name, checked, field)} disabled={!canEdit} />
                  {isBoolEditing && canEdit && (
                    <Button variant="ghost" size="icon" onClick={() => toggleEditMode(name)} className="h-8 w-8">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        );

      case 'file':
        const fileAsset = normalizeAssetEntries(fieldValue, { kind: 'file' })[0] || null;
        const fileUrl = getAssetUrl(fileAsset);
        const fileLabel = getAssetLabel(fileAsset, 'Attached Excel');
        return (
          <div key={_id} className="md:col-span-3">
            <Label>{name}</Label>
            {canEdit && (
              <div className="mt-2">
                <UploadFile
                  srdId={srd?._id}
                  fieldId={_id}
                  onUploaded={(assets) => {
                    const asset = Array.isArray(assets) ? assets[0] : assets;
                    if (asset) {
                      handleFieldChange(name, asset);
                      toast({
                        title: 'File uploaded',
                        description: 'File uploaded successfully. Changes will be saved automatically.',
                      });
                    }
                  }}
                />
              </div>
            )}
            {fileUrl ? (
              <div className="mt-2 flex items-center gap-2 rounded-md border bg-gray-50 p-3 text-sm">
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="truncate text-blue-600 hover:underline" title={fileLabel}>
                  {fileLabel}
                </a>
                {canEdit && (
                  <Button variant="ghost" size="icon" onClick={() => handleFieldChange(name, null)} className="ml-auto h-8 w-8">
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic mt-1">No file uploaded yet.</p>
            )}
          </div>
        );

      case 'image':
        const deptImages = normalizeAssetEntries(fieldValue, { kind: 'image' });
        const allImages = deptImages;
        return (
          <div key={_id} className="md:col-span-3">
            <Label>{name}</Label>
            {canEdit && (
              <div className="mt-2">
                <UploadImage
                  srdId={srd?._id}
                  fieldId={_id}
                  onUploaded={(assets) => {
                    const imageArray = normalizeAssetEntries(assets, { kind: 'image' });
                    if (imageArray.length > 0) {
                      const currentImages = normalizeAssetEntries(fieldValue, { kind: 'image' });
                      const updatedImages = [...currentImages, ...imageArray];
                      handleFieldChange(name, updatedImages);
                      toast({
                        title: 'Images uploaded',
                        description: `${imageArray.length} image(s) uploaded. Changes will be saved automatically.`,
                      });
                    }
                  }}
                />
              </div>
            )}
            {allImages.length > 0 ? (
              <div className="grid grid-cols-4 md:grid-cols-6 gap-2 mt-2">
                {allImages.map((asset, idx) => {
                  const isCover = idx === 0;
                  const imageUrl = getAssetUrl(asset);
                  return (
                    <div key={idx} className="relative group aspect-square">
                      <div className="cursor-pointer w-full h-full" onClick={() => { setImageModalIndex(idx); setModalImages(allImages.map((entry) => getAssetUrl(entry))); setIsImageModalOpen(true); }}>
                        <Image src={imageUrl} alt={`${name}-${idx}`} fill className={cn("object-cover rounded border transition-all", isCover ? "border-yellow-400 border-2" : "border-gray-200 hover:border-blue-400")} />
                        {isCover && (
                          <div className="absolute top-1 left-1 bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded text-xs font-semibold flex items-center gap-1">
                            <Star className="h-3 w-3 fill-current" />Cover
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs transition rounded">
                          <span className="bg-black/60 px-2 py-1 rounded">View</span>
                        </div>
                      </div>
                      {canEdit && (
                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          {!isCover && (
                            <button onClick={(e) => { e.stopPropagation(); handleSetCoverImage(name, idx, allImages); }} className="bg-yellow-500 hover:bg-yellow-600 text-white p-1 rounded shadow-lg" title="Set as cover">
                              <Star className="h-3 w-3" />
                            </button>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); handleRemoveImage(name, idx, allImages); }} className="bg-red-500 hover:bg-red-600 text-white p-1 rounded shadow-lg" title="Remove image">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic mt-1">No images uploaded yet.</p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{department.toUpperCase()} Department</CardTitle>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">Status:</span>
          <Badge className={cn(status === 'approved' && 'bg-green-100 text-green-800', status === 'in-progress' && 'bg-blue-100 text-blue-800', status === 'flagged' && 'bg-red-100 text-red-800', status === 'pending' && 'bg-gray-100 text-gray-800')}>
            {status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {renderDynamicFields()}
        {canEdit && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-700">Update Status</h4>
              {hasUnsavedChanges && (
                <div className="flex items-center text-xs text-amber-600">
                  <div className="animate-pulse w-2 h-2 bg-amber-400 rounded-full mr-2"></div>
                  Auto-saving...
                </div>
              )}
            </div>
            <div className="space-y-3">
              <select value={status} onChange={(e) => handleStatusChange(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full" disabled={isSubmitting}>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="approved">Approved</option>
                <option value="flagged">Flag Issue</option>
              </select>
              <div>
                <Label htmlFor="updateComment">Comment{' '}{status !== 'flagged' && (<span className="text-xs text-gray-500">(Optional)</span>)}</Label>
                <Textarea id="updateComment" value={updateComment} onChange={(e) => setUpdateComment(e.target.value)} placeholder={status === 'flagged' ? 'Describe the issue... (Required)' : 'Add a comment...'} required={status === 'flagged'} className="min-h-[100px] mt-1" />
              </div>
              <Button onClick={handleSaveChanges} disabled={isSubmitting} className="px-4 py-2 w-full">
                {isSubmitting ? 'Updating Status...' : 'Update Status & Comment'}
              </Button>
              <p className="text-xs text-gray-500 text-center">
                Field changes are saved automatically. Use this button only to update status or add comments.
              </p>
            </div>
          </div>
        )}
      </CardContent>
      {isImageModalOpen && modalImages.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90" onClick={() => setIsImageModalOpen(false)}>
          <button onClick={() => setIsImageModalOpen(false)} className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10">
            <X className="h-8 w-8" />
          </button>
          <div className="relative max-w-5xl max-h-[90vh] w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="relative w-full h-[80vh] flex items-center justify-center">
              <Image src={modalImages[imageModalIndex]} alt={`Image ${imageModalIndex + 1}`} fill className="object-contain" sizes="(max-width: 1280px) 100vw, 1280px" />
            </div>
            {modalImages.length > 1 && (
              <>
                <button onClick={() => setImageModalIndex(Math.max(0, imageModalIndex - 1))} disabled={imageModalIndex === 0} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 disabled:opacity-30 disabled:cursor-not-allowed rounded-full p-2 transition-all">
                  <ChevronLeft className="h-6 w-6 text-gray-800" />
                </button>
                <button onClick={() => setImageModalIndex(Math.min(modalImages.length - 1, imageModalIndex + 1))} disabled={imageModalIndex === modalImages.length - 1} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 disabled:opacity-30 disabled:cursor-not-allowed rounded-full p-2 transition-all">
                  <ChevronRight className="h-6 w-6 text-gray-800" />
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-60 text-white px-4 py-2 rounded-full text-sm">
                  {imageModalIndex + 1} / {modalImages.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

