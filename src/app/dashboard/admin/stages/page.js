'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/lib/use-toast';
import { 
  PlusCircle, 
  Edit, 
  Trash, 
  Circle, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Flag,
  PlayCircle,
  PauseCircle,
  XCircle,
  FileText,
  Sparkles,
  GripVertical
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Available icon options
const ICON_OPTIONS = [
  { name: 'Circle', component: Circle },
  { name: 'Clock', component: Clock },
  { name: 'CheckCircle', component: CheckCircle },
  { name: 'AlertCircle', component: AlertCircle },
  { name: 'Flag', component: Flag },
  { name: 'PlayCircle', component: PlayCircle },
  { name: 'PauseCircle', component: PauseCircle },
  { name: 'XCircle', component: XCircle },
  { name: 'FileText', component: FileText },
  { name: 'Sparkles', component: Sparkles },
];

// Predefined color options
const COLOR_OPTIONS = [
  { name: 'Gray', value: '#6B7280' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Yellow', value: '#F59E0B' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Orange', value: '#F97316' },
];

export default function ManageStagesPage() {
  const [stages, setStages] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [newStage, setNewStage] = useState({
    name: '',
    slug: '',
    description: '',
    color: '#6B7280',
    icon: 'Circle',
    order: 0,
    isActive: true,
    isAutomatic: false,
    departments: [],
  });
  const [editingStage, setEditingStage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    fetchStages();
    fetchDepartments();
  }, []);

  const fetchStages = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/stages');
      const data = await res.json();
      if (data.success) {
        setStages(data.data);
      }
    } catch (error) {
      toast({ title: 'Error fetching stages', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments');
      const data = await res.json();
      if (data.success) {
        setDepartments(data.data);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/stages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStage),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Stage created successfully' });
        resetForm();
        fetchStages();
        setShowModal(false);
      } else {
        toast({ title: 'Error creating stage', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error creating stage', variant: 'destructive' });
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingStage) return;

    try {
      const res = await fetch(`/api/stages/${editingStage._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStage),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Stage updated successfully' });
        resetForm();
        fetchStages();
        setShowModal(false);
      } else {
        toast({ title: 'Error updating stage', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error updating stage', variant: 'destructive' });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to deactivate this stage?')) return;
    try {
      const res = await fetch(`/api/stages/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Stage deactivated' });
        fetchStages();
      } else {
        toast({ title: 'Error deleting stage', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error deleting stage', variant: 'destructive' });
    }
  };

  const openEditModal = (stage) => {
    setEditingStage(stage);
    setNewStage({
      name: stage.name,
      slug: stage.slug,
      description: stage.description || '',
      color: stage.color || '#6B7280',
      icon: stage.icon || 'Circle',
      order: stage.order || 0,
      isActive: stage.isActive ?? true,
      isAutomatic: stage.isAutomatic || false,
      departments: stage.departments?.map(d => d._id || d) || [],
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setNewStage({
      name: '',
      slug: '',
      description: '',
      color: '#6B7280',
      icon: 'Circle',
      order: 0,
      isActive: true,
      isAutomatic: false,
      departments: [],
    });
    setEditingStage(null);
  };

  const getIconComponent = (iconName) => {
    const icon = ICON_OPTIONS.find(i => i.name === iconName);
    return icon ? icon.component : Circle;
  };

  const handleDepartmentToggle = (deptId) => {
    setNewStage(prev => ({
      ...prev,
      departments: prev.departments.includes(deptId)
        ? prev.departments.filter(id => id !== deptId)
        : [...prev.departments, deptId],
    }));
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-app-heading font-bold text-gray-900">Manage Workflow Stages</h1>
            <p className="text-gray-600 mt-1">Create and customize stages for your SRD workflow</p>
          </div>
          <Button onClick={() => { resetForm(); setShowModal(true); }}>
            <PlusCircle className="h-4 w-4 mr-2" /> Create Stage
          </Button>
        </div>

        {/* Stages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-3 text-center py-12">Loading...</div>
          ) : stages.length === 0 ? (
            <div className="col-span-3 text-center py-12">
              <Circle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-app-text font-medium text-gray-900">No stages</h3>
              <p className="mt-1 text-app-text text-gray-500">Get started by creating a new stage.</p>
            </div>
          ) : (
            stages.map((stage) => {
              const IconComponent = getIconComponent(stage.icon);
              return (
                <Card key={stage._id} className={!stage.isActive ? 'opacity-50' : ''}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${stage.color}20` }}
                        >
                          <IconComponent className="h-5 w-5" style={{ color: stage.color }} />
                        </div>
                        <div>
                          <CardTitle className="text-app-text">{stage.name}</CardTitle>
                          <div className="text-app-text text-gray-500 mt-1">
                            {stage.slug} • Order: {stage.order}
                          </div>
                        </div>
                      </div>
                      <GripVertical className="h-4 w-4 text-gray-400" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-app-text text-gray-600 mb-4">
                      {stage.description || 'No description provided'}
                    </p>
                    
                    {/* Departments */}
                    {stage.departments && stage.departments.length > 0 && (
                      <div className="mb-4">
                        <div className="text-app-text font-medium text-gray-500 mb-2">Departments:</div>
                        <div className="flex flex-wrap gap-1">
                          {stage.departments.map(dept => (
                            <span
                              key={dept._id}
                              className="px-2 py-1 text-app-text bg-blue-100 text-blue-700 rounded"
                            >
                              {dept.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Status Badges */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {stage.isAutomatic && (
                        <span className="px-2 py-1 text-app-text bg-purple-100 text-purple-700 rounded-full">
                          Automatic
                        </span>
                      )}
                      {stage.isActive ? (
                        <span className="px-2 py-1 text-app-text bg-green-100 text-green-700 rounded-full">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-app-text bg-gray-100 text-gray-700 rounded-full">
                          Inactive
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" onClick={() => openEditModal(stage)}>
                        <Edit className="h-4 w-4 mr-1" /> Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(stage._id)}>
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setShowModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl border border-gray-200 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
                <h2 className="text-app-heading font-semibold">
                  {editingStage ? 'Edit Stage' : 'Create New Stage'}
                </h2>
                <button
                  className="text-gray-500 hover:text-gray-800 text-app-text leading-none"
                  onClick={() => setShowModal(false)}
                >
                  ×
                </button>
              </div>

              <form
                className="px-6 py-4 space-y-6"
                onSubmit={editingStage ? handleUpdate : handleCreate}
              >
                {/* Basic Info */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Stage Name *</Label>
                    <Input
                      id="name"
                      value={newStage.name}
                      onChange={(e) => {
                        const name = e.target.value;
                        const slug = name
                          .toLowerCase()
                          .replace(/\s+/g, '-')
                          .replace(/[^a-z0-9-]/g, '');
                        setNewStage({ ...newStage, name, slug });
                      }}
                      required
                      placeholder="e.g., Pending Review"
                    />
                  </div>

                  <div>
                    <Label htmlFor="slug">Slug *</Label>
                    <Input
                      id="slug"
                      value={newStage.slug}
                      onChange={(e) => setNewStage({ ...newStage, slug: e.target.value })}
                      required
                      placeholder="e.g., pending-review"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={newStage.description}
                      onChange={(e) => setNewStage({ ...newStage, description: e.target.value })}
                      placeholder="Describe this stage..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="order">Order</Label>
                    <Input
                      id="order"
                      type="number"
                      value={newStage.order}
                      onChange={(e) =>
                        setNewStage({ ...newStage, order: parseInt(e.target.value) || 0 })
                      }
                      placeholder="0"
                    />
                    <p className="text-app-text text-gray-500 mt-1">Lower numbers appear first</p>
                  </div>
                </div>

                {/* Visual Customization */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-medium text-gray-900">Visual Customization</h3>
                  
                  <div>
                    <Label>Color</Label>
                    <div className="grid grid-cols-5 gap-2 mt-2">
                      {COLOR_OPTIONS.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          className={`w-full h-10 rounded-lg border-2 transition-all ${
                            newStage.color === color.value
                              ? 'border-gray-900 scale-110'
                              : 'border-gray-200 hover:border-gray-400'
                          }`}
                          style={{ backgroundColor: color.value }}
                          onClick={() => setNewStage({ ...newStage, color: color.value })}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Icon</Label>
                    <div className="grid grid-cols-5 gap-2 mt-2">
                      {ICON_OPTIONS.map((icon) => {
                        const IconComp = icon.component;
                        return (
                          <button
                            key={icon.name}
                            type="button"
                            className={`w-full h-10 rounded-lg border-2 flex items-center justify-center transition-all ${
                              newStage.icon === icon.name
                                ? 'border-gray-900 bg-gray-100'
                                : 'border-gray-200 hover:border-gray-400'
                            }`}
                            onClick={() => setNewStage({ ...newStage, icon: icon.name })}
                            title={icon.name}
                          >
                            <IconComp className="h-5 w-5" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Departments */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-medium text-gray-900">Departments</h3>
                  <p className="text-app-text text-gray-600">
                    Select which departments this stage applies to (leave empty for all)
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {departments.map((dept) => (
                      <label
                        key={dept._id}
                        className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={newStage.departments.includes(dept._id)}
                          onChange={() => handleDepartmentToggle(dept._id)}
                          className="form-checkbox h-4 w-4"
                        />
                        <span className="text-app-text">{dept.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Settings */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-medium text-gray-900">Settings</h3>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Active</Label>
                      <p className="text-app-text text-gray-500">Stage is available for use</p>
                    </div>
                    <Switch
                      checked={newStage.isActive}
                      onCheckedChange={(checked) =>
                        setNewStage({ ...newStage, isActive: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Automatic</Label>
                      <p className="text-app-text text-gray-500">Stage is set automatically by rules</p>
                    </div>
                    <Switch
                      checked={newStage.isAutomatic}
                      onCheckedChange={(checked) =>
                        setNewStage({ ...newStage, isAutomatic: checked })
                      }
                    />
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingStage ? 'Update Stage' : 'Create Stage'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}

