'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Copy, Repeat, ChevronDown, ChevronUp } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { getAssetUrl, formatFieldValueForDisplay } from '@/lib/assetUtils';

// Status badge component
const StatusBadge = ({ status }) => {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800',
    'in-progress': 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    delayed: 'bg-red-100 text-red-800',
  };
  
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status] || colors.pending}`}>
      {status}
    </span>
  );
};

export default function MobileSRDCard({ srd, department, quickDetailsFields = [], onDuplicate, onRedo }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  const getDeptStatus = (statusArray, dept) =>
    (Array.isArray(statusArray) ? statusArray : []).find(s => s.department === dept)?.value || 'pending';

  const currentStatus = getDeptStatus(srd.status, department);

  // Get first image for thumbnail
  const firstImage = srd.dynamicFields?.find(f => f.type === 'image' && f.value)?.value?.[0];

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Header - Always Visible */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Thumbnail */}
          {firstImage && (
            <div className="w-16 h-16 rounded-md overflow-hidden bg-gray-100 shrink-0">
              <Image
                src={getAssetUrl(firstImage)}
                alt={srd.refNo}
                width={64}
                height={64}
                className="object-cover w-full h-full"
              />
            </div>
          )}
          
          {/* Main Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-gray-900 text-base truncate">
                  {srd.refNo}
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {srd.styleNo || 'No style'}
                </p>
              </div>
              <StatusBadge status={currentStatus} />
            </div>
            
            {/* Quick Stats */}
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
              {srd.season && (
                <span className="bg-gray-100 px-2 py-1 rounded">
                  {srd.season}
                </span>
              )}
              {srd.buyer && (
                <span className="bg-gray-100 px-2 py-1 rounded">
                  {srd.buyer}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-3">
          <Button
            onClick={() => router.push(`/srd/${srd._id}`)}
            className="flex-1 h-9 text-sm"
            variant="default"
          >
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
          <Button
            onClick={() => onDuplicate?.(srd._id)}
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => onRedo?.(srd._id)}
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
          >
            <Repeat className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => setExpanded(!expanded)}
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <dl className="space-y-2">
            {quickDetailsFields.map((field) => {
              const value = srd.dynamicFields?.find(df => df.label === field.label)?.value;
              if (!value) return null;

              return (
                <div key={field._id} className="flex justify-between text-sm">
                  <dt className="text-gray-600 font-medium">{field.label}:</dt>
                  <dd className="text-gray-900 text-right ml-2">
                    {formatFieldValueForDisplay(value, field.type)}
                  </dd>
                </div>
              );
            })}
            
            {srd.createdAt && (
              <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                <dt className="text-gray-600 font-medium">Created:</dt>
                <dd className="text-gray-900">
                  {new Date(srd.createdAt).toLocaleDateString()}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}
