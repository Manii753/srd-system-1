'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/lib/use-toast';
import { PlusCircle, Edit, Trash } from 'lucide-react';

export default function ManageDepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [newDepartment, setNewDepartment] = useState({ name: '', slug: '', description: '' });
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/departments');
      const data = await res.json();
      if (data.success) {
        setDepartments(data.data);
      }
    } catch (error) {
      toast({ title: 'Error fetching departments', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDepartment),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Department created' });
        setNewDepartment({ name: '', slug: '', description: '' });
        fetchDepartments();
      } else {
        toast({ title: 'Error creating department', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error creating department', variant: 'destructive' });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this department and all its fields?')) return;
    try {
      const res = await fetch(`/api/departments/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Department deleted' });
        fetchDepartments();
      } else {
        toast({ title: 'Error deleting department', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error deleting department', variant: 'destructive' });
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-app-heading font-bold">Manage Departments</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Existing Departments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {isLoading ? <p>Loading...</p> : departments.map(dept => (
                    <div key={dept._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <h3 className="font-semibold">{dept.name} ({dept.slug})</h3>
                        <p className="text-app-text text-gray-500">{dept.description}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/admin/departments/${dept._id}`)}>
                          <Edit className="h-4 w-4 mr-2" /> Fields
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(dept._id)}>
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Create New Department</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" value={newDepartment.name} onChange={e => setNewDepartment({...newDepartment, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})} required />
                  </div>
                  <div>
                    <Label htmlFor="slug">Slug</Label>
                    <Input id="slug" value={newDepartment.slug} onChange={e => setNewDepartment({...newDepartment, slug: e.target.value})} required />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input id="description" value={newDepartment.description} onChange={e => setNewDepartment({...newDepartment, description: e.target.value})} />
                  </div>
                  <Button type="submit" className="w-full">
                    <PlusCircle className="h-4 w-4 mr-2" /> Create
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}

