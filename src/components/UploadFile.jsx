'use client';

import { useState, useRef, useCallback } from 'react';
import { FileSpreadsheet, X, Check, Upload } from 'lucide-react';
import { useToast } from '@/lib/use-toast';
import { normalizeAssetEntries } from '@/lib/assetUtils';

export default function UploadFile({ onUploaded, srdId, fieldId, accept = ".xlsx", maxFiles = 1, label = "Attach size chart" }) {
  const { toast } = useToast();
  const [files, setFiles] = useState([]); // { file, name, uploadedAsset, progress }
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const handleFiles = useCallback(async (selected) => {
    if (!srdId || !fieldId) return;
    const list = Array.from(selected || []);
    if (!list.length) return;
    
    // Convert to file objects
    const newFiles = list.map(f => ({ 
      file: f, 
      name: f.name, 
      uploadedAsset: null, 
      progress: 0 
    }));
    
    setFiles((prev) => [...prev, ...newFiles]);
  }, [fieldId, srdId]);

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

      try {
        await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = async (e) => {
            try {
              const fileData = e.target.result;
              
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
                  const uploadedAsset = normalizeAssetEntries(res?.asset || res?.url, { kind: 'file' })[0] || null;

                  if (res && res.success && uploadedAsset) {
                    setFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, uploadedAsset, progress: 100 } : f));
                    uploaded.push(uploadedAsset);
                    resolve(res.url);
                  } else {
                    console.error('Upload failed', res?.error);
                    toast({
                      title: 'Upload failed',
                      description: res?.error || 'Unknown error',
                      variant: 'destructive',
                    });
                    resolve(null);
                  }
                } catch (err) {
                  console.error('Upload response parse error', err);
                  toast({
                    title: 'Upload failed',
                    description: 'Could not parse upload response',
                    variant: 'destructive',
                  });
                  resolve(null);
                }
              };

              xhr.onerror = () => {
                console.error('Upload failed');
                toast({
                  title: 'Upload failed',
                  description: 'Network error while uploading file',
                  variant: 'destructive',
                });
                resolve(null);
              };

              const payload = JSON.stringify({
                fileName: files[i].name,
                fileData,
                srdId,
                fieldId,
                fieldType: 'file',
                mimeType: files[i].file.type,
                size: files[i].file.size,
              });
              xhr.send(payload);
            } catch (err) {
              reject(err);
            }
          };
          reader.readAsDataURL(files[i].file);
        });
      } catch (error) {
        console.error("Error reading file", error);
      }
    }

    setUploading(false);
    if (onUploaded) onUploaded(uploaded.filter(Boolean));

    // Clear successfully uploaded files after a delay or keep them to show status?
    // For now, let's clear the list if all successful, or let the parent handle the value
    setFiles([]); 
  }, [fieldId, files, onUploaded, srdId, toast]);

  const canUpload = Boolean(srdId && fieldId);

  const overallProgress = files.length ? Math.round(files.reduce((acc, f) => acc + (f.progress || 0), 0) / files.length) : 0;

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={maxFiles > 1}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        disabled={!canUpload}
      />

      {!canUpload && (
        <div className="text-app-text text-amber-600 text-xs px-1">
          Create the SRD first
        </div>
      )}

      {canUpload && files.length === 0 && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={onDragOver}
          className="inline-flex items-center gap-1 border border-gray-300 bg-white hover:bg-gray-50 px-1.5 py-0.5 rounded text-[10px] font-medium text-gray-600"
        >
          <Upload className="h-3 w-3" />
          {label}
        </button>
      )}

      {canUpload && files.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          {files.map((f, i) => (
            <div key={i} className="inline-flex items-center gap-1 border border-gray-200 bg-gray-50 px-1.5 py-0.5 rounded text-[10px]">
              <FileSpreadsheet className="h-3 w-3 text-green-600 flex-shrink-0" />
              <span className="truncate max-w-[100px]" title={f.name}>{f.name}</span>
              {f.uploadedAsset ? (
                <Check className="h-3 w-3 text-green-600" />
              ) : (
                <span className="text-gray-500">{f.progress}%</span>
              )}
              <button onClick={(e) => removeFile(e, i)} className="text-gray-400 hover:text-red-500">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {!uploading && files.some(f => !f.uploadedAsset) && (
            <button
              onClick={uploadAll}
              className="inline-flex items-center gap-1 border border-blue-300 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded text-[10px] font-medium text-blue-700"
            >
              Upload
            </button>
          )}
          {uploading && <Progress value={overallProgress} className="h-1 w-16" />}
        </div>
      )}
    </div>
  );
}
