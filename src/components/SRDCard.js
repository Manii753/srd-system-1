'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Calendar, User, MessageCircle, Copy, Repeat } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SRDCard({ srd, department }) {
  const router = useRouter();

  const handleDuplicate = async () => {
    if (!confirm('Are you sure you want to duplicate this SRD?')) return;
    
    try {
      const response = await fetch(`/api/srd/${srd._id}/duplicate`, { method: 'POST' });
      const result = await response.json();
      if (result.success) {
        alert('SRD duplicated successfully!');
        router.push(`/srd/${result.data._id}`);
      } else {
        alert(`Error duplicating SRD: ${result.error}`);
      }
    } catch (error) {
      alert(`An error occurred: ${error.message}`);
    }
  };

  const handleRedo = async () => {
    if (!confirm('Are you sure you want to create a "redo" version of this SRD?')) return;

    const target = window.prompt('Optional: enter a department slug (vmd, cad, commercial, mmc) or production stage name to nudge. Leave blank to notify all users.');
    if (target === null) return;

    try {
      const response = await fetch(`/api/srd/${srd._id}/duplicate?action=redo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nudgeTarget: target.trim() })
      });
      const result = await response.json();
      if (result.success) {
        alert('SRD "redo" created successfully!');
        router.push(`/srd/${result.data._id}`);
      } else {
        alert(`Error creating "redo" SRD: ${result.error}`);
      }
    } catch (error) {
      alert(`An error occurred: ${error.message}`);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'flagged': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper function to get status for department (handles both uppercase and lowercase)
  const getDepartmentStatus = (srd, dept) => {
    if (!srd.status) return 'pending';
    return srd.status[dept] || srd.status[dept.toUpperCase()] || srd.status[dept.toLowerCase()] || 'pending';
  };

  const departmentStatus = getDepartmentStatus(srd, department);

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-app-heading font-semibold">{srd.refNo}</CardTitle>
          </div>
          <Badge className={getStatusColor(department === 'admin' ? (srd.readyForProduction ? 'approved' : 'in-progress') : departmentStatus)}>
            {srd.inProduction && srd.readyForProduction ?  "In Production"  : (srd.readyForProduction ? 'Ready for Production' : departmentStatus)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <p className="text-app-text text-gray-600 mb-4">{srd.description}</p>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between text-app-text">
            <span className="text-gray-500">Progress</span>
            <span className="font-medium">{srd.progress}%</span>
          </div>
          <Progress value={srd.progress} className="h-2" />
          
          <div className="flex items-center justify-between text-app-text">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">
                  {new Date(srd.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">{srd.createdBy.name}</span>
              </div>
            </div>
            
          </div>
          
          {srd.comments.length > 0 && (
            <div className="flex items-center space-x-1 text-app-text text-gray-500">
              <MessageCircle className="h-4 w-4" />
              <span>{srd.comments.length} comments</span>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex gap-2">
        <Link href={`/srd/${srd._id}`} className="flex-grow">
          <Button variant="outline" className="w-full">View Details</Button>
        </Link>
        <Button size="icon" variant="outline" onClick={handleDuplicate} title="Duplicate SRD">
          <Copy className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="outline" onClick={handleRedo} title="Redo SRD">
          <Repeat className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}

