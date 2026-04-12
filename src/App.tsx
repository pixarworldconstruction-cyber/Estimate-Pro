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
import InquiryManager from './components/InquiryManager';
import AdminPanel from './components/AdminPanel';
import SuperAdminPanel from './components/SuperAdminPanel';
import Profile from './components/Profile';
import NotificationManager from './components/NotificationManager';
import UnitConverter from './components/UnitConverter';
import Calculator from './components/Calculator';
import SketchPad from './components/SketchPad';
import BusinessInsights from './components/BusinessInsights';
import ConstructionCalculator from './components/ConstructionCalculator';
import ProjectManagement from './components/ProjectManagement';
import Accounts from './components/Accounts';
import LandingPage from './components/LandingPage';
import ContactUs from './components/ContactUs';
import SubscriptionPage from './components/SubscriptionPage';

import { ShieldAlert, CreditCard } from 'lucide-react';
import { Toaster } from 'sonner';

import ErrorBoundary from './components/ErrorBoundary';

import { LanguageProvider } from './contexts/LanguageContext';

function AppContent() {
  const { user, loading, isSuperAdmin, isAdmin, company, logout, staff } = useAuth();
  const [activeTab, setActiveTab] = useState(isSuperAdmin ? 'super-admin' : 'dashboard');
  const [selectedEstimate, setSelectedEstimate] = useState<{ id: string, mode: 'view' | 'edit' } | null>(null);

  useEffect(() => {
    if (isSuperAdmin) {
      setActiveTab('super-admin');
    } else if (company?.showWelcome && isAdmin) {
      setActiveTab('subscription');
    }
  }, [isSuperAdmin, company?.showWelcome, isAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  const isExpired = company && (company.status === 'expired' || company.status === 'suspended') && !isSuperAdmin;

  if (isExpired && activeTab !== 'subscription' && activeTab !== 'contact-support') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-zinc-100 max-w-md text-center space-y-4">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900">Account {company.status === 'expired' ? 'Expired' : 'Suspended'}</h2>
          <p className="text-zinc-600">
            Your company account for <span className="font-bold">{company.name}</span> has been {company.status}. 
            {staff ? ' Please contact your administrator to renew the subscription.' : ' Please choose a plan to continue or contact support.'}
          </p>
          <div className="grid grid-cols-1 gap-3">
            {!staff && (
              <button 
                onClick={() => setActiveTab('subscription')} 
                className="w-full bg-primary text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"
              >
                <CreditCard className="w-5 h-5" />
                Choose Plan
              </button>
            )}
            <button onClick={() => logout()} className="w-full bg-zinc-100 text-zinc-600 py-3 rounded-xl font-bold">
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'super-admin':
        return isSuperAdmin ? <SuperAdminPanel /> : <Dashboard setActiveTab={setActiveTab} setSelectedEstimateId={(id, mode) => setSelectedEstimate(id ? { id, mode: mode || 'edit' } : null)} />;
      case 'dashboard':
        return <Dashboard setActiveTab={setActiveTab} setSelectedEstimateId={(id, mode) => setSelectedEstimate(id ? { id, mode: mode || 'edit' } : null)} />;
      case 'clients':
        return <ClientDirectory setActiveTab={setActiveTab} setSelectedEstimateId={(id, mode) => setSelectedEstimate(id ? { id, mode: mode || 'edit' } : null)} />;
      case 'inquiries':
        return <InquiryManager />;
      case 'estimates':
        return <EstimateBuilder initialEstimateId={selectedEstimate?.id} initialMode={selectedEstimate?.mode} onClearInitialId={() => setSelectedEstimate(null)} />;
      case 'items':
        return <ItemCatalog />;
      case 'reminders':
        return <Reminders />;
      case 'insights':
        return <BusinessInsights />;
      case 'converter':
        return <UnitConverter />;
      case 'calculator':
        return <Calculator />;
      case 'sketch':
        return <SketchPad />;
      case 'construction-calc':
        return <ConstructionCalculator />;
      case 'projects':
        return <ProjectManagement />;
      case 'accounts':
        return <Accounts />;
      case 'admin':
        return <AdminPanel setActiveTab={setActiveTab} />;
      case 'subscription':
        return (isAdmin && !isSuperAdmin) || !staff ? <SubscriptionPage setActiveTab={setActiveTab} /> : <Dashboard setActiveTab={setActiveTab} setSelectedEstimateId={(id, mode) => setSelectedEstimate(id ? { id, mode: mode || 'edit' } : null)} />;
      case 'addons':
        return (isAdmin && !isSuperAdmin) || !staff ? <SubscriptionPage initialView="addons" setActiveTab={setActiveTab} /> : <Dashboard setActiveTab={setActiveTab} setSelectedEstimateId={(id, mode) => setSelectedEstimate(id ? { id, mode: mode || 'edit' } : null)} />;
      case 'profile':
        return <Profile />;
      case 'contact-support':
        return <ContactUs />;
      default:
        return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  return (
    <ErrorBoundary>
      <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
        <Toaster position="top-right" richColors />
        <NotificationManager />
        {renderContent()}
      </Layout>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <LanguageProvider>
          <AppContent />
        </LanguageProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
