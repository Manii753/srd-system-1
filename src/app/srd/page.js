'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Layout from '@/components/layout/Layout';
import SRDTable from '@/components/SRDTable';
import { Button } from '@/components/ui/button';
import { Search, Filter, Plus, X } from 'lucide-react';
import SRDPrintDialog from '@/components/SRDPrintDialog';
import { STAGE_FILTER_OPTIONS } from '@/lib/sampleFilters';

function SRDListPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterSampleType, setFilterSampleType] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [brands, setBrands] = useState([]);
  const [sampleTypes, setSampleTypes] = useState([]);
  const [recordCount, setRecordCount] = useState(0);

  const departmentFilter = searchParams.get('department') || 'all';
  const statusFilter = searchParams.get('status') || 'all';

  const canCreateSRD = session?.user?.role === 'vmd' || session?.user?.role === 'admin';

  // A specific stage (especially Approved/Dispatched/Rejected) implies "all
  // statuses", otherwise completed SRDs would be hidden by the default
  // active/status filter and stage filtering would return nothing.
  const effectiveStatus = filterStage ? 'all' : filterStatus;

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) { router.push('/login'); return; }
  }, [session, status, router]);

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

  if (status === 'loading') {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      headerContent={
        <div className="flex items-center gap-2 w-full flex-wrap">
          {/* Search */}
          <div className="flex-1 relative min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search SRDs by reference or title..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
            />
          </div>

          {/* Status filter — pill toggles. "Active" = not yet buyer-approved,
              "Completed" = buyer-approved only. */}
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-full p-1 shadow-sm">
            {[
              { value: 'active', label: 'Active' },
              { value: 'completed', label: 'Completed' },
              { value: 'all', label: 'All' },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFilterStatus(opt.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filterStatus === opt.value
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Brand filter */}
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={filterBrand}
              onChange={e => setFilterBrand(e.target.value)}
              className="border-0 focus:ring-0 focus:outline-none bg-transparent text-sm text-gray-700 font-medium"
            >
              <option value="">All Brands</option>
              {brands.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          {/* Sample Type filter */}
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={filterSampleType}
              onChange={e => setFilterSampleType(e.target.value)}
              className="border-0 focus:ring-0 focus:outline-none bg-transparent text-sm text-gray-700 font-medium"
            >
              <option value="">All Sample Types</option>
              {sampleTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Stage filter */}
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={filterStage}
              onChange={e => setFilterStage(e.target.value)}
              className="border-0 focus:ring-0 focus:outline-none bg-transparent text-sm text-gray-700 font-medium"
            >
              <option value="">All Stages</option>
              {STAGE_FILTER_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {(searchTerm || filterStatus !== 'active' || filterBrand || filterSampleType || filterStage) && (
            <button
              onClick={() => { setSearchTerm(''); setFilterStatus('active'); setFilterBrand(''); setFilterSampleType(''); setFilterStage(''); }}
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-red-500"
              title="Clear filters"
            >
              <X className="h-4 w-4" />
              Clear
            </button>
          )}

          <span className="text-sm text-gray-500 whitespace-nowrap">{recordCount} records</span>

          <SRDPrintDialog />

          {canCreateSRD && (
            <Button
              onClick={() => router.push(`/dashboard/${session.user.role}/create`)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Create SRD
            </Button>
          )}
        </div>
      }
    >
      <div className="flex flex-col flex-1 h-[calc(100vh-56px)] overflow-hidden space-y-4 p-4">
        <SRDTable
          department={departmentFilter}
          searchTerm={searchTerm}
          filterStatus={effectiveStatus}
          filterBrand={filterBrand}
          filterSampleType={filterSampleType}
          filterStage={filterStage}
          onCountChange={setRecordCount}
        />
      </div>
    </Layout>
  );
}

export default function SRDListPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SRDListPageContent />
    </Suspense>
  );
}
