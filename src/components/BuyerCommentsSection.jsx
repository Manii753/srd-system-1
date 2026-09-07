'use client';

import { DispatchImageCell } from './DispatchPanel';

export default function BuyerCommentsSection({ srd }) {
  const rejectedReasons = (srd?.BuyerRejectedReasons || []).map((r) => r.reason).join(', ');
  const hasImages = (srd?.BuyerCommentImages || []).length > 0;

  return (
    <div className="border border-gray-300 bg-white mt-2">
      <div className="flex justify-between bg-gray-100 border-b border-gray-300 px-2 py-0 items-center h-6">
        <div className="">
          <span className="text-app-text font-semibold uppercase">Buyer Comments</span>
        </div>
        <span className={`text-app-text font-medium text-xs ${srd?.BuyerApproved ? 'text-green-600' : srd?.BuyerApprovedDate ? 'text-red-600' : 'text-yellow-600'}`}>
          {srd?.BuyerApproved
            ? `Approved${srd?.BuyerComments ? ' with comments' : ''}`
            : srd?.BuyerApprovedDate
              ? `Rejected | ${rejectedReasons}`
              : 'Waiting for Buyer'}
        </span>
      </div>

      <div className="px-3 py-2 flex items-center gap-4">
        {srd?.BuyerComments ? (
          <span className="text-app-text text-gray-800">{srd.BuyerComments}</span>
        ) : srd?.BuyerApproved ? (
          <span className="text-app-text text-green-700 font-medium">Approved by {srd.BuyerApprovedBy}</span>
        ) : srd?.BuyerApprovedDate ? (
          <span className="text-app-text text-red-700 font-medium">
            Rejected by {srd.BuyerApprovedBy}
            {rejectedReasons && (
              <span className="ml-1 text-gray-600 font-normal">— {rejectedReasons}</span>
            )}
          </span>
        ) : (
          <span className="text-app-text text-gray-400 italic">No comment yet</span>
        )}
        {hasImages && (
          <DispatchImageCell
            label="Comment Image"
            images={srd.BuyerCommentImages}
            canEdit={false}
            onUploaded={() => {}}
            onRemove={() => {}}
          />
        )}
      </div>
    </div>
  );
}