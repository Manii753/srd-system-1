'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Trash2, Star, Upload, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import UploadImage from './UploadImage';
import { useToast } from '@/lib/use-toast';

export default function DepartmentPanelExcel({
  srd,
  department,
  onUpdate,
  canEdit
}) {
  const { toast } = useToast();
  const [status, setStatus] = useState(srd.status?.[department] || 'pending');
  const [fields, setFields] = useState(srd.dynamicFields?.filter(f => f.department === department) || []);
  const [fieldDefs, setFieldDefs] = useState([]);
  const [updateComment, setUpdateComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      
      if (currentFieldsString !== lastSavedFieldsRef.current && !isSubmitting) {
        try {
          setIsSubmitting(true);
          
          const updateData = {
            status: status,
            fields: fieldsToSave,
          };

          await onUpdate(updateData);
          
          lastSavedFieldsRef.current = currentFieldsString;
          setHasUnsavedChanges(false);
          
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
    }, 1500);
  }, [status, onUpdate, isSubmitting, department, toast]);

  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const currentFieldsString = JSON.stringify(fields);
    if (currentFieldsString !== lastSavedFieldsRef.current) {
      setHasUnsavedChanges(true);
      debouncedAutoSave(fields);
    }
  }, [fields, debouncedAutoSave]);

  useEffect(() => {
    setStatus(srd.status?.[department] || 'pending');
    const srdDynamicFields = srd.dynamicFields?.filter(f => f.department === department) || [];
    
    if (srdDynamicFields.length > 0) {
      const fieldDefsFromSRD = srdDynamicFields.map(f => {
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
          active: true
        };
      });
      
      setFieldDefs(fieldDefsFromSRD);
      setFields(srdDynamicFields);
      lastSavedFieldsRef.current = JSON.stringify(srdDynamicFields);
    } else {
      async function fetchFields() {
        try {
          const res = await fetch(`/api/newField?department=${department}`);
          const data = await res.json();
          const activeFields = Array.isArray(data) ? data.filter(f => f.active) : [];
          setFieldDefs(activeFields);

          const newFields = activeFields.map(fieldDef => ({
            name: fieldDef.name,
            value: fieldDef.type === 'boolean' ? false : '',
            department: department,
            type: fieldDef.type,
            isRequired: fieldDef.isRequired,
            placeholder: fieldDef.placeholder,
            order: fieldDef.order,
            parentHeading: fieldDef.parentHeading?.name || fieldDef.parentHeading
          }));
          
          setFields(newFields);
          lastSavedFieldsRef.current = JSON.stringify(newFields);
        } catch (err) {
          console.error('Failed to fetch fields', err);
        }
      }
      fetchFields();
    }
  }, [department, srd]);

  const handleFieldChange = (name, value) => {
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
    
    setHasUnsavedChanges(true);
  };

  const handleRemoveImage = (fieldName, imageIndex, allImages) => {
    const imageToRemove = allImages[imageIndex];
    const fieldValue = fields.find(f => f.name === fieldName)?.value ?? '';
    const deptImages = Array.isArray(fieldValue) ? fieldValue : (fieldValue ? [fieldValue] : []);

    if (deptImages.includes(imageToRemove)) {
      const updatedImages = deptImages.filter(img => img !== imageToRemove);
      handleFieldChange(fieldName, updatedImages);
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
  };

  const handleSetCoverImage = (fieldName, imageIndex, allImages) => {
    const coverImage = allImages[imageIndex];
    const fieldValue = fields.find(f => f.name === fieldName)?.value ?? '';
    const deptImages = Array.isArray(fieldValue) ? fieldValue : (fieldValue ? [fieldValue] : []);
    const otherImages = deptImages.filter(img => img !== coverImage);
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
    } catch (error) {
      console.error('Update failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // This is the updated handlePrint function for DepartmentPanelExcel.jsx
// Replace the existing handlePrint function with this one

const handlePrint = async () => {
  try {
    // Fetch the active print template
    const templateRes = await fetch('/api/printTemplate');
    const templates = await templateRes.json();
    
    const activeTemplate = Array.isArray(templates) 
      ? templates.find(t => t.isActive) 
      : null;
    
    if (!activeTemplate) {
      toast({
        title: 'No active template',
        description: 'Please create and activate a print template in the template designer.',
        variant: 'destructive',
      });
      return;
    }

    // Fetch all field definitions to get field metadata
    const allFieldDefs = [];
    for (const dept of ['vmd', 'cad', 'commercial', 'mmc']) {
      try {
        const res = await fetch(`/api/newField?department=${dept}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          allFieldDefs.push(...data);
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
    const gridColumns = activeTemplate.gridColumns || 6;
    let fieldsHTML = '';
    
    activeTemplate.cells.forEach(cell => {
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
                <div class="heading-content">${customValue}</div>
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
                  <span class="cell-label">${customValue}:</span>
                  <span class="cell-underline">${customPlaceholder ? `<span class="placeholder-text">${customPlaceholder}</span>` : ''}</span>
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
      const fieldDef = allFieldDefs.find(f => f._id.toString() === cell.fieldId?.toString());
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

      if (fieldDef.type === 'boolean') {
        valueDisplay = `
          <div class="checkbox-group">
            <span class="checkbox-item">${fieldValue ? '☑' : '☐'}Y</span>
            <span class="checkbox-item">${!fieldValue ? '☑' : '☐'}N</span>
          </div>
        `;
      } else if (isImage) {
        const images = Array.isArray(fieldValue) ? fieldValue : (fieldValue ? [fieldValue] : []);
        const globalImages = Array.isArray(srd.images) ? srd.images : (srd.images ? [srd.images] : []);
        const allImages = [...new Set([...globalImages, ...images])].filter(img => img && img.trim() !== '');
        
        if (allImages.length > 0) {
          const imgGrid = allImages.slice(0, 4).map(img => 
            `<div class="img-container" style="background-image: url('${img}')"></div>`
          ).join('');
          valueDisplay = `<div class="image-grid">${imgGrid}</div>`;
          if (allImages.length > 4) valueDisplay += `<div class="img-more">+${allImages.length - 4}</div>`;
        } else {
          valueDisplay = '<span class="no-value"></span>';
        }
      } else if (isHeading) {
        valueDisplay = fieldDef.name;
      } else {
        valueDisplay = fieldValue || '';
      }
      
      fieldsHTML += `
        <div class="field-cell ${isHeading ? 'cell-heading' : ''}" style="grid-column: span ${colSpan}; grid-row: span ${rowSpan}; min-height: ${minHeight};">
          ${!isHeading ? `
              <div class="cell-content ${isImage ? 'content-vertical' : ''}">
                <span class="cell-label">${fieldDef.name}:</span>
                <span class="cell-underline">${valueDisplay}</span>
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

    const printContent = `<!DOCTYPE html>
<html>
<head>
  <title>SRD Complete Form - ${srd.refNo}</title>
  <style>
    @page {
      size: A4;
      margin: 0.1in;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 7.5px;
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
      grid-template-columns: repeat(4, 1fr);
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
    
    .cell-heading {
      background-color: #f3f4f6;
      justify-content: center;
      align-items: center;
      padding: 1px;
      margin: 1px 0;
      border: 0.4px solid #ddd;
    }
    
    .heading-content {
      font-weight: 700;
      text-transform: uppercase;
      font-size: 7.5px;
      color: #111;
    }

    .cell-content {
      display: flex;
      align-items: flex-start;
      width: 100%;
      gap: 4px;
    }

    .content-vertical {
      flex-direction: column;
      align-items: flex-start;
    }

    .cell-label {
      font-size: 6.5px;
      font-weight: 700;
      color: #333;
      white-space: normal;
      text-transform: uppercase;
      width: 65px; 
      flex-shrink: 0;
      line-height: 10px;
    }

    .content-vertical .cell-label {
      width: 100%;
      margin-bottom: 0px;
      line-height: 1;
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

    .image-grid {
      display: flex;
      flex-direction: column;
      gap: 2px;
      width: 100%;
    }
    
    .img-container {
      width: 100%;
      padding-top: 60%;
      background-size: contain;
      background-repeat: no-repeat;
      background-position: left center;
    }
    
    .img-more {
      font-size: 5px;
      text-align: left;
      color: #888;
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
      text-transform: uppercase;
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
      text-transform: uppercase;
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

    @media print {
      body { 
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Sample Request Form</h1>
    <div class="header-info">
      <div class="header-item"><strong>SRD REF</strong>${srd.refNo}</div>
      <div class="header-item"><strong>VMD STATUS</strong>${srd.status?.vmd || 'Pending'}</div>
      <div class="header-item"><strong>CAD STATUS</strong>${srd.status?.cad || 'Pending'}</div>
      <div class="header-item"><strong>COMMERCIAL STATUS</strong>${srd.status?.commercial || 'Pending'}</div>
      <div class="header-item"><strong>MMC STATUS</strong>${srd.status?.mmc || 'Pending'}</div>
    </div>
  </div>
  
  <div class="template-grid">
    ${fieldsHTML}
  </div>
  
  <div class="footer">
    <div class="signature-box">
      <div class="signature-title">PREPARED BY</div>
      <div>Date:</div>
    </div>
    <div class="signature-box">
      <div class="signature-title">REVIEWED BY</div>
      <div>Date:</div>
    </div>
    <div class="signature-box">
      <div class="signature-title">APPROVED BY</div>
      <div>Date:</div>
    </div>
  </div>
</body>
</html>`;

    printWindow.document.write(printContent);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 500);

  } catch (error) {
    console.error('Print error:', error);
    toast({
      title: 'Print failed',
      description: 'There was an error generating the print document',
      variant: 'destructive',
    });
  }
};

  // Group fields by headings for Excel-like layout
  const groupFieldsByHeading = () => {
    if (!fieldDefs.length) return [];

    const headings = fieldDefs.filter(f => f.type === 'heading');
    const regularFields = fieldDefs.filter(f => f.type !== 'heading');
    const groups = [];
    
    const assignedFieldIds = new Set();

    // Group fields under headings
    headings.forEach(heading => {
      const childFields = regularFields.filter(f => {
        if (!f.parentHeading) return false;
        
        let parentIdentifier = f.parentHeading;
        if (typeof f.parentHeading === 'object' && f.parentHeading !== null) {
          parentIdentifier = f.parentHeading._id || f.parentHeading.name;
        }
        
        if (heading._id && parentIdentifier && parentIdentifier.toString() === heading._id.toString()) {
          return true;
        }
        
        if (heading.name && parentIdentifier === heading.name) {
          return true;
        }
        
        return false;
      });

      if (childFields.length > 0) {
        childFields.forEach(f => assignedFieldIds.add(f._id));
        groups.push({
          heading: heading.name,
          fields: childFields
        });
      }
    });

    // Add orphan fields
    const orphanFields = regularFields.filter(f => !assignedFieldIds.has(f._id));
    if (orphanFields.length > 0) {
      groups.unshift({
        heading: 'General Information',
        fields: orphanFields
      });
    }

    return groups;
  };

  const renderUltraCompactPrintCell = (field) => {
    const { _id, name, type, placeholder, isRequired } = field;
    const fieldValue = fields.find(f => f.name === name)?.value ?? '';

    // Ultra compact print layout for single page
    switch (type) {
      case 'text':
      case 'number':
      case 'date':
        return (
          <div className="flex items-center py-0.5">
            <span className="text-xs font-medium text-gray-900 uppercase mr-1 w-20 truncate" title={name}>
              {name.length > 12 ? name.substring(0, 12) + '...' : name}{isRequired && '*'}:
            </span>
            <div className="flex-1 border-b border-dotted border-gray-400 min-h-[12px] px-1">
              <span className="text-xs">{fieldValue}</span>
            </div>
          </div>
        );

      case 'textarea':
        return (
          <div className="py-0.5">
            <div className="text-xs font-medium text-gray-900 uppercase mb-0.5 truncate" title={name}>
              {name.length > 12 ? name.substring(0, 12) + '...' : name}{isRequired && '*'}:
            </div>
            <div className="border border-gray-400 min-h-[20px] p-1 bg-white">
              <span className="text-xs">{fieldValue}</span>
            </div>
          </div>
        );

      case 'boolean':
        return (
          <div className="flex items-center py-0.5">
            <span className="text-xs font-medium text-gray-900 uppercase mr-1 truncate" title={name}>
              {name.length > 8 ? name.substring(0, 8) + '...' : name}{isRequired && '*'}:
            </span>
            <div className="flex items-center">
              <span className="inline-block w-3 h-3 border border-gray-400 mr-1 text-center text-xs leading-2">
                {fieldValue ? '✓' : ''}
              </span>
              <span className="text-xs mr-2">Y</span>
              <span className="inline-block w-3 h-3 border border-gray-400 mr-1 text-center text-xs leading-2">
                {!fieldValue ? '✓' : ''}
              </span>
              <span className="text-xs">N</span>
            </div>
          </div>
        );

      case 'image':
        const deptImages = Array.isArray(fieldValue) ? fieldValue : (fieldValue ? [fieldValue] : []);
        const globalImages = Array.isArray(srd.images) ? srd.images : (srd.images ? [srd.images] : []);
        const allImages = Array.from(new Set([...globalImages, ...deptImages]));

        return (
          <div className="py-0.5">
            <div className="text-xs font-medium text-gray-900 uppercase mb-0.5 truncate" title={name}>
              {name.length > 12 ? name.substring(0, 12) + '...' : name}{isRequired && '*'}:
            </div>
            <div className="border border-gray-400 min-h-[16px] p-1 bg-white text-center">
              {allImages.length > 0 ? (
                <span className="text-xs text-gray-600">
                  {allImages.length} IMG
                </span>
              ) : (
                <span className="text-xs text-gray-400">
                  [ IMG ]
                </span>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div className="flex items-center py-0.5">
            <span className="text-xs font-medium text-gray-900 uppercase mr-1 w-20 truncate" title={name}>
              {name.length > 12 ? name.substring(0, 12) + '...' : name}{isRequired && '*'}:
            </span>
            <div className="flex-1 border-b border-dotted border-gray-400 min-h-[12px] px-1">
              <span className="text-xs text-gray-400">N/A</span>
            </div>
          </div>
        );
    }
  };

  const renderPrintFriendlyCell = (field) => {
    const { _id, name, type, placeholder, isRequired } = field;
    const fieldValue = fields.find(f => f.name === name)?.value ?? '';

    // For print, show traditional form layout with label and line
    switch (type) {
      case 'text':
      case 'number':
      case 'date':
        return (
          <div className="flex items-center justify-between py-1 border-b border-gray-300">
            <span className="text-xs font-medium text-gray-900 uppercase mr-2">
              {name}{isRequired && '*'}:
            </span>
            <div className="flex-1 border-b border-dotted border-gray-400 min-h-[16px] px-2">
              <span className="text-xs">{fieldValue}</span>
            </div>
          </div>
        );

      case 'textarea':
        return (
          <div className="py-1 border-b border-gray-300">
            <div className="text-xs font-medium text-gray-900 uppercase mb-1">
              {name}{isRequired && '*'}:
            </div>
            <div className="border border-gray-400 min-h-[40px] p-2 bg-white">
              <span className="text-xs">{fieldValue}</span>
            </div>
          </div>
        );

      case 'boolean':
        return (
          <div className="flex items-center py-1 border-b border-gray-300">
            <span className="text-xs font-medium text-gray-900 uppercase mr-2">
              {name}{isRequired && '*'}:
            </span>
            <div className="flex items-center">
              <span className="inline-block w-4 h-4 border-2 border-gray-400 mr-2 text-center text-xs leading-3">
                {fieldValue ? '✓' : ''}
              </span>
              <span className="text-xs">YES</span>
              <span className="inline-block w-4 h-4 border-2 border-gray-400 mr-2 ml-4 text-center text-xs leading-3">
                {!fieldValue ? '✓' : ''}
              </span>
              <span className="text-xs">NO</span>
            </div>
          </div>
        );

      case 'image':
        const deptImages = Array.isArray(fieldValue) ? fieldValue : (fieldValue ? [fieldValue] : []);
        const globalImages = Array.isArray(srd.images) ? srd.images : (srd.images ? [srd.images] : []);
        const allImages = Array.from(new Set([...globalImages, ...deptImages]));

        return (
          <div className="py-1 border-b border-gray-300">
            <div className="text-xs font-medium text-gray-900 uppercase mb-1">
              {name}{isRequired && '*'}:
            </div>
            <div className="border border-gray-400 min-h-[60px] p-2 bg-white flex items-center justify-center">
              {allImages.length > 0 ? (
                <span className="text-xs text-gray-600">
                  {allImages.length} IMAGE(S) ATTACHED
                </span>
              ) : (
                <span className="text-xs text-gray-400">
                  [ ATTACH IMAGES HERE ]
                </span>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-between py-1 border-b border-gray-300">
            <span className="text-xs font-medium text-gray-900 uppercase mr-2">
              {name}{isRequired && '*'}:
            </span>
            <div className="flex-1 border-b border-dotted border-gray-400 min-h-[16px] px-2">
              <span className="text-xs text-gray-400">N/A</span>
            </div>
          </div>
        );
    }
  };

  const renderCompactCellInput = (field) => {
    const { _id, name, type, placeholder, isRequired } = field;
    const fieldValue = fields.find(f => f.name === name)?.value ?? '';

    switch (type) {
      case 'text':
      case 'number':
      case 'date':
        return (
          <Input
            type={type}
            placeholder={placeholder || ''}
            value={fieldValue}
            onChange={(e) => handleFieldChange(name, e.target.value)}
            required={isRequired}
            disabled={!canEdit}
            className="h-6 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 w-full"
          />
        );

      case 'textarea':
        return (
          <Textarea
            placeholder={placeholder || ''}
            value={fieldValue}
            onChange={(e) => handleFieldChange(name, e.target.value)}
            required={isRequired}
            disabled={!canEdit}
            className="h-12 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 resize-none w-full"
          />
        );

      case 'boolean':
        return (
          <div className="flex items-center justify-center py-1">
            <Switch
              checked={!!fieldValue}
              onCheckedChange={(checked) => handleFieldChange(name, checked)}
              disabled={!canEdit}
              className="scale-75"
            />
          </div>
        );

      case 'image':
        const deptImages = Array.isArray(fieldValue) ? fieldValue : (fieldValue ? [fieldValue] : []);
        const globalImages = Array.isArray(srd.images) ? srd.images : (srd.images ? [srd.images] : []);
        const allImages = Array.from(new Set([...globalImages, ...deptImages]));

        return (
          <div className="space-y-1">
            {canEdit && (
              <div className="mb-1">
                <UploadImage 
                  onUploaded={(urls) => {
                    const imageArray = Array.isArray(urls) ? urls : (urls ? [urls] : []);
                    if (imageArray.length > 0) {
                      const currentImages = Array.isArray(fieldValue) ? fieldValue : (fieldValue ? [fieldValue] : []);
                      const updatedImages = [...currentImages, ...imageArray];
                      handleFieldChange(name, updatedImages);
                      toast({
                        title: 'Images uploaded',
                        description: `${imageArray.length} image(s) uploaded automatically.`,
                      });
                    }
                  }} 
                />
              </div>
            )}
            
            {allImages.length > 0 ? (
              <div className="grid grid-cols-2 gap-1">
                {allImages.slice(0, 2).map((src, idx) => {
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
                          <Star className="h-1.5 w-1.5 fill-current" />
                        </div>
                      )}
                      
                      {canEdit && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="flex gap-0.5">
                            {!isCover && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSetCoverImage(name, idx, allImages);
                                }}
                                className="bg-yellow-500 hover:bg-yellow-600 text-white p-0.5 rounded"
                                title="Set as cover"
                              >
                                <Star className="h-1.5 w-1.5" />
                              </button>
                            )}
                            {isDeptImage && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveImage(name, idx, allImages);
                                }}
                                className="bg-red-500 hover:bg-red-600 text-white p-0.5 rounded"
                                title="Remove"
                              >
                                <Trash2 className="h-1.5 w-1.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {allImages.length > 2 && (
                  <div className="aspect-square border border-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
                    +{allImages.length - 2}
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
  };

  const renderCompactTableCell = (field) => {
    const { _id, name, type, placeholder, isRequired } = field;
    const fieldValue = fields.find(f => f.name === name)?.value ?? '';

    switch (type) {
      case 'text':
      case 'number':
      case 'date':
        return (
          <Input
            type={type}
            placeholder={placeholder || ''}
            value={fieldValue}
            onChange={(e) => handleFieldChange(name, e.target.value)}
            required={isRequired}
            disabled={!canEdit}
            className="border-0 rounded-none focus:ring-1 focus:ring-blue-500 bg-transparent h-full px-1 py-0 text-xs w-full"
          />
        );

      case 'textarea':
        return (
          <Input
            placeholder={placeholder || ''}
            value={fieldValue}
            onChange={(e) => handleFieldChange(name, e.target.value)}
            required={isRequired}
            disabled={!canEdit}
            className="border-0 rounded-none focus:ring-1 focus:ring-blue-500 bg-transparent h-full px-1 py-0 text-xs w-full"
          />
        );

      case 'boolean':
        return (
          <div className="flex items-center justify-center h-full">
            <Switch
              checked={!!fieldValue}
              onCheckedChange={(checked) => handleFieldChange(name, checked)}
              disabled={!canEdit}
              className="scale-50"
            />
          </div>
        );

      case 'image':
        const deptImages = Array.isArray(fieldValue) ? fieldValue : (fieldValue ? [fieldValue] : []);
        const globalImages = Array.isArray(srd.images) ? srd.images : (srd.images ? [srd.images] : []);
        const allImages = Array.from(new Set([...globalImages, ...deptImages]));

        return (
          <div className="flex items-center justify-center h-full">
            {allImages.length > 0 ? (
              <div className="flex items-center space-x-1">
                <div className="w-6 h-6 relative">
                  <Image
                    src={allImages[0]}
                    alt={`${name}-preview`}
                    fill
                    className="object-cover rounded border"
                  />
                </div>
                {allImages.length > 1 && (
                  <span className="text-xs text-gray-500">+{allImages.length - 1}</span>
                )}
              </div>
            ) : (
              <span className="text-xs text-gray-400">No img</span>
            )}
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center h-full">
            <span className="text-xs text-gray-400">-</span>
          </div>
        );
    }
  };

  const renderCompactExcelCell = (field) => {
    const { _id, name, type, placeholder, isRequired } = field;
    const fieldValue = fields.find(f => f.name === name)?.value ?? '';

    switch (type) {
      case 'text':
      case 'number':
      case 'date':
        return (
          <Input
            type={type}
            placeholder={placeholder || ''}
            value={fieldValue}
            onChange={(e) => handleFieldChange(name, e.target.value)}
            required={isRequired}
            disabled={!canEdit}
            className="border-0 rounded-none focus:ring-1 focus:ring-blue-500 bg-transparent h-8 px-2 py-1 text-sm w-full"
          />
        );

      case 'textarea':
        return (
          <Textarea
            placeholder={placeholder || ''}
            value={fieldValue}
            onChange={(e) => handleFieldChange(name, e.target.value)}
            required={isRequired}
            disabled={!canEdit}
            className="border-0 rounded-none focus:ring-1 focus:ring-blue-500 bg-transparent min-h-[40px] resize-none px-2 py-1 text-sm w-full"
          />
        );

      case 'boolean':
        return (
          <div className="flex items-center justify-center h-full">
            <Switch
              checked={!!fieldValue}
              onCheckedChange={(checked) => handleFieldChange(name, checked)}
              disabled={!canEdit}
              className="scale-75"
            />
          </div>
        );

      case 'image':
        const deptImages = Array.isArray(fieldValue) ? fieldValue : (fieldValue ? [fieldValue] : []);
        const globalImages = Array.isArray(srd.images) ? srd.images : (srd.images ? [srd.images] : []);
        const allImages = Array.from(new Set([...globalImages, ...deptImages]));

        return (
          <div className="space-y-1">
            {canEdit && (
              <div className="mb-1">
                <UploadImage 
                  onUploaded={(urls) => {
                    const imageArray = Array.isArray(urls) ? urls : (urls ? [urls] : []);
                    if (imageArray.length > 0) {
                      const currentImages = Array.isArray(fieldValue) ? fieldValue : (fieldValue ? [fieldValue] : []);
                      const updatedImages = [...currentImages, ...imageArray];
                      handleFieldChange(name, updatedImages);
                      toast({
                        title: 'Images uploaded',
                        description: `${imageArray.length} image(s) uploaded automatically.`,
                      });
                    }
                  }} 
                />
              </div>
            )}
            
            {allImages.length > 0 ? (
              <div className="grid grid-cols-4 gap-1">
                {allImages.slice(0, 4).map((src, idx) => {
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
                                  handleSetCoverImage(name, idx, allImages);
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
                                  handleRemoveImage(name, idx, allImages);
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
                {allImages.length > 4 && (
                  <div className="aspect-square border border-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
                    +{allImages.length - 4}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-gray-400 text-center py-1">
                No images
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const renderExcelCell = (field) => {
    const { _id, name, type, placeholder, isRequired } = field;
    const fieldValue = fields.find(f => f.name === name)?.value ?? '';

    switch (type) {
      case 'text':
      case 'number':
      case 'date':
        return (
          <Input
            type={type}
            placeholder={placeholder || ''}
            value={fieldValue}
            onChange={(e) => handleFieldChange(name, e.target.value)}
            required={isRequired}
            disabled={!canEdit}
            className="border-0 rounded-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-transparent h-full px-3 py-2 w-full"
          />
        );

      case 'textarea':
        return (
          <Textarea
            placeholder={placeholder || ''}
            value={fieldValue}
            onChange={(e) => handleFieldChange(name, e.target.value)}
            required={isRequired}
            disabled={!canEdit}
            className="border-0 rounded-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-transparent min-h-[60px] resize-none px-3 py-2 w-full"
          />
        );

      case 'boolean':
        return (
          <div className="flex items-center justify-center h-full">
            <Switch
              checked={!!fieldValue}
              onCheckedChange={(checked) => handleFieldChange(name, checked)}
              disabled={!canEdit}
            />
          </div>
        );

      case 'image':
        const deptImages = Array.isArray(fieldValue) ? fieldValue : (fieldValue ? [fieldValue] : []);
        const globalImages = Array.isArray(srd.images) ? srd.images : (srd.images ? [srd.images] : []);
        const allImages = Array.from(new Set([...globalImages, ...deptImages]));

        return (
          <div className="p-2">
            {canEdit && (
              <div className="mb-2">
                <UploadImage 
                  onUploaded={(urls) => {
                    const imageArray = Array.isArray(urls) ? urls : (urls ? [urls] : []);
                    if (imageArray.length > 0) {
                      const currentImages = Array.isArray(fieldValue) ? fieldValue : (fieldValue ? [fieldValue] : []);
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
                        <div className="absolute top-0 left-0 bg-yellow-400 text-yellow-900 px-1 py-0.5 rounded-br text-xs font-semibold flex items-center gap-1">
                          <Star className="h-2 w-2 fill-current" />
                        </div>
                      )}
                      
                      {canEdit && (
                        <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          {!isCover && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetCoverImage(name, idx, allImages);
                              }}
                              className="bg-yellow-500 hover:bg-yellow-600 text-white p-0.5 rounded shadow-lg"
                              title="Set as cover"
                            >
                              <Star className="h-2 w-2" />
                            </button>
                          )}
                          {isDeptImage && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveImage(name, idx, allImages);
                              }}
                              className="bg-red-500 hover:bg-red-600 text-white p-0.5 rounded shadow-lg"
                              title="Remove image"
                            >
                              <Trash2 className="h-2 w-2" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {allImages.length > 6 && (
                  <div className="aspect-square border border-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
                    +{allImages.length - 6} more
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-gray-500 text-center py-2">
                No images
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const fieldGroups = groupFieldsByHeading();

  if (!fieldDefs.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <h3 className="text-sm font-medium text-gray-700">{department.toUpperCase()} Department - Excel View</h3>
          <p className="text-xs text-gray-500 mt-1">No fields defined for this department.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden print:border-0 print:rounded-none print:shadow-none">
      <style jsx>{`
        @media print {
          @page {
            size: A4;
            margin: 0.3in;
          }
          
          body {
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
            font-size: 10px;
            line-height: 1.2;
          }
          
          .print\\:grid-cols-3 {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
          
          .print\\:text-xs {
            font-size: 0.65rem;
            line-height: 1rem;
          }
          
          .print\\:p-1 {
            padding: 0.15rem;
          }
          
          .print\\:gap-1 {
            gap: 0.15rem;
          }
          
          .print\\:mb-4 {
            margin-bottom: 0.5rem;
          }
          
          .print\\:mb-3 {
            margin-bottom: 0.4rem;
          }
          
          .print\\:mb-2 {
            margin-bottom: 0.3rem;
          }
          
          .print\\:border {
            border-width: 1px;
          }
          
          .print\\:border-gray-300 {
            border-color: #d1d5db;
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      `}</style>
      {/* Compact Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-2 flex items-center justify-between print:hidden">
        <h3 className="font-semibold text-sm">{department.toUpperCase()} - Excel View</h3>
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
          <Badge
            className={cn(
              "text-xs px-2 py-0.5",
              status === 'approved' && 'bg-green-100 text-green-800',
              status === 'in-progress' && 'bg-blue-100 text-blue-800',
              status === 'flagged' && 'bg-red-100 text-red-800',
              status === 'pending' && 'bg-gray-100 text-gray-800'
            )}
          >
            {status}
          </Badge>
          {hasUnsavedChanges && (
            <div className="flex items-center text-xs text-yellow-200">
              <div className="animate-pulse w-1.5 h-1.5 bg-yellow-300 rounded-full mr-1"></div>
              Saving...
            </div>
          )}
        </div>
      </div>

      {/* Excel Grid - Compact cells with all info */}
      <div className="p-2">
        {/* Print Header - Only visible when printing */}
        <div className="hidden print:block print:mb-4">
          <div className="text-center border-b border-gray-800 pb-2 mb-4">
            <h1 className="text-lg font-bold text-gray-900 uppercase">Sample Request and Development Form</h1>
            <div className="grid grid-cols-3 gap-4 mt-2 text-xs">
              <div className="text-left">
                <strong>SRD REF:</strong> {srd.refNo}
              </div>
              <div className="text-center">
                <strong>DEPT:</strong> {department.toUpperCase()}
              </div>
              <div className="text-right">
                <strong>DATE:</strong> {new Date().toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {/* Print Layout - Ultra Compact Form Style */}
        <div className="hidden print:block">
          {fieldGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="mb-3">
              {/* Compact Section Header */}
              <div className="bg-gray-100 border border-gray-600 px-2 py-1 mb-2">
                <h2 className="font-bold text-xs text-gray-900 uppercase text-center">{group.heading}</h2>
              </div>
              
              {/* Ultra Compact Form Fields - 3 columns */}
              <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-xs">
                {group.fields.map((field, fieldIndex) => (
                  <div key={field._id} className="col-span-1">
                    {renderUltraCompactPrintCell(field)}
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {/* Ultra Compact Print Footer */}
          <div className="mt-4 pt-2 border-t border-gray-600">
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div className="text-center">
                <div className="font-bold mb-1">PREPARED BY:</div>
                <div className="border-b border-dotted border-gray-400 min-h-[12px] mb-1"></div>
                <div className="text-xs">SIGNATURE & DATE</div>
              </div>
              <div className="text-center">
                <div className="font-bold mb-1">REVIEWED BY:</div>
                <div className="border-b border-dotted border-gray-400 min-h-[12px] mb-1"></div>
                <div className="text-xs">SIGNATURE & DATE</div>
              </div>
              <div className="text-center">
                <div className="font-bold mb-1">APPROVED BY:</div>
                <div className="border-b border-dotted border-gray-400 min-h-[12px] mb-1"></div>
                <div className="text-xs">SIGNATURE & DATE</div>
              </div>
            </div>
          </div>
        </div>

        {/* Screen Layout - Grid Style */}
        <div className="print:hidden">
          {fieldGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="mb-3">
              {/* Section Header */}
              <div className="bg-blue-50 border border-blue-200 px-2 py-1 mb-2 rounded">
                <h4 className="font-medium text-xs text-blue-800 uppercase">{group.heading}</h4>
              </div>
              
              {/* Compact Grid of Cells */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                {group.fields.map((field, fieldIndex) => (
                  <div key={field._id} className="border border-gray-300 rounded bg-white hover:shadow-sm transition-shadow">
                    {/* Cell Header with Field Name, Type, and Required */}
                    <div className="bg-gray-50 border-b border-gray-200 px-2 py-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-700 truncate flex-1" title={field.name}>
                          {field.name}
                        </span>
                        <div className="flex items-center space-x-1 ml-1">
                          {field.isRequired && (
                            <span className="text-red-500 text-xs font-bold">*</span>
                          )}
                          <span className="text-xs text-gray-400 uppercase font-mono">
                            {field.type.charAt(0)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Cell Input Area */}
                    <div className="p-1">
                      {renderCompactCellInput(field)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Compact Status Section */}
      {canEdit && (
        <div className="bg-gray-50 border-t border-gray-200 p-2">
          <div className="grid grid-cols-6 gap-2 items-end">
            <div>
              <Label className="text-xs font-medium text-gray-700">Status</Label>
              <select 
                value={status} 
                onChange={(e) => handleStatusChange(e.target.value)} 
                className="mt-1 px-1 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 w-full bg-white h-6" 
                disabled={isSubmitting}
              >
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="approved">Approved</option>
                <option value="flagged">Flag Issue</option>
              </select>
            </div>
            <div className="col-span-4">
              <Label htmlFor="updateComment" className="text-xs font-medium text-gray-700">
                Comment {status !== 'flagged' && <span className="text-gray-500">(Optional)</span>}
              </Label>
              <Input 
                id="updateComment" 
                value={updateComment} 
                onChange={(e) => setUpdateComment(e.target.value)} 
                placeholder={status === 'flagged' ? 'Describe issue...' : 'Add comment...'} 
                required={status === 'flagged'} 
                className="mt-1 text-xs h-6 border border-gray-300 focus:ring-1 focus:ring-blue-500" 
              />
            </div>
            <div>
              <Button 
                onClick={handleSaveChanges} 
                disabled={isSubmitting} 
                size="sm"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs h-6"
              >
                {isSubmitting ? 'Updating...' : 'Update'}
              </Button>
            </div>
          </div>
          <p className="text-xs text-gray-500 text-center mt-1">
            Field changes auto-save. Use button for status/comments only.
          </p>
        </div>
      )}
    </div>
  );
}