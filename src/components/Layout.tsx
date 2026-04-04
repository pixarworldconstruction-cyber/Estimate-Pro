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
  ShieldCheck,
  User,
  Lock,
  ChevronLeft,
  ChevronRight,
  Calculator as CalcIcon,
  Ruler,
  PenTool,
  TrendingUp,
  Database,
  HardHat,
  Mail,
  Receipt,
  Briefcase,
  Zap,
  PlusCircle,
  Smartphone,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { cn, toDate } from '../lib/utils';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  const { logout, isAdmin, isSuperAdmin, company, staff } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isOffline, setIsOffline] = React.useState(!navigator.onLine);

  React.useEffect(() => {
    if (!staff?.id) return;

    const interval = setInterval(async () => {
      // Only count if tab is active and online
      if (document.visibilityState === 'visible' && navigator.onLine) {
        try {
          const staffRef = doc(db, 'staff', staff.id);
          await updateDoc(staffRef, {
            totalOnlineMinutes: (staff.totalOnlineMinutes || 0) + 1,
            lastActive: serverTimestamp()
          });
        } catch (error) {
          console.error("Error updating online time:", error);
        }
      }
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, [staff?.id, staff?.totalOnlineMinutes]);

  React.useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const navItems = isSuperAdmin 
    ? [
        { id: 'super-admin', label: 'Super Admin', icon: ShieldCheck },
      ]
    : [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        ...(company?.features?.includes('clients') && (isAdmin || staff?.permissions?.includes('clients')) ? [{ id: 'clients', label: 'Clients', icon: Users }] : []),
        ...(company?.features?.includes('estimates') && (isAdmin || staff?.permissions?.includes('estimates')) ? [{ id: 'estimates', label: 'Estimates', icon: FileText }] : []),
        ...(company?.features?.includes('invoices') && (isAdmin || staff?.permissions?.includes('invoices')) ? [{ id: 'invoices', label: 'Invoices', icon: Receipt }] : []),
        ...(company?.features?.includes('projects') && (isAdmin || staff?.permissions?.includes('projects')) ? [{ id: 'projects', label: 'Projects', icon: Briefcase }] : []),
        ...(company?.features?.includes('items') && (isAdmin || staff?.permissions?.includes('items')) ? [{ id: 'items', label: 'Items', icon: Package }] : []),
        ...(company?.features?.includes('reminders') && (isAdmin || staff?.permissions?.includes('reminders')) ? [{ id: 'reminders', label: 'Reminders', icon: Bell }] : []),
        ...(company?.features?.includes('insights') && (isAdmin || staff?.permissions?.includes('insights')) ? [{ id: 'insights', label: 'Business Insights', icon: TrendingUp }] : []),
        ...(company?.features?.includes('sketch') && (isAdmin || staff?.permissions?.includes('sketch')) ? [{ id: 'sketch', label: 'Sketch Pad', icon: PenTool }] : []),
        ...(company?.features?.includes('converter') && (isAdmin || staff?.permissions?.includes('converter')) ? [{ id: 'converter', label: 'Unit Conversion', icon: Ruler }] : []),
        ...(company?.features?.includes('calculator') && (isAdmin || staff?.permissions?.includes('calculator')) ? [{ id: 'calculator', label: 'Calculator', icon: CalcIcon }] : []),
        ...(company?.features?.includes('construction-calc') && (isAdmin || staff?.permissions?.includes('construction-calc')) ? [{ id: 'construction-calc', label: 'Engineering Toolset', icon: HardHat }] : []),
        { id: 'civil-drawing', label: 'Civil Drawing', icon: PenTool },
        { id: 'admin', label: 'Business Profile', icon: Settings },
        { id: 'profile', label: 'My Profile', icon: User },
        { id: 'contact-support', label: 'Contact Us', icon: Mail },
      ];

  const handleNavClick = (id: string) => {
    if (id === 'civil-drawing') {
      window.open('https://civil-drawings.vercel.app/', '_blank');
      return;
    }
    setActiveTab(id);
    setIsMobileMenuOpen(false);
  };

  const getRemainingDays = () => {
    if (!company?.expiryDate) return 0;
    const expiry = toDate(company.expiryDate);
    const today = new Date();
    const diff = expiry.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const remainingDays = getRemainingDays();
  const isTrial = company?.status === 'trial';
  const isExpired = company?.status === 'expired' || (remainingDays <= 0);

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row">
      {/* Expiry Notice Banner */}
      {isExpired && isAdmin && !isSuperAdmin && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-red-600 text-white px-4 py-2 flex items-center justify-center gap-3 shadow-lg animate-in fade-in slide-in-from-top-4">
          <AlertTriangle className="w-5 h-5 animate-pulse" />
          <p className="text-sm font-bold">
            {isTrial 
              ? "If not purchase any plan your all data will delete in next 7 days"
              : "Your subscription has expired. Please renew within 30 days to avoid permanent data deletion."}
          </p>
          <button 
            onClick={() => setActiveTab('subscription')}
            className="ml-4 px-4 py-1 bg-white text-red-600 rounded-full text-xs font-black uppercase tracking-widest hover:bg-zinc-100 transition-all"
          >
            Renew Now
          </button>
        </div>
      )}

      {/* Sidebar Desktop */}
      <aside className={cn(
        "hidden md:flex flex-col bg-white border-r border-zinc-200 transition-all duration-300 relative h-screen sticky top-0",
        isCollapsed ? "w-20" : "w-64"
      )}>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-white border border-zinc-200 rounded-full flex items-center justify-center z-50 hover:bg-zinc-50 transition-all shadow-sm"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className={cn("p-6 flex items-center gap-3 border-bottom border-zinc-100", isCollapsed && "justify-center px-0")}>
          {company?.logoUrl ? (
            <img 
              key={company.logoUrl}
              src={company.logoUrl} 
              alt="Logo" 
              className="w-8 h-8 rounded-lg object-cover" 
              referrerPolicy="no-referrer" 
            />
          ) : (
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
              <Construction className="text-white w-5 h-5" />
            </div>
          )}
          {!isCollapsed && <span className="font-bold text-zinc-900 truncate">{company?.name || (isSuperAdmin ? 'Super Admin' : (isAdmin ? 'Admin Panel' : 'Construction Pro'))}</span>}
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          {isOffline && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-2 text-amber-700 animate-pulse">
              <Database className="w-4 h-4" />
              <div className="text-[10px] font-bold uppercase tracking-wider">Offline Mode</div>
            </div>
          )}
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium group relative",
                activeTab === item.id 
                  ? "bg-primary text-white shadow-lg shadow-primary/20" 
                  : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900",
                isCollapsed && "justify-center px-0"
              )}
            >
              <item.icon className={cn("w-5 h-5 shrink-0", activeTab === item.id ? "text-white" : "text-zinc-400 group-hover:text-zinc-900")} />
              {!isCollapsed && <span>{item.label}</span>}
              {isCollapsed && (
                <div className="absolute left-full ml-4 px-3 py-2 bg-zinc-900 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-[100]">
                  {item.label}
                </div>
              )}
            </button>
          ))}
        </nav>

        <div className={cn("p-4 border-t border-zinc-100", isCollapsed && "px-0")}>
          {!isSuperAdmin && (
            <>
              <button
                onClick={() => setActiveTab('subscription')}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium mb-2",
                  activeTab === 'subscription' 
                    ? "bg-primary text-white shadow-lg shadow-primary/20" 
                    : "text-zinc-500 hover:bg-zinc-50"
                )}
              >
                <Zap className={cn("w-5 h-5 shrink-0", activeTab === 'subscription' ? "text-white" : "text-primary")} />
                {!isCollapsed && <span>Upgrade Plan</span>}
                {isCollapsed && (
                  <div className="absolute left-full ml-4 px-3 py-2 bg-primary text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-[100]">
                    Upgrade Plan
                  </div>
                )}
              </button>

              <button
                onClick={() => setActiveTab('addons')}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium mb-2",
                  activeTab === 'addons' 
                    ? "bg-primary text-white shadow-lg shadow-primary/20" 
                    : "text-zinc-500 hover:bg-zinc-50"
                )}
              >
                <PlusCircle className={cn("w-5 h-5 shrink-0", activeTab === 'addons' ? "text-white" : "text-primary")} />
                {!isCollapsed && <span>Addons</span>}
                {isCollapsed && (
                  <div className="absolute left-full ml-4 px-3 py-2 bg-primary text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-[100]">
                    Addons
                  </div>
                )}
              </button>
            </>
          )}

          <button
            onClick={logout}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all font-medium group relative",
              isCollapsed && "justify-center px-0"
            )}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span>Logout</span>}
            {isCollapsed && (
              <div className="absolute left-full ml-4 px-3 py-2 bg-red-500 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-[100]">
                Logout
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-zinc-200 z-50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Construction className="text-primary w-6 h-6" />
          <span className="font-bold text-zinc-900">Construction Pro</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(true)}>
          <Menu className="w-6 h-6 text-zinc-600" />
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] md:hidden">
          <div className="absolute right-0 top-0 bottom-0 w-64 bg-white flex flex-col">
            <div className="p-6 flex justify-between items-center border-b border-zinc-100">
              <span className="font-bold text-zinc-900">Menu</span>
              <button onClick={() => setIsMobileMenuOpen(false)}>
                <X className="w-6 h-6 text-zinc-600" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-6 space-y-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-left",
                    activeTab === item.id 
                      ? "bg-primary text-white" 
                      : "text-zinc-500 hover:bg-zinc-50"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </button>
              ))}

              {!isSuperAdmin && (
                <div className="pt-4 space-y-2 border-t border-zinc-100 mt-4">
                  <button
                    onClick={() => handleNavClick('subscription')}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-left",
                      activeTab === 'subscription' 
                        ? "bg-primary text-white" 
                        : "text-zinc-500 hover:bg-zinc-50"
                    )}
                  >
                    <Zap className={cn("w-5 h-5", activeTab === 'subscription' ? "text-white" : "text-primary")} />
                    Upgrade Plan
                  </button>
                  <button
                    onClick={() => handleNavClick('addons')}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-left",
                      activeTab === 'addons' 
                        ? "bg-primary text-white" 
                        : "text-zinc-500 hover:bg-zinc-50"
                    )}
                  >
                    <PlusCircle className={cn("w-5 h-5", activeTab === 'addons' ? "text-white" : "text-primary")} />
                    Addons
                  </button>
                </div>
              )}

              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all font-medium mt-4 text-left"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className={cn(
        "flex-1 md:p-8 p-4 pt-20 md:pt-8 overflow-y-auto",
        isExpired && isAdmin && !isSuperAdmin && "pt-28 md:pt-20"
      )}>
        {children}
      </main>
    </div>
  );
}
