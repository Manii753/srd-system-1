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

export default function DispatchPanel({ srd, onUpdate, canEdit = true }) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showExcel, setShowExcel] = useState(false);

  // Form states
  const [internalComments, setInternalComments] = useState(srd.internalComments || '');
  const [buyerComments, setBuyerComments] = useState(srd.BuyerComments || '');

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

  const handleInternalVerify = (approved) => {
    handleAction('internal_approval', {
      internalApproved: approved,
      internalApprovedBy: session?.user?.name,
      internalComments,
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
      BuyerApprovedBy: session?.user?.name,
      BuyerComments: buyerComments,
    });
  };

  return (
    <div className="space-y-6 mt-6">
      <div className="flex flex-col space-y-2">
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center text-lg font-bold">
            <div className="flex items-center gap-4">
              <span>1. Internal Verification</span>
              <DispatchCardPrint srd={srd} />
            </div>
            {srd.internalApproved ? (
              <Badge className="bg-green-100 text-green-800">Approved by {srd.internalApprovedBy}</Badge>
            ) : srd.internalApprovedDate ? (
              <Badge className="bg-red-100 text-red-800">Rejected by {srd.internalApprovedBy}</Badge>
            ) : (
              <Badge className="bg-blue-100 text-blue-800">Pending Verification</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Comments</label>
            <Textarea
              placeholder="Enter internal verification comments..."
              value={internalComments}
              onChange={(e) => setInternalComments(e.target.value)}
              disabled={!canEdit || !!srd.internalApprovedDate}
            />
          </div>
          {canEdit && !srd.internalApprovedDate && (
            <div className="flex gap-2">
              <Button onClick={() => handleInternalVerify(true)} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white flex-1">
                Approve for Dispatch
              </Button>
              <Button onClick={() => handleInternalVerify(false)} disabled={loading} variant="destructive" className="flex-1">
                Reject
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {srd.internalApproved && (
        <Card className={!canEdit ? 'opacity-70 pointer-events-none' : ''}>
          <CardHeader>
            <CardTitle className="flex justify-between items-center text-lg font-bold">
              <div className="flex items-center gap-3">
                <span>2. Dispatch Details</span>
                {srd.DispatchDetails && <AirwayBillPrint srd={srd} />}
              </div>
              {srd.DispatchDetails ? (
                <Badge className="bg-green-100 text-green-800">Details Saved</Badge>
              ) : (
                <Badge className="bg-yellow-100 text-yellow-800">Pending Details</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4 border p-4 rounded-md bg-slate-50">
              <h3 className="text-sm font-semibold">Buyer Selection</h3>
              <div className="flex gap-2">
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={selectedBuyer}
                  onChange={(e) => {
                    const bId = e.target.value;
                    setSelectedBuyer(bId);
                    const b = buyers.find(x => x._id === bId);
                    if (b?.address) setDispatchAddress(b.address);
                  }}
                  disabled={!canEdit || srd.sampleDispatchedToBuyer}
                >
                  <option value="">-- Select a Buyer --</option>
                  {buyers.map(b => (
                    <option key={b._id} value={b._id}>{b.name}</option>
                  ))}
                </select>

                {canEdit && !srd.sampleDispatchedToBuyer && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (isCreatingBuyer) {
                          setIsCreatingBuyer(false);
                          setIsEditingBuyer(false);
                        } else {
                          setIsCreatingBuyer(true);
                          setIsEditingBuyer(false);
                          setNewBuyer({
                            name: '',
                            email: '',
                            phone: '',
                            contactPerson: [{ name: '', phone: '' }]
                          });
                        }
                      }}
                    >
                      {isCreatingBuyer && !isEditingBuyer ? 'Cancel' : 'Add New'}
                    </Button>

                    {selectedBuyer && !isCreatingBuyer && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleStartEdit}
                      >
                        Edit Profile
                      </Button>
                    )}

                    {isEditingBuyer && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setIsCreatingBuyer(false);
                          setIsEditingBuyer(false);
                        }}
                      >
                        Cancel Edit
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {isCreatingBuyer && (
                <div className="space-y-3 p-4 border rounded-md bg-white">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label>Buyer Name *</Label>
                      <Input required value={newBuyer.name} onChange={e => setNewBuyer({ ...newBuyer, name: e.target.value })} placeholder="Company or Name" />
                    </div>
                    <div className="space-y-1">
                      <Label>Emails (comma separated)</Label>
                      <Input value={newBuyer.email} onChange={e => setNewBuyer({ ...newBuyer, email: e.target.value })} placeholder="email1@test.com, email2@test.com" />
                    </div>
                    <div className="space-y-1">
                      <Label>Phones (comma separated)</Label>
                      <Input value={newBuyer.phone} onChange={e => setNewBuyer({ ...newBuyer, phone: e.target.value })} placeholder="+1234567, +987654" />
                    </div>
                  </div>

                  <div className="space-y-2 mt-4">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-bold uppercase">Contact Persons</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setNewBuyer({
                          ...newBuyer,
                          contactPerson: [...newBuyer.contactPerson, { name: '', phone: '' }]
                        })}
                      >
                        <Plus className="h-3 w-3 mr-1" /> Add Person
                      </Button>
                    </div>
                    {newBuyer.contactPerson.map((cp, idx) => (
                      <div key={idx} className="flex gap-2 items-end">
                        <div className="flex-1 space-y-1">
                          <Label className="text-[10px]">Name</Label>
                          <Input
                            className="h-8 text-xs"
                            value={cp.name}
                            onChange={e => {
                              const updated = [...newBuyer.contactPerson];
                              updated[idx].name = e.target.value;
                              setNewBuyer({ ...newBuyer, contactPerson: updated });
                            }}
                          />
                        </div>
                        <div className="flex-1 space-y-1">
                          <Label className="text-[10px]">Phone</Label>
                          <Input
                            className="h-8 text-xs"
                            value={cp.phone}
                            onChange={e => {
                              const updated = [...newBuyer.contactPerson];
                              updated[idx].phone = e.target.value;
                              setNewBuyer({ ...newBuyer, contactPerson: updated });
                            }}
                          />
                        </div>
                        {newBuyer.contactPerson.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-500"
                            onClick={() => {
                              setNewBuyer({
                                ...newBuyer,
                                contactPerson: newBuyer.contactPerson.filter((_, i) => i !== idx)
                              });
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={isEditingBuyer ? handleUpdateBuyer : handleCreateBuyer}
                    disabled={loading}
                    className="w-full mt-4"
                  >
                    {isEditingBuyer ? 'Update Buyer Profile' : 'Save Buyer Profile'}
                  </Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>AWB Number</Label>
                <Input
                  value={dispatchAWB}
                  onChange={e => setDispatchAWB(e.target.value)}
                  placeholder="Tracking #"
                  disabled={!canEdit || srd.sampleDispatchedToBuyer}
                />
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  value={dispatchQty}
                  onChange={e => setDispatchQty(e.target.value)}
                  placeholder="Sample Qty"
                  disabled={!canEdit || srd.sampleDispatchedToBuyer}
                />
              </div>
              <div className="space-y-2">
                <Label>Dispatch Date</Label>
                <Input
                  type="date"
                  value={dispatchDate}
                  onChange={e => setDispatchDate(e.target.value)}
                  disabled={!canEdit || srd.sampleDispatchedToBuyer}
                />
              </div>
              <div className="space-y-2 col-span-3">
                <Label>Shipping Address</Label>
                <Textarea
                  value={dispatchAddress}
                  onChange={e => setDispatchAddress(e.target.value)}
                  placeholder="Destimation Address"
                  disabled={!canEdit || srd.sampleDispatchedToBuyer}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 pt-4 border-t">
              <div className="space-y-3">
                <Label className="font-bold flex items-center gap-2">
                  Front Images
                  <Badge variant="outline">{dispatchFrontImages.length}</Badge>
                </Label>
                <div className="grid grid-cols-4 gap-2 border p-2 rounded-md bg-white min-h-[60px]">
                  {dispatchFrontImages.map((url, i) => (
                    <div key={i} className="relative group aspect-square">
                      <Image src={url} alt="Front" width={80} height={80} className="w-full h-full object-cover rounded shadow-sm" />
                      {!srd.sampleDispatchedToBuyer && canEdit && (
                        <button
                          onClick={() => setDispatchFrontImages(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {!srd.sampleDispatchedToBuyer && canEdit && (
                  <UploadImage
                    srdId={srd._id}
                    fieldId="dispatchFront"
                    onUploaded={(assets) => setDispatchFrontImages(prev => [...prev, ...assets.map(a => a.url)])}
                  />
                )}
              </div>

              <div className="space-y-3">
                <Label className="font-bold flex items-center gap-2">
                  Back Images
                  <Badge variant="outline">{dispatchBackImages.length}</Badge>
                </Label>
                <div className="grid grid-cols-4 gap-2 border p-2 rounded-md bg-white min-h-[60px]">
                  {dispatchBackImages.map((url, i) => (
                    <div key={i} className="relative group aspect-square">
                      <Image src={url} alt="Back" width={80} height={80} className="w-full h-full object-cover rounded shadow-sm" />
                      {!srd.sampleDispatchedToBuyer && canEdit && (
                        <button
                          onClick={() => setDispatchBackImages(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {!srd.sampleDispatchedToBuyer && canEdit && (
                  <UploadImage
                    srdId={srd._id}
                    fieldId="dispatchBack"
                    onUploaded={(assets) => setDispatchBackImages(prev => [...prev, ...assets.map(a => a.url)])}
                  />
                )}
              </div>
            </div>

            {canEdit && !srd.sampleDispatchedToBuyer && (
              <Button onClick={handleSaveDispatchDetails} disabled={loading} className="w-full">
                Save Dispatch Details
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {srd.DispatchDetails && (
        <Card className={!canEdit ? 'opacity-70 pointer-events-none' : ''}>
          <CardHeader>
            <CardTitle className="text-lg font-bold">3. Dispatch Sample</CardTitle>
          </CardHeader>
          <CardContent>
            {!srd.sampleDispatchedToBuyer ? (
              <div className="text-center py-4 bg-blue-50 border border-blue-100 rounded-md">
                <p className="text-blue-700 mb-4">Sample details are ready. Click below to confirm physical dispatch.</p>
                <Button onClick={handleDispatchToBuyer} disabled={loading} className="bg-blue-600 hover:bg-blue-700 w-full max-w-xs">
                  Dispatch Sample to Buyer
                </Button>
              </div>
            ) : (
              <div className="text-center py-4 bg-green-50 border border-green-100 rounded-md">
                <p className="text-green-700 font-bold">Sample Dispatched on {new Date(srd.sampleDispatchDate).toLocaleString()}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className={!srd.sampleDispatchedToBuyer ? 'opacity-50 pointer-events-none' : ''}>
        <CardHeader>
          <CardTitle className="flex justify-between items-center text-lg font-bold">
            <span>4. Buyer Approval</span>
            {srd.BuyerApproved ? (
              <Badge className="bg-green-100 text-green-800">Buyer Approved</Badge>
            ) : srd.BuyerApprovedDate ? (
              <Badge className="bg-red-100 text-red-800">Buyer Rejected</Badge>
            ) : srd.sampleDispatchedToBuyer ? (
              <Badge className="bg-yellow-100 text-yellow-800">Waiting for Buyer</Badge>
            ) : (
              <Badge className="bg-gray-100 text-gray-800">Not Dispatched</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Comments</label>
            <Textarea
              placeholder="Enter buyer comments..."
              value={buyerComments}
              onChange={(e) => setBuyerComments(e.target.value)}
              disabled={!canEdit || !!srd.BuyerApprovedDate}
            />
          </div>
          {canEdit && srd.sampleDispatchedToBuyer && !srd.BuyerApprovedDate && (
            <div className="flex gap-2">
              <Button onClick={() => handleBuyerApproval(true)} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white flex-1">
                Mark as Approved by Buyer
              </Button>
              <Button onClick={() => handleBuyerApproval(false)} disabled={loading} variant="destructive" className="flex-1">
                Mark as Rejected by Buyer
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
