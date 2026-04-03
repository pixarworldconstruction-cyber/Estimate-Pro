import React, { useState, useEffect } from 'react';
import { db, firebaseConfig, storage } from '../firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, setDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Trash2, Building2, Users, Shield, Mail, Lock, Calendar, CheckSquare, Zap, UserPlus, Globe, MessageSquare, Save, Image as ImageIcon, Layout as LayoutIcon, FileText as FileIcon, ShieldAlert, Package, Check, CreditCard, Smartphone, Upload, Info } from 'lucide-react';
import { Company, Staff, LandingPageContent, SupportContent, PricingPackage, PaymentSettings } from '../types';
import { format } from 'date-fns';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { cn, toDate } from '../lib/utils';
import { DEFAULT_LANDING_CONTENT, DEFAULT_SUPPORT_CONTENT } from '../constants/defaultContent';

const AVAILABLE_FEATURES = [
  { id: 'clients', label: 'Clients' },
  { id: 'estimates', label: 'Estimates' },
  { id: 'items', label: 'Items' },
  { id: 'reminders', label: 'Reminders' },
  { id: 'insights', label: 'Business Insights' },
  { id: 'sketch', label: 'Sketch Pad' },
  { id: 'converter', label: 'Unit Conversion' },
  { id: 'calculator', label: 'Scientific Calculator' },
  { id: 'construction-calc', label: 'Engineering Toolset' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'projects', label: 'Projects' },
  { id: 'calc-brick', label: 'Brick Work Calc' },
  { id: 'calc-plaster', label: 'Plastering Calc' },
  { id: 'calc-paint', label: 'Wall Paint Calc' },
  { id: 'calc-gypsum', label: 'Gypsum Calc' },
  { id: 'calc-electrical', label: 'Electrical Calc' },
  { id: 'calc-flooring', label: 'Flooring/Tile Calc' },
  { id: 'calc-stone', label: 'Stone Work Calc' },
  { id: 'calc-doors', label: 'Doors Calc' },
  { id: 'calc-windows', label: 'Windows Calc' },
  { id: 'calc-frame', label: 'Frame Work Calc' },
  { id: 'calc-kitchen', label: 'Kitchen Calc' },
  { id: 'calc-plumbing', label: 'Plumbing Calc' },
  { id: 'civil-drawing', label: 'Civil Drawing' },
];

export default function SuperAdminPanel() {
  const { isSuperAdmin, cleanupExpiredAccounts } = useAuth();
  const [activeView, setActiveView] = useState<'companies' | 'content' | 'packages' | 'payments'>('companies');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [packages, setPackages] = useState<PricingPackage[]>([]);
  const [newPackage, setNewPackage] = useState<Partial<PricingPackage>>({
    name: '',
    price: 0,
    originalPrice: 0,
    period: 'monthly',
    features: [],
    type: 'subscription',
    estimateLimit: 50,
    staffLimit: 5
  });
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [staffLimit, setStaffLimit] = useState(5);
  const [estimateLimit, setEstimateLimit] = useState(50);
  const [editTimeLimit, setEditTimeLimit] = useState(7);
  const [planName, setPlanName] = useState('Free Trial');
  const [trialDays, setTrialDays] = useState(14);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(['clients', 'estimates', 'items', 'reminders']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastCreatedPassword, setLastCreatedPassword] = useState('');
  const [companyToDelete, setCompanyToDelete] = useState<string | null>(null);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editingPackage, setEditingPackage] = useState<PricingPackage | null>(null);
  const [successData, setSuccessData] = useState<{ name: string, pass: string } | null>(null);

  // Content Management State
  const [landingContent, setLandingContent] = useState<LandingPageContent>(DEFAULT_LANDING_CONTENT);
  const [supportContent, setSupportContent] = useState<SupportContent>(DEFAULT_SUPPORT_CONTENT);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    razorpayKeyId: '',
    razorpayKeySecret: ''
  });
  const [savingContent, setSavingContent] = useState(false);
  const [uploadingQR, setUploadingQR] = useState(false);

  useEffect(() => {
    if (!isSuperAdmin) return;
    const unsubscribe = onSnapshot(collection(db, 'companies'), (snapshot) => {
      setCompanies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company)));
    });

    // Fetch Content
    const unsubLanding = onSnapshot(doc(db, 'settings', 'landingPage'), (doc) => {
      if (doc.exists()) setLandingContent(doc.data() as LandingPageContent);
    });
    const unsubSupport = onSnapshot(doc(db, 'settings', 'support'), (doc) => {
      if (doc.exists()) setSupportContent(doc.data() as SupportContent);
    });

    const unsubPackages = onSnapshot(collection(db, 'packages'), (snapshot) => {
      setPackages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PricingPackage)));
    });

    const unsubPayment = onSnapshot(doc(db, 'settings', 'payment'), (doc) => {
      if (doc.exists()) setPaymentSettings(doc.data() as PaymentSettings);
    });

    return () => {
      unsubscribe();
      unsubLanding();
      unsubSupport();
      unsubPackages();
      unsubPayment();
    };
  }, [isSuperAdmin]);

  const handleAddPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'packages'), {
        ...newPackage,
        createdAt: Timestamp.now()
      });
      setNewPackage({
        name: '',
        price: 0,
        period: 'monthly',
        features: [],
        type: 'subscription',
        estimateLimit: 50,
        staffLimit: 5
      });
      toast.success('Package added successfully!');
    } catch (err: any) {
      setError("Failed to add package: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePackage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this package?')) return;
    try {
      await deleteDoc(doc(db, 'packages', id));
    } catch (err: any) {
      setError("Failed to delete package: " + err.message);
    }
  };

  const handleUpdatePackage = async (id: string, updates: Partial<PricingPackage>) => {
    try {
      await updateDoc(doc(db, 'packages', id), updates);
      if (editingPackage && editingPackage.id === id) {
        setEditingPackage({ ...editingPackage, ...updates } as PricingPackage);
      }
    } catch (err: any) {
      setError("Failed to update package: " + err.message);
    }
  };

  const handleSaveLandingContent = async () => {
    setSavingContent(true);
    try {
      await setDoc(doc(db, 'settings', 'landingPage'), landingContent);
      toast.success('Landing page content saved successfully!');
    } catch (err: any) {
      setError("Failed to save landing content: " + err.message);
    } finally {
      setSavingContent(false);
    }
  };

  const handleSaveSupportContent = async () => {
    setSavingContent(true);
    try {
      await setDoc(doc(db, 'settings', 'support'), supportContent);
      toast.success('Support content saved successfully!');
    } catch (err: any) {
      setError("Failed to save support content: " + err.message);
    } finally {
      setSavingContent(false);
    }
  };

  const handleSavePaymentSettings = async () => {
    setSavingContent(true);
    try {
      await setDoc(doc(db, 'settings', 'payment'), paymentSettings);
      toast.success('Razorpay settings saved successfully!');
    } catch (err: any) {
      setError("Failed to save payment settings: " + err.message);
    } finally {
      setSavingContent(false);
    }
  };

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const generateReferralCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleGenerateAllReferralCodes = async () => {
    setLoading(true);
    try {
      const companiesWithoutCode = companies.filter(c => !c.referralCode);
      for (const company of companiesWithoutCode) {
        await updateDoc(doc(db, 'companies', company.id), {
          referralCode: generateReferralCode(),
          referralCount: 0
        });
      }
      toast.success(`Generated referral codes for ${companiesWithoutCode.length} companies.`);
    } catch (err: any) {
      setError("Failed to generate referral codes: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setLastCreatedPassword('');
    try {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + trialDays);
      const tempPassword = generatePassword();

      // 0. Create Auth User using secondary app to avoid signing out super admin
      const secondaryApp = initializeApp(firebaseConfig, `SecondaryApp_${Date.now()}`);
      const secondaryAuth = getAuth(secondaryApp);
      let uid = '';
      try {
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newAdminEmail, tempPassword);
        uid = userCredential.user.uid;
        await signOut(secondaryAuth);
      } catch (authErr: any) {
        if (authErr.code === 'auth/email-already-in-use') {
          throw new Error('This email is already registered in Authentication. Please use a different email.');
        }
        throw authErr;
      } finally {
        await deleteApp(secondaryApp);
      }

      // 1. Create Company
      const companyRef = await addDoc(collection(db, 'companies'), {
        name: newCompanyName,
        staffLimit,
        status: trialDays > 0 ? 'trial' : 'active',
        planName,
        expiryDate: Timestamp.fromDate(expiryDate),
        features: selectedFeatures,
        estimateLimit,
        editTimeLimit,
        createdAt: Timestamp.now(),
        adminName: newAdminName,
        adminEmail: newAdminEmail,
        tempPassword: tempPassword,
        referralCode: generateReferralCode(),
        referralCount: 0
      });

      // 2. Create Admin User record
      await setDoc(doc(db, 'staff', uid), {
        name: newAdminName,
        email: newAdminEmail,
        role: 'admin',
        companyId: companyRef.id,
        uid: uid
      });

      setLastCreatedPassword(tempPassword);
      setSuccessData({ name: newCompanyName, pass: tempPassword });
      setNewCompanyName('');
      setNewAdminEmail('');
      setNewAdminName('');
      setStaffLimit(5);
      setEstimateLimit(50);
      setEditTimeLimit(7);
      setPlanName('Free Trial');
      setTrialDays(14);
      setSelectedFeatures(['clients', 'estimates', 'invoices', 'projects', 'items', 'reminders']);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCompany = async () => {
    if (!companyToDelete) return;
    try {
      await deleteDoc(doc(db, 'companies', companyToDelete));
      setCompanyToDelete(null);
    } catch (err: any) {
      setError("Failed to delete company: " + err.message);
    }
  };

  const handleUpdateCompany = async (id: string, updates: Partial<Company>) => {
    try {
      await updateDoc(doc(db, 'companies', id), updates);
      if (editingCompany && editingCompany.id === id) {
        setEditingCompany({ ...editingCompany, ...updates } as Company);
      }
    } catch (err: any) {
      setError("Failed to update company: " + err.message);
    }
  };

  const extendTrial = async (company: Company, days: number) => {
    const currentExpiry = toDate(company.expiryDate);
    const newExpiry = new Date(currentExpiry);
    newExpiry.setDate(newExpiry.getDate() + days);
    await handleUpdateCompany(company.id, { 
      expiryDate: Timestamp.fromDate(newExpiry),
      status: 'trial'
    });
  };

  const toggleFeature = (featureId: string) => {
    setSelectedFeatures(prev => 
      prev.includes(featureId) 
        ? prev.filter(id => id !== featureId) 
        : [...prev, featureId]
    );
  };

  const handleManualCleanup = async () => {
    if (!confirm('This will permanently delete all trial accounts expired for more than 8 days and paid accounts expired for more than 30 days. Continue?')) return;
    setLoading(true);
    try {
      await cleanupExpiredAccounts();
      toast.success('Cleanup completed successfully!');
    } catch (err: any) {
      setError("Cleanup failed: " + err.message);
      toast.error('Cleanup failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isSuperAdmin) return <div className="p-8 text-center text-red-500 font-bold">Access Denied</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Tab Switcher */}
      <div className="flex gap-4 bg-white p-2 rounded-2xl shadow-sm border border-zinc-100 w-fit">
        <button
          onClick={() => setActiveView('companies')}
          className={cn(
            "px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2",
            activeView === 'companies' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-zinc-500 hover:bg-zinc-50"
          )}
        >
          <Building2 className="w-4 h-4" />
          Manage Companies
        </button>
        <button
          onClick={() => setActiveView('content')}
          className={cn(
            "px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2",
            activeView === 'content' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-zinc-500 hover:bg-zinc-50"
          )}
        >
          <Globe className="w-4 h-4" />
          Content Management
        </button>
        <button
          onClick={() => setActiveView('packages')}
          className={cn(
            "px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2",
            activeView === 'packages' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-zinc-500 hover:bg-zinc-50"
          )}
        >
          <Package className="w-4 h-4" />
          Packages
        </button>
        <button
          onClick={() => setActiveView('payments')}
          className={cn(
            "px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2",
            activeView === 'payments' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-zinc-500 hover:bg-zinc-50"
          )}
        >
          <Smartphone className="w-4 h-4" />
          Payment Settings
        </button>
      </div>

      {activeView === 'packages' && (
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-zinc-100">
            <h2 className="text-2xl font-bold text-zinc-900 mb-6 flex items-center gap-2">
              <Package className="text-primary" />
              Add New Package
            </h2>
            <form onSubmit={handleAddPackage} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Package Name</label>
                <input
                  type="text"
                  required
                  value={newPackage.name}
                  onChange={e => setNewPackage({ ...newPackage, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                  placeholder="e.g. Basic Plan"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Original Price (₹) - Crossed out</label>
                <input
                  type="number"
                  value={newPackage.originalPrice}
                  onChange={e => setNewPackage({ ...newPackage, originalPrice: Number(e.target.value) })}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                  placeholder="e.g. 1999"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Discount Price (₹) - Highlighted</label>
                <input
                  type="number"
                  required
                  value={newPackage.price}
                  onChange={e => setNewPackage({ ...newPackage, price: Number(e.target.value) })}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                  placeholder="e.g. 999"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Period</label>
                <select
                  value={newPackage.period}
                  onChange={e => setNewPackage({ ...newPackage, period: e.target.value as any })}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="one-time">One-time (Addon)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Type</label>
                <select
                  value={newPackage.type}
                  onChange={e => setNewPackage({ ...newPackage, type: e.target.value as any })}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                >
                  <option value="subscription">Subscription</option>
                  <option value="addon">Addon (Estimate Limit)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Estimate Limit</label>
                <input
                  type="number"
                  value={newPackage.estimateLimit}
                  onChange={e => setNewPackage({ ...newPackage, estimateLimit: Number(e.target.value) })}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Staff Limit</label>
                <input
                  type="number"
                  value={newPackage.staffLimit}
                  onChange={e => setNewPackage({ ...newPackage, staffLimit: Number(e.target.value) })}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Features (Comma separated)</label>
                <textarea
                  value={newPackage.features?.join(', ')}
                  onChange={e => setNewPackage({ ...newPackage, features: e.target.value.split(',').map(f => f.trim()) })}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary h-24"
                  placeholder="e.g. Unlimited Estimates, PDF Export, CRM"
                />
              </div>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Package'}
                </button>
              </div>
            </form>
          </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.map((pkg) => (
              <div key={pkg.id} className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm relative group hover:border-primary/50 transition-all">
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={() => setEditingPackage(pkg)}
                    className="p-2 text-zinc-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                    title="Edit Package"
                  >
                    <Shield size={18} />
                  </button>
                  <button
                    onClick={() => handleDeletePackage(pkg.id)}
                    className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Package"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Package className="text-primary w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-900">{pkg.name}</h3>
                    <span className="text-xs text-zinc-500 uppercase font-bold tracking-wider">{pkg.type}</span>
                  </div>
                </div>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Price</span>
                    <span className="font-bold text-zinc-900">₹{pkg.price} / {pkg.period}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Estimates</span>
                    <span className="font-bold text-zinc-900">{pkg.estimateLimit}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Staff</span>
                    <span className="font-bold text-zinc-900">{pkg.staffLimit}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {pkg.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-zinc-600">
                      <Check size={14} className="text-green-500" />
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeView === 'companies' && (
        <>
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-zinc-100">
            <h2 className="text-2xl font-bold text-zinc-900 mb-6 flex items-center gap-2">
              <Building2 className="text-primary" />
              Add New Company (Customer)
            </h2>
            
            {error && <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}

            <form onSubmit={handleAddCompany} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700">Company Name</label>
                  <input
                    type="text"
                    value={newCompanyName}
                    onChange={e => setNewCompanyName(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700">Staff Limit</label>
                  <input
                    type="number"
                    value={staffLimit}
                    onChange={e => setStaffLimit(parseInt(e.target.value))}
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700">Estimate Limit</label>
                  <input
                    type="number"
                    value={estimateLimit}
                    onChange={e => setEstimateLimit(parseInt(e.target.value))}
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700">Edit Time Limit (Days)</label>
                  <input
                    type="number"
                    value={editTimeLimit}
                    onChange={e => setEditTimeLimit(parseInt(e.target.value))}
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700">Admin Name</label>
                  <input
                    type="text"
                    value={newAdminName}
                    onChange={e => setNewAdminName(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700">Admin Email</label>
                  <input
                    type="email"
                    value={newAdminEmail}
                    onChange={e => setNewAdminEmail(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-zinc-50 rounded-2xl">
                <div className="space-y-4">
                  <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    Plan & Package
                  </h3>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-700">Plan Name</label>
                    <select 
                      value={planName}
                      onChange={e => setPlanName(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                    >
                      <option value="Free Trial">Free Trial</option>
                      <option value="Basic">Basic</option>
                      <option value="Pro">Pro</option>
                      <option value="Enterprise">Enterprise</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-700">Trial/Duration (Days)</label>
                    <input
                      type="number"
                      value={trialDays}
                      onChange={e => setTrialDays(parseInt(e.target.value))}
                      className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-primary" />
                    Feature Access
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {AVAILABLE_FEATURES.map(feature => (
                      <label key={feature.id} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={selectedFeatures.includes(feature.id)}
                          onChange={() => toggleFeature(feature.id)}
                          className="w-4 h-4 rounded border-zinc-300 text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-zinc-600 group-hover:text-zinc-900">{feature.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
              >
                {loading ? 'Creating...' : <><Plus className="w-5 h-5" /> Create Company & Admin</>}
              </button>
            </form>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-zinc-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
                <Building2 className="text-primary" />
                Manage Companies
              </h2>
              <div className="flex gap-3">
                <button
                  onClick={handleManualCleanup}
                  disabled={loading}
                  className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 transition-all flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Cleanup Expired
                </button>
                <button
                  onClick={handleGenerateAllReferralCodes}
                  disabled={loading}
                  className="px-4 py-2 bg-zinc-100 text-zinc-600 rounded-xl font-bold text-sm hover:bg-zinc-200 transition-all flex items-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  Generate Missing Referral Codes
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {companies.map(company => (
                <div key={company.id} className="p-6 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-zinc-900">{company.name}</h3>
                      <p className="text-sm text-zinc-500">Plan: <span className="font-semibold text-primary">{company.planName}</span></p>
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-zinc-600 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          Admin: <span className="font-medium">{company.adminName || 'N/A'}</span>
                        </p>
                        <p className="text-xs text-zinc-600 flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          Email: <span className="font-medium">{company.adminEmail || 'N/A'}</span>
                        </p>
                        {company.tempPassword && (
                          <p className="text-xs text-amber-600 flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-md border border-amber-100 w-fit">
                            <Lock className="w-3 h-3" />
                            Temp Pass: <span className="font-mono font-bold">{company.tempPassword}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setEditingCompany(company)}
                        className="p-2 text-primary hover:bg-primary/5 rounded-lg border border-transparent hover:border-primary/20 transition-all"
                        title="Edit Company"
                      >
                        <Shield className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setCompanyToDelete(company.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        title="Delete Company"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-500 uppercase">Staff Limit</label>
                      <input
                        type="number"
                        value={company.staffLimit}
                        onChange={e => handleUpdateCompany(company.id, { staffLimit: parseInt(e.target.value) })}
                        className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-500 uppercase">Estimate Limit</label>
                      <input
                        type="number"
                        value={company.estimateLimit || 50}
                        onChange={e => handleUpdateCompany(company.id, { estimateLimit: parseInt(e.target.value) })}
                        className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-500 uppercase">Edit Time Limit (Days)</label>
                      <input
                        type="number"
                        value={company.editTimeLimit || 7}
                        onChange={e => handleUpdateCompany(company.id, { editTimeLimit: parseInt(e.target.value) })}
                        className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-500 uppercase">Status</label>
                      <select
                        value={company.status}
                        onChange={e => handleUpdateCompany(company.id, { status: e.target.value as any })}
                        className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 text-sm"
                      >
                        <option value="active">Active</option>
                        <option value="trial">Trial</option>
                        <option value="suspended">Suspended</option>
                        <option value="expired">Expired</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Expiry Date
                    </label>
                    <div className="text-sm text-zinc-700 font-medium">
                      {company.expiryDate ? format(toDate(company.expiryDate), 'PPP') : 'N/A'}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-1">
                      <UserPlus className="w-3 h-3" />
                      Referral Info
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="text-sm font-mono font-bold text-primary bg-primary/5 px-2 py-1 rounded">
                        {company.referralCode || 'N/A'}
                      </div>
                      <div className="text-sm text-zinc-600">
                        <span className="font-bold text-zinc-900">{company.referralCount || 0}</span> Referrals
                      </div>
                      {company.referredBy && (
                        <div className="text-[10px] text-zinc-400 font-medium italic">
                          Referred by: {company.referredBy}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs font-bold text-zinc-500 uppercase">Active Features & Trials</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {AVAILABLE_FEATURES.map(feature => {
                        const isTrial = company.featureTrials?.[feature.id];
                        const isActive = company.features.includes(feature.id);
                        
                        return (
                          <div 
                            key={feature.id}
                            className={cn(
                              "p-4 rounded-2xl border transition-all flex flex-col gap-3",
                              isActive 
                                ? "bg-primary/5 border-primary/20" 
                                : "bg-zinc-50 border-zinc-100"
                            )}
                          >
                            <div className="flex justify-between items-start">
                              <span className={cn(
                                "text-xs font-bold",
                                isActive ? "text-primary" : "text-zinc-500"
                              )}>
                                {feature.label}
                              </span>
                              <button
                                onClick={() => {
                                  const newFeatures = isActive
                                    ? company.features.filter(id => id !== feature.id)
                                    : [...company.features, feature.id];
                                  handleUpdateCompany(company.id, { features: newFeatures });
                                }}
                                className={cn(
                                  "w-10 h-5 rounded-full relative transition-all",
                                  isActive ? "bg-primary" : "bg-zinc-300"
                                )}
                              >
                                <div className={cn(
                                  "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                                  isActive ? "right-1" : "left-1"
                                )} />
                              </button>
                            </div>

                            <div className="flex items-center gap-2">
                              {isTrial ? (
                                <div className="flex flex-col gap-1">
                                  <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-1">
                                    <Zap className="w-3 h-3" />
                                    Trial Active
                                  </span>
                                  <span className="text-[9px] text-zinc-400 font-medium">
                                    Expires: {format(toDate(company.expiryDate), 'dd MMM')}
                                  </span>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    const trialExpiry = new Date();
                                    trialExpiry.setDate(trialExpiry.getDate() + 14);
                                    const newTrials = { ...(company.featureTrials || {}), [feature.id]: Timestamp.fromDate(trialExpiry) };
                                    const newFeatures = company.features.includes(feature.id) 
                                      ? company.features 
                                      : [...company.features, feature.id];
                                    handleUpdateCompany(company.id, { 
                                      featureTrials: newTrials,
                                      features: newFeatures
                                    });
                                  }}
                                  className="text-[10px] font-bold text-zinc-400 hover:text-primary transition-all uppercase tracking-widest"
                                >
                                  Give 14-day Trial
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeView === 'content' && (
        <div className="space-y-8">
          {/* Landing Page Content Editor */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-zinc-100 space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
                <LayoutIcon className="text-primary" />
                Landing Page Content
              </h2>
              <button
                onClick={handleSaveLandingContent}
                disabled={savingContent}
                className="px-6 py-2 bg-primary text-white rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {savingContent ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-8">
              {/* Hero Section */}
              <div className="p-6 bg-zinc-50 rounded-2xl space-y-4">
                <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-primary" />
                  Hero Section
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-700">Title</label>
                    <input
                      type="text"
                      value={landingContent.hero.title}
                      onChange={e => setLandingContent({ ...landingContent, hero: { ...landingContent.hero, title: e.target.value } })}
                      className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-700">CTA Button Text</label>
                    <input
                      type="text"
                      value={landingContent.hero.ctaText}
                      onChange={e => setLandingContent({ ...landingContent, hero: { ...landingContent.hero, ctaText: e.target.value } })}
                      className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-semibold text-zinc-700">Subtitle</label>
                    <textarea
                      value={landingContent.hero.subtitle}
                      onChange={e => setLandingContent({ ...landingContent, hero: { ...landingContent.hero, subtitle: e.target.value } })}
                      className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary h-20"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-semibold text-zinc-700">Hero Image URL</label>
                    <input
                      type="text"
                      value={landingContent.hero.imageUrl}
                      onChange={e => setLandingContent({ ...landingContent, hero: { ...landingContent.hero, imageUrl: e.target.value } })}
                      className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              {/* About Section */}
              <div className="p-6 bg-zinc-50 rounded-2xl space-y-4">
                <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                  <FileIcon className="w-4 h-4 text-primary" />
                  About Section
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-700">Title</label>
                    <input
                      type="text"
                      value={landingContent.about.title}
                      onChange={e => setLandingContent({ ...landingContent, about: { ...landingContent.about, title: e.target.value } })}
                      className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-700">Subtitle</label>
                    <input
                      type="text"
                      value={landingContent.about.subtitle}
                      onChange={e => setLandingContent({ ...landingContent, about: { ...landingContent.about, subtitle: e.target.value } })}
                      className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                    />
                  </div>
                </div>
                {/* Features Editor */}
                <div className="space-y-4 pt-4">
                  <label className="text-sm font-bold text-zinc-700 uppercase">Features (Top 3)</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {landingContent.about.features.map((feature, idx) => (
                      <div key={idx} className="p-4 bg-white rounded-xl border border-zinc-200 space-y-3">
                        <div className="flex gap-2">
                          <select
                            value={feature.icon}
                            onChange={e => {
                              const newFeatures = [...landingContent.about.features];
                              newFeatures[idx].icon = e.target.value;
                              setLandingContent({ ...landingContent, about: { ...landingContent.about, features: newFeatures } });
                            }}
                            className="w-full px-3 py-1.5 rounded-lg border border-zinc-100 text-xs font-bold"
                          >
                            <option value="FileText">FileText</option>
                            <option value="Users">Users</option>
                            <option value="Calculator">Calculator</option>
                            <option value="Package">Package</option>
                            <option value="ShieldCheck">ShieldCheck</option>
                            <option value="ArrowRight">ArrowRight</option>
                            <option value="TrendingUp">TrendingUp</option>
                            <option value="Info">Info</option>
                          </select>
                          <input
                            type="text"
                            placeholder="Title"
                            value={feature.title}
                            onChange={e => {
                              const newFeatures = [...landingContent.about.features];
                              newFeatures[idx].title = e.target.value;
                              setLandingContent({ ...landingContent, about: { ...landingContent.about, features: newFeatures } });
                            }}
                            className="w-full px-3 py-1.5 rounded-lg border border-zinc-100 text-sm font-bold"
                          />
                        </div>
                        <textarea
                          placeholder="Description"
                          value={feature.desc}
                          onChange={e => {
                            const newFeatures = [...landingContent.about.features];
                            newFeatures[idx].desc = e.target.value;
                            setLandingContent({ ...landingContent, about: { ...landingContent.about, features: newFeatures } });
                          }}
                          className="w-full px-3 py-1.5 rounded-lg border border-zinc-100 text-xs h-20"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Packages Section */}
              <div className="p-6 bg-zinc-50 rounded-2xl space-y-4">
                <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  Packages Section
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-700">Title</label>
                    <input
                      type="text"
                      value={landingContent.packages.title}
                      onChange={e => setLandingContent({ ...landingContent, packages: { ...landingContent.packages, title: e.target.value } })}
                      className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-700">Subtitle</label>
                    <input
                      type="text"
                      value={landingContent.packages.subtitle}
                      onChange={e => setLandingContent({ ...landingContent, packages: { ...landingContent.packages, subtitle: e.target.value } })}
                      className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                    />
                  </div>
                </div>
                
                {/* Plans Editor */}
                <div className="space-y-6 pt-4">
                  <label className="text-sm font-bold text-zinc-700 uppercase">Pricing Plans</label>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {landingContent.packages.plans.map((plan, idx) => (
                      <div key={idx} className="p-6 bg-white rounded-2xl border border-zinc-200 space-y-4 relative group">
                        <div className="flex justify-between items-center">
                          <input
                            type="text"
                            placeholder="Plan Name"
                            value={plan.name}
                            onChange={e => {
                              const newPlans = [...landingContent.packages.plans];
                              newPlans[idx].name = e.target.value;
                              setLandingContent({ ...landingContent, packages: { ...landingContent.packages, plans: newPlans } });
                            }}
                            className="text-lg font-black text-zinc-900 bg-transparent border-none outline-none focus:ring-0 w-full"
                          />
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={plan.popular}
                              onChange={e => {
                                const newPlans = [...landingContent.packages.plans];
                                newPlans[idx].popular = e.target.checked;
                                setLandingContent({ ...landingContent, packages: { ...landingContent.packages, plans: newPlans } });
                              }}
                              className="w-4 h-4 rounded border-zinc-300 text-primary focus:ring-primary"
                            />
                            <span className="text-[10px] font-bold text-zinc-500 uppercase">Popular</span>
                          </label>
                        </div>
                        
                        <div className="flex items-baseline gap-1 bg-zinc-50 p-3 rounded-xl">
                          <span className="text-sm font-bold text-zinc-400">₹</span>
                          <input
                            type="text"
                            placeholder="Price"
                            value={plan.price}
                            onChange={e => {
                              const newPlans = [...landingContent.packages.plans];
                              newPlans[idx].price = e.target.value;
                              setLandingContent({ ...landingContent, packages: { ...landingContent.packages, plans: newPlans } });
                            }}
                            className="text-2xl font-black text-zinc-900 bg-transparent border-none outline-none focus:ring-0 w-20"
                          />
                          <span className="text-zinc-400 text-xs">/</span>
                          <input
                            type="text"
                            placeholder="Period"
                            value={plan.period}
                            onChange={e => {
                              const newPlans = [...landingContent.packages.plans];
                              newPlans[idx].period = e.target.value;
                              setLandingContent({ ...landingContent, packages: { ...landingContent.packages, plans: newPlans } });
                            }}
                            className="text-xs font-bold text-zinc-500 bg-transparent border-none outline-none focus:ring-0 w-20"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Features</label>
                          <div className="space-y-2">
                            {plan.features.map((feature, fIdx) => (
                              <div key={fIdx} className="flex items-center gap-2 group/feature">
                                <input
                                  type="text"
                                  value={feature}
                                  onChange={e => {
                                    const newPlans = [...landingContent.packages.plans];
                                    newPlans[idx].features[fIdx] = e.target.value;
                                    setLandingContent({ ...landingContent, packages: { ...landingContent.packages, plans: newPlans } });
                                  }}
                                  className="flex-1 text-xs font-medium text-zinc-600 bg-zinc-50 px-3 py-1.5 rounded-lg border border-transparent focus:border-primary/20 outline-none"
                                />
                                <button
                                  onClick={() => {
                                    const newPlans = [...landingContent.packages.plans];
                                    newPlans[idx].features = newPlans[idx].features.filter((_, i) => i !== fIdx);
                                    setLandingContent({ ...landingContent, packages: { ...landingContent.packages, plans: newPlans } });
                                  }}
                                  className="p-1 text-zinc-300 hover:text-red-500 opacity-0 group-hover/feature:opacity-100 transition-all"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={() => {
                                const newPlans = [...landingContent.packages.plans];
                                newPlans[idx].features.push('New Feature');
                                setLandingContent({ ...landingContent, packages: { ...landingContent.packages, plans: newPlans } });
                              }}
                              className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" /> Add Feature
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Contact Section */}
              <div className="p-6 bg-zinc-50 rounded-2xl space-y-4">
                <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  Contact Section (Landing Page)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-700">Title</label>
                    <input
                      type="text"
                      value={landingContent.contact.title}
                      onChange={e => setLandingContent({ ...landingContent, contact: { ...landingContent.contact, title: e.target.value } })}
                      className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-700">Subtitle</label>
                    <input
                      type="text"
                      value={landingContent.contact.subtitle}
                      onChange={e => setLandingContent({ ...landingContent, contact: { ...landingContent.contact, subtitle: e.target.value } })}
                      className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-700">Email</label>
                    <input
                      type="email"
                      value={landingContent.contact.email}
                      onChange={e => setLandingContent({ ...landingContent, contact: { ...landingContent.contact, email: e.target.value } })}
                      className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-700">Phone (Indian Format)</label>
                    <input
                      type="text"
                      value={landingContent.contact.phone}
                      onChange={e => setLandingContent({ ...landingContent, contact: { ...landingContent.contact, phone: e.target.value } })}
                      className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                      placeholder="+91 XXXXX XXXXX"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-semibold text-zinc-700">Address</label>
                    <input
                      type="text"
                      value={landingContent.contact.address}
                      onChange={e => setLandingContent({ ...landingContent, contact: { ...landingContent.contact, address: e.target.value } })}
                      className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Legal Content */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-6 bg-zinc-50 rounded-2xl space-y-4">
                  <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-primary" />
                    Privacy Policy
                  </h3>
                  <textarea
                    value={landingContent.privacyPolicy}
                    onChange={e => setLandingContent({ ...landingContent, privacyPolicy: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary h-40 font-mono text-xs"
                    placeholder="Markdown supported..."
                  />
                </div>
                <div className="p-6 bg-zinc-50 rounded-2xl space-y-4">
                  <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                    <FileIcon className="w-4 h-4 text-primary" />
                    Terms & Conditions
                  </h3>
                  <textarea
                    value={landingContent.termsAndConditions}
                    onChange={e => setLandingContent({ ...landingContent, termsAndConditions: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary h-40 font-mono text-xs"
                    placeholder="Markdown supported..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Support Content Editor */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-zinc-100 space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
                <MessageSquare className="text-primary" />
                Contact Us Details (Sidebar)
              </h2>
              <button
                onClick={handleSaveSupportContent}
                disabled={savingContent}
                className="px-6 py-2 bg-primary text-white rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {savingContent ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Support Name (Super Admin)</label>
                <input
                  type="text"
                  value={supportContent.name}
                  onChange={e => setSupportContent({ ...supportContent, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Support Email</label>
                <input
                  type="email"
                  value={supportContent.email}
                  onChange={e => setSupportContent({ ...supportContent, email: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Support Phone (Indian Format)</label>
                <input
                  type="text"
                  value={supportContent.phone}
                  onChange={e => setSupportContent({ ...supportContent, phone: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                  placeholder="+91 XXXXX XXXXX"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Availability</label>
                <input
                  type="text"
                  value={supportContent.availability}
                  onChange={e => setSupportContent({ ...supportContent, availability: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Support Note</label>
                <textarea
                  value={supportContent.note}
                  onChange={e => setSupportContent({ ...supportContent, note: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary h-24"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Company Modal */}
      {editingCompany && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 overflow-y-auto">
          <div className="bg-white p-8 rounded-3xl max-w-2xl w-full space-y-6 shadow-2xl my-8">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                <Building2 className="text-primary" />
                Modify Company: {editingCompany.name}
              </h3>
              <button 
                onClick={() => setEditingCompany(null)}
                className="p-2 hover:bg-zinc-100 rounded-full"
              >
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Company Name</label>
                <input
                  type="text"
                  value={editingCompany.name}
                  onChange={e => handleUpdateCompany(editingCompany.id, { name: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Staff Limit</label>
                <input
                  type="number"
                  value={editingCompany.staffLimit}
                  onChange={e => handleUpdateCompany(editingCompany.id, { staffLimit: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Estimate Limit</label>
                <input
                  type="number"
                  value={editingCompany.estimateLimit || 50}
                  onChange={e => handleUpdateCompany(editingCompany.id, { estimateLimit: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Edit Time Limit (Days)</label>
                <input
                  type="number"
                  value={editingCompany.editTimeLimit || 7}
                  onChange={e => handleUpdateCompany(editingCompany.id, { editTimeLimit: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Plan Name</label>
                <select
                  value={editingCompany.planName}
                  onChange={e => handleUpdateCompany(editingCompany.id, { planName: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                >
                  <option value="Free Trial">Free Trial</option>
                  <option value="Basic">Basic</option>
                  <option value="Pro">Pro</option>
                  <option value="Enterprise">Enterprise</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Status</label>
                <select
                  value={editingCompany.status}
                  onChange={e => handleUpdateCompany(editingCompany.id, { status: e.target.value as any })}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                >
                  <option value="active">Active</option>
                  <option value="trial">Trial</option>
                  <option value="suspended">Suspended</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
            </div>

            <div className="space-y-4 p-6 bg-zinc-50 rounded-2xl border border-zinc-100">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-zinc-700 uppercase flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Expiry & Trial Management
                </label>
                <div className="text-sm font-mono font-bold text-primary">
                  {editingCompany.expiryDate ? format(toDate(editingCompany.expiryDate), 'PPP') : 'N/A'}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => extendTrial(editingCompany, 7)}
                  className="px-4 py-2 rounded-xl bg-white border border-zinc-200 text-xs font-bold text-zinc-600 hover:border-primary hover:text-primary transition-all"
                >
                  +7 Days Trial
                </button>
                <button 
                  onClick={() => extendTrial(editingCompany, 14)}
                  className="px-4 py-2 rounded-xl bg-white border border-zinc-200 text-xs font-bold text-zinc-600 hover:border-primary hover:text-primary transition-all"
                >
                  +14 Days Trial
                </button>
                <button 
                  onClick={() => extendTrial(editingCompany, 30)}
                  className="px-4 py-2 rounded-xl bg-white border border-zinc-200 text-xs font-bold text-zinc-600 hover:border-primary hover:text-primary transition-all"
                >
                  +30 Days Trial
                </button>
                <button 
                  onClick={() => {
                    const d = new Date();
                    d.setFullYear(d.getFullYear() + 1);
                    handleUpdateCompany(editingCompany.id, { expiryDate: Timestamp.fromDate(d), status: 'active' });
                  }}
                  className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all"
                >
                  Set 1 Year (Active)
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-bold text-zinc-700 uppercase flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-primary" />
                Feature Access Permissions
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {AVAILABLE_FEATURES.map(feature => {
                  const isActive = editingCompany.features.includes(feature.id);
                  return (
                    <button
                      key={feature.id}
                      onClick={() => {
                        const newFeatures = isActive
                          ? editingCompany.features.filter(id => id !== feature.id)
                          : [...editingCompany.features, feature.id];
                        handleUpdateCompany(editingCompany.id, { features: newFeatures });
                      }}
                      className={`px-4 py-3 rounded-xl text-xs font-bold text-left transition-all border ${
                        isActive 
                          ? "bg-primary/10 border-primary/20 text-primary shadow-sm" 
                          : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{feature.label}</span>
                        {isActive && <CheckSquare className="w-3 h-3" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button 
                onClick={() => setEditingCompany(null)}
                className="flex-1 px-6 py-3 rounded-xl font-bold text-white bg-zinc-900 hover:bg-zinc-800 transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Package Modal */}
      {editingPackage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 overflow-y-auto">
          <div className="bg-white p-8 rounded-3xl max-w-2xl w-full space-y-6 shadow-2xl my-8">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                <Package className="text-primary" />
                Modify Package: {editingPackage.name}
              </h3>
              <button 
                onClick={() => setEditingPackage(null)}
                className="p-2 hover:bg-zinc-100 rounded-full"
              >
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Package Name</label>
                <input
                  type="text"
                  value={editingPackage.name}
                  onChange={e => handleUpdatePackage(editingPackage.id, { name: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Original Price (₹)</label>
                <input
                  type="number"
                  value={editingPackage.originalPrice || 0}
                  onChange={e => handleUpdatePackage(editingPackage.id, { originalPrice: Number(e.target.value) })}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Discount Price (₹)</label>
                <input
                  type="number"
                  value={editingPackage.price}
                  onChange={e => handleUpdatePackage(editingPackage.id, { price: Number(e.target.value) })}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Period</label>
                <select
                  value={editingPackage.period}
                  onChange={e => handleUpdatePackage(editingPackage.id, { period: e.target.value as any })}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="one-time">One-time (Addon)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Type</label>
                <select
                  value={editingPackage.type}
                  onChange={e => handleUpdatePackage(editingPackage.id, { type: e.target.value as any })}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                >
                  <option value="subscription">Subscription</option>
                  <option value="addon">Addon (Estimate Limit)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Estimate Limit</label>
                <input
                  type="number"
                  value={editingPackage.estimateLimit}
                  onChange={e => handleUpdatePackage(editingPackage.id, { estimateLimit: Number(e.target.value) })}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Staff Limit</label>
                <input
                  type="number"
                  value={editingPackage.staffLimit}
                  onChange={e => handleUpdatePackage(editingPackage.id, { staffLimit: Number(e.target.value) })}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Features (Comma separated)</label>
                <textarea
                  value={editingPackage.features?.join(', ')}
                  onChange={e => handleUpdatePackage(editingPackage.id, { features: e.target.value.split(',').map(f => f.trim()) })}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary h-24"
                />
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button 
                onClick={() => setEditingPackage(null)}
                className="flex-1 px-6 py-3 rounded-xl font-bold text-white bg-zinc-900 hover:bg-zinc-800 transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {companyToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white p-8 rounded-3xl max-w-md w-full space-y-6 shadow-2xl">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-8 h-8" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-zinc-900">Delete Company?</h3>
              <p className="text-zinc-500 text-sm">
                Are you sure you want to delete this company? This action cannot be undone and associated data might persist.
              </p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setCompanyToDelete(null)}
                className="flex-1 px-6 py-3 rounded-xl font-bold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteCompany}
                className="flex-1 px-6 py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {successData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white p-8 rounded-3xl max-w-md w-full space-y-6 shadow-2xl">
            <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto">
              <Shield className="w-8 h-8" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-zinc-900">Company Created!</h3>
              <p className="text-zinc-500 text-sm">
                Company <span className="font-bold text-zinc-900">{successData.name}</span> has been created successfully.
              </p>
            </div>
            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 space-y-2">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Temporary Password</p>
              <div className="flex items-center justify-between">
                <code className="text-lg font-mono font-bold text-amber-900">{successData.pass}</code>
                <button 
                  onClick={() => navigator.clipboard.writeText(successData.pass)}
                  className="text-xs font-bold text-amber-600 hover:underline"
                >
                  Copy
                </button>
              </div>
            </div>
            <p className="text-xs text-zinc-400 text-center">
              The admin can now sign in using their email and this password.
            </p>
            <button 
              onClick={() => setSuccessData(null)}
              className="w-full px-6 py-3 rounded-xl font-bold text-white bg-zinc-900 hover:bg-zinc-800 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
      {activeView === 'payments' && (
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-zinc-100">
            <h2 className="text-2xl font-bold text-zinc-900 mb-6 flex items-center gap-2">
              <CreditCard className="text-primary" />
              Razorpay Settings
            </h2>
            
            <div className="max-w-2xl space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Razorpay Key ID</label>
                <input
                  type="text"
                  value={paymentSettings.razorpayKeyId}
                  onChange={e => setPaymentSettings({ ...paymentSettings, razorpayKeyId: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                  placeholder="rzp_live_..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Razorpay Key Secret</label>
                <input
                  type="password"
                  value={paymentSettings.razorpayKeySecret}
                  onChange={e => setPaymentSettings({ ...paymentSettings, razorpayKeySecret: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                  placeholder="••••••••••••••••"
                />
              </div>
              
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex gap-3">
                <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-bold mb-1">How to get these keys?</p>
                  <ol className="list-decimal ml-4 space-y-1">
                    <li>Log in to your Razorpay Dashboard.</li>
                    <li>Go to Settings &gt; API Keys.</li>
                    <li>Generate Live Keys and copy them here.</li>
                  </ol>
                </div>
              </div>

              <button
                onClick={handleSavePaymentSettings}
                disabled={savingContent}
                className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {savingContent ? 'Saving...' : 'Save Razorpay Settings'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
