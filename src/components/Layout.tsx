import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Package, 
  Bell, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Construction,
  ShieldCheck
} from 'lucide-react';
import { cn } from '../lib/utils';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  const { logout, isAdmin, isSuperAdmin, company } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = isSuperAdmin 
    ? [{ id: 'super-admin', label: 'Super Admin', icon: ShieldCheck }]
    : [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        ...(company?.features?.includes('clients') ? [{ id: 'clients', label: 'Clients', icon: Users }] : []),
        ...(company?.features?.includes('estimates') ? [{ id: 'estimates', label: 'Estimates', icon: FileText }] : []),
        ...(company?.features?.includes('items') ? [{ id: 'items', label: 'Items', icon: Package }] : []),
        ...(company?.features?.includes('reminders') ? [{ id: 'reminders', label: 'Reminders', icon: Bell }] : []),
        ...(isAdmin ? [{ id: 'admin', label: 'Admin Panel (Settings)', icon: Settings }] : []),
      ];

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-zinc-200">
        <div className="p-6 flex items-center gap-3 border-bottom border-zinc-100">
          {company?.logoUrl ? (
            <img src={company.logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Construction className="text-white w-5 h-5" />
            </div>
          )}
          <span className="font-bold text-zinc-900 truncate">{company?.name || (isSuperAdmin ? 'Super Admin' : 'Estimate Pro')}</span>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium",
                activeTab === item.id 
                  ? "bg-primary text-white shadow-lg shadow-primary/20" 
                  : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-100">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all font-medium"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-zinc-200 z-50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Construction className="text-primary w-6 h-6" />
          <span className="font-bold text-zinc-900">Estimate Pro</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(true)}>
          <Menu className="w-6 h-6 text-zinc-600" />
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] md:hidden">
          <div className="absolute right-0 top-0 bottom-0 w-64 bg-white p-6">
            <div className="flex justify-between items-center mb-8">
              <span className="font-bold text-zinc-900">Menu</span>
              <button onClick={() => setIsMobileMenuOpen(false)}>
                <X className="w-6 h-6 text-zinc-600" />
              </button>
            </div>
            <nav className="space-y-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium",
                    activeTab === item.id 
                      ? "bg-primary text-white" 
                      : "text-zinc-500 hover:bg-zinc-50"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </button>
              ))}
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all font-medium mt-4"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 md:p-8 p-4 pt-20 md:pt-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
