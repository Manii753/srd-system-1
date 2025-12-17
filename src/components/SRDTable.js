import { useState } from 'react';
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

  const handleDuplicate = async (srdId) => {
    if (!confirm('Are you sure you want to duplicate this SRD?')) return;
    
    try {
      const response = await fetch(`/api/srd/${srdId}/duplicate`, { method: 'POST' });
      const result = await response.json();
      if (result.success) {
        alert('SRD duplicated successfully!');
        router.push(`/srd/${result.data._id}`);
        // Optionally, you might want to trigger a refresh of the SRD list here
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
        // Optionally, you might want to trigger a refresh of the SRD list here
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
    
    // Get images from department's dynamic fields (look for image type fields)
    const deptImageFields = srd.dynamicFields?.filter(f => {
      if (f.department !== department) return false;
      if (!f.value) return false;
      
      // Check if it's an image URL (starts with / or http)
      if (typeof f.value === 'string' && (f.value.startsWith('/') || f.value.startsWith('http'))) {
        return true;
      }
      
      // Check if it's an array of image URLs
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

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Search and Filter */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-4">
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
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('refNo')}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>Ref No</span>
                  {sortField === 'refNo' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('title')}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>Title</span>
                  {sortField === 'title' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Images
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Progress
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('createdAt')}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>Created</span>
                  {sortField === 'createdAt' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSortedSRDs.map((srd) => (
              <tr key={srd._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {srd.refNo}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div>
                    <div className="font-medium">{srd.title}</div>
                    <div className="text-gray-500">{srd.description}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge className={getStatusColor(department === 'admin' ? (srd.readyForProduction ? 'approved' : 'in-progress') : (srd.status ? srd.status[department] : 'pending'))}>
                    {department === 'admin' ? (srd.readyForProduction ? "Ready" : "In Progress") : (srd.status ? srd.status[department] : 'pending')}
                  </Badge>
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
                          <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold shadow">
                            {allImages.length}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">No images</span>
                    );
                  })()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <Progress value={srd.progress} className="w-16 h-2" />
                    <span className="text-sm text-gray-500">{srd.progress}%</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(srd.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-2">
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
            ))}
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