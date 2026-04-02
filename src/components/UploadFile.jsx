'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FileSpreadsheet, X, Check, Upload } from 'lucide-react';
import { useToast } from '@/lib/use-toast';
import { normalizeAssetEntries } from '@/lib/assetUtils';

export default function UploadFile({ onUploaded, srdId, fieldId, accept = ".xlsx", maxFiles = 1 }) {
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
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => canUpload && inputRef.current && inputRef.current.click()}
      >
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
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-app-text text-amber-900">
            Create the SRD first, then upload files from the SRD editor.
          </div>
        )}

        {canUpload && files.length === 0 && (
          <div className="flex flex-col items-center justify-center py-2">
            <Upload className="h-6 w-6 text-gray-400 mb-2" />
            <p className="text-app-text text-gray-600">Click to upload Excel file</p>
          </div>
        )}

        {canUpload && files.length > 0 && (
          <div className="space-y-2">
            {files.map((f, i) => (
              <div key={i} className="flex items-center justify-between bg-white p-2 rounded border border-gray-200 text-app-text">
                <div className="flex items-center space-x-2 overflow-hidden">
                  <FileSpreadsheet className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="truncate max-w-[150px]" title={f.name}>{f.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {f.uploadedAsset ? (
                     <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <span className="text-gray-500">{f.progress}%</span>
                  )}
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-6 w-6" 
                    onClick={(e) => removeFile(e, i)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}

            {!uploading && files.some(f => !f.uploadedAsset) && (
              <Button size="sm" onClick={uploadAll} className="w-full h-7 text-app-text mt-2">
                Upload Files
              </Button>
            )}
            
            {uploading && (
               <Progress value={overallProgress} className="h-1 mt-2" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
