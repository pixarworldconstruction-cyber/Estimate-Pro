/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ClientDirectory from './components/ClientDirectory';
import EstimateBuilder from './components/EstimateBuilder';
import ItemCatalog from './components/ItemCatalog';
import Reminders from './components/Reminders';
import AdminPanel from './components/AdminPanel';
import SuperAdminPanel from './components/SuperAdminPanel';

import { ShieldAlert } from 'lucide-react';

function AppContent() {
  const { user, loading, isSuperAdmin, company, logout } = useAuth();
  const [activeTab, setActiveTab] = useState(isSuperAdmin ? 'super-admin' : 'dashboard');

  useEffect(() => {
    if (isSuperAdmin) {
      setActiveTab('super-admin');
    }
  }, [isSuperAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (company && (company.status === 'expired' || company.status === 'suspended') && !isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-zinc-100 max-w-md text-center space-y-4">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900">Account {company.status === 'expired' ? 'Expired' : 'Suspended'}</h2>
          <p className="text-zinc-600">
            Your company account for <span className="font-bold">{company.name}</span> has been {company.status}. 
            Please contact the super admin to renew your plan.
          </p>
          <button onClick={() => logout()} className="w-full bg-primary text-white py-3 rounded-xl font-bold">
            Logout
          </button>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'super-admin':
        return isSuperAdmin ? <SuperAdminPanel /> : <Dashboard setActiveTab={setActiveTab} />;
      case 'dashboard':
        return <Dashboard setActiveTab={setActiveTab} />;
      case 'clients':
        return <ClientDirectory />;
      case 'estimates':
        return <EstimateBuilder />;
      case 'items':
        return <ItemCatalog />;
      case 'reminders':
        return <Reminders />;
      case 'admin':
        return <AdminPanel />;
      default:
        return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  );
}
