'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function DynamicCreateSRD() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const departmentSlug = params.department;

  const [department, setDepartment] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dynamicFields: {}
  });

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }

    // Only VMD can create SRDs
    if (departmentSlug !== 'vmd' && session.user.role !== 'vmd') {
      router.push(`/dashboard/${session.user.role}`);
      return;
    }

    fetchData();
  }, [session, status, router, departmentSlug]);

  const fetchData = async () => {
    try {
      // Fetch all departments
      const deptsResponse = await fetch('/api/departments');
      const deptsData = await deptsResponse.json();
      if (deptsData.success) {
        setDepartments(deptsData.data);
        const dept = deptsData.data.find(d => d.slug === departmentSlug);
        setDepartment(dept);
      }

      // Fetch fields for this department
      const fieldsResponse = await fetch('/api/newField');
      const fieldsData = await fieldsResponse.json();
      if (Array.isArray(fieldsData)) {
        const relevantFields = fieldsData.filter(f => 
          f.active && (f.department === departmentSlug || f.department === 'global')
        );
        setFields(relevantFields);
        
        // Initialize dynamic fields
        const initialDynamicFields = {};
        relevantFields.forEach(field => {
          initialDynamicFields[field._id] = '';
        });
        setFormData(prev => ({ ...prev, dynamicFields: initialDynamicFields }));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load form data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDynamicFieldChange = (fieldId, value) => {
    setFormData(prev => ({
      ...prev,
      dynamicFields: {
        ...prev.dynamicFields,
        [fieldId]: value
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validate required fields
      const requiredFields = fields.filter(f => f.isRequired);
      for (const field of requiredFields) {
        if (!formData.dynamicFields[field._id]) {
          toast.error(`${field.name} is required`);
          setSubmitting(false);
          return;
        }
      }

      // Prepare dynamic fields data with immutable snapshots
      const dynamicFieldsArray = fields.map(field => ({
        field: field._id,
        department: field.department,
        name: field.name,
        slug: field.slug,
        type: field.type,
        value: formData.dynamicFields[field._id] || '',
        isRequired: field.isRequired,
        placeholder: field.placeholder || '',
        order: field.order || 0,
        parentHeading: field.parentHeading ? (field.parentHeading.name || field.parentHeading) : null,
        fieldVersion: new Date(),
        originalFieldId: field._id
      }));

      // Initialize status for all departments (exclude admin and production-manager)
      const status = {};
      const excludedRoles = ['admin', 'production-manager'];
      departments.forEach(dept => {
        if (!excludedRoles.includes(dept.slug)) {
          status[dept.slug] = 'pending';
        }
      });

      const srdData = {
        title: formData.title,
        description: formData.description,
        createdBy: {
          id: session.user.id,
          name: session.user.name,
          role: session.user.role
        },
        dynamicFields: dynamicFieldsArray,
        status: status
      };

      const response = await fetch('/api/srd/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(srdData)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('SRD created successfully!');
        router.push(`/srd/${data.data._id}`);
      } else {
        toast.error(data.error || 'Failed to create SRD');
      }
    } catch (error) {
      console.error('Error creating SRD:', error);
      toast.error('An error occurred while creating the SRD');
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field) => {
    const value = formData.dynamicFields[field._id] || '';

    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            id={field._id}
            value={value}
            onChange={(e) => handleDynamicFieldChange(field._id, e.target.value)}
            placeholder={field.placeholder}
            required={field.isRequired}
            rows={4}
          />
        );
      
      case 'number':
        return (
          <Input
            id={field._id}
            type="number"
            value={value}
            onChange={(e) => handleDynamicFieldChange(field._id, e.target.value)}
            placeholder={field.placeholder}
            required={field.isRequired}
          />
        );
      
      case 'date':
        return (
          <Input
            id={field._id}
            type="date"
            value={value}
            onChange={(e) => handleDynamicFieldChange(field._id, e.target.value)}
            required={field.isRequired}
          />
        );
      
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <input
              id={field._id}
              type="checkbox"
              checked={value === 'true' || value === true}
              onChange={(e) => handleDynamicFieldChange(field._id, e.target.checked.toString())}
              className="form-checkbox h-4 w-4"
            />
            <label htmlFor={field._id} className="text-sm text-gray-700">
              {field.placeholder || 'Yes'}
            </label>
          </div>
        );
      
      case 'text':
      default:
        return (
          <Input
            id={field._id}
            type="text"
            value={value}
            onChange={(e) => handleDynamicFieldChange(field._id, e.target.value)}
            placeholder={field.placeholder}
            required={field.isRequired}
          />
        );
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  const departmentName = department?.name || departmentSlug.toUpperCase();

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Link href={`/dashboard/${departmentSlug}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create New SRD</h1>
            <p className="text-gray-600 mt-1">{departmentName} Department</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>SRD Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Fields */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">
                    Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Enter SRD title"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Enter SRD description"
                    rows={4}
                  />
                </div>
              </div>

              {/* Dynamic Fields */}
              {fields.length > 0 && (
                <>
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold mb-4">
                      {departmentName} Fields
                    </h3>
                    <div className="space-y-4">
                      {fields.map((field) => (
                        <div key={field._id}>
                          <Label htmlFor={field._id}>
                            {field.name}
                            {field.isRequired && <span className="text-red-500 ml-1">*</span>}
                          </Label>
                          {renderField(field)}
                          {field.department !== 'global' && (
                            <p className="text-xs text-gray-500 mt-1">
                              Department-specific field
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Submit Button */}
              <div className="flex justify-end space-x-3 pt-6 border-t">
                <Link href={`/dashboard/${departmentSlug}`}>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Create SRD
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> This SRD will be created with dynamic fields configured for the {departmentName} department. 
              All departments will be notified and can track progress through their respective dashboards.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
