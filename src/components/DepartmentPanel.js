'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, X, ChevronLeft, ChevronRight, Trash2, Star, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import UploadImage from './UploadImage';
import { useToast } from '@/lib/use-toast';

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

  const [showFlagDialog, setShowFlagDialog] = useState(false);
  const [flagComment, setFlagComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageModalIndex, setImageModalIndex] = useState(0);
  const [modalImages, setModalImages] = useState([]);

  useEffect(() => {
    async function fetchFields() {
      try {
        const res = await fetch(`/api/newField?department=${department}`);
        const data = await res.json();
        const activeFields = Array.isArray(data) ? data.filter(f => f.active) : [];
        setFieldDefs(activeFields);

        // Initialize fields if they don't exist
        const existingFieldNames = fields.map(f => f.name);
        const newFields = [...fields];

        activeFields.forEach(fieldDef => {
          if (!existingFieldNames.includes(fieldDef.name)) {
            newFields.push({
              name: fieldDef.name,
              value: fieldDef.type === 'boolean' ? false : '',
              department: department
            });
          }
        });

        if (newFields.length > fields.length) {
          setFields(newFields);
        }
      } catch (err) {
        console.error('Failed to fetch fields', err);
      }
    }
    fetchFields();
  }, [department]);

  // Update status and fields when SRD changes
  useEffect(() => {
    setStatus(srd.status?.[department] || 'pending');
    const deptFields = srd.dynamicFields?.filter(f => f.department === department) || [];
    setFields(deptFields);
  }, [srd, department]);

  const handleFieldChange = (name, value) => {
    console.log('[DepartmentPanel] Field changed:', name, value);
    setFields(prev => {
      const existingFieldIndex = prev.findIndex(f => f.name === name);
      if (existingFieldIndex > -1) {
        const newFields = [...prev];
        newFields[existingFieldIndex] = { ...newFields[existingFieldIndex], value };
        return newFields;
      } else {
        return [...prev, { name, value, department }];
      }
    });
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
    const deptImages = Array.isArray(fieldValue) ? fieldValue : (fieldValue ? [fieldValue] : []);
    
    // Only remove if it's in department images (not global)
    if (deptImages.includes(imageToRemove)) {
      const updatedImages = deptImages.filter(img => img !== imageToRemove);
      handleFieldChange(fieldName, updatedImages);
      
      toast({
        title: 'Image removed',
        description: 'Click "Save Changes" to confirm removal.',
      });
    } else {
      toast({
        title: 'Cannot remove',
        description: 'This is a global image. Only department images can be removed.',
        variant: 'destructive',
      });
    }
  };

  const handleSetCoverImage = (fieldName, imageIndex, allImages) => {
    const coverImage = allImages[imageIndex];
    const fieldValue = fields.find(f => f.name === fieldName)?.value ?? '';
    const deptImages = Array.isArray(fieldValue) ? fieldValue : (fieldValue ? [fieldValue] : []);
    
    // Reorder so cover image is first
    const otherImages = deptImages.filter(img => img !== coverImage);
    const reorderedImages = [coverImage, ...otherImages];
    
    handleFieldChange(fieldName, reorderedImages);
    
    toast({
      title: 'Cover image set',
      description: 'Click "Save Changes" to confirm.',
    });
  };

  const handleStatusChange = (newStatus) => {
    if (newStatus === 'flagged') {
      setShowFlagDialog(true);
    } else {
      setStatus(newStatus);
      handleUpdate(newStatus);
    }
  };

  const handleFlagSubmit = () => {
    if (!flagComment.trim()) return;

    setStatus('flagged');
    handleUpdate('flagged', flagComment);
    setShowFlagDialog(false);
    setFlagComment('');
  };

  // 🔹 FIXED: Now sends proper object structure
  const handleUpdate = async (newStatus, comment = null) => {
    setIsSubmitting(true);

    const updateData = {
      status: newStatus,  // Send status as string
      fields: fields,     // Send fields array
    };

    if (comment) {
      updateData.comment = {
        author: srd.createdBy?.name || 'Unknown',
        role: srd.createdBy?.role || 'user',
        text: comment,
      };
    }

    console.log('[Frontend] Sending update data:', department, updateData);

    try {
      await onUpdate(updateData);  // 🔹 FIXED: Only pass updateData, not department
    } catch (error) {
      console.error('Update failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderDynamicFields = () => {
    if (!fieldDefs.length)
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No fields defined for this department.
          </AlertDescription>
        </Alert>
      );

    return (
      <div className="space-y-6">
        {fieldDefs.map((field) => {
          const { _id, name, type, placeholder, isRequired } = field;
          const fieldValue = fields.find(f => f.name === name)?.value ?? '';

          switch (type) {
            case 'text':
            case 'number':
            case 'date':
              const hasValue = hasFieldValue(name);
              const isEditing = editingFields.has(name);
              
              return (
                <div key={_id}>
                  <div className="flex items-center justify-between">
                    <Label htmlFor={name}>{name}</Label>
                    {canEdit && hasValue && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleEditMode(name)}
                        className="h-8 px-3"
                      >
                        {isEditing ? 'Cancel' : 'Edit'}
                      </Button>
                    )}
                  </div>
                  
                  {hasValue && !isEditing ? (
                    <div className="mt-1 p-3 bg-gray-50 border rounded-md">
                      <span className="text-sm font-medium text-gray-900">
                        {type === 'date' && fieldValue 
                          ? new Date(fieldValue).toLocaleDateString()
                          : fieldValue
                        }
                      </span>
                    </div>
                  ) : (
                    <Input
                      id={name}
                      type={type}
                      placeholder={placeholder || ''}
                      value={fieldValue}
                      onChange={(e) => handleFieldChange(name, e.target.value)}
                      required={isRequired}
                      disabled={!canEdit}
                      className="mt-1"
                    />
                  )}
                </div>
              );

            case 'textarea':
              const hasTextValue = hasFieldValue(name);
              const isTextEditing = editingFields.has(name);
              
              return (
                <div key={_id}>
                  <div className="flex items-center justify-between">
                    <Label htmlFor={name}>{name}</Label>
                    {canEdit && hasTextValue && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleEditMode(name)}
                        className="h-8 px-3"
                      >
                        {isTextEditing ? 'Cancel' : 'Edit'}
                      </Button>
                    )}
                  </div>
                  
                  {hasTextValue && !isTextEditing ? (
                    <div className="mt-1 p-3 bg-gray-50 border rounded-md min-h-[80px]">
                      <span className="text-sm text-gray-900 whitespace-pre-wrap">
                        {fieldValue}
                      </span>
                    </div>
                  ) : (
                    <Textarea
                      id={name}
                      placeholder={placeholder || ''}
                      value={fieldValue}
                      onChange={(e) => handleFieldChange(name, e.target.value)}
                      required={isRequired}
                      disabled={!canEdit}
                      className="mt-1"
                    />
                  )}
                </div>
              );

            case 'boolean':
              const hasBoolValue = hasFieldValue(name);
              const isBoolEditing = editingFields.has(name);
              
              return (
                <div key={_id}>
                  <div className="flex items-center justify-between">
                    <Label htmlFor={name}>{name}</Label>
                    <div className="flex items-center gap-2">
                      {canEdit && hasBoolValue && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleEditMode(name)}
                          className="h-8 px-3"
                        >
                          {isBoolEditing ? 'Cancel' : 'Edit'}
                        </Button>
                      )}
                      
                      {hasBoolValue && !isBoolEditing ? (
                        <div className="px-3 py-1 bg-gray-50 border rounded-md">
                          <span className={`text-sm font-medium ${fieldValue ? 'text-green-700' : 'text-gray-600'}`}>
                            {fieldValue ? 'Yes' : 'No'}
                          </span>
                        </div>
                      ) : (
                        <Switch
                          id={name}
                          checked={!!fieldValue}
                          onCheckedChange={(checked) =>
                            handleFieldChange(name, checked)
                          }
                          disabled={!canEdit}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );

            case 'image':
              const deptImages = Array.isArray(fieldValue)
                ? fieldValue
                : fieldValue
                  ? [fieldValue]
                  : [];

              const globalImages = Array.isArray(srd.images) ? srd.images : (srd.images ? [srd.images] : []);
              const allImages = Array.from(new Set([...globalImages, ...deptImages]));

              return (
                <div key={_id}>
                  <Label>{name}</Label>
                  
                  {canEdit && (
                    <div className="mt-2 mb-3">
                      <UploadImage 
                        onUploaded={(urls) => {
                          const imageArray = Array.isArray(urls) ? urls : (urls ? [urls] : []);
                          if (imageArray.length > 0) {
                            const currentImages = Array.isArray(fieldValue) ? fieldValue : (fieldValue ? [fieldValue] : []);
                            const updatedImages = [...currentImages, ...imageArray];
                            handleFieldChange(name, updatedImages);
                            toast({
                              title: 'Images uploaded',
                              description: `${imageArray.length} image(s) uploaded. Click "Save Changes" to save them.`,
                            });
                          }
                        }} 
                      />
                    </div>
                  )}

                  {allImages.length > 0 ? (
                    <div className="grid grid-cols-4 md:grid-cols-6 gap-2 mt-2">
                      {allImages.map((src, idx) => {
                        const isDeptImage = deptImages.includes(src);
                        const isCover = idx === 0;
                        
                        return (
                          <div
                            key={idx}
                            className="relative group aspect-square"
                          >
                            <div
                              className="cursor-pointer w-full h-full"
                              onClick={() => {
                                setImageModalIndex(idx);
                                setModalImages(allImages);
                                setIsImageModalOpen(true);
                              }}
                            >
                              <Image
                                src={src}
                                alt={`${name}-${idx}`}
                                fill
                                className={cn(
                                  "object-cover rounded border transition-all",
                                  isCover ? "border-yellow-400 border-2" : "border-gray-200 hover:border-blue-400"
                                )}
                              />
                              {isCover && (
                                <div className="absolute top-1 left-1 bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded text-xs font-semibold flex items-center gap-1">
                                  <Star className="h-3 w-3 fill-current" />
                                  Cover
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs transition rounded">
                                <span className="bg-black/60 px-2 py-1 rounded">View</span>
                              </div>
                            </div>
                            
                            {canEdit && (
                              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                {!isCover && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSetCoverImage(name, idx, allImages);
                                    }}
                                    className="bg-yellow-500 hover:bg-yellow-600 text-white p-1 rounded shadow-lg"
                                    title="Set as cover"
                                  >
                                    <Star className="h-3 w-3" />
                                  </button>
                                )}
                                {isDeptImage && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveImage(name, idx, allImages);
                                    }}
                                    className="bg-red-500 hover:bg-red-600 text-white p-1 rounded shadow-lg"
                                    title="Remove image"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic mt-1">
                      No images uploaded yet.
                    </p>
                  )}
                </div>
              );

            default:
              return null;
          }
        })}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          {department.toUpperCase()} Department
        </CardTitle>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">Status:</span>
          <Badge
            className={cn(
              status === 'approved' && 'bg-green-100 text-green-800',
              status === 'in-progress' && 'bg-blue-100 text-blue-800',
              status === 'flagged' && 'bg-red-100 text-red-800',
              status === 'pending' && 'bg-gray-100 text-gray-800'
            )}
          >
            {status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        {renderDynamicFields()}

        {canEdit && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Update Status
            </h4>
            <div className="flex items-center space-x-3">
              <select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting}
              >
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="approved">Approved</option>
                <option value="flagged">Flag Issue</option>
              </select>

              <Button
                onClick={() => handleUpdate(status)}
                disabled={isSubmitting}
                className="px-4 py-2"
              >
                {isSubmitting ? 'Updating...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Flag Dialog */}
      <Dialog open={showFlagDialog} onOpenChange={setShowFlagDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flag SRD Issue</DialogTitle>
          </DialogHeader>

          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please provide a detailed explanation of the issue. This comment
              will be visible to all departments.
            </AlertDescription>
          </Alert>

          <Textarea
            value={flagComment}
            onChange={(e) => setFlagComment(e.target.value)}
            placeholder="Describe the issue..."
            className="min-h-[100px]"
          />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowFlagDialog(false);
                setFlagComment('');
                setStatus(srd.status[department]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleFlagSubmit}
              disabled={!flagComment.trim() || isSubmitting}
              variant="destructive"
            >
              {isSubmitting ? 'Flagging...' : 'Flag Issue'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Slider Modal */}
      {isImageModalOpen && modalImages.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90"
          onClick={() => setIsImageModalOpen(false)}
        >
          <button
            onClick={() => setIsImageModalOpen(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
          >
            <X className="h-8 w-8" />
          </button>

          <div
            className="relative max-w-5xl max-h-[90vh] w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full h-[80vh] flex items-center justify-center">
              <Image
                src={modalImages[imageModalIndex]}
                alt={`Image ${imageModalIndex + 1}`}
                fill
                className="object-contain"
                sizes="(max-width: 1280px) 100vw, 1280px"
              />
            </div>

            {modalImages.length > 1 && (
              <>
                <button
                  onClick={() => setImageModalIndex(Math.max(0, imageModalIndex - 1))}
                  disabled={imageModalIndex === 0}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 disabled:opacity-30 disabled:cursor-not-allowed rounded-full p-2 transition-all"
                >
                  <ChevronLeft className="h-6 w-6 text-gray-800" />
                </button>

                <button
                  onClick={() => setImageModalIndex(Math.min(modalImages.length - 1, imageModalIndex + 1))}
                  disabled={imageModalIndex === modalImages.length - 1}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 disabled:opacity-30 disabled:cursor-not-allowed rounded-full p-2 transition-all"
                >
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