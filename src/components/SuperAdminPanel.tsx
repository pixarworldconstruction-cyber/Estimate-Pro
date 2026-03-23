import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, setDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Trash2, Building2, Users, Shield, Mail, Lock, Calendar, CheckSquare } from 'lucide-react';
import { Company, Staff } from '../types';
import { format } from 'date-fns';

const AVAILABLE_FEATURES = [
  { id: 'clients', label: 'Clients' },
  { id: 'estimates', label: 'Estimates' },
  { id: 'items', label: 'Items' },
  { id: 'reminders', label: 'Reminders' },
];

export default function SuperAdminPanel() {
  const { isSuperAdmin } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [staffLimit, setStaffLimit] = useState(5);
  const [planName, setPlanName] = useState('Free Trial');
  const [trialDays, setTrialDays] = useState(14);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(['clients', 'estimates', 'items', 'reminders']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastCreatedPassword, setLastCreatedPassword] = useState('');
  const [companyToDelete, setCompanyToDelete] = useState<string | null>(null);
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

      // 1. Create Company
      const companyRef = await addDoc(collection(db, 'companies'), {
        name: newCompanyName,
        staffLimit,
        status: trialDays > 0 ? 'trial' : 'active',
        planName,
        expiryDate: Timestamp.fromDate(expiryDate),
        features: selectedFeatures,
        createdAt: Timestamp.now(),
        adminName: newAdminName,
        adminEmail: newAdminEmail,
        tempPassword: tempPassword
      });

      // 2. Create Admin User record
      await setDoc(doc(db, 'staff', `temp_${Date.now()}`), {
        name: newAdminName,
        email: newAdminEmail,
        role: 'admin',
        companyId: companyRef.id,
        uid: '' // To be linked on signup
      });

      setLastCreatedPassword(tempPassword);
      setSuccessData({ name: newCompanyName, pass: tempPassword });
      setNewCompanyName('');
      setNewAdminEmail('');
      setNewAdminName('');
      setStaffLimit(5);
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
    await updateDoc(doc(db, 'companies', id), updates);
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
                <button 
                  onClick={() => setCompanyToDelete(company.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
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
                  {company.expiryDate ? format(company.expiryDate.toDate(), 'PPP') : 'N/A'}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">Active Features</label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_FEATURES.map(feature => (
                    <button
                      key={feature.id}
                      onClick={() => {
                        const newFeatures = company.features.includes(feature.id)
                          ? company.features.filter(id => id !== feature.id)
                          : [...company.features, feature.id];
                        handleUpdateCompany(company.id, { features: newFeatures });
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                        company.features.includes(feature.id)
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "bg-zinc-200 text-zinc-500 border border-transparent"
                      }`}
                    >
                      {feature.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

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
              The admin must sign up using their email and this password.
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
