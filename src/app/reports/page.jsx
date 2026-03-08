'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, Calendar, Filter } from 'lucide-react';

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

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
  }, [session, status, router]);

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

        {/* Report Types */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        </div>
      </div>
    </Layout>
  );
}
