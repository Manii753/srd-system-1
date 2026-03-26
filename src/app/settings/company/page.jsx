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
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/company').then(r => r.json()).then(data => {
      if (data.name) setName(data.name);
      if (data.logo) setLogo(data.logo);
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

  return (
    <Layout>
      <div className="max-w-lg mx-auto mt-8">
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
              {uploading && <p className="text-xs text-gray-500 mt-1">Uploading...</p>}
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
      </div>
    </Layout>
  );
}
