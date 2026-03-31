'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { List } from 'lucide-react';
import { useToast } from '@/lib/use-toast';

const DEFAULT_SETTINGS = {
  srdList: { enabled: true, itemsPerPage: 10 },
  srdForm: { enabled: true, itemsPerPage: 12 },
};

const PAGES = [
  {
    key: 'srdList',
    label: 'SRD List Table',
    description: 'Rows shown per page on the SRD list, VMD dashboard, and admin dashboard',
    inputLabel: 'Rows per page',
    min: 1,
    max: 200,
  },
  {
    key: 'srdForm',
    label: 'SRD Form / Excel View',
    description: 'How many fields (cells) are shown per page inside the SRD detail form. The total number of fields in your template divided by this number gives the page count.',
    inputLabel: 'Fields per page',
    min: 1,
    max: 500,
  },
];

export default function PaginationSettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/company')
      .then(r => r.json())
      .then(data => {
        const pg = data?.paginationSettings;
        if (!pg) return;

        // Handle old flat structure migration
        const isOldFlat = pg.itemsPerPage !== undefined && !pg.srdList && !pg.srdForm;

        setSettings({
          srdList: {
            ...DEFAULT_SETTINGS.srdList,
            ...(isOldFlat
              ? { enabled: pg.enabled ?? true, itemsPerPage: pg.itemsPerPage ?? 10 }
              : pg.srdList ?? {}),
          },
          srdForm: {
            ...DEFAULT_SETTINGS.srdForm,
            ...(isOldFlat ? {} : pg.srdForm ?? {}),
          },
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const update = (key, field, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paginationSettings: settings }),
      });
      if (res.ok) {
        toast({ title: 'Saved', description: 'Pagination settings updated.' });
      } else {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Save failed');
      }
    } catch (e) {
      toast({ title: 'Error', description: e.message || 'Failed to save settings.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-xl space-y-6">
        <div className="flex items-center gap-3">
          <List className="h-7 w-7 text-gray-700" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pagination Settings</h1>
            <p className="text-sm text-gray-500">Configure pagination separately for each view</p>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : (
          <>
            {PAGES.map(({ key, label, description, inputLabel, min, max }) => (
              <Card key={key}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{label}</CardTitle>
                  <p className="text-xs text-gray-500">{description}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Enable Pagination</Label>
                      <p className="text-xs text-gray-400">When off, everything loads on one page</p>
                    </div>
                    <Switch
                      checked={settings[key].enabled}
                      onCheckedChange={(v) => update(key, 'enabled', v)}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <Label className="text-sm font-medium">{inputLabel}</Label>
                      <p className="text-xs text-gray-400 mb-1">
                        Current value: <span className="font-semibold text-gray-700">{settings[key].itemsPerPage}</span>
                      </p>
                      <Input
                        type="number"
                        min={min}
                        max={max}
                        value={settings[key].itemsPerPage}
                        disabled={!settings[key].enabled}
                        onChange={(e) =>
                          update(key, 'itemsPerPage', Math.max(min, parseInt(e.target.value) || min))
                        }
                        className="w-32 h-9 text-sm"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button onClick={save} disabled={saving} className="w-full">
              {saving ? 'Saving...' : 'Save All Settings'}
            </Button>
          </>
        )}
      </div>
    </Layout>
  );
}
