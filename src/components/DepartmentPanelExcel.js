'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Trash2, Star, Upload, Printer, FileSpreadsheet, Loader2, Plus, X, Columns, Rows, DiscIcon } from 'lucide-react';
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
import { getAttachedImageLabels, getAttachedFieldInfos } from '@/lib/fieldConnectionUtils';
import DispatchCardPrint from '@/app/dispatch/components/DispatchCardPrint';
// Dynamically import DispatchPanel to avoid circular dependency
const DispatchPanel = dynamic(() => import('./DispatchPanel'), {
  loading: () => <div className="p-4 text-center">Loading Dispatch Panel...</div>
});
import { Send } from 'lucide-react';
import { checkCustomRoutes } from 'next/dist/lib/load-custom-routes';

// Debounced input: keeps local state while typing so parent re-renders don't revert the value
function DebouncedInput({ value, onDebouncedChange, delay = 400, onKeyDown: parentKeyDown, onBlur: parentBlur, maxLength, showCharLimitToast, ...props }) {
  const [local, setLocal] = React.useState(value ?? '');
  const timerRef = React.useRef(null);
  const typingRef = React.useRef(false);
  const toastShownRef = React.useRef(false);

  React.useEffect(() => {
    if (!typingRef.current) setLocal(value ?? '');
  }, [value]);

  const flush = React.useCallback((val) => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    typingRef.current = false;
    onDebouncedChange(val);
  }, [onDebouncedChange]);

  return (
    <input
      {...props}
      value={local}
      maxLength={maxLength}
      onChange={(e) => {
        const v = e.target.value;
        setLocal(v);
        typingRef.current = true;
        
        // Show toast when approaching or at character limit
        if (maxLength && v.length >= maxLength && !toastShownRef.current && showCharLimitToast) {
          showCharLimitToast();
          toastShownRef.current = true;
          setTimeout(() => { toastShownRef.current = false; }, 3000);
        }
        
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => flush(v), delay);
      }}
      onBlur={(e) => { flush(local); parentBlur?.(e); }}
      onKeyDown={(e) => { if (e.key === 'Enter') flush(local); parentKeyDown?.(e); }}
    />
  );
}

function DebouncedTextarea({ value, onDebouncedChange, delay = 400, onBlur: parentBlur, ...props }) {
  const [local, setLocal] = React.useState(value ?? '');
  const timerRef = React.useRef(null);
  const typingRef = React.useRef(false);

  React.useEffect(() => {
    if (!typingRef.current) setLocal(value ?? '');
  }, [value]);

  const flush = React.useCallback((val) => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    typingRef.current = false;
    onDebouncedChange(val);
  }, [onDebouncedChange]);

  return (
    <textarea
      {...props}
      value={local}
      onChange={(e) => {
        const v = e.target.value;
        setLocal(v);
        typingRef.current = true;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => flush(v), delay);
      }}
      onBlur={(e) => { flush(local); parentBlur?.(e); }}
    />
  );
}

function CompactUploadButton({ info, srdId, onUploaded, label }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileSelected = useCallback(async (e) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length || !srdId) return;
    setUploading(true);
    const uploaded = [];
    const isImage = info.type === 'image';
    const assetKind = isImage ? 'image' : 'file';

    for (const file of selected) {
      const fileData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      await new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/uploads');
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onload = () => {
          try {
            const res = JSON.parse(xhr.responseText);
            const asset = normalizeAssetEntries(res?.asset || res?.url, { kind: assetKind })[0] || null;
            if (res?.success && asset) uploaded.push(asset);
            else toast({ title: 'Upload failed', description: res?.error || 'Unknown error', variant: 'destructive' });
          } catch { toast({ title: 'Upload failed', description: 'Could not parse response', variant: 'destructive' }); }
          resolve();
        };
        xhr.onerror = () => { toast({ title: 'Upload failed', description: 'Network error', variant: 'destructive' }); resolve(); };
        xhr.send(JSON.stringify({ fileName: file.name, fileData, srdId, fieldId: info.sourceFieldId, fieldType: assetKind, mimeType: file.type, size: file.size }));
      });
    }

    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
    if (uploaded.length) onUploaded(uploaded.length === 1 && !isImage ? uploaded[0] : uploaded);
  }, [info, srdId, onUploaded, toast]);

  const isImage = info.type === 'image';

  const isPlus = label === '+';

  return (
    <button
      type="button"
      disabled={uploading}
      className={cn(
        "inline-flex items-center gap-1 rounded disabled:opacity-50",
        isPlus
          ? "h-4 w-4 justify-center bg-emerald-100 hover:bg-emerald-200 text-emerald-700"
          : "border border-gray-300 bg-white hover:bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-600"
      )}
      onClick={() => inputRef.current?.click()}
      title={`Attach ${info.name}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={isImage ? 'image/*' : undefined}
        multiple={isImage}
        className="hidden"
        onChange={handleFileSelected}
      />
      {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : (isPlus ? <Plus className="h-3 w-3" /> : <Upload className="h-3 w-3" />)}
      {!isPlus && (label || info.name)}
    </button>
  );
}

export default function DepartmentPanelExcel({
  srd,
  userRole,
  onUpdate,
  onSrdUpdate,
  readOnly = false,
  onHeaderContent,
  onHeaderRightContent,
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
  const [currentPage, setCurrentPage] = useState(0);
  const [sections, setSections] = useState([]);
  const [formPagination, setFormPagination] = useState({ enabled: true, itemsPerPage: 12 });
  const [pendingUpdates, setPendingUpdates] = useState({}); // Track updates per department
  const [showActivityConsole, setShowActivityConsole] = useState(false); // Activity console visibility - default hidden

  // Status update state
  const [selectedDepartment, setSelectedDepartment] = useState(userRole === 'admin' || userRole === 'vmd' ? 'vmd' : userRole);
  const [statusToUpdate, setStatusToUpdate] = useState('approved');
  const [updateComment, setUpdateComment] = useState('');

  // Manual save + idle auto-save
  const idleTimerRef = useRef(null);
  const isSavingRef = useRef(false);
  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;
  const saveAllChangesRef = useRef(null);
  const srdRef = useRef(srd);
  srdRef.current = srd;

  // Check if user can edit a specific field based on its department
  const canEditField = useCallback((fieldDepartment) => {
    return userRole === 'admin' || userRole === 'vmd' || userRole === fieldDepartment;
  }, [userRole]);

  // Show character limit toast
  const showCharLimitToast = useCallback(() => {
    toast({
      title: 'Character Limit Reached',
      description: 'Maximum 20 characters allowed',
      variant: 'destructive',
      duration: 3000,
    });
  }, [toast]);


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

        // Fetch pagination settings
        try {
          const companyRes = await fetch('/api/company');
          const companyData = await companyRes.json();
          const pg = companyData?.paginationSettings;
          if (pg?.srdForm) {
            setFormPagination(pg.srdForm);
          }
          // old flat structure has no srdForm key — keep default
        } catch (err) {
          console.error('Failed to fetch pagination settings:', err);
        }
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
  }, [srd?.dynamicFields]);

  // Process template cells into sections based on pagination settings
  useEffect(() => {
    if (!activeTemplate || !activeTemplate.cells) {
      setSections([]);
      return;
    }

    const allCells = activeTemplate.cells;

    // If pagination disabled, one single page with all cells + approval sections
    if (!formPagination.enabled) {
      setSections([{ name: 'Page 1', cells: allCells, includeApprovals: true }]);
      return;
    }

    // Split cells evenly into chunks of itemsPerPage
    const chunkSize = Math.max(1, formPagination.itemsPerPage);
    const chunks = [];
    for (let i = 0; i < allCells.length; i += chunkSize) {
      chunks.push({
        name: `Page ${chunks.length + 1}`,
        cells: allCells.slice(i, i + chunkSize),
        includeApprovals: false, // Only last page will have approvals
      });
    }
    
    // Mark the last page to include approval sections
    if (chunks.length > 0) {
      chunks[chunks.length - 1].includeApprovals = true;
    }
    
    setSections(chunks.length > 0 ? chunks : [{ name: 'Page 1', cells: allCells, includeApprovals: true }]);
  }, [activeTemplate, formPagination]);

  // Save all pending changes in a single PATCH call
  const saveAllChanges = useCallback(async () => {
    const currentFields = fieldsRef.current;
    if (isSavingRef.current || !currentFields.length) return;

    setIsAutoSaving(true);
    isSavingRef.current = true;
    try {
      const body = { dynamicFields: currentFields };

      // If refNo field was changed, include it at the top level
      const refNoField = currentFields.find(f => f.type === 'refNo');
      if (refNoField) body.refNo = refNoField.value;

      const res = await fetch(`/api/srd/${srdRef.current._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.success) {
        onSrdUpdate?.(data.data);
        setHasUnsavedChanges(false);
        toast({ title: 'Saved', description: 'All changes saved', duration: 2000 });
      } else {
        throw new Error(data.error || 'Save failed');
      }
    } catch (error) {
      console.error('[Save] Failed:', error);
      toast({
        title: 'Save failed',
        description: 'Failed to save changes. Please try again.',
        variant: 'destructive',
        duration: 3000,
      });
    } finally {
      setIsAutoSaving(false);
      isSavingRef.current = false;
    }
  }, [onSrdUpdate, toast]);
  saveAllChangesRef.current = saveAllChanges;

  // Reset idle timer whenever fields change
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      saveAllChangesRef.current?.();
    }, 15000);
  }, []);

  // Cleanup idle timer on unmount
  useEffect(() => {
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
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

  const getAttachmentInfos = useCallback((fieldId) => {
    return getAttachedFieldInfos({
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

              // Connected field changed — idle timer will handle saving
            }
          }
        }
      }

      return newFields;
    });

    setHasUnsavedChanges(true);
    resetIdleTimer();
  }, [allFieldDefs, buildFieldState, resetIdleTimer, findFieldIndex, normalizeFieldId]);

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

  // Determine if a field should be highlighted (empty and belongs to user's role)
  const isFieldHighlighted = useCallback((fieldId, fieldDef, value = null) => {
    if (readOnly) return false;

    // Check ownership: current user's role must match the field's department
    // For VMD, they only get highlights for 'vmd' fields (as per requirement)
    const isOwner = userRole === fieldDef.department;
    if (!isOwner) return false;

    // Check if empty
    const fieldValue = value !== null ? value : getFieldValue(fieldId, fieldDef);
    return !hasMeaningfulValue(fieldValue, fieldDef.type);
  }, [userRole, readOnly, getFieldValue, hasMeaningfulValue]);

  // Check if a field should be hidden based on connection type
  const isFieldHidden = useCallback((fieldDef) => {
    // Hide is-attached source fields (upload UI is shown inline on the target field)
    if (fieldDef.isConnectedTo && fieldDef.connectionType === 'is-attached') {
      return true;
    }

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
        description: 'Click Save to apply changes',
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
      description: 'Click Save to apply changes',
    });
  }, [getFieldValue, handleFieldChange, toast]);

  const handleAttachmentUploaded = useCallback((info, assets) => {
    const sourceFieldDef = info.fieldDef;
    if (!sourceFieldDef) return;

    if (info.type === 'image') {
      const imageArray = normalizeAssetEntries(assets, { kind: 'image' });
      if (imageArray.length > 0) {
        const currentValue = getFieldValue(info.sourceFieldId, sourceFieldDef);
        const currentImages = normalizeAssetEntries(currentValue, { kind: 'image' });
        const updatedImages = [...currentImages, ...imageArray];
        handleFieldChange(info.sourceFieldId, sourceFieldDef.name, updatedImages, sourceFieldDef.department, sourceFieldDef);
        toast({ title: 'Images uploaded', description: `${imageArray.length} image(s) uploaded.` });
      }
    } else {
      const asset = Array.isArray(assets) ? assets[0] : assets;
      if (asset) {
        handleFieldChange(info.sourceFieldId, sourceFieldDef.name, asset, sourceFieldDef.department, sourceFieldDef);
        toast({ title: 'File uploaded', description: 'File uploaded successfully.' });
      }
    }
  }, [getFieldValue, handleFieldChange, toast]);

  const handleAttachmentRemove = useCallback((info) => {
    const sourceFieldDef = info.fieldDef;
    if (!sourceFieldDef) return;
    handleFieldChange(info.sourceFieldId, sourceFieldDef.name, info.type === 'image' ? [] : null, sourceFieldDef.department, sourceFieldDef);
    toast({ title: 'Attachment removed', description: 'Click Save to apply changes.' });
  }, [handleFieldChange, toast]);

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

  useEffect(() => {
    if (!onHeaderContent) return;
    onHeaderContent(
      <div className="flex items-center gap-2">
        <DispatchCardPrint srd={srd} />
        <Button
          onClick={handlePrint}
          size="sm"
          variant="outline"
          className="h-7 px-2 text-app-text"
          disabled={isPrinting}
        >
          {isPrinting ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Wait...</> : <><Printer className="h-3 w-3 mr-1" />Print SRD</>}
        </Button>
        <Button
          onClick={() => saveAllChangesRef.current?.()}
          size="sm"
          variant={hasUnsavedChanges ? "default" : "outline"}
          className={cn("h-7 px-3 text-app-text", hasUnsavedChanges && "bg-blue-600 hover:bg-blue-700 text-white")}
          disabled={isAutoSaving || !hasUnsavedChanges}
        >
          {isAutoSaving ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Saving...</> : <><DiscIcon className="h-3 w-3 mr-1" />Save</>}
        </Button>
        {hasUnsavedChanges && !isAutoSaving && (
          <span className="text-xs text-amber-600 font-medium flex items-center">
            <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mr-1" />
            Unsaved changes
          </span>
        )}
        <div className="flex items-center gap-1 ml-2">
          {['vmd', 'cad', 'commercial', 'mmc'].map(dept => {
            const val = (srd.status || []).find(s => s.department === dept)?.value || 'pending';
            return (
              <span
                key={dept}
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-app-heading font-medium capitalize",
                  val === 'approved' && 'bg-green-100 text-green-800',
                  val === 'in-progress' && 'bg-blue-100 text-blue-800',
                  val === 'flagged' && 'bg-red-100 text-red-800',
                  val === 'pending' && 'bg-gray-100 text-gray-800'
                )}
              >
                {dept}
              </span>
            );
          })}
        </div>
      </div>
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onHeaderContent, srd._id, srd.refNo, JSON.stringify(srd.status), isPrinting, hasUnsavedChanges, isAutoSaving, handlePrint]);

  // Activity Console toggle button — injected into the header right slot (before notifications)
  useEffect(() => {
    if (!onHeaderRightContent) return;
    if (!srd.audit || srd.audit.length === 0) { onHeaderRightContent(null); return; }
    onHeaderRightContent(
      <Button
        onClick={() => setShowActivityConsole(prev => !prev)}
        size="sm"
        variant={showActivityConsole ? "default" : "outline"}
        className={cn("h-8 px-3 text-app-text gap-1.5", showActivityConsole && "bg-gray-800 hover:bg-gray-900 text-white")}
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        Activity
      </Button>
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onHeaderRightContent, showActivityConsole, srd.audit?.length]);

  // Render input cell based on field type
  const renderCellInput = useCallback((fieldDef, fieldId, canEdit) => {
    const fieldValue = getFieldValue(fieldId, fieldDef);
    const { name, type, placeholder, isRequired, department } = fieldDef;

    switch (type) {
      case 'heading':
        return (
          <div className="font-semibold text-app-text px-1 py-0.5">
            {name}
          </div>
        );

      case 'text':
      case 'number':
      case 'date':
      case 'createdAt':
      case 'refNo':
      case 'old-refNo':
        const isAutoField = type === 'createdAt' || type === 'old-refNo';
        const displayValue = type === 'createdAt'
          ? (srd.createdAt ? new Date(srd.createdAt).toISOString().split('T')[0] : '')
          : type === 'refNo'
            ? (fieldValue || srd.refNo || '')
            : type === 'old-refNo'
              ? (fieldValue || '')
              : fieldValue;
        return (
          <div className="flex items-baseline gap-2 w-full px-1 py-0">
            <span className="text-[12px] text-gray-700 font-semibold shrink-0 min-w-[140px]">{name}</span>
            <div className="flex-1 min-w-0 relative">
              <DebouncedInput
                type={type === 'createdAt' ? 'date' : (type === 'refNo' || type === 'old-refNo') ? 'text' : type}
                placeholder={placeholder || ''}
                value={displayValue}
                onDebouncedChange={(val) => handleFieldChange(fieldId, name, val, department, fieldDef)}
                required={isRequired}
                disabled={!canEdit || isAutoField}
                maxLength={20}
                showCharLimitToast={showCharLimitToast}
                className={cn(
                  "w-full bg-transparent border-0 border-b border-gray-400 focus:border-blue-500 focus:outline-none text-app-text py-0 px-0 h-5",
                  !canEdit && "cursor-not-allowed text-gray-500",
                  isFieldHighlighted(fieldId, fieldDef) && "highlight-empty-field"
                )}
              />
            </div>
          </div>
        );

      case 'textarea':
        return (
          <div className="flex items-start gap-2 w-full px-1 py-0">
            <span className="text-[12px] text-gray-700 font-semibold shrink-0 min-w-[140px]">{name}</span>
            <div className="flex-1 min-w-0 relative">
              <DebouncedTextarea
                placeholder={placeholder || ''}
                value={fieldValue}
                onDebouncedChange={(val) => handleFieldChange(fieldId, name, val, department, fieldDef)}
                required={isRequired}
                disabled={!canEdit}
                maxLength={20}
                rows={1}
                className={cn(
                  "w-full bg-transparent border-0 border-b border-gray-400 focus:border-blue-500 focus:outline-none text-app-text py-0 px-0 resize-none leading-tight",
                  !canEdit && "cursor-not-allowed text-gray-500",
                  isFieldHighlighted(fieldId, fieldDef) && "highlight-empty-field"
                )}
              />
            </div>
          </div>
        );

      case 'boolean':
        return (
          <div className="flex items-center gap-2 w-full px-1 py-0">
            <span className="text-[12px] text-gray-700 font-semibold shrink-0 min-w-[140px]">{name}</span>
            <div className={cn(
              "flex items-center gap-3 p-1 rounded transition-all",
              isFieldHighlighted(fieldId, fieldDef) && "highlight-empty-field"
            )}>
              
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name={`field-${fieldId}`}
                    checked={fieldValue === true}
                    onChange={() => handleFieldChange(fieldId, name, true, department, fieldDef)}
                    disabled={!canEdit}
                  className="border-b border-gray-400 focus:border-blue-500 focus:outline-none"
                  />
                  <span className="text-[11px] text-gray-700">Yes</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name={`field-${fieldId}`}
                    checked={fieldValue === false}
                    onChange={() => handleFieldChange(fieldId, name, false, department, fieldDef)}
                    disabled={!canEdit}
                  className="border-b border-gray-400 focus:border-blue-500 focus:outline-none"
                  />
                  <span className="text-[11px] text-gray-700">No</span>
                </label>
            </div>
          </div>
        );

      case 'table':
        const defaultHeaders = Array.isArray(fieldDef.tableHeaders) && fieldDef.tableHeaders.length > 0
          ? fieldDef.tableHeaders.map((h) => typeof h === 'string' ? { name: h, owner: 'global' } : h)
          : [
            { name: 'Item Name', owner: 'global' },
            { name: 'Code', owner: 'global' },
            { name: 'Finish', owner: 'global' },
            { name: 'Size', owner: 'global' }
          ];

        const rawTableData = fieldValue && typeof fieldValue === 'object' && !Array.isArray(fieldValue)
          ? fieldValue
          : {};
        const safeHeaders = Array.isArray(rawTableData.headers) && rawTableData.headers.length > 0
          ? rawTableData.headers.map((h) => typeof h === 'string' ? { name: h, owner: 'global' } : h)
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
            <div className="p-0 flex flex-col w-full">
              <span className="text-app-text font-semibold text-gray-700 uppercase px-1 pb-1">{name}</span>
              {/* Data Cards */}
              <div className="flex flex-col gap-1">
                {tableData.rows?.map((row, rowIdx) => {
                  const rowPredefined = predefinedData[rowIdx] || { purchaseType: 'purchase', opd: '', etd: '' };
                  const isInStock = rowPredefined.purchaseType === 'instock';

                  // Group items for 3-column layout
                  const col1Indexes = [];
                  for (let i = 0; i < Math.min(4, tableData.headers.length); i++) col1Indexes.push(i);

                  const col2Indexes = [];
                  for (let i = 4; i < tableData.headers.length; i++) col2Indexes.push(i);

                  return (
                    <div key={rowIdx} className="relative">
                      <div className="pl-1 grid grid-cols-1 md:grid-cols-3 gap-1">
                        {/* Col 1: First 4 fields */}
                        <div className="flex flex-col gap-0">
                          {col1Indexes.map(idx => {
                            const colOwner = typeof tableData.headers[idx] === 'object' ? tableData.headers[idx].owner : 'global';
                            return (
                            <div key={idx} className={cn("flex items-center text-app-text border-b border-gray-100", colOwner === 'cad' && "bg-amber-50")}>
                              <span className="w-20 flex-shrink-0 font-semibold min-w-[140px] text-gray-700 whitespace-nowrap capitalize break-words pr-2">{(typeof tableData.headers[idx] === 'object' ? tableData.headers[idx].name : tableData.headers[idx]) || `Col ${idx + 1}`}:</span>
                              <div className="flex-1 min-w-0 relative">
                                <DebouncedInput
                                  type="text"
                                  value={row[idx] || ''}
                                  onDebouncedChange={(val) => {
                                    const newRows = [...tableData.rows];
                                    newRows[rowIdx][idx] = val;
                                    handleFieldChange(fieldId, name, { ...tableData, rows: newRows }, department, fieldDef);
                                  }}
                                  className={cn(
                                    "w-full bg-transparent border-0 border-b border-gray-400 focus:border-blue-500 focus:outline-none text-app-text py-0 px-0 h-6",
                                    isFieldHighlighted(fieldId, { ...fieldDef, department: typeof tableData.headers[idx] === 'object' ? tableData.headers[idx].owner : 'global' }, row[idx]) && "highlight-empty-field"
                                  )}
                                  disabled={!canEditField(typeof tableData.headers[idx] === 'object' ? tableData.headers[idx].owner : 'global')}
                                  maxLength={20}
                                  showCharLimitToast={showCharLimitToast}
                                />
                              </div>
                            </div>
                          );
                          })}
                        </div>

                        {/* Col 2: Remaining fields */}
                        <div className="flex flex-col gap-0">
                          {col2Indexes.length > 0 ? (
                            col2Indexes.map(idx => {
                            const colOwner = typeof tableData.headers[idx] === 'object' ? tableData.headers[idx].owner : 'global';
                            return (
                              <div key={idx} className={cn("flex items-center text-app-text border-b border-gray-100", colOwner === 'cad' && "bg-amber-50")}>
                                <span className="w-20 flex-shrink-0  min-w-[140px] font-semibold text-gray-700 capitalize break-words whitespace-nowrap pr-2">{(typeof tableData.headers[idx] === 'object' ? tableData.headers[idx].name : tableData.headers[idx]) || `Col ${idx + 1}`}:</span>
                                <div className="flex-1 min-w-0 relative">
                                  <DebouncedInput
                                    type="text"
                                    value={row[idx] || ''}
                                    onDebouncedChange={(val) => {
                                      const newRows = [...tableData.rows];
                                      newRows[rowIdx][idx] = val;
                                      handleFieldChange(fieldId, name, { ...tableData, rows: newRows }, department, fieldDef);
                                    }}
                                    className={cn(
                                      "w-full bg-transparent border-0 border-b border-gray-400 focus:border-blue-500 focus:outline-none text-app-text py-0 px-0 h-6",
                                      isFieldHighlighted(fieldId, { ...fieldDef, department: typeof tableData.headers[idx] === 'object' ? tableData.headers[idx].owner : 'global' }, row[idx]) && "highlight-empty-field"
                                    )}
                                    disabled={!canEditField(typeof tableData.headers[idx] === 'object' ? tableData.headers[idx].owner : 'global')}
                                    maxLength={20}
                                    showCharLimitToast={showCharLimitToast}
                                  />
                                </div>
                              </div>
                          );
                          })
                          ) : (
                            <div className="text-gray-400 italic text-app-text h-full flex items-center justify-center">-</div>
                          )}
                        </div>

                        {/* Col 3: Predefined Fields - Purchase/Stock, OPD, ETD */}
                        <table className='h-10'>
                          <thead>
                            <tr className='bg-gradient-to-r from-gray-50 to-gray-100'>
                              <th className="border border-gray-200 p-0 bg-indigo-50" style={{ width: '11.11%' }}>
                                <span className="font-semibold text-center text-indigo-700 px-2 py-0.5 block text-[11px]">Purchase/Stock</span>
                              </th>
                              <th className="border border-gray-200 p-0 bg-indigo-50" style={{ width: '11.11%' }}>
                                <span className="font-semibold text-center text-indigo-700 px-2 py-0.5 block text-[11px]">OPD</span>
                              </th>
                              <th className="border border-gray-200 p-0 bg-indigo-50" style={{ width: '11.11%' }}>
                                <span className="font-semibold text-center text-indigo-700 px-2 py-0.5 block text-[11px]">ETD</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className='group/row hover:bg-blue-50/30 transition-colors duration-100'>
                              <td className='border border-gray-200 p-0'>
                                <div className="flex items-center justify-center gap-1 py-0">
                                  <button
                                    onClick={() => canEditField(fieldDef.predefinedFieldsOwner || 'global') && updatePredefined(rowIdx, 'purchaseType', 'purchase')}
                                    disabled={!canEditField(fieldDef.predefinedFieldsOwner || 'global')}
                                    className={cn(
                                      "px-1.5 py-0 rounded text-app-text font-medium border",
                                      !isInStock ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white text-gray-500 border-gray-300 hover:border-blue-400"
                                    )}
                                  >Purchase</button>
                                  <button
                                    onClick={() => canEditField(fieldDef.predefinedFieldsOwner || 'global') && updatePredefined(rowIdx, 'purchaseType', 'instock')}
                                    disabled={!canEditField(fieldDef.predefinedFieldsOwner || 'global')}
                                    className={cn(
                                      "px-1.5 py-0 rounded text-[10px] font-medium border",
                                      isInStock ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" : "bg-white text-gray-500 border-gray-300 hover:border-emerald-400"
                                    )}
                                  >InStock</button>
                                </div>
                              </td>
                              <td className='border border-gray-200 p-0'>
                                <input
                                  type="date"
                                  value={rowPredefined.opd || ''}
                                  onChange={(e) => updatePredefined(rowIdx, 'opd', e.target.value)}
                                  disabled={!canEditField(fieldDef.predefinedFieldsOwner || 'global') || isInStock}
                                  className={cn(
                                    "w-full px-1 py-0 text-app-text bg-white text-gray-700 border-none focus:outline-none transition-all duration-300",
                                    !isInStock && isFieldHighlighted(fieldId, { ...fieldDef, department: fieldDef.predefinedFieldsOwner || 'global' }, rowPredefined.opd) && "highlight-empty-field",
                                    isInStock && "opacity-40 bg-gray-100 cursor-not-allowed"
                                  )}
                                />
                              </td>
                              <td className='border border-gray-200 p-0'>
                                <input
                                  type="date"
                                  value={rowPredefined.etd || ''}
                                  onChange={(e) => updatePredefined(rowIdx, 'etd', e.target.value)}
                                  disabled={!canEditField(fieldDef.predefinedFieldsOwner || 'global') || isInStock}
                                  className={cn(
                                    "w-full px-1 py-0 text-app-text bg-white text-gray-700 border-none focus:outline-none transition-all duration-300",
                                    !isInStock && isFieldHighlighted(fieldId, { ...fieldDef, department: fieldDef.predefinedFieldsOwner || 'global' }, rowPredefined.etd) && "highlight-empty-field",
                                    isInStock && "opacity-40 bg-gray-100 cursor-not-allowed"
                                  )}
                                />
                              </td>
                            </tr>
                          </tbody>


                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }

        // Standard Interactive Table Layout
        return (
          <div className="space-y-1 p-0 overflow-auto max-h-96 flex flex-col w-full">
            <span className="text-app-text font-semibold uppercase px-1 pb-1">{name}</span>
            <div className="border border-gray-200 overflow-hidden">
              <table className="w-full text-app-text border-collapse table-fixed">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100 h-5">
                    {tableData.headers?.map((header, colIdx) => {
                      const headerName = typeof header === 'object' ? header.name : header;
                      const headerOwner = typeof header === 'object' ? header.owner : 'global';
                      const canEditColumn = canEditField(headerOwner);
                      
                      // Apply department background color to table headers
                      const headerDeptBgColor = {
                        vmd: 'bg-gray-100',
                        cad: 'bg-amber-200',
                        commercial: 'bg-emerald-100',
                        mmc: 'bg-sky-200',
                      };
                      const headerBg = headerDeptBgColor[headerOwner] || 'bg-gray-50';
                      
                      return (
                        <th key={colIdx} className={cn("border border-gray-200 p-0 relative group/col", headerBg)}>
                          <div className="flex items-center">
                            {canEditColumn ? (
                              <div className="flex-1 relative">
                                <DebouncedInput
                                  type="text"
                                  value={headerName}
                                  onDebouncedChange={(val) => {
                                    const newHeaders = [...tableData.headers];
                                    newHeaders[colIdx] = typeof header === 'object' ? { ...header, name: val } : { name: val, owner: 'global' };
                                    handleFieldChange(fieldId, name, { ...tableData, headers: newHeaders }, department, fieldDef);
                                  }}
                                  className="w-full border-none focus:outline-none focus:ring-2 focus:ring-blue-400 rounded px-1.5 py-0 font-semibold text-center text-gray-700 leading-none h-4"
                                  placeholder={`Column ${colIdx + 1}`}
                                  disabled={!canEditColumn}
                                  maxLength={20}
                                  showCharLimitToast={showCharLimitToast}
                                />
                              </div>
                            ) : (
                              <span className="font-semibold flex-1 text-center text-gray-700 px-1.5 py-0">{headerName}</span>
                            )}
                            {/* {canEditColumn && tableData.headers.length > 1 && (
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
                            )} */}
                          </div>
                        </th>
                      )
                    })}
                    {canEdit && (
                      <th className="border border-gray-200 p-0 w-9 bg-gray-50">
                        {/* <button
                          onClick={() => {
                            const newOwner = userRole === 'admin' || userRole === 'vmd' ? 'global' : userRole;
                            const newHeaders = [...tableData.headers, { name: `Column ${tableData.headers.length + 1}`, owner: newOwner }];
                            const newRows = tableData.rows.map(row => [...row, '']);
                            handleFieldChange(fieldId, name, { headers: newHeaders, rows: newRows }, department, fieldDef);
                          }}
                          className="w-full h-full flex items-center justify-center py-1.5 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors duration-150"
                          title="Add column"
                        >
                          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                        </button> */}
                      </th>
                    )}
                    {/* Predefined locked headers */}
                    <th className="border border-gray-200 p-0 bg-indigo-50" style={{ width: '11.11%' }}>
                      <span className="font-semibold text-center text-indigo-700 px-1.5 py-0 block text-[11px]">Purchase/Stock</span>
                    </th>
                    <th className="border border-gray-200 p-0 bg-indigo-50" style={{ width: '11.11%' }}>
                      <span className="font-semibold text-center text-indigo-700 px-1.5 py-0 block text-[11px]">OPD</span>
                    </th>
                    <th className="border border-gray-200 p-0 bg-indigo-50" style={{ width: '11.11%' }}>
                      <span className="font-semibold text-center text-indigo-700 px-1.5 py-0 block text-[11px]">ETD</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.rows?.map((row, rowIdx) => {
                    const rowPredefined = predefinedData[rowIdx] || { purchaseType: 'purchase', opd: '', etd: '' };
                    const isInStock = rowPredefined.purchaseType === 'instock';

                    return (
                      <tr key={rowIdx} className="hover:bg-blue-50/30 transition-colors duration-100 h-5">
                        {row.map((cell, colIdx) => {
                          const colOwner = typeof tableData.headers[colIdx] === 'object' ? tableData.headers[colIdx].owner : 'global';
                          const canEditColumn = canEditField(colOwner);
                          
                          // Apply department background color to table cells
                          const cellDeptBgColor = {
                            vmd: 'bg-gray-100',
                            cad: 'bg-amber-200',
                            commercial: 'bg-emerald-100',
                            mmc: 'bg-sky-200',
                          };
                          const cellBg = cellDeptBgColor[colOwner] || 'bg-white';
                          
                          return (
                            <td key={colIdx} className={cn("border border-gray-200 p-0 relative", cellBg)}>
                              {canEditColumn ? (
                                <div>
                                  <DebouncedInput
                                    type="text"
                                    value={cell}
                                    onDebouncedChange={(val) => {
                                      const newRows = [...tableData.rows];
                                      newRows[rowIdx][colIdx] = val;
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
                                    className={cn(
                                      "w-full h-4 px-1.5 py-0 leading-none border-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-blue-50/50 bg-transparent transition-all duration-300",
                                      isFieldHighlighted(fieldId, { ...fieldDef, department: colOwner }, cell) && "highlight-empty-field"
                                    )}
                                    disabled={!canEditColumn}
                                    maxLength={20}
                                    showCharLimitToast={showCharLimitToast}
                                  />
                                </div>
                              ) : (
                                <span className="px-1.5 py-0 block text-app-text">{cell}</span>
                              )}
                            </td>
                          )
                        })}
                        {canEdit && (
                          <td className="border border-gray-200 p-0 w-9 text-center">
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
                              className="w-full flex items-center justify-center py-0 opacity-0 group-hover/row:opacity-100 transition-opacity duration-150 text-red-400 hover:text-red-600 hover:bg-red-50"
                              title="Delete row"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </td>
                        )}
                        {/* Predefined Purchase/Stock toggle */}
                        <td className="border border-gray-200 p-0 bg-indigo-50/30">
                          <div className="flex items-center justify-center gap-0.5 px-0.5 py-0">
                            <button
                              onClick={() => canEditField(fieldDef.predefinedFieldsOwner || 'global') && updatePredefined(rowIdx, 'purchaseType', 'purchase')}
                              disabled={!canEditField(fieldDef.predefinedFieldsOwner || 'global')}
                              className={cn(
                                "px-1 py-0 rounded text-[9px] leading-none font-medium transition-all duration-150 border h-4",
                                !isInStock
                                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                  : "bg-white text-gray-500 border-gray-300 hover:border-blue-400 hover:text-blue-600",
                                !canEditField(fieldDef.predefinedFieldsOwner || 'global') && "opacity-50 cursor-not-allowed"
                              )}
                            >
                              Purchase
                            </button>
                            <button
                              onClick={() => canEditField(fieldDef.predefinedFieldsOwner || 'global') && updatePredefined(rowIdx, 'purchaseType', 'instock')}
                              disabled={!canEditField(fieldDef.predefinedFieldsOwner || 'global')}
                              className={cn(
                                "px-1 py-0 rounded text-[9px] leading-none font-medium transition-all duration-150 border h-4",
                                isInStock
                                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                  : "bg-white text-gray-500 border-gray-300 hover:border-emerald-400 hover:text-emerald-600",
                                !canEditField(fieldDef.predefinedFieldsOwner || 'global') && "opacity-50 cursor-not-allowed"
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
                            disabled={!canEditField(fieldDef.predefinedFieldsOwner || 'global') || isInStock}
                            className={cn(
                              "w-full h-full px-1.5 py-0 border-none focus:outline-none focus:ring-2 focus:ring-blue-400 text-app-text transition-all duration-300",
                              !isInStock && isFieldHighlighted(fieldId, { ...fieldDef, department: fieldDef.predefinedFieldsOwner || 'global' }, rowPredefined.opd) && "highlight-empty-field",
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
                            disabled={!canEditField(fieldDef.predefinedFieldsOwner || 'global') || isInStock}
                            className={cn(
                              "w-full h-full px-1.5 py-0 border-none focus:outline-none focus:ring-2 focus:ring-blue-400  text-app-text transition-all duration-300",
                              !isInStock && isFieldHighlighted(fieldId, { ...fieldDef, department: fieldDef.predefinedFieldsOwner || 'global' }, rowPredefined.etd) && "highlight-empty-field",
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
                  className="text-app-text text-blue-600 hover:text-blue-700 flex items-center gap-1.5 px-3 py-1.5 border border-blue-200 rounded-md hover:bg-blue-50 hover:border-blue-300 transition-all duration-150 shadow-sm"
                >
                  <Plus className="h-3 w-3" />
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
          <div className={cn(
            "space-y-1 p-1 rounded transition-all duration-300",
            isFieldHighlighted(fieldId, fieldDef) && "highlight-empty-field"
          )}>
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
              <div className="flex items-center p-1 bg-gray-50 border rounded text-app-text">
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
          <div className={cn(
            "h-full  transition-all duration-300 border-2 border-dashed border-gray-300 rounded-lg ",
            isFieldHighlighted(fieldId, fieldDef) && "highlight-empty-field"
          )}>
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

            {/* {allImages.length > 0 ? (
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
                        <div className="absolute top-0 left-0 bg-yellow-400 text-yellow-900 px-0.5 py-0.5 rounded-br text-app-text">
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
                  <div className="aspect-square border border-gray-200 rounded flex items-center justify-center text-app-text text-gray-500">
                    +{allImages.length - 6}
                  </div>
                )}
              </div>
            ) : (
              <></>
            )} */}
          </div>
        );

      default:
        return (
          <div className="text-app-text text-gray-400 text-center py-1">
            Unsupported type
          </div>
        );
    }
  }, [getFieldValue, handleFieldChange, handleRemoveImage, handleSetCoverImage, srd?._id, srd?.createdAt, toast]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-full bg-white border border-gray-200 rounded-lg p-8">
        <div className="flex flex-1 h-full flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-2" />
          <p className="text-app-text text-gray-500">Loading template...</p>
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
          <h3 className="text-app-text font-medium text-gray-700">No Active Template</h3>
          <p className="text-app-text text-gray-500 mt-1">Please create and activate a print template in the template designer.</p>
        </div>
      </div>
    );
  }

  const gridColumns = activeTemplate.gridColumns || 6;
  const currentSection = sections[currentPage] || { name: 'Page 1', cells: activeTemplate?.cells || [] };
  const isFirstPage = currentPage === 0;
  const isLastPage = currentPage === sections.length - 1;

  // Separate top-level section header row from the rest of the cells.
  // A "section header" is a custom-heading whose colSpan fills a column slot
  // and appears consecutively at the start of the cell list (or after the first row).
  // We detect them by finding the first run of custom-headings that together sum to gridColumns.
  const cells = currentSection.cells;
  let headerCells = [];
  let bodyCells = cells;

  // Find a contiguous block of custom-headings that sums to exactly gridColumns
  for (let start = 0; start < Math.min(cells.length, 6); start++) {
    let sum = 0;
    let end = start;
    while (end < cells.length) {
      const c = cells[end];
      if (c.isCustom && c.customType === 'custom-heading') {
        sum += (c.position?.colSpan || 1);
        end++;
        if (sum >= gridColumns) break;
      } else {
        break;
      }
    }
    if (Math.abs(sum - gridColumns) < 0.1 && end > start) {
      headerCells = cells.slice(start, end);
      bodyCells = [...cells.slice(0, start), ...cells.slice(end)];
      break;
    }
  }

  return (
    <div className="flex gap-0 bg-[#FBFCFE] rounded-lg overflow-hidden flex-1 min-h-0 p-1">
      {/* Main Form Area */}
      <div className="flex flex-col flex-1 min-h-0 overflow-y-hidden pb-10 shadow-lg">

      {/* Section header row — always aligned */}
      {headerCells.length > 0 && (
        <div
          className="grid gap-0 border-b border-gray-300 bg-gray-50 sticky top-0 z-10"
          style={{ gridTemplateColumns: `repeat(${gridColumns * 2}, minmax(0, 1fr))` }}
        >
          {headerCells.map((cell, i) => (
            <div
              key={i}
              className="border-r border-gray-200 last:border-r-0 px-2 py-1"
              style={{ gridColumn: `span ${(cell.position?.colSpan || 1) * 2}` }}
            >
              <span className="text-app-heading font-bold text-gray-700 uppercase tracking-wide">
                {cell.customValue}
              </span>
            </div>
          ))}
        </div>
      )}
      <div className='flex-1 overflow-y-auto custom-scrollbar min-h-0'>
        {/* Grid based on template ------------------------------------------------------------*/}
        <div className="p-0 ">
          <div
            className="grid gap-0"
            style={{ gridTemplateColumns: `repeat(${gridColumns * 2}, minmax(0, 1fr))` }}
          >
            {bodyCells.map((cell, cellIndex) => {
              const colSpan = (cell.position?.colSpan || 1) * 2;
              const rowSpan = cell.position?.rowSpan || 1;

              // Handle custom elements
              if (cell.isCustom) {
                return (
                  <div
                    key={cellIndex}
                    className="border-b border-gray-200 bg-gray-50"
                    style={{
                      gridColumn: `span ${colSpan} `,
                      gridRow: `span ${rowSpan} `,
                    }}
                  >
                    <div className="h-full px-1 py-0.5">
                      {cell.customType === 'custom-heading' && (
                        <div className="font-semibold text-gray-800 text-app-text">
                          {cell.customValue}
                        </div>
                      )}
                      {cell.customType === 'custom-text' && (
                        <div className="text-gray-600 text-app-text">
                          {cell.customValue}
                        </div>
                      )}
                      {cell.customType === 'custom-separator' && (
                        <div className="border-t border-gray-300 my-2"></div>
                      )}
                      {cell.customType === 'custom-empty-field' && (
                        <div className="text-gray-400 text-app-text">
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
                      className="bg-red-50 border border-red-200 rounded p-2 text-app-text text-red-500 h-full"
                    >
                      Field not found
                    </div>
                  </div>
                );
              }

              const isFieldActive = fieldDef.active !== false; // Active by default if property missing
              // Allow all roles to edit table-type fields, unless in readOnly mode
              const canEdit = readOnly ? false : (fieldDef.type === 'table' ? isFieldActive : (canEditField(fieldDef.department) && isFieldActive));
              const isHeading = fieldDef.type === 'heading';
              const isHidden = isFieldHidden(fieldDef);
              const isOptionalEnabled = isOptionalFieldEnabled(fieldIdStr, fieldDef);
              const attachmentInfos = getAttachmentInfos(fieldIdStr);
              
              const deptBgColor = {
                vmd: 'bg-gray-100',
                cad: 'bg-amber-200',
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
                    "border-b border-gray-200",
                    isHeading ? "bg-gray-50" : deptBg
                  )}
                  style={{
                    gridColumn: `span ${colSpan} `,
                    gridRow: `span ${rowSpan} `,
                    backgroundColor: !isHeading && fieldDef.department === 'cad' ? '#fef3c7' : undefined,
                  }}
                >
                  <div
                    className={cn(
                      "h-full flex flex-col justify-center",
                      isHeading && "bg-gray-50",
                      fieldDef.isOptional && !isOptionalEnabled && "opacity-60"
                    )}
                  >
                    {/* Optional toggle */}
                    {!isHeading && fieldDef.isOptional && (
                      <div className="flex items-center justify-between px-1 py-0">
                        { <span className="text-[11px] text-gray-600 shrink-0 min-w-[90px]">{(fieldDef.isOptional && !isOptionalEnabled)&& fieldDef.name}</span>}
                        <Switch
                          checked={isOptionalEnabled}
                          onCheckedChange={(checked) => handleOptionalFieldToggle(fieldIdStr, fieldDef, checked)}
                          disabled={!canEdit}
                          aria-label={`Toggle ${fieldDef.name}`}
                          className="scale-75"
                        />
                      </div>
                    )}

                    {/* Field input — only shown when optional is enabled (or field is not optional) */}
                    <div className="flex-1">
                      {fieldDef.isOptional && !isOptionalEnabled ? null : (
                        renderCellInput(fieldDef, fieldIdStr, canEdit)
                      )}
                    </div>
                    {attachmentInfos.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1 px-1">
                        {attachmentInfos.map((info) => {
                          const hasAssets = info.assetCount > 0;
                          const sourceFieldDef = info.fieldDef;
                          const canUploadToSource = readOnly
                            ? false
                            : (canEditField(sourceFieldDef?.department) && sourceFieldDef?.active !== false);

                          if (hasAssets) {
                            return (
                              <div key={info.sourceFieldId} className="flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5">
                                <span className="text-[10px] font-medium text-emerald-700">
                                  {info.name} attached
                                </span>
                                {canUploadToSource && (
                                  <>
                                    <CompactUploadButton
                                      info={info}
                                      srdId={srd?._id}
                                      onUploaded={(assets) => handleAttachmentUploaded(info, assets)}
                                      label="+"
                                    />
                                    <button
                                      type="button"
                                      className="h-4 w-4 inline-flex items-center justify-center rounded bg-red-100 hover:bg-red-200 text-red-600"
                                      onClick={() => handleAttachmentRemove(info)}
                                      title={`Remove ${info.name}`}
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </>
                                )}
                              </div>
                            );
                          }

                          if (!canUploadToSource) return null;
                          return (
                            <CompactUploadButton
                              key={info.sourceFieldId}
                              info={info}
                              srdId={srd?._id}
                              onUploaded={(assets) => handleAttachmentUploaded(info, assets)}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>

              );
            })}
          </div>
        </div>

        {/* Approval Sections - Rendered inside grid on last page */}
        {currentSection?.includeApprovals && (
          <>
            {/* Status Update Section - Hidden in readOnly mode */}
            {!readOnly && (
              <div className=" border-transparent p-3 hidden">
                <div className="grid grid-cols-6 gap-2 items-end">
                  <div>
                    <Label className="text-app-text font-medium text-gray-700">Department</Label>
                    {userRole === 'admin' || userRole === 'vmd' ? (
                      <select
                        value={selectedDepartment}
                        onChange={(e) => setSelectedDepartment(e.target.value)}
                        className="mt-1 px-1 py-1 text-app-text border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 w-full bg-white h-7"
                        disabled={isSubmitting}
                      >
                        {['vmd', 'cad', 'commercial', 'mmc'].map(dept => (
                          <option key={dept} value={dept}>{dept.toUpperCase()}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="mt-1 px-2 py-1 text-app-text border border-gray-300 rounded bg-gray-100 h-7 flex items-center font-medium text-gray-700">
                        {userRole?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="text-app-text font-medium text-gray-700">Status</Label>
                    <select
                      value={statusToUpdate}
                      onChange={(e) => setStatusToUpdate(e.target.value)}
                      className="mt-1 px-1 py-1 text-app-text border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 w-full bg-white h-7"
                      disabled={isSubmitting}
                    >
                      <option value="pending">Pending</option>
                      <option value="in-progress">In Progress</option>
                      <option value="approved">Approved</option>
                      <option value="flagged">Flag Issue</option>
                    </select>
                  </div>
                  <div className="col-span-3">
                    <Label htmlFor="updateComment" className="text-app-text font-medium text-gray-700">
                      Comment {statusToUpdate !== 'flagged' && <span className="text-gray-500">(Optional)</span>}
                    </Label>
                    <Input
                      id="updateComment"
                      value={updateComment}
                      onChange={(e) => setUpdateComment(e.target.value)}
                      placeholder={statusToUpdate === 'flagged' ? 'Describe issue...' : 'Add comment...'}
                      required={statusToUpdate === 'flagged'}
                      className="mt-1 text-app-text h-7 border border-gray-300 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <Button
                      onClick={handleStatusUpdate}
                      disabled={isSubmitting || (statusToUpdate === 'flagged' && !updateComment.trim())}
                      size="sm"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-app-text h-7"
                    >
                      {isSubmitting ? 'Updating...' : 'Update Status'}
                    </Button>
                  </div>
                </div>
                <p className="text-app-text text-gray-500 text-center mt-1">
                  Field changes auto-save. Use button for status/comments only.
                </p>
              </div>
            )}

            {/* Render Dispatch Panel if applicable - Hidden in readOnly mode to avoid circular display */}
            {!readOnly && (srd?.inDispatch) && (
              <div className="border-gray-200">
                <DispatchPanel
                  srd={srd}
                  onUpdate={onSrdUpdate}
                  canEdit={userRole === 'dispatch' || userRole === 'vmd' || userRole === 'admin'}
                />
              </div>
            )}
          </>
        )}
      </div>  
      {/* Pagination Controls */}
      {sections.length > 1 && (
        <div className="flex items-center justify-center gap-3 py-3">
          <button
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={isFirstPage}
            className="w-7 h-7 rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            aria-label="Previous page"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <span className="text-app-text text-gray-700 font-medium min-w-[60px] text-center">
            {currentPage + 1} of {sections.length}
          </span>

          <button
            onClick={() => setCurrentPage(Math.min(sections.length - 1, currentPage + 1))}
            disabled={isLastPage}
            className="w-7 h-7 rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            aria-label="Next page"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      )}

      </div>
      {/* End Main Form Area */}

      {/* Activity Sidebar Console */}
      {srd.audit && srd.audit.length > 0 && (
        <div
          className="border-gray-300 bg-gray-50 flex flex-col h-full overflow-hidden"
          style={{
            width: showActivityConsole ? '320px' : '0px',
            borderLeftWidth: showActivityConsole ? '1px' : '0px',
            transition: 'width 300ms ease, border-left-width 300ms ease',
          }}
        >
          <div className="px-3 py-3 border-b border-gray-300 bg-gray-100 flex-shrink-0 flex items-center justify-between" style={{ minWidth: '320px' }}>
            <h4 className="text-app-heading font-bold text-gray-800 uppercase tracking-wide">Activity Console</h4>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar" style={{ minWidth: '320px' }}>
            {srd.audit.slice().reverse().map((entry, idx) => {
              // Find comment with matching timestamp (within 1 second tolerance)
              const relatedComment = srd.comments?.find(comment =>
                Math.abs(new Date(comment.date) - new Date(entry.timestamp)) < 1000
              );

              return (
                <div key={idx} className="bg-white border border-gray-200 rounded p-2 text-app-text hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between mb-1 gap-2">
                    <div className="flex-1">
                      <span className="font-semibold text-gray-900 block">
                        {entry.author}
                      </span>
                      {entry.department && (
                        <Badge variant="outline" className="mt-1 text-app-text px-1.5 py-0 bg-gray-100">
                          {entry.department.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                    <span className="text-app-text text-gray-500 whitespace-nowrap">
                      {new Date(entry.timestamp).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p className="text-gray-700 font-medium leading-tight">{entry.action}</p>
                  {relatedComment && (
                    <div className="mt-2 pl-2 border-l-2 border-gray-300 bg-gray-50 p-1.5 rounded-r">
                      <p className="text-gray-600 italic text-app-text">&ldquo;{relatedComment.text}&rdquo;</p>
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






