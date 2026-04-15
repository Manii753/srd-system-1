'use client';

import { useState, useEffect, useRef } from 'react';
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
        Add
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

  // Rejected reasons states
  const [internalRejectedReasons, setInternalRejectedReasons] = useState(srd.internalRejectedReasons || []);
  const [buyerRejectedReasons, setBuyerRejectedReasons] = useState(srd.BuyerRejectedReasons || []);
  const [newReason, setNewReason] = useState({ department: '', reason: '' });
  const [reasonOptions, setReasonOptions] = useState(['Vmd', 'Pattern or Specs', 'Sewing', 'Washing', 'Finishing', 'Cad', 'Commercial', 'Mmc', 'Cutting']);
  const [activeAction, setActiveAction] = useState(null); // null | 'approve' | 'reject'

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

  // Sync state with srd prop
  useEffect(() => {
    setInternalComments(srd.internalComments || '');
    setBuyerComments(srd.BuyerComments || '');
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
        }
      })
      .catch(err => console.error('Failed to fetch buyers', err));
  }, []);

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

  const handleSaveDispatchDetails = () => {
    if (!selectedBuyer) {
      toast({ title: 'Error', description: 'Please select a buyer.', variant: 'destructive' });
      return;
    }
    handleAction('save_dispatch_details', {
      awb: dispatchAWB,
      dispatchQuantity: dispatchQty,
      address: dispatchAddress,
      sampleDispatchDate: dispatchDate,
      BuyerDetails: selectedBuyer,
      images: [{ front: dispatchFrontImages, back: dispatchBackImages }]
    });
  };

  const handleDispatchToBuyer = () => {
    handleAction('dispatch_to_buyer', {});
  };

  const handleBuyerApproval = (approved) => {
    handleAction('buyer_approval', {
      BuyerApproved: approved,
      BuyerApprovedBy: session?.user?.name + ' | ' + session.user?.role,
      BuyerComments: buyerComments,
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
                  className="inline-flex items-center justify-center w-40 px-3 py-0.5 rounded border border-green-300 bg-green-50 text-green-700 text-app-text font-medium hover:bg-green-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                      onKeyDown={e => e.key === 'Enter' && approverName.trim() && handleAction('internal_approval', { internalApproved: true, internalComments, internalApprovedBy: approverName.trim(), internalRejectedReasons: [] })}
                      className="border-gray-300 rounded-none h-6 w-40"
                      autoFocus
                    />
                    <Button
                      onClick={() => {
                        if (!approverName.trim()) { toast({ title: 'Error', description: 'Enter approver name', variant: 'destructive' }); return; }
                        handleAction('internal_approval', { internalApproved: true, internalComments, internalApprovedBy: approverName.trim(), internalRejectedReasons: [] });
                        setActiveAction(null);
                      }}
                      disabled={loading}
                      className="bg-green-600 hover:bg-green-700 text-white h-6 rounded-none text-app-text"
                    >
                      Confirm
                    </Button>
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
                  className="inline-flex items-center justify-center w-40 px-3 py-0.5 rounded border border-red-300 bg-red-50 text-red-700 text-app-text font-medium hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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

                    <Button
                      onClick={() => {
                        const val = newReason.reason.trim();
                        const pending = val ? [{ department: '', reason: val }] : [];
                        if (!reasonOptions.includes(val) && val) setReasonOptions(prev => [...prev, val]);
                        const reasons = [...internalRejectedReasons, ...pending];
                        if (!reasons.length) { toast({ title: 'Error', description: 'Add at least one reason', variant: 'destructive' }); return; }
                        handleAction('internal_approval', { internalApproved: false, internalComments, internalApprovedBy: session?.user?.name || 'System', internalRejectedReasons: reasons });
                        setActiveAction(null);
                        setNewReason({ department: '', reason: '' });
                      }}
                      disabled={loading}
                      className="bg-red-600 hover:bg-red-700 text-white h-6 rounded-none text-app-text"
                    >
                      Reject
                    </Button>
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
                className="h-6 text-app-text rounded-none border-0 border-b border-gray-300 px-0 w-full" />
            </div>
            <div className="col-span-1 bg-gray-50 border-r border-gray-300 px-2 py-0.5 flex items-center">
              <span className="text-app-text font-semibold text-gray-700">Awb #</span>
            </div>
            <div className="col-span-3 border-r border-gray-300 px-2 py-0.5">
              <Input value={dispatchAWB} onChange={e => setDispatchAWB(e.target.value)} placeholder="####"
                disabled={!canEdit || srd.sampleDispatchedToBuyer}
                className="h-6 text-app-text rounded-none border-0 border-b border-gray-300 px-0 w-full" />
            </div>
            <div className="col-span-3 px-2 py-0.5 flex items-center gap-1">
              <DispatchImageCell
                label="Front Pic"
                images={dispatchFrontImages}
                canEdit={canEdit && !srd.sampleDispatchedToBuyer}
                onUploaded={(urls) => setDispatchFrontImages(prev => [...prev, ...urls])}
                onRemove={(i) => setDispatchFrontImages(prev => prev.filter((_, idx) => idx !== i))}
              />
            </div>
          </div>

          {/* Dispatch Qty | Attach Back Pic */}
          <div className="grid grid-cols-12 border-b border-gray-300">
            <div className="col-span-2 bg-gray-50 border-r border-gray-300 px-2 py-0.5 flex items-center">
              <span className="text-app-text font-semibold text-gray-700">Dispatch Qty</span>
            </div>
            <div className="col-span-3 border-r border-gray-300 px-2 py-0.5">
              <Input type="number" value={dispatchQty} onChange={e => setDispatchQty(e.target.value)} placeholder="0"
                disabled={!canEdit || srd.sampleDispatchedToBuyer}
                className="h-6 text-app-text rounded-none border-0 border-b border-gray-300 px-0 w-full" />
            </div>
            <div className="col-span-4 border-r border-gray-300"></div>
            <div className="col-span-3 px-2 py-0.5 flex items-center gap-1">
              <DispatchImageCell
                label="Back Pic"
                images={dispatchBackImages}
                canEdit={canEdit && !srd.sampleDispatchedToBuyer}
                onUploaded={(urls) => setDispatchBackImages(prev => [...prev, ...urls])}
                onRemove={(i) => setDispatchBackImages(prev => prev.filter((_, idx) => idx !== i))}
              />
            </div>
          </div>

          {/* Buyer row */}
          <div className="grid grid-cols-12 border-b border-gray-300">
            <div className="col-span-2 bg-gray-50 border-r border-gray-300 px-2 py-0.5 flex items-center">
              <span className="text-app-text font-semibold text-gray-700">Buyer</span>
            </div>
            <div className="col-span-10 px-2 py-0.5 flex gap-1.5 items-center">
              <select className="h-6 px-1 text-app-text border-0 border-b border-gray-300 bg-transparent flex-1 rounded-none"
                value={selectedBuyer}
                onChange={(e) => { const bId = e.target.value; setSelectedBuyer(bId); const b = buyers.find(x => x._id === bId); if (b?.address) setDispatchAddress(b.address); }}
                disabled={!canEdit || srd.sampleDispatchedToBuyer}>
                <option value="">— New Buyer —</option>
                {buyers.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>
          </div>

          {/* Inline buyer form — always visible, pre-filled if buyer selected */}
          {(() => {
            const b = selectedBuyer ? buyers.find(x => x._id === selectedBuyer) : null;
            const emails = b ? (Array.isArray(b.email) ? b.email : (b.email ? [b.email] : [])) : [];
            const contacts = b ? (Array.isArray(b.contactPerson) ? b.contactPerson : []) : [{ name: '', phone: '' }];
            const safeContacts = contacts.length > 0 ? contacts : [{ name: '', phone: '' }];

            const patchBuyer = async (patch) => {
              if (!b) return;
              const res = await fetch(`/api/buyers/${b._id}`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patch),
              });
              const data = await res.json();
              if (data.success) setBuyers(prev => prev.map(x => x._id === b._id ? data.data : x));
            };

            return (
              <>
                {/* Contact Person rows — one per contact */}
                {safeContacts.map((cp, i) => (
                  <div key={i} className="grid grid-cols-12 border-b border-gray-300">
                    <div className="col-span-2 bg-gray-50 border-r border-gray-300 px-2 py-0.5 flex items-center">
                      <span className="text-app-text font-semibold text-gray-700">{i === 0 ? 'Contact Person' : ''}</span>
                    </div>
                    <div className="col-span-5 border-r border-gray-300 px-2 py-0.5 flex items-center gap-1">
                      <span className="text-app-text text-gray-500 text-xs shrink-0">Mr. / Ms.</span>
                      <input
                        className="flex-1 h-5 text-app-text border-0 border-b border-gray-300 bg-transparent focus:outline-none px-0 text-gray-700"
                        value={cp.name || ''}
                        placeholder="Name"
                        disabled={!canEdit || srd.sampleDispatchedToBuyer}
                        onChange={e => {
                          const updated = safeContacts.map((c, j) => j === i ? { ...c, name: e.target.value } : c);
                          if (b) patchBuyer({ contactPerson: updated });
                          else setBuyers(prev => prev); // handled via newBuyer state below
                        }}
                        onBlur={e => {
                          if (!b) return;
                          const updated = safeContacts.map((c, j) => j === i ? { ...c, name: e.target.value } : c);
                          patchBuyer({ contactPerson: updated });
                        }}
                      />
                    </div>
                    <div className="col-span-5 px-2 py-0.5 flex items-center gap-1">
                      {i === safeContacts.length - 1 && canEdit && !srd.sampleDispatchedToBuyer && b && (
                        <button
                          className="text-xs text-blue-600 hover:text-blue-800 shrink-0"
                          onClick={() => patchBuyer({ contactPerson: [...safeContacts, { name: '', phone: '' }] })}
                        >+ Add</button>
                      )}
                      {safeContacts.length > 1 && canEdit && !srd.sampleDispatchedToBuyer && b && (
                        <button
                          className="text-gray-300 hover:text-red-500 ml-auto"
                          onClick={() => patchBuyer({ contactPerson: safeContacts.filter((_, j) => j !== i) })}
                        ><X className="h-3 w-3" /></button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Department row */}
                <div className="grid grid-cols-12 border-b border-gray-300">
                  <div className="col-span-2 bg-gray-50 border-r border-gray-300 px-2 py-0.5 flex items-center">
                    <span className="text-app-text font-semibold text-gray-700">Department</span>
                  </div>
                  <div className="col-span-10 px-2 py-0.5">
                    <input
                      className="w-full h-5 text-app-text border-0 border-b border-gray-300 bg-transparent focus:outline-none px-0 text-gray-700"
                      value={b?.department || ''}
                      placeholder=""
                      disabled={!canEdit || srd.sampleDispatchedToBuyer || !b}
                      onBlur={e => b && patchBuyer({ department: e.target.value })}
                      onChange={e => b && setBuyers(prev => prev.map(x => x._id === b._id ? { ...x, department: e.target.value } : x))}
                    />
                  </div>
                </div>

                {/* Address row */}
                <div className="grid grid-cols-12 border-b border-gray-300">
                  <div className="col-span-2 bg-gray-50 border-r border-gray-300 px-2 py-0.5 flex items-center">
                    <span className="text-app-text font-semibold text-gray-700">Address</span>
                  </div>
                  <div className="col-span-10 px-2 py-0.5">
                    <input
                      className="w-full h-5 text-app-text border-0 border-b border-gray-300 bg-transparent focus:outline-none px-0 text-gray-700"
                      value={dispatchAddress}
                      placeholder=""
                      disabled={!canEdit || srd.sampleDispatchedToBuyer}
                      onChange={e => setDispatchAddress(e.target.value)}
                      onBlur={e => b && patchBuyer({ address: e.target.value })}
                    />
                  </div>
                </div>

                {/* Email rows */}
                <div className="grid grid-cols-12 border-b border-gray-300">
                  <div className="col-span-2 bg-gray-50 border-r border-gray-300 px-2 py-0.5 flex items-center">
                    <span className="text-app-text font-semibold text-gray-700">Email</span>
                  </div>
                  <div className="col-span-10 px-2 py-0.5">
                    {emails.map((em, idx) => (
                      <div key={idx} className="flex items-center gap-1">
                        <span className="text-gray-400 text-xs w-3">{idx + 1}</span>
                        <a href={`mailto:${em}`} className="text-blue-600 hover:underline flex-1 text-app-text">{em}</a>
                        {canEdit && !srd.sampleDispatchedToBuyer && b && (
                          <button onClick={() => patchBuyer({ email: emails.filter((_, j) => j !== idx) })} className="text-gray-300 hover:text-red-500"><X className="h-3 w-3" /></button>
                        )}
                      </div>
                    ))}
                    {canEdit && !srd.sampleDispatchedToBuyer && b && (
                      <AddEmailRow onAdd={em => patchBuyer({ email: [...emails, em] })} />
                    )}
                  </div>
                </div>

                {/* Contact No — from contact persons' phones */}
                <div className="grid grid-cols-12 border-b border-gray-300">
                  <div className="col-span-2 bg-gray-50 border-r border-gray-300 px-2 py-0.5 flex items-center">
                    <span className="text-app-text font-semibold text-gray-700">Contact No.</span>
                  </div>
                  <div className="col-span-10 px-2 py-0.5">
                    {safeContacts.map((cp, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <input
                          className="flex-1 h-5 text-app-text border-0 border-b border-gray-300 bg-transparent focus:outline-none px-0 text-gray-700"
                          value={cp.phone || ''}
                          placeholder="Phone number"
                          disabled={!canEdit || srd.sampleDispatchedToBuyer || !b}
                          onChange={e => {
                            if (!b) return;
                            const updated = safeContacts.map((c, j) => j === i ? { ...c, phone: e.target.value } : c);
                            setBuyers(prev => prev.map(x => x._id === b._id ? { ...x, contactPerson: updated } : x));
                          }}
                          onBlur={e => {
                            if (!b) return;
                            const updated = safeContacts.map((c, j) => j === i ? { ...c, phone: e.target.value } : c);
                            patchBuyer({ contactPerson: updated });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Create buyer button if none selected */}
                {!b && canEdit && !srd.sampleDispatchedToBuyer && (
                  <div className="grid grid-cols-12 border-b border-gray-300">
                    <div className="col-span-2 bg-gray-50 border-r border-gray-300"></div>
                    <div className="col-span-10 px-2 py-0.5 flex gap-1.5 items-center">
                      <input
                        className="h-6 text-app-text flex-1 border-b border-gray-300 bg-transparent focus:outline-none px-0"
                        value={newBuyer.name}
                        onChange={e => setNewBuyer({ ...newBuyer, name: e.target.value })}
                        placeholder="Buyer name to create..."
                      />
                      <Button size="sm" className="h-6 bg-blue-600 hover:bg-blue-700 text-white rounded-none text-app-text"
                        onClick={handleCreateBuyer} disabled={loading || !newBuyer.name}>
                        Create Buyer
                      </Button>
                    </div>
                  </div>
                )}
              </>
            );
          })()}

          {/* Save & Dispatch Buttons */}
          {canEdit && !srd.sampleDispatchedToBuyer && (
            <div className="grid grid-cols-12 border-b border-gray-300">
              <div className="col-span-2 bg-gray-50 border-r border-gray-300"></div>
              <div className="col-span-10 px-2 py-0.5 flex gap-1.5">
                <Button onClick={handleSaveDispatchDetails} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white h-6 text-app-text rounded-none">
                  Save Dispatch Details
                </Button>
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
        <div className="bg-gray-100 border-b border-gray-300 px-2 py-0.5 flex justify-between items-center">
          <span className="text-app-text font-semibold uppercase">Buyer's Comment</span>
          <span className={`text-app-text font-medium ${srd.BuyerApproved ? 'text-green-600' : srd.BuyerApprovedDate ? 'text-red-600' : srd.sampleDispatchedToBuyer ? 'text-yellow-600' : 'text-gray-500'}`}>
            {srd.BuyerApproved ? 'Buyer Approved' : srd.BuyerApprovedDate ? 'Buyer Rejected' : srd.sampleDispatchedToBuyer ? 'Waiting for Buyer' : 'Not Dispatched'}
          </span>
        </div>

        <div className="border-b border-gray-300">
          <div className="grid grid-cols-12">
            <div className="col-span-2 bg-gray-50 border-r border-gray-300 px-2 py-0 flex items-center">
              <span className="text-app-text font-semibold text-gray-700">Comments</span>
            </div>
            <div className="col-span-10 px-2 py-0">
              <Input
                placeholder="Enter buyer comments..."
                value={buyerComments}
                onChange={(e) => setBuyerComments(e.target.value)}
                disabled={!canEdit || !!srd.BuyerApprovedDate}
                className="text-app-text resize-none h-6 rounded-none border-gray-300"
              />
            </div>
          </div>
        </div>

        {!srd.BuyerApproved && srd.sampleDispatchedToBuyer && buyerRejectedReasons.length > 0 && (
          <div className="border-b border-gray-300">
            <div className="grid grid-cols-12">
              <div className="col-span-2 bg-gray-50 border-r border-gray-300 px-2 py-1.5">
                <span className="text-app-text font-semibold text-gray-700">Buyer Rejection Reasons</span>
              </div>
              <div className="col-span-10 px-2 py-1.5 space-y-1">
                {buyerRejectedReasons.map((r, i) => (
                  <div key={i} className="flex justify-between items-center bg-gray-50 px-2 py-0.5 text-app-text border border-gray-200">
                    <div className="flex items-center gap-2">
                      {r.department && <span className="font-semibold text-gray-600">{r.department}</span>}
                      <span className="text-gray-700">{r.reason}</span>
                    </div>
                    {canEdit && !srd.BuyerApprovedDate && (
                      <button
                        onClick={() => setBuyerRejectedReasons(prev => prev.filter((_, idx) => idx !== i))}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!srd.BuyerApproved && srd.sampleDispatchedToBuyer && canEdit && !srd.BuyerApprovedDate && (
          <div className="border-b border-gray-300">
            <div className="grid grid-cols-12">
              <div className="col-span-2 bg-gray-50 border-r border-gray-300 px-2 py-0">
                <span className="text-app-text font-semibold text-gray-700">Add Reason</span>
              </div>
              <div className="col-span-10 px-2 py-0 flex gap-1.5">
                <Input
                  className="h-6 text-app-text flex-1 rounded-none border-gray-300"
                  value={newReason.department}
                  onChange={e => setNewReason({ ...newReason, department: e.target.value.toUpperCase() })}
                  placeholder="Dept (Optional)"
                />
                <Input
                  className="h-6 text-app-text flex-[3] rounded-none border-gray-300"
                  value={newReason.reason}
                  onChange={e => setNewReason({ ...newReason, reason: e.target.value })}
                  placeholder="Buyer's feedback..."
                />
                <Button
                  size="sm"
                  className="h-6 px-2 text-app-text bg-blue-600 hover:bg-blue-700 rounded-none"
                  onClick={() => {
                    if (newReason.reason) {
                      setBuyerRejectedReasons([...buyerRejectedReasons, { ...newReason, department: newReason.department || 'GENERAL' }]);
                      setNewReason({ department: '', reason: '' });
                    }
                  }}
                >
                  <span className='text-white'>Add</span>
                </Button>
                {canEdit && srd.sampleDispatchedToBuyer && !srd.BuyerApprovedDate && (
                  <div className="grid grid-cols-12">
                    <div className="col-span-2 bg-gray-50 border-r border-gray-300"></div>
                    <div className="col-span-10 px-2 py-0 flex gap-1.5">
                      <Button onClick={() => handleBuyerApproval(true)} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white flex-1 h-6 text-app-text font-medium rounded-none">
                        <span className='text-white'>Mark as Approved by Buyer</span>
                      </Button>
                      <Button onClick={() => handleBuyerApproval(false)} disabled={loading} className="bg-red-600 hover:bg-red-700 text-white flex-1 h-6 text-app-text font-medium rounded-none">
                        <span className='text-white'>Mark as Rejected by Buyer</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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
