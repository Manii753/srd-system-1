'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  ExternalLink,
  Filter,
  LayoutList,
  Settings2,
} from 'lucide-react';

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    department: '',
    status: '',
    stage: '',
    brand: '',
    sampleType: '',
  });
  const [stages, setStages] = useState([]);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [reportTemplates, setReportTemplates] = useState([]);
  const [selectedSummaryTemplateId, setSelectedSummaryTemplateId] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
  }, [session, status, router]);

  useEffect(() => {
    if (status === 'loading' || !session) {
      return;
    }

    async function fetchReportTemplates() {
      try {
        setLoadingTemplate(true);
        const response = await fetch('/api/reportTemplate');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load report templates');
        }

        const templates = Array.isArray(data) ? data : [];
        const active = templates.find((template) => template.isActive) || null;
        const preferredSummaryTemplate =
          templates.find((template) => !template.isActive) ||
          templates[0] ||
          null;

        setReportTemplates(templates);
        setActiveTemplate(active);
        setSelectedSummaryTemplateId(preferredSummaryTemplate?._id || '');
      } catch (error) {
        console.error('Failed to fetch report templates', error);
        setReportTemplates([]);
        setActiveTemplate(null);
        setSelectedSummaryTemplateId('');
      } finally {
        setLoadingTemplate(false);
      }
    }

    fetchReportTemplates();
  }, [session, status]);

  useEffect(() => {
    if (status === 'loading' || !session) return;

    fetch('/api/stages')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStages(Array.isArray(data.data) ? data.data.filter((s) => s.isActive !== false) : []);
        }
      })
      .catch((err) => console.error('Failed to load production stages', err));
  }, [session, status]);

  const generateReport = (reportType, templateId = '') => {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (!value) return;
      if (key === 'status') {
        params.set('completionStatus', value);
      } else if (key === 'stage') {
        params.set('currentProductionStage', value);
      } else {
        params.set(key, value);
      }
    });

    params.set('reportType', reportType);
    if (templateId) {
      params.set('templateId', templateId);
    }

    window.open(`/reports/print?${params.toString()}`, '_blank');
  };

  if (status === 'loading') {
    return <Layout><div className="p-8">Loading...</div></Layout>;
  }

  const dynamicColumnCount = activeTemplate?.columns?.length || 0;
  const dynamicReportDisabled = dynamicColumnCount === 0;
  const activeLabelsPreview = activeTemplate?.columns?.slice(0, 8).map((column) => column.label).join(', ');
  const selectedSummaryTemplate = reportTemplates.find((template) => template._id === selectedSummaryTemplateId) || null;
  const summaryTemplateColumnCount = selectedSummaryTemplate?.columns?.length || 0;
  const summaryTemplateDisabled = !selectedSummaryTemplateId || summaryTemplateColumnCount === 0;
  const summaryLabelsPreview = selectedSummaryTemplate?.columns?.slice(0, 8).map((column) => column.label).join(', ');

  return (
    <Layout>
      <div className="h-full overflow-y-auto custom-scrollbar p-2">
        <div className="space-y-4">
          <div>
            <h1 className="text-app-heading font-bold text-gray-900">SRD Reports</h1>
            <p className="text-gray-600 mt-1">Generate detailed reports with filters</p>
          </div>

          <div className="bg-white rounded-lg shadow p-3">
            <div className="flex items-center mb-2">
              <Filter className="h-5 w-5 mr-2 text-gray-600" />
              <h2 className="text-app-heading font-semibold">Filters</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
              <div>
                <label className="block text-app-text font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  className="w-full p-2 border border-gray-300 rounded"
                  value={filters.startDate}
                  onChange={(event) => setFilters({ ...filters, startDate: event.target.value })}
                />
              </div>

              <div>
                <label className="block text-app-text font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  className="w-full p-2 border border-gray-300 rounded"
                  value={filters.endDate}
                  onChange={(event) => setFilters({ ...filters, endDate: event.target.value })}
                />
              </div>

              <div>
                <label className="block text-app-text font-medium text-gray-700 mb-1">
                  Department
                </label>
                <select
                  className="w-full p-2 border border-gray-300 rounded"
                  value={filters.department}
                  onChange={(event) => setFilters({ ...filters, department: event.target.value })}
                >
                  <option value="">All Departments</option>
                  <option value="vmd">VMD</option>
                  <option value="cad">CAD</option>
                  <option value="commercial">Commercial</option>
                  <option value="mmc">MMC</option>
                </select>
              </div>

              <div>
                <label className="block text-app-text font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  className="w-full p-2 border border-gray-300 rounded"
                  value={filters.status}
                  onChange={(event) => setFilters({ ...filters, status: event.target.value })}
                >
                  <option value="">All Status</option>
                  <option value="pre-production">Pre-Production</option>
                  <option value="in-production">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="block text-app-text font-medium text-gray-700 mb-1">
                  Stage
                </label>
                <select
                  className="w-full p-2 border border-gray-300 rounded"
                  value={filters.stage}
                  onChange={(event) => setFilters({ ...filters, stage: event.target.value })}
                >
                  <option value="">All Stages</option>
                  {stages.map((stage) => (
                    <option key={stage._id} value={stage._id}>
                      {stage.displayName || stage.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-app-text font-medium text-gray-700 mb-1">
                  Brand
                </label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded"
                  placeholder="Filter by brand..."
                  value={filters.brand}
                  onChange={(event) => setFilters({ ...filters, brand: event.target.value })}
                />
              </div>

              <div>
                <label className="block text-app-text font-medium text-gray-700 mb-1">
                  Sample Type
                </label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded"
                  placeholder="Filter by sample type..."
                  value={filters.sampleType}
                  onChange={(event) => setFilters({ ...filters, sampleType: event.target.value })}
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                onClick={() => setFilters({
                  startDate: '',
                  endDate: '',
                  department: '',
                  status: '',
                  stage: '',
                  brand: '',
                  sampleType: '',
                })}
              >
                Clear Filters
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-3">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center">
                  <LayoutList className="h-5 w-5 mr-2 text-purple-600" />
                  <h2 className="text-app-heading font-semibold">Dynamic Report Template</h2>
                </div>
                <p className="text-app-text text-gray-500 mt-2">
                  Manage the ordered columns for the dynamic report in the dedicated template designer.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => router.push('/srdfields')}>
                  <Settings2 className="h-4 w-4 mr-2" />
                  Manage Fields
                </Button>
                <Button onClick={() => router.push('/reports/templates')}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Template Designer
                </Button>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
              {loadingTemplate ? (
                <div className="text-app-text text-gray-500">Loading active template...</div>
              ) : activeTemplate ? (
                <div className="space-y-2">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">{activeTemplate.name}</div>
                      <div className="text-app-text text-gray-500">
                        {dynamicColumnCount} column{dynamicColumnCount === 1 ? '' : 's'} in the active template
                      </div>
                    </div>
                    <span className="inline-flex w-fit rounded-full bg-green-100 px-3 py-1 text-app-text font-medium text-green-700">
                      Active Template
                    </span>
                  </div>

                  <div className="text-app-text text-gray-600">
                    {dynamicColumnCount > 0
                      ? `Columns: ${activeLabelsPreview}${dynamicColumnCount > 8 ? ' ...' : ''}`
                      : 'This template has no columns yet.'}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="font-medium text-gray-800">No active dynamic report template</div>
                  <div className="text-app-text text-gray-500">
                    Open the template designer to create or activate a report template.
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4">
                <Calendar className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <h3 className="text-app-heading font-semibold">Summary Report</h3>
                  <p className="text-app-text text-gray-600">Choose any saved template without changing the active one</p>
                </div>
              </div>
              <div className="mb-4 space-y-3">
                <div>
                  <label className="block text-app-text font-medium text-gray-700 mb-1">
                    Template
                  </label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded"
                    value={selectedSummaryTemplateId}
                    onChange={(event) => setSelectedSummaryTemplateId(event.target.value)}
                    disabled={loadingTemplate || reportTemplates.length === 0}
                  >
                    {reportTemplates.length === 0 ? (
                      <option value="">No templates available</option>
                    ) : (
                      reportTemplates.map((template) => (
                        <option key={template._id} value={template._id}>
                          {template.name}{template.isActive ? ' (Active)' : ''}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div className="text-app-text text-gray-600">
                  {loadingTemplate
                    ? 'Loading templates...'
                    : selectedSummaryTemplate && summaryTemplateColumnCount > 0
                      ? `Template: ${selectedSummaryTemplate.name}. Columns: ${summaryLabelsPreview}${summaryTemplateColumnCount > 8 ? ' ...' : ''}`
                      : 'Select a saved template to print this report.'}
                </div>
              </div>
              <Button
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={() => generateReport('summary', selectedSummaryTemplateId)}
                disabled={summaryTemplateDisabled || loadingTemplate}
              >
                Generate Summary Report
              </Button>
            </div>

            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow border-2 border-purple-100">
              <div className="flex items-center mb-4">
                <LayoutList className="h-8 w-8 text-purple-600 mr-3" />
                <div>
                  <h3 className="text-app-heading font-semibold">Dynamic Report</h3>
                  <p className="text-app-text text-gray-600">Uses the active dynamic report template</p>
                </div>
              </div>
              <div className="mb-4 text-app-text text-gray-600">
                {loadingTemplate
                  ? 'Loading active template...'
                  : activeTemplate && dynamicColumnCount > 0
                    ? `Template: ${activeTemplate.name}. Columns: ${activeLabelsPreview}${dynamicColumnCount > 8 ? ' ...' : ''}`
                    : 'No active template with columns is available yet. Configure it in the template designer.'}
              </div>
              <Button
                className="w-full bg-purple-600 hover:bg-purple-700"
                onClick={() => generateReport('dynamic')}
                disabled={dynamicReportDisabled || loadingTemplate}
              >
                Generate Dynamic Report
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

