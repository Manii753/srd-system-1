'use client';

import { useState } from 'react';
import Layout from '@/components/layout/Layout';
import {
  AlertCircle, CheckCircle, Wrench, RefreshCw,
  ChevronDown, ChevronUp, Zap, ShieldCheck
} from 'lucide-react';

const ISSUE_COLORS = {
  invalid_role:        'bg-red-50 border-red-200 text-red-700',
  missing_dept:        'bg-orange-50 border-orange-200 text-orange-700',
  wrong_ready_flag:    'bg-yellow-50 border-yellow-200 text-yellow-700',
  premature_ready_flag:'bg-yellow-50 border-yellow-200 text-yellow-700',
  wrong_progress:      'bg-blue-50 border-blue-200 text-blue-700',
  not_in_production:   'bg-purple-50 border-purple-200 text-purple-700',
  missing_stage:       'bg-red-50 border-red-200 text-red-700',
  not_in_dispatch:     'bg-amber-50 border-amber-200 text-amber-700',
  stale_stages:        'bg-gray-50 border-gray-200 text-gray-700',
};

export default function DiagnosePage() {
  const [scanning, setScanning]   = useState(false);
  const [fixing, setFixing]       = useState(false);
  const [fixingId, setFixingId]   = useState(null);
  const [result, setResult]       = useState(null);
  const [expanded, setExpanded]   = useState(new Set());
  const [fixLog, setFixLog]       = useState(null);

  const runScan = async () => {
    setScanning(true);
    setResult(null);
    setFixLog(null);
    try {
      const res = await fetch('/api/srd/bulk-diagnose');
      const data = await res.json();
      if (data.success) setResult(data.data);
    } catch (e) {
      alert('Scan failed: ' + e.message);
    } finally {
      setScanning(false);
    }
  };

  const fixAll = async () => {
    if (!confirm(`Fix all ${result?.withIssues} SRDs with issues?`)) return;
    setFixing(true);
    try {
      const res = await fetch('/api/srd/bulk-diagnose', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setFixLog(data.data.fixed);
        await runScan(); // re-scan after fix
      }
    } catch (e) {
      alert('Fix failed: ' + e.message);
    } finally {
      setFixing(false);
    }
  };

  const fixOne = async (id) => {
    setFixingId(id);
    try {
      const res = await fetch('/api/srd/bulk-diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      });
      const data = await res.json();
      if (data.success) {
        setFixLog(data.data.fixed);
        await runScan();
      }
    } catch (e) {
      alert('Fix failed: ' + e.message);
    } finally {
      setFixingId(null);
    }
  };

  const toggle = (id) => setExpanded(prev => {
    const s = new Set(prev);
    s.has(id) ? s.delete(id) : s.add(id);
    return s;
  });

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Wrench className="h-5 w-5 text-green-700" />
              SR Diagnostic Tool
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Scan all SRDs for status inconsistencies and auto-correct them.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={runScan}
              disabled={scanning || fixing}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40"
            >
              <RefreshCw className={`h-4 w-4 ${scanning ? 'animate-spin' : ''}`} />
              {scanning ? 'Scanning...' : 'Run Scan'}
            </button>
            {result?.withIssues > 0 && (
              <button
                onClick={fixAll}
                disabled={fixing || scanning}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-700 hover:bg-green-800 rounded-md disabled:opacity-40"
              >
                <Zap className={`h-4 w-4 ${fixing ? 'animate-spin' : ''}`} />
                {fixing ? 'Fixing...' : `Fix All (${result.withIssues})`}
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        {result && (
          <div className="grid grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-lg p-4 bg-white">
              <p className="text-xs text-gray-500 uppercase font-semibold">Total SRDs</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{result.total}</p>
            </div>
            <div className={`border rounded-lg p-4 ${result.withIssues > 0 ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
              <p className="text-xs text-gray-500 uppercase font-semibold">With Issues</p>
              <p className={`text-3xl font-bold mt-1 ${result.withIssues > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {result.withIssues}
              </p>
            </div>
            <div className="border border-green-200 rounded-lg p-4 bg-green-50">
              <p className="text-xs text-gray-500 uppercase font-semibold">Healthy</p>
              <p className="text-3xl font-bold text-green-700 mt-1">{result.healthy}</p>
            </div>
          </div>
        )}

        {/* All healthy */}
        {result && result.withIssues === 0 && (
          <div className="border border-green-200 bg-green-50 rounded-lg p-6 flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-900">All SRDs are healthy!</p>
              <p className="text-sm text-green-700 mt-0.5">No issues found across {result.total} SRDs.</p>
            </div>
          </div>
        )}

        {/* Fix log */}
        {fixLog && fixLog.length > 0 && (
          <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
            <p className="font-semibold text-blue-900 mb-2 flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4" /> Fixed {fixLog.length} SRD(s)
            </p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {fixLog.map((f, i) => (
                <div key={i} className="text-sm text-blue-800">
                  <span className="font-mono font-semibold">{f.refNo}</span>
                  {' — '}
                  {f.changes.join('; ')}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Issues list */}
        {result?.results?.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              SRDs with Issues
            </h2>
            {result.results.map(srd => {
              const isOpen = expanded.has(srd._id);
              return (
                <div key={srd._id} className="border border-gray-200 bg-white rounded-lg overflow-hidden">
                  {/* Row header */}
                  <div
                    className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
                    onClick={() => toggle(srd._id)}
                  >
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      <span className="font-mono font-semibold text-blue-700">{srd.refNo}</span>
                      <span className="text-xs text-gray-500">
                        {srd.issues.length} issue{srd.issues.length !== 1 ? 's' : ''}
                      </span>
                      <div className="flex gap-1">
                        {[...new Set(srd.issues.map(i => i.type))].map(t => (
                          <span key={t} className={`text-xs px-1.5 py-0.5 rounded border ${ISSUE_COLORS[t] || 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                            {t.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={e => { e.stopPropagation(); fixOne(srd._id); }}
                        disabled={fixingId === srd._id || fixing}
                        className="px-3 py-1 text-xs font-medium text-white bg-green-700 hover:bg-green-800 rounded disabled:opacity-40"
                      >
                        {fixingId === srd._id ? 'Fixing...' : 'Fix'}
                      </button>
                      {isOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isOpen && (
                    <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 space-y-2">
                      <div className="grid grid-cols-5 gap-3 text-xs text-gray-600 mb-3">
                        <span>Progress: <strong>{srd.progress}%</strong></span>
                        <span>Ready: <strong>{srd.readyForProduction ? 'Yes' : 'No'}</strong></span>
                        <span>In Production: <strong>{srd.inProduction ? 'Yes' : 'No'}</strong></span>
                        <span>In Dispatch: <strong>{srd.inDispatch ? 'Yes' : 'No'}</strong></span>
                        <span>Complete: <strong>{srd.isComplete ? 'Yes' : 'No'}</strong></span>
                      </div>
                      {srd.issues.map((issue, i) => (
                        <div key={i} className={`flex items-start gap-2 px-3 py-2 rounded border text-sm ${ISSUE_COLORS[issue.type] || 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium capitalize">{issue.type.replace(/_/g, ' ')}</span>
                            {' — '}
                            {issue.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!result && !scanning && (
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-12 text-center">
            <Wrench className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="font-medium text-gray-600">Click "Run Scan" to check all SRDs</p>
            <p className="text-sm text-gray-400 mt-1">
              The tool will detect and auto-fix status inconsistencies, wrong flags, and missing production assignments.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
