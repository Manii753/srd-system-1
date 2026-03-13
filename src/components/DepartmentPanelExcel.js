'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Trash2, Star, Upload, Printer, FileSpreadsheet, Loader2, Plus, X, Columns, Rows } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import UploadImage from './UploadImage';
import UploadFile from './UploadFile';
import { useToast } from '@/lib/use-toast';
import { printDepartmentPanelExcel } from '@/components/departmentPanelExcelPrint';
import {
  getAssetKey,
  getAssetLabel,
  getAssetUrl,
  normalizeAssetEntries,
} from '@/lib/assetUtils';
import { getAttachedImageLabels } from '@/lib/fieldConnectionUtils';

export default function DepartmentPanelExcel({
  srd,
  userRole,
  onUpdate,
}) {
  const { toast } = useToast();
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [allFieldDefs, setAllFieldDefs] = useState({});
  const [fields, setFields] = useState(srd.dynamicFields || []);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState({}); // Track updates per department

  // Status update state
  const [selectedDepartment, setSelectedDepartment] = useState(userRole === 'admin' || userRole === 'vmd' ? 'vmd' : userRole);
  const [statusToUpdate, setStatusToUpdate] = useState('approved');
  const [updateComment, setUpdateComment] = useState('');

  // Auto-save functionality
  const autoSaveTimeoutsRef = useRef({});
  const lastSavedFieldsRef = useRef(JSON.stringify(fields));
  const isSavingInProgressRef = useRef(false);

  // Check if user can edit a specific field based on its department
  const canEditField = useCallback((fieldDepartment) => {
    return userRole === 'admin' || userRole === 'vmd' || userRole === fieldDepartment;
  }, [userRole]);

  // Fetch active template and all field definitions
  useEffect(() => {
    async function fetchData() {
      
      setIsLoading(true);
      try {
        // Fetch active template
        const templateRes = await fetch('/api/printTemplate/active');
        if (!templateRes.ok) {
          throw new Error('No active template found');
        }
        const template = await templateRes.json();
        setActiveTemplate(template);

        // Fetch all field definitions from all departments
        const fieldDefsMap = {};
        for (const dept of ['vmd', 'cad', 'commercial', 'mmc']) {
          try {
            const res = await fetch(`/api/newField?department=${dept}`);
            const data = await res.json();
            if (Array.isArray(data)) {
              data.forEach(f => {
                // Use string ID as key for consistent lookup
                fieldDefsMap[f._id.toString()] = f;
              });
            }
          } catch (err) {
            console.error(`Failed to fetch ${dept} fields:`, err);
          }
        }
        setAllFieldDefs(fieldDefsMap);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        toast({
          title: 'Error',
          description: 'Failed to load template. Please ensure an active template exists.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [srd?._id, toast]);

  useEffect(() => {
    setFields(srd.dynamicFields || []);
    lastSavedFieldsRef.current = JSON.stringify(srd.dynamicFields || []);
  }, [srd?.dynamicFields]);

  // Auto-save function with debouncing - saves per department
  const debouncedAutoSave = useCallback(async (fieldsToSave, department) => {
    if (autoSaveTimeoutsRef.current[department]) {
      clearTimeout(autoSaveTimeoutsRef.current[department]);
    }

    autoSaveTimeoutsRef.current[department] = setTimeout(async () => {
      // If a save is already in progress, delay this save a bit to avoid VersionError
      if (isSavingInProgressRef.current) {
        debouncedAutoSave(fieldsToSave, department);
        return;
      }

      const deptFields = fieldsToSave.filter(f => f.department === department);

      if (deptFields.length > 0) {
        setIsAutoSaving(true);
        isSavingInProgressRef.current = true;
        try {
          const updateData = {
            status: srd.status?.[department] || 'pending',
            fields: deptFields,
          };

          await onUpdate(department, updateData, false);

          lastSavedFieldsRef.current = JSON.stringify(fieldsToSave);
          setHasUnsavedChanges(false);

          toast({
            title: 'Auto-saved',
            description: `${department.toUpperCase()} changes saved`,
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
          setIsAutoSaving(false);
          isSavingInProgressRef.current = false;
          delete autoSaveTimeoutsRef.current[department];
        }
      }
    }, 1500);
  }, [srd.status, onUpdate, toast]);

  useEffect(() => {
    const timeoutsRef = autoSaveTimeoutsRef;
    return () => {
      // Clear all timeouts on unmount
      const activeTimeouts = timeoutsRef.current;
      Object.values(activeTimeouts).forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  const normalizeFieldId = useCallback((fieldId) => {
    if (!fieldId) return null;
    if (typeof fieldId === 'object') {
      if (fieldId._id) return fieldId._id.toString();
      if (typeof fieldId.toString === 'function') return fieldId.toString();
      return null;
    }
    return fieldId.toString();
  }, []);

  const hasMeaningfulValue = useCallback((value, fieldType) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'boolean') return true;
    if (typeof value === 'number') return !Number.isNaN(value);
    if (typeof value === 'string') return value.trim() !== '';

    if (Array.isArray(value)) {
      return value.some(item => hasMeaningfulValue(item, fieldType));
    }

    if (typeof value === 'object') {
      if (fieldType === 'table') {
        const rows = Array.isArray(value.rows) ? value.rows : [];
        const predefinedData = Array.isArray(value.predefinedData) ? value.predefinedData : [];

        const hasRowContent = rows.some(row =>
          Array.isArray(row) && row.some(cell => typeof cell === 'string' ? cell.trim() !== '' : !!cell)
        );

        const hasPredefinedContent = predefinedData.some(item =>
          (typeof item?.opd === 'string' && item.opd.trim() !== '') ||
          (typeof item?.etd === 'string' && item.etd.trim() !== '') ||
          item?.purchaseType === 'instock'
        );

        return hasRowContent || hasPredefinedContent;
      }

      return Object.values(value).some(item => hasMeaningfulValue(item, fieldType));
    }

    return false;
  }, []);

  const findFieldIndex = useCallback((sourceFields, fieldId, fieldDef = null, department = null) => {
    const normalizedFieldId = normalizeFieldId(fieldId);
    const expectedDepartment = department || fieldDef?.department;

    return sourceFields.findIndex(field => {
      const currentFieldId = normalizeFieldId(
        field.originalFieldId ||
        (field.field && (typeof field.field === 'object' ? field.field._id || field.field : field.field))
      );

      return (normalizedFieldId && currentFieldId === normalizedFieldId) ||
        (fieldDef && field.name === fieldDef.name && field.department === expectedDepartment);
    });
  }, [normalizeFieldId]);

  const findFieldState = useCallback((fieldId, fieldDef = null, sourceFields = fields) => {
    const fieldIndex = findFieldIndex(sourceFields, fieldId, fieldDef, fieldDef?.department);
    return fieldIndex > -1 ? sourceFields[fieldIndex] : null;
  }, [fields, findFieldIndex]);

  const isOptionalFieldEnabled = useCallback((fieldId, fieldDef, sourceFields = fields) => {
    if (!fieldDef?.isOptional) return true;

    const fieldState = findFieldState(fieldId, fieldDef, sourceFields);
    if (typeof fieldState?.isOptionalEnabled === 'boolean') {
      return fieldState.isOptionalEnabled;
    }

    return hasMeaningfulValue(fieldState?.value, fieldDef.type);
  }, [fields, findFieldState, hasMeaningfulValue]);

  const getAttachmentLabels = useCallback((fieldId) => {
    return getAttachedImageLabels({
      targetFieldId: fieldId,
      fieldDefs: allFieldDefs,
      dynamicFields: fields,
    });
  }, [allFieldDefs, fields]);

  const buildFieldState = useCallback((fieldId, fieldDef, department, overrides = {}) => {
    const normalizedFieldId = normalizeFieldId(fieldId);
    const parentHeadingName = fieldDef?.parentHeading
      ? (typeof fieldDef.parentHeading === 'object' ? fieldDef.parentHeading.name : fieldDef.parentHeading)
      : undefined;

    return {
      field: normalizedFieldId,
      originalFieldId: normalizedFieldId,
      name: fieldDef?.name || overrides.name || '',
      slug: fieldDef?.slug,
      type: fieldDef?.type,
      department: department || fieldDef?.department,
      value: '',
      isRequired: !!fieldDef?.isRequired,
      isOptional: !!fieldDef?.isOptional,
      isOptionalEnabled: fieldDef?.isOptional ? false : true,
      placeholder: fieldDef?.placeholder || '',
      order: fieldDef?.order || 0,
      parentHeading: parentHeadingName,
      fieldVersion: new Date(),
      isConnectedTo: !!fieldDef?.isConnectedTo,
      connectedFieldId: normalizeFieldId(fieldDef?.connectedFieldId),
      connectionType: fieldDef?.connectionType || null,
      booleanDisplayType: fieldDef?.booleanDisplayType || null,
      tableHeaders: Array.isArray(fieldDef?.tableHeaders) ? fieldDef.tableHeaders : [],
      ...overrides,
    };
  }, [normalizeFieldId]);

  const handleFieldUpdate = useCallback((fieldId, department, fieldDef, updates) => {
    const normalizedFieldId = normalizeFieldId(fieldId);
    const resolvedDepartment = department || fieldDef?.department;

    setFields(prev => {
      const existingFieldIndex = findFieldIndex(prev, normalizedFieldId, fieldDef, resolvedDepartment);

      const baseField = buildFieldState(normalizedFieldId, fieldDef, resolvedDepartment, updates);
      let newFields;
      if (existingFieldIndex > -1) {
        newFields = [...prev];
        const currentField = newFields[existingFieldIndex];
        newFields[existingFieldIndex] = {
          ...baseField,
          ...currentField,
          ...updates,
          department: resolvedDepartment,
          field: currentField.field || baseField.field,
          originalFieldId: currentField.originalFieldId || baseField.originalFieldId,
          fieldVersion: currentField.fieldVersion || baseField.fieldVersion,
        };
      } else {
        newFields = [...prev, baseField];
      }

      const currentFieldIndex = existingFieldIndex > -1 ? existingFieldIndex : newFields.length - 1;
      const currentField = newFields[currentFieldIndex];
      const nextValue = Object.prototype.hasOwnProperty.call(updates, 'value')
        ? updates.value
        : currentField.value;

      // Handle Connected Fields
      // We must check if the modified field has connection properties
      // First, try to find the full field definition from the instance data (preferred)
      // or use the passed fieldDef or look it up in allFieldDefs
      let currentFieldDef = currentField;

      // If instance doesn't have connection info (e.g. legacy), try to merge with static def
      if (!currentFieldDef.isConnectedTo && fieldDef) {
        currentFieldDef = { ...fieldDef, ...currentFieldDef };
      }

      // 1. Auto-True Logic
      if (currentFieldDef.isConnectedTo && currentFieldDef.connectionType === 'auto-true' && nextValue === true) {
        let connectedFieldId = currentFieldDef.connectedFieldId;
        // Handle populated object or string ID
        if (connectedFieldId && typeof connectedFieldId === 'object' && connectedFieldId._id) {
          connectedFieldId = connectedFieldId._id;
        }
        connectedFieldId = normalizeFieldId(connectedFieldId);

        if (connectedFieldId) {
          // Find the connected field in current fields
          let connectedIndex = findFieldIndex(newFields, connectedFieldId, allFieldDefs[connectedFieldId], allFieldDefs[connectedFieldId]?.department);

          // If not found in current fields, try to add it from definitions
          if (connectedIndex === -1 && allFieldDefs[connectedFieldId]) {
            const connectedDef = allFieldDefs[connectedFieldId];
            newFields.push(buildFieldState(connectedFieldId, connectedDef, connectedDef.department, {
              value: true,
              isOptionalEnabled: true,
            }));
            connectedIndex = newFields.length - 1;
          }

          if (connectedIndex > -1) {
            const connectedField = newFields[connectedIndex];

            // Only update if not already true
            if (connectedField.value !== true) {
              newFields[connectedIndex] = {
                ...connectedField,
                value: true,
                isOptionalEnabled: true,
              };

              // Trigger auto-save for the connected field's department if different
              if (connectedField.department !== resolvedDepartment) {
                debouncedAutoSave(newFields, connectedField.department);
              }
            }
          }
        }
      }

      // Trigger auto-save for this department
      if (resolvedDepartment) {
        debouncedAutoSave(newFields, resolvedDepartment);
      }

      return newFields;
    });

    setHasUnsavedChanges(true);
  }, [allFieldDefs, buildFieldState, debouncedAutoSave, findFieldIndex, normalizeFieldId]);

  // Handle field change with department tracking
  const handleFieldChange = useCallback((fieldId, name, value, department, fieldDef = null) => {
    const resolvedFieldDef = fieldDef || allFieldDefs[normalizeFieldId(fieldId)] || { name, department };
    handleFieldUpdate(fieldId, department, resolvedFieldDef, {
      name,
      value,
      ...(resolvedFieldDef?.isOptional ? { isOptionalEnabled: true } : {}),
    });
  }, [allFieldDefs, handleFieldUpdate, normalizeFieldId]);

  const handleOptionalFieldToggle = useCallback((fieldId, fieldDef, isEnabled) => {
    handleFieldUpdate(fieldId, fieldDef.department, fieldDef, {
      name: fieldDef.name,
      isOptional: true,
      isOptionalEnabled: isEnabled,
    });
  }, [handleFieldUpdate]);

  // Get field value from SRD dynamicFields by fieldId - memoized
  const getFieldValue = useCallback((fieldId, fieldDef) => {
    const srdField = findFieldState(fieldId, fieldDef);
    return srdField?.value ?? '';
  }, [findFieldState]);

  // Check if a field should be hidden based on toggle-active connection
  const isFieldHidden = useCallback((fieldDef) => {
    if (!fieldDef.isConnectedTo || fieldDef.connectionType !== 'toggle-active') {
      return false;
    }

    const connectedFieldId = normalizeFieldId(fieldDef.connectedFieldId);
    if (!connectedFieldId) return false;

    // Find the connected field value in current fields
    const connectedFieldDef = allFieldDefs[connectedFieldId];
    const connectedField = findFieldState(connectedFieldId, connectedFieldDef);

    if (connectedFieldDef?.isOptional && !isOptionalFieldEnabled(connectedFieldId, connectedFieldDef)) {
      return false;
    }

    // If connected field is true, hide this field
    return connectedField?.value === true;
  }, [allFieldDefs, findFieldState, isOptionalFieldEnabled, normalizeFieldId]);

  const handleRemoveImage = useCallback((fieldId, name, department, imageIndex, allImages) => {
    const imageToRemove = allImages[imageIndex];
    const fieldValue = getFieldValue(fieldId, { name, department });
    const deptImages = normalizeAssetEntries(fieldValue, { kind: 'image' });
    const imageKey = getAssetKey(imageToRemove);
    const updatedImages = deptImages.filter((asset) => getAssetKey(asset) !== imageKey);

    if (updatedImages.length !== deptImages.length) {
      handleFieldChange(fieldId, name, updatedImages, department);
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
  }, [getFieldValue, handleFieldChange, toast]);

  const handleSetCoverImage = useCallback((fieldId, name, department, imageIndex, allImages) => {
    const coverImage = allImages[imageIndex];
    const fieldValue = getFieldValue(fieldId, { name, department });
    const deptImages = normalizeAssetEntries(fieldValue, { kind: 'image' });
    const coverKey = getAssetKey(coverImage);
    const otherImages = deptImages.filter((asset) => getAssetKey(asset) !== coverKey);
    const reorderedImages = [coverImage, ...otherImages];
    handleFieldChange(fieldId, name, reorderedImages, department);
    toast({
      title: 'Cover image set',
      description: 'Changes will be saved automatically',
    });
  }, [getFieldValue, handleFieldChange, toast]);

  // Handle status update for a department
  const handleStatusUpdate = useCallback(async () => {
    // Determine which department to update
    const deptToUpdate = (userRole === 'admin' || userRole === 'vmd')
      ? selectedDepartment
      : userRole;

    if (statusToUpdate === 'flagged' && !updateComment.trim()) {
      toast({
        title: 'Comment required',
        description: 'Please describe the issue when flagging',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Get the fields for this department
      const deptFields = fields.filter(f => f.department === deptToUpdate);

      const updateData = {
        status: statusToUpdate,
        fields: deptFields,
      };

      // Add comment if provided
      if (updateComment.trim()) {
        updateData.comment = {
          author: srd.createdBy?.name || 'Unknown',
          role: userRole,
          text: updateComment.trim(),
          department: deptToUpdate,
        };
      }

      await onUpdate(deptToUpdate, updateData);

      toast({
        title: 'Status updated',
        description: `${deptToUpdate.toUpperCase()} status set to ${statusToUpdate}`,
      });

      setUpdateComment('');
    } catch (error) {
      console.error('Status update failed:', error);
      toast({
        title: 'Update failed',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [userRole, selectedDepartment, statusToUpdate, updateComment, fields, srd.createdBy?.name, onUpdate, toast]);


  const handlePrint = useCallback(async () => {
    await printDepartmentPanelExcel({
      fields,
      hasUnsavedChanges,
      isAutoSaving,
      isFieldHidden,
      setIsPrinting,
      srd,
      toast,
    });
  }, [fields, hasUnsavedChanges, isAutoSaving, isFieldHidden, srd, toast]);

  // Render input cell based on field type
  const renderCellInput = useCallback((fieldDef, fieldId, canEdit) => {
    const fieldValue = getFieldValue(fieldId, fieldDef);
    const { name, type, placeholder, isRequired, department } = fieldDef;

    switch (type) {
      case 'heading':
        return (
          <div className="bg-blue-50 px-2 py-1 font-semibold text-blue-800 text-sm">
            {name}
          </div>
        );

      case 'text':
      case 'number':
      case 'date':
      case 'createdAt':
        // For createdAt type, use srd.createdAt as the value
        const displayValue = type === 'createdAt' ? (srd.createdAt ? new Date(srd.createdAt).toISOString().split('T')[0] : '') : fieldValue;
        return (
          <Input
            type={type === 'createdAt' ? 'date' : type}
            placeholder={placeholder || ''}
            value={displayValue}
            onChange={(e) => handleFieldChange(fieldId, name, e.target.value, department, fieldDef)}
            required={isRequired}
            disabled={!canEdit || type === 'createdAt'}
            className={cn(
              "h-8 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 w-full bg-transparent",
              !canEdit && "bg-gray-100 cursor-not-allowed"
            )}
          />
        );

      case 'textarea':
        return (
          <Textarea
            placeholder={placeholder || ''}
            value={fieldValue}
            onChange={(e) => handleFieldChange(fieldId, name, e.target.value, department, fieldDef)}
            required={isRequired}
            disabled={!canEdit}
            className={cn(
              "min-h-[60px] px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 resize-none w-full bg-transparent",
              !canEdit && "bg-gray-100 cursor-not-allowed"
            )}
          />
        );

      case 'boolean':
        return (
          <div className="flex items-center space-x-4 py-1">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name={`field-${fieldId}`}
                checked={fieldValue === true}
                onChange={() => handleFieldChange(fieldId, name, true, department, fieldDef)}
                disabled={!canEdit}
                className="form-radio h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="text-sm text-gray-700">Yes</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name={`field-${fieldId}`}
                checked={fieldValue === false}
                onChange={() => handleFieldChange(fieldId, name, false, department, fieldDef)}
                disabled={!canEdit}
                className="form-radio h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="text-sm text-gray-700">No</span>
            </label>
          </div>
        );

      case 'table':
        const defaultHeaders = Array.isArray(fieldDef.tableHeaders) && fieldDef.tableHeaders.length > 0 
          ? fieldDef.tableHeaders 
          : ['Item Name', 'Code', 'Finish', 'Size'];

        const rawTableData = fieldValue && typeof fieldValue === 'object' && !Array.isArray(fieldValue)
          ? fieldValue
          : {};
        const safeHeaders = Array.isArray(rawTableData.headers) && rawTableData.headers.length > 0
          ? rawTableData.headers
          : defaultHeaders;
        const normalizedRows = Array.isArray(rawTableData.rows) && rawTableData.rows.length > 0
          ? rawTableData.rows.map((row) => {
              if (!Array.isArray(row)) return new Array(safeHeaders.length).fill('');
              if (row.length >= safeHeaders.length) return row;
              return [...row, ...new Array(safeHeaders.length - row.length).fill('')];
            })
          : [new Array(safeHeaders.length).fill('')];
        const tableData = {
          ...rawTableData,
          headers: safeHeaders,
          rows: normalizedRows
        };

        // Ensure predefinedData array exists and matches row count
        const predefinedData = (Array.isArray(rawTableData.predefinedData) ? rawTableData.predefinedData : [])
          .slice(0, tableData.rows.length)
          .map((item) => ({
            purchaseType: item?.purchaseType === 'instock' ? 'instock' : 'purchase',
            opd: typeof item?.opd === 'string' ? item.opd : '',
            etd: typeof item?.etd === 'string' ? item.etd : ''
          }));
        // Fill missing entries so every row has predefined data
        while (predefinedData.length < tableData.rows.length) {
          predefinedData.push({ purchaseType: 'purchase', opd: '', etd: '' });
        }

        const updatePredefined = (rowIdx, key, val) => {
          const newPredefined = predefinedData.map((p, i) =>
            i === rowIdx ? { ...p, [key]: val } : { ...p }
          );
          // If switching to instock, clear dates
          if (key === 'purchaseType' && val === 'instock') {
            newPredefined[rowIdx].opd = '';
            newPredefined[rowIdx].etd = '';
          }
          // If switching to purchase, pre-fill dates with today's date
          if (key === 'purchaseType' && val === 'purchase') {
            const today = new Date().toISOString().split('T')[0];
            if (!newPredefined[rowIdx].opd) {
              newPredefined[rowIdx].opd = today;
            }
            if (!newPredefined[rowIdx].etd) {
              newPredefined[rowIdx].etd = today;
            }
          }
          handleFieldChange(fieldId, name, { ...tableData, predefinedData: newPredefined }, department, fieldDef);
        };

        const totalCols = (tableData.headers?.length || 0) + 3;

        // Interactive Card Layout for wide tables
        if (totalCols >= 10) {
          return (
            <div className="space-y-4 p-2 overflow-auto max-h-96 bg-gray-50/50 rounded-md">
              
              {/* Card Headers Controls */}
              <div className="flex flex-wrap items-center gap-2 mb-4 p-2 bg-white border border-gray-200 rounded-md shadow-sm">
                <span className="text-xs font-semibold text-gray-700 mr-2">Columns:</span>
                {tableData.headers?.map((header, colIdx) => (
                  <div key={colIdx} className="flex items-center group relative">
                    <input
                      type="text"
                      value={header}
                      onChange={(e) => {
                        const newHeaders = [...tableData.headers];
                        newHeaders[colIdx] = e.target.value;
                        handleFieldChange(fieldId, name, { ...tableData, headers: newHeaders }, department, fieldDef);
                      }}
                      className="w-24 text-xs bg-gray-100 border-none focus:ring-1 focus:ring-blue-400 rounded px-2 py-1"
                      disabled={!canEdit}
                    />
                    {canEdit && tableData.headers.length > 1 && (
                      <button
                        onClick={() => {
                          const newHeaders = tableData.headers.filter((_, idx) => idx !== colIdx);
                          const newRows = tableData.rows.map(row => row.filter((_, idx) => idx !== colIdx));
                          handleFieldChange(fieldId, name, { headers: newHeaders, rows: newRows }, department, fieldDef);
                        }}
                        className="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 bg-red-100 text-red-500 rounded-full p-0.5 hover:bg-red-200 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
                {canEdit && (
                  <button
                    onClick={() => {
                      const newHeaders = [...tableData.headers, `Column ${tableData.headers.length + 1}`];
                      const newRows = tableData.rows.map(row => [...row, '']);
                      handleFieldChange(fieldId, name, { headers: newHeaders, rows: newRows }, department, fieldDef);
                    }}
                    className="flex items-center justify-center p-1 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Data Cards */}
              <div className="flex flex-col gap-4">
                {tableData.rows?.map((row, rowIdx) => {
                  const rowPredefined = predefinedData[rowIdx] || { purchaseType: 'purchase', opd: '', etd: '' };
                  const isInStock = rowPredefined.purchaseType === 'instock';

                  // Group items for 3-column layout
                  const col1Indexes = [];
                  for (let i = 0; i < Math.min(4, tableData.headers.length); i++) col1Indexes.push(i);
                  
                  const col2Indexes = [];
                  for (let i = 4; i < tableData.headers.length; i++) col2Indexes.push(i);

                  return (
                    <div key={rowIdx} className="bg-white border border-gray-200 shadow-sm rounded-md p-3 relative group">
                      
                      {/* Add delete row button if user can edit and there's more than 1 row */}
                      {/* {canEdit && (
                        <button
                          onClick={() => {
                            const newRows = tableData.rows.filter((_, idx) => idx !== rowIdx);
                            const newPredefined = predefinedData.filter((_, idx) => idx !== rowIdx);
                            handleFieldChange(fieldId, name, {
                              ...tableData,
                              rows: newRows.length > 0 ? newRows : [new Array(tableData.headers.length).fill('')],
                              predefinedData: newPredefined.length > 0 ? newPredefined : [{ purchaseType: 'purchase', opd: '', etd: '' }]
                            }, department, fieldDef);
                          }}
                          className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 bg-red-100 text-red-500 hover:bg-red-500 hover:text-white rounded-full p-1 transition-all z-10 shadow-sm"
                          title="Delete row card"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )} */}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Col 1: First 4 fields */}
                        <div className="flex flex-col gap-2">
                          {col1Indexes.map(idx => (
                            <div key={idx} className="flex items-center text-xs">
                              <span className="w-20 flex-shrink-0 font-semibold text-gray-700 whitespace-nowrap capitalize break-words pr-2">{tableData.headers[idx] || `Col ${idx+1}`}:</span>
                              <input
                                type="text"
                                value={row[idx] || ''}
                                onChange={(e) => {
                                  const newRows = [...tableData.rows];
                                  newRows[rowIdx][idx] = e.target.value;
                                  handleFieldChange(fieldId, name, { ...tableData, rows: newRows }, department, fieldDef);
                                }}
                                className="flex-1 ml-5 min-w-0 border-b border-gray-300 focus:border-blue-500 focus:outline-none bg-transparent px-1 py-0.5"
                                disabled={!canEdit}
                              />
                            </div>
                          ))}
                        </div>

                        {/* Col 2: Remaining fields */}
                        <div className="flex flex-col gap-2">
                          {col2Indexes.length > 0 ? (
                            col2Indexes.map(idx => (
                              <div key={idx} className="flex items-center text-xs">
                                <span className="w-20 flex-shrink-0 font-semibold text-gray-700 capitalize break-words whitespace-nowrap pr-2">{tableData.headers[idx] || `Col ${idx+1}`}:</span>
                                <input
                                  type="text"
                                  value={row[idx] || ''}
                                  onChange={(e) => {
                                    const newRows = [...tableData.rows];
                                    newRows[rowIdx][idx] = e.target.value;
                                    handleFieldChange(fieldId, name, { ...tableData, rows: newRows }, department, fieldDef);
                                  }}
                                  className="flex-1 ml-5 min-w-0 border-b border-gray-300 focus:border-blue-500 focus:outline-none bg-transparent px-1 py-0.5"
                                  disabled={!canEdit}
                                />
                              </div>
                            ))
                          ) : (
                             <div className="text-gray-400 italic text-xs h-full flex items-center justify-center">-</div>
                          )}
                        </div>

                        {/* Col 3: Predefined Fields - Purchase/Stock, OPD, IHD */}
                        <div className="flex flex-col rounded-md bg-gray-100 p-3 border border-gray-300 gap-3">
                          {/* Headers Row */}
                          <div className="grid grid-cols-3 gap-6">
                            <div className="text-xs font-semibold text-indigo-600">Purchase/Stock</div>
                            <div className="text-xs font-semibold text-indigo-600">OPD</div>
                            <div className="text-xs font-semibold text-indigo-600">IHD</div>
                          </div>
                          
                          {/* Values Row */}
                          <div className="grid grid-cols-3 gap-6 items-start">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => canEdit && updatePredefined(rowIdx, 'purchaseType', 'purchase')}
                                disabled={!canEdit}
                                className={cn(
                                  "px-3 py-1 rounded text-xs font-medium border",
                                  !isInStock ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white text-gray-500 border-gray-300 hover:border-blue-400"
                                )}
                              >
                                Purchase
                              </button>
                              <button
                                onClick={() => canEdit && updatePredefined(rowIdx, 'purchaseType', 'instock')}
                                disabled={!canEdit}
                                className={cn(
                                  "px-3 py-1 rounded text-xs font-medium border",
                                  isInStock ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" : "bg-white text-gray-500 border-gray-300 hover:border-emerald-400"
                                )}
                              >
                                InStock
                              </button>
                            </div>
                            <div>
                              <input
                                type="date"
                                value={rowPredefined.opd || ''}
                                onChange={(e) => updatePredefined(rowIdx, 'opd', e.target.value)}
                                disabled={!canEdit || isInStock}
                                className={cn(
                                  "w-full px-2 py-1 border border-gray-300 rounded text-xs bg-white text-gray-700",
                                  isInStock && "opacity-40 bg-gray-100 cursor-not-allowed"
                                )}
                              />
                            </div>
                            <div>
                              <input
                                type="date"
                                value={rowPredefined.etd || ''}
                                onChange={(e) => updatePredefined(rowIdx, 'etd', e.target.value)}
                                disabled={!canEdit || isInStock}
                                className={cn(
                                  "w-full px-2 py-1 border border-gray-300 rounded text-xs bg-white text-gray-700",
                                  isInStock && "opacity-40 bg-gray-100 cursor-not-allowed"
                                )}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* {canEdit && (
                  <button
                    onClick={() => {
                      const newRows = [...tableData.rows, new Array(tableData.headers.length).fill('')];
                      const newPredefined = [...predefinedData, { purchaseType: 'purchase', opd: '', etd: '' }];
                      handleFieldChange(fieldId, name, { ...tableData, rows: newRows, predefinedData: newPredefined }, department, fieldDef);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-gray-300 rounded-md text-gray-500 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-all text-xs font-semibold mt-2"
                  >
                    <Plus className="h-4 w-4" /> Add New Row Card
                  </button>
                )} */}
              </div>
            </div>
          );
        }

        // Standard Interactive Table Layout
        return (
          <div className="space-y-1 p-0 overflow-auto max-h-96">
            <div className="border border-gray-200 overflow-hidden">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                    {tableData.headers?.map((header, colIdx) => (
                      <th key={colIdx} className="border border-gray-200 p-0 min-w-[80px] relative group/col">
                        <div className="flex items-center">
                          {canEdit ? (
                            <input
                              type="text"
                              value={header}
                              onChange={(e) => {
                                const newHeaders = [...tableData.headers];
                                newHeaders[colIdx] = e.target.value;
                                handleFieldChange(fieldId, name, { ...tableData, headers: newHeaders }, department, fieldDef);
                              }}
                              className="w-full bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-400 rounded px-2 py-1.5 font-semibold text-center text-gray-700 flex-1"
                              placeholder={`Column ${colIdx + 1}`}
                              disabled={!canEdit}
                            />
                          ) : (
                            <span className="font-semibold flex-1 text-center text-gray-700 px-2 py-1.5">{header}</span>
                          )}
                          {canEdit && tableData.headers.length > 1 && (
                            <button
                              onClick={() => {
                                const newHeaders = tableData.headers.filter((_, idx) => idx !== colIdx);
                                const newRows = tableData.rows.map(row => row.filter((_, idx) => idx !== colIdx));
                                handleFieldChange(fieldId, name, { headers: newHeaders, rows: newRows }, department, fieldDef);
                              }}
                              className="opacity-0 group-hover/col:opacity-100 transition-opacity duration-150 p-0.5 mr-1 rounded hover:bg-red-100 text-red-400 hover:text-red-600 flex-shrink-0"
                              title="Delete column"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </th>
                    ))}
                    {canEdit && (
                      <th className="border border-gray-200 p-0 w-9 bg-gray-50">
                        <button
                          onClick={() => {
                            const newHeaders = [...tableData.headers, `Column ${tableData.headers.length + 1}`];
                            const newRows = tableData.rows.map(row => [...row, '']);
                            handleFieldChange(fieldId, name, { headers: newHeaders, rows: newRows }, department, fieldDef);
                          }}
                          className="w-full h-full flex items-center justify-center py-1.5 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors duration-150"
                          title="Add column"
                        >
                          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                        </button>
                      </th>
                    )}
                    {/* Predefined locked headers */}
                    <th className="border border-gray-200 p-0 min-w-[110px] bg-indigo-50">
                      <span className="font-semibold text-center text-indigo-700 px-2 py-1.5 block text-[11px]">Purchase/Stock</span>
                    </th>
                    <th className="border border-gray-200 p-0 min-w-[120px] bg-indigo-50">
                      <span className="font-semibold text-center text-indigo-700 px-2 py-1.5 block text-[11px]">OPD</span>
                    </th>
                    <th className="border border-gray-200 p-0 min-w-[120px] bg-indigo-50">
                      <span className="font-semibold text-center text-indigo-700 px-2 py-1.5 block text-[11px]">ETD</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.rows?.map((row, rowIdx) => {
                    const rowPredefined = predefinedData[rowIdx] || { purchaseType: 'purchase', opd: '', etd: '' };
                    const isInStock = rowPredefined.purchaseType === 'instock';

                    return (
                    <tr key={rowIdx} className="group/row hover:bg-blue-50/30 transition-colors duration-100">
                      {row.map((cell, colIdx) => (
                        <td key={colIdx} className="border border-gray-200 p-0">
                          {canEdit ? (
                            <input
                              type="text"
                              value={cell}
                              onChange={(e) => {
                                const newRows = [...tableData.rows];
                                newRows[rowIdx][colIdx] = e.target.value;
                                handleFieldChange(fieldId, name, { ...tableData, rows: newRows }, department, fieldDef);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const newRows = [...tableData.rows];
                                  newRows.splice(rowIdx + 1, 0, new Array(tableData.headers.length).fill(''));
                                  const newPredefined = [...predefinedData];
                                  newPredefined.splice(rowIdx + 1, 0, { purchaseType: 'purchase', opd: '', etd: '' });
                                  handleFieldChange(fieldId, name, { ...tableData, rows: newRows, predefinedData: newPredefined }, department, fieldDef);
                                  setTimeout(() => {
                                    const nextInput = e.target.closest('tr')?.nextElementSibling?.querySelector('input');
                                    if (nextInput) nextInput.focus();
                                  }, 50);
                                }
                              }}
                              className="w-full h-full px-2 py-1.5 border-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-blue-50/50 bg-transparent transition-colors duration-100"
                              disabled={!canEdit}
                            />
                          ) : (
                            <span className="px-2 py-1.5 block">{cell}</span>
                          )}
                        </td>
                      ))}
                      {canEdit && (
                        <td className="border border-gray-200 p-0 w-9 bg-gray-50/50 text-center">
                          <button
                            onClick={() => {
                              const newRows = tableData.rows.filter((_, idx) => idx !== rowIdx);
                              const newPredefined = predefinedData.filter((_, idx) => idx !== rowIdx);
                              handleFieldChange(fieldId, name, {
                                ...tableData,
                                rows: newRows.length > 0 ? newRows : [new Array(tableData.headers.length).fill('')],
                                predefinedData: newPredefined.length > 0 ? newPredefined : [{ purchaseType: 'purchase', opd: '', etd: '' }]
                              }, department, fieldDef);
                            }}
                            className="w-full h-full flex items-center justify-center py-1.5 opacity-0 group-hover/row:opacity-100 transition-opacity duration-150 text-red-400 hover:text-red-600 hover:bg-red-50"
                            title="Delete row"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </td>
                      )}
                      {/* Predefined Purchase/Stock toggle */}
                      <td className="border border-gray-200 p-0 bg-indigo-50/30">
                        <div className="flex items-center justify-center gap-1 px-1 py-1">
                          <button
                            onClick={() => canEdit && updatePredefined(rowIdx, 'purchaseType', 'purchase')}
                            disabled={!canEdit}
                            className={cn(
                              "px-1.5 py-0.5 rounded text-[10px] font-medium transition-all duration-150 border",
                              !isInStock
                                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                : "bg-white text-gray-500 border-gray-300 hover:border-blue-400 hover:text-blue-600",
                              !canEdit && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            Purchase
                          </button>
                          <button
                            onClick={() => canEdit && updatePredefined(rowIdx, 'purchaseType', 'instock')}
                            disabled={!canEdit}
                            className={cn(
                              "px-1.5 py-0.5 rounded text-[10px] font-medium transition-all duration-150 border",
                              isInStock
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                : "bg-white text-gray-500 border-gray-300 hover:border-emerald-400 hover:text-emerald-600",
                              !canEdit && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            InStock
                          </button>
                        </div>
                      </td>
                      {/* Predefined OPD date */}
                      <td className={cn("border border-gray-200 p-0", isInStock ? "bg-gray-100" : "bg-indigo-50/30")}>
                        <input
                          type="date"
                          value={rowPredefined.opd || ''}
                          onChange={(e) => updatePredefined(rowIdx, 'opd', e.target.value)}
                          disabled={!canEdit || isInStock}
                          className={cn(
                            "w-full h-full px-1.5 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-400 bg-transparent text-xs transition-colors duration-100",
                            isInStock && "opacity-40 cursor-not-allowed"
                          )}
                        />
                      </td>
                      {/* Predefined ETD date */}
                      <td className={cn("border border-gray-200 p-0", isInStock ? "bg-gray-100" : "bg-indigo-50/30")}>
                        <input
                          type="date"
                          value={rowPredefined.etd || ''}
                          onChange={(e) => updatePredefined(rowIdx, 'etd', e.target.value)}
                          disabled={!canEdit || isInStock}
                          className={cn(
                            "w-full h-full px-1.5 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-400 bg-transparent text-xs transition-colors duration-100",
                            isInStock && "opacity-40 cursor-not-allowed"
                          )}
                        />
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {canEdit && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const newRows = [...tableData.rows, new Array(tableData.headers.length).fill('')];
                    const newPredefined = [...predefinedData, { purchaseType: 'purchase', opd: '', etd: '' }];
                    handleFieldChange(fieldId, name, { ...tableData, rows: newRows, predefinedData: newPredefined }, department, fieldDef);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1.5 px-3 py-1.5 border border-blue-200 rounded-md hover:bg-blue-50 hover:border-blue-300 transition-all duration-150 shadow-sm"
                >
                  <Plus className="h-3 w-3" /> Add Row
                </button>
              </div>
            )}
          </div>
        );

      case 'file':
        const fileAsset = normalizeAssetEntries(fieldValue, { kind: 'file' })[0] || null;
        const fileUrl = getAssetUrl(fileAsset);
        const fileLabel = getAssetLabel(fileAsset, 'Download Excel');
        return (
          <div className="space-y-1 p-1">
            {canEdit && (
              <UploadFile
                srdId={srd?._id}
                fieldId={fieldId}
                onUploaded={(assets) => {
                  const asset = Array.isArray(assets) ? assets[0] : assets;
                  if (asset) {
                    handleFieldChange(fieldId, name, asset, department, fieldDef);
                    toast({
                      title: 'File uploaded',
                      description: 'File uploaded successfully',
                    });
                  }
                }}
              />
            )}
            {fileUrl && (
              <div className="flex items-center p-1 bg-gray-50 border rounded text-xs">
                <FileSpreadsheet className="h-4 w-4 text-green-600 mr-2 flex-shrink-0" />
                <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate flex-1 block" title={fileLabel}>
                  {fileLabel}
                </a>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 ml-1 hover:bg-red-100"
                    onClick={() => handleFieldChange(fieldId, name, null, department, fieldDef)}
                  >
                    <Trash2 className="h-3 w-3 text-red-500" />
                  </Button>
                )}
              </div>
            )}
          </div>
        );

      case 'image':
        const deptImages = normalizeAssetEntries(fieldValue, { kind: 'image' });
        const allImages = deptImages;

        return (
          <div className="space-y-1 p-1">
            {canEdit && (
              <UploadImage
                srdId={srd?._id}
                fieldId={fieldId}
                onUploaded={(assets) => {
                  const imageArray = normalizeAssetEntries(assets, { kind: 'image' });
                  if (imageArray.length > 0) {
                    const currentImages = normalizeAssetEntries(fieldValue, { kind: 'image' });
                    const updatedImages = [...currentImages, ...imageArray];
                    handleFieldChange(fieldId, name, updatedImages, department, fieldDef);
                    toast({
                      title: 'Images uploaded',
                      description: `${imageArray.length} image(s) uploaded.`,
                    });
                  }
                }}
              />
            )}

            {allImages.length > 0 ? (
              <div className="grid grid-cols-3 gap-1">
                {allImages.slice(0, 6).map((asset, idx) => {
                  const isCover = idx === 0;
                  const imageUrl = getAssetUrl(asset);

                  return (
                    <div key={idx} className="relative group aspect-square">
                      <Image
                        src={imageUrl}
                        alt={`${name}-${idx}`}
                        fill
                        className={cn(
                          "object-cover rounded border transition-all",
                          isCover ? "border-yellow-400 border-2" : "border-gray-200"
                        )}
                      />
                      {isCover && (
                        <div className="absolute top-0 left-0 bg-yellow-400 text-yellow-900 px-0.5 py-0.5 rounded-br text-xs">
                          <Star className="h-2 w-2 fill-current" />
                        </div>
                      )}

                      {canEdit && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="flex gap-1">
                            {!isCover && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSetCoverImage(fieldId, name, department, idx, allImages);
                                }}
                                className="bg-yellow-500 hover:bg-yellow-600 text-white p-1 rounded"
                                title="Set as cover"
                              >
                                <Star className="h-2 w-2" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveImage(fieldId, name, department, idx, allImages);
                              }}
                              className="bg-red-500 hover:bg-red-600 text-white p-1 rounded"
                              title="Remove"
                            >
                              <Trash2 className="h-2 w-2" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {allImages.length > 6 && (
                  <div className="aspect-square border border-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
                    +{allImages.length - 6}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-gray-400 text-center py-2 border border-dashed border-gray-300 rounded">
                No images
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="text-xs text-gray-400 text-center py-1">
            Unsupported type
          </div>
        );
    }
  }, [getFieldValue, handleFieldChange, handleRemoveImage, handleSetCoverImage, srd?._id, srd?.createdAt, toast]);

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8">
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-2" />
          <p className="text-sm text-gray-500">Loading template...</p>
        </div>
      </div>
    );
  }

  // No active template
  if (!activeTemplate) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <h3 className="text-sm font-medium text-gray-700">No Active Template</h3>
          <p className="text-xs text-gray-500 mt-1">Please create and activate a print template in the template designer.</p>
        </div>
      </div>
    );
  }

  const gridColumns = activeTemplate.gridColumns || 6;

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-2 flex items-center justify-between">
        <h3 className="font-semibold text-sm">SRD - Excel View (All Departments)</h3>
        <div className="flex items-center space-x-2">
          <Button
            onClick={handlePrint}
            size="sm"
            variant="outline"
            className="h-6 px-2 py-0 text-xs bg-white text-blue-700 border-white hover:bg-blue-50"
            disabled={isPrinting}
          >
            {isPrinting ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Wait...
              </>
            ) : (
              <>
                <Printer className="h-3 w-3 mr-1" />
                Print
              </>
            )}
          </Button>
          {hasUnsavedChanges && (
            <div className="flex items-center text-xs text-yellow-200">
              <div className="animate-pulse w-1.5 h-1.5 bg-yellow-300 rounded-full mr-1"></div>
              Saving...
            </div>
          )}
        </div>
      </div>

      {/* Permission indicator */}
      <div className="bg-gray-50 border-b px-3 py-1.5 text-xs text-gray-600">
        <span className="font-medium">Your role:</span> {userRole?.toUpperCase()} •
        {userRole === 'admin' || userRole === 'vmd'
          ? ' You can edit all fields'
          : ` You can edit ${userRole?.toUpperCase()} fields only`
        }
      </div>

      {/* Grid based on template */}
      <div className="p-0">
        <div
          className="grid gap-0"
          style={{ gridTemplateColumns: `repeat(${gridColumns * 2}, minmax(0, 1fr))` }}
        >
          {activeTemplate.cells.map((cell, cellIndex) => {
            const colSpan = (cell.position?.colSpan || 1) * 2;
            const rowSpan = cell.position?.rowSpan || 1;

            // Handle custom elements
            if (cell.isCustom) {
              return (
                <div
                  key={cellIndex}
                  className="p-1 bg-gray-100"
                  style={{
                    gridColumn: `span ${colSpan} `,
                    gridRow: `span ${rowSpan} `,
                  }}
                >
                  <div className="bg-gray-50 border border-gray-200 rounded p-2 h-full">
                    {cell.customType === 'custom-heading' && (
                      <div className="font-semibold text-gray-800 text-sm">
                        {cell.customValue}
                      </div>
                    )}
                    {cell.customType === 'custom-text' && (
                      <div className="text-gray-600 text-sm">
                        {cell.customValue}
                      </div>
                    )}
                    {cell.customType === 'custom-separator' && (
                      <div className="border-t border-gray-300 my-2"></div>
                    )}
                    {cell.customType === 'custom-empty-field' && (
                      <div className="text-gray-400 text-xs">
                        {cell.customValue}<span className="italic">{cell.customPlaceholder}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            // Handle regular database fields
            // Get fieldId - could be ObjectId, string, or populated object
            let fieldIdStr = null;
            let fieldDef = null;

            if (cell.fieldId) {
              // If fieldId is already populated (an object with _id), use it directly
              if (typeof cell.fieldId === 'object' && cell.fieldId._id) {
                fieldDef = cell.fieldId;
                fieldIdStr = cell.fieldId._id.toString();
              } else {
                // Otherwise look up in our map
                fieldIdStr = cell.fieldId.toString();
                fieldDef = allFieldDefs[fieldIdStr];
              }
            }
            if (!fieldDef) {
              return (
                <div
                  key={cellIndex}
                  className="p-1 bg-red-50"
                  style={{
                    gridColumn: `span ${colSpan} `,
                    gridRow: `span ${rowSpan} `,
                  }}
                >
                  <div
                    className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-500 h-full"
                  >
                    Field not found
                  </div>
                </div>
              );
            }

            const isFieldActive = fieldDef.active !== false; // Active by default if property missing
            // Allow all roles to edit table-type fields
            const canEdit = fieldDef.type === 'table' ? isFieldActive : (canEditField(fieldDef.department) && isFieldActive);
            const isHeading = fieldDef.type === 'heading';
            const isHidden = isFieldHidden(fieldDef);
            const isOptionalEnabled = isOptionalFieldEnabled(fieldIdStr, fieldDef);
            const attachmentLabels = getAttachmentLabels(fieldIdStr);
            const deptBgColor = {
              vmd: 'bg-purple-100',
              cad: 'bg-amber-100',
              commercial: 'bg-emerald-100',
              mmc: 'bg-sky-200',
            };
            const deptBg = deptBgColor[fieldDef.department] || 'bg-gray-100';

            if (isHidden) {
              return (
                <div
                  key={cellIndex}
                  className="p-1 bg-gray-50"
                  style={{
                    gridColumn: `span ${colSpan} `,
                    gridRow: `span ${rowSpan} `,
                  }}
                >
                  <div
                    className="bg-gray-50 border border-gray-100 rounded h-full"
                    style={{
                      opacity: 0.5,
                    }}
                  ></div>
                </div>
              );
            }

            return (
              <div
                key={cellIndex}
                className={cn(
                  deptBg,
                  "p-1"
                )}
                style={{
                  gridColumn: `span ${colSpan} `,
                  gridRow: `span ${rowSpan} `,
                }}
              >
                <div
                  className={cn(
                    "border rounded h-full flex flex-col",
                    isHeading ? "bg-blue-50 border-blue-200" : "bg-transparent border-gray-300",
                    fieldDef.isOptional && !isOptionalEnabled && "bg-gray-50/70 border-dashed border-gray-300",
                    !canEdit && !isHeading && "opacity-75"
                  )}
                >
                  {/* Field header */}
                  {!isHeading && (
                    <div className="bg-transparent border-b border-gray-200 px-2 py-1 flex items-start justify-between gap-2 shrink-0">
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-medium text-gray-700 truncate block" title={fieldDef.name}>
                          {fieldDef.name}
                        </span>
                        
                      </div>
                      <div className="flex items-center gap-2 ml-1">
                        {fieldDef.isOptional && (
                          <div className="flex items-center gap-2 rounded-full bg-white/80 px-2 py-0.5">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                              Optional
                            </span>
                            <Switch
                              checked={isOptionalEnabled}
                              onCheckedChange={(checked) => handleOptionalFieldToggle(fieldIdStr, fieldDef, checked)}
                              disabled={!canEdit}
                              aria-label={`Toggle ${fieldDef.name}`}
                              className="scale-75"
                            />
                          </div>
                        )}
                        {fieldDef.isRequired && (
                          <span className="text-red-500 text-xs font-bold">*</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Field input */}
                  <div className={cn(!isHeading && "p-1", "flex-1")}>
                    {fieldDef.isOptional && !isOptionalEnabled ? (
                      <div className="flex h-full min-h-[64px] items-center justify-center rounded border border-dashed border-gray-300 bg-white/70 px-3 text-center text-xs text-gray-500">
                        {canEdit ? 'Turn on to fill this field.' : 'This optional field is turned off.'}
                      </div>
                    ) : (
                      renderCellInput(fieldDef, fieldIdStr, canEdit)
                    )}
                  </div>
                  {attachmentLabels.length > 0 && (
                          <div className="mt-1 space-x-1 flex flex-row flex-wrap justify-start">
                            {attachmentLabels.map((label, index) => (
                              <div
                                key={`${label}-${index}`}
                                className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700"
                              >
                                {label}
                              </div>
                            ))}
                          </div>
                        )}
                </div>
                
              </div>
              
            );
          })}
        </div>
      </div>

      {/* Department status legend */}
      <div className="bg-gray-50 border-t px-3 py-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-4">
            <span className="text-gray-500">Status:</span>
            {['vmd', 'cad', 'commercial', 'mmc'].map(dept => (
              <Badge
                key={dept}
                className={cn(
                  "text-xs",
                  srd.status?.[dept] === 'approved' && 'bg-green-100 text-green-800',
                  srd.status?.[dept] === 'in-progress' && 'bg-blue-100 text-blue-800',
                  srd.status?.[dept] === 'flagged' && 'bg-red-100 text-red-800',
                  (!srd.status?.[dept] || srd.status?.[dept] === 'pending') && 'bg-gray-100 text-gray-800'
                )}
              >
                {dept.toUpperCase()}: {srd.status?.[dept] || 'pending'}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Status Update Section */}
      <div className="bg-gray-50 border-t border-gray-200 p-3">
        <div className="grid grid-cols-6 gap-2 items-end">
          {/* Department display/selector */}
          <div>
            <Label className="text-xs font-medium text-gray-700">Department</Label>
            {userRole === 'admin' ? (
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="mt-1 px-1 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 w-full bg-white h-7"
                disabled={isSubmitting}
              >
                {['vmd', 'cad', 'commercial', 'mmc'].map(dept => (
                  <option key={dept} value={dept}>{dept.toUpperCase()}</option>
                ))}
              </select>
            ) : (
              <div className="mt-1 px-2 py-1 text-xs border border-gray-300 rounded bg-gray-100 h-7 flex items-center font-medium text-gray-700">
                {userRole?.toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-700">Status</Label>
            <select
              value={statusToUpdate}
              onChange={(e) => setStatusToUpdate(e.target.value)}
              className="mt-1 px-1 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 w-full bg-white h-7"
              disabled={isSubmitting}
            >
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="approved">Approved</option>
              <option value="flagged">Flag Issue</option>
            </select>
          </div>
          <div className="col-span-3">
            <Label htmlFor="updateComment" className="text-xs font-medium text-gray-700">
              Comment {statusToUpdate !== 'flagged' && <span className="text-gray-500">(Optional)</span>}
            </Label>
            <Input
              id="updateComment"
              value={updateComment}
              onChange={(e) => setUpdateComment(e.target.value)}
              placeholder={statusToUpdate === 'flagged' ? 'Describe issue...' : 'Add comment...'}
              required={statusToUpdate === 'flagged'}
              className="mt-1 text-xs h-7 border border-gray-300 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <Button
              onClick={handleStatusUpdate}
              disabled={isSubmitting || (statusToUpdate === 'flagged' && !updateComment.trim())}
              size="sm"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs h-7"
            >
              {isSubmitting ? 'Updating...' : 'Update Status'}
            </Button>
          </div>
        </div>
        <p className="text-xs text-gray-500 text-center mt-1">
          Field changes auto-save. Use button for status/comments only.
        </p>
      </div>

      {srd.audit && srd.audit.length > 0 && (
        <div className="border-t border-gray-200 p-3">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Activity</h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {srd.audit.slice().reverse().map((entry, idx) => {
              // Find comment with matching timestamp (within 1 second tolerance)
              const relatedComment = srd.comments?.find(comment =>
                Math.abs(new Date(comment.date) - new Date(entry.timestamp)) < 1000
              );

              return (
                <div key={idx} className="bg-blue-50 rounded p-2 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-800">
                      {entry.author}
                      {entry.department && (
                        <Badge variant="outline" className="ml-1 text-xs px-1 py-0">
                          {entry.department.toUpperCase()}
                        </Badge>
                      )}
                    </span>
                    <span className="text-gray-400">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-blue-700 font-medium mb-1">{entry.action}</p>
                  {relatedComment && (
                    <div className="mt-2 pl-2 border-l-2 border-blue-300">
                      <p className="text-gray-600 italic">&ldquo;{relatedComment.text}&rdquo;</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}






