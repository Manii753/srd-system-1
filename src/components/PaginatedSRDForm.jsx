'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Check, FileText } from 'lucide-react';
import DynamicFieldsRenderer from './DynamicFieldsRenderer';

const DEPARTMENTS = ['vmd', 'cad', 'commercial', 'mmc'];

export default function PaginatedSRDForm({ srd, onSave, userRole }) {
  const [currentPage, setCurrentPage] = useState(0);
  const [fieldsByDepartment, setFieldsByDepartment] = useState({});
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);

  // Fetch fields for all departments
  useEffect(() => {
    async function fetchAllFields() {
      setLoading(true);
      const fieldsMap = {};
      
      for (const dept of DEPARTMENTS) {
        try {
          const res = await fetch(`/api/newField?department=${dept}`);
          const data = await res.json();
          if (Array.isArray(data)) {
            fieldsMap[dept] = data.filter(f => f.active !== false);
          }
        } catch (error) {
          console.error(`Failed to fetch ${dept} fields:`, error);
          fieldsMap[dept] = [];
        }
      }
      
      setFieldsByDepartment(fieldsMap);
      
      // Initialize form data from SRD
      if (srd && srd.dynamicFields) {
        const initialData = {};
        srd.dynamicFields.forEach(field => {
          const fieldId = field.field?._id || field.originalFieldId;
          if (fieldId) {
            initialData[fieldId] = field.value;
          }
        });
        setFormData(initialData);
      }
      
      setLoading(false);
    }
    
    fetchAllFields();
  }, [srd]);

  // Ctrl+S keyboard shortcut to save current page
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        savePage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, fieldsByDepartment, formData]);

  const handleFieldChange = (fieldId, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleNext = async () => {
    // Save current page data before moving to next
    await savePage();
    if (currentPage < DEPARTMENTS.length - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevious = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const savePage = async () => {
    const currentDept = DEPARTMENTS[currentPage];
    const deptFields = fieldsByDepartment[currentDept] || [];
    
    // Prepare fields data for this department
    const fieldsToSave = deptFields.map(field => ({
      field: field._id,
      name: field.name,
      type: field.type,
      value: formData[field._id] || null,
      department: currentDept,
    }));

    // Call the onSave callback
    if (onSave) {
      await onSave(currentDept, fieldsToSave);
    }
  };

  const handleSubmit = async () => {
    await savePage();
    // Final submission logic here
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const currentDept = DEPARTMENTS[currentPage];
  const currentFields = fieldsByDepartment[currentDept] || [];
  const isFirstPage = currentPage === 0;
  const isLastPage = currentPage === DEPARTMENTS.length - 1;

  // Calculate completion percentage
  const totalFields = Object.values(fieldsByDepartment).flat().length;
  const filledFields = Object.keys(formData).filter(key => {
    const value = formData[key];
    return value !== null && value !== undefined && value !== '';
  }).length;
  const completionPercentage = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-app-heading font-semibold text-gray-700">
            Step {currentPage + 1} of {DEPARTMENTS.length}: {currentDept.toUpperCase()} Department
          </h2>
          <Badge variant="outline" className="text-app-text">
            {completionPercentage}% Complete
          </Badge>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentPage + 1) / DEPARTMENTS.length) * 100}%` }}
          />
        </div>

        {/* Department Steps */}
        <div className="flex justify-between mt-4">
          {DEPARTMENTS.map((dept, index) => (
            <div
              key={dept}
              className={`flex items-center space-x-2 ${
                index === currentPage
                  ? 'text-blue-600 font-semibold'
                  : index < currentPage
                  ? 'text-green-600'
                  : 'text-gray-400'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  index === currentPage
                    ? 'border-blue-600 bg-blue-50'
                    : index < currentPage
                    ? 'border-green-600 bg-green-50'
                    : 'border-gray-300 bg-white'
                }`}
              >
                {index < currentPage ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span className="text-app-text">{index + 1}</span>
                )}
              </div>
              <span className="text-app-text hidden md:inline">{dept.toUpperCase()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Summary of Previous Pages */}
      {!isFirstPage && (
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-app-text flex items-center text-blue-900">
              <FileText className="h-4 w-4 mr-2" />
              Summary of Previous Sections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {DEPARTMENTS.slice(0, currentPage).map(dept => {
                const deptFields = fieldsByDepartment[dept] || [];
                const filledCount = deptFields.filter(f => {
                  const value = formData[f._id];
                  return value !== null && value !== undefined && value !== '';
                }).length;
                
                return (
                  <div key={dept} className="bg-white rounded-lg p-3 border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-app-heading text-gray-700">
                        {dept.toUpperCase()}
                      </span>
                      <Badge variant="secondary" className="text-app-text">
                        {filledCount}/{deptFields.length}
                      </Badge>
                    </div>
                    <div className="text-app-text text-gray-600">
                      {filledCount === deptFields.length ? (
                        <span className="text-green-600 font-medium">✓ Completed</span>
                      ) : (
                        <span className="text-amber-600">{deptFields.length - filledCount} fields remaining</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Page Fields */}
      <Card>
        <CardHeader>
          <CardTitle className="text-app-text">
            {currentDept.toUpperCase()} Department Information
          </CardTitle>
          <p className="text-app-text text-gray-500 mt-1">
            Fill in the required information for the {currentDept.toUpperCase()} department
          </p>
        </CardHeader>
        <CardContent>
          {currentFields.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No fields configured for this department</p>
            </div>
          ) : (
            <DynamicFieldsRenderer
              fields={currentFields}
              values={formData}
              onChange={handleFieldChange}
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between mt-6">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={isFirstPage}
          className="flex items-center"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        <div className="text-app-text text-gray-600">
          Page {currentPage + 1} of {DEPARTMENTS.length}
        </div>

        {isLastPage ? (
          <Button
            onClick={handleSubmit}
            className="bg-green-600 hover:bg-green-700 text-white flex items-center"
          >
            <Check className="h-4 w-4 mr-2" />
            Complete & Submit
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}

