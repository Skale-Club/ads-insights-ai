import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, RefreshCw, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboard } from '@/contexts/DashboardContext';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AdsLogo } from '@/components/icons/AdsLogo';
import { APP_CONFIG } from '@/config/app';
import { navItems } from '@/config/navigation';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const { signOut } = useAuth();
  const { lastRefreshed } = useDashboard();

  return (
    <aside
      className={cn(
        'relative flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <SidebarHeader collapsed={collapsed} onToggle={onToggle} />
      <SidebarNav collapsed={collapsed} location={location} />
      <SidebarToggle collapsed={collapsed} onToggle={onToggle} />
      <SidebarFooter collapsed={collapsed} signOut={signOut} lastRefreshed={lastRefreshed} />
    </aside>
  );
}

interface SidebarHeaderProps {
  collapsed: boolean;
  onToggle: () => void;
}

function SidebarHeader({ collapsed, onToggle }: SidebarHeaderProps) {
  return (
    <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
      {!collapsed && (
        <Link to="/dashboard/overview" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-card">
            <AdsLogo size="sm" />
          </div>
          <span className="font-semibold">{APP_CONFIG.name}</span>
        </Link>
      )}
      {collapsed && (
        <Link to="/dashboard/overview" className="mx-auto">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-card">
            <AdsLogo size="sm" />
          </div>
        </Link>
      )}
      {!collapsed && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

interface SidebarNavProps {
  collapsed: boolean;
  location: ReturnType<typeof useLocation>;
}

function SidebarNav({ collapsed, location }: SidebarNavProps) {
  return (
    <nav className="flex-1 space-y-1 p-2">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        const NavIcon = item.icon;

        const navLink = (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            )}
          >
            <NavIcon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        );

        if (collapsed) {
          return (
            <Tooltip key={item.path} delayDuration={0}>
              <TooltipTrigger asChild>{navLink}</TooltipTrigger>
              <TooltipContent side="right" className="font-medium">
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        }

        return navLink;
      })}
    </nav>
  );
}

interface SidebarToggleProps {
  collapsed: boolean;
  onToggle: () => void;
}

function SidebarToggle({ collapsed, onToggle }: SidebarToggleProps) {
  if (!collapsed) return null;

  return (
    <div className="px-2 py-2">
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="w-full h-10 text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          Expand sidebar
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

interface SidebarFooterProps {
  collapsed: boolean;
  signOut: () => void;
  lastRefreshed: Date | null;
}

function SidebarFooter({ collapsed, signOut, lastRefreshed }: SidebarFooterProps) {
  return (
    <div className="border-t border-sidebar-border p-2">
      {lastRefreshed && !collapsed && (
        <div className="mb-2 flex items-center gap-2 px-3 py-2 text-xs text-sidebar-foreground/70">
          <RefreshCw className="h-3 w-3" />
          <span>Updated {lastRefreshed.toLocaleTimeString()}</span>
        </div>
      )}
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            onClick={signOut}
            className={cn(
              'w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              collapsed && 'justify-center px-0'
            )}
          >
            <LogOut className="h-5 w-5" />
            {!collapsed && <span>Sign Out</span>}
          </Button>
        </TooltipTrigger>
        {collapsed && (
          <TooltipContent side="right" className="font-medium">
            Sign Out
          </TooltipContent>
        )}
      </Tooltip>
    </div>
  );
}
