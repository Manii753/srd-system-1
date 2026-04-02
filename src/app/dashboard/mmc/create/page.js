'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/lib/use-toast';
import { ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';
import DynamicFieldsRenderer from '@/components/DynamicFieldsRenderer';

export default function CreateSRDPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    refNo: '',
  });

  // dynamic fields fetched from DB for MMC department
  const [dynamicDefs, setDynamicDefs] = useState([]);
  const [dynamicValues, setDynamicValues] = useState({});

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session || session.user.role !== 'mmc') {
      router.push('/login');
      return;
    }
    // fetch dynamic fields for MMC department
    (async function fetchDynamic() {
      try {
        const res = await fetch('/api/newField?department=mmc');
        const data = await res.json();
        if (Array.isArray(data)) {
          setDynamicDefs(data);
          const initial = {};
          data.forEach(d => { initial[d._id] = d.defaultValue || ''; });
          setDynamicValues(initial);
        }
      } catch (err) {
        console.error('Failed to load dynamic fields', err);
      }
    })();
  }, [session, status, router]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDynamicChange = (id, value) => {
    setDynamicValues(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // validate required dynamic fields
      for (const def of dynamicDefs) {
        if (def.isRequired && def.type !== 'image' && def.type !== 'file') {
          const val = dynamicValues[def._id];
          if (val === undefined || val === null || String(val).trim() === '') {
            toast({ title: 'Validation', description: `Please fill required field: ${def.name}`, variant: 'destructive' });
            setLoading(false);
            return;
          }
        }
      }
      const response = await fetch('/api/srd', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          refNo: formData.refNo,
          createdBy: {
            id: session.user.email,
            name: session.user.name,
            role: session.user.role
          },
          status: {
            vmd: 'pending',
            cad: 'pending',
            commercial: 'pending',
            mmc: 'pending'
          },
          mmcFields: {},
          // include dynamic fields snapshot so SRD stores values independent of future field changes
          dynamicFields: dynamicDefs.map(d => ({
            field: d._id,
            department: d.department || 'mmc',
            name: d.name,
            slug: d.slug || d.name.replace(/\s+/g, '_').toLowerCase(),
            type: d.type,
            value: dynamicValues[d._id] ?? null,
            isRequired: !!d.isRequired,
            placeholder: d.placeholder || '',
            order: d.order || 0,
            parentHeading: d.parentHeading ? (d.parentHeading.name || d.parentHeading) : null,
            fieldVersion: new Date(),
            originalFieldId: d._id
          }))
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Success',
          description: 'SRD created successfully',
        });
        router.push(`/srd/${data.data.id}`);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to create SRD',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create SRD',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-6">
          <Link href="/dashboard/mmc">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-app-heading font-bold text-gray-900">Create New SRD</h1>
            <p className="text-gray-600">Fill in the details to create a new sample request</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-app-heading font-semibold">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">SRD Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter SRD title"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe the sample request"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* MMC Fields */}
          <Card>
            <CardHeader>
              <CardTitle className="text-app-heading font-semibold">MMC Fields</CardTitle>
            </CardHeader>
            <CardContent>
              <DynamicFieldsRenderer
                fields={dynamicDefs}
                values={dynamicValues}
                onChange={handleDynamicChange}
              />
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-4">
            <Link href="/dashboard/mmc">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create SRD
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}

