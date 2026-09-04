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
import { useSession } from 'next-auth/react';


export default function SRDTable({ department, searchTerm: searchTermProp, filterStatus: filterStatusProp, initialProductionStages, initialQuickDetailsFields, initialPaginationSettings, initialDelayThresholdDays }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [srds, setSRDs] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationSettings, setPaginationSettings] = useState(initialPaginationSettings || { enabled: true, itemsPerPage: 10 });
  const [delayThresholdDays, setDelayThresholdDays] = useState(initialDelayThresholdDays ?? 3);

  const effectiveSearch = searchTermProp !== undefined ? searchTermProp : searchTerm;
  const effectiveFilter = filterStatusProp !== undefined ? filterStatusProp : filterStatus;
  const [selectedImages, setSelectedImages] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [productionStages, setProductionStages] = useState([]);
  const [quickDetailsFields, setQuickDetailsFields] = useState([]);
  const [expandedRows, setExpandedRows] = useState({});

  useEffect(() => { setCurrentPage(1); }, [effectiveSearch, effectiveFilter, department]);

  useEffect(() => {
    if (initialProductionStages) setProductionStages(initialProductionStages.filter(s => s.isActive));
    if (initialQuickDetailsFields) setQuickDetailsFields(initialQuickDetailsFields.filter(f => f.isShownInQuickDetails && f.active));
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchSRDs();
  }, [currentPage, effectiveSearch, effectiveFilter, department, sortField, sortDirection, paginationSettings.itemsPerPage]);

  const fetchMetadata = async () => {
    try {
      const promises = [];
      if (!initialProductionStages) promises.push(fetch('/api/production-stages').then(r => r.json()));
      else promises.push(Promise.resolve(null));
      if (!initialQuickDetailsFields) promises.push(fetch('/api/newField').then(r => r.json()));
      else promises.push(Promise.resolve(null));
      if (!initialPaginationSettings) promises.push(fetch('/api/company').then(r => r.json()));
      else promises.push(Promise.resolve(null));

      const [stagesData, fieldsData, companyData] = await Promise.all(promises);

      if (stagesData?.success && !initialProductionStages) setProductionStages(stagesData.data.filter(s => s.isActive));
      if (Array.isArray(fieldsData) && !initialQuickDetailsFields) {
        setQuickDetailsFields(fieldsData.filter(f => f.isShownInQuickDetails && f.active));
      }
      if (companyData && !initialPaginationSettings) {
        const pg = companyData?.paginationSettings;
        if (pg?.srdList) setPaginationSettings(pg.srdList);
        else if (pg?.itemsPerPage !== undefined) setPaginationSettings({ enabled: pg.enabled ?? true, itemsPerPage: pg.itemsPerPage });
        if (companyData?.delayThresholdDays !== undefined) setDelayThresholdDays(companyData.delayThresholdDays);
      }
    } catch (error) {
      console.error('Error fetching metadata:', error);
    }
  };

  const fetchSRDs = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (department && department !== 'all') query.append('department', department);
      if (effectiveFilter && effectiveFilter !== 'all') query.append('status', effectiveFilter);
      if (effectiveSearch) query.append('search', effectiveSearch);
      query.append('page', currentPage);
      query.append('limit', paginationSettings.itemsPerPage || 20);
      query.append('sortBy', sortField);
      query.append('sortDir', sortDirection);

      const response = await fetch(`/api/srd?${query.toString()}`);
      const data = await response.json();
      if (data.success) {
        setSRDs(data.data);
        setTotalCount(data.totalCount);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error('Error fetching SRDs:', error);
    } finally {
      setLoading(false);
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

    const target = window.prompt('Optional: enter a department slug (vmd, cad, commercial, mmc) or production stage name to nudge. Leave blank to notify all users.');
    if (target === null) return;

    try {
      const response = await fetch(`/api/srd/${srdId}/duplicate?action=redo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nudgeTarget: target.trim() })
      });
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
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
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

  // Pagination
  const { enabled: paginationEnabled } = paginationSettings;

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
    <div className="flex flex-1 flex-col h-full w-full bg-white shadow-lg border border-gray-100 overflow-hidden">
      {loading && srds.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
      <>
      {/* Table */}
      <div className="w-full flex-1 overflow-y-auto relative custom-scrollbar">
        <table className="w-full border-separate border-spacing-0">
          <thead className="sticky top-0 z-10 bg-gray-50 shadow-sm">
            <tr>
              <th className="px-6 py-4 text-left text-app-heading font-bold text-gray-600 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('createdAt')}
                  className="flex items-center space-x-2 hover:text-gray-800 transition-colors duration-200 group"
                >
                  <span className='text-app-heading'>Date</span>
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
              {/* <th className="px-6 py-4 text-left text-app-heading font-bold text-gray-600 uppercase tracking-wider">Picture</th> */}
              <th className="px-6 py-4 text-left text-app-heading font-bold text-gray-600 uppercase tracking-wider">Inquiry #</th>
              <th className="px-6 py-4 text-left text-app-heading font-bold text-gray-600 uppercase tracking-wider">Brand</th>
              <th className="px-6 py-4 text-center text-app-heading font-bold text-gray-600 uppercase tracking-wider">VMD</th>
              <th className="px-6 py-4 text-center text-app-heading font-bold text-gray-600 uppercase tracking-wider">CAD</th>
              <th className="px-6 py-4 text-center text-app-heading font-bold text-gray-600 uppercase tracking-wider">MMC</th>
              <th className="px-6 py-4 text-center text-app-heading font-bold text-gray-600 uppercase tracking-wider">COM</th>
              <th className="px-6 py-4 text-left text-app-heading font-bold text-gray-600 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-center text-app-heading font-bold text-gray-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {srds.map((srd) => {
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
                    <td className="px-6 py-2 whitespace-nowrap border-b border-black/10">
                      <div className="text-app-text text-gray-900">
                        {new Date(srd.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap border-b border-black/10">
                      <div className="flex items-center">
                        <div className="px-3 py-1 rounded-full text-app-text">
                          {srd.refNo}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap border-b border-black/10">
                      <div className="text-app-text text-gray-700 font-medium">
                        {srd.dynamicFields?.find(
                          f => f.slug === 'brand' || f.name?.toLowerCase() === 'brand' || f.name?.toLowerCase() === 'buyer'
                        )?.value || <span className="text-gray-300">—</span>}
                      </div>
                    </td>
                    {depts.map(({ key }) => {
                      const val = getDeptStatus(srd.status, key);
                      const date = getDeptStatusDate(srd.status, key);
                      const isApproved = val === 'approved';
                      const isDelayed = val === 'pending' && delayThresholdDays > 0 &&
                        (Date.now() - new Date(srd.createdAt).getTime()) > delayThresholdDays * 24 * 60 * 60 * 1000;
                      const delayedDays = isDelayed
                        ? Math.floor((Date.now() - new Date(srd.createdAt).getTime()) / (24 * 60 * 60 * 1000)) - delayThresholdDays
                        : 0;
                      return (
                        <td key={key} className="px-6 py-2 border-b border-black/10 text-center">
                          {isApproved && date ? (
                            <span className="text-app-text font-medium text-green-700">
                              {new Date(date).toLocaleDateString()}
                            </span>
                          ) : isDelayed ? (
                            <span className="text-app-text font-medium text-red-600">Late {delayedDays} {delayedDays === 1 ? 'Day' : 'Days'}</span>
                          ) : (
                            <span className="text-app-text text-gray-400">Pending</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-6 py-2 border-b border-black/10">
                      <div className="flex items-center gap-2">
                        {(() => {
                          const srdStageIds = (srd.productionStages || []).map(id => String(id));
                          const relevantStages = srdStageIds.length > 0
                            ? productionStages.filter(s => srdStageIds.includes(String(s._id)))
                            : productionStages;

                          // Check if all stages are completed using multiple sources
                          const allCompletedFromHistory = relevantStages.length > 0 && relevantStages.every(stage => {
                            const historyEntry = (srd.productionHistory || []).find(h => String(h.stage) === String(stage._id));
                            return historyEntry?.status === 'completed';
                          });

                          const allCompletedFromSampleProcess = srd.sampleProcess && srd.sampleProcess.length > 0 &&
                            srd.sampleProcess.every(s => s.status === 'completed');

                          const allCompleted = srd.isComplete || allCompletedFromHistory || allCompletedFromSampleProcess;

                          if (allCompleted) {
                            return <span className="text-app-text font-medium text-green-700">Completed</span>;
                          }

                          if (srd.inProduction && srd.currentProductionStage) {
                            const stage = productionStages.find(s => String(s._id) === String(srd.currentProductionStage));
                            const historyEntry = (srd.productionHistory || []).find(h => String(h.stage) === String(srd.currentProductionStage));
                            return (
                              <div className="flex flex-col">
                                <span className="text-app-text text-gray-700 font-medium">
                                  {stage?.displayName || stage?.name || '—'}
                                </span>
                                {historyEntry?.startDate && (
                                  <span className="text-[11px] text-blue-500">
                                    {new Date(historyEntry.startDate).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            );
                          }

                          return <span className="text-app-text text-gray-400">Pending</span>;
                        })()}
                        <button
                          onClick={() => toggleRow(srd._id)}
                          className="p-1 rounded hover:bg-gray-200 transition-colors shrink-0"
                          title={isExpanded ? 'Collapse production stages' : 'Expand production stages'}
                        >
                          {isExpanded
                            ? <ChevronUp className="h-3.5 w-3.5 text-gray-500" />
                            : <ChevronDown className="h-3.5 w-3.5 text-gray-500" />}
                        </button>
                      </div>
                    </td>
                    <td className="justify-center align-middle px-6 py-2 whitespace-nowrap text-app-text font-medium border-b border-black/10">
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
                          onClick={() => handleRedo(srd._id)}
                          disabled={session?.user?.role !== 'vmd' ? true : srd?.BuyerRejectedReasons.length < 1 && srd?.internalRejectedReasons.length < 1 && !(srd?.BuyerApproved && srd?.BuyerComments)}
                          title="Redo SRD"
                          className="border-gray-300 hover:border-green-500 hover:text-green-600 transition-colors duration-200"
                        >
                          <Repeat className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDuplicate(srd._id)}
                          disabled={session?.user?.role !== 'vmd' ? true : false}
                          title="Duplicate SRD"
                          className="border-gray-300 hover:border-blue-500 hover:text-blue-600 transition-colors duration-200"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded production stage timeline */}
                  {isExpanded && (
                    <tr className="bg-gray-50">
                      <td colSpan={9} className="px-6 py-3 border-b border-black/10">
                        {productionStages.length === 0 ? (
                          <p className="text-app-text text-gray-400 italic">No production stages configured.</p>
                        ) : (
                          <>
                            {/* Production Stage Badges */}

                            {/* Timeline */}
                            <div className="flex items-start justify-end gap-0 mr-20">
                              {(() => {
                                const srdStageIds = new Set((srd.productionStages || []).map(id => String(id)));
                                return srdStageIds.size > 0
                                  ? [...productionStages].filter(s => srdStageIds.has(String(s._id))).sort((a, b) => a.order - b.order)
                                  : [...productionStages].sort((a, b) => a.order - b.order);
                              })().map((stage, idx, arr) => {
                                const historyEntry = (srd.productionHistory || []).find(
                                  h => String(h.stage) === String(stage._id)
                                );
                                // Also check sampleProcess (slug/name-based matching)
                                const stageName = (stage.name || '').toLowerCase();
                                const stageSlug = (stage.slug || stageName).toLowerCase();
                                const sampleEntry = (srd.sampleProcess || []).find(
                                  s => {
                                    const sStage = (s.stage || '').toLowerCase();
                                    return sStage === stageName || sStage === stageSlug;
                                  }
                                );

                                const isCompleted = historyEntry?.status === 'completed' || sampleEntry?.status === 'completed';
                                const isCurrent = !isCompleted && (
                                  (srd.inProduction && String(srd.currentProductionStage) === String(stage._id)) ||
                                  sampleEntry?.status === 'in-progress' || sampleEntry?.status === 'received'
                                );
                                const isLast = idx === arr.length - 1;

                                return (
                                  <div key={stage._id} className="flex items-center">
                                    <div className="flex flex-col items-center min-w-[80px]">
                                      {/* Dot */}
                                      <div className={`w-3 h-3 rounded-full border-2 border-white shadow ${isCompleted ? 'bg-green-500' :
                                          isCurrent ? 'bg-blue-500 ring-2 ring-blue-300 animate-pulse' :
                                            'bg-gray-300'
                                        }`} />
                                      {/* Stage name */}
                                      <div className="text-[10px] font-semibold text-gray-700 mt-1 text-center leading-tight">
                                        {stage.displayName || stage.name}
                                      </div>
                                      {/* Date / indicator */}
                                      {isCompleted ? (
                                        <div className="text-[9px] text-green-600 text-center mt-0.5">
                                          {new Date(historyEntry?.endDate || sampleEntry?.completedDate || sampleEntry?.handoverDate || historyEntry?.startDate || sampleEntry?.receivedDate).toLocaleDateString()}
                                        </div>
                                      ) : isCurrent ? (
                                        <div className="flex flex-col items-center gap-0.5 mt-0.5">
                                          <span className="text-[9px] text-blue-500 text-center">
                                            {historyEntry?.startDate || sampleEntry?.receivedDate
                                              ? new Date(historyEntry?.startDate || sampleEntry?.receivedDate).toLocaleDateString()
                                              : '—'}
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
                          </>
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

      {srds.length === 0 && !loading && (
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
                  <span key={`ellipsis-${idx}`} className="px-2 text-gray-400 text-app-text">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-7 h-7 rounded text-app-text font-medium transition-colors ${currentPage === p
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

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-60 text-white px-4 py-2 rounded-full text-app-text">
                  {currentImageIndex + 1} / {selectedImages.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}
