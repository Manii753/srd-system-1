'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
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
  BadgeCheckIcon,
  Edit,
  FileSpreadsheet,
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

  const userRole = session?.user?.role;

  // Fetch unread count
  useEffect(() => {
    if (session?.user?.email) {
      const fetchUnreadCount = async () => {
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
      
      // Refresh every 10 seconds
      const interval = setInterval(fetchUnreadCount, 10000);
      
      // Listen for manual refresh events
      const handleRefresh = () => fetchUnreadCount();
      window.addEventListener('refreshUnreadCount', handleRefresh);
      
      return () => {
        clearInterval(interval);
        window.removeEventListener('refreshUnreadCount', handleRefresh);
      };
    }
  }, [session]);

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
          { name: 'Home', href: '/dashboard/admin', icon: LayoutDashboard, gradient: 'from-blue-500 to-cyan-500' },
          { name: 'Inbox', href: '/inbox', icon: Inbox, gradient: 'from-pink-500 to-rose-500', showBadge: true },
          { name: 'All SRDs', href: '/srd', icon: FileText, gradient: 'from-purple-500 to-pink-500' },
          { name: 'Production', href: '/production', icon: Package, gradient: 'from-red-500 to-orange-500' },
          { name: 'Settings', href: '/settings', icon: Settings, gradient: 'from-gray-500 to-slate-600' },
          { name: 'Departments', href: '/departments', icon: Edit, gradient: 'from-blue-500 to-indigo-500' },
          { name: 'Stages', href: '/stages', icon: GitBranch, gradient: 'from-teal-500 to-cyan-500' },
          { name: 'SRD Fields', href: '/srdfields', icon: FileSpreadsheet, gradient: 'from-green-500 to-emerald-500' },
          { name: 'Users', href: '/users', icon: Users, gradient: 'from-orange-500 to-red-500' },
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
            name: `${stageNames[userRole]} Dashboard`, 
            href: `/dashboard/${userRole}`, 
            icon: LayoutDashboard, 
            gradient: 'from-blue-500 to-cyan-500' 
          },
          { 
            name: 'Inbox', 
            href: '/inbox', 
            icon: Inbox, 
            gradient: 'from-pink-500 to-rose-500',
            showBadge: true
          },
        ]);
      } else {
        // Fetch department info for dynamic menu
        const response = await fetch('/api/departments');
        const data = await response.json();
        
        if (data.success) {
          const userDept = data.data.find(d => d.slug === userRole);
          
          if (userDept) {
            // Only VMD can create SRDs
            const menuItems = [
              { 
                name: 'Home', 
                href: `/dashboard/${userRole}`, 
                icon: LayoutDashboard, 
                gradient: 'from-blue-500 to-cyan-500' 
              },
              { 
                name: 'Inbox', 
                href: '/inbox', 
                icon: Inbox, 
                gradient: 'from-pink-500 to-rose-500',
                showBadge: true
              }
            ];

            // Add Create SRD only for VMD
            if (userRole === 'vmd') {
              menuItems.push({ 
                name: 'Create SRD', 
                href: `/dashboard/${userRole}/create`, 
                icon: Plus, 
                gradient: 'from-emerald-500 to-teal-500' 
              });
            }

            menuItems.push(
              { 
                name: 'My SRDs', 
                href: `/srd?department=${userRole}`, 
                icon: FileText, 
                gradient: 'from-purple-500 to-pink-500' 
              },
              { 
                name: 'In Progress', 
                href: `/srd?department=${userRole}&status=in-progress`, 
                icon: Package, 
                gradient: 'from-yellow-500 to-orange-500' 
              },
              { 
                name: 'Completed', 
                href: `/srd?department=${userRole}&status=approved`, 
                icon: CheckCircle, 
                gradient: 'from-green-500 to-emerald-500' 
              }
            );

            // Add Production and Ready For Production tabs for VMD
            if (userRole === 'vmd') {
              menuItems.push(
                { 
                  name: 'Production', 
                  href: '/dashboard/vmd/production', 
                  icon: Factory, 
                  gradient: 'from-orange-500 to-red-500' 
                }
              );
            }

            setMenuItems(menuItems);
          }
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
    <Sidebar className="border-r-0 transition-all duration-400" collapsible="icon">
      <div className="h-full bg-gradient-to-br from-slate-50 via-white to-slate-50" onClick={(e) => {
        if (state === 'collapsed') {
          e.stopPropagation();
        }
      }}>
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),rgba(255,255,255,0))]" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        </div>

        <SidebarHeader className={cn("relative", open ? "p-6 pb-8" : "p-4 pb-6")}>
          <div className={cn("relative", !open && "flex flex-col items-center")}>
            {open && (
              <div>
                <h2 className="text-xl text-nowrap font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  SRD System
                </h2>
              </div>
            )}

            {!open && (
              <button
                onClick={toggleSidebar}
                className="w-full rounded-lg p-2 bg-white/60 hover:bg-white shadow-sm hover:shadow-md group border border-slate-200/50"
              >
                <PanelLeftOpen className="w-4 h-4 text-slate-600 group-hover:text-slate-900 mx-auto" />
              </button>
            )}
          </div>

          {open && (
            <button
              onClick={toggleSidebar}
              className="absolute top-6 right-6 rounded-lg p-1.5 bg-white/60 hover:bg-white shadow-sm hover:shadow-md group border border-slate-200/50 z-10"
            >
              <PanelLeftClose className="w-4 h-4 text-slate-600 group-hover:text-slate-900" />
            </button>
          )}

          {open && (
            <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
          )}
        </SidebarHeader>

        <SidebarContent className="relative px-2">
          <SidebarGroup>
            <SidebarMenu className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.href === activeItemHref;

                return (
                  <div key={item.href} className="relative group">
                    {isActive && (
                      <div className={cn(
                        "absolute -left-3 top-0 bottom-0 w-1 rounded-r-full bg-gradient-to-b",
                        item.gradient
                      )} />
                    )}
                    
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={!open ? item.name : undefined}
                      className={cn(
                        "relative rounded-xl hover:shadow-lg",
                        isActive
                          ? "bg-gradient-to-r text-white shadow-lg shadow-blue-500/20"
                          : "hover:bg-white/60 text-gray-700 hover:text-gray-900",
                        isActive && item.gradient,
                        open ? "h-12 px-4" : "h-12 px-2 mb-2 justify-center"
                      )}
                    >
                      <Link href={item.href} className={cn(
                        "flex items-center w-full h-full",
                        open ? "gap-3" : "justify-center"
                      )}>
                        <div className={cn(
                          "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                          isActive
                            ? "bg-white/20 backdrop-blur-sm"
                            : "bg-slate-100 group-hover:bg-white"
                        )}>
                          <Icon className={cn(
                            "h-5 w-5",
                            isActive ? "text-white" : "text-gray-600 group-hover:text-gray-900"
                          )} />
                        </div>
                        {open && (
                          <>
                            <span className={cn(
                              "font-medium text-sm",
                              isActive && "font-semibold"
                            )}>
                              {item.name}
                            </span>
                            
                            {/* Unread count badge */}
                            {item.showBadge && unreadCount > 0 && (
                              <span className="ml-auto mr-2 px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full min-w-[20px] text-center">
                                {unreadCount > 99 ? '99+' : unreadCount}
                              </span>
                            )}
                            
                            <ChevronRight className={cn(
                              "ml-auto h-4 w-4 shrink-0",
                              isActive
                                ? "opacity-100 text-white"
                                : "opacity-0 group-hover:opacity-100"
                            )} />
                          </>
                        )}
                        
                        {/* Unread badge when collapsed */}
                        {!open && item.showBadge && unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full min-w-[18px] text-center">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>

                    {!isActive && (
                      <div className={cn(
                        "absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 -z-10 blur-xl",
                        `bg-gradient-to-r ${item.gradient}`
                      )} />
                    )}
                  </div>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>

          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-50/50 to-transparent pointer-events-none" />
        </SidebarContent>
      </div>
    </Sidebar>
  );
}
