'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Layout from '@/components/layout/Layout';
import SRDTable from '@/components/SRDTable';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Search, Filter } from 'lucide-react';
import { useToast } from '@/lib/use-toast';
import { STAGE_FILTER_OPTIONS } from '@/lib/sampleFilters';

export default function VMDDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [srds, setSRDs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterSampleType, setFilterSampleType] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [brands, setBrands] = useState([]);
  const [sampleTypes, setSampleTypes] = useState([]);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/login');
      return;
    }

    const allowedRoles = ['vmd', 'admin'];
    if (!allowedRoles.includes(session.user.role)) {
      router.push(`/dashboard/${session.user.role}`);
      return;
    }

    fetchSRDs();
  }, [session, status, router]);

  const fetchSRDs = async () => {
    try {
      const response = await fetch('/api/srd?limit=100');
      const data = await response.json();
      if (data.success) {
        setSRDs(data.data);
      }
    } catch (error) {
      console.error('Error fetching SRDs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch('/api/srd?listBrands=true')
      .then(r => r.json())
      .then(d => { if (d?.success && d.isBrandList) setBrands(d.data || []); })
      .catch(() => {});
    fetch('/api/srd?listSampleTypes=true')
      .then(r => r.json())
      .then(d => { if (d?.success) setSampleTypes(d.data || []); })
      .catch(() => {});
  }, []);

  const handleRaiseSrd = async () => {
    setIsCreating(true);
    try {
      const res = await fetch('/api/srd', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          createdBy: {
            id: session.user.id,
            name: session.user.name,
            role: session.user.role,
          },
          // title is now optional and will be omitted
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create SRD');
      }

      const result = await res.json();
      if (result.success) {
        toast({
          title: 'SRD Raised',
          description: `SRD ${result.data.refNo} has been created.`,
        });
        router.push(`/srd/${result.data._id}`);
      } else {
        throw new Error(result.error || 'An unknown error occurred');
      }
    } catch (error) {
      console.error('Error creating SRD:', error);
      toast({
        title: 'Error',
        description: `Could not create SRD: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout headerContent={
      <div className="flex items-center gap-2 w-full">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search SRDs by reference or title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-app-text"
          />
        </div>
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm">
          <Filter className="h-4 w-4 text-gray-500" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border-0 focus:ring-0 focus:outline-none bg-transparent text-app-text text-gray-700 font-medium"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="approved">Approved</option>
            <option value="flagged">Flagged</option>
          </select>
        </div>
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm">
          <Filter className="h-4 w-4 text-gray-500" />
          <select
            value={filterBrand}
            onChange={(e) => setFilterBrand(e.target.value)}
            className="border-0 focus:ring-0 focus:outline-none bg-transparent text-app-text text-gray-700 font-medium"
          >
            <option value="">All Brands</option>
            {brands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm">
          <Filter className="h-4 w-4 text-gray-500" />
          <select
            value={filterSampleType}
            onChange={(e) => setFilterSampleType(e.target.value)}
            className="border-0 focus:ring-0 focus:outline-none bg-transparent text-app-text text-gray-700 font-medium"
          >
            <option value="">All Sample Types</option>
            {sampleTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm">
          <Filter className="h-4 w-4 text-gray-500" />
          <select
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
            className="border-0 focus:ring-0 focus:outline-none bg-transparent text-app-text text-gray-700 font-medium"
          >
            <option value="">All Stages</option>
            {STAGE_FILTER_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <Button size="sm" onClick={handleRaiseSrd} disabled={isCreating} className="text-white">
            <Plus className="h-4 w-4 mr-1" />
            {isCreating ? 'Raising SRD...' : 'New SRD'}
          </Button>
        </div>
      </div>
    }>
      <div className="">
        {/* SRDs Table */}
        <SRDTable department="vmd" searchTerm={searchTerm} filterStatus={filterStatus} filterBrand={filterBrand} filterSampleType={filterSampleType} filterStage={filterStage} />

        {srds.length === 0 && (
          <div className="text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-app-text font-medium text-gray-900">No SRDs found</h3>
            <p className="mt-1 text-app-text text-gray-500">Get started by creating a new SRD.</p>
            <div className="mt-6">
              <Button
                onClick={handleRaiseSrd}
                disabled={isCreating}
              >
                {isCreating ? 'Raising SRD...' : 'SRD'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}