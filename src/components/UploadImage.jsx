'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/lib/use-toast';
import { normalizeAssetEntries } from '@/lib/assetUtils';

export default function UploadImage({ onUploaded, srdId, fieldId, compact = false, maxImages = 999 }) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const handleFiles = useCallback(async (selected) => {
    if (!srdId || !fieldId) return;
    const list = Array.from(selected || []);
    if (!list.length) return;
    
    // Check if adding these files would exceed maxImages
    if (list.length > maxImages) {
      toast({
        title: 'Too many images',
        description: `You can only upload up to ${maxImages} image(s) at a time.`,
        variant: 'destructive',
      });
      const limitedList = list.slice(0, maxImages);
      uploadFilesDirectly(limitedList);
      return;
    }
    
    // Upload immediately without preview
    uploadFilesDirectly(list);
  }, [fieldId, srdId, maxImages, toast]);

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Direct upload without preview - much faster
  const uploadFilesDirectly = useCallback(async (fileList) => {
    if (!srdId || !fieldId || !fileList.length) return;
    
    setUploading(true);
    const uploaded = [];

    // Upload all files in parallel for speed
    const uploadPromises = Array.from(fileList).map(async (file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const fileData = e.target.result;
          
          try {
            const response = await fetch('/api/uploads', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fileName: file.name,
                fileData,
                srdId,
                fieldId,
                fieldType: 'image',
                mimeType: file.type,
                size: file.size,
              }),
            });

            const res = await response.json();
            const uploadedAsset = normalizeAssetEntries(res?.asset || res?.url, { kind: 'image' })[0] || null;

            if (res && res.success && uploadedAsset) {
              uploaded.push(uploadedAsset);
            } else {
              console.error('Upload failed', res?.error);
              toast({
                title: 'Upload failed',
                description: res?.error || 'Unknown error',
                variant: 'destructive',
              });
            }
          } catch (err) {
            console.error('Upload error', err);
            toast({
              title: 'Upload failed',
              description: 'Network error while uploading image',
              variant: 'destructive',
            });
          }
          resolve();
        };
        reader.onerror = () => {
          toast({
            title: 'Upload failed',
            description: 'Could not read file',
            variant: 'destructive',
          });
          resolve();
        };
        reader.readAsDataURL(file);
      });
    });

    await Promise.all(uploadPromises);
    
    setUploading(false);
    if (onUploaded && uploaded.length > 0) {
      onUploaded(uploaded);
    }
  }, [srdId, fieldId, onUploaded, toast]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length) {
      handleFiles(dt.files);
    }
  }, [handleFiles]);

  // Handle paste (Ctrl+V) for images (screenshots)
  const handlePaste = useCallback(async (e) => {
    if (!e.clipboardData) return;
    const items = Array.from(e.clipboardData.items || []);
    const imageItems = items.filter(i => i.type.startsWith('image'));
    if (!imageItems.length) return;

    const filesToHandle = [];
    for (const it of imageItems) {
      const file = it.getAsFile();
      if (file) filesToHandle.push(file);
    }
    if (filesToHandle.length) {
      await handleFiles(filesToHandle);
    }
  }, [handleFiles]);

  // register global paste handler so Ctrl+V works anywhere on page
  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const canUpload = Boolean(srdId && fieldId);

  return (
    <div className={`${fieldId ==='dispatchBack' || fieldId ==='dispatchFront'?'h-6 p-0': compact ? 'w-full' : 'h-full flex flex-col p-4'}`}>
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        className={`text-center cursor-pointer ${compact ? '' : 'flex-1 flex flex-col'}`}
        onClick={() => canUpload && !uploading && inputRef.current && inputRef.current.click()}
        onPaste={handlePaste}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={!canUpload || uploading}
        />

        {!canUpload && !compact && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-app-text text-amber-900">
            Create the SRD first, then upload images from the SRD editor.
          </div>
        )}

        {compact && canUpload && (
          <Button 
            type="button" 
            variant="outline" 
            className="w-full border-dashed border-2 border-blue-400 text-blue-600 hover:bg-blue-50"
            onClick={(e) => { 
              e.stopPropagation(); 
              inputRef.current && inputRef.current.click(); 
            }}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : '+ Add Another Image'}
          </Button>
        )}

        {!compact && canUpload && !uploading && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <p className="text-gray-600 text-app-text">Drag & drop images here, or click to select files</p>
            <div className="mt-3">
              {fieldId !=='dispatchBack' && fieldId !=='dispatchFront' &&
              <Button type="button" variant="outline" onClick={(e) => { e.stopPropagation(); inputRef.current && inputRef.current.click(); }}>
                Choose Images
              </Button>}
            </div>
          </div>
        )}

        {!compact && canUpload && uploading && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-3"></div>
            <p className="text-gray-600 text-app-text">Uploading images...</p>
          </div>
        )}
      </div>
    </div>
  );
}
