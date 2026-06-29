import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrg } from '@/lib/orgContext';
import { base44 } from '@/api/base44Client';
import { Search, Bell, LogOut, User, ChevronDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import GlobalSearch from '@/components/shared/GlobalSearch';

export default function TopBar() {
  const { currentUser, organization } = useOrg();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setShowSearch(true); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (organization?.id) {
      base44.entities.Notification.filter({ org_id: organization.id, is_read: false }, '-created_date', 5)
        .then(setNotifications).catch(() => {});
    }
  }, [organization?.id]);

  const handleLogout = () => {
    base44.auth.logout('/login');
  };

  const markAllRead = async () => {
    for (const n of notifications) {
      await base44.entities.Notification.update(n.id, { is_read: true });
    }
    setNotifications([]);
  };

  return (
    <>
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-40">
        <button
          onClick={() => setShowSearch(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-500 transition-colors w-72"
        >
          <Search className="w-4 h-4" />
          <span>Search leads, deals, contacts...</span>
          <kbd className="ml-auto text-xs bg-white px-1.5 py-0.5 rounded border font-mono">⌘K</kbd>
        </button>

        <div className="flex items-center gap-3">
          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell className="w-5 h-5 text-gray-600" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="flex items-center justify-between px-3 py-2">
                <p className="font-semibold text-sm">Notifications</p>
                {notifications.length > 0 && (
                  <button onClick={markAllRead} className="text-xs text-indigo-600 hover:underline">
                    Mark all read
                  </button>
                )}
              </div>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-500">No new notifications</div>
              ) : (
                notifications.map((n) => (
                  <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-1 py-2">
                    <span className="font-medium text-sm">{n.title}</span>
                    <span className="text-xs text-gray-500">{n.message}</span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                  <span className="text-sm font-semibold text-indigo-600">
                    {currentUser?.full_name?.[0] || 'U'}
                  </span>
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-medium">{currentUser?.full_name || 'User'}</p>
                  <p className="text-xs text-gray-500 capitalize">{currentUser?.role?.replace('_', ' ') || 'Team Member'}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <User className="w-4 h-4 mr-2" /> Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="w-4 h-4 mr-2" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {showSearch && <GlobalSearch onClose={() => setShowSearch(false)} />}
    </>
  );
}
