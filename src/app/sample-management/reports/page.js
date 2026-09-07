'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/lib/use-toast';
import Layout from '@/components/layout/Layout';
import {
  Loader2, Download, Filter, ChevronDown,
  Search, X, Plus, Trash2, Edit2, Printer,
} from 'lucide-react';

// ── helpers ───────────────────────────────────────────────────────────────────
function getDyn(srd, ...names) {
  // Normalize: lowercase, strip punctuation and extra spaces
  const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normNames = names.map(norm);
  for (const f of (srd.dynamicFields || [])) {
    if (f?.value != null && f.value !== '') {
      const fn = norm(f.name || '');
      if (normNames.includes(fn)) return String(f.value);
    }
  }
  return '';
}

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
}

function getDeptVal(srd, dept) {
  return Array.isArray(srd.status)
    ? (srd.status.find(s => s.department === dept)?.value || 'pending')
    : 'pending';
}

function getOverallStatus(srd) {
  // If the SRD is fully complete, show Completed
  const sp = srd.sampleProcess || [];
  const allSamplesCompleted =
    sp.length > 0 && sp.every(s => s.status === 'completed' || s.completedDate);
  if (srd.isComplete || allSamplesCompleted) return 'Completed';
  // If in production, show current production stage
  if (srd.inProduction && srd.currentProductionStage) {
    return 'In Production';
  }
  if (srd.inProduction && !srd.currentProductionStage) {
    return 'Completed';
  }
  // Otherwise show department approval status
  const vals = ['vmd', 'cad', 'mmc', 'commercial'].map(d => getDeptVal(srd, d));
  if (vals.every(v => v === 'approved')) return 'Ready for Production';
  if (vals.some(v => v === 'flagged')) return 'Flagged';
  if (vals.some(v => v === 'approved' || v === 'in-progress')) return 'In Progress';
  return 'Not Started';
}

// Base status buckets shown in the All Status filter. Active production
// stages are appended dynamically (see statusOptions in the component).
const BASE_STATUS_OPTIONS = [
  { value: 'not-started', label: 'Not Started' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'flagged', label: 'Flagged' },
  { value: 'ready-for-production', label: 'Ready for Production' },
  { value: 'in-production', label: 'In Production' },
];

function slugify(text) {
  return (text || '').toLowerCase().replace(/\s+/g, '-');
}

// Resolve the label shown in the Current Status column. For records in
// production this shows the actual current stage (e.g. "Sewing") instead of
// the generic "In Production" bucket.
function getCurrentStatusLabel(srd, prodStages) {
  const os = getOverallStatus(srd);
  if (os !== 'In Production') return os;

  const sp = srd.sampleProcess || [];
  const active = sp.find(s => s.status === 'in-progress' || s.status === 'received');
  if (active) return active.stageDisplayName || active.stage || 'In Production';

  const curId = srd.currentProductionStage
    ? String(srd.currentProductionStage._id || srd.currentProductionStage)
    : null;
  if (curId) {
    const st = prodStages.find(s => String(s._id) === curId);
    if (st) return st.displayName || st.name;
  }

  const hist = (srd.productionHistory || []).slice().reverse().find(h => h.status === 'in-progress');
  if (hist) return hist.stageDisplayName || hist.stageName || 'In Production';

  return 'In Production';
}

function getDelayDays(srd) {
  const created = srd.createdAt ? new Date(srd.createdAt) : null;
  if (!created) return 0;
  return Math.floor((Date.now() - created) / 86400000);
}

// Stage columns shown in the expanded sub-row
const STAGE_COLS = [
  { key: 'labeling',  label: 'Labeling' },
  { key: 'print',     label: 'Print' },
  { key: 'emb',       label: 'Emb' },
  { key: 'cad',       label: 'Cad' },
  { key: 'sewing',    label: 'Sewing' },
  { key: 'washing',   label: 'Washing' },
  { key: 'finishing', label: 'Finishing' },
];

function getStageStatus(srd, stageKey) {
  const sp = srd.sampleProcess || [];
  const s = sp.find(x => x.stage?.toLowerCase() === stageKey.toLowerCase());
  if (!s) return null;
  if (s.completedDate) return { text: fmtDate(s.completedDate), cls: 'bg-green-600 text-white', done: true };
  if (s.receivedDate)  return { text: 'In Process', cls: 'bg-yellow-500 text-white', done: false };
  return { text: 'ok', cls: 'bg-green-100 text-green-800', done: false };
}

// ── Group Manager Modal ───────────────────────────────────────────────────────
function GroupManagerModal({ open, onClose, groups, allBrands, allUsers, onSave, onDelete }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', brands: [], assignedUsers: [], color: '#2d6a2d' });

  if (!open) return null;

  const startNew = () => {
    setForm({ name: '', brands: [], assignedUsers: [], color: '#2d6a2d' });
    setEditing('new');
  };
  const startEdit = (g) => {
    setForm({
      name: g.name,
      brands: g.brands || [],
      assignedUsers: (g.assignedUsers || []).map(u => u._id || u),
      color: g.color || '#2d6a2d',
    });
    setEditing(g._id);
  };

  const toggleBrand = (b) => setForm(f => ({
    ...f,
    brands: f.brands.includes(b) ? f.brands.filter(x => x !== b) : [...f.brands, b],
  }));
  const toggleUser = (id) => setForm(f => ({
    ...f,
    assignedUsers: f.assignedUsers.includes(id) ? f.assignedUsers.filter(x => x !== id) : [...f.assignedUsers, id],
  }));

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-bold text-gray-900">Manage Report Groups</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-gray-500" /></button>
        </div>

        {editing ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase">Group Name *</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="mt-1 w-full h-9 px-3 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-600 text-sm"
                placeholder="e.g. BHW-MR Group"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase">Color</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={form.color}
                  onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                  className="h-9 w-16 border border-gray-300 rounded cursor-pointer"
                />
                <span className="text-sm text-gray-500">{form.color}</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase">Brands ({form.brands.length} selected)</label>
              <div className="mt-1 flex flex-wrap gap-1.5 max-h-40 overflow-y-auto border border-gray-200 rounded p-2">
                {allBrands.length === 0 && <span className="text-xs text-gray-400">No brands found in SRDs</span>}
                {allBrands.map(b => (
                  <button
                    key={b}
                    onClick={() => toggleBrand(b)}
                    className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${form.brands.includes(b) ? 'bg-green-700 text-white border-green-700' : 'border-gray-300 text-gray-600 hover:border-green-600'}`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase">Assigned Users ({form.assignedUsers.length} selected)</label>
              <div className="mt-1 space-y-1 max-h-40 overflow-y-auto border border-gray-200 rounded p-2">
                {allUsers.map(u => (
                  <label key={u._id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
                    <input
                      type="checkbox"
                      checked={form.assignedUsers.includes(u._id)}
                      onChange={() => toggleUser(u._id)}
                      className="accent-green-700"
                    />
                    <span className="text-sm text-gray-700">{u.name}</span>
                    <span className="text-xs text-gray-400">{u.role}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => { onSave(editing, form); setEditing(null); }}
                disabled={!form.name.trim()}
                className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-md text-sm font-medium disabled:opacity-40"
              >
                Save Group
              </button>
              <button
                onClick={() => setEditing(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4">
            <button
              onClick={startNew}
              className="mb-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-700 hover:bg-green-800 text-white rounded-md text-sm font-medium"
            >
              <Plus className="h-4 w-4" /> New Group
            </button>
            {groups.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">No groups yet. Create one above.</p>
            )}
            <div className="space-y-2">
              {groups.map(g => (
                <div key={g._id} className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: g.color || '#2d6a2d' }} />
                    <span className="font-medium text-sm text-gray-800">{g.name}</span>
                    <span className="text-xs text-gray-400">{(g.brands || []).length} brands · {(g.assignedUsers || []).length} users</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(g)} className="p-1 hover:bg-blue-50 rounded">
                      <Edit2 className="h-4 w-4 text-blue-600" />
                    </button>
                    <button onClick={() => onDelete(g._id)} className="p-1 hover:bg-red-50 rounded">
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SRReportPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();

  const [srds, setSrds]       = useState([]);
  const [groups, setGroups]   = useState([]);
  const [users, setUsers]     = useState([]);
  const [prodStages, setProdStages] = useState([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [search, setSearch]                 = useState('');
  const [filterStatus, setFilterStatus]     = useState('all');
  const [filterBrand, setFilterBrand]       = useState('');
  const [filterType, setFilterType]         = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo]     = useState('');
  const [showFilters, setShowFilters]       = useState(false);

  // active group tab (null = All)
  const [activeGroup, setActiveGroup] = useState(null);

  // expanded rows
  const [expandedRows, setExpandedRows] = useState(new Set());

  // group manager modal
  const [showGroupManager, setShowGroupManager] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/srd?limit=500').then(r => r.json()),
      fetch('/api/report-groups').then(r => r.json()),
      fetch('/api/users?limit=100').then(r => r.json()),
      fetch('/api/production-stages').then(r => r.json()),
    ]).then(([srdData, groupData, userData, stagesData]) => {
      if (srdData.success)    setSrds(srdData.data || []);
      if (groupData.success)  setGroups(groupData.data || []);
      if (userData.success || Array.isArray(userData))
        setUsers(Array.isArray(userData) ? userData : (userData.data || userData.users || []));
      if (stagesData.success) setProdStages((stagesData.data || []).filter(s => s.isActive).sort((a,b) => a.order - b.order));
    }).catch(() => toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, []);

  const allBrands = useMemo(() => [...new Set(srds.map(s => getDyn(s, 'brand')).filter(Boolean))].sort(), [srds]);
  const allTypes  = useMemo(() => [...new Set(srds.map(s => getDyn(s, 'sample type', 'sampleType')).filter(Boolean))].sort(), [srds]);

  // Status filter options: base buckets + every active production stage
  const statusOptions = useMemo(() => {
    const seen = new Set();
    const opts = [];
    for (const o of [
      ...BASE_STATUS_OPTIONS,
      ...prodStages.map(s => ({ value: slugify(s.displayName || s.name), label: s.displayName || s.name })),
    ]) {
      if (!seen.has(o.value)) { seen.add(o.value); opts.push(o); }
    }
    return opts;
  }, [prodStages]);

  // filter + group
  const filtered = useMemo(() => {
    let list = srds;

    if (activeGroup) {
      const g = groups.find(x => x._id === activeGroup);
      if (g?.brands?.length) list = list.filter(s => g.brands.includes(getDyn(s, 'brand')));
    }

    const q = search.toLowerCase();
    return list.filter(srd => {
      if (q &&
        !srd.refNo?.toLowerCase().includes(q) &&
        !getDyn(srd, 'brand').toLowerCase().includes(q) &&
        !getDyn(srd, 'description', 'style').toLowerCase().includes(q) &&
        !getDyn(srd, 'buyer style ref').toLowerCase().includes(q)
      ) return false;
      if (filterBrand && getDyn(srd, 'brand').toLowerCase() !== filterBrand.toLowerCase()) return false;
      if (filterType  && getDyn(srd, 'sample type', 'sampleType').toLowerCase() !== filterType.toLowerCase()) return false;
      if (filterStatus !== 'all') {
        const label = slugify(getCurrentStatusLabel(srd, prodStages));
        if (label !== filterStatus) return false;
      }
      if (filterDateFrom && new Date(srd.createdAt) < new Date(filterDateFrom)) return false;
      if (filterDateTo   && new Date(srd.createdAt) > new Date(filterDateTo + 'T23:59:59')) return false;
      return true;
    });
  }, [srds, activeGroup, groups, search, filterStatus, filterBrand, filterType, filterDateFrom, filterDateTo, prodStages]);

  const hasFilters = search || filterStatus !== 'all' || filterBrand || filterType || filterDateFrom || filterDateTo;
  const clearFilters = () => {
    setSearch(''); setFilterStatus('all'); setFilterBrand('');
    setFilterType(''); setFilterDateFrom(''); setFilterDateTo('');
  };

  const toggleRow = id => setExpandedRows(prev => {
    const s = new Set(prev);
    s.has(id) ? s.delete(id) : s.add(id);
    return s;
  });

  // ── CSV Export ──────────────────────────────────────────────────────────────
  const handleExport = () => {
    const headers = [
      'Sr#', 'Inq#', 'SR. Date', 'SR. Raised Date', 'D.D',
      'Buyer', 'Sample Type', 'Priority', 'Buyer Style Ref', 'Description',
      'Color/Wash', 'Size', 'Qty', 'Current Status', 'TDD',
      'Dis. Date', 'App.Status', 'Reason',
    ];

    const rows = filtered.map((srd, idx) => {
      const brand      = getDyn(srd, 'brand');
      const sampleType = getDyn(srd, 'sample type', 'sampleType');
      const priority   = getDyn(srd, 'priority', 'Priority');
      const styleRef   = getDyn(srd, 'buyer style ref', 'style ref', 'Buyer Style Ref');
      const desc       = getDyn(srd, 'description', 'style', 'Description');
      const color      = getDyn(srd, 'wash / color', 'wash/color', 'color/wash', 'color', 'wash');
      const size       = getDyn(srd, 'sample request size', 'size', 'Size');
      const qty        = getDyn(srd, 'sample request qty.', 'sample request qty', 'qty', 'quantity', 'Qty');
      const delay      = getDelayDays(srd);
      const os         = getCurrentStatusLabel(srd, prodStages);
      const targetDate = fmtDate(getDyn(srd, 'sample etd', 'target dispatch date', 'etd', 'dispatch date'));
      const actualDate = srd.sampleDispatchedToBuyer ? fmtDate(srd.sampleDipatchedtoBuyerDate) : '';

      let approvalStatus = '';
      if (srd.BuyerApproved) approvalStatus = 'Buyer Approved';
      else if (srd.internalApproved) approvalStatus = 'Internal Approved';
      else if (srd.internalApprovedDate && !srd.internalApproved) approvalStatus = 'Internal Rejected';

      const reason =
        (srd.internalRejectedReasons || []).map(r => r.reason).join('; ') ||
        (srd.BuyerRejectedReasons    || []).map(r => r.reason).join('; ');

      return [
        idx + 1,
        srd.refNo,
        fmtDate(srd.createdAt),
        fmtDate(srd.createdAt),
        delay > 0 ? delay : '',
        brand,
        sampleType,
        priority,
        styleRef,
        desc,
        color,
        size,
        qty,
        os,
        targetDate,
        actualDate,
        approvalStatus,
        reason,
      ];
    });

    const escape = v => {
      const s = String(v ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const csv = [headers, ...rows].map(row => row.map(escape).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SR-Report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Print ────────────────────────────────────────────────────────────────────
  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) return;

    const rows = filtered.map((srd, idx) => {
      const brand      = getDyn(srd, 'brand');
      const sampleType = getDyn(srd, 'sample type', 'sampleType');
      const priority   = getDyn(srd, 'priority', 'Priority');
      const styleRef   = getDyn(srd, 'buyer style ref', 'style ref', 'Buyer Style Ref');
      const desc       = getDyn(srd, 'description', 'style', 'Description');
      const color      = getDyn(srd, 'wash / color', 'wash/color', 'color/wash', 'color', 'wash');
      const size       = getDyn(srd, 'sample request size', 'size', 'Size');
      const qty        = getDyn(srd, 'sample request qty.', 'sample request qty', 'qty', 'quantity', 'Qty');
      const delay      = getDelayDays(srd);
      const os         = getCurrentStatusLabel(srd, prodStages);
      const targetDate = fmtDate(getDyn(srd, 'sample etd', 'target dispatch date', 'etd', 'dispatch date'));
      const actualDate = srd.sampleDispatchedToBuyer ? fmtDate(srd.sampleDipatchedtoBuyerDate) : '-';

      let approvalStatus = '-';
      if (srd.BuyerApproved) approvalStatus = 'Buyer Approved';
      else if (srd.internalApproved) approvalStatus = 'Internal Approved';
      else if (srd.internalApprovedDate && !srd.internalApproved) approvalStatus = 'Internal Rejected';

      const reason =
        (srd.internalRejectedReasons || []).map(r => r.reason).join(', ') ||
        (srd.BuyerRejectedReasons    || []).map(r => r.reason).join(', ') || '-';

      const delayCls = delay > 7 ? 'color:#dc2626' : delay > 3 ? 'color:#ea580c' : 'color:#374151';
      const osBucket = getOverallStatus(srd);
      const osCls    = osBucket === 'Completed' ? 'color:#15803d;font-weight:600'
                     : osBucket === 'In Production'      ? 'color:#2563eb;font-weight:600'
                     : osBucket === 'Ready for Production' ? 'color:#7c3aed;font-weight:600'
                     : osBucket === 'Flagged'            ? 'color:#ea580c;font-weight:600'
                     : osBucket === 'In Progress'        ? 'color:#ca8a04;font-weight:600'
                     : 'color:#9ca3af';
      const appCls   = approvalStatus.includes('Rejected') ? 'color:#dc2626'
                     : approvalStatus !== '-' ? 'color:#15803d' : 'color:#9ca3af';

      return `<tr>
        <td>${idx + 1}</td>
        <td style="color:#2563eb;font-weight:500">${srd.refNo}</td>
        <td>${fmtDate(srd.createdAt)}</td>
        <td>${fmtDate(srd.createdAt)}</td>
        <td style="${delayCls};font-weight:500">${delay > 0 ? delay : '-'}</td>
        <td>${brand || '-'}</td>
        <td>${sampleType || '-'}</td>
        <td>${priority || '-'}</td>
        <td>${styleRef || '-'}</td>
        <td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${desc}">${desc || '-'}</td>
        <td>${color || '-'}</td>
        <td>${size || '-'}</td>
        <td>${qty || '-'}</td>
        <td style="${osCls}">${os}</td>
        <td>${targetDate || '-'}</td>
        <td>${actualDate}</td>
        <td style="${appCls}">${approvalStatus}</td>
        <td style="color:#dc2626">${reason}</td>
      </tr>`;
    }).join('');

    const activeGroupName = activeGroup
      ? (groups.find(g => g._id === activeGroup)?.name || 'Group')
      : 'All';

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>SR In Process Report</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 8px; color: #111; margin: 0; }
    h1 { font-size: 13px; font-weight: 700; margin: 0 0 2px 0; }
    .meta { font-size: 8px; color: #666; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 7.5px; }
    th { background: #f3f4f6; border: 0.5px solid #d1d5db; padding: 3px 5px; text-align: left; font-weight: 700; text-transform: uppercase; white-space: nowrap; }
    td { border: 0.5px solid #e5e7eb; padding: 2.5px 5px; vertical-align: middle; }
    tr:nth-child(even) td { background: #f9fafb; }
    tr:hover td { background: #eff6ff; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <h1>SR In Process Report</h1>
  <div class="meta">
    Group: ${activeGroupName} &nbsp;|&nbsp;
    Records: ${filtered.length} &nbsp;|&nbsp;
    Generated: ${new Date().toLocaleString('en-GB')}
    ${hasFilters ? '&nbsp;|&nbsp;<strong>Filters active</strong>' : ''}
  </div>
  <table>
    <thead>
      <tr>
        <th>S.No</th><th>Inquiry #</th><th>S.Request Date</th><th>SR Raised Date</th>
        <th>Delay Days</th><th>Buyer</th><th>Sample Type</th><th>Priority</th>
        <th>Buyer Style Ref</th><th>Description</th><th>Color/Wash</th><th>Size</th>
        <th>Qty</th><th>Current Status</th><th>Target Dispatch</th>
        <th>Actual Dispatch</th><th>Approval Status</th><th>Reason</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`;

    win.document.write(html);
    win.document.close();
  };

  // ── Group CRUD ───────────────────────────────────────────────────────────────
  async function handleSaveGroup(id, form) {
    const isNew = id === 'new';
    const url    = isNew ? '/api/report-groups' : `/api/report-groups/${id}`;
    const method = isNew ? 'POST' : 'PATCH';
    const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const data = await res.json();
    if (data.success) {
      setGroups(prev => isNew ? [...prev, data.data] : prev.map(g => g._id === id ? data.data : g));
      toast({ title: isNew ? 'Group created' : 'Group updated' });
    }
  }

  async function handleDeleteGroup(id) {
    if (!confirm('Delete this group?')) return;
    await fetch(`/api/report-groups/${id}`, { method: 'DELETE' });
    setGroups(prev => prev.filter(g => g._id !== id));
    if (activeGroup === id) setActiveGroup(null);
    toast({ title: 'Group deleted' });
  }

  // ── Loading state ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-green-700" />
        </div>
      </Layout>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div style={{ padding: '16px', minWidth: 0, width: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}>

        {/* Header */}
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h1 className="text-app-heading font-bold text-gray-900">SR In Process Report</h1>
            <p className="text-app-text text-gray-500 mt-0.5">Comprehensive view of all sample requests and their progress</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded hover:bg-gray-50 ${hasFilters ? 'border-green-600 text-green-700 bg-green-50' : 'border-gray-300 text-gray-700'}`}
            >
              <Filter className="h-4 w-4" /> Filters{hasFilters ? ' (active)' : ''}
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-green-700 hover:bg-green-800 rounded-md"
            >
              <Download className="h-4 w-4" /> Export
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-green-700 hover:bg-green-800 rounded-md"
            >
              <Printer className="h-4 w-4" /> Print
            </button>
          </div>
        </div>

        {/* Group Tabs */}
        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          <button
            onClick={() => setActiveGroup(null)}
            className={`px-3 py-1 text-sm rounded-full border transition-colors ${!activeGroup ? 'bg-green-700 text-white border-green-700' : 'border-gray-300 text-gray-600 hover:border-green-600'}`}
          >
            All ({srds.length})
          </button>
          {groups.map(g => (
            <button
              key={g._id}
              onClick={() => setActiveGroup(g._id)}
              style={activeGroup === g._id ? { background: g.color, borderColor: g.color } : {}}
              className={`px-3 py-1 text-sm rounded-full border transition-colors ${activeGroup === g._id ? 'text-white' : 'border-gray-300 text-gray-600 hover:border-green-600'}`}
            >
              <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: activeGroup === g._id ? 'white' : g.color }} />
              {g.name}
            </button>
          ))}
          <button
            onClick={() => setShowGroupManager(true)}
            className="px-3 py-1 text-sm rounded-full border border-dashed border-gray-400 text-gray-500 hover:border-green-600 hover:text-green-700 inline-flex items-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" /> Manage Groups
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mb-3 border border-gray-200 rounded-lg bg-gray-50 p-3">
            <div className="grid grid-cols-6 gap-2 items-end">
              <div className="col-span-2 relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search Ref No, Brand, Description..."
                  className="w-full pl-7 h-8 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-600"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">Brand</label>
                <select
                  value={filterBrand}
                  onChange={e => setFilterBrand(e.target.value)}
                  className="w-full h-8 px-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-600"
                >
                  <option value="">All Brands</option>
                  {allBrands.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">Sample Type</label>
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                  className="w-full h-8 px-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-600"
                >
                  <option value="">All Types</option>
                  {allTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">Status</label>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="w-full h-8 px-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-600"
                >
                  <option value="all">All Status</option>
                  {statusOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">Date From</label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={e => setFilterDateFrom(e.target.value)}
                  className="w-full h-8 px-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-600"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">Date To</label>
                <div className="flex gap-1">
                  <input
                    type="date"
                    value={filterDateTo}
                    onChange={e => setFilterDateTo(e.target.value)}
                    className="flex-1 h-8 px-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-600"
                  />
                  {hasFilters && (
                    <button onClick={clearFilters} className="h-8 w-8 flex items-center justify-center border border-red-300 text-red-500 rounded hover:bg-red-50">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-400">{filtered.length} of {srds.length} records</p>
          </div>
        )}

        {/* Table */}
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowX: 'auto', width: '100%', boxSizing: 'border-box' }}>
          <table className="text-app-text border-collapse" style={{ width: 'max-content', minWidth: '100%' }}>
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300">
                <th className="px-1.5 py-1.5 text-left text-xs font-semibold text-gray-700 uppercase border-r border-gray-300 whitespace-nowrap" style={{ width: 'fit-content' }}>S.#</th>
                <th className="px-1.5 py-1.5 text-left text-xs font-semibold text-gray-700 uppercase border-r border-gray-300 whitespace-nowrap" style={{ width: 'fit-content' }}>Inq#</th>
                <th className="px-1.5 py-1.5 text-left text-xs font-semibold text-gray-700 uppercase border-r border-gray-300 whitespace-nowrap" style={{ width: 'fit-content' }}>SR. Date</th>
                <th className="px-1.5 py-1.5 text-left text-xs font-semibold text-gray-700 uppercase border-r border-gray-300 whitespace-nowrap" style={{ width: 'fit-content' }}>SR. Raised Date</th>
                <th className="px-1.5 py-1.5 text-left text-xs font-semibold text-gray-700 uppercase border-r border-gray-300 whitespace-nowrap" style={{ width: 'fit-content' }}>Delay Days</th>
                <th className="px-1.5 py-1.5 text-left text-xs font-semibold text-gray-700 uppercase border-r border-gray-300 whitespace-nowrap" style={{ width: 'fit-content' }}>Buyer</th>
                <th className="px-1.5 py-1.5 text-left text-xs font-semibold text-gray-700 uppercase border-r border-gray-300 whitespace-nowrap" style={{ width: 'fit-content' }}>Sample Type</th>
                <th className="px-1.5 py-1.5 text-left text-xs font-semibold text-gray-700 uppercase border-r border-gray-300 whitespace-nowrap" style={{ width: 'fit-content' }}>Priority</th>
                <th className="px-1.5 py-1.5 text-left text-xs font-semibold text-gray-700 uppercase border-r border-gray-300 whitespace-nowrap" style={{ width: 'fit-content' }}>Style Ref</th>
                <th className="px-1.5 py-1.5 text-left text-xs font-semibold text-gray-700 uppercase border-r border-gray-300 whitespace-nowrap" style={{ width: 'fit-content' }}>Description</th>
                <th className="px-1.5 py-1.5 text-left text-xs font-semibold text-gray-700 uppercase border-r border-gray-300 whitespace-nowrap" style={{ width: 'fit-content' }}>Color/Wash</th>
                <th className="px-1.5 py-1.5 text-left text-xs font-semibold text-gray-700 uppercase border-r border-gray-300 whitespace-nowrap" style={{ width: 'fit-content' }}>Size</th>
                <th className="px-1.5 py-1.5 text-left text-xs font-semibold text-gray-700 uppercase border-r border-gray-300 whitespace-nowrap" style={{ width: 'fit-content' }}>Qty</th>
                <th className="px-1.5 py-1.5 text-left text-xs font-semibold text-gray-700 uppercase border-r border-gray-300 whitespace-nowrap" style={{ width: 'fit-content' }}>Current Status</th>
                <th className="px-1.5 py-1.5 text-left text-xs font-semibold text-gray-700 uppercase border-r border-gray-300 whitespace-nowrap" style={{ width: 'fit-content' }}>Dis. Date</th>
                <th className="px-1.5 py-1.5 text-left text-xs font-semibold text-gray-700 uppercase border-r border-gray-300 whitespace-nowrap" style={{ width: 'fit-content' }}>Act. Dis. Date</th>
                <th className="px-1.5 py-1.5 text-left text-xs font-semibold text-gray-700 uppercase border-r border-gray-300 whitespace-nowrap" style={{ width: 'fit-content' }}>Approval Status</th>
                <th className="px-1.5 py-1.5 text-left text-xs font-semibold text-gray-700 uppercase whitespace-nowrap" style={{ width: 'fit-content' }}>Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="18" className="px-4 py-10 text-center text-sm text-gray-400">No records match your filters</td>
                </tr>
              ) : filtered.map((srd, idx) => {
                const isExpanded = expandedRows.has(srd._id);
                const brand      = getDyn(srd, 'brand');
                const sampleType = getDyn(srd, 'sample type', 'sampleType');
                const priority   = getDyn(srd, 'priority', 'Priority');
                const styleRef   = getDyn(srd, 'buyer style ref', 'style ref', 'Buyer Style Ref');
                const desc       = getDyn(srd, 'description', 'style', 'Description');
                const color      = getDyn(srd, 'wash / color', 'wash/color', 'color/wash', 'color', 'wash');
                const size       = getDyn(srd, 'sample request size', 'size', 'Size');
                const qty        = getDyn(srd, 'sample request qty.', 'sample request qty', 'qty', 'quantity', 'Qty');
                const delay      = getDelayDays(srd);
                const os         = getOverallStatus(srd);
                const osDisplay  = getCurrentStatusLabel(srd, prodStages);
                const osCls      = os === 'Completed' ? 'text-green-700 font-semibold'
                                 : os === 'In Production'      ? 'text-blue-600 font-semibold'
                                 : os === 'Ready for Production' ? 'text-purple-600 font-semibold'
                                 : os === 'Flagged'            ? 'text-orange-600 font-semibold'
                                 : os === 'In Progress'        ? 'text-yellow-600 font-semibold'
                                 : 'text-gray-400';

                let approvalStatus = '';
                if (srd.BuyerApproved) approvalStatus = 'Buyer Approved';
                else if (srd.internalApproved) approvalStatus = 'Internal Approved';
                else if (srd.internalApprovedDate && !srd.internalApproved) approvalStatus = 'Internal Rejected';

                const reason =
                  (srd.internalRejectedReasons || []).map(r => r.reason).join(', ') ||
                  (srd.BuyerRejectedReasons    || []).map(r => r.reason).join(', ');

                return (
                  <React.Fragment key={srd._id}>
                    <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleRow(srd._id)}>
                      <td className="px-1.5 py-1.5 text-gray-500 border-r border-gray-200 whitespace-nowrap">{idx + 1}</td>
                      <td className="px-1.5 py-1.5 border-r border-gray-200 whitespace-nowrap">
                        <button
                          onClick={e => { e.stopPropagation(); router.push(`/srd/${srd._id}`); }}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {srd.refNo}
                        </button>
                      </td>
                      <td className="px-1.5 py-1.5 text-gray-700 border-r border-gray-200 whitespace-nowrap">{fmtDate(srd.createdAt)}</td>
                      <td className="px-1.5 py-1.5 text-gray-700 border-r border-gray-200 whitespace-nowrap">{fmtDate(srd.createdAt)}</td>
                      <td className={`px-1.5 py-1.5 border-r border-gray-200 whitespace-nowrap font-medium ${delay > 7 ? 'text-red-600' : delay > 3 ? 'text-orange-500' : 'text-gray-700'}`}>
                        {delay > 0 ? delay : '-'}
                      </td>
                      <td className="px-1.5 py-1.5 text-gray-700 border-r border-gray-200 whitespace-nowrap">{brand || '-'}</td>
                      <td className="px-1.5 py-1.5 text-gray-700 border-r border-gray-200 whitespace-nowrap">{sampleType || '-'}</td>
                      <td className="px-1.5 py-1.5 border-r border-gray-200 whitespace-nowrap">
                        {priority ? (
                          <span className={`px-1.5 py-1.5 rounded text-xs font-medium ${priority.toLowerCase() === 'high' ? 'bg-red-100 text-red-700' : priority.toLowerCase() === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                            {priority}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-1.5 py-1.5 text-gray-700 border-r border-gray-200 whitespace-nowrap">{styleRef || '-'}</td>
                      <td className="px-1.5 py-1.5 text-gray-700 border-r border-gray-200" style={{ maxWidth: '180px' }}>
                        <span className="block truncate" title={desc}>{desc || '-'}</span>
                      </td>
                      <td className="px-1.5 py-1.5 text-gray-700 border-r border-gray-200 whitespace-nowrap">{color || '-'}</td>
                      <td className="px-1.5 py-1.5 text-gray-700 border-r border-gray-200 whitespace-nowrap">{size || '-'}</td>
                      <td className="px-1.5 py-1.5 text-gray-700 border-r border-gray-200 whitespace-nowrap">{qty || '-'}</td>
                      <td className={`px-1.5 py-1.5 border-r border-gray-200 whitespace-nowrap ${osCls}`}>
                        <div className="flex items-center gap-1">
                          <span>{osDisplay}</span>
                          <ChevronDown className={`h-1.5 w-1.5 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </td>
                      <td className="px-1.5 py-1.5 text-gray-700 border-r border-gray-200 whitespace-nowrap">
                        {fmtDate(getDyn(srd, 'sample etd', 'target dispatch date', 'etd', 'dispatch date')) || '-'}
                      </td>
                      <td className="px-1.5 py-1.5 text-gray-700 border-r border-gray-200 whitespace-nowrap">
                        {srd.sampleDispatchedToBuyer ? fmtDate(srd.sampleDipatchedtoBuyerDate) : '-'}
                      </td>
                      <td className={`px-1.5 py-1.5 border-r border-gray-200 whitespace-nowrap text-xs font-medium ${approvalStatus.includes('Rejected') ? 'text-red-600' : approvalStatus ? 'text-green-700' : 'text-gray-400'}`}>
                        {approvalStatus || '-'}
                      </td>
                      <td className="px-1.5 py-1.5 text-red-600 text-xs whitespace-nowrap">{reason || ''}</td>
                    </tr>

                    {/* Expanded stage sub-row */}
                    {isExpanded && (
                      <tr key={`exp-${srd._id}`} className="bg-yellow-50 border-t border-yellow-200">
                        <td colSpan="18" className="px-4 py-2">
                          {srd.inProduction ? (
                            <div className="flex items-center gap-1 flex-wrap">
                              {prodStages.map(ps => {
                                // Find this stage in the SRD's productionHistory
                                const histEntry = (srd.productionHistory || []).find(h =>
                                  String(h.stage) === String(ps._id) ||
                                  h.stageName?.toLowerCase() === ps.name?.toLowerCase()
                                );
                                // Also check sampleProcess (slug/name-based matching)
                                const stageName = (ps.name || '').toLowerCase();
                                const stageSlug = (ps.slug || stageName).toLowerCase();
                                const sampleEntry = (srd.sampleProcess || []).find(
                                  s => {
                                    const sStage = (s.stage || '').toLowerCase();
                                    return sStage === stageName || sStage === stageSlug;
                                  }
                                );
                                const isCurrent = String(srd.currentProductionStage) === String(ps._id);
                                const isInProgress = isCurrent ||
                                  histEntry?.status === 'in-progress' ||
                                  sampleEntry?.status === 'in-progress' ||
                                  sampleEntry?.status === 'received' ||
                                  !!sampleEntry?.receivedDate;

                                const completedDate =
                                  histEntry?.status === 'completed'
                                    ? (histEntry.endDate || histEntry.startDate || null)
                                    : (sampleEntry?.status === 'completed' || sampleEntry?.completedDate)
                                      ? (sampleEntry.completedDate || sampleEntry.handoverDate || null)
                                      : null;

                                let cls = 'bg-gray-100 text-gray-400';
                                let text = '-';
                                if (completedDate) {
                                  cls = 'bg-green-600 text-white';
                                  text = fmtDate(completedDate);
                                } else if (getOverallStatus(srd) === 'Completed') {
                                  // SRD is fully complete but has no per-stage timestamps:
                                  // fall back to the record's completion / last-updated date.
                                  const fallbackDate =
                                    srd.productionEndDate ||
                                    srd.sampleDipatchedtoBuyerDate ||
                                    srd.updatedAt;
                                  if (fallbackDate) {
                                    cls = 'bg-green-600 text-white';
                                    text = fmtDate(fallbackDate);
                                  } else {
                                    cls = 'bg-green-700 text-white';
                                    text = 'Completed';
                                  }
                                } else if (isInProgress) {
                                  cls = 'bg-yellow-500 text-white';
                                  text = 'In Process';
                                }
                                return (
                                  <div key={ps._id} className="flex flex-col items-center min-w-[80px]">
                                    <span className="text-xs text-gray-500 font-semibold mb-0.5">{ps.displayName || ps.name}</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{text}</span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Not in production yet</span>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Group Manager Modal */}
        <GroupManagerModal
          open={showGroupManager}
          onClose={() => setShowGroupManager(false)}
          groups={groups}
          allBrands={allBrands}
          allUsers={users}
          onSave={handleSaveGroup}
          onDelete={handleDeleteGroup}
        />
      </div>
    </Layout>
  );
}
