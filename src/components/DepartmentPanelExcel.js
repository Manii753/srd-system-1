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
import { AlertCircle, Trash2, Star, Upload, Printer, FileSpreadsheet, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import UploadImage from './UploadImage';
import UploadFile from './UploadFile';
import { useToast } from '@/lib/use-toast';

export default function DepartmentPanelExcel({
  srd,
  userRole,
  onUpdate,
}) {
  const { toast } = useToast();
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [allFieldDefs, setAllFieldDefs] = useState([]);
  const [fields, setFields] = useState(srd.dynamicFields || []);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState({}); // Track updates per department

  // Status update state
  const [selectedDepartment, setSelectedDepartment] = useState(userRole === 'admin' || userRole === 'vmd' ? 'vmd' : userRole);
  const [statusToUpdate, setStatusToUpdate] = useState('pending');
  const [updateComment, setUpdateComment] = useState('');

  // Auto-save functionality
  const autoSaveTimeoutsRef = useRef({});
  const lastSavedFieldsRef = useRef(JSON.stringify(fields));

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

        // Initialize fields from SRD
        setFields(srd.dynamicFields || []);
        lastSavedFieldsRef.current = JSON.stringify(srd.dynamicFields || []);
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
  }, [srd, toast]);

  // Auto-save function with debouncing - saves per department
  const debouncedAutoSave = useCallback(async (fieldsToSave, department) => {
    if (autoSaveTimeoutsRef.current[department]) {
      clearTimeout(autoSaveTimeoutsRef.current[department]);
    }

    autoSaveTimeoutsRef.current[department] = setTimeout(async () => {
      const deptFields = fieldsToSave.filter(f => f.department === department);

      if (deptFields.length > 0) { // Removed !isSubmitting check to allow parallel saves
        try {
          // setIsSubmitting(true); // Don't block global submitting state for background saves

          const updateData = {
            status: srd.status?.[department] || 'pending',
            fields: deptFields,
          };

          await onUpdate(department, updateData);

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
          // setIsSubmitting(false); 
          delete autoSaveTimeoutsRef.current[department];
        }
      }
    }, 1500);
  }, [srd.status, onUpdate, toast]); // Removed isSubmitting dependency

  useEffect(() => {
    return () => {
      // Clear all timeouts on unmount
      Object.values(autoSaveTimeoutsRef.current).forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  // Handle field change with department tracking
  const handleFieldChange = useCallback((fieldId, name, value, department, fieldDef = null) => {
    setFields(prev => {
      const existingFieldIndex = prev.findIndex(f =>
        (f.originalFieldId === fieldId) ||
        (f.field?._id === fieldId) ||
        (f.name === name && f.department === department)
      );

      let newFields;
      if (existingFieldIndex > -1) {
        newFields = [...prev];
        newFields[existingFieldIndex] = { ...newFields[existingFieldIndex], value };
      } else {
        newFields = [...prev, {
          name,
          value,
          department,
          originalFieldId: fieldId,
        }];
      }

      // Handle Connected Fields
      // We must check if the modified field has connection properties
      // First, try to find the full field definition from the instance data (preferred)
      // or use the passed fieldDef or look it up in allFieldDefs
      let currentFieldDef = newFields[existingFieldIndex > -1 ? existingFieldIndex : newFields.length - 1];

      // If instance doesn't have connection info (e.g. legacy), try to merge with static def
      if (!currentFieldDef.isConnectedTo && fieldDef) {
        currentFieldDef = { ...fieldDef, ...currentFieldDef };
      }

      // 1. Auto-True Logic
      if (currentFieldDef.isConnectedTo && currentFieldDef.connectionType === 'auto-true' && value === true) {
        let connectedFieldId = currentFieldDef.connectedFieldId;
        // Handle populated object or string ID
        if (connectedFieldId && typeof connectedFieldId === 'object' && connectedFieldId._id) {
          connectedFieldId = connectedFieldId._id;
        }

        if (connectedFieldId) {
          // Find the connected field in current fields
          let connectedIndex = newFields.findIndex(f => {
            const fId = f.originalFieldId || (f.field && typeof f.field === 'object' ? f.field._id : f.field);
            return fId?.toString() === connectedFieldId?.toString();
          });

          console.log('Connected index found:', connectedIndex);

          // If not found in current fields, try to add it from definitions
          if (connectedIndex === -1 && allFieldDefs[connectedFieldId]) {
            const connectedDef = allFieldDefs[connectedFieldId];
            console.log('Connected field not in state, adding from defs:', connectedDef.name);

            newFields.push({
              originalFieldId: connectedFieldId,
              name: connectedDef.name,
              type: connectedDef.type,
              department: connectedDef.department,
              value: '', // Initial value
              fieldVersion: new Date(),
              isConnectedTo: connectedDef.isConnectedTo,
              connectedFieldId: connectedDef.connectedFieldId,
              connectionType: connectedDef.connectionType
            });
            connectedIndex = newFields.length - 1;
          }

          if (connectedIndex > -1) {
            const connectedField = newFields[connectedIndex];

            // Only update if not already true
            if (connectedField.value !== true) {
              newFields[connectedIndex] = { ...connectedField, value: true };

              // Trigger auto-save for the connected field's department if different
              if (connectedField.department !== department) {
                debouncedAutoSave(newFields, connectedField.department);
              }
            }
          }
        }
      }

      // Trigger auto-save for this department
      debouncedAutoSave(newFields, department);

      return newFields;
    });

    setHasUnsavedChanges(true);
  }, [debouncedAutoSave, allFieldDefs]);

  // Get field value from SRD dynamicFields by fieldId - memoized
  const getFieldValue = useCallback((fieldId, fieldDef) => {
    const srdField = fields.find(f =>
      (f.originalFieldId && f.originalFieldId.toString() === fieldId?.toString()) ||
      (f.field?._id && f.field._id.toString() === fieldId?.toString()) ||
      (f.name === fieldDef?.name && f.department === fieldDef?.department)
    );
    return srdField?.value ?? '';
  }, [fields]);

  // Check if a field should be hidden based on toggle-active connection
  const isFieldHidden = useCallback((fieldDef) => {
    if (!fieldDef.isConnectedTo || fieldDef.connectionType !== 'toggle-active') {
      return false;
    }

    const connectedFieldId = fieldDef.connectedFieldId;
    if (!connectedFieldId) return false;

    // Find the connected field value in current fields
    const connectedField = fields.find(f => {
      const fId = f.originalFieldId || (f.field && typeof f.field === 'object' ? f.field._id : f.field);
      return fId?.toString() === connectedFieldId?.toString();
    });

    // If connected field is true, hide this field
    return connectedField?.value === true;
  }, [fields]);

  const handleRemoveImage = useCallback((fieldId, name, department, imageIndex, allImages) => {
    const imageToRemove = allImages[imageIndex];
    const fieldValue = getFieldValue(fieldId, { name, department });
    const deptImages = Array.isArray(fieldValue) ? fieldValue : (fieldValue ? [fieldValue] : []);

    if (deptImages.includes(imageToRemove)) {
      const updatedImages = deptImages.filter(img => img !== imageToRemove);
      handleFieldChange(fieldId, name, updatedImages, department);
      toast({
        title: 'Image removed',
        description: 'Changes will be saved automatically',
      });
    } else {
      toast({
        title: 'Cannot remove',
        description: 'This is a global image. Only department images can be removed.',
        variant: 'destructive',
      });
    }
  }, [getFieldValue, handleFieldChange, toast]);

  const handleSetCoverImage = useCallback((fieldId, name, department, imageIndex, allImages) => {
    const coverImage = allImages[imageIndex];
    const fieldValue = getFieldValue(fieldId, { name, department });
    const deptImages = Array.isArray(fieldValue) ? fieldValue : (fieldValue ? [fieldValue] : []);
    const otherImages = deptImages.filter(img => img !== coverImage);
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

  // This is the updated handlePrint function for DepartmentPanelExcel.jsx
  // Replace the existing handlePrint function with this one

  const handlePrint = async () => {
    try {
      // Fetch the active print template
      const templateRes = await fetch('/api/printTemplate');
      const templates = await templateRes.json();

      const activeTemplateForPrint = Array.isArray(templates)
        ? templates.find(t => t.isActive)
        : null;

      if (!activeTemplateForPrint) {
        toast({
          title: 'No active template',
          description: 'Please create and activate a print template in the template designer.',
          variant: 'destructive',
        });
        return;
      }

      // Fetch all field definitions to get field metadata
      const allFieldDefsForPrint = [];
      for (const dept of ['vmd', 'cad', 'commercial', 'mmc']) {
        try {
          const res = await fetch(`/api/newField?department=${dept}`);
          const data = await res.json();
          if (Array.isArray(data)) {
            allFieldDefsForPrint.push(...data);
          }
        } catch (err) {
          console.error(`Failed to fetch ${dept} fields:`, err);
        }
      }

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast({
          title: 'Print blocked',
          description: 'Please allow popups for this site to enable printing',
          variant: 'destructive',
        });
        return;
      }

      // Build the print content using the template
      const gridColumns = activeTemplateForPrint.gridColumns || 6;
      let fieldsHTML = '';

      activeTemplateForPrint.cells.forEach(cell => {
        const colSpan = cell.position?.colSpan || 1;
        const rowSpan = cell.position?.rowSpan || 1;
        const height = cell.position?.height || 'auto';

        const minHeight =
          height === 'small' ? '12px' :
            height === 'medium' ? '25px' :
              height === 'large' ? '50px' :
                height === 'xlarge' ? '90px' : 'auto';

        // Handle custom elements
        if (cell.isCustom) {
          const customType = cell.customType;
          const customValue = cell.customValue || '';
          const customPlaceholder = cell.customPlaceholder || '';

          let customHTML = '';

          switch (customType) {
            case 'custom-heading':
              customHTML = `
            <div class="field-cell cell-heading" style="grid-column: span ${colSpan}; grid-row: span ${rowSpan}; min-height: ${minHeight};">
              <div class="heading-content" style="text-align: left; width: 100%;">${customValue}</div>
            </div>
          `;
              break;

            case 'custom-text':
              customHTML = `
              <div class="field-cell" style="grid-column: span ${colSpan}; grid-row: span ${rowSpan}; min-height: ${minHeight};">
                <div class="static-text">${customValue}</div>
              </div>
            `;
              break;

            case 'custom-empty-field':
              customHTML = `
              <div class="field-cell" style="grid-column: span ${colSpan}; grid-row: span ${rowSpan}; min-height: ${minHeight};">
                <div class="cell-content">
                  <span class="cell-label">${customValue}</span>
                  <span class="">${customPlaceholder ? `<span class="placeholder-text">${customPlaceholder}</span>` : ''}</span>
                </div>
              </div>
            `;
              break;

            case 'custom-textarea':
              customHTML = `
              <div class="field-cell" style="grid-column: span ${colSpan}; grid-row: span ${rowSpan}; min-height: ${minHeight};">
                <div class="textarea-container">
                  <div class="textarea-label">${customValue}:</div>
                  <div class="textarea-box">${customPlaceholder ? `<span class="placeholder-text">${customPlaceholder}</span>` : ''}</div>
                </div>
              </div>
            `;
              break;

            case 'custom-separator':
              customHTML = `
              <div class="field-cell separator-cell" style="grid-column: span ${colSpan}; grid-row: span ${rowSpan};">
                <div class="separator-line"></div>
              </div>
            `;
              break;

            case 'custom-signature':
              customHTML = `
              <div class="field-cell signature-cell" style="grid-column: span ${colSpan}; grid-row: span ${rowSpan}; min-height: ${minHeight};">
                <div class="signature-container">
                  <div class="signature-label">${customValue}</div>
                  <div class="signature-line"></div>
                  <div class="signature-helper">SIGNATURE & DATE</div>
                </div>
              </div>
            `;
              break;

            default:
              customHTML = `
              <div class="field-cell" style="grid-column: span ${colSpan}; grid-row: span ${rowSpan}; min-height: ${minHeight};">
                <div class="cell-content">
                  <span class="cell-underline"></span>
                </div>
              </div>
            `;
          }

          fieldsHTML += customHTML;
          return;
        }

        // Handle regular database fields
        // Find the field definition
        const fieldDef = allFieldDefsForPrint.find(f => f._id.toString() === cell.fieldId?.toString());
        if (!fieldDef) {
          console.warn(`Field definition not found for ID: ${cell.fieldId}`);
          return;
        }

        // Find the field value from SRD data
        let fieldValue = '';
        const srdField = srd.dynamicFields?.find(f => {
          return (
            (f.field?._id && f.field._id.toString() === cell.fieldId.toString()) ||
            (f.originalFieldId && f.originalFieldId.toString() === cell.fieldId.toString()) ||
            (f.name === fieldDef.name && f.department === fieldDef.department)
          );
        });

        if (srdField) {
          fieldValue = srdField.value || '';
        }

        let valueDisplay = '';
        const isHeading = fieldDef.type === 'heading';
        const isImage = fieldDef.type === 'image';
        const isFile = fieldDef.type === 'file';

        if (fieldDef.type === 'boolean') {
          valueDisplay = `
          <div class="checkbox-group">
            <span class="checkbox-item">${fieldValue ? 'inStock' : ''}</span>
            <span class="checkbox-item">${!fieldValue ? 'Purchase Requested' : ''}</span>
          </div>
        `;
        } else if (isFile) {
          if (fieldValue) {
            valueDisplay = `
            <div style="display: flex; align-items: center; gap: 4px;">
              <span>📊</span>
              <span style="font-size: 7px;">Excel File Attached</span>
            </div>
          `;
          } else {
            valueDisplay = '<span class="no-value"></span>';
          }
        } else if (isImage) {
          const images = Array.isArray(fieldValue) ? fieldValue : (fieldValue ? [fieldValue] : []);
          const globalImages = Array.isArray(srd.images) ? srd.images : (srd.images ? [srd.images] : []);
          const allImages = [...new Set([...globalImages, ...images])].filter(img => img && img.trim() !== '');

          if (allImages.length > 0) {
            const imgGrid = allImages.map(img =>
              `<div class="img-wrapper"><img src="${img}" class="img-print" alt="Product image" /></div>`
            ).join('');
            valueDisplay = `<div class="image-stack">${imgGrid}</div>`;
          } else {
            valueDisplay = '<span class="no-value"></span>';
          }
        } else if (isHeading) {
          valueDisplay = fieldDef.name;
        } else {
          valueDisplay = fieldValue || '';
        }

        fieldsHTML += `
        <div class="field-cell ${isHeading ? 'cell-heading' : ''} ${isImage ? 'cell-image' : ''}" style="grid-column: span ${colSpan}; grid-row: span ${rowSpan}; min-height: ${minHeight};">
          ${!isHeading && !isImage ? `
              <div class="cell-content">
                <span class="cell-label">${fieldDef.name}:</span>
                <span class="cell-underline">${valueDisplay}</span>
              </div>
          ` : isImage ? `
              <div class="cell-image-container">
                <div class="image-label">${fieldDef.name}</div>
                ${valueDisplay}
              </div>
          ` : `
              <div class="heading-content">${valueDisplay}</div>
          `}
        </div>
      `;
      });

      // If no fields were rendered, show a message
      if (!fieldsHTML.trim()) {
        fieldsHTML = `
        <div class="field-cell" style="grid-column: span ${gridColumns}; text-align: center; padding: 40px;">
          <div style="color: #666; font-style: italic;">
            No matching fields found for this template. Please check your template configuration.
          </div>
        </div>
      `;
      }

      // Identify Excel files to include in print
      const excelFiles = [];
      srd.dynamicFields?.forEach(f => {
        if (f.type === 'file' && f.value) {
          excelFiles.push({ name: f.name, url: f.value });
        }
      });

      const printContent = `<!DOCTYPE html>
<html>
<head>
  <title>SRD Complete Form - ${srd.refNo}</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
  <style>
    @page {
      size: A4;
      margin: 0.1in;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 7.5px;
      text-transform: capitalize !important;
      line-height: 1.1;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      color-adjust: exact;
    }
    
    .header {
      margin-bottom: 10px;
    }
    
    .header h1 {
      font-size: 11px;
      margin: 0 0 5px 0;
      font-weight: 700;
      text-transform: uppercase;
      color: #1a1a1a;
      border-bottom: 1px solid #1a1a1a;
      padding-bottom: 2px;
    }
    
    .header-info {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 6px;
      font-size: 8px;
    }

    .header-item strong {
      display: block;
      font-size: 6.5px;
      color: #666;
      margin-bottom: 1px;
    }
    
    .template-grid {
      display: grid;
      grid-template-columns: repeat(${gridColumns}, minmax(0, 1fr));
      gap: 0 1px;
      margin-bottom: 10px;
    }
    
    .field-cell {
      padding: 0;
      background: white;
      display: flex;
      height: 20px;
      flex-direction: column;
      justify-content: flex-start;
      overflow: hidden;
    }

    .cell-image {
      padding: 1px;
      height: auto;
    }
    
    .cell-heading {
      background-color: #f3f4f6;
      justify-content: center;
      align-items: center;
      margin-bottom:8px;
      
    }
    
    .heading-content {
      font-weight: 700;
      text-transform: capitalize;
      font-size: 7.5px;
      color: #111;
      text-align: left;
      width: 100%;
      
    }

    .cell-content {
      display: flex;
      align-items: flex-start;
      width: 100%;
      gap: 4px;
      height: 100%;
    }

    .cell-label {
      font-size: 6.5px;
      font-weight: 700;
      color: #333;
      white-space: normal;
      text-transform: capitalize;
      width: 120px; 
      flex-shrink: 0;
      line-height: 10px;
    }

    .cell-underline {
      font-size: 7.5px;
      color: #000;
      flex-grow: 1;
      border-bottom: 0.4px solid #999;
      min-height: 10px;
      padding: 0 2px;
      display: flex;
      align-items: center;
      white-space: pre-wrap;
      width: 100%;
      line-height: 1;
    }

    .checkbox-group {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    
    .checkbox-item {
      font-size: 7px;
      font-weight: 600;
    }

    /* Image cell specific styles */
    .cell-image-container {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .image-label {
      font-size: 6px;
      font-weight: 700;
      color: #333;
      text-transform: capitalize;
      padding: 1px 2px;
      background: #f9f9f9;
      border-bottom: 0.5px solid #ddd;
      flex-shrink: 0;
    }

    /* Image stack - fills remaining space after label */
    .image-stack {
      display: flex;
      flex-direction: column;
      gap: 1px;
      width: 100%;
      flex: 1;
      overflow: hidden;
    }
    
    .img-wrapper {
      width: 100%;
      flex: 1;
      border: 0.5px solid #ccc;
      background: #fafafa;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      min-height: 0;
      position: relative;
    }

    .img-print {
      max-width: 100%;
      max-height: 100%;
      width: auto;
      height: auto;
      display: block;
      object-fit: contain;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }

    /* Custom element styles */
    .static-text {
      font-size: 7px;
      color: #333;
      padding: 2px;
    }

    .placeholder-text {
      font-size: 6px;
      color: #999;
      font-style: italic;
    }

    .textarea-container {
      padding: 2px;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .textarea-label {
      font-size: 6.5px;
      font-weight: 700;
      color: #333;
      text-transform: capitalize;
      margin-bottom: 2px;
    }

    .textarea-box {
      flex: 1;
      border: 0.4px solid #999;
      min-height: 30px;
      padding: 2px;
    }

    .separator-cell {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px 0;
    }

    .separator-line {
      width: 100%;
      border-top: 1px solid #333;
    }

    .signature-cell {
      padding: 4px;
    }

    .signature-container {
      text-align: center;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .signature-label {
      font-size: 7px;
      font-weight: 700;
      text-transform: capitalize;
      color: #333;
    }

    .signature-line {
      border-bottom: 0.5px dotted #666;
      min-height: 20px;
      margin: 4px 0;
    }

    .signature-helper {
      font-size: 5px;
      color: #666;
      text-transform: uppercase;
    }
    
    .footer {
      margin-top: 10px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      font-size: 7px;
    }
    
    .signature-box {
      border-top: 0.5px solid #000;
      padding-top: 3px;
    }
    
    .signature-title {
      font-weight: bold;
      margin-bottom: 15px;
    }

    /* Excel Print Styles */
    .excel-container {
      margin-top: 20px;
      page-break-before: always;
    }

    .excel-title {
      font-size: 10px;
      font-weight: 700;
      text-transform: capitalize;
      background: #f3f4f6;
      padding: 4px;
      border: 1px solid #333;
      margin-bottom: 5px;
    }

    .excel-table-wrapper {
      width: 100%;
      overflow: visible;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7px;
    }

    table, th, td {
      border: 0.5px solid #666;
    }

    th, td {
      padding: 2px 4px;
      text-align: left;
    }

    th {
      background-color: #f9f9f9;
    }

    @media print {
      body { 
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      
      .img-print {
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
      }

      .excel-container {
        page-break-before: always;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Sample Request Form</h1>
    <div class="header-info">
      <div class="header-item"><strong>SRD REF:</strong>${srd.refNo}</div>
      <div class="header-item"><strong>VMD STATUS:</strong>${srd.status?.vmd || 'Pending'}</div>
      <div class="header-item"><strong>CAD STATUS:</strong>${srd.status?.cad || 'Pending'}</div>
      <div class="header-item"><strong>COMMERCIAL STATUS:</strong>${srd.status?.commercial || 'Pending'}</div>
      <div class="header-item"><strong>MMC STATUS:</strong>${srd.status?.mmc || 'Pending'}</div>
    </div>
  </div>
  
  <div class="template-grid">
    ${fieldsHTML}
  </div>

  <div id="excel-sections"></div>

  <script>
    async function loadExcelFiles() {
      const files = ${JSON.stringify(excelFiles)};
      const container = document.getElementById('excel-sections');
      
      for (const file of files) {
        try {
          const response = await fetch(file.url);
          const arrayBuffer = await response.arrayBuffer();
          const data = new Uint8Array(arrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          const section = document.createElement('div');
          section.className = 'excel-container';
          
          const title = document.createElement('div');
          title.className = 'excel-title';
          title.textContent = 'ATTACHED EXCEL: ' + file.name;
          section.appendChild(title);
          
          workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            const htmlTable = XLSX.utils.sheet_to_html(sheet);
            
            const sheetTitle = document.createElement('div');
            sheetTitle.style.fontWeight = 'bold';
            sheetTitle.style.margin = '5px 0';
            sheetTitle.textContent = 'Sheet: ' + sheetName;
            section.appendChild(sheetTitle);
            
            const wrapper = document.createElement('div');
            wrapper.className = 'excel-table-wrapper';
            wrapper.innerHTML = htmlTable;
            section.appendChild(wrapper);
          });
          
          container.appendChild(section);
        } catch (err) {
          console.error('Error loading excel:', err);
        }
      }
      
      // Notify parent that we are ready or just print
      setTimeout(() => {
        window.focus();
        window.print();
        // window.close(); // Optional: close after print
      }, 1000);
    }
    
    if (${excelFiles.length} > 0) {
      loadExcelFiles();
    } else {
      setTimeout(() => {
        window.focus();
        window.print();
        // window.close();
      }, 500);
    }
  </script>
</body>
</html>`;

      printWindow.document.write(printContent);
      printWindow.document.close();

      // The print command is now handled inside the script in the print window
      // to ensure excel data is loaded first.

    } catch (error) {
      console.error('Print error:', error);
      toast({
        title: 'Print failed',
        description: 'There was an error generating the print document',
        variant: 'destructive',
      });
    }
  };

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
        return (
          <Input
            type={type}
            placeholder={placeholder || ''}
            value={fieldValue}
            onChange={(e) => handleFieldChange(fieldId, name, e.target.value, department, fieldDef)}
            required={isRequired}
            disabled={!canEdit}
            className={cn(
              "h-8 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 w-full",
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
              "min-h-[60px] px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 resize-none w-full",
              !canEdit && "bg-gray-100 cursor-not-allowed"
            )}
          />
        );

      case 'boolean':
        return (
          <div className="flex items-center justify-center py-2">
            <Switch
              checked={!!fieldValue}
              onCheckedChange={(checked) => handleFieldChange(fieldId, name, checked, department, fieldDef)}
              disabled={!canEdit}
            />
          </div>
        );

      case 'file':
        return (
          <div className="space-y-1 p-1">
            {canEdit && (
              <UploadFile
                onUploaded={(urls) => {
                  const url = Array.isArray(urls) ? urls[0] : urls;
                  if (url) {
                    handleFieldChange(fieldId, name, url, department, fieldDef);
                    toast({
                      title: 'File uploaded',
                      description: 'File uploaded successfully',
                    });
                  }
                }}
              />
            )}
            {fieldValue && (
              <div className="flex items-center p-1 bg-gray-50 border rounded text-xs">
                <FileSpreadsheet className="h-4 w-4 text-green-600 mr-2 flex-shrink-0" />
                <a href={fieldValue} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate flex-1 block" title="Download">
                  Download Excel
                </a>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 ml-1 hover:bg-red-100"
                    onClick={() => handleFieldChange(fieldId, name, '', department, fieldDef)}
                  >
                    <Trash2 className="h-3 w-3 text-red-500" />
                  </Button>
                )}
              </div>
            )}
          </div>
        );

      case 'image':
        const deptImages = Array.isArray(fieldValue) ? fieldValue : (fieldValue ? [fieldValue] : []);
        const globalImages = Array.isArray(srd.images) ? srd.images : (srd.images ? [srd.images] : []);
        const allImages = Array.from(new Set([...globalImages, ...deptImages]));

        return (
          <div className="space-y-1 p-1">
            {canEdit && (
              <UploadImage
                onUploaded={(urls) => {
                  const imageArray = Array.isArray(urls) ? urls : (urls ? [urls] : []);
                  if (imageArray.length > 0) {
                    const currentImages = Array.isArray(fieldValue) ? fieldValue : (fieldValue ? [fieldValue] : []);
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
                {allImages.slice(0, 6).map((src, idx) => {
                  const isDeptImage = deptImages.includes(src);
                  const isCover = idx === 0;

                  return (
                    <div key={idx} className="relative group aspect-square">
                      <Image
                        src={src}
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
                            {isDeptImage && (
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
                            )}
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
  }, [getFieldValue, handleFieldChange, srd.images, toast]);

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
          >
            <Printer className="h-3 w-3 mr-1" />
            Print
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
      <div className="p-3">
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` }}
        >
          {activeTemplate.cells.map((cell, cellIndex) => {
            const colSpan = cell.position?.colSpan || 1;
            const rowSpan = cell.position?.rowSpan || 1;

            // Handle custom elements
            if (cell.isCustom) {
              return (
                <div
                  key={cellIndex}
                  className="bg-gray-50 border border-gray-200 rounded p-2"
                  style={{
                    gridColumn: `span ${colSpan}`,
                    gridRow: `span ${rowSpan}`,
                  }}
                >
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
                      {cell.customValue}: <span className="italic">{cell.customPlaceholder}</span>
                    </div>
                  )}
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
                  className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-500"
                  style={{
                    gridColumn: `span ${colSpan}`,
                    gridRow: `span ${rowSpan}`,
                  }}
                >
                  Field not found
                </div>
              );
            }

            const canEdit = canEditField(fieldDef.department);
            const isHeading = fieldDef.type === 'heading';

            return (
              <div
                key={cellIndex}
                className={cn(
                  "border rounded",
                  isHeading ? "bg-blue-50 border-blue-200" : "bg-white border-gray-300",
                  !canEdit && !isHeading && "bg-gray-50"
                )}
                style={{
                  gridColumn: `span ${colSpan}`,
                  gridRow: `span ${rowSpan}`,
                }}
              >
                {/* Field header */}
                {!isHeading && (
                  <div className="bg-gray-50 border-b border-gray-200 px-2 py-1 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-700 truncate" title={fieldDef.name}>
                      {fieldDef.name}
                    </span>
                    <div className="flex items-center space-x-1 ml-1">
                      {fieldDef.isRequired && (
                        <span className="text-red-500 text-xs font-bold">*</span>
                      )}
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs px-1 py-0",
                          canEdit ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-100 text-gray-500"
                        )}
                      >
                        {fieldDef.department?.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Field input */}
                <div className={cn(!isHeading && "p-1")}>
                  {renderCellInput(fieldDef, fieldIdStr, canEdit)}
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

      {/* Comments Section */}
      {srd.comments && srd.comments.length > 0 && (
        <div className="border-t border-gray-200 p-3">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Comments</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {srd.comments.slice().reverse().map((comment, idx) => (
              <div key={idx} className="bg-gray-50 rounded p-2 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-gray-800">
                    {comment.author}
                    {comment.department && (
                      <Badge variant="outline" className="ml-1 text-xs px-1 py-0">
                        {comment.department.toUpperCase()}
                      </Badge>
                    )}
                  </span>
                  <span className="text-gray-400">
                    {new Date(comment.date).toLocaleString()}
                  </span>
                </div>
                <p className="text-gray-600">{comment.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}