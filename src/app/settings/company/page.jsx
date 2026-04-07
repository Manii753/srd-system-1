'use client';
import { useEffect, useState } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/lib/use-toast';
import Image from 'next/image';

export default function CompanySettingsPage() {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [logo, setLogo] = useState('');
  const [srdPrefix, setSrdPrefix] = useState('SRD-');
  const [srdNumber, setSrdNumber] = useState(1000);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingCounter, setSavingCounter] = useState(false);

  useEffect(() => {
    fetch('/api/company').then(r => r.json()).then(data => {
      if (data.name) setName(data.name);
      if (data.logo) setLogo(data.logo);
      if (data.CurrentSRDPrefix !== undefined) setSrdPrefix(data.CurrentSRDPrefix);
      if (data.currentSRDNumber !== undefined) setSrdNumber(data.currentSRDNumber);
    });
  }, []);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/company/logo', { method: 'POST', body: form });
      const data = await res.json();
      if (data.url) setLogo(data.url);
      else throw new Error(data.error);
    } catch (err) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await fetch('/api/company', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, logo }),
    });
    setSaving(false);
    toast({ title: 'Saved', description: 'Company info updated.' });
  };

  const handleSaveCounter = async () => {
    const num = parseInt(srdNumber, 10);
    if (isNaN(num) || num < 0) {
      toast({ title: 'Invalid number', description: 'SRD number must be a non-negative integer.', variant: 'destructive' });
      return;
    }
    setSavingCounter(true);
    await fetch('/api/company', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ CurrentSRDPrefix: srdPrefix, currentSRDNumber: num }),
    });
    setSavingCounter(false);
    toast({ title: 'Saved', description: `Next SRD will be: ${srdPrefix}${num}` });
  };

  return (
    <Layout>
      <div className="max-w-lg mx-auto mt-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Company Registration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Company Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Lazeinda Denim Pvt Ltd" className="mt-1" />
            </div>
            <div>
              <Label>Logo</Label>
              <Input type="file" accept="image/*" onChange={handleLogoUpload} className="mt-1" disabled={uploading} />
              {uploading && <p className="text-app-text text-gray-500 mt-1">Uploading...</p>}
              {logo && (
                <div className="mt-2 border rounded p-2 inline-block">
                  <Image src={logo} alt="Company Logo" width={120} height={60} className="object-contain" />
                </div>
              )}
            </div>
            <Button onClick={handleSave} disabled={saving || !name}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SRD Numbering</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500">
              The next SRD created will be: <span className="font-mono font-semibold text-gray-800">{srdPrefix}{srdNumber}</span>
            </p>
            <div>
              <Label>Prefix</Label>
              <Input
                value={srdPrefix}
                onChange={e => setSrdPrefix(e.target.value)}
                placeholder="e.g. SRD-"
                className="mt-1 font-mono"
              />
            </div>
            <div>
              <Label>Next Number</Label>
              <Input
                type="number"
                min={0}
                value={srdNumber}
                onChange={e => setSrdNumber(e.target.value)}
                placeholder="e.g. 1000"
                className="mt-1 font-mono"
              />
            </div>
            <Button onClick={handleSaveCounter} disabled={savingCounter}>
              {savingCounter ? 'Saving...' : 'Save Numbering'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
