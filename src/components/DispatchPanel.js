'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, ChevronUp, Table, Upload } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/lib/use-toast';
import { useSession } from 'next-auth/react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import DispatchCardPrint from '@/app/dispatch/components/DispatchCardPrint';
import AirwayBillPrint from '@/app/dispatch/components/AirwayBillPrint';
import DepartmentPanelExcel from './DepartmentPanelExcel';
import UploadImage from './UploadImage';
import Image from 'next/image';
import { X, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

function DispatchImageCell({ label, images, onUploaded, onRemove, canEdit }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [previewIdx, setPreviewIdx] = useState(0);

  const hasImages = images.length > 0;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
        onChange={async (e) => {
          const files = Array.from(e.target.files || []);
          if (!files.length) return;
          const urls = [];
          for (const file of files) {
            const fileData = await new Promise(res => { const r = new FileReader(); r.onload = ev => res(ev.target.result); r.readAsDataURL(file); });
            const resp = await fetch('/api/uploads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileName: file.name, fileData, srdId: 'dispatch', fieldId: label, fieldType: 'image', mimeType: file.type, size: file.size }) });
            const data = await resp.json();
            if (data.success && data.asset?.url) urls.push(data.asset.url);
          }
          if (urls.length) onUploaded(urls);
          e.target.value = '';
        }}
      />

      {hasImages ? (
        /* Attached state — green pill with eye, +, × */
        <div className="flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5">
          <span className="text-[10px] font-medium text-emerald-700">
            {label} attached{images.length > 1 ? ` (${images.length})` : ''}
          </span>
          {/* Eye preview */}
          <button type="button"
            className="h-4 w-4 inline-flex items-center justify-center rounded bg-blue-100 hover:bg-blue-200 text-blue-600"
            onClick={() => { setPreviewIdx(0); setPreview(true); }}
            title="Preview">
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
          {/* Add more */}
          {canEdit && (
            <button type="button"
              className="h-4 w-4 inline-flex items-center justify-center rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-700"
              onClick={() => inputRef.current?.click()} title="Add more">
              <Plus className="h-3 w-3" />
            </button>
          )}
          {/* Remove all */}
          {canEdit && (
            <button type="button"
              className="h-4 w-4 inline-flex items-center justify-center rounded bg-red-100 hover:bg-red-200 text-red-600"
              onClick={() => { for (let i = images.length - 1; i >= 0; i--) onRemove(i); }}
              title="Remove all">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ) : (
        /* Empty state — upload button */
        canEdit && (
          <button type="button" onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1 border border-gray-300 bg-white hover:bg-gray-50 px-2 py-0.5 rounded text-xs font-medium text-gray-900 shadow-sm">
            <Upload className="h-3 w-3" />
            {label}
          </button>
        )
      )}

      {/* Lightbox */}
      {preview && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={() => setPreview(null)}>
          <div className="relative max-w-3xl max-h-[90vh] flex flex-col items-center gap-2" onClick={e => e.stopPropagation()}>
            <img src={images[previewIdx]} alt="preview" className="max-h-[80vh] max-w-full object-contain rounded shadow-xl" />
            {images.length > 1 && (
              <div className="flex items-center gap-2">
                <button onClick={() => setPreviewIdx(i => Math.max(0, i - 1))} disabled={previewIdx === 0} className="bg-white/80 rounded-full px-2 py-0.5 text-sm disabled:opacity-30">‹</button>
                <span className="text-white text-xs">{previewIdx + 1} / {images.length}</span>
                <button onClick={() => setPreviewIdx(i => Math.min(images.length - 1, i + 1))} disabled={previewIdx === images.length - 1} className="bg-white/80 rounded-full px-2 py-0.5 text-sm disabled:opacity-30">›</button>
              </div>
            )}
            <button onClick={() => setPreview(null)} className="absolute top-1 right-1 bg-white/80 hover:bg-white rounded-full p-1">
              <svg className="h-4 w-4 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddEmailRow({ onAdd }) {
  const [val, setVal] = useState('');
  return (
    <div className="flex items-center gap-1 mt-0.5">
      <span className="text-gray-400 text-xs">+</span>
      <input
        type="email"
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={async e => {
          if (e.key === 'Enter' && val.trim()) {
            await onAdd(val.trim());
            setVal('');
          }
        }}
        placeholder="Add email..."
        className="flex-1 h-5 text-app-text text-xs border-0 border-b border-gray-300 bg-transparent focus:outline-none px-0"
      />
      <button
        onClick={async () => { if (val.trim()) { await onAdd(val.trim()); setVal(''); } }}
        className="text-xs text-blue-600 hover:text-blue-800 px-1"
      >
        +
      </button>
    </div>
  );
}

export default function DispatchPanel({ srd, onUpdate, canEdit = true }) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showExcel, setShowExcel] = useState(false);

  // Form states
  const [internalComments, setInternalComments] = useState(srd.internalComments || '');
  const [buyerComments, setBuyerComments] = useState(srd.BuyerComments || '');
  const [internalCommentImages, setInternalCommentImages] = useState(srd.internalCommentImages || []);
  const [buyerCommentImages, setBuyerCommentImages] = useState(srd.BuyerCommentImages || []);

  // Rejected reasons states
  const [internalRejectedReasons, setInternalRejectedReasons] = useState(srd.internalRejectedReasons || []);
  const [buyerRejectedReasons, setBuyerRejectedReasons] = useState(srd.BuyerRejectedReasons || []);
  const [newReason, setNewReason] = useState({ department: '', reason: '' });
  const [reasonOptions, setReasonOptions] = useState(['Vmd', 'Pattern or Specs', 'Sewing', 'Washing',]);
  const [activeAction, setActiveAction] = useState(null); // null | 'approve' | 'reject'
  const [buyerActiveAction, setBuyerActiveAction] = useState(null); // null | 'approved' | 'approved-comments' | 'rejected'
  const [buyerReasonOptions, setBuyerReasonOptions] = useState(['Vmd', 'Pattern or Specs', 'Sewing', 'Washing',]);
  const [buyerNewReason, setBuyerNewReason] = useState('');

  // Buyer selection states
  const [buyers, setBuyers] = useState([]);
  const [selectedBuyer, setSelectedBuyer] = useState(
    typeof srd.BuyerDetails === 'object' ? srd.BuyerDetails?._id : srd.BuyerDetails || ''
  );
  const [isCreatingBuyer, setIsCreatingBuyer] = useState(false);
  const [isEditingBuyer, setIsEditingBuyer] = useState(false);
  const [newBuyer, setNewBuyer] = useState({
    name: '',
    email: '',
    phone: '',
    contactPerson: [{ name: '', phone: '' }]
  });
  // Draft state for new buyer fields when no buyer is selected yet
  const [draftBuyer, setDraftBuyer] = useState({
    name: '',
    department: '',
    address: '',
    email: [],
    contactPerson: [{ name: '', phone: '' }],
  });

  // Approval dialog states
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalDialogType, setApprovalDialogType] = useState(null); // 'approve' or 'reject'
  const [approverName, setApproverName] = useState('');

  // Dispatch details states
  const [dispatchAWB, setDispatchAWB] = useState('');
  const [dispatchQty, setDispatchQty] = useState('');
  const [dispatchAddress, setDispatchAddress] = useState('');
  const [dispatchDate, setDispatchDate] = useState('');
  const [dispatchFrontImages, setDispatchFrontImages] = useState([]);
  const [dispatchBackImages, setDispatchBackImages] = useState([]);
  const autoSaveTimerRef = useRef(null);

  const triggerAutoSave = useCallback((overrides = {}) => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      handleSaveDispatchDetailsRef.current?.(overrides);
    }, 800);
  }, []);
  const handleSaveDispatchDetailsRef = useRef(null);

  // Sync state with srd prop
  useEffect(() => {
    setInternalComments(srd.internalComments || '');
    setBuyerComments(srd.BuyerComments || '');
    setInternalCommentImages(srd.internalCommentImages || []);
    setBuyerCommentImages(srd.BuyerCommentImages || []);
    setInternalRejectedReasons(srd.internalRejectedReasons || []);
    setBuyerRejectedReasons(srd.BuyerRejectedReasons || []);

    const bId = typeof srd.BuyerDetails === 'object' ? srd.BuyerDetails?._id : srd.BuyerDetails;
    setSelectedBuyer(bId || '');

    const d = srd.DispatchDetails;
    if (typeof d === 'object' && d !== null) {
      setDispatchAWB(d.awb || '');
      setDispatchQty(d.dispatchQuantity || '');
      setDispatchAddress(d.address || '');
      setDispatchDate(d.sampleDispatchDate ? new Date(d.sampleDispatchDate).toISOString().split('T')[0] : '');

      const imgObj = d.images && d.images.length > 0 ? d.images[0] : {};
      setDispatchFrontImages(imgObj.front || []);
      setDispatchBackImages(imgObj.back || []);
    }
  }, [srd]);

  useEffect(() => {
    fetch('/api/buyers')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setBuyers(data.data);
          // Auto-select buyer if SRD has a Brand/Buyer field value
          if (!selectedBuyer && srd.dynamicFields) {
            const brandField = srd.dynamicFields.find(f =>
              f.name === 'Brand' || f.name === 'Buyer'
            );
            if (brandField?.value) {
              const match = data.data.find(b =>
                b.name.toLowerCase() === brandField.value.toLowerCase()
              );
              if (match) {
                setSelectedBuyer(match._id);
                if (match.address) setDispatchAddress(match.address);
              }
            }
          }
        }
      })
      .catch(err => console.error('Failed to fetch buyers', err));
  }, [srd._id, srd.dynamicFields]);

  const handleCreateBuyer = async () => {
    if (!newBuyer.name) {
      toast({ title: 'Error', description: 'Buyer name is required', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/buyers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newBuyer.name,
          email: newBuyer.email.split(',').map(e => e.trim()).filter(e => e),
          phone: newBuyer.phone.split(',').map(p => p.trim()).filter(p => p),
          contactPerson: newBuyer.contactPerson.filter(cp => cp.name || cp.phone)
        })
      });
      const data = await response.json();
      if (data.success) {
        setBuyers([...buyers, data.data]);
        setSelectedBuyer(data.data._id);
        setIsCreatingBuyer(false);
        setNewBuyer({
          name: '',
          email: '',
          phone: '',
          contactPerson: [{ name: '', phone: '' }]
        });
        toast({ title: 'Success', description: 'Buyer created' });
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBuyer = async () => {
    if (!selectedBuyer || !newBuyer.name) {
      toast({ title: 'Error', description: 'Buyer name is required', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/buyers/${selectedBuyer}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newBuyer.name,
          email: newBuyer.email.split(',').map(e => e.trim()).filter(e => e),
          phone: newBuyer.phone.split(',').map(p => p.trim()).filter(p => p),
          contactPerson: newBuyer.contactPerson.filter(cp => cp.name || cp.phone)
        })
      });
      const data = await response.json();
      if (data.success) {
        setBuyers(buyers.map(b => b._id === selectedBuyer ? data.data : b));
        setIsCreatingBuyer(false);
        setIsEditingBuyer(false);
        toast({ title: 'Success', description: 'Buyer profile updated' });
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = () => {
    const b = buyers.find(x => x._id === selectedBuyer);
    if (!b) return;
    setNewBuyer({
      name: b.name || '',
      email: (b.email || []).join(', '),
      phone: (b.phone || []).join(', '),
      contactPerson: b.contactPerson && b.contactPerson.length > 0
        ? b.contactPerson.map(cp => ({ ...cp }))
        : [{ name: '', phone: '' }]
    });
    setIsEditingBuyer(true);
    setIsCreatingBuyer(true);
  };

  const handleAction = async (action, payload) => {
    if (!canEdit) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/srd/${srd._id}/dispatch`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload: { ...payload, author: session?.user?.name } }),
      });

      const data = await response.json();
      if (data.success) {
        toast({ title: 'Success', description: data.message });
        if (onUpdate) onUpdate(data.data);
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Re-match buyer when Brand field changes — create if doesn't exist
  useEffect(() => {
    if (!buyers.length && !srd.dynamicFields) return;
    const brandField = srd.dynamicFields?.find(f => f.name === 'Brand' || f.name === 'Buyer');
    const brandName = brandField?.value?.trim();
    if (!brandName) return;

    const match = buyers.find(b => b.name.toLowerCase() === brandName.toLowerCase());
    if (match) {
      if (match._id?.toString() !== selectedBuyer?.toString()) {
        setSelectedBuyer(match._id);
        if (match.address) setDispatchAddress(match.address);
      }
    } else {
      // Brand doesn't exist — create it automatically
      fetch('/api/buyers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: brandName }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            setBuyers(prev => [...prev, data.data]);
            setSelectedBuyer(data.data._id);
          }
        })
        .catch(e => console.error('Failed to create buyer', e));
    }
  }, [srd.dynamicFields, buyers.length]);

  const openApprovalDialog = (type) => {
    setApprovalDialogType(type);
    setApproverName('');
    setApprovalDialogOpen(true);
  };

  const handleInternalVerify = () => {
    if (!approverName.trim()) {
      toast({ title: 'Error', description: 'Please enter the approver name', variant: 'destructive' });
      return;
    }
    const approved = approvalDialogType === 'approve';
    setApprovalDialogOpen(false);
    handleAction('internal_approval', {
      internalApproved: approved,
      internalComments,
      internalApprovedBy: approverName.trim(),
      internalRejectedReasons: !approved ? internalRejectedReasons : [],
    });
  };

  const handleSaveDispatchDetails = async () => {
    let buyerId = selectedBuyer;

    // Auto-create buyer from draft if none selected
    if (!buyerId && draftBuyer.name.trim()) {
      try {
        const res = await fetch('/api/buyers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: draftBuyer.name.trim(),
            department: draftBuyer.department,
            address: draftBuyer.address,
            email: draftBuyer.email,
            contactPerson: draftBuyer.contactPerson.filter(cp => cp.name || cp.phone),
          }),
        });
        const data = await res.json();
        if (data.success) {
          setBuyers(prev => [...prev, data.data]);
          setSelectedBuyer(data.data._id);
          buyerId = data.data._id;
        } else {
          toast({ title: 'Error', description: data.error, variant: 'destructive' });
          return;
        }
      } catch (e) {
        toast({ title: 'Error', description: e.message, variant: 'destructive' });
        return;
      }
    }

    if (!buyerId) {
      toast({ title: 'Error', description: 'Please select or enter a Brand name.', variant: 'destructive' });
      return;
    }
    handleAction('save_dispatch_details', {
      awb: dispatchAWB,
      dispatchQuantity: dispatchQty,
      address: dispatchAddress,
      sampleDispatchDate: dispatchDate,
      BuyerDetails: buyerId,
      images: [{ front: dispatchFrontImages, back: dispatchBackImages }]
    });
  };
  // Keep ref in sync so triggerAutoSave can call the latest version
  handleSaveDispatchDetailsRef.current = handleSaveDispatchDetails;

  const handleDispatchToBuyer = () => {
    handleAction('dispatch_to_buyer', {});
  };

  const handleBuyerApproval = (approved) => {
    handleAction('buyer_approval', {
      BuyerApproved: approved,
      BuyerApprovedBy: session?.user?.name + ' | ' + session.user?.role,
      BuyerComments: buyerComments,
      BuyerCommentImages: buyerCommentImages,
      BuyerRejectedReasons: !approved ? buyerRejectedReasons : [],
    });
  };

  return (
    <div className="space-y-2">
      {/* uncomment this if u want to see sr data in dipatch module */}
      {/* <div className="flex flex-col space-y-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowExcel(!showExcel)}
          className="w-fit flex items-center gap-2 text-blue-700 border-blue-200 hover:bg-blue-50"
        >
          <Table className="h-4 w-4" />
          {showExcel ? 'Hide SRD Data' : 'Show SRD Data'}
          {showExcel ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>

        {showExcel && (
          <div className="border rounded-lg shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <DepartmentPanelExcel
              srd={srd}
              userRole="viewer"
              readOnly={true}
              onUpdate={() => { }} // No-op for read-only
              onSrdUpdate={onUpdate}
            />
          </div>
        )}
      </div> */}

      {/* Dispatch Approval - Excel Style */}
      <div className="border border-gray-300 bg-white">
        {/* Section Header */}
        <div className="grid grid-cols-12 bg-gray-100 border-b border-gray-300 px-2 py-0.5 items-center">
          <div className="col-span-10">
            <span className="text-app-text font-semibold uppercase">Conditions</span>
          </div>
          <span className={`text-app-text font-medium ${srd.internalApproved ? 'text-green-600' : srd.internalApprovedDate ? 'text-red-600' : 'text-blue-600'}`}>
            {srd.internalApproved ? `Approved by ${srd.internalApprovedBy}` : srd.internalApprovedDate ? `Rejected | ${(srd.internalRejectedReasons || []).map(r => r.reason).join(', ')}` : 'Pending Verification'}
          </span>
        </div>

        {/* Grid Content */}
        {/* <div className="border-b border-gray-300">
          <div className="grid grid-cols-12">
            <div className="col-span-2 bg-gray-50 border-r border-gray-300 px-2 py-0 flex items-center">
              <span className="text-app-text font-semibold text-gray-700">Comments</span>
            </div>
            <div className="col-span-10 px-2 py-0">
              <Input
                placeholder="Good Work"
                value={internalComments}
                onChange={(e) => setInternalComments(e.target.value)}
                disabled={!canEdit || !!srd.internalApprovedDate}
                className="text-app-text resize-none h-6 border-gray-300 rounded-none"
              />
            </div>
          </div>
        </div> */}

        {internalRejectedReasons.length > 0 && false && (
          <div className="border-b border-gray-300">
            <div className="grid grid-cols-12">
              <div className="col-span-2 bg-gray-50 border-r border-gray-300 px-2 py-0">
                <span className="text-app-text font-semibold text-gray-700">Rejection Reasons</span>
              </div>
              <div className="col-span-10 px-2 py-0 space-y-0">
                {internalRejectedReasons.map((r, i) => (
                  <div key={i} className="flex justify-between items-center bg-gray-50 px-2 py-0 text-app-text border border-gray-200">
                    <div>
                      <span className="font-semibold text-gray-600 mr-2">{r.department.toUpperCase()}</span>
                      <span className="text-gray-700">{r.reason}</span>
                    </div>
                    {canEdit && !srd.internalApprovedDate && (
                      <button onClick={() => setInternalRejectedReasons(prev => prev.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500">
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {(
          <div className="border-b border-gray-300">
            {/* Row 1: Approved For Dispatch */}
            <div className="grid grid-cols-12 border-b border-gray-300">
              <div className="col-span-3 border-r border-gray-300 px-2 py-0.5 flex items-center">
                <button
                  className="inline-flex items-center justify-center w-36 px-2 border border-green-400 bg-green-500 text-green-700 text-app-text font-medium hover:bg-green-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  disabled={!!srd.internalApprovedDate || !canEdit}
                  onClick={() => setActiveAction(activeAction === 'approve' ? null : 'approve')}
                >
                  Approved For Dispatch
                </button>
              </div>
              <div className="col-span-9 px-2 py-0.5 flex items-center">
                {activeAction === 'approve' && !srd.internalApprovedDate && (
                  <div className="flex items-center gap-2">
                    <span className="text-app-text font-semibold text-gray-700 text-sm shrink-0">Approved By</span>
                    <Input
                      placeholder="Enter name..."
                      value={approverName}
                      onChange={e => setApproverName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && approverName.trim() && handleAction('internal_approval', { internalApproved: true, internalComments, internalApprovedBy: approverName.trim(), internalRejectedReasons: [], internalCommentImages })}
                      className="border-gray-300 rounded-none h-6 w-40"
                      autoFocus
                    />
                    <button
                      onClick={() => {
                        if (!approverName.trim()) { toast({ title: 'Error', description: 'Enter approver name', variant: 'destructive' }); return; }
                        handleAction('internal_approval', { internalApproved: true, internalComments, internalApprovedBy: approverName.trim(), internalRejectedReasons: [], internalCommentImages });
                        setActiveAction(null);
                      }}
                      disabled={loading}
                      className="inline-flex items-center justify-center w-36 px-2 border border-green-400 bg-green-500 text-black text-app-text font-medium hover:bg-green-600 disabled:opacity-40"
                    >
                      Confirm
                    </button>
                    <button onClick={() => setActiveAction(null)} className="text-gray-400 hover:text-gray-600"><X className="h-3 w-3" /></button>
                  </div>
                )}
                {srd.internalApproved && (
                  <span className="text-app-text text-green-700 font-medium">Approved by {srd.internalApprovedBy}</span>
                )}
              </div>
            </div>

            {/* Row 2: Internal Rejected */}
            <div className="grid grid-cols-12">
              <div className="col-span-3 border-r border-gray-300 px-2 py-0.5 flex items-center">
                <button
                  className="inline-flex items-center justify-center w-36 px-2 border border-red-400 bg-red-500 text-red-700 text-app-text font-medium hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  disabled={!!srd.internalApprovedDate || !canEdit}
                  onClick={() => setActiveAction(activeAction === 'reject' ? null : 'reject')}
                >
                  Internal Rejected
                </button>
              </div>
              <div className="col-span-9 px-2 py-0.5 flex items-center gap-2 flex-wrap">
                {/* Show added reasons */}
                {internalRejectedReasons.length > 0 && (
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                    {internalRejectedReasons.map((r, i) => (
                      <span key={i} className="text-app-text text-gray-800 text-sm">
                        <span className="font-bold mr-1">{i + 1}</span>{r.reason}
                        {canEdit && !srd.internalApprovedDate && (
                          <button onClick={() => setInternalRejectedReasons(prev => prev.filter((_, idx) => idx !== i))} className="ml-1 text-gray-400 hover:text-red-600"><X className="h-2.5 w-2.5 inline" /></button>
                        )}
                      </span>
                    ))}
                  </div>
                )}

                {/* Inline reject form — just combobox + Reject */}
                {activeAction === 'reject' && !srd.internalApprovedDate && (
                  <div className="flex items-center gap-1.5">
                    {/* Combobox */}
                    <div className="relative flex items-center border border-gray-300 rounded h-6 bg-white overflow-hidden">
                      <input
                        className="h-full px-1.5 text-app-text text-sm bg-transparent focus:outline-none w-32"
                        value={newReason.reason}
                        onChange={e => setNewReason({ ...newReason, reason: e.target.value })}
                        placeholder="Reason..."
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter' && newReason.reason.trim()) {
                            const val = newReason.reason.trim();
                            if (!reasonOptions.includes(val)) setReasonOptions(prev => [...prev, val]);
                            setInternalRejectedReasons(prev => [...prev, { department: '', reason: val }]);
                            setNewReason({ ...newReason, reason: '' });
                          }
                        }}
                      />
                      <select
                        className="h-full w-6 border-l border-gray-300 bg-white text-gray-600 focus:outline-none cursor-pointer appearance-none text-center text-xs"
                        value=""
                        onChange={e => { if (e.target.value) setNewReason({ ...newReason, reason: e.target.value }); }}
                      >
                        <option value="">▾</option>
                        {reasonOptions.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>

                    <button
                      onClick={() => {
                        const val = newReason.reason.trim();
                        const pending = val ? [{ department: '', reason: val }] : [];
                        if (!reasonOptions.includes(val) && val) setReasonOptions(prev => [...prev, val]);
                        const reasons = [...internalRejectedReasons, ...pending];
                        if (!reasons.length) { toast({ title: 'Error', description: 'Add at least one reason', variant: 'destructive' }); return; }
                        handleAction('internal_approval', { internalApproved: false, internalComments, internalApprovedBy: session?.user?.name || 'System', internalRejectedReasons: reasons, internalCommentImages });
                        setActiveAction(null);
                        setNewReason({ department: '', reason: '' });
                      }}
                      disabled={loading}
                      className="inline-flex items-center justify-center w-36 px-2 border border-red-400 bg-red-500 text-black text-app-text font-medium hover:bg-red-600 disabled:opacity-40"
                    >
                      Reject
                    </button>
                    <button onClick={() => setActiveAction(null)} className="text-gray-400 hover:text-gray-600"><X className="h-3 w-3" /></button>
                  </div>
                )}

                {srd.internalApprovedDate && !srd.internalApproved && (
                  <span className="text-app-text text-red-700 font-medium">Rejected by {srd.internalApprovedBy}</span>
                )}
              </div>
            </div>
          </div>
        )}


      </div>

      {srd.internalApproved && (
        <div className="border border-gray-300 bg-white">
          {/* Header */}
          <div className="grid grid-cols-12 bg-gray-100 border-b border-gray-300">
            <div className="col-span-2 px-2 py-0.5 border-r border-gray-300">
              <span className="text-app-text font-semibold uppercase">Dispatch Details</span>
            </div>
            <div className="col-span-8 border-r border-gray-300"></div>
            <div className="col-span-2 px-2 py-0.5 flex justify-end items-center">
              <span className={`text-app-text font-medium text-xs ${srd.DispatchDetails ? 'text-green-600' : 'text-yellow-600'}`}>
                {srd.DispatchDetails ? 'Details Saved' : 'Pending Details'}
              </span>
            </div>
          </div>

          {/* Sample Dispatch Date | Awb # | Attach Front Pic */}
          <div className="grid grid-cols-12 border-b border-gray-300">
            <div className="col-span-2 bg-gray-50 border-r border-gray-300 px-2 py-0.5 flex items-center">
              <span className="text-app-text font-semibold text-gray-700">Sample Dispatch Date</span>
            </div>
            <div className="col-span-3 border-r border-gray-300 px-2 py-0.5">
              <Input type="date" value={dispatchDate} onChange={e => setDispatchDate(e.target.value)}
                disabled={!canEdit || srd.sampleDispatchedToBuyer}
                onBlur={() => selectedBuyer && triggerAutoSave()}
                className="h-6 text-app-text rounded-none border-0 border-b border-gray-300 px-0 w-full" />
            </div>
            <div className="col-span-1 bg-gray-50 border-r border-gray-300 px-2 py-0.5 flex items-center">
              <span className="text-app-text font-semibold text-gray-700">Awb #</span>
            </div>
            <div className="col-span-3 border-r border-gray-300 px-2 py-0.5">
              <Input value={dispatchAWB} onChange={e => setDispatchAWB(e.target.value)} placeholder="####"
                disabled={!canEdit || srd.sampleDispatchedToBuyer}
                onBlur={() => selectedBuyer && triggerAutoSave()}
                className="h-6 text-app-text rounded-none border-0 border-b border-gray-300 px-0 w-full" />
            </div>
            <div className="col-span-3 px-2 py-0.5 flex items-center gap-1">
              <DispatchImageCell
                label="Front Pic"
                images={dispatchFrontImages}
                canEdit={canEdit && !srd.sampleDispatchedToBuyer}
                onUploaded={(urls) => { setDispatchFrontImages(prev => { const next = [...prev, ...urls]; triggerAutoSave(); return next; })}}
                onRemove={(i) => setDispatchFrontImages(prev => prev.filter((_, idx) => idx !== i))}
              />
            </div>
          </div>

          {/* Dispatch Qty | Dispatch Date | Attach Back Pic */}
          <div className="grid grid-cols-12 border-b border-gray-300">
            <div className="col-span-2 bg-gray-50 border-r border-gray-300 px-2 py-0 flex items-center">
              <span className="text-app-text font-semibold text-gray-700">Dispatch Qty</span>
            </div>
            <div className="col-span-3 border-r border-gray-300 px-2 py-0">
              <Input type="number" min="0" value={dispatchQty} onChange={e => setDispatchQty(Math.max(0, e.target.value))} placeholder="0"
                disabled={!canEdit || srd.sampleDispatchedToBuyer}
                onBlur={() => selectedBuyer && triggerAutoSave()}
                className="h-6 text-app-text rounded-none border-0 border-b border-gray-300 px-0 w-full" />
            </div>
            <div className="col-span-1 bg-gray-50 border-r border-gray-300 px-2 py-0 flex items-center">
              <span className="text-app-text font-semibold text-gray-700 text-xs">Dept</span>
            </div>
            <div className="col-span-3 border-r border-gray-300 px-2 py-0">
              {(() => {
                const b = selectedBuyer ? buyers.find(x => x._id?.toString() === selectedBuyer?.toString()) : null;
                return (
                  <input
                    className="h-6 text-app-text rounded-none border-0 border-b border-gray-300 px-0 w-full bg-transparent focus:outline-none text-gray-700"
                    value={b ? (b.department ?? '') : draftBuyer.department}
                    placeholder=""
                    disabled={!canEdit || srd.sampleDispatchedToBuyer}
                    onChange={e => {
                      if (b) setBuyers(prev => prev.map(x => x._id?.toString() === b._id?.toString() ? { ...x, department: e.target.value } : x));
                      else setDraftBuyer(prev => ({ ...prev, department: e.target.value }));
                    }}
                    onBlur={async e => {
                      if (!b) return;
                      const bId = b._id?.toString();
                      setBuyers(prev => prev.map(x => x._id?.toString() === bId ? { ...x, department: e.target.value } : x));
                      await fetch(`/api/buyers/${bId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ department: e.target.value }) });
                    }}
                  />
                );
              })()}
            </div>
            <div className="col-span-3 px-2 py-0.5 flex items-center gap-1">
              <DispatchImageCell
                label="Back Pic"
                images={dispatchBackImages}
                canEdit={canEdit && !srd.sampleDispatchedToBuyer}
                onUploaded={(urls) => { setDispatchBackImages(prev => { const next = [...prev, ...urls]; triggerAutoSave(); return next; })}}
                onRemove={(i) => setDispatchBackImages(prev => prev.filter((_, idx) => idx !== i))}
              />
            </div>
          </div>

          {/* Buyer row — auto-matched, no dropdown */}
          <div className="grid grid-cols-12 border-b border-gray-300 h-6 py-0.5">
            <div className="col-span-2 bg-gray-50 border-r border-gray-300 px-2 py-0.5 flex items-center">
              <span className="text-app-text font-semibold text-gray-700">Brand</span>
            </div>
            <div className="col-span-10 px-2 py-0.5 flex items-center gap-2">
              {(() => {
                const b = selectedBuyer ? buyers.find(x => x._id?.toString() === selectedBuyer?.toString()) : null;
                const srdBuyerName = srd.dynamicFields?.find(f => f.name === 'Brand' || f.name === 'Buyer')?.value || '';
                return b ? (
                  <span className="text-app-text text-gray-800 font-medium">{b.name}</span>
                ) : (
                  <span className="text-app-text text-gray-400 italic">{srdBuyerName || 'No buyer matched'}</span>
                );
              })()}
            </div>
          </div>

          {/* Inline buyer form */}
          {(() => {
            const b = selectedBuyer ? buyers.find(x => x._id?.toString() === selectedBuyer?.toString()) : null;
            const contacts = b ? (Array.isArray(b.contactPerson) ? b.contactPerson : []) : draftBuyer.contactPerson;
            const safeContacts = contacts.length > 0 ? contacts : [{ name: '', phone: '', email: '' }];

            const patchBuyer = async (patch) => {
              if (!b) return;
              const bId = b._id?.toString();
              setBuyers(prev => prev.map(x => x._id?.toString() === bId ? { ...x, ...patch } : x));
              const res = await fetch(`/api/buyers/${bId}`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patch),
              });
              const data = await res.json();
              if (data.success) setBuyers(prev => prev.map(x => x._id?.toString() === bId ? data.data : x));
            };

            const updateDraft = (patch) => setDraftBuyer(prev => ({ ...prev, ...patch }));

            const createBuyerFromDraft = async (nameOverride) => {
              const name = (nameOverride || draftBuyer.name).trim();
              if (!name) return;
              try {
                const res = await fetch('/api/buyers', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    name,
                    department: draftBuyer.department,
                    address: draftBuyer.address,
                    email: draftBuyer.email,
                    contactPerson: draftBuyer.contactPerson.filter(cp => cp.name || cp.phone || cp.email),
                  }),
                });
                const data = await res.json();
                if (data.success) {
                  setBuyers(prev => [...prev, data.data]);
                  setSelectedBuyer(data.data._id);
                }
              } catch (e) { console.error('Failed to create buyer', e); }
            };

            const updateContact = (i, field, value) => {
              const updated = safeContacts.map((c, j) => j === i ? { ...c, [field]: value } : c);
              if (b) setBuyers(prev => prev.map(x => x._id?.toString() === b._id?.toString() ? { ...x, contactPerson: updated } : x));
              else updateDraft({ contactPerson: updated });
            };

            const saveContact = (i, field, value) => {
              if (!b) return;
              const updated = safeContacts.map((c, j) => j === i ? { ...c, [field]: value } : c);
              patchBuyer({ contactPerson: updated });
            };

            return (
              <>
                {/* Buyer name — only when no buyer matched */}
                {!b && (
                  <div className="grid grid-cols-12 border-b border-gray-300">
                    <div className="col-span-2 bg-gray-50 border-r border-gray-300 px-2 py-0.5 flex items-center">
                      <span className="text-app-text font-semibold text-gray-700">Buyer Name</span>
                    </div>
                    <div className="col-span-10 px-2 py-0.5">
                      <input
                        className="w-full h-5 text-app-text border-0 border-b border-gray-300 bg-transparent focus:outline-none px-0 text-gray-700"
                        value={draftBuyer.name}
                        placeholder="Enter buyer name..."
                        disabled={!canEdit || srd.sampleDispatchedToBuyer}
                        onChange={e => updateDraft({ name: e.target.value })}
                        onBlur={e => e.target.value.trim() && createBuyerFromDraft(e.target.value.trim())}
                      />
                    </div>
                  </div>
                )}

                {/* Contact Person rows: Name | Email | Contact No. */}
                {safeContacts.map((cp, i) => (
                  <div key={i} className="grid grid-cols-12 border-b border-gray-300">
                    <div className="col-span-2 bg-gray-50 border-r border-gray-300 px-2 py-0.5 flex items-center">
                      <span className="text-app-text font-semibold text-gray-700">{i === 0 ? 'Contact Person' : ''}</span>
                    </div>
                    {/* Name */}
                    <div className="col-span-3 border-r border-gray-300 px-2 py-0.5 flex items-center gap-1">
                      <span className="text-app-text text-gray-500 text-xs shrink-0">Mr./Ms.</span>
                      <input
                        className="flex-1 h-5 text-app-text border-0 border-b border-gray-300 bg-transparent focus:outline-none px-0 text-gray-700"
                        value={cp.name || ''}
                        placeholder="Name"
                        disabled={!canEdit || srd.sampleDispatchedToBuyer}
                        onChange={e => updateContact(i, 'name', e.target.value)}
                        onBlur={e => saveContact(i, 'name', e.target.value)}
                      />
                    </div>
                    {/* Email */}
                    <div className="col-span-4 border-r border-gray-300 px-2 py-0.5 flex items-center gap-1">
                      <input
                        className="flex-1 h-5 text-app-text border-0 border-b border-gray-300 bg-transparent focus:outline-none px-0 text-gray-700"
                        value={cp.email || ''}
                        placeholder="Email"
                        type="email"
                        disabled={!canEdit || srd.sampleDispatchedToBuyer}
                        onChange={e => updateContact(i, 'email', e.target.value)}
                        onBlur={e => saveContact(i, 'email', e.target.value)}
                      />
                    </div>
                    {/* Contact No. + add/remove */}
                    <div className="col-span-3 px-2 py-0.5 flex items-center gap-1">
                      <input
                        className="flex-1 h-5 text-app-text border-0 border-b border-gray-300 bg-transparent focus:outline-none px-0 text-gray-700"
                        value={cp.phone || ''}
                        placeholder="Phone"
                        disabled={!canEdit || srd.sampleDispatchedToBuyer}
                        onChange={e => updateContact(i, 'phone', e.target.value)}
                        onBlur={e => saveContact(i, 'phone', e.target.value)}
                      />
                      {/* + to add new contact on last row */}
                      {i === safeContacts.length - 1 && canEdit && !srd.sampleDispatchedToBuyer && (
                        <button className="text-xs text-blue-600 hover:text-blue-800 shrink-0 ml-1"
                          onClick={() => {
                            const updated = [...safeContacts, { name: '', phone: '', email: '' }];
                            if (b) patchBuyer({ contactPerson: updated });
                            else updateDraft({ contactPerson: updated });
                          }}>+</button>
                      )}
                      {/* × to remove this contact */}
                      {safeContacts.length > 1 && canEdit && !srd.sampleDispatchedToBuyer && (
                        <button className="text-gray-300 hover:text-red-500"
                          onClick={() => {
                            const updated = safeContacts.filter((_, j) => j !== i);
                            if (b) patchBuyer({ contactPerson: updated });
                            else updateDraft({ contactPerson: updated });
                          }}><X className="h-3 w-3" /></button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Address row */}
                <div className="grid grid-cols-12 border-b border-gray-300">
                  <div className="col-span-2 bg-gray-50 border-r border-gray-300 px-2 py-0 flex items-center">
                    <span className="text-app-text font-semibold text-gray-700">Address</span>
                  </div>
                  <div className="col-span-10 px-2 py-0">
                    <input
                      className="w-full h-5 text-app-text border-0 border-b border-gray-300 bg-transparent focus:outline-none px-0 text-gray-700"
                      value={dispatchAddress}
                      placeholder=""
                      disabled={!canEdit || srd.sampleDispatchedToBuyer}
                      onChange={e => { setDispatchAddress(e.target.value); if (!b) updateDraft({ address: e.target.value }); }}
                      onBlur={e => b && patchBuyer({ address: e.target.value })}
                    />
                  </div>
                </div>
              </>
            );
          })()}

          {/* Buttons row */}
          {canEdit && !srd.sampleDispatchedToBuyer && (
            <div className="grid grid-cols-12 border-b border-gray-300">
              <div className="col-span-2 bg-gray-50 border-r border-gray-300"></div>
              <div className="col-span-10 px-2 py-0.5 flex gap-1.5 items-center">
                {srd.DispatchDetails && (
                  <Button onClick={handleDispatchToBuyer} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white h-6 text-app-text rounded-none">
                    Dispatch Sample to Buyer
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className={`border border-gray-300 bg-white ${!srd.sampleDispatchedToBuyer ? 'hidden' : ''}`}>
        {/* Header */}
        <div className="grid grid-cols-12 bg-gray-100 border-b border-gray-300 px-2 py-0.5 items-center">
          <div className="col-span-10">
            <span className="text-app-text font-semibold uppercase">Buyer Comments</span>
          </div>
          <span className={`text-app-text font-medium text-xs ${srd.BuyerApproved ? 'text-green-600' : srd.BuyerApprovedDate ? 'text-red-600' : 'text-yellow-600'}`}>
            {srd.BuyerApproved ? `Approved${srd.BuyerComments ? ' with comments' : ''}` : srd.BuyerApprovedDate ? `Rejected | ${(srd.BuyerRejectedReasons || []).map(r => r.reason).join(', ')}` : 'Waiting for Buyer'}
          </span>
        </div>

        {/* Row 1: Approved */}
        <div className="grid grid-cols-12 border-b border-gray-300">
          <div className="col-span-3 border-r border-gray-300 px-2 py-0.5 flex items-center">
            <button
              className="inline-flex items-center justify-center w-40 px-2 border border-green-400 bg-green-500 text-app-text font-medium hover:bg-green-100 disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={!!srd.BuyerApprovedDate || !canEdit}
              onClick={() => setBuyerActiveAction(buyerActiveAction === 'approved' ? null : 'approved')}
            >
              Approved
            </button>
          </div>
          <div className="col-span-9 px-2 py-0.5 flex items-center">
            {buyerActiveAction === 'approved' && !srd.BuyerApprovedDate && (
              <div className="flex items-center gap-2">
                <button onClick={() => { handleBuyerApproval(true); setBuyerActiveAction(null); }} disabled={loading}
                  className="inline-flex items-center justify-center w-36 px-2 border border-green-400 bg-green-500 text-black text-app-text font-medium hover:bg-green-600 disabled:opacity-40">
                  Confirm Approval
                </button>
                <button onClick={() => setBuyerActiveAction(null)} className="text-gray-400 hover:text-gray-600"><X className="h-3 w-3" /></button>
              </div>
            )}
            {srd.BuyerApproved && !srd.BuyerComments && (
              <span className="text-app-text text-green-700 font-medium">Approved by {srd.BuyerApprovedBy}</span>
            )}
          </div>
        </div>

        {/* Row 2: Approved With Comments */}
        <div className="grid grid-cols-12 border-b border-gray-300">
          <div className="col-span-3 border-r border-gray-300 px-2 flex items-center">
            <button
              className="inline-flex items-center justify-center w-40 px-0 border border-yellow-400 bg-yellow-500 text-app-text font-medium hover:bg-yellow-100 disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={!!srd.BuyerApprovedDate || !canEdit}
              onClick={() => setBuyerActiveAction(buyerActiveAction === 'approved-comments' ? null : 'approved-comments')}
            >
              Approved With Comments
            </button>
          </div>
          <div className="col-span-6 px-2 flex items-center gap-2 border-r border-gray-300">
            {buyerActiveAction === 'approved-comments' && !srd.BuyerApprovedDate && (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  placeholder="Enter comments..."
                  value={buyerComments}
                  onChange={e => setBuyerComments(e.target.value)}
                  className="border-gray-300 rounded-none h-6 flex-1"
                  autoFocus
                />
                <button onClick={() => {
                  if (!buyerComments.trim()) { toast({ title: 'Error', description: 'Enter a comment', variant: 'destructive' }); return; }
                  handleBuyerApproval(true);
                  setBuyerActiveAction(null);
                }} disabled={loading} className="inline-flex items-center justify-center w-36 px-2 border border-yellow-400 bg-yellow-500 text-black text-app-text font-medium hover:bg-yellow-600 disabled:opacity-40">
                  Confirm
                </button>
                <button onClick={() => setBuyerActiveAction(null)} className="text-gray-400 hover:text-gray-600"><X className="h-3 w-3" /></button>
              </div>
            )}
            {srd.BuyerApproved && srd.BuyerComments && (
              <span className="text-app-text text-yellow-700 font-medium">{srd.BuyerComments}</span>
            )}
          </div>
          <div className="col-span-3 px-2 py-0.5 flex items-center">
            <DispatchImageCell
              label="Attach Comment"
              images={buyerCommentImages}
              canEdit={canEdit && !srd.BuyerApprovedDate}
              onUploaded={(urls) => setBuyerCommentImages(prev => [...prev, ...urls])}
              onRemove={(i) => setBuyerCommentImages(prev => prev.filter((_, idx) => idx !== i))}
            />
          </div>
        </div>

        {/* Row 3: Rejected */}
        <div className="grid grid-cols-12 border-b border-gray-300">
          <div className="col-span-3 border-r border-gray-300 px-2 py-0.5 flex items-center">
            <button
              className="inline-flex items-center justify-center w-40 px-2 border border-red-400 bg-red-500 text-app-text font-medium hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={!!srd.BuyerApprovedDate || !canEdit}
              onClick={() => setBuyerActiveAction(buyerActiveAction === 'rejected' ? null : 'rejected')}
            >
              Rejected
            </button>
          </div>
          <div className="col-span-9 px-2 py-0.5 flex items-center gap-2 flex-wrap">
            {/* Show added reasons */}
            {buyerRejectedReasons.length > 0 && (
              <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                {buyerRejectedReasons.map((r, i) => (
                  <span key={i} className="text-app-text text-gray-800 text-sm">
                    <span className="font-bold mr-1">{i + 1}</span>{r.reason}
                    {canEdit && !srd.BuyerApprovedDate && (
                      <button onClick={() => setBuyerRejectedReasons(prev => prev.filter((_, idx) => idx !== i))} className="ml-1 text-gray-400 hover:text-red-600"><X className="h-2.5 w-2.5 inline" /></button>
                    )}
                  </span>
                ))}
              </div>
            )}

            {buyerActiveAction === 'rejected' && !srd.BuyerApprovedDate && (
              <div className="flex items-center gap-1.5">
                {/* Combobox */}
                <div className="relative flex items-center border border-gray-300 rounded h-6 bg-white overflow-hidden">
                  <input
                    className="h-full px-1.5 text-app-text text-sm bg-transparent focus:outline-none w-32"
                    value={buyerNewReason}
                    onChange={e => setBuyerNewReason(e.target.value)}
                    placeholder="Reason..."
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter' && buyerNewReason.trim()) {
                        const val = buyerNewReason.trim();
                        if (!buyerReasonOptions.includes(val)) setBuyerReasonOptions(prev => [...prev, val]);
                        setBuyerRejectedReasons(prev => [...prev, { department: '', reason: val }]);
                        setBuyerNewReason('');
                      }
                    }}
                  />
                  <select className="h-full w-6 border-l border-gray-300 bg-white text-gray-600 focus:outline-none cursor-pointer appearance-none text-center text-xs"
                    value="" onChange={e => { if (e.target.value) setBuyerNewReason(e.target.value); }}>
                    <option value="">▾</option>
                    {buyerReasonOptions.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <button onClick={() => {
                  const val = buyerNewReason.trim();
                  const pending = val ? [{ department: '', reason: val }] : [];
                  if (!buyerReasonOptions.includes(val) && val) setBuyerReasonOptions(prev => [...prev, val]);
                  const reasons = [...buyerRejectedReasons, ...pending];
                  if (!reasons.length) { toast({ title: 'Error', description: 'Add at least one reason', variant: 'destructive' }); return; }
                  handleBuyerApproval(false);
                  setBuyerActiveAction(null);
                  setBuyerNewReason('');
                }} disabled={loading} className="inline-flex items-center justify-center w-36 px-2 py-0.5 rounded border border-red-400 bg-red-500 text-black text-app-text font-medium hover:bg-red-600 disabled:opacity-40">
                  Reject
                </button>
                <button onClick={() => setBuyerActiveAction(null)} className="text-gray-400 hover:text-gray-600"><X className="h-3 w-3" /></button>
              </div>
            )}

            {srd.BuyerApprovedDate && !srd.BuyerApproved && (
              <span className="text-app-text text-red-700 font-medium">Rejected by {srd.BuyerApprovedBy}</span>
            )}
          </div>
        </div>
      </div>

      {/* Approval Dialog */}
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {approvalDialogType === 'approve' ? 'Approve SRD' : 'Reject SRD'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="approverName"> {approvalDialogType === 'approve' ? 'Approved By' : 'Rejected By'}</Label>
            <Input
              id="approverName"
              placeholder="Enter name..."
              value={approverName}
              onChange={(e) => setApproverName(e.target.value)}
              className="border-gray-300"
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setApprovalDialogOpen(false)}>
              Cancel
            </Button>

          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
