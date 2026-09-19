'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Layout from '@/components/layout/Layout';
import SRDTable from '@/components/SRDTable';
import SRDPrintDialog from '@/components/SRDPrintDialog';
import { Button } from '@/components/ui/button';
import { Search, Filter, Plus, X } from 'lucide-react';
import { STAGE_FILTER_OPTIONS } from '@/lib/sampleFilters';

// Shared /srd-style department page. Replaces the old stat-card + card-grid
// dashboards (CAD/MMC/COM/dispatch/dynamic departments) with a single filter
// header + SRDTable, matching the appearance of /srd.
export default function SrdListPage({
  department = 'all',
  createHref,
  canCreate = false,
  defaultStatus = 'active',
  showPrint = true,
}) {
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState(defaultStatus);
  const [filterBrand, setFilterBrand] = useState('');
  const [filterSampleType, setFilterSampleType] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [brands, setBrands] = useState([]);
  const [sampleTypes, setSampleTypes] = useState([]);
  const [recordCount, setRecordCount] = useState(0);

  // A specific stage (especially Approved/Dispatched/Rejected) implies "all
  // statuses", otherwise completed SRDs would be hidden by the default
  // status filter and stage filtering would return nothing.
  const effectiveStatus = filterStage ? 'all' : filterStatus;

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

  const hasFilters = searchTerm || filterStatus !== defaultStatus || filterBrand || filterSampleType || filterStage;

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

          {/* Status filter — matches the STATUS column (production progress). */}
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="border-0 focus:ring-0 focus:outline-none bg-transparent text-sm text-gray-700 font-medium"
            >
              <option value="active">All Active</option>
              <option value="pre-production">Pre-Production</option>
              <option value="in-production">In Production</option>
              <option value="completed">Completed</option>
              <option value="all">All Statuses</option>
            </select>
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

          {hasFilters && (
            <button
              onClick={() => { setSearchTerm(''); setFilterStatus(defaultStatus); setFilterBrand(''); setFilterSampleType(''); setFilterStage(''); }}
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-red-500"
              title="Clear filters"
            >
              <X className="h-4 w-4" />
              Clear
            </button>
          )}

          <span className="text-sm text-gray-500 whitespace-nowrap">{recordCount} records</span>

          {showPrint && <SRDPrintDialog />}

          {canCreate && createHref && (
            <Button
              onClick={() => router.push(createHref)}
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
          department={department}
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