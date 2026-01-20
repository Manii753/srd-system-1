import { useState, useEffect, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronUp, ChevronDown, Search, Filter, X, ChevronLeft, ChevronRight, Star, Copy, Repeat } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';


export default function SRDTable({ srds, department }) {
  const router = useRouter();
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedImages, setSelectedImages] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [productionStages, setProductionStages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [quickDetailsFields, setQuickDetailsFields] = useState([]);

  const toggleRowExpansion = (srdId) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(srdId)) {
        newSet.delete(srdId);
      } else {
        newSet.add(srdId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const stagesRes = await fetch('/api/production-stages');
      const stagesData = await stagesRes.json();

      if (stagesData.success) setProductionStages(stagesData.data.filter(s => s.isActive));

      // Fetch fields with isShownInQuickDetails: true
      const fieldsRes = await fetch('/api/newField');
      const fieldsData = await fieldsRes.json();
      if (Array.isArray(fieldsData)) {
        setQuickDetailsFields(fieldsData.filter(f => f.isShownInQuickDetails && f.active));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
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

    // Handle array values (like multi-select or file uploads)
    if (Array.isArray(field.value)) {
      return field.value.join(', ') || 'N/A';
    }

    return field.value;
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
        } else if (Array.isArray(displayValue)) {
          displayValue = displayValue.length > 0 ? displayValue.join(', ') : 'N/A';
        } else if (dynamicField.type === 'date' && displayValue !== 'N/A') {
          try {
            const dateValue = new Date(displayValue);
            if (!isNaN(dateValue.getTime())) {
              displayValue = dateValue.toLocaleDateString();
            }
          } catch (e) {
            // Keep original value if date parsing fails
          }
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
      const matchesSearch = (srd.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (srd.refNo || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || (srd.status && srd.status[department] === filterStatus);
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

  // Helper function to get all images for an SRD
  const getAllImages = (srd) => {
    const globalImages = Array.isArray(srd.images) ? srd.images : (srd.images ? [srd.images] : []);

    const deptImageFields = srd.dynamicFields?.filter(f => {
      if (f.department !== department) return false;
      if (!f.value) return false;

      if (typeof f.value === 'string' && (f.value.startsWith('/') || f.value.startsWith('http'))) {
        return true;
      }

      if (Array.isArray(f.value) && f.value.length > 0) {
        return f.value.some(v => typeof v === 'string' && (v.startsWith('/') || v.startsWith('http')));
      }

      return false;
    }) || [];

    const deptImages = deptImageFields.flatMap(field =>
      Array.isArray(field.value) ? field.value : [field.value]
    );

    const allImages = Array.from(new Set([...globalImages, ...deptImages])).filter(Boolean);

    return allImages;
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


  console.log("srd", srds)

  return (
    <div className="flex flex-col w-full bg-white rounded-lg shadow">
      {/* Search and Filter */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search SRDs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="approved">Approved</option>
              <option value="flagged">Flagged</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="w-full">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-3 w-12"></th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('createdAt')}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>Date</span>
                  {sortField === 'createdAt' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Picture</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inquiry #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Style</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSortedSRDs.map((srd) => {
              const currentStage = getCurrentProductionStage(srd);
              const isExpanded = expandedRows.has(srd._id);

              return (
                <Fragment key={srd._id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-2 py-4">
                      <Button size="sm" variant="ghost" onClick={() => toggleRowExpansion(srd._id)} className="w-10">
                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </Button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {new Date(srd.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(() => {
                        const allImages = getAllImages(srd);
                        return allImages.length > 0 ? (
                          <div
                            className="cursor-pointer hover:opacity-80 transition-opacity relative group"
                            onClick={() => openImageSlider(allImages)}
                          >
                            <Image
                              src={allImages[0]}
                              width={60}
                              height={60}
                              alt="SRD cover"
                              className="rounded object-cover border-2 border-yellow-400"
                            />
                            <div className="absolute top-0 left-0 bg-yellow-400 text-yellow-900 px-1 py-0.5 rounded-tl rounded-br text-xs font-semibold flex items-center gap-0.5">
                              <Star className="h-2.5 w-2.5 fill-current" />
                            </div>
                            {allImages.length > 1 && (
                              <span className="absolute -top-1 -left-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold shadow">
                                {allImages.length}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">No images</span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {srd.refNo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getDynamicFieldValue(srd, 'style')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {srd.inProduction && currentStage ? (
                        <div className="flex items-center">
                          <div
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: currentStage.color }}
                          />
                          <span className="font-medium capitalize text-sm">
                            {currentStage.displayName || currentStage.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs flex gap-4">

                          <div className="p-1 px-2 bg-gray-400 rounded-lg w-fit font-bold text-white text-center">
                            <div>vmd</div>
                            <div>{srd.status.vmd}</div>
                          </div>
                          <div className="p-1 px-2 bg-gray-400 rounded-lg w-fit font-bold text-white text-center">
                            <div>cad</div>
                            <div>{srd.status.cad}</div>
                          </div>
                          <div className="p-1 px-2 bg-gray-400 rounded-lg w-fit font-bold text-white text-center">
                            <div>mmc</div>
                            <div>{srd.status.mmc}</div>
                          </div>
                          <div className="p-1 px-2 bg-gray-400 rounded-lg w-fit font-bold text-white text-center">
                            <div>commercial</div>
                            <div>{srd.status.commercial}</div>
                          </div>
                        </span>
                      )}
                    </td>
                    <td className="justify-center align-middle px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-2">

                      <Link href={`/srd/${srd._id}`}>
                        <Button size="sm" variant="outline">
                          View
                        </Button>
                      </Link>
                      <Button size="icon" variant="outline" onClick={() => handleDuplicate(srd._id)} title="Duplicate SRD">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="outline" onClick={() => handleRedo(srd._id)} title="Redo SRD">
                        <Repeat className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan="7" className="p-0">
                        <div className="p-4 bg-gray-100">
                          <h4 className="text-md font-semibold mb-3 text-gray-800">Additional Details</h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4 text-sm">
                            {(() => {
                              const quickDetails = getQuickDetailsFields(srd);
                              return quickDetails.length > 0 ? (
                                quickDetails.map((field, index) => (
                                  <div key={index} className="flex flex-col">
                                    <span className="font-medium text-gray-500">{field.name}</span>
                                    <span className="text-gray-900 whitespace-pre-wrap">{field.value}</span>
                                  </div>
                                ))
                              ) : (
                                <div className="col-span-full text-gray-500 text-sm">
                                  No quick details fields configured. Enable "Show in Quick Details" for fields in the Fields Management page.
                                </div>
                              );
                            })()}
                          </div>
                        </div>
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