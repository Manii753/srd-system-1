import { useState, useEffect, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown, X, ChevronLeft, ChevronRight, Copy, Repeat, Eye } from 'lucide-react';

// Helper: get status value for a department from the status array
const getDeptStatus = (statusArray, dept) =>
  (Array.isArray(statusArray) ? statusArray : []).find(s => s.department === dept)?.value || 'pending';

// Helper: get status update date for a department
const getDeptStatusDate = (statusArray, dept) =>
  (Array.isArray(statusArray) ? statusArray : []).find(s => s.department === dept)?.updatedAt || null;
import Image from 'next/image';
import Link from 'next/link';
import {
  formatFieldValueForDisplay,
  getAssetUrl,
  getImageAssetsFromDynamicFields,
} from '@/lib/assetUtils';


export default function SRDTable({ srds, department, searchTerm: searchTermProp, filterStatus: filterStatusProp }) {
  const router = useRouter();
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationSettings, setPaginationSettings] = useState({ enabled: true, itemsPerPage: 10 });

  // Use controlled props if provided
  const effectiveSearch = searchTermProp !== undefined ? searchTermProp : searchTerm;
  const effectiveFilter = filterStatusProp !== undefined ? filterStatusProp : filterStatus;
  const [selectedImages, setSelectedImages] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [productionStages, setProductionStages] = useState([]);
  const [quickDetailsFields, setQuickDetailsFields] = useState([]);
  const [expandedRows, setExpandedRows] = useState({});

  // Reset to page 1 when search/filter changes
  useEffect(() => { setCurrentPage(1); }, [effectiveSearch, effectiveFilter]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [stagesRes, fieldsRes, companyRes] = await Promise.all([
        fetch('/api/production-stages'),
        fetch('/api/newField'),
        fetch('/api/company'),
      ]);

      const stagesData = await stagesRes.json();
      if (stagesData.success) setProductionStages(stagesData.data.filter(s => s.isActive));

      const fieldsData = await fieldsRes.json();
      if (Array.isArray(fieldsData)) {
        setQuickDetailsFields(fieldsData.filter(f => f.isShownInQuickDetails && f.active));
      }

      const companyData = await companyRes.json();
      const pg = companyData?.paginationSettings;
      if (pg?.srdList) {
        setPaginationSettings(pg.srdList);
      } else if (pg?.itemsPerPage !== undefined) {
        // old flat structure
        setPaginationSettings({ enabled: pg.enabled ?? true, itemsPerPage: pg.itemsPerPage });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleDuplicate = async (srdId) => {
    if (!confirm('Are you sure you want to duplicate this SRD?')) return;

    try {
      const response = await fetch(`/api/srd/${srdId}/duplicate`, { method: 'POST' });
      const result = await response.json();
      if (result.success) {
        alert('SRD duplicated successfully!');
        router.push(`/srd/${result.data._id}`);
      } else {
        alert(`Error duplicating SRD: ${result.error}`);
      }
    } catch (error) {
      alert(`An error occurred: ${error.message}`);
    }
  };

  const handleRedo = async (srdId) => {
    if (!confirm('Are you sure you want to create a "redo" version of this SRD?')) return;

    try {
      const response = await fetch(`/api/srd/${srdId}/duplicate?action=redo`, { method: 'POST' });
      const result = await response.json();
      if (result.success) {
        alert('SRD "redo" created successfully!');
        router.push(`/srd/${result.data._id}`);
      } else {
        alert(`Error creating "redo" SRD: ${result.error}`);
      }
    } catch (error) {
      alert(`An error occurred: ${error.message}`);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'flagged': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Helper function to get dynamic field value by slug or name
  const getDynamicFieldValue = (srd, fieldSlug) => {
    const field = srd.dynamicFields?.find(f =>
      f.slug === fieldSlug ||
      f.name?.toLowerCase().replace(/\s+/g, '-') === fieldSlug ||
      f.name?.toLowerCase() === fieldSlug.replace(/-/g, ' ')
    );

    if (!field || field.value === null || field.value === undefined) {
      return 'N/A';
    }

    return formatFieldValueForDisplay(field.value, field.type || field.field?.type) || 'N/A';
  };

  // Helper function to get quick details fields for an SRD
  const getQuickDetailsFields = (srd) => {
    if (!srd.dynamicFields || quickDetailsFields.length === 0) return [];

    return quickDetailsFields
      .map(quickField => {
        // Find matching dynamic field by name, slug, or originalFieldId
        const dynamicField = srd.dynamicFields.find(df => {
          // Match by originalFieldId if available
          if (quickField._id && df.originalFieldId) {
            const dfId = String(df.originalFieldId);
            const qfId = String(quickField._id);
            if (dfId === qfId) return true;
          }

          // Match by name (case-insensitive)
          const dfName = df.name?.toLowerCase().trim();
          const qfName = quickField.name?.toLowerCase().trim();
          if (dfName && qfName && dfName === qfName) return true;

          // Match by slug (case-insensitive)
          const dfSlug = df.slug?.toLowerCase().trim();
          const qfSlug = quickField.slug?.toLowerCase().trim();
          if (dfSlug && qfSlug && dfSlug === qfSlug) return true;

          // Match by name to slug conversion
          if (dfName && qfSlug && dfName.replace(/\s+/g, '-') === qfSlug) return true;
          if (qfName && dfSlug && qfName.replace(/\s+/g, '-') === dfSlug) return true;

          return false;
        });

        if (!dynamicField) return null;

        let displayValue = dynamicField.value;
        if (displayValue === null || displayValue === undefined || displayValue === '') {
          displayValue = 'N/A';
        } else if (dynamicField.type === 'date' && displayValue !== 'N/A') {
          try {
            const dateValue = new Date(displayValue);
            if (!isNaN(dateValue.getTime())) {
              displayValue = dateValue.toLocaleDateString();
            }
          } catch (e) {
            // Keep original value if date parsing fails
          }
        } else {
          displayValue = formatFieldValueForDisplay(displayValue, dynamicField.type || quickField.type) || 'N/A';
        }

        return {
          name: dynamicField.name || quickField.name,
          value: String(displayValue)
        };
      })
      .filter(Boolean);
  };

  const filteredAndSortedSRDs = srds
    .filter(srd => {
      const matchesSearch = (srd.title || '').toLowerCase().includes(effectiveSearch.toLowerCase()) ||
        (srd.refNo || '').toLowerCase().includes(effectiveSearch.toLowerCase());
      const matchesStatus = effectiveFilter === 'all' || getDeptStatus(srd.status, department) === effectiveFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (sortField === 'createdAt' || sortField === 'updatedAt') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  // Pagination
  const { enabled: paginationEnabled, itemsPerPage } = paginationSettings;
  const totalPages = paginationEnabled ? Math.ceil(filteredAndSortedSRDs.length / itemsPerPage) : 1;
  const paginatedSRDs = paginationEnabled
    ? filteredAndSortedSRDs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : filteredAndSortedSRDs;

  // Helper function to get all images for an SRD
  const getAllImages = (srd) => {
    return getImageAssetsFromDynamicFields(srd.dynamicFields, { department })
      .map((asset) => getAssetUrl(asset))
      .filter(Boolean);
  };

  const openImageSlider = (images) => {
    const imageArray = Array.isArray(images) ? images : [images];
    setSelectedImages(imageArray);
    setCurrentImageIndex(0);
  };

  const closeImageSlider = () => {
    setSelectedImages(null);
    setCurrentImageIndex(0);
  };

  const nextImage = () => {
    if (selectedImages && currentImageIndex < selectedImages.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
  };

  const prevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };

  const toggleRow = (srdId) => {
    setExpandedRows(prev => ({ ...prev, [srdId]: !prev[srdId] }));
  };




  return (
    <div className="flex flex-col h-full w-full bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Table */}
      <div className="w-full flex-1 overflow-y-auto relative custom-scrollbar">
        <table className="w-full border-separate border-spacing-0">
          <thead className="sticky top-0 z-10 bg-gray-50 shadow-sm">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('createdAt')}
                  className="flex items-center space-x-2 hover:text-gray-800 transition-colors duration-200 group"
                >
                  <span>Date</span>
                  {sortField === 'createdAt' && (
                    sortDirection === 'asc' ?
                      <ChevronUp className="h-4 w-4 text-blue-500" /> :
                      <ChevronDown className="h-4 w-4 text-blue-500" />
                  )}
                  {sortField !== 'createdAt' && (
                    <ChevronDown className="h-4 w-4 opacity-0 group-hover:opacity-50 transition-opacity" />
                  )}
                </button>
              </th>
              {/* <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Picture</th> */}
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Inquiry #</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Style</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {paginatedSRDs.map((srd) => {
              const isExpanded = !!expandedRows[srd._id];
              const depts = [
                { key: 'vmd', label: 'VMD' },
                { key: 'cad', label: 'CAD' },
                { key: 'mmc', label: 'MMC' },
                { key: 'commercial', label: 'COM' },
              ];

              return (
                <Fragment key={srd._id}>
                  <tr className="hover:bg-blue-50 transition-colors duration-200 group">
                    <td className="px-6 py-0 whitespace-nowrap border-b border-black/10">
                      <div className="text-sm font-semibold text-gray-900">
                        {new Date(srd.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-0 whitespace-nowrap border-b border-black/10">
                      <div className="flex items-center">
                        <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold">
                          {srd.refNo}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-0 whitespace-nowrap border-b border-black/10">
                      <div className="text-sm font-medium text-gray-900">
                        {getDynamicFieldValue(srd, 'style')}
                      </div>
                    </td>
                    <td className="px-6 py-1 border-b border-black/10">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1 flex-wrap">
                          {depts.map(({ key, label }) => {
                            const val = getDeptStatus(srd.status, key);
                            const date = getDeptStatusDate(srd.status, key);
                            const isApproved = val === 'approved';
                            return (
                              <div
                                key={key}
                                className={`px-2 py-1 rounded-lg text-xs font-bold shadow-sm ${
                                  isApproved
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-red-100 text-red-600'
                                }`}
                                title={isApproved && date ? `Approved: ${new Date(date).toLocaleDateString()}` : val}
                              >
                                <div className="uppercase">{label}</div>
                                {isApproved && date && (
                                  <div className="text-[10px] font-normal opacity-80">
                                    {new Date(date).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <button
                          onClick={() => toggleRow(srd._id)}
                          className="ml-1 p-1 rounded hover:bg-gray-200 transition-colors shrink-0"
                          title={isExpanded ? 'Collapse production stages' : 'Expand production stages'}
                        >
                          {isExpanded
                            ? <ChevronUp className="h-3.5 w-3.5 text-gray-500" />
                            : <ChevronDown className="h-3.5 w-3.5 text-gray-500" />}
                        </button>
                      </div>
                    </td>
                    <td className="justify-center align-middle px-6 py-0 whitespace-nowrap text-sm font-medium border-b border-black/10">
                      <div className="flex gap-2 justify-center">
                        <Link href={`/srd/${srd._id}`}>
                          <Button
                            size="sm"
                            variant="outline"
                            title="View Details"
                            className="border-gray-300 hover:border-blue-500 hover:text-blue-600 transition-colors duration-200"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDuplicate(srd._id)}
                          title="Duplicate SRD"
                          className="border-gray-300 hover:border-blue-500 hover:text-blue-600 transition-colors duration-200"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRedo(srd._id)}
                          title="Redo SRD"
                          className="border-gray-300 hover:border-green-500 hover:text-green-600 transition-colors duration-200"
                        >
                          <Repeat className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded production stage timeline */}
                  {isExpanded && (
                    <tr className="bg-gray-50">
                      <td colSpan={5} className="px-6 py-3 border-b border-black/10">
                        {productionStages.length === 0 ? (
                          <p className="text-xs text-gray-400 italic">No production stages configured.</p>
                        ) : (
                          <div className="flex items-start gap-0">
                            {[...productionStages].sort((a, b) => a.order - b.order).map((stage, idx, arr) => {
                              const historyEntry = (srd.productionHistory || []).find(
                                h => String(h.stage) === String(stage._id)
                              );
                              const isCompleted = historyEntry?.status === 'completed';
                              const isCurrent = srd.inProduction && String(srd.currentProductionStage) === String(stage._id);
                              const isLast = idx === arr.length - 1;

                              return (
                                <div key={stage._id} className="flex items-center">
                                  <div className="flex flex-col items-center min-w-[80px]">
                                    {/* Dot */}
                                    <div className={`w-3 h-3 rounded-full border-2 border-white shadow ${
                                      isCompleted ? 'bg-green-500' :
                                      isCurrent ? 'bg-blue-500 ring-2 ring-blue-300 animate-pulse' :
                                      'bg-gray-300'
                                    }`} />
                                    {/* Stage name */}
                                    <div className="text-[10px] font-semibold text-gray-700 mt-1 text-center leading-tight">
                                      {stage.displayName || stage.name}
                                    </div>
                                    {/* Date / indicator */}
                                    {isCompleted && historyEntry.endDate ? (
                                      <div className="text-[9px] text-green-600 text-center mt-0.5">
                                        {new Date(historyEntry.endDate).toLocaleDateString()}
                                      </div>
                                    ) : isCurrent && historyEntry?.startDate ? (
                                      <div className="flex flex-col items-center gap-0.5 mt-0.5">
                                        <span className="text-[9px] text-blue-500 text-center">
                                          {new Date(historyEntry.startDate).toLocaleDateString()}
                                        </span>
                                        <span className="text-[9px] bg-blue-100 text-blue-700 px-1 rounded font-medium">In Progress</span>
                                      </div>
                                    ) : (
                                      <div className="text-[9px] text-gray-400 mt-0.5">—</div>
                                    )}
                                  </div>
                                  {/* Connector line */}
                                  {!isLast && (
                                    <div className={`h-0.5 w-6 mb-6 ${isCompleted ? 'bg-green-400' : 'bg-gray-200'}`} />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredAndSortedSRDs.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No SRDs found matching your criteria.</p>
        </div>
      )}

      {/* Pagination */}
      {paginationEnabled && totalPages > 1 && (
        <div className="flex items-center justify-end px-6 py-2 border-t border-gray-100 bg-transparent rounded-b-xl gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .reduce((acc, p, idx, arr) => {
                if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                acc.push(p);
                return acc;
              }, [])
              .map((p, idx) =>
                p === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-gray-400 text-sm">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-7 h-7 rounded text-xs font-medium transition-colors ${currentPage === p
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-gray-200 text-gray-700'
                      }`}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Image Slider Modal */}
      {selectedImages && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90"
          onClick={closeImageSlider}
        >
          <button
            onClick={closeImageSlider}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
          >
            <X className="h-8 w-8" />
          </button>

          <div
            className="relative max-w-5xl max-h-[90vh] w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={selectedImages[currentImageIndex]}
              width={1200}
              height={800}
              alt={`Image ${currentImageIndex + 1}`}
              className="w-full h-auto max-h-[90vh] object-contain rounded-lg"
            />

            {selectedImages.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  disabled={currentImageIndex === 0}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 disabled:opacity-30 disabled:cursor-not-allowed rounded-full p-2 transition-all"
                >
                  <ChevronLeft className="h-6 w-6 text-gray-800" />
                </button>

                <button
                  onClick={nextImage}
                  disabled={currentImageIndex === selectedImages.length - 1}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 disabled:opacity-30 disabled:cursor-not-allowed rounded-full p-2 transition-all"
                >
                  <ChevronRight className="h-6 w-6 text-gray-800" />
                </button>

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-60 text-white px-4 py-2 rounded-full text-sm">
                  {currentImageIndex + 1} / {selectedImages.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
