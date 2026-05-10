'use client';

import { CheckCircle, Clock, Package, XCircle } from 'lucide-react';

export default function SampleProcessReport({ srd }) {
  const sampleProcess = srd?.sampleProcess || [];

  if (sampleProcess.length === 0) {
    return (
      <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
        <h3 className="font-semibold text-gray-900 mb-2">SAMPLE PROCESS</h3>
        <p className="text-sm text-gray-500">No sample process data available</p>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
      case 'received':
        return 'text-green-700';
      case 'in-progress':
        return 'text-yellow-700';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'received':
        return <Package className="h-4 w-4 text-blue-600" />;
      case 'in-progress':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-4 py-2 border-b-2 border-gray-300">
        <h3 className="font-bold text-gray-900 uppercase">Sample Process</h3>
      </div>

      {/* Summary Section */}
      <div className="p-4 bg-gray-50 border-b border-gray-300">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-semibold text-gray-700">SR Raised Date:</span>
            <span className="ml-2 text-gray-900">
              {srd.createdAt ? new Date(srd.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '-'}
            </span>
          </div>
          <div>
            <span className="font-semibold text-gray-700">INO REF NO:</span>
            <span className="ml-2 text-gray-900">{srd.refNo || '-'}</span>
          </div>
          <div>
            <span className="font-semibold text-gray-700">BUYER:</span>
            <span className="ml-2 text-gray-900">
              {typeof srd.BuyerDetails === 'object' ? srd.BuyerDetails?.name : '-'}
            </span>
          </div>
          <div>
            <span className="font-semibold text-gray-700">SAMPLE TYPE:</span>
            <span className="ml-2 text-gray-900">
              {srd.dynamicFields?.find(f => f.name === 'Sample Type')?.value || '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Stages Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 border-b-2 border-gray-300">
              <th className="px-4 py-2 text-left font-semibold text-gray-700 border-r border-gray-300">Stage</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-700 border-r border-gray-300">Status</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-700 border-r border-gray-300">Completed</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-700">Received By Next</th>
            </tr>
          </thead>
          <tbody>
            {sampleProcess.map((stage, index) => (
              <tr key={stage.stage} className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                <td className="px-4 py-3 font-medium text-gray-900 border-r border-gray-300">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(stage.status)}
                    {stage.stageDisplayName || stage.stage.toUpperCase()}
                  </div>
                </td>
                <td className={`px-4 py-3 border-r border-gray-300 ${getStatusColor(stage.status)}`}>
                  <span className="font-medium capitalize">{stage.status || 'Pending'}</span>
                </td>
                <td className="px-4 py-3 border-r border-gray-300">
                  {stage.completedDate ? (
                    <div>
                      <div className="font-medium text-gray-900">
                        {new Date(stage.completedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </div>
                      <div className="text-xs text-gray-600">by {stage.completedBy?.name}</div>
                    </div>
                  ) : (
                    <span className="text-red-600 font-medium">When</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {stage.receivedDate ? (
                    <div>
                      <div className="font-medium text-gray-900">
                        {new Date(stage.receivedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </div>
                      <div className="text-xs text-gray-600">by {stage.receivedBy?.name}</div>
                    </div>
                  ) : stage.status === 'completed' ? (
                    <span className="text-yellow-600 font-medium">Pending</span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Notes Section */}
      {sampleProcess.some(s => s.notes) && (
        <div className="p-4 bg-gray-50 border-t border-gray-300">
          <h4 className="font-semibold text-gray-900 mb-2">Notes:</h4>
          <div className="space-y-2">
            {sampleProcess.filter(s => s.notes).map(stage => (
              <div key={stage.stage} className="text-sm">
                <span className="font-medium text-gray-700">{stage.stageDisplayName}:</span>
                <span className="ml-2 text-gray-600">{stage.notes}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
