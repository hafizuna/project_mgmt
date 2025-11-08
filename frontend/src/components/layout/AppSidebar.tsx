import { NavLink, useLocation } from "react-router-dom";
import {
  BarChart3,
  Calendar,
  CheckSquare,
  FolderKanban,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Users,
  Clock,
  Shield,
  Database,
  Bell,
  TestTube,
  LayoutGrid,
  BookOpen,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuthStore } from "@/lib/stores/auth";

// Base navigation items for all users
const baseNavigationItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Projects", url: "/projects", icon: FolderKanban },
  { title: "Tasks", url: "/tasks", icon: CheckSquare },
  { title: "Task Board", url: "/tasks/board", icon: LayoutGrid },
  { title: "Meetings", url: "/meetings", icon: Calendar },
  { title: "Knowledge Base", url: "/knowledge", icon: BookOpen },
];

// Manager+ specific navigation items
const managerNavigationItems = [
  { title: "Reports", url: "/reports", icon: BarChart3 },
];

// Team member specific items
const teamNavigationItems = [
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Timesheet", url: "/timesheet", icon: Clock },
];

const adminItems = [
  { title: "Team Management", url: "/team", icon: Users },
  { title: "User Management", url: "/admin/users", icon: Users },
  { title: "Organization", url: "/admin/organization", icon: Database },
  { title: "Reports", url: "/admin/reports", icon: BarChart3 },
  { title: "Audit Logs", url: "/admin/audit", icon: Shield },
];

const settingsItems = [
  { title: "Settings", url: "/settings", icon: Settings },
];

const notificationItems = [
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "Notification Demo", url: "/notifications/demo", icon: TestTube },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { user } = useAuthStore();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;
  
  const isAdmin = user?.role === 'Admin';
  const isManager = user?.role === 'Manager';
  const isTeam = user?.role === 'Team';
  
  // Build navigation items based on user role
  const getNavigationItems = () => {
    let items = [...baseNavigationItems];
    
    // Add role-specific items
    if (isManager) {
      items = [...items, ...managerNavigationItems];
    }
    
    if (isTeam) {
      items = [...items, ...teamNavigationItems];
    }
    
    return items;
  };
  
  const navigationItems = getNavigationItems();

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  const getNavClassName = (path: string) => {
    return isActive(path)
      ? "bg-primary text-primary-foreground font-medium shadow-sm"
      : "hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors";
  };

  return (
    <Sidebar className={collapsed ? "w-16" : "w-64"} collapsible="icon">
      <SidebarContent className="p-4">
        {/* Logo */}
        <div className="mb-8 px-2">
          {!collapsed ? (
            <h1 className="text-xl font-bold text-primary">ProjectFlow</h1>
          ) : (
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">P</span>
            </div>
          )}
        </div>

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${getNavClassName(
                        item.url
                      )}`}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && <span className="font-medium">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
              Administration
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${getNavClassName(
                          item.url
                        )}`}
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        {!collapsed && <span className="font-medium">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Notifications - for testing */}
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            Notifications
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {notificationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${getNavClassName(
                        item.url
                      )}`}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && <span className="font-medium">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${getNavClassName(
                        item.url
                      )}`}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && <span className="font-medium">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}