import { LayoutDashboard, Megaphone, KeyRound, Search, Lightbulb, Settings, FolderOpen, FileText, Users, DollarSign, BarChart3, Target, LucideIcon } from 'lucide-react';

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { path: '/dashboard/overview', label: 'Overview', icon: LayoutDashboard },
  { path: '/dashboard/campaigns', label: 'Campaigns', icon: Megaphone },
  { path: '/dashboard/ad-groups', label: 'Ad Groups', icon: FolderOpen },
  { path: '/dashboard/ads', label: 'Ads', icon: FileText },
  { path: '/dashboard/keywords', label: 'Keywords', icon: KeyRound },
  { path: '/dashboard/search-terms', label: 'Search Terms', icon: Search },
  { path: '/dashboard/audiences', label: 'Audiences', icon: Users },
  { path: '/dashboard/budgets', label: 'Budgets', icon: DollarSign },
  { path: '/dashboard/conversions', label: 'Conversions', icon: Target },
  { path: '/dashboard/reports', label: 'Reports', icon: BarChart3 },
  { path: '/dashboard/recommendations', label: 'AI Recommendations', icon: Lightbulb },
  { path: '/settings', label: 'Settings', icon: Settings },
];
