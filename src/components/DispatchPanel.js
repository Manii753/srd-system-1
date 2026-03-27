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
import DepartmentPanelExcel from './DepartmentPanelExcel';

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
  const [newBuyer, setNewBuyer] = useState({ name: '', email: '', phone: '', address: '' });

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
          address: newBuyer.address
        })
      });
      const data = await response.json();
      if (data.success) {
        setBuyers([...buyers, data.data]);
        setSelectedBuyer(data.data._id);
        setIsCreatingBuyer(false);
        setNewBuyer({ name: '', email: '', phone: '', address: '' });
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
    if (approved && !selectedBuyer) {
      toast({ title: 'Error', description: 'Please select a buyer first.', variant: 'destructive' });
      return;
    }

    handleAction('internal_approval', {
      internalApproved: approved,
      internalApprovedBy: session?.user?.name,
      internalComments,
      BuyerDetails: selectedBuyer
    });
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
          {showExcel ? 'Hide SRD Data Grid' : 'Show SRD Data Grid'}
          {showExcel ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>

        {showExcel && (
          <div className="border rounded-lg shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <DepartmentPanelExcel
              srd={srd}
              userRole="viewer"
              readOnly={true}
              onUpdate={() => {}} // No-op for read-only
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
          
          <div className="space-y-4 border p-4 rounded-md bg-slate-50">
            <h3 className="text-sm font-semibold">Buyer Details Selection</h3>
            
            <div className="flex gap-2">
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedBuyer}
                onChange={(e) => setSelectedBuyer(e.target.value)}
                disabled={!canEdit || !!srd.internalApprovedDate}
              >
                <option value="">-- Select a Buyer --</option>
                {buyers.map(b => (
                  <option key={b._id} value={b._id}>{b.name} {b.email?.length ? `(${b.email[0]})` : ''}</option>
                ))}
              </select>
              
              {canEdit && !srd.internalApprovedDate && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreatingBuyer(!isCreatingBuyer)}
                >
                  {isCreatingBuyer ? 'Cancel' : 'Add New'}
                </Button>
              )}
            </div>

            {isCreatingBuyer && (
              <div className="space-y-3 p-4 border rounded-md bg-white">
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                     <Label>Buyer Name *</Label>
                     <Input required value={newBuyer.name} onChange={e => setNewBuyer({...newBuyer, name: e.target.value})} placeholder="Company or Name" />
                   </div>
                   <div className="space-y-1">
                     <Label>Emails (comma separated)</Label>
                     <Input value={newBuyer.email} onChange={e => setNewBuyer({...newBuyer, email: e.target.value})} placeholder="email1@test.com, email2@test.com" />
                   </div>
                   <div className="space-y-1">
                     <Label>Phones (comma separated)</Label>
                     <Input value={newBuyer.phone} onChange={e => setNewBuyer({...newBuyer, phone: e.target.value})} placeholder="+1234567, +987654" />
                   </div>
                   <div className="space-y-1">
                     <Label>Address</Label>
                     <Input value={newBuyer.address} onChange={e => setNewBuyer({...newBuyer, address: e.target.value})} placeholder="Full Address" />
                   </div>
                 </div>
                 <Button onClick={handleCreateBuyer} disabled={loading} className="w-full">
                   Save Buyer profile
                 </Button>
              </div>
            )}
          </div>

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
                 Approve & Dispatch Sample
               </Button>
               <Button onClick={() => handleInternalVerify(false)} disabled={loading} variant="destructive" className="flex-1">
                 Reject
               </Button>
             </div>
          )}
        </CardContent>
      </Card>

      <Card className={!srd.sampleDispatchedToBuyer ? 'opacity-50 pointer-events-none' : ''}>
        <CardHeader>
          <CardTitle className="flex justify-between items-center text-lg font-bold">
            <span>2. Buyer Approval</span>
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
