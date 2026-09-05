'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import {
  LayoutDashboard, FileText, Settings, Users, Package,
  PanelLeftClose, PanelLeftOpen, FileSpreadsheet,
  BarChart3, ChevronDown, Truck, MessageSquare, ClipboardList,
  DollarSign, List, Calendar, LogOut, Shield, Factory,
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
  const [liveUser, setLiveUser] = useState(null);
  const [expandedMenus, setExpandedMenus] = useState({ 'Samples Management': true, 'Cost Sheets': true });
  const toggleMenu = (name) => setExpandedMenus(prev => ({ ...prev, [name]: !prev[name] }));
  const unreadIntervalRef = useRef(null);
  const lastFetchTimeRef = useRef(0);
  const userRole = session?.user?.role;

  // Admin always has full access. Otherwise use per-user sidebar preferences,
  // falling back to role-based defaults when nothing is configured.
  const isAdmin = userRole === 'admin';
  const user = liveUser || session?.user;

  const permissions = user?.permissions || {};
  const sidebarMenuItems = user?.sidebarMenuItems || [];

  // Returns true when the stored sidebarMenuItems explicitly grant a menu id.
  const hasMenu = (id) => sidebarMenuItems.includes(id);
  // Permission helper that respects admin override.
  const can = (key) => isAdmin || permissions[key] === true;

  // Live user record keeps permission changes effective without a re-login.
  useEffect(() => {
    if (!session?.user?.id) return;
    let cancelled = false;
    const fetchLiveUser = async () => {
      try {
        const res = await fetch('/api/users/me');
        const data = await res.json();
        if (!cancelled && data.success) setLiveUser(data.data);
      } catch {}
    };
    fetchLiveUser();
    return () => { cancelled = true; };
  }, [session?.user?.id]);

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

  useEffect(() => {
    if (userRole) fetchMenuItems();
  }, [userRole, user?.permissions, user?.sidebarMenuItems]);

  const fetchMenuItems = async () => {
    setLoading(true);
    try {
      const samplesChildren = [
        { id: 'all-srds', name: 'SR In Process', href: '/srd', icon: FileText },
        { id: 'sample-process', name: 'Inter Dept Log', href: '/sample-management/sample-process', icon: Package },
        { id: 'sample-card', name: 'Sample Card', href: '/samples/sample-card', icon: ClipboardList },
        { id: 'dispatch', name: 'Dispatch Detail', href: '/samples/dispatch', icon: Truck },
        { id: 'reports', name: 'Reports', href: '/sample-management/reports', icon: BarChart3 },
        { id: 'buyer-comment', name: 'Buyer Comment', href: '/samples/buyer-comment', icon: MessageSquare },
      ];

      // Every item carries a menu id so per-user sidebarMenuItems can filter it.
      const allItems = (userRole) => {
        const items = [
          { id: 'home', name: 'Home', href: '/home', icon: LayoutDashboard },
          { id: 'cost-sheets', name: 'Cost Sheets', href: '/costing/pre', icon: DollarSign, perm: 'canViewCostSheets' },
          { id: 'samples-management', name: 'Samples Management', icon: Package, isSubmenu: true, children: samplesChildren },
          { id: 'order-confirmation', name: 'Order Confirmation', href: '/dashboard/vmd', icon: ClipboardList, perm: 'canViewOrderConfirmation' },
          { id: 'planning', name: 'Planning', href: '/production', icon: Calendar, perm: 'canViewPlanning' },
          { id: 'bom', name: 'BOM', href: '/bom', icon: List, perm: 'canViewBOM' },
          { id: 'production', name: 'Production', href: '/dashboard/production-manager', icon: Factory, perm: 'canViewReports' },
          { id: 'srd-fields', name: 'SRD Fields', href: '/srdfields', icon: FileSpreadsheet, perm: 'canManageSRDFields' },
          { id: 'users', name: 'Users', href: '/users', icon: Users, perm: 'canManageUsers' },
          { id: 'permissions', name: 'Permissions', href: '/permissions', icon: Shield, perm: 'canManagePermissions' },
          { id: 'settings', name: 'Settings', icon: Settings, isSubmenu: true, perm: 'canAccessSettings', children: [
            { id: 'settings', name: 'Company Settings', href: '/settings', icon: Settings, perm: 'canAccessSettings' },
            { id: 'settings', name: 'Auto-Approval', href: '/settings/auto-approval', icon: Settings, perm: 'canAccessSettings' },
            { id: 'settings', name: 'SR Diagnostics', href: '/settings/diagnose', icon: Settings, perm: 'canAccessSettings' },
          ]},
          { id: 'work-queue', name: 'Work Queue', href: '/sample-management/sample-process', icon: Package, perm: 'canViewAll' },
          { id: 'stage', name: 'Stage', href: '/dashboard/stage', icon: Factory, perm: 'canViewAll' },
          { id: 'mmc', name: 'MMC Portal', href: '/dashboard/mmc', icon: Factory, perm: 'canViewReports' },
          { id: 'purchase-orders', name: 'Purchase Orders', href: '/dashboard/mmc/purchase-orders', icon: ClipboardList, perm: 'canViewReports' },
          { id: 'cost-sheets-sub', name: 'All Costing', href: '/costing', icon: DollarSign, perm: 'canViewCostSheets' },
          { id: 'pre-costing', name: 'Pre-Costing', href: '/costing/pre', icon: DollarSign, perm: 'canViewCostSheets' },
          { id: 'vmd-production', name: 'Production', href: '/dashboard/vmd/production', icon: Factory, perm: 'canViewReports' },
        ];
        return items;
      };

      // Whether a user has explicitly configured their sidebar.
      const hasCustomMenu = sidebarMenuItems.length > 0;

      // Given a list of candidate items and an optional explicit-id set, decide
      // which ones to show. Admin bypasses all filtering.
      const filterItems = (candidates) => {
        return candidates.filter(it => {
          if (isAdmin) return true;
          // Respect an explicit permission gate when present.
          if (it.perm && !can(it.perm)) return false;
          // If the user configured a custom menu, respect it.
          if (hasCustomMenu && !hasMenu(it.id)) return false;
          return true;
        });
      };

      // Build the menu tree honoring custom sidebarMenuItems + permission flags,
      // then fall back to role-based defaults when the user has no custom config.
      const buildMenu = (candidates, childrenFilter) => {
        const root = filterItems(candidates);
        return root.map(item => {
          if (item.children) {
            const kept = filterItems(childrenFilter ? childrenFilter(item) : item.children);
            if (kept.length === 0) return null;
            return { ...item, children: kept };
          }
          return item;
        }).filter(Boolean);
      };

      const menu = (() => {
        // Custom config path: use the full catalog and let filtering decide.
        if (hasCustomMenu && !isAdmin) {
          return buildMenu(allItems(userRole));
        }

        // Role-based defaults (used for users without custom config and for admin).
        if (isAdmin) {
          return buildMenu([
            { id: 'home', name: 'Home', href: '/home', icon: LayoutDashboard },
            { id: 'cost-sheets', name: 'Cost Sheets', href: '/costing/pre', icon: DollarSign },
            { id: 'samples-management', name: 'Samples Management', icon: Package, isSubmenu: true, children: samplesChildren },
            { id: 'order-confirmation', name: 'Order Confirmation', href: '/dashboard/vmd', icon: ClipboardList },
            { id: 'planning', name: 'Planning', href: '/production', icon: Calendar },
            { id: 'bom', name: 'BOM', href: '/bom', icon: List },
            { id: 'production', name: 'Production', href: '/dashboard/production-manager', icon: Factory },
            { id: 'srd-fields', name: 'SRD Fields', href: '/srdfields', icon: FileSpreadsheet },
            { id: 'users', name: 'Users', href: '/users', icon: Users },
            { id: 'permissions', name: 'Permissions', href: '/permissions', icon: Shield },
            { id: 'settings', name: 'Settings', icon: Settings, isSubmenu: true, children: [
              { id: 'settings', name: 'Company Settings', href: '/settings', icon: Settings },
              { id: 'settings', name: 'Auto-Approval', href: '/settings/auto-approval', icon: Settings },
              { id: 'settings', name: 'SR Diagnostics', href: '/settings/diagnose', icon: Settings },
            ]},
          ]);
        }

        if (userRole === 'cad') {
          return buildMenu([
            { id: 'home', name: 'Home', href: '/home', icon: LayoutDashboard },
            { id: 'order-confirmation', name: 'Order Confirmation', href: '/dashboard/vmd', icon: ClipboardList },
            { id: 'work-queue', name: 'Work Queue', href: '/sample-management/sample-process', icon: Package },
          ]);
        }

        if (['cutting','sewing','washing','finishing','dispatch'].includes(userRole)) {
          const names = { cutting:'Cutting', sewing:'Sewing', washing:'Washing', finishing:'Finishing', dispatch:'Dispatch' };
          return buildMenu([
            { id: 'home', name: 'Home', href: '/home', icon: LayoutDashboard },
            { id: 'stage', name: names[userRole] + ' Stage', href: '/dashboard/stage', icon: Factory },
            { id: 'sample-process', name: 'Inter Dept Log', href: '/sample-management/sample-process', icon: Package },
          ]);
        }

        if (userRole === 'production-manager') {
          return buildMenu([
            { id: 'home', name: 'Home', href: '/home', icon: LayoutDashboard },
            { id: 'production', name: 'Production', href: '/dashboard/production-manager', icon: Factory },
          ]);
        }

        const items = [
          { id: 'home', name: 'Home', href: '/home', icon: LayoutDashboard },
          { id: 'order-confirmation', name: 'Order Confirmation', href: '/dashboard/vmd', icon: ClipboardList },
        ];
        if (userRole?.toLowerCase() === 'mmc') {
          items.push(
            { id: 'mmc', name: 'MMC Portal', href: '/dashboard/mmc', icon: Factory },
            { id: 'purchase-orders', name: 'Purchase Orders', href: '/dashboard/mmc/purchase-orders', icon: ClipboardList },
          );
        }
        if (userRole?.toLowerCase() === 'vmd') {
          items.push({ id: 'samples-management', name: 'Samples Management', icon: Package, isSubmenu: true, children: samplesChildren });
          items.push({ id: 'cost-sheets', name: 'Cost Sheets', icon: DollarSign, isSubmenu: true, children: [
            { id: 'pre-costing', name: 'Pre-Costing', href: '/costing/pre', icon: DollarSign },
            // { id: 'post-costing', name: 'Post-Costing', href: '/costing/post', icon: DollarSign },  // commented out for now
            { id: 'cost-sheets-sub', name: 'All Costing', href: '/costing', icon: DollarSign },
          ]});
          items.push({ id: 'bom', name: 'BOM', href: '/bom', icon: List });
          items.push({ id: 'planning', name: 'Planning', href: '/production', icon: Calendar });
          items.push({ id: 'vmd-production', name: 'Production', href: '/dashboard/vmd/production', icon: Factory });
        }
        return buildMenu(items);
      })();

      setMenuItems(menu);
    } catch {
      setMenuItems([{ id: 'home', name: 'Home', href: `/dashboard/${userRole}`, icon: LayoutDashboard }]);
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
                    onClick={() => toggleMenu(item.name)}
                    suffix={<ChevronDown style={{ width: 13, height: 13, flexShrink: 0, color: '#9ca3af', transform: expandedMenus[item.name] ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }} />}
                  />
                  {!collapsed && expandedMenus[item.name] && (
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
                            <CIcon style={{ width: 14, height: 14, flexShrink: 0, color: ca ? '#1d4ed8' : '#6b7280' }} />
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
