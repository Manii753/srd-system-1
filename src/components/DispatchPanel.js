'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Table } from 'lucide-react';
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
    <div className="space-y-2 mt-2">
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
      <div className="border border-gray-300 bg-white mt-2">
        {/* Section Header */}
        <div className="bg-gray-100 border-b border-gray-300 px-2 py-1.5 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-app-heading font-bold text-gray-800 uppercase">Conditions</span>
            <DispatchCardPrint srd={srd} />
          </div>
          <span className={`text-app-text font-medium ${srd.internalApproved ? 'text-green-600' : srd.internalApprovedDate ? 'text-red-600' : 'text-blue-600'}`}>
            {srd.internalApproved ? `Approved by ${srd.internalApprovedBy}` : srd.internalApprovedDate ? `Rejected by ${srd.internalApprovedBy.name} | ${srd.internalApprovedBy.role}` : 'Pending Verification'}
          </span>
        </div>

        {/* Grid Content */}
        <div className="border-b border-gray-300">
          <div className="grid grid-cols-12">
            <div className="col-span-2 bg-gray-50 border-r border-gray-300 px-2 py-1.5 flex items-center">
              <span className="text-app-heading font-semibold text-gray-700">Comments</span>
            </div>
            <div className="col-span-10 px-2 py-1.5">
              <Textarea
                placeholder="Good Work"
                value={internalComments}
                onChange={(e) => setInternalComments(e.target.value)}
                disabled={!canEdit || !!srd.internalApprovedDate}
                className="text-app-text resize-none h-12 border-gray-300 rounded-none"
              />
            </div>
          </div>
        </div>

        {!srd.internalApproved && internalRejectedReasons.length > 0 && (
          <div className="border-b border-gray-300">
            <div className="grid grid-cols-12">
              <div className="col-span-2 bg-gray-50 border-r border-gray-300 px-2 py-1.5">
                <span className="text-app-heading font-semibold text-gray-700">Rejection Reasons</span>
              </div>
              <div className="col-span-10 px-2 py-1.5 space-y-1">
                {internalRejectedReasons.map((r, i) => (
                  <div key={i} className="flex justify-between items-center bg-gray-50 px-2 py-0.5 text-app-text border border-gray-200">
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

        {!srd.internalApproved && canEdit && !srd.internalApprovedDate && (
          <div className="border-b border-gray-300">
            <div className="grid grid-cols-12">
              <div className="col-span-2 bg-gray-50 border-r border-gray-300 px-2 py-1.5">
                <span className="text-app-heading font-semibold text-gray-700">Add Reason</span>
              </div>
              <div className="col-span-10 px-2 py-1.5 flex gap-1.5">
                <select
                  className="h-7 px-2 text-app-text border border-gray-300 bg-white rounded-none"
                  value={newReason.department}
                  onChange={e => setNewReason({ ...newReason, department: e.target.value })}
                >
                  <option value="">Select Dept</option>
                  {['vmd', 'cad', 'commercial', 'mmc', 'sewing', 'cutting', 'pattern', 'washing', 'finishing'].map(d => (
                    <option key={d} value={d}>{d.toUpperCase()}</option>
                  ))}
                </select>
                <Input
                  className="h-7 text-app-text flex-1 rounded-none border-gray-300"
                  value={newReason.reason}
                  onChange={e => setNewReason({ ...newReason, reason: e.target.value })}
                  placeholder="Reason..."
                />
                <Button
                  size="sm"
                  className="h-7 px-2 text-app-text bg-blue-600 hover:bg-blue-700 rounded-none"
                  onClick={() => {
                    if (newReason.department && newReason.reason) {
                      setInternalRejectedReasons([...internalRejectedReasons, newReason]);
                      setNewReason({ department: '', reason: '' });
                    }
                  }}
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
        )}

        {canEdit && !srd.internalApprovedDate && (
          <div className="grid grid-cols-12">
            <div className="col-span-2 bg-gray-50 border-r border-gray-300"></div>
            <div className="col-span-10 px-2 py-1.5 flex gap-1.5">
              <Button
                onClick={() => openApprovalDialog('approve')}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 text-white flex-1 h-8 text-app-text font-medium rounded-none"
              >
                Approve for Dispatch
              </Button>
              <Button
                onClick={() => openApprovalDialog('reject')}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white flex-1 h-8 text-app-text font-medium rounded-none"
              >
                Reject
              </Button>
            </div>
          </div>
        )}
      </div>

      {srd.internalApproved && (
        <div className="border border-gray-300 bg-white mt-2">
          {/* Section Header */}
          <div className="bg-gray-100 border-b border-gray-300 px-2 py-1.5 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-app-heading font-bold text-gray-800 uppercase">Sample Dispatch</span>
              {srd.DispatchDetails && <AirwayBillPrint srd={srd} />}
            </div>
            <span className={`text-app-text font-medium ${srd.DispatchDetails ? 'text-green-600' : 'text-yellow-600'}`}>
              {srd.DispatchDetails ? 'Details Saved' : 'Pending Details'}
            </span>
          </div>

          {/* Buyer Selection */}
          <div className="border-b border-gray-300">
            <div className="grid grid-cols-12">
              <div className="col-span-2 bg-gray-50 border-r border-gray-300 px-2 py-1.5 flex items-center">
                <span className="text-app-heading font-semibold text-gray-700">Buyer Selection</span>
              </div>
              <div className="col-span-10 px-2 py-1.5 flex gap-1.5">
                <select
                  className="h-7 px-2 text-app-text border border-gray-300 bg-white flex-1 rounded-none"
                  value={selectedBuyer}
                  onChange={(e) => {
                    const bId = e.target.value;
                    setSelectedBuyer(bId);
                    const b = buyers.find(x => x._id === bId);
                    if (b?.address) setDispatchAddress(b.address);
                  }}
                  disabled={!canEdit || srd.sampleDispatchedToBuyer}
                >
                  <option value="">Denim</option>
                  {buyers.map(b => (
                    <option key={b._id} value={b._id}>{b.name}</option>
                  ))}
                </select>
                {canEdit && !srd.sampleDispatchedToBuyer && (
                  <Button variant="outline" size="sm" className="h-7 text-app-text rounded-none" onClick={() => setIsCreatingBuyer(!isCreatingBuyer)}>
                    {isCreatingBuyer ? 'Cancel' : 'Add New'}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Buyer Creation / Edit Form */}
          {isCreatingBuyer && (
            <div className="border-b border-gray-300">
              <div className="grid grid-cols-12">
                <div className="col-span-2 bg-gray-50 border-r border-gray-300 px-2 py-1.5">
                  <span className="text-app-heading font-semibold text-gray-700">{isEditingBuyer ? 'Edit Buyer' : 'New Buyer'}</span>
                </div>
                <div className="col-span-10 px-2 py-1.5 space-y-1.5">
                  <div className="flex gap-1.5">
                    <Input
                      className="h-7 text-app-text flex-1 rounded-none border-gray-300"
                      value={newBuyer.name}
                      onChange={e => setNewBuyer({ ...newBuyer, name: e.target.value })}
                      placeholder="Buyer Name *"
                    />
                    <Input
                      className="h-7 text-app-text flex-1 rounded-none border-gray-300"
                      value={newBuyer.email}
                      onChange={e => setNewBuyer({ ...newBuyer, email: e.target.value })}
                      placeholder="Email (comma separated)"
                    />
                    <Input
                      className="h-7 text-app-text flex-1 rounded-none border-gray-300"
                      value={newBuyer.phone}
                      onChange={e => setNewBuyer({ ...newBuyer, phone: e.target.value })}
                      placeholder="Phone (comma separated)"
                    />
                  </div>
                  {newBuyer.contactPerson.map((cp, i) => (
                    <div key={i} className="flex gap-1.5 items-center">
                      <Input
                        className="h-7 text-app-text flex-1 rounded-none border-gray-300"
                        value={cp.name}
                        onChange={e => {
                          const updated = [...newBuyer.contactPerson];
                          updated[i] = { ...updated[i], name: e.target.value };
                          setNewBuyer({ ...newBuyer, contactPerson: updated });
                        }}
                        placeholder="Contact Person Name"
                      />
                      <Input
                        className="h-7 text-app-text flex-1 rounded-none border-gray-300"
                        value={cp.phone}
                        onChange={e => {
                          const updated = [...newBuyer.contactPerson];
                          updated[i] = { ...updated[i], phone: e.target.value };
                          setNewBuyer({ ...newBuyer, contactPerson: updated });
                        }}
                        placeholder="Contact Phone"
                      />
                      {newBuyer.contactPerson.length > 1 && (
                        <button
                          onClick={() => setNewBuyer({ ...newBuyer, contactPerson: newBuyer.contactPerson.filter((_, idx) => idx !== i) })}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  <div className="flex gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-app-text rounded-none"
                      onClick={() => setNewBuyer({ ...newBuyer, contactPerson: [...newBuyer.contactPerson, { name: '', phone: '' }] })}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add Contact
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-app-text bg-blue-600 hover:bg-blue-700 rounded-none"
                      onClick={isEditingBuyer ? handleUpdateBuyer : handleCreateBuyer}
                      disabled={loading}
                    >
                      {isEditingBuyer ? 'Update Buyer' : 'Create Buyer'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Edit Buyer Button */}
          {selectedBuyer && !isCreatingBuyer && canEdit && !srd.sampleDispatchedToBuyer && (
            <div className="border-b border-gray-300">
              <div className="grid grid-cols-12">
                <div className="col-span-2 bg-gray-50 border-r border-gray-300"></div>
                <div className="col-span-10 px-2 py-1">
                  <Button variant="outline" size="sm" className="h-6 text-app-text rounded-none text-xs" onClick={handleStartEdit}>
                    Edit Selected Buyer
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* AWB, Quantity, Dispatch Date */}
          <div className="border-b border-gray-300">
            <div className="grid grid-cols-12">
              <div className="col-span-2 bg-gray-50 border-r border-gray-300 px-2 py-1.5 flex items-center">
                <span className="text-app-heading font-semibold text-gray-700">AWB Number</span>
              </div>
              <div className="col-span-2 border-r border-gray-300 px-2 py-1.5">
                <Input
                  value={dispatchAWB}
                  onChange={e => setDispatchAWB(e.target.value)}
                  placeholder="####"
                  disabled={!canEdit || srd.sampleDispatchedToBuyer}
                  className="h-7 text-app-text rounded-none border-gray-300"
                />
              </div>
              <div className="col-span-2 bg-gray-50 border-r border-gray-300 px-2 py-1.5 flex items-center">
                <span className="text-app-heading font-semibold text-gray-700">Quantity</span>
              </div>
              <div className="col-span-2 border-r border-gray-300 px-2 py-1.5">
                <Input
                  type="number"
                  value={dispatchQty}
                  onChange={e => setDispatchQty(e.target.value)}
                  placeholder="5"
                  disabled={!canEdit || srd.sampleDispatchedToBuyer}
                  className="h-7 text-app-text rounded-none border-gray-300"
                />
              </div>
              <div className="col-span-2 bg-gray-50 border-r border-gray-300 px-2 py-1.5 flex items-center">
                <span className="text-app-heading font-semibold text-gray-700">Dispatch Date</span>
              </div>
              <div className="col-span-2 px-2 py-1.5">
                <Input
                  type="date"
                  value={dispatchDate}
                  onChange={e => setDispatchDate(e.target.value)}
                  disabled={!canEdit || srd.sampleDispatchedToBuyer}
                  className="h-7 text-app-text rounded-none border-gray-300"
                />
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="border-b border-gray-300">
            <div className="grid grid-cols-12">
              <div className="col-span-2 bg-gray-50 border-r border-gray-300 px-2 py-1.5 flex items-center">
                <span className="text-app-heading font-semibold text-gray-700">Shipping Address</span>
              </div>
              <div className="col-span-10 px-2 py-1.5">
                <Textarea
                  value={dispatchAddress}
                  onChange={e => setDispatchAddress(e.target.value)}
                  placeholder="USA"
                  disabled={!canEdit || srd.sampleDispatchedToBuyer}
                  className="text-app-text resize-none h-12 rounded-none border-gray-300"
                />
              </div>
            </div>
          </div>

          {/* Front Images */}
          <div className="border-b border-gray-300">
            <div className="grid grid-cols-12">
              <div className="col-span-2 bg-gray-50 border-r border-gray-300 px-2 py-1.5 flex items-center">
                <span className="text-app-heading font-semibold text-gray-700">Front Images</span>
                <span className="text-app-text text-gray-500 ml-2">({dispatchFrontImages.length})</span>
              </div>
              <div className="col-span-10 px-2 py-1.5">
                <div className="flex flex-wrap gap-1.5">
                  {dispatchFrontImages.map((url, i) => (
                    <div key={i} className="relative group w-20 h-20">
                      <Image src={url} alt="Front" width={80} height={80} className="w-full h-full object-cover border border-gray-300" />
                      {!srd.sampleDispatchedToBuyer && canEdit && (
                        <button
                          onClick={() => setDispatchFrontImages(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  {!srd.sampleDispatchedToBuyer && canEdit && (
                    <UploadImage
                      srdId={srd._id}
                      fieldId="dispatchFront"
                      onUploaded={(assets) => setDispatchFrontImages(prev => [...prev, ...assets.map(a => a.url)])}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Back Images */}
          <div className="border-b border-gray-300">
            <div className="grid grid-cols-12">
              <div className="col-span-2 bg-gray-50 border-r border-gray-300 px-2 py-1.5 flex items-center">
                <span className="text-app-heading font-semibold text-gray-700">Back Images</span>
                <span className="text-app-text text-gray-500 ml-2">({dispatchBackImages.length})</span>
              </div>
              <div className="col-span-10 px-2 py-1.5">
                <div className="flex flex-wrap gap-1.5">
                  {dispatchBackImages.map((url, i) => (
                    <div key={i} className="relative group w-20 h-20">
                      <Image src={url} alt="Back" width={80} height={80} className="w-full h-full object-cover border border-gray-300" />
                      {!srd.sampleDispatchedToBuyer && canEdit && (
                        <button
                          onClick={() => setDispatchBackImages(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  {!srd.sampleDispatchedToBuyer && canEdit && (
                    <UploadImage
                      srdId={srd._id}
                      fieldId="dispatchBack"
                      onUploaded={(assets) => setDispatchBackImages(prev => [...prev, ...assets.map(a => a.url)])}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Save & Dispatch Buttons */}
          {canEdit && !srd.sampleDispatchedToBuyer && (
            <div className="grid grid-cols-12">
              <div className="col-span-2 bg-gray-50 border-r border-gray-300"></div>
              <div className="col-span-10 px-2 py-1.5 flex gap-1.5">
                <Button onClick={handleSaveDispatchDetails} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white flex-1 h-8 text-app-text font-medium rounded-none">
                  Save Dispatch Details
                </Button>
                {srd.DispatchDetails && (
                  <Button onClick={handleDispatchToBuyer} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white flex-1 h-8 text-app-text font-medium rounded-none">
                    Dispatch Sample to Buyer
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className={`border border-gray-300 bg-white mt-2 ${!srd.sampleDispatchedToBuyer ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="bg-gray-100 border-b border-gray-300 px-2 py-1.5 flex justify-between items-center">
          <span className="text-app-heading font-bold text-gray-800 uppercase">Buyer Approval</span>
          <span className={`text-app-text font-medium ${srd.BuyerApproved ? 'text-green-600' : srd.BuyerApprovedDate ? 'text-red-600' : srd.sampleDispatchedToBuyer ? 'text-yellow-600' : 'text-gray-500'}`}>
            {srd.BuyerApproved ? 'Buyer Approved' : srd.BuyerApprovedDate ? 'Buyer Rejected' : srd.sampleDispatchedToBuyer ? 'Waiting for Buyer' : 'Not Dispatched'}
          </span>
        </div>
        
        <div className="border-b border-gray-300">
          <div className="grid grid-cols-12">
            <div className="col-span-2 bg-gray-50 border-r border-gray-300 px-2 py-1.5 flex items-center">
              <span className="text-app-heading font-semibold text-gray-700">Comments</span>
            </div>
            <div className="col-span-10 px-2 py-1.5">
              <Textarea
                placeholder="Enter buyer comments..."
                value={buyerComments}
                onChange={(e) => setBuyerComments(e.target.value)}
                disabled={!canEdit || !!srd.BuyerApprovedDate}
                className="text-app-text resize-none h-12 rounded-none border-gray-300"
              />
            </div>
          </div>
        </div>

        {!srd.BuyerApproved && srd.sampleDispatchedToBuyer && buyerRejectedReasons.length > 0 && (
          <div className="border-b border-gray-300">
            <div className="grid grid-cols-12">
              <div className="col-span-2 bg-gray-50 border-r border-gray-300 px-2 py-1.5">
                <span className="text-app-heading font-semibold text-gray-700">Buyer Rejection Reasons</span>
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
              <div className="col-span-2 bg-gray-50 border-r border-gray-300 px-2 py-1.5">
                <span className="text-app-heading font-semibold text-gray-700">Add Reason</span>
              </div>
              <div className="col-span-10 px-2 py-1.5 flex gap-1.5">
                <Input
                  className="h-7 text-app-text flex-1 rounded-none border-gray-300"
                  value={newReason.department}
                  onChange={e => setNewReason({ ...newReason, department: e.target.value.toUpperCase() })}
                  placeholder="Dept (Optional)"
                />
                <Input
                  className="h-7 text-app-text flex-[3] rounded-none border-gray-300"
                  value={newReason.reason}
                  onChange={e => setNewReason({ ...newReason, reason: e.target.value })}
                  placeholder="Buyer's feedback..."
                />
                <Button
                  size="sm"
                  className="h-7 px-2 text-app-text bg-blue-600 hover:bg-blue-700 rounded-none"
                  onClick={() => {
                    if (newReason.reason) {
                      setBuyerRejectedReasons([...buyerRejectedReasons, { ...newReason, department: newReason.department || 'GENERAL' }]);
                      setNewReason({ department: '', reason: '' });
                    }
                  }}
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
        )}

        {canEdit && srd.sampleDispatchedToBuyer && !srd.BuyerApprovedDate && (
          <div className="grid grid-cols-12">
            <div className="col-span-2 bg-gray-50 border-r border-gray-300"></div>
            <div className="col-span-10 px-2 py-1.5 flex gap-1.5">
              <Button onClick={() => handleBuyerApproval(true)} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white flex-1 h-8 text-app-text font-medium rounded-none">
                Mark as Approved by Buyer
              </Button>
              <Button onClick={() => handleBuyerApproval(false)} disabled={loading} className="bg-red-600 hover:bg-red-700 text-white flex-1 h-8 text-app-text font-medium rounded-none">
                Mark as Rejected by Buyer
              </Button>
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
            <Label htmlFor="approverName">Who approved / rejected this SRD?</Label>
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
            <Button
              onClick={handleInternalVerify}
              disabled={loading}
              className={approvalDialogType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {approvalDialogType === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
