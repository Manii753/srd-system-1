'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import {
  LayoutDashboard, FileText, Settings, Users, Package,
  PanelLeftClose, PanelLeftOpen, Plus, FileSpreadsheet,
  BarChart3, ChevronDown, Truck, MessageSquare, ClipboardList,
  DollarSign, List, Calendar, LogOut, Shield, Factory, Wrench,
} from 'lucide-react';

const COLLAPSED_KEY = 'sidebar_collapsed';

function MenuItem({ icon, label, collapsed, active, onClick, suffix }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center',
        gap: collapsed ? 0 : 10,
        justifyContent: collapsed ? 'center' : 'flex-start',
        padding: collapsed ? '10px 0' : '10px 10px',
        borderRadius: 8, border: 'none', cursor: 'pointer',
        fontSize: 13, fontWeight: active ? 600 : 400,
        width: '100%', transition: 'background-color 150ms',
        backgroundColor: active ? '#eff6ff' : hovered ? '#f3f4f6' : 'transparent',
        color: active ? '#1d4ed8' : '#374151',
      }}
    >
      {icon}
      {!collapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, textAlign: 'left' }}>{label}</span>}
      {!collapsed && suffix}
    </button>
  );
}

export default function DynamicSidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem(COLLAPSED_KEY) === 'true';
    return false;
  });
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [samplesExpanded, setSamplesExpanded] = useState(true);
  const unreadIntervalRef = useRef(null);
  const lastFetchTimeRef = useRef(0);
  const userRole = session?.user?.role;

  const toggle = () => setCollapsed(prev => {
    const next = !prev;
    localStorage.setItem(COLLAPSED_KEY, String(next));
    return next;
  });

  useEffect(() => {
    if (!session?.user?.email) return;
    const fetchUnread = async () => {
      const now = Date.now();
      if (now - lastFetchTimeRef.current < 5000) return;
      lastFetchTimeRef.current = now;
      try {
        const res = await fetch('/api/messages/unread-count');
        const data = await res.json();
        if (data.success) setUnreadCount(data.count);
      } catch {}
    };
    fetchUnread();
    unreadIntervalRef.current = setInterval(fetchUnread, 30000);
    window.addEventListener('refreshUnreadCount', fetchUnread);
    return () => {
      clearInterval(unreadIntervalRef.current);
      window.removeEventListener('refreshUnreadCount', fetchUnread);
    };
  }, [session?.user?.email]);

  useEffect(() => { if (userRole) fetchMenuItems(); }, [userRole]);

  const fetchMenuItems = async () => {
    try {
      const samplesChildren = [
        // { name: 'Create SRD', href: userRole === 'admin' ? '/dashboard/admin/create' : `/dashboard/${userRole}/create`, icon: Plus },
        { name: 'SR In Process', href: '/srd', icon: FileText },
        { name: 'SR Progress', href: '/sample-management/sample-process', icon: Package },
        { name: 'Sample Card', href: '/samples/sample-card', icon: ClipboardList },
        { name: 'Dispatch Detail', href: '/samples/dispatch', icon: Truck },
        { name: 'Reports', href: '/sample-management/reports', icon: BarChart3 },
        { name: 'Buyer Comment', href: '/samples/buyer-comment', icon: MessageSquare },
      ];

      if (userRole === 'admin') {
        setMenuItems([
          { name: 'Home', href: '/home', icon: LayoutDashboard },
          { name: 'Order Confirmation', href: '/dashboard/vmd', icon: ClipboardList },
          { name: 'Samples Management', icon: Package, isSubmenu: true, children: samplesChildren },
          { name: 'Cost Sheets', href: '#', icon: DollarSign },
          { name: 'Bom', href: '#', icon: List },
          { name: 'Planning', href: '#', icon: Calendar },
          { name: 'Production', href: '/dashboard/production-manager', icon: Factory },
          { name: 'All SRDs', href: '/srd', icon: FileText },
          { name: 'SRD Fields', href: '/srdfields', icon: FileSpreadsheet },
          { name: 'Users', href: '/users', icon: Users },
          { name: 'Permissions', href: '/permissions', icon: Shield },
          { name: 'Settings', icon: Settings, isSubmenu: true, children: [
            { name: 'Company Settings', href: '/settings' },
            { name: 'Auto-Approval', href: '/settings/auto-approval' },
            { name: 'SR Diagnostics', href: '/settings/diagnose' },
          ]},
        ]);
      } else if (['cutting','sewing','washing','finishing','dispatch'].includes(userRole)) {
        const names = { cutting:'Cutting', sewing:'Sewing', washing:'Washing', finishing:'Finishing', dispatch:'Dispatch' };
        setMenuItems([
          { name: 'Home', href: '/home', icon: LayoutDashboard },
          { name: names[userRole] + ' Stage', href: '/dashboard/stage', icon: Factory },
        ]);
      } else if (userRole === 'production-manager') {
        setMenuItems([
          { name: 'Home', href: '/home', icon: LayoutDashboard },
          { name: 'Production', href: '/dashboard/production-manager', icon: Factory },
        ]);
      } else {
        const items = [
          { name: 'Home', href: '/home', icon: LayoutDashboard },
          { name: 'Order Confirmation', href: '/dashboard/vmd', icon: ClipboardList },
        ];
        if (userRole?.toLowerCase() === 'mmc') {
          items.push(
            { name: 'MMC Portal', href: '/dashboard/mmc', icon: Factory },
            { name: 'Purchase Orders', href: '/dashboard/mmc/purchase-orders', icon: ClipboardList },
          );
        }
        if (userRole?.toLowerCase() === 'vmd') {
          items.push({ name: 'Samples Management', icon: Package, isSubmenu: true, children: samplesChildren });
          items.push({ name: 'Cost Sheets', href: '#', icon: DollarSign });
          items.push({ name: 'Bom', href: '#', icon: List });
          items.push({ name: 'Planning', href: '#', icon: Calendar });
          items.push({ name: 'Production', href: '/dashboard/vmd/production', icon: Factory });
        }
        setMenuItems(items);
      }
    } catch {
      setMenuItems([{ name: 'Home', href: `/dashboard/${userRole}`, icon: LayoutDashboard }]);
    } finally {
      setLoading(false);
    }
  };

  const fullUrl = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
  let activeHref = '';
  for (const item of menuItems) {
    if (item.href && fullUrl.startsWith(item.href) && item.href.length > activeHref.length) activeHref = item.href;
    if (item.children) for (const c of item.children) {
      if (c.href && fullUrl.startsWith(c.href) && c.href.length > activeHref.length) activeHref = c.href;
    }
  }

  const W = collapsed ? 56 : 200;

  return (
    <div style={{
      width: W, minWidth: W, flexShrink: 0,
      transition: 'width 200ms ease, min-width 200ms ease',
      height: '100vh', display: 'flex', flexDirection: 'column',
      backgroundColor: '#fff', borderRight: '1px solid #e5e7eb', overflow: 'hidden',
    }}>
      {/* Top bar */}
      <div style={{
        borderBottom: '1px solid #e5e7eb', padding: collapsed ? '12px 8px' : '0 12px',
        display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between',
        minHeight: 56, flexShrink: 0,
      }}>
        {!collapsed && <span style={{ fontWeight: 700, fontSize: 15, color: '#111827', whiteSpace: 'nowrap' }}>SRD System</span>}
        <button onClick={toggle} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 32, height: 32, borderRadius: 8, border: 'none',
          background: 'transparent', cursor: 'pointer', color: '#6b7280', flexShrink: 0,
        }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f3f4f6'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          {collapsed ? <PanelLeftOpen style={{ width: 16, height: 16 }} /> : <PanelLeftClose style={{ width: 16, height: 16 }} />}
        </button>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '10px 8px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 24 }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid transparent', borderBottomColor: '#2563eb', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : (
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {menuItems.map((item, i) => {
              const Icon = item.icon;
              const isActive = item.href === activeHref;
              const hasActiveChild = item.children?.some(c => c.href === activeHref);

              if (item.isSubmenu) return (
                <div key={i}>
                  <MenuItem
                    icon={<Icon style={{ width: 18, height: 18, flexShrink: 0, color: hasActiveChild ? '#be185d' : '#4b5563' }} />}
                    label={item.name} collapsed={collapsed} active={hasActiveChild}
                    onClick={() => setSamplesExpanded(p => !p)}
                    suffix={<ChevronDown style={{ width: 13, height: 13, flexShrink: 0, color: '#9ca3af', transform: samplesExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }} />}
                  />
                  {!collapsed && samplesExpanded && (
                    <div style={{ marginLeft: 14, paddingLeft: 10, borderLeft: '2px solid #e5e7eb', marginTop: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {item.children.map((child, ci) => {
                        const CIcon = child.icon;
                        const ca = child.href === activeHref;
                        return (
                          <Link key={ci} href={child.href} style={{
                            display: 'flex', alignItems: 'center', gap: 7,
                            padding: '6px 8px', borderRadius: 6, textDecoration: 'none',
                            fontSize: 12, fontWeight: ca ? 600 : 400,
                            color: ca ? '#1d4ed8' : '#374151',
                            backgroundColor: ca ? '#eff6ff' : 'transparent',
                          }}
                            onMouseEnter={e => { if (!ca) e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
                            onMouseLeave={e => { if (!ca) e.currentTarget.style.backgroundColor = 'transparent'; }}
                          >
                            <Icon style={{ width: 14, height: 14, flexShrink: 0, color: ca ? '#1d4ed8' : '#6b7280' }} />
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{child.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );

              return (
                <Link key={i} href={item.href || '#'} title={collapsed ? item.name : undefined}
                  style={{
                    display: 'flex', alignItems: 'center',
                    gap: collapsed ? 0 : 10, justifyContent: collapsed ? 'center' : 'flex-start',
                    padding: collapsed ? '10px 0' : '10px 10px',
                    borderRadius: 8, textDecoration: 'none', fontSize: 13,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#1d4ed8' : '#374151',
                    backgroundColor: isActive ? '#eff6ff' : 'transparent',
                    position: 'relative',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = isActive ? '#eff6ff' : 'transparent'; }}
                >
                  <Icon style={{ width: 18, height: 18, flexShrink: 0, color: isActive ? '#1d4ed8' : '#4b5563' }} />
                  {!collapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>}
                </Link>
              );
            })}

            {/* Logout */}
            <button onClick={() => signOut({ callbackUrl: '/login' })} title={collapsed ? 'Logout' : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10,
                justifyContent: collapsed ? 'center' : 'flex-start',
                padding: collapsed ? '10px 0' : '10px 10px',
                borderRadius: 8, border: 'none', background: 'transparent',
                cursor: 'pointer', fontSize: 13, color: '#374151',
                width: '100%', marginTop: 4,
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#fef2f2'; e.currentTarget.style.color = '#dc2626'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#374151'; }}
            >
              <LogOut style={{ width: 18, height: 18, flexShrink: 0 }} />
              {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>Logout</span>}
            </button>
          </nav>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
