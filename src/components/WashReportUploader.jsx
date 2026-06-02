'use client';

import { useState, useRef } from 'react';
import { Upload, Download, Trash2, Eye, FileSpreadsheet, RefreshCw, X, Plus } from 'lucide-react';
import { useToast } from '@/lib/use-toast';

// ── Excel Viewer Modal ────────────────────────────────────────────────────────
function ExcelViewerModal({ url, name, onClose }) {
  const [viewMode, setViewMode] = useState('google'); // 'google' | 'office'
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const fullUrl = url.startsWith('http') ? url : `${origin}${url}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-2xl flex flex-col"
        style={{ width: '90vw', maxWidth: 1100, height: '88vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b bg-gray-50 rounded-t-lg">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-700" />
            <span className="font-semibold text-gray-800 text-sm truncate max-w-xs" title={name}>{name}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded px-1">
              <button
                onClick={() => setViewMode('google')}
                className={`px-2 py-0.5 text-xs rounded ${viewMode === 'google' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
              >Google Docs</button>
              <button
                onClick={() => setViewMode('office')}
                className={`px-2 py-0.5 text-xs rounded ${viewMode === 'office' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
              >Office Online</button>
            </div>
            <a
              href={url}
              download={name}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-green-700 hover:bg-green-800 rounded"
            >
              <Download className="h-3.5 w-3.5" /> Download
            </a>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 ml-1">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Viewer */}
        <div className="flex-1 overflow-hidden bg-gray-100">
          <iframe
            key={viewMode}
            src={
              viewMode === 'google'
                ? `https://docs.google.com/gview?url=${encodeURIComponent(fullUrl)}&embedded=true`
                : `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fullUrl)}`
            }
            className="w-full h-full border-0"
            title={name}
          />
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function WashReportUploader({ srd, canEdit = true, onSrdUpdate }) {
  const { toast } = useToast();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [report, setReport] = useState(srd?.washAnalysisReport || null);
  const [viewing, setViewing] = useState(false);

  const doUpload = async (file) => {
    if (!file || !srd?._id) return;
    setUploading(true);
    try {
      const fileData = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = ev => res(ev.target.result);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });

      const uploadRes = await fetch('/api/uploads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileData,
          srdId: srd._id,
          fieldId: 'wash-analysis-report',
          fieldType: 'file',
          mimeType: file.type,
          size: file.size,
        }),
      });
      const uploadData = await uploadRes.json();
      if (!uploadData.success) throw new Error(uploadData.error || 'Upload failed');

      const url = uploadData.asset?.url || uploadData.url;
      if (!url) throw new Error('No URL returned from upload');

      const patchRes = await fetch(`/api/srd/${srd._id}/wash-report`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, name: file.name }),
      });
      const patchData = await patchRes.json();
      if (!patchData.success) throw new Error(patchData.error);

      const updated = patchData.data;
      setReport(updated);
      if (onSrdUpdate) onSrdUpdate({ washAnalysisReport: updated });
      toast({ title: 'Wash Analysis Report uploaded', description: file.name });
    } catch (err) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!confirm('Remove Wash Analysis Report?')) return;
    try {
      const res = await fetch(`/api/srd/${srd._id}/wash-report`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setReport(null);
      if (onSrdUpdate) onSrdUpdate({ washAnalysisReport: null });
      toast({ title: 'Report removed' });
    } catch (err) {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
    }
  };

  const hasReport = report?.url;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv,.pdf,.ods"
        className="hidden"
        onChange={e => doUpload(e.target.files?.[0])}
        disabled={!canEdit || !srd?._id}
      />

      {hasReport ? (
        /* Attached state — same green pill style as "Specs EXCEL File attached" */
        <div className="flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5">
          <span className="text-[10px] font-medium text-emerald-700 truncate max-w-[180px]" title={report.name}>
            Wash Analysis Report attached
          </span>

          {/* View */}
          <button
            type="button"
            onClick={() => setViewing(true)}
            className="h-4 w-4 inline-flex items-center justify-center rounded bg-blue-100 hover:bg-blue-200 text-blue-600"
            title="Preview"
          >
            <Eye className="h-3 w-3" />
          </button>

          {/* Download */}
          <a
            href={report.url}
            download={report.name}
            className="h-4 w-4 inline-flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 text-gray-600"
            title="Download"
          >
            <Download className="h-3 w-3" />
          </a>

          {/* Replace */}
          {canEdit && (
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="h-4 w-4 inline-flex items-center justify-center rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-700"
              title="Replace"
            >
              {uploading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            </button>
          )}

          {/* Remove */}
          {canEdit && (
            <button
              type="button"
              onClick={handleDelete}
              className="h-4 w-4 inline-flex items-center justify-center rounded bg-red-100 hover:bg-red-200 text-red-600"
              title="Remove"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ) : (
        /* Empty state — same upload button style */
        canEdit && srd?._id && (
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1 border border-gray-300 bg-white hover:bg-gray-50 px-2 py-0.5 rounded text-xs font-medium text-gray-900 shadow-sm disabled:opacity-40"
          >
            {uploading
              ? <><RefreshCw className="h-3 w-3 animate-spin" /> Uploading...</>
              : <><Upload className="h-3 w-3" /> Wash Analysis Report</>
            }
          </button>
        )
      )}

      {/* Excel viewer modal */}
      {viewing && report?.url && (
        <ExcelViewerModal url={report.url} name={report.name || 'Wash Analysis Report'} onClose={() => setViewing(false)} />
      )}
    </div>
  );
}
