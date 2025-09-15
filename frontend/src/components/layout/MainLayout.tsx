import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { UserNav } from "./UserNav";
import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function MainLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
            <div className="flex items-center justify-between h-full px-6">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="h-8 w-8" />
                
                {/* Search */}
                <div className="relative max-w-md w-full">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tasks, projects..."
                    className="pl-10 bg-muted/50 border-0 focus-visible:ring-1"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full text-xs flex items-center justify-center text-destructive-foreground">
                    3
                  </span>
                </Button>
                <UserNav />
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6 bg-gradient-subtle">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}