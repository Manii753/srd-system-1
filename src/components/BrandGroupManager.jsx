'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Loader2, Plus, Pencil, Trash2, X, Check, ChevronDown, Users, Tag } from 'lucide-react';

const PRESET_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
];

// â”€â”€â”€ small helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function Badge({ color, children, onRemove, onClick, active }) {
  return (
    <span
      onClick={onClick}
      style={{ backgroundColor: color + (active ? 'ff' : '22'), borderColor: color, color: active ? '#fff' : color }}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium transition-all select-none ${onClick ? 'cursor-pointer hover:opacity-80' : ''}`}
    >
      {children}
      {onRemove && (
        <button onClick={e => { e.stopPropagation(); onRemove(); }} className="ml-0.5 opacity-70 hover:opacity-100">
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

// Multi-select brand picker dropdown
function BrandPicker({ allBrands, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = allBrands.filter(b => b.toLowerCase().includes(q.toLowerCase()));
  const toggle = (b) => onChange(selected.includes(b) ? selected.filter(x => x !== b) : [...selected, b]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs border border-gray-300 rounded bg-white hover:border-blue-400 transition-colors min-w-[140px]"
      >
        <Tag className="h-3 w-3 text-gray-400" />
        <span className="flex-1 text-left text-gray-700">
          {selected.length === 0 ? 'Pick brandsâ€¦' : `${selected.length} brand${selected.length > 1 ? 's' : ''} selected`}
        </span>
        <ChevronDown className="h-3 w-3 text-gray-400" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus
              type="text"
              placeholder="Search brandsâ€¦"
              value={q}
              onChange={e => setQ(e.target.value)}
              className="w-full text-xs px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
          <div className="max-h-44 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-gray-400">No brands found</p>
) : filtered.map((b, i) => (
                <label key={i} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.includes(b)}
                  onChange={() => toggle(b)}
                  className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
                />
                <span className="text-xs text-gray-700">{b}</span>
              </label>
            ))}
          </div>
          {selected.length > 0 && (
            <div className="p-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// User picker for assigning users to a group
function UserPicker({ allUsers, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = allUsers.filter(u =>
    u.name?.toLowerCase().includes(q.toLowerCase()) ||
    u.role?.toLowerCase().includes(q.toLowerCase())
  );
  const toggle = (uid) => onChange(selected.includes(uid) ? selected.filter(x => x !== uid) : [...selected, uid]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs border border-gray-300 rounded bg-white hover:border-blue-400 transition-colors min-w-[140px]"
      >
        <Users className="h-3 w-3 text-gray-400" />
        <span className="flex-1 text-left text-gray-700">
          {selected.length === 0 ? 'Assign usersâ€¦' : `${selected.length} user${selected.length > 1 ? 's' : ''}`}
        </span>
        <ChevronDown className="h-3 w-3 text-gray-400" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-60 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus
              type="text"
              placeholder="Search usersâ€¦"
              value={q}
              onChange={e => setQ(e.target.value)}
              className="w-full text-xs px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
          <div className="max-h-44 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-gray-400">No users found</p>
            ) : filtered.map(u => (
              <label key={u._id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.includes(u._id)}
                  onChange={() => toggle(u._id)}
                  className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
                />
                <div>
                  <div className="text-xs font-medium text-gray-800">{u.name}</div>
                  <div className="text-[10px] text-gray-400 capitalize">{u.role}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Inline group edit/create form
function GroupForm({ group, allBrands, allUsers, onSave, onCancel, saving }) {
  const [name, setName] = useState(group?.name || '');
  const [brands, setBrands] = useState(group?.brands || []);
  const [color, setColor] = useState(group?.color || PRESET_COLORS[0]);
  const [assignedUsers, setAssignedUsers] = useState(
    (group?.assignedUsers || []).map(u => (typeof u === 'object' ? u._id : u))
  );

  const valid = name.trim() && brands.length > 0;

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-3">
      {/* Name + color */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Group nameâ€¦"
          value={name}
          onChange={e => setName(e.target.value)}
          className="flex-1 text-xs px-2.5 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {/* Color swatches */}
        <div className="flex items-center gap-1 flex-wrap">
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              style={{ backgroundColor: c }}
              className={`w-5 h-5 rounded-full border-2 transition-all ${color === c ? 'border-gray-800 scale-110' : 'border-transparent hover:scale-105'}`}
            />
          ))}
        </div>
      </div>

      {/* Brands + users */}
      <div className="flex items-start gap-2 flex-wrap">
        <BrandPicker allBrands={brands} selected={brands} onChange={setBrands} />
        <UserPicker allUsers={allUsers} selected={assignedUsers} onChange={setAssignedUsers} />
      </div>

      {/* Selected brand pills */}
      {brands.length > 0 && (
        <div className="flex flex-wrap gap-1">
{brands.map((b, i) => (
              <Badge key={i} color={color} onRemove={() => setBrands(brands.filter(x => x !== b))}>
              {b}
            </Badge>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 justify-end">
        <button type="button" onClick={onCancel} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1">
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSave({ name: name.trim(), brands, color, assignedUsers })}
          disabled={!valid || saving}
          className="inline-flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-1.5 font-medium disabled:opacity-40"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          {group ? 'Save changes' : 'Create group'}
        </button>
      </div>
    </div>
  );
}

// â”€â”€â”€ main exported component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
/**
 * Props:
 *   allBrands: string[]           â€” all unique brand values from current SRDs
 *   activeGroupId: string|null    â€” currently selected group id (controlled)
 *   onGroupSelect: (id|null, brands: string[]) => void
 */
export default function BrandGroupManager({ allBrands = [], activeGroupId, onGroupSelect }) {
  const { data: session } = useSession();
  const [groups, setGroups] = useState([]);
  const [fetchedBrands, setFetchedBrands] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [livePerms, setLivePerms] = useState(null);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const panelRef = useRef(null);

  const userId = session?.user?.id || session?.user?.email;
  const isAdminOrVmd = ['admin', 'vmd'].includes(session?.user?.role?.toLowerCase());
  const canManage = isAdminOrVmd ||
    session?.user?.permissions?.canManageBrandGroups === true ||
    livePerms?.canManageBrandGroups === true;

  // Brand values used by the picker; falls back to fetching them when the
  // parent doesn't provide them (e.g. standalone usage on the SRD list page).
  const brands = allBrands.length > 0 ? allBrands : fetchedBrands;

  useEffect(() => {
    fetchGroups();
    fetchUsers();
    if (allBrands.length === 0) {
      fetch('/api/srd?listBrands=true')
        .then(r => r.json())
        .then(d => { if (d.success && Array.isArray(d.data)) setFetchedBrands(d.data); })
        .catch(() => {});
    }
    fetch('/api/users/me')
      .then(r => r.json())
      .then(d => { if (d.success) setLivePerms(d.data.permissions || {}); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close panel on outside click
  useEffect(() => {
    if (!panelOpen) return;
    const handler = e => { if (panelRef.current && !panelRef.current.contains(e.target)) setPanelOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [panelOpen]);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/report-groups');
      const data = await res.json();
      if (data.success) setGroups(data.data || []);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users?limit=100');
      const data = await res.json();
      if (data.success) setAllUsers(data.data || []);
    } catch {}
  };

  // Groups visible to this user: managers see all; others see only groups they're assigned to
  const visibleGroups = canManage
    ? groups
    : groups.filter(g =>
        (g.assignedUsers || []).some(u => {
          const uid = typeof u === 'object' ? u._id?.toString() : u?.toString();
          return uid === userId?.toString();
        })
      );

  const handleCreate = async (payload) => {
    setSavingId('new');
    try {
      const res = await fetch('/api/report-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setGroups(prev => [...prev, data.data]);
        setCreating(false);
      }
    } finally {
      setSavingId(null);
    }
  };

  const handleUpdate = async (id, payload) => {
    setSavingId(id);
    try {
      const res = await fetch(`/api/report-groups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setGroups(prev => prev.map(g => g._id === id ? data.data : g));
        setEditingId(null);
        // If this was the active group, update its brands in the parent
        if (activeGroupId === id) {
          onGroupSelect(id, data.data.brands || []);
        }
      }
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this group?')) return;
    setDeletingId(id);
    try {
      await fetch(`/api/report-groups/${id}`, { method: 'DELETE' });
      setGroups(prev => prev.filter(g => g._id !== id));
      if (activeGroupId === id) onGroupSelect(null, []);
    } finally {
      setDeletingId(null);
    }
  };

  const handleChipClick = (group) => {
    if (activeGroupId === group._id) {
      // Deselect
      onGroupSelect(null, []);
    } else {
      onGroupSelect(group._id, group.brands || []);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* â”€â”€ chip bar â”€â”€ */}
      <div className="flex items-center gap-2 flex-wrap">
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />
        ) : visibleGroups.length === 0 ? (
          <span className="text-xs text-gray-400 italic">No brand groups yet</span>
        ) : (
          visibleGroups.map(g => (
            <Badge
              key={g._id}
              color={g.color || '#3b82f6'}
              active={activeGroupId === g._id}
              onClick={() => handleChipClick(g)}
            >
              {g.name}
              <span className="opacity-60 font-normal">
                ({(g.brands || []).length})
              </span>
            </Badge>
          ))
        )}

        {/* Manage groups button â€” admins, VMDs, or users with Can Manage Brand Groups permission */}
        {canManage && (
          <button
            onClick={() => { setPanelOpen(v => !v); setCreating(false); setEditingId(null); }}
            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border transition-colors ${
              panelOpen
                ? 'bg-blue-600 text-white border-blue-600'
                : 'text-gray-500 border-gray-300 hover:border-blue-400 hover:text-blue-600 bg-white'
            }`}
          >
            <Pencil className="h-3 w-3" />
            Manage Groups
          </button>
        )}

        {/* Clear active group */}
        {activeGroupId && (
          <button
            onClick={() => onGroupSelect(null, [])}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-0.5"
            title="Clear group filter"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* â”€â”€ management panel (dropdown) â”€â”€ */}
      {panelOpen && (
        <div className="absolute top-full left-0 mt-2 w-[480px] max-w-[calc(100vw-2rem)] bg-white border border-gray-200 rounded-xl shadow-xl z-40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Brand Groups</h3>
            <button onClick={() => setPanelOpen(false)}>
              <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </button>
          </div>

          <p className="text-xs text-gray-500">
            Groups let you filter the SR table by a set of brands with one click. Assign users to control who sees each group.
          </p>

          {/* Existing groups */}
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {groups.length === 0 && !creating && (
              <p className="text-xs text-gray-400 italic text-center py-3">No groups yet â€” create one below.</p>
            )}
            {groups.map(g => (
              <div key={g._id}>
                {editingId === g._id ? (
                  <GroupForm
                    group={g}
                    allBrands={brands}
                    allUsers={allUsers}
                    onSave={payload => handleUpdate(g._id, payload)}
                    onCancel={() => setEditingId(null)}
                    saving={savingId === g._id}
                  />
                ) : (
                  <div
                    style={{ borderLeftColor: g.color || '#3b82f6' }}
                    className="flex items-center justify-between gap-2 p-2.5 rounded border border-gray-100 border-l-4 bg-white hover:bg-gray-50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-gray-800">{g.name}</span>
                        {(g.brands || []).slice(0, 4).map(b => (
                          <Badge key={b} color={g.color || '#3b82f6'}>{b}</Badge>
                        ))}
                        {(g.brands || []).length > 4 && (
                          <span className="text-[10px] text-gray-400">+{(g.brands || []).length - 4} more</span>
                        )}
                      </div>
                      {(g.assignedUsers || []).length > 0 && (
                        <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                          <Users className="h-2.5 w-2.5" />
                          {(g.assignedUsers || []).map(u => typeof u === 'object' ? u.name : u).join(', ')}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => { setEditingId(g._id); setCreating(false); }}
                        className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit group"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(g._id)}
                        disabled={deletingId === g._id}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40"
                        title="Delete group"
                      >
                        {deletingId === g._id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Create new */}
          {creating ? (
            <GroupForm
              allBrands={brands}
              allUsers={allUsers}
              onSave={handleCreate}
              onCancel={() => setCreating(false)}
              saving={savingId === 'new'}
            />
          ) : (
            <button
              onClick={() => { setCreating(true); setEditingId(null); }}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-blue-600 border border-dashed border-blue-300 hover:border-blue-500 rounded-lg py-2 hover:bg-blue-50 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              New Group
            </button>
          )}
        </div>
      )}
    </div>
  );
}
