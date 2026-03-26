import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
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
  Languages
} from 'lucide-react';
import { cn } from '../lib/utils';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  const { logout, isAdmin, isSuperAdmin, company, staff } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

  const navItems = isSuperAdmin 
    ? [{ id: 'super-admin', label: t('super-admin'), icon: ShieldCheck }]
    : [
        { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
        ...(company?.features?.includes('clients') && (isAdmin || staff?.permissions?.includes('clients')) ? [{ id: 'clients', label: t('clients'), icon: Users }] : []),
        ...(company?.features?.includes('estimates') && (isAdmin || staff?.permissions?.includes('estimates')) ? [{ id: 'estimates', label: t('estimates'), icon: FileText }] : []),
        ...(company?.features?.includes('items') && (isAdmin || staff?.permissions?.includes('items')) ? [{ id: 'items', label: t('items'), icon: Package }] : []),
        ...(company?.features?.includes('reminders') && (isAdmin || staff?.permissions?.includes('reminders')) ? [{ id: 'reminders', label: t('reminders'), icon: Bell }] : []),
        ...(company?.features?.includes('insights') ? [{ id: 'insights', label: t('insights'), icon: TrendingUp }] : []),
        ...(company?.features?.includes('sketch') ? [{ id: 'sketch', label: t('sketch'), icon: PenTool }] : []),
        ...(company?.features?.includes('converter') ? [{ id: 'converter', label: t('converter'), icon: Ruler }] : []),
        ...(company?.features?.includes('calculator') ? [{ id: 'calculator', label: t('calculator'), icon: CalcIcon }] : []),
        ...(company?.features?.includes('construction-calc') ? [{ id: 'construction-calc', label: t('construction-calc'), icon: HardHat }] : []),
        ...(isAdmin ? [{ id: 'admin', label: t('admin'), icon: Settings }] : []),
        { id: 'profile', label: t('profile'), icon: User },
      ];

  const languages = [
    { id: 'en', label: 'English' },
    { id: 'hi', label: 'हिंदी' },
    { id: 'gu', label: 'ગુજરાતી' }
  ];

  return (
    <div className="min-h-screen bg-zinc-50 flex">
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
            <img src={company.logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
              <Construction className="text-white w-5 h-5" />
            </div>
          )}
          {!isCollapsed && <span className="font-bold text-zinc-900 truncate">{company?.name || (isSuperAdmin ? t('super-admin') : 'Estimate Pro')}</span>}
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
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

        <div className={cn("p-4 border-t border-zinc-100 space-y-2", isCollapsed && "px-0")}>
          {/* Language Selector */}
          <div className="relative">
            <button
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-500 hover:bg-zinc-50 transition-all font-medium group relative",
                isCollapsed && "justify-center px-0"
              )}
            >
              <Languages className="w-5 h-5 shrink-0" />
              {!isCollapsed && <span className="flex-1 text-left">{languages.find(l => l.id === language)?.label}</span>}
              {isCollapsed && (
                <div className="absolute left-full ml-4 px-3 py-2 bg-zinc-900 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-[100]">
                  {t('language')}
                </div>
              )}
            </button>

            {isLangMenuOpen && (
              <div className={cn(
                "absolute bottom-full mb-2 bg-white border border-zinc-200 rounded-xl shadow-xl z-[110] overflow-hidden",
                isCollapsed ? "left-4 w-32" : "left-0 right-0"
              )}>
                {languages.map((lang) => (
                  <button
                    key={lang.id}
                    onClick={() => {
                      setLanguage(lang.id as any);
                      setIsLangMenuOpen(false);
                    }}
                    className={cn(
                      "w-full px-4 py-2 text-left text-sm hover:bg-zinc-50 transition-all",
                      language === lang.id ? "text-primary font-bold bg-primary/5" : "text-zinc-600"
                    )}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={logout}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all font-medium group relative",
              isCollapsed && "justify-center px-0"
            )}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span>{t('logout')}</span>}
            {isCollapsed && (
              <div className="absolute left-full ml-4 px-3 py-2 bg-red-500 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-[100]">
                {t('logout')}
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-zinc-200 z-50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Construction className="text-primary w-6 h-6" />
          <span className="font-bold text-zinc-900">Estimate Pro</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              const nextLang = language === 'en' ? 'hi' : language === 'hi' ? 'gu' : 'en';
              setLanguage(nextLang as any);
            }}
            className="p-2 bg-zinc-50 rounded-lg text-zinc-600"
          >
            <Languages className="w-5 h-5" />
          </button>
          <button onClick={() => setIsMobileMenuOpen(true)}>
            <Menu className="w-6 h-6 text-zinc-600" />
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] md:hidden">
          <div className="absolute right-0 top-0 bottom-0 w-64 bg-white p-6">
            <div className="flex justify-between items-center mb-8">
              <span className="font-bold text-zinc-900">{t('menu')}</span>
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
                {t('logout')}
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
