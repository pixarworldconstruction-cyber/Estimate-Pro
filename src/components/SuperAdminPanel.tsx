import React, { useState, useEffect } from 'react';
import { db, firebaseConfig } from '../firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, setDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Trash2, Building2, Users, Shield, Mail, Lock, Calendar, CheckSquare, Zap, UserPlus } from 'lucide-react';
import { Company, Staff } from '../types';
import { format } from 'date-fns';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { cn, toDate } from '../lib/utils';

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
];

export default function SuperAdminPanel() {
  const { isSuperAdmin } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
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
  const [successData, setSuccessData] = useState<{ name: string, pass: string } | null>(null);

  useEffect(() => {
    if (!isSuperAdmin) return;
    const unsubscribe = onSnapshot(collection(db, 'companies'), (snapshot) => {
      setCompanies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company)));
    });
    return () => unsubscribe();
  }, [isSuperAdmin]);

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
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
        tempPassword: tempPassword
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
      setSelectedFeatures(['clients', 'estimates', 'items', 'reminders']);
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

  if (!isSuperAdmin) return <div className="p-8 text-center text-red-500 font-bold">Access Denied</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
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
        <h2 className="text-2xl font-bold text-zinc-900 mb-6 flex items-center gap-2">
          <Building2 className="text-primary" />
          Manage Companies
        </h2>

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
    </div>
  );
}
