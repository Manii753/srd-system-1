'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, Calendar, Filter, LayoutList, Save, GripVertical } from 'lucide-react';

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    department: '',
    status: '',
    brand: '',
    sampleType: ''
  });
  const [reportFields, setReportFields] = useState([]);
  const [loadingFields, setLoadingFields] = useState(true);
  const [savingOrder, setSavingOrder] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
  }, [session, status, router]);

  // Fetch fields marked inReport
  useEffect(() => {
    async function fetchReportFields() {
      try {
        setLoadingFields(true);
        const res = await fetch('/api/newField?inReport=true');
        const data = await res.json();
        if (Array.isArray(data)) {
          setReportFields(data.sort((a, b) => (a.inReportOrder || 0) - (b.inReportOrder || 0)));
        }
      } catch (err) {
        console.error('Failed to fetch report fields', err);
      } finally {
        setLoadingFields(false);
      }
    }
    fetchReportFields();
  }, []);

  const handleOrderChange = (fieldId, newOrder) => {
    setReportFields(prev =>
      prev.map(f => f._id === fieldId ? { ...f, inReportOrder: parseInt(newOrder) || 0 } : f)
    );
  };

  const handleSaveOrder = async () => {
    setSavingOrder(true);
    try {
      await Promise.all(
        reportFields.map(f =>
          fetch(`/api/newField?id=${f._id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inReportOrder: f.inReportOrder || 0 })
          })
        )
      );
      // Re-sort after saving
      setReportFields(prev => [...prev].sort((a, b) => (a.inReportOrder || 0) - (b.inReportOrder || 0)));
      alert('Report order saved successfully!');
    } catch (err) {
      console.error('Failed to save order', err);
      alert('Failed to save report order');
    } finally {
      setSavingOrder(false);
    }
  };

  // Drag-and-drop reordering
  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newFields = [...reportFields];
    const dragged = newFields.splice(draggedIndex, 1)[0];
    newFields.splice(index, 0, dragged);

    // Update inReportOrder based on new positions
    const updated = newFields.map((f, i) => ({ ...f, inReportOrder: i }));
    setReportFields(updated);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const generateReport = (reportType) => {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });

    params.set('reportType', reportType);

    window.open(`/reports/print?${params.toString()}`, '_blank');
  };

  if (status === 'loading') {
    return <Layout><div className="p-8">Loading...</div></Layout>;
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">SRD Reports</h1>
          <p className="text-gray-600 mt-1">Generate detailed reports with filters</p>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Filter className="h-5 w-5 mr-2 text-gray-600" />
            <h2 className="text-lg font-semibold">Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                className="w-full p-2 border border-gray-300 rounded"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                className="w-full p-2 border border-gray-300 rounded"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>

            {/* Department */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <select
                className="w-full p-2 border border-gray-300 rounded"
                value={filters.department}
                onChange={(e) => setFilters({ ...filters, department: e.target.value })}
              >
                <option value="">All Departments</option>
                <option value="vmd">VMD</option>
                <option value="cad">CAD</option>
                <option value="commercial">Commercial</option>
                <option value="mmc">MMC</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                className="w-full p-2 border border-gray-300 rounded"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">All Status</option>
                <option value="pre-production">Pre-Production</option>
                <option value="in-production">In Production</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {/* Brand */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Brand
              </label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded"
                placeholder="Filter by brand..."
                value={filters.brand}
                onChange={(e) => setFilters({ ...filters, brand: e.target.value })}
              />
            </div>

            {/* Sample Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sample Type
              </label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded"
                placeholder="Filter by sample type..."
                value={filters.sampleType}
                onChange={(e) => setFilters({ ...filters, sampleType: e.target.value })}
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
                brand: '',
                sampleType: ''
              })}
            >
              Clear Filters
            </Button>
          </div>
        </div>

        {/* Report Template Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <LayoutList className="h-5 w-5 mr-2 text-purple-600" />
              <h2 className="text-lg font-semibold">Report Template</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {reportFields.length} field{reportFields.length !== 1 ? 's' : ''} in report
              </span>
              <Button
                size="sm"
                onClick={handleSaveOrder}
                disabled={savingOrder || reportFields.length === 0}
                className="flex items-center bg-purple-600 hover:bg-purple-700"
              >
                <Save className="h-4 w-4 mr-1" />
                {savingOrder ? 'Saving...' : 'Save Order'}
              </Button>
            </div>
          </div>

          <p className="text-sm text-gray-500 mb-4">
            Drag to reorder or edit the order numbers. Fields marked &quot;In Report&quot; from the field editor appear here.
            Go to <button onClick={() => router.push('/srdfields')} className="text-purple-600 hover:underline font-medium">Manage Fields</button> to add/remove fields from the report.
          </p>

          {loadingFields ? (
            <div className="text-center py-8 text-gray-500">Loading report fields...</div>
          ) : reportFields.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <LayoutList className="mx-auto h-10 w-10 text-gray-300 mb-2" />
              <p className="text-gray-500 text-sm">No fields are marked for reports yet.</p>
              <p className="text-gray-400 text-xs mt-1">
                Go to <button onClick={() => router.push('/srdfields')} className="text-purple-500 hover:underline">Manage Fields</button> and toggle &quot;Report&quot; on the fields you want.
              </p>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="grid grid-cols-[auto_1fr_auto_auto] gap-0 text-xs font-semibold text-gray-500 uppercase bg-gray-50 px-4 py-2 border-b">
                <div className="w-8"></div>
                <div>Field Name</div>
                <div className="w-20 text-center">Order</div>
                <div className="w-24 text-center">Department</div>
              </div>
              {reportFields.map((field, index) => (
                <div
                  key={field._id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`grid grid-cols-[auto_1fr_auto_auto] gap-0 items-center px-4 py-2.5 border-b last:border-b-0 transition-colors
                    ${draggedIndex === index ? 'bg-purple-50 shadow-inner' : 'hover:bg-gray-50'}
                  `}
                >
                  <div className="w-8 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
                    <GripVertical className="h-4 w-4" />
                  </div>
                  <div className="font-medium text-gray-800 text-sm">{field.name}</div>
                  <div className="w-20 flex justify-center">
                    <input
                      type="number"
                      min="0"
                      className="w-14 p-1 text-sm text-center border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 focus:outline-none"
                      value={field.inReportOrder || 0}
                      onChange={(e) => handleOrderChange(field._id, e.target.value)}
                    />
                  </div>
                  <div className="w-24 text-center">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      {field.department?.toUpperCase() || 'GLOBAL'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Report Types */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Detailed Report */}
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-4">
              <FileSpreadsheet className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h3 className="text-lg font-semibold">Detailed Report</h3>
                <p className="text-sm text-gray-600">Complete information with all fields</p>
              </div>
            </div>
            <div className="mb-4 text-sm text-gray-600">
              Includes: Date, Brand, Sample Type, Style, Description, Size, Qty, Color/Wash, Fabric, Sample Raised, Inquiry #, Status, Inquiry Status, Picture, ETD
            </div>
            <Button
              className="w-full"
              onClick={() => generateReport('detailed')}
            >
              Generate Detailed Report
            </Button>
          </div>

          {/* Summary Report */}
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-4">
              <Calendar className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <h3 className="text-lg font-semibold">Summary Report</h3>
                <p className="text-sm text-gray-600">Condensed view with key information</p>
              </div>
            </div>
            <div className="mb-4 text-sm text-gray-600">
              Includes: SR Date, Inquiry #, Priority, Brand, Style, Description, Size, Qty/PCS, Fabric, Color/Wash, Sample Type, ETD, All Trims, B/Wash Embellish, Pattern, Cutting, Sewing, Wash, A/Wash Embellish, Shipped, Reject, Picture, Status
            </div>
            <Button
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={() => generateReport('summary')}
            >
              Generate Summary Report
            </Button>
          </div>

          {/* Dynamic Report */}
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow border-2 border-purple-100">
            <div className="flex items-center mb-4">
              <LayoutList className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <h3 className="text-lg font-semibold">Dynamic Report</h3>
                <p className="text-sm text-gray-600">Uses your report template above</p>
              </div>
            </div>
            <div className="mb-4 text-sm text-gray-600">
              {reportFields.length > 0
                ? `Includes: ${reportFields.map(f => f.name).join(', ')}`
                : 'No fields configured yet. Add fields from the template section above.'}
            </div>
            <Button
              className="w-full bg-purple-600 hover:bg-purple-700"
              onClick={() => generateReport('dynamic')}
              disabled={reportFields.length === 0}
            >
              Generate Dynamic Report
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
