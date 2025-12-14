'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Calendar, User, MessageCircle } from 'lucide-react';
import Link from 'next/link';

export default function SRDCard({ srd, department }) {
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

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">{srd.title}</CardTitle>
            <CardDescription className="mt-1">{srd.refNo}</CardDescription>
          </div>
          <Badge className={getStatusColor(department === 'admin' ? (srd.readyForProduction ? 'approved' : 'in-progress') : srd.status[department])}>
            {srd.inProduction && srd.readyForProduction ?  "In Production"  : (srd.readyForProduction ? 'Ready for Production' : srd.status[department])}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <p className="text-sm text-gray-600 mb-4">{srd.description}</p>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Progress</span>
            <span className="font-medium">{srd.progress}%</span>
          </div>
          <Progress value={srd.progress} className="h-2" />
          
          <div className="flex items-center justify-between text-sm">
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
            <div className="flex items-center space-x-1 text-sm text-gray-500">
              <MessageCircle className="h-4 w-4" />
              <span>{srd.comments.length} comments</span>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter>
        <Link href={`/srd/${srd._id}`} className="w-full">
          <Button className="w-full">View Details</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}