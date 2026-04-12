import React, { useState } from 'react';
import { 
  ShoppingBag, 
  ShoppingCart, 
  UserCheck, 
  FileText, 
  Repeat, 
  Truck, 
  CreditCard, 
  FileSignature, 
  Zap,
  Users,
  Receipt,
  Package,
  Wallet,
  BookOpen,
  PieChart,
  BarChart3,
  ChevronRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import InvoiceBuilder from './InvoiceBuilder';
import PaymentReceiptManager from './PaymentReceiptManager';
import CustomerManager from './CustomerManager';

type MainTab = 'sale' | 'purchase' | 'accountant';

export default function Accounts() {
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('sale');
  const [activeSubView, setActiveSubView] = useState<string>('Invoice');

  const saleItems = [
    { name: 'Customer', icon: Users },
    { name: 'Sales order', icon: ShoppingBag },
    { name: 'Invoice', icon: FileText },
    { name: 'Recurring Invoice', icon: Repeat },
    { name: 'Delivery Challans', icon: Truck },
    { name: 'Payment Received', icon: CreditCard },
    { name: 'Credit Notes', icon: FileSignature },
    { name: 'E-way Bills', icon: Zap },
  ];

  const purchaseItems = [
    { name: 'Vendor', icon: Users },
    { name: 'Expense', icon: Receipt },
    { name: 'Purchase order', icon: Package },
    { name: 'Bills', icon: FileText },
    { name: 'Payment Made', icon: Wallet },
    { name: 'Vendor Credit', icon: FileSignature },
  ];

  const accountantItems = [
    { name: 'Manual journals', icon: BookOpen },
    { name: 'Charts of accounts', icon: PieChart },
    { name: 'Reports', icon: BarChart3 },
  ];

  const renderSubContent = () => {
    if (activeMainTab === 'sale') {
      if (activeSubView === 'Customer') return <CustomerManager />;
      if (activeSubView === 'Invoice') return <InvoiceBuilder />;
      if (activeSubView === 'Payment Received') return <PaymentReceiptManager />;
    }

    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-zinc-200">
        <div className="w-16 h-16 bg-zinc-50 rounded-2xl flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-zinc-300" />
        </div>
        <h3 className="text-lg font-bold text-zinc-900">{activeSubView} Section</h3>
        <p className="text-zinc-500">This feature is coming soon.</p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold text-zinc-900">Accounts</h1>
      </div>

      {/* Main Tabs */}
      <div className="flex p-1 bg-zinc-100 rounded-2xl w-full md:w-fit">
        {(['sale', 'purchase', 'accountant'] as MainTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveMainTab(tab);
              // Set default subview for each tab
              if (tab === 'sale') setActiveSubView('Invoice');
              if (tab === 'purchase') setActiveSubView('Vendor');
              if (tab === 'accountant') setActiveSubView('Reports');
            }}
            className={cn(
              "flex-1 md:flex-none px-8 py-2.5 rounded-xl font-bold text-sm transition-all uppercase tracking-wider",
              activeMainTab === tab 
                ? "bg-white text-primary shadow-sm" 
                : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1 space-y-2">
          {activeMainTab === 'sale' && saleItems.map((item) => (
            <button
              key={item.name}
              onClick={() => setActiveSubView(item.name)}
              className={cn(
                "w-full flex items-center justify-between p-4 rounded-2xl transition-all group",
                activeSubView === item.name 
                  ? "bg-primary text-white shadow-lg shadow-primary/20" 
                  : "bg-white text-zinc-600 hover:bg-zinc-50 border border-zinc-100"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className={cn("w-5 h-5", activeSubView === item.name ? "text-white" : "text-zinc-400 group-hover:text-primary")} />
                <span className="font-bold text-sm">{item.name}</span>
              </div>
              <ChevronRight className={cn("w-4 h-4 transition-transform", activeSubView === item.name ? "translate-x-1" : "text-zinc-300")} />
            </button>
          ))}

          {activeMainTab === 'purchase' && purchaseItems.map((item) => (
            <button
              key={item.name}
              onClick={() => setActiveSubView(item.name)}
              className={cn(
                "w-full flex items-center justify-between p-4 rounded-2xl transition-all group",
                activeSubView === item.name 
                  ? "bg-primary text-white shadow-lg shadow-primary/20" 
                  : "bg-white text-zinc-600 hover:bg-zinc-50 border border-zinc-100"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className={cn("w-5 h-5", activeSubView === item.name ? "text-white" : "text-zinc-400 group-hover:text-primary")} />
                <span className="font-bold text-sm">{item.name}</span>
              </div>
              <ChevronRight className={cn("w-4 h-4 transition-transform", activeSubView === item.name ? "translate-x-1" : "text-zinc-300")} />
            </button>
          ))}

          {activeMainTab === 'accountant' && accountantItems.map((item) => (
            <button
              key={item.name}
              onClick={() => setActiveSubView(item.name)}
              className={cn(
                "w-full flex items-center justify-between p-4 rounded-2xl transition-all group",
                activeSubView === item.name 
                  ? "bg-primary text-white shadow-lg shadow-primary/20" 
                  : "bg-white text-zinc-600 hover:bg-zinc-50 border border-zinc-100"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className={cn("w-5 h-5", activeSubView === item.name ? "text-white" : "text-zinc-400 group-hover:text-primary")} />
                <span className="font-bold text-sm">{item.name}</span>
              </div>
              <ChevronRight className={cn("w-4 h-4 transition-transform", activeSubView === item.name ? "translate-x-1" : "text-zinc-300")} />
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          {renderSubContent()}
        </div>
      </div>
    </div>
  );
}
