import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebase';
import { doc, setDoc, collection, onSnapshot, deleteDoc, addDoc, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../contexts/AuthContext';
import { Save, Upload, Plus, Trash2, UserPlus, Shield, Settings, Users, X } from 'lucide-react';
import { Staff, Company } from '../types';
import { cn } from '../lib/utils';

export default function AdminPanel() {
  const { company, isAdmin, isSuperAdmin, staff: currentStaff } = useAuth();
  const [settings, setSettings] = useState<Partial<Company>>({
    name: '',
    address: '',
    gst: '',
    pan: '',
    tan: '',
    themeColor: '#10b981',
    staffLimit: 5,
  });
  const [staff, setStaff] = useState<Staff[]>([]);
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'admin' | 'staff'>('staff');
  const [uploading, setUploading] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (company) {
      setSettings(company);
    }
  }, [company]);

  useEffect(() => {
    if (!currentStaff?.companyId) return;
    const q = query(collection(db, 'staff'), where('companyId', '==', currentStaff.companyId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setStaff(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff)));
    });
    return () => unsubscribe();
  }, [currentStaff?.companyId]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStaff?.companyId) return;
    await setDoc(doc(db, 'companies', currentStaff.companyId), settings, { merge: true });
    setSuccessMessage('Settings saved successfully!');
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentStaff?.companyId) return;

    setUploading(true);
    try {
      const storageRef = ref(storage, `companies/${currentStaff.companyId}/logo`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setSettings(prev => ({ ...prev, logoUrl: url }));
    } catch (error) {
      console.error('Upload failed', error);
    } finally {
      setUploading(false);
    }
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentStaff?.companyId) return;

    setUploading(true);
    try {
      const storageRef = ref(storage, `companies/${currentStaff.companyId}/signature`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setSettings(prev => ({ ...prev, ownerSignature: url }));
    } catch (error) {
      console.error('Upload failed', error);
    } finally {
      setUploading(false);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStaff?.companyId) return;
    if (staff.length >= (settings.staffLimit || 5)) {
      setErrorMessage('Staff limit reached!');
      return;
    }
    await addDoc(collection(db, 'staff'), {
      name: newStaffName,
      email: newStaffEmail,
      role: newStaffRole,
      uid: '', 
      companyId: currentStaff.companyId
    });
    setNewStaffEmail('');
    setNewStaffName('');
    setNewStaffRole('staff');
    setSuccessMessage('Staff member added successfully!');
  };

  const handleDeleteStaff = async () => {
    if (!staffToDelete) return;
    try {
      await deleteDoc(doc(db, 'staff', staffToDelete));
      setStaffToDelete(null);
      setSuccessMessage('Staff member removed successfully!');
    } catch (err: any) {
      setErrorMessage('Failed to remove staff: ' + err.message);
    }
  };

  if (!isAdmin) return <div className="p-8 text-center">Access Denied</div>;
  if (!company && !isSuperAdmin) return <div className="p-8 text-center">No company associated with this account.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {company && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-zinc-100">
          <h2 className="text-2xl font-bold text-zinc-900 mb-6 flex items-center gap-2">
            <Settings className="text-primary" />
            Company Settings
          </h2>
          
          <form onSubmit={handleSaveSettings} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-700">Company Name</label>
              <input
                type="text"
                value={settings.name}
                onChange={e => setSettings(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-700">Theme Color</label>
              <div className="flex gap-3">
                <input
                  type="color"
                  value={settings.themeColor}
                  onChange={e => setSettings(prev => ({ ...prev, themeColor: e.target.value }))}
                  className="h-10 w-20 rounded-lg cursor-pointer"
                />
                <span className="text-zinc-500 self-center font-mono">{settings.themeColor}</span>
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold text-zinc-700">Company Logo</label>
              <div className="flex items-center gap-4">
                {settings.logoUrl && (
                  <img src={settings.logoUrl} alt="Logo" className="w-16 h-16 rounded-xl object-cover border border-zinc-200" referrerPolicy="no-referrer" />
                )}
                <label className="flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-xl cursor-pointer transition-all">
                  <Upload className="w-4 h-4" />
                  {uploading ? 'Uploading...' : 'Upload Logo'}
                  <input type="file" className="hidden" onChange={handleLogoUpload} accept="image/*" />
                </label>
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold text-zinc-700">Owner / Sender Signature</label>
              <div className="flex items-center gap-4">
                {settings.ownerSignature && (
                  <img src={settings.ownerSignature} alt="Signature" className="h-16 w-auto rounded-xl object-contain border border-zinc-200 bg-white p-2" referrerPolicy="no-referrer" />
                )}
                <label className="flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-xl cursor-pointer transition-all">
                  <Upload className="w-4 h-4" />
                  {uploading ? 'Uploading...' : 'Upload Signature'}
                  <input type="file" className="hidden" onChange={handleSignatureUpload} accept="image/*" />
                </label>
              </div>
              <p className="text-xs text-zinc-500">This signature will appear on all generated estimates.</p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold text-zinc-700">Address</label>
              <textarea
                value={settings.address}
                onChange={e => setSettings(prev => ({ ...prev, address: e.target.value }))}
                className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none h-24"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-700">GST Number</label>
              <input
                type="text"
                value={settings.gst}
                onChange={e => setSettings(prev => ({ ...prev, gst: e.target.value }))}
                className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-700">PAN Number</label>
              <input
                type="text"
                value={settings.pan}
                onChange={e => setSettings(prev => ({ ...prev, pan: e.target.value }))}
                className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-700">TAN Number</label>
              <input
                type="text"
                value={settings.tan}
                onChange={e => setSettings(prev => ({ ...prev, tan: e.target.value }))}
                className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-700">Staff Limit (Managed by Super Admin)</label>
              <div className="w-full px-4 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-500">
                {settings.staffLimit} Members
              </div>
            </div>

            <div className="md:col-span-2 pt-4">
              <button
                type="submit"
                className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
              >
                <Save className="w-5 h-5" />
                Save Settings
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-zinc-100">
        <h2 className="text-2xl font-bold text-zinc-900 mb-4 flex items-center gap-2">
          <Shield className="text-primary" />
          Active Features (Package: {company?.planName})
        </h2>
        <div className="flex flex-wrap gap-2">
          {company?.features?.map(feature => (
            <span key={feature} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-wider">
              {feature}
            </span>
          ))}
          {(!company?.features || company.features.length === 0) && (
            <p className="text-zinc-500 italic text-sm">No features enabled. Please contact super admin.</p>
          )}
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-zinc-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <Users className="text-primary" />
            Staff Access Panel
          </h2>
          <div className="px-4 py-1.5 bg-zinc-100 rounded-full text-sm font-semibold text-zinc-600 border border-zinc-200">
            {staff.length} / {settings.staffLimit || 5} Staff Members
          </div>
        </div>

        <form onSubmit={handleAddStaff} className="flex flex-wrap gap-4 mb-8">
          <input
            type="text"
            placeholder="Staff Name"
            value={newStaffName}
            onChange={e => setNewStaffName(e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
            required
          />
          <input
            type="email"
            placeholder="Staff Email"
            value={newStaffEmail}
            onChange={e => setNewStaffEmail(e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
            required
          />
          <select
            value={newStaffRole}
            onChange={e => setNewStaffRole(e.target.value as 'admin' | 'staff')}
            className="px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary bg-white"
          >
            <option value="staff">Staff Member</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            className="flex items-center gap-2 bg-zinc-900 text-white px-6 py-2 rounded-xl font-bold hover:bg-zinc-800 transition-all"
          >
            <UserPlus className="w-5 h-5" />
            Add Staff
          </button>
        </form>

        <div className="space-y-3">
          {staff.map(member => (
            <div key={member.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-zinc-200 rounded-full flex items-center justify-center font-bold text-zinc-600">
                  {member.name[0]}
                </div>
                <div>
                  <div className="font-bold text-zinc-900">{member.name}</div>
                  <div className="text-sm text-zinc-500">{member.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                  member.role === 'admin' ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                )}>
                  {member.role}
                </span>
                {member.email !== 'gujjupanchat0@gmail.com' && (
                  <button
                    onClick={() => setStaffToDelete(member.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {staffToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white p-8 rounded-3xl max-w-md w-full space-y-6 shadow-2xl">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-8 h-8" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-zinc-900">Remove Staff?</h3>
              <p className="text-zinc-500 text-sm">
                Are you sure you want to remove this staff member? They will lose access to the system.
              </p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setStaffToDelete(null)}
                className="flex-1 px-6 py-3 rounded-xl font-bold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteStaff}
                className="flex-1 px-6 py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition-all"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success/Error Toast-like Modals */}
      {(successMessage || errorMessage) && (
        <div className="fixed bottom-8 right-8 z-[100] animate-in slide-in-from-bottom-4">
          <div className={cn(
            "px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 min-w-[300px]",
            successMessage ? "bg-white border-green-100 text-green-800" : "bg-white border-red-100 text-red-800"
          )}>
            {successMessage ? (
              <Shield className="w-5 h-5 text-green-500" />
            ) : (
              <Trash2 className="w-5 h-5 text-red-500" />
            )}
            <p className="font-bold flex-1">{successMessage || errorMessage}</p>
            <button 
              onClick={() => { setSuccessMessage(null); setErrorMessage(null); }}
              className="p-1 hover:bg-zinc-100 rounded-lg transition-all"
            >
              <X className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
