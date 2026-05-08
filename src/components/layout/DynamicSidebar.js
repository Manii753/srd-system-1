'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useEffect, useState, useRef } from 'react';
import {
  LayoutDashboard,
  FileText,
  Settings,
  Users,
  Package,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  GitBranch,
  Plus,
  CheckCircle,
  Inbox,
  Factory,
  Edit,
  FileSpreadsheet,
  BarChart3,
  ChevronDown,
  Truck,
  MessageSquare,
  ClipboardList,
  DollarSign,
  List,
  Calendar,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar';

export default function DynamicSidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { open, toggleSidebar, state } = useSidebar();
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [samplesExpanded, setSamplesExpanded] = useState(false);

  const userRole = session?.user?.role;
  const unreadIntervalRef = useRef(null);
  const lastFetchTimeRef = useRef(0);

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' });
  };

  // Fetch unread count
  useEffect(() => {
    if (session?.user?.email) {
      const fetchUnreadCount = async () => {
        // Debounce: don't fetch if we fetched within the last 5 seconds
        const now = Date.now();
        if (now - lastFetchTimeRef.current < 5000) {
          return;
        }
        lastFetchTimeRef.current = now;

        try {
          const res = await fetch('/api/messages/unread-count');
          const data = await res.json();
          if (data.success) {
            setUnreadCount(data.count);
          }
        } catch (error) {
          console.error('Error fetching unread count:', error);
        }
      };

      fetchUnreadCount();

      // Clear any existing interval before setting a new one
      if (unreadIntervalRef.current) {
        clearInterval(unreadIntervalRef.current);
      }

      // Refresh every 30 seconds (increased from 10)
      unreadIntervalRef.current = setInterval(fetchUnreadCount, 30000);

      // Listen for manual refresh events
      const handleRefresh = () => fetchUnreadCount();
      window.addEventListener('refreshUnreadCount', handleRefresh);

      return () => {
        if (unreadIntervalRef.current) {
          clearInterval(unreadIntervalRef.current);
          unreadIntervalRef.current = null;
        }
        window.removeEventListener('refreshUnreadCount', handleRefresh);
      };
    }
  }, [session?.user?.email]);

  useEffect(() => {
    if (userRole) {
      fetchMenuItems();
    }
  }, [userRole]);

  const fetchMenuItems = async () => {
    try {
      if (userRole === 'admin') {
        // Admin gets all config pages
        setMenuItems([
          { name: 'Home', href: '/home', icon: LayoutDashboard, gradient: 'from-blue-500 to-cyan-500' },
          { name: 'Order Confirmation', href: '/dashboard/vmd', icon: ClipboardList, gradient: 'from-yellow-400 to-yellow-500' },
          {
            name: 'Samples Management',
            icon: Package,
            gradient: 'from-pink-500 to-rose-500',
            isSubmenu: true,
            children: [
              { name: 'Create SRD', href: '/dashboard/admin/create', icon: Plus },
              { name: 'Sample Request', href: '/srd', icon: FileText },
              { name: 'Sample Process', href: '/srd', icon: Package },
              { name: 'Sample Card', href: '/samples/sample-card', icon: ClipboardList },
              { name: 'Dispatch Detail', href: '/samples/dispatch', icon: Truck },
              { name: 'Reports', href: '/reports', icon: BarChart3 },
              { name: 'Buyer Comment', href: '/samples/buyer-comment', icon: MessageSquare },
            ]
          },
          { name: 'Cost Sheets', href: '#', icon: DollarSign, gradient: 'from-yellow-400 to-yellow-500' },
          { name: 'Bom', href: '#', icon: List, gradient: 'from-yellow-400 to-yellow-500' },
          { name: 'Planning', href: '#', icon: Calendar, gradient: 'from-yellow-400 to-yellow-500' },
          { name: 'All SRDs', href: '/srd', icon: FileText, gradient: 'from-purple-500 to-pink-500' },
          { name: 'SRD Fields', href: '/srdfields', icon: FileSpreadsheet, gradient: 'from-green-500 to-emerald-500' },
          { name: 'Users', href: '/users', icon: Users, gradient: 'from-orange-500 to-red-500' },
          { name: 'Settings', href: '/settings', icon: Settings, gradient: 'from-gray-500 to-slate-600' },
        ]);
      } else if (['cutting', 'sewing', 'washing', 'finishing', 'dispatch'].includes(userRole)) {
        // Production stage roles
        const stageNames = {
          cutting: 'Cutting',
          sewing: 'Sewing',
          washing: 'Washing',
          finishing: 'Finishing',
          dispatch: 'Dispatch'
        };

        setMenuItems([
          {
            name: `${stageNames[userRole]}`,
            href: `/dashboard/${userRole}`,
            icon: LayoutDashboard,
            gradient: 'from-blue-500 to-cyan-500'
          },
        ]);
      } else {
        // Fetch department info for dynamic menu
        const response = await fetch('/api/departments');
        const data = await response.json();

        if (data.success) {
          // Find department by matching both uppercase and lowercase slugs
          const userDept = data.data.find(d =>
            d.slug === userRole ||
            d.slug === userRole.toUpperCase() ||
            d.slug.toLowerCase() === userRole
          );

          if (userDept) {
            // Only VMD can create SRDs
            const menuItems = [
              {
                name: 'Home',
                href: '/home',
                icon: LayoutDashboard,
                gradient: 'from-blue-500 to-cyan-500'
              },
              {
                name: 'Order Confirmation',
                href: '/dashboard/vmd',
                icon: ClipboardList,
                gradient: 'from-yellow-400 to-yellow-500'
              },
            ];

            // Add Samples Management submenu for VMD
            if (userRole === 'vmd' || userRole === 'VMD') {
              menuItems.push({
                name: 'Samples Management',
                icon: Package,
                gradient: 'from-pink-500 to-rose-500',
                isSubmenu: true,
                children: [
                  { name: 'Create SRD', href: `/dashboard/${userRole}/create`, icon: Plus },
                  { name: 'Sample Request', href: '/srd', icon: FileText },
                  { name: 'Sample Process', href: '/srd', icon: Package },
                  { name: 'Sample Card', href: '/samples/sample-card', icon: ClipboardList },
                  { name: 'Dispatch Detail', href: '/samples/dispatch', icon: Truck },
                  { name: 'Reports', href: '/reports', icon: BarChart3 },
                  { name: 'Buyer Comment', href: '/samples/buyer-comment', icon: MessageSquare },
                ]
              });
              
              menuItems.push(
                { name: 'Cost Sheets', href: '#', icon: DollarSign, gradient: 'from-yellow-400 to-yellow-500' },
                { name: 'Bom', href: '#', icon: List, gradient: 'from-yellow-400 to-yellow-500' },
                { name: 'Planning', href: '#', icon: Calendar, gradient: 'from-yellow-400 to-yellow-500' }
              );
            }

            setMenuItems(menuItems);
          } else {
            // Fallback menu if department not found
            setMenuItems([
              { name: 'Home', href: `/dashboard/${userRole}`, icon: LayoutDashboard, gradient: 'from-blue-500 to-cyan-500' },
              { name: 'SRDs', href: '/srd', icon: FileText, gradient: 'from-purple-500 to-pink-500' },
            ]);
          }
        } else {
          // Fallback menu if API fails
          setMenuItems([
            { name: 'Home', href: `/dashboard/${userRole}`, icon: LayoutDashboard, gradient: 'from-blue-500 to-cyan-500' },
            { name: 'SRDs', href: '/srd', icon: FileText, gradient: 'from-purple-500 to-pink-500' },
          ]);
        }
      }
    } catch (error) {
      console.error('Error fetching menu items:', error);
      // Fallback to basic menu
      setMenuItems([
        { name: 'Home', href: `/dashboard/${userRole}`, icon: LayoutDashboard, gradient: 'from-blue-500 to-cyan-500' },
        { name: 'SRDs', href: '/srd', icon: FileText, gradient: 'from-purple-500 to-pink-500' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const roleColors = {
    admin: 'from-blue-600 via-blue-500 to-cyan-500',
    vmd: 'from-purple-600 via-purple-500 to-pink-500',
    cad: 'from-violet-600 via-violet-500 to-purple-500',
    commercial: 'from-indigo-600 via-indigo-500 to-blue-500',
    mmc: 'from-slate-700 via-slate-600 to-gray-600',
  };

  const roleGradient = roleColors[userRole] || roleColors.admin;

  const fullUrl = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
  let activeItemHref = '';
  if (menuItems) {
    for (const item of menuItems) {
      if (fullUrl.startsWith(item.href)) {
        if (item.href.length > activeItemHref.length) {
          activeItemHref = item.href;
        }
      }
    }
  }

  if (loading) {
    return (
      <Sidebar className="border-r-0 transition-all duration-400" collapsible="icon">
        <div className="h-full bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Sidebar>
    );
  }

  return (
    <Sidebar className="border-r border-gray-200 transition-all duration-300" collapsible="icon">
      <div className="h-full bg-white">
        <SidebarHeader className={cn("relative border-b border-gray-200", open ? "p-6" : "p-4")}>
          <div className={cn("relative", !open && "flex flex-col items-center")}>
            {open && (
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">
                  SRD System
                </h2>
                <button
                  onClick={toggleSidebar}
                  className="rounded-lg p-1.5 hover:bg-gray-100 transition-colors"
                >
                  <PanelLeftClose className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            )}

            {!open && (
              <button
                onClick={toggleSidebar}
                className="w-full rounded-lg p-2 hover:bg-gray-100 transition-colors"
              >
                <PanelLeftOpen className="w-4 h-4 text-gray-600 mx-auto" />
              </button>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent className="relative px-3 py-4">
          <SidebarGroup>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = item.href === activeItemHref;
                const hasActiveChild = item.children?.some(child => child.href === activeItemHref);

                // Handle submenu items
                if (item.isSubmenu) {
                  return (
                    <div key={item.name || index} className="space-y-1">
                      {/* Parent menu item */}
                      <div className="relative">
                        <SidebarMenuButton
                          tooltip={!open ? item.name : undefined}
                          className={cn(
                            "relative rounded-lg transition-all",
                            hasActiveChild
                              ? "bg-pink-50 text-pink-700 font-medium"
                              : "hover:bg-gray-100 text-gray-700",
                            open ? "h-11 px-3" : "h-11 px-2 justify-center"
                          )}
                          onClick={() => setSamplesExpanded(!samplesExpanded)}
                        >
                          <div className={cn(
                            "flex items-center w-full h-full",
                            open ? "gap-3" : "justify-center"
                          )}>
                            <Icon className={cn(
                              "h-5 w-5 shrink-0",
                              hasActiveChild ? "text-pink-700" : "text-gray-600"
                            )} />
                            {open && (
                              <>
                                <span className="text-sm">
                                  {item.name}
                                </span>
                                <ChevronDown className={cn(
                                  "ml-auto h-4 w-4 shrink-0 transition-transform",
                                  samplesExpanded ? "rotate-180" : ""
                                )} />
                              </>
                            )}
                          </div>
                        </SidebarMenuButton>
                      </div>

                      {/* Child menu items */}
                      {open && samplesExpanded && (
                        <div className="ml-6 space-y-1 border-l-2 border-gray-200 pl-3">
                          {item.children.map((child, childIndex) => {
                            const ChildIcon = child.icon;
                            const isChildActive = child.href === activeItemHref;

                            return (
                              <div key={child.href || childIndex} className="relative">
                                <SidebarMenuButton
                                  asChild
                                  isActive={isChildActive}
                                  className={cn(
                                    "relative rounded-lg h-9 px-2",
                                    isChildActive
                                      ? "bg-blue-50 text-blue-700 font-medium"
                                      : "hover:bg-gray-100 text-gray-700"
                                  )}
                                >
                                  <Link href={child.href} className="flex items-center gap-2 w-full h-full">
                                    <ChildIcon className={cn(
                                      "h-4 w-4 shrink-0",
                                      isChildActive ? "text-blue-700" : "text-gray-600"
                                    )} />
                                    <span className="text-xs">
                                      {child.name}
                                    </span>
                                  </Link>
                                </SidebarMenuButton>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                // Regular menu items
                return (
                  <div key={item.name || item.href || index} className="relative">
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={!open ? item.name : undefined}
                      className={cn(
                        "relative rounded-lg transition-all",
                        isActive
                          ? "bg-blue-50 text-blue-700 font-medium"
                          : "hover:bg-gray-100 text-gray-700",
                        open ? "h-11 px-3" : "h-11 px-2 justify-center"
                      )}
                    >
                      <Link href={item.href || '#'} className={cn(
                        "flex items-center w-full h-full",
                        open ? "gap-3" : "justify-center"
                      )}>
                        <Icon className={cn(
                          "h-5 w-5 shrink-0",
                          isActive ? "text-blue-700" : "text-gray-600"
                        )} />
                        {open && (
                          <span className="text-sm">
                            {item.name}
                          </span>
                        )}

                        {/* Unread count badge */}
                        {item.showBadge && unreadCount > 0 && open && (
                          <span className="ml-auto px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}

                        {/* Unread badge when collapsed */}
                        {!open && item.showBadge && unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </div>
                );
              })}
              {/* Logout Button */}
              <div className="relative mt-2">
                <SidebarMenuButton
                  asChild
                  tooltip={!open ? "Logout" : undefined}
                  className={cn(
                    "relative rounded-lg transition-all hover:bg-red-50 text-gray-700 hover:text-red-600",
                    open ? "h-11 px-3" : "h-11 px-2 justify-center"
                  )}
                >
                  <button
                    onClick={handleLogout}
                    className={cn(
                      "flex items-center w-full h-full",
                      open ? "gap-3" : "justify-center"
                    )}
                  >
                    <LogOut className="h-5 w-5 shrink-0" />
                    {open && <span className="text-sm">Logout</span>}
                  </button>
                </SidebarMenuButton>
              </div>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      </div>
    </Sidebar>
  );
}

