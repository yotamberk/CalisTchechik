import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Dumbbell,
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardList,
  LogOut,
  ChevronDown,
  Menu,
  X,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { Avatar } from '@/components/ui/Avatar';
import { RoleBadge } from '@/components/ui/Badge';
import { useQueryClient } from '@tanstack/react-query';

const navItems = {
  ADMIN: [
    { to: '/admin', label: 'Admin Panel', icon: ShieldAlert },
    { to: '/trainer', label: 'Trainer View', icon: LayoutDashboard },
    { to: '/trainee', label: 'Trainee View', icon: ClipboardList },
  ],
  TRAINER: [
    { to: '/trainer', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/trainer/exercises', label: 'Exercises', icon: Dumbbell },
    { to: '/trainer/trainees', label: 'Trainees', icon: Users },
    { to: '/trainer/plans', label: 'Plans', icon: BookOpen },
  ],
  TRAINEE: [
    { to: '/trainee', label: 'My Plan', icon: ClipboardList },
    { to: '/trainee/progress', label: 'Progress', icon: TrendingUp },
  ],
};

export function AppLayout() {
  const { user, activeRole, availableRoles, impersonating } = useAuthStore();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const items = activeRole ? navItems[activeRole] ?? [] : [];

  async function handleLogout() {
    await api.post('/auth/logout');
    useAuthStore.getState().clearAuth();
    qc.clear();
    navigate('/login');
  }

  async function handleSwitchRole(role: string) {
    await api.post('/auth/switch-role', { role });
    const me = await api.get<import('@calist/shared').AuthMeResponse & { impersonating?: boolean; realUserId?: string }>('/auth/me');
    useAuthStore.getState().setAuth(me);
    qc.clear();
    setRoleMenuOpen(false);
    const defaultRoutes: Record<string, string> = {
      ADMIN: '/admin',
      TRAINER: '/trainer',
      TRAINEE: '/trainee',
    };
    navigate(defaultRoutes[role] ?? '/');
  }

  async function handleStopImpersonating() {
    await api.post('/auth/stop-impersonating');
    const me = await api.get<import('@calist/shared').AuthMeResponse & { impersonating?: boolean; realUserId?: string }>('/auth/me');
    useAuthStore.getState().setAuth(me);
    qc.clear();
    navigate('/admin');
  }

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-gray-900 border-r border-gray-800
          flex flex-col transition-transform duration-200
          lg:relative lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-800">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <Dumbbell size={16} className="text-white" />
          </div>
          <span className="font-bold text-lg text-white tracking-tight">CalisTchechik</span>
        </div>

        {/* Impersonation banner */}
        {impersonating && (
          <div className="mx-3 mt-3 p-2 bg-yellow-900/40 border border-yellow-700/50 rounded-lg text-xs text-yellow-400">
            <span>Viewing as {user?.name}</span>
            <button
              onClick={handleStopImpersonating}
              className="ml-2 underline hover:text-yellow-300"
            >
              Stop
            </button>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/trainer' || to === '/trainee' || to === '/admin'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-900/60 text-brand-400 border border-brand-800/50'
                    : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800'
                }`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: user info + role switcher */}
        <div className="border-t border-gray-800 p-3">
          {/* Role switcher */}
          {availableRoles.length > 1 && (
            <div className="relative mb-2">
              <button
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                className="w-full flex items-center justify-between px-3 py-2 bg-gray-800 rounded-lg text-sm text-gray-300 hover:bg-gray-700 transition-colors"
              >
                <span>Role: <strong className="text-white">{activeRole}</strong></span>
                <ChevronDown size={14} />
              </button>
              {roleMenuOpen && (
                <div className="absolute bottom-full mb-1 left-0 right-0 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden shadow-lg">
                  {availableRoles.map((role) => (
                    <button
                      key={role}
                      onClick={() => handleSwitchRole(role)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-700 transition-colors ${
                        role === activeRole ? 'text-brand-400' : 'text-gray-300'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* User */}
          <div className="flex items-center gap-3">
            <Avatar name={user?.name ?? ''} src={user?.avatar} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-100 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
            <button onClick={handleLogout} className="btn-ghost p-1.5" title="Logout">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-gray-800">
          <button onClick={() => setSidebarOpen(true)} className="btn-ghost p-1.5">
            <Menu size={20} />
          </button>
          <span className="font-bold text-white">CalisTchechik</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
