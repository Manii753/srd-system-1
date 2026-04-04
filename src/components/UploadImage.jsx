'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import Image from 'next/image';
import { useToast } from '@/lib/use-toast';
import { normalizeAssetEntries } from '@/lib/assetUtils';

export default function UploadImage({ onUploaded, srdId, fieldId }) {
  const { toast } = useToast();
  const [files, setFiles] = useState([]); // { file, preview, uploadedAsset, progress }
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const makePreview = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  const handleFiles = useCallback(async (selected) => {
    if (!srdId || !fieldId) return;
    const list = Array.from(selected || []);
    if (!list.length) return;
    const newFiles = await Promise.all(list.map(async (f) => ({ file: f, preview: await makePreview(f), uploadedAsset: null, progress: 0 })));
    setFiles((prev) => [...prev, ...newFiles]);
  }, [fieldId, makePreview, srdId]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length) {
      handleFiles(dt.files);
    }
  }, [handleFiles]);

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const removeFile = useCallback((e, index) => {
    e.stopPropagation();
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

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

  const uploadAll = useCallback(async (e) => {
    e.stopPropagation();
    if (!files.length || !srdId || !fieldId) return;
    setUploading(true);
    const uploaded = [];

    for (let i = 0; i < files.length; i++) {
      if (files[i].uploadedAsset) {
        uploaded.push(files[i].uploadedAsset);
        continue;
      }

      await new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/uploads');
        xhr.setRequestHeader('Content-Type', 'application/json');

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const p = Math.round((event.loaded / event.total) * 100);
            setFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, progress: p } : f));
          }
        };

        xhr.onload = () => {
          try {
            const res = JSON.parse(xhr.responseText);
            const uploadedAsset = normalizeAssetEntries(res?.asset || res?.url, { kind: 'image' })[0] || null;

            if (res && res.success && uploadedAsset) {
              setFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, uploadedAsset, progress: 100 } : f));
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
            console.error('Upload response parse error', err);
            toast({
              title: 'Upload failed',
              description: 'Could not parse upload response',
              variant: 'destructive',
            });
          }
          resolve(null);
        };

        xhr.onerror = () => {
          console.error('Upload failed');
          toast({
            title: 'Upload failed',
            description: 'Network error while uploading image',
            variant: 'destructive',
          });
          resolve(null);
        };

        const payload = JSON.stringify({
          fileName: files[i].file.name,
          fileData: files[i].preview,
          srdId,
          fieldId,
          fieldType: 'image',
          mimeType: files[i].file.type,
          size: files[i].file.size,
        });
        setTimeout(() => xhr.send(payload), 50);
      });
    }

    setUploading(false);
    if (onUploaded) onUploaded(uploaded.filter(Boolean));
  }, [fieldId, files, onUploaded, srdId, toast]);

  const canUpload = Boolean(srdId && fieldId);

  const overallProgress = files.length ? Math.round(files.reduce((acc, f) => acc + (f.progress || 0), 0) / files.length) : 0;

  return (
    <div className='h-full flex flex-col p-4 '>
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        className="text-center cursor-pointer flex-1 flex flex-col"
        onClick={() => canUpload && inputRef.current && inputRef.current.click()}
        onPaste={handlePaste}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={!canUpload}
        />

        {!canUpload && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-app-text text-amber-900">
            Create the SRD first, then upload images from the SRD editor.
          </div>
        )}

        {canUpload && files.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <p className="text-gray-600 text-app-text">Drag & drop images here, or click to select files</p>
            <div className="mt-3">
              <Button type="button" variant="outline" onClick={(e) => { e.stopPropagation(); inputRef.current && inputRef.current.click(); }}>
                Choose Images
              </Button>
            </div>
          </div>
        )}

        {canUpload && files.length > 0 && (
          <div className="flex-1 flex flex-col gap-3 min-h-0">
            <div className="flex-1 grid grid-cols-3 md:grid-cols-6 gap-3 overflow-y-auto custom-scrollbar content-start">
              {files.map((f, i) => (
                <div key={i} className="relative group h-24">
                  <Image src={f.preview} alt={`preview-${i}`} width={96} height={96} className="w-full h-full object-cover rounded" />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center space-x-2">
                    <Button size="sm" onClick={(e) => removeFile(e, i)}>Remove</Button>
                  </div>
                  {f.uploadedAsset && <div className="absolute right-1 top-1 text-app-text text-green-700 bg-white/70 px-1 rounded">Done</div>}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <div className="w-2/3">
                <Progress value={overallProgress} className="h-2" />
                <div className="text-app-text text-gray-600 mt-1">{overallProgress}%</div>
              </div>
              <div className="flex items-center space-x-2">
                <Button type="button" onClick={uploadAll} disabled={uploading}>{uploading ? 'Uploading...' : 'Upload All'}</Button>
                <Button type="button" variant="ghost" onClick={(e) => { e.stopPropagation(); setFiles([]); if (onUploaded) onUploaded([]); }}>Clear</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
