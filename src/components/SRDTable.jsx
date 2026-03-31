import { useState, useEffect, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown, X, ChevronLeft, ChevronRight, Copy, Repeat, Eye } from 'lucide-react';
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

  // Helper function to get status-based colors for department badges
  const getDepartmentStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'text-green-400';
      case 'flagged':
        return 'text-red-400';
      case 'pending':
        return 'text-orange-400';
      case 'in-progress':
        return 'text-blue-400';
      default:
        return 'text-gray-400';
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
      const matchesStatus = effectiveFilter === 'all' || (srd.status && srd.status[department] === effectiveFilter);
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

  // Helper function to get current production stage
  const getCurrentProductionStage = (srd) => {
    if (!srd.inProduction || !srd.currentProductionStage) {
      return null;
    }
    return productionStages.find(stage => String(stage._id) === String(srd.currentProductionStage));
  };




  return (
    <div className="flex flex-col w-full bg-white rounded-xl shadow-lg border border-gray-100">
      {/* Table */}
      <div className="w-full">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
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
          <tbody className="bg-white divide-y divide-gray-100">
            {paginatedSRDs.map((srd) => {
              const currentStage = getCurrentProductionStage(srd);

              return (
                <Fragment key={srd._id}>
                  <tr className="hover:bg-blue-50 transition-colors duration-200 group">
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {new Date(srd.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(srd.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    {/* <td className="px-6 py-5 whitespace-nowrap">
                      {(() => {
                        const allImages = getAllImages(srd);
                        return allImages.length > 0 ? (
                          <div
                            className="cursor-pointer hover:scale-105 transition-transform duration-200 relative group"
                            onClick={() => openImageSlider(allImages)}
                          >
                            <div className="relative">
                              <Image
                                src={allImages[0]}
                                width={70}
                                height={70}
                                alt="SRD cover"
                                className="rounded-xl object-cover border-2 border-yellow-400 shadow-md"
                              />
                              <div className="absolute top-0 left-0 bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 px-2 py-1 rounded-tl-xl rounded-br-xl text-xs font-bold flex items-center gap-1 shadow-sm">
                                <Star className="h-3 w-3 fill-current" />
                                <span>Cover</span>
                              </div>
                              {allImages.length > 1 && (
                                <span className="absolute -top-2 -right-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold shadow-lg border-2 border-white">
                                  {allImages.length}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="w-16 h-16 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center">
                            <span className="text-gray-400 text-xs font-medium">No Image</span>
                          </div>
                        );
                      })()}
                    </td> */}
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold">
                          {srd.refNo}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {getDynamicFieldValue(srd, 'style')}
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">

                      {srd.isComplete ? (
                        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm" />
                          <span className="text-green-700 font-semibold text-sm">Sample Completed</span>
                        </div>
                      ) : srd.inProduction && currentStage ? (
                        <div className="flex items-center bg-white rounded-lg px-3 py-2 border border-gray-200 shadow-sm">
                          <div
                            className="w-3 h-3 rounded-full mr-3 shadow-sm"
                            style={{ backgroundColor: currentStage.color }}
                          />
                          <span className="font-semibold capitalize text-sm text-gray-800">
                            {currentStage.displayName || currentStage.name}
                          </span>
                        </div>
                      ) : (
                        <div className="flex gap-1 flex-wrap">
                          <div className={`px-2 py-1.5 ${getDepartmentStatusColor(srd.status.vmd)} rounded-lg text-xs font-medium shadow-sm hover:shadow-md transition-shadow`}>
                            <div className="text-center">
                              <div className="uppercase font-bold text-xs">VMD</div>
                            </div>
                          </div>
                          <div className={`px-2 py-1.5 ${getDepartmentStatusColor(srd.status.cad)} rounded-lg text-xs font-medium shadow-sm hover:shadow-md transition-shadow`}>
                            <div className="text-center">
                              <div className="uppercase font-bold text-xs">CAD</div>
                            </div>
                          </div>
                          <div className={`px-2 py-1.5 ${getDepartmentStatusColor(srd.status.mmc)} rounded-lg text-xs font-medium shadow-sm hover:shadow-md transition-shadow`}>
                            <div className="text-center">
                              <div className="uppercase font-bold text-xs">MMC</div>
                            </div>
                          </div>
                          <div className={`px-2 py-1.5 ${getDepartmentStatusColor(srd.status.commercial)} rounded-lg text-xs font-medium shadow-sm hover:shadow-md transition-shadow`}>
                            <div className="text-center">
                              <div className="uppercase font-bold text-xs">COM</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="justify-center align-middle px-6 py-5 whitespace-nowrap text-sm font-medium">
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
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50 rounded-b-xl">
          <span className="text-xs text-gray-500">
            Showing {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, filteredAndSortedSRDs.length)} of {filteredAndSortedSRDs.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
                    className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                      currentPage === p
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
