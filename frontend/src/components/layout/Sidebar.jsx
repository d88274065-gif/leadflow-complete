import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useOrg } from '@/lib/orgContext';
import {
  LayoutDashboard, Users, Target, Building2, Handshake,
  CheckSquare, MessageSquare, BarChart3, Settings, ChevronLeft,
  ChevronRight, Sparkles, Search, Bell, LogOut, CreditCard,
  Shield, Activity, UserCog
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Leads', icon: Target, path: '/leads' },
  { label: 'Deals', icon: Handshake, path: '/deals' },
  { label: 'Contacts', icon: Users, path: '/contacts' },
  { label: 'Companies', icon: Building2, path: '/companies' },
  { label: 'Tasks', icon: CheckSquare, path: '/tasks' },
  { label: 'Pipeline', icon: Activity, path: '/pipeline' },
  { label: 'Messages', icon: MessageSquare, path: '/messages' },
  { label: 'AI Assistant', icon: Sparkles, path: '/ai-assistant' },
  { label: 'Analytics', icon: BarChart3, path: '/analytics' },
];

const bottomItems = [
  { label: 'Settings', icon: Settings, path: '/settings' },
  { label: 'Billing', icon: CreditCard, path: '/billing' },
];

export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();
  const { currentUser, organization, isAdmin } = useOrg();

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <aside className={`fixed left-0 top-0 h-screen bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))] flex flex-col transition-sidebar z-50 ${collapsed ? 'w-[68px]' : 'w-[260px]'}`}>
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-[hsl(var(--sidebar-border))]">
        <div className="w-8 h-8 rounded-lg bg-[hsl(var(--sidebar-primary))] flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        {!collapsed && <span className="ml-3 font-bold text-lg tracking-tight">LeadFlow AI</span>}
      </div>

      {/* Organization */}
      {!collapsed && organization && (
        <div className="px-4 py-3 border-b border-[hsl(var(--sidebar-border))]">
          <p className="text-xs text-[hsl(var(--sidebar-foreground))]/60 uppercase tracking-wider">Workspace</p>
          <p className="text-sm font-medium truncate mt-0.5">{organization.name}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group
              ${isActive(item.path)
                ? 'bg-[hsl(var(--sidebar-primary))] text-white shadow-lg shadow-indigo-500/20'
                : 'text-[hsl(var(--sidebar-foreground))]/70 hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]'
              }`}
            title={collapsed ? item.label : undefined}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}

        {isAdmin() && (
          <Link
            to="/team"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
              ${isActive('/team')
                ? 'bg-[hsl(var(--sidebar-primary))] text-white shadow-lg shadow-indigo-500/20'
                : 'text-[hsl(var(--sidebar-foreground))]/70 hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]'
              }`}
          >
            <UserCog className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>Team</span>}
          </Link>
        )}
        {isAdmin() && (
          <Link
            to="/admin"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
              ${isActive('/admin')
                ? 'bg-[hsl(var(--sidebar-primary))] text-white shadow-lg shadow-indigo-500/20'
                : 'text-[hsl(var(--sidebar-foreground))]/70 hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]'
              }`}
          >
            <Shield className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>Admin</span>}
          </Link>
        )}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 border-t border-[hsl(var(--sidebar-border))] space-y-1">
        {bottomItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200
              ${isActive(item.path)
                ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-foreground))]'
                : 'text-[hsl(var(--sidebar-foreground))]/60 hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]'
              }`}
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}
      </div>

      {/* Toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors"
      >
        {collapsed ? <ChevronRight className="w-3 h-3 text-gray-600" /> : <ChevronLeft className="w-3 h-3 text-gray-600" />}
      </button>
    </aside>
  );
}
