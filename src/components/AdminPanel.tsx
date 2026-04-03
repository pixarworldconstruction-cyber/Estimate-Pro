import React, { useState, useEffect } from 'react';
import { db, storage, firebaseConfig } from '../firebase';
import { doc, setDoc, collection, onSnapshot, deleteDoc, addDoc, query, where, updateDoc, getDocs } from 'firebase/firestore';
import { ref, uploadBytesResumable, uploadBytes, getDownloadURL } from 'firebase/storage';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import { Save, Upload, Plus, Trash2, UserPlus, Shield, Settings, Users, X, FileText, Package, Bell, Clock, CheckCircle2, Phone, MapPin, Edit2, Mail, Zap, TrendingUp, PenTool, Ruler, Calculator as CalcIcon, HardHat, Lock, Smartphone } from 'lucide-react';
import { Staff, Company } from '../types';
import { cn, toDate } from '../lib/utils';

export default function AdminPanel({ setActiveTab }: { setActiveTab?: (tab: string) => void }) {
  const { user, company, isAdmin, isSuperAdmin, staff: currentStaff } = useAuth();
  const [settings, setSettings] = useState<Partial<Company>>({
    name: '',
    address: '',
    gst: '',
    pan: '',
    tan: '',
    cin: '',
    tin: '',
    themeColor: '#10b981',
    staffLimit: 5,
    logoUrl: '',
    ownerSignature: '',
    gstEnabled: true,
    estimateTemplate: 'classic',
    invoiceTemplate: 'classic',
  });
  const [staff, setStaff] = useState<Staff[]>([]);
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffMobile, setNewStaffMobile] = useState('');
  const [newStaffAddress, setNewStaffAddress] = useState('');
  const [newStaffPosition, setNewStaffPosition] = useState('Manager');
  const [newStaffRole, setNewStaffRole] = useState<'admin' | 'staff'>('staff');
  const [uploading, setUploading] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [staffPermissions, setStaffPermissions] = useState<string[]>([]);
  const [editName, setEditName] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPosition, setEditPosition] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'staff' | 'super_admin'>('staff');
  const [staffToDelete, setStaffToDelete] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { changePassword, logout } = useAuth();

  const features = [
    { id: 'estimates', name: 'Estimates', icon: FileText },
    { id: 'invoices', name: 'Invoices', icon: FileText },
    { id: 'projects', name: 'Projects', icon: HardHat },
    { id: 'clients', name: 'Clients', icon: Users },
    { id: 'items', name: 'Items', icon: Package },
    { id: 'reminders', name: 'Reminders', icon: Bell },
    { id: 'insights', name: 'Business Insights', icon: TrendingUp },
    { id: 'sketch', name: 'Sketch Pad', icon: PenTool },
    { id: 'converter', name: 'Unit Conversion', icon: Ruler },
    { id: 'calculator', name: 'Calculator', icon: CalcIcon },
    { id: 'construction-calc', name: 'Engineering Toolset', icon: HardHat },
  ];

  const positions = [
    'Accountant', 'Manager', 'Marketing Executive', 'Sales Executive', 
    'Site Engineer', 'Site Supervisor', 'Civil Engineer', 'Custom'
  ];

  useEffect(() => {
    if (editingStaff) {
      setStaffPermissions(editingStaff.permissions || features.map(f => f.id));
      setEditName(editingStaff.name || '');
      setEditMobile(editingStaff.mobile || '');
      setEditAddress(editingStaff.address || '');
      setEditPosition(editingStaff.position || 'Manager');
      setEditRole(editingStaff.role || 'staff');
    }
  }, [editingStaff]);

  const handleUpdateStaff = async () => {
    if (!editingStaff) return;
    try {
      await updateDoc(doc(db, 'staff', editingStaff.id), {
        name: editName,
        mobile: editMobile,
        address: editAddress,
        position: editPosition,
        role: editRole,
        permissions: staffPermissions
      });
      setEditingStaff(null);
      setSuccessMessage('Staff details updated!');
    } catch (error: any) {
      setErrorMessage('Failed to update staff: ' + error.message);
    }
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
  const showExpiryWarning = isTrial ? remainingDays <= 7 : remainingDays <= 30;

  const handleCopyReferral = () => {
    if (company?.referralCode) {
      navigator.clipboard.writeText(company.referralCode);
      setSuccessMessage('Referral code copied to clipboard!');
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  useEffect(() => {
    if (company) {
      setSettings({
        ...company,
        name: company.name || '',
        address: company.address || '',
        gst: company.gst || '',
        cin: company.cin || '',
        pan: company.pan || '',
        tan: company.tan || '',
        tin: company.tin || '',
        logoUrl: company.logoUrl || '',
        ownerSignature: company.ownerSignature || '',
        themeColor: company.themeColor || '#10b981',
        staffLimit: company.staffLimit || 5,
        estimateTemplate: company.estimateTemplate || 'classic',
        invoiceTemplate: company.invoiceTemplate || 'classic',
      });
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

  const compressImage = (file: File, maxWidth = 800, maxHeight = 800): Promise<Blob | File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              resolve(blob || file);
            },
            'image/jpeg',
            0.8
          );
        };
        img.onerror = () => resolve(file);
      };
      reader.onerror = () => resolve(file);
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentStaff?.companyId) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setErrorMessage('Only .jpg, .png and .webp files are allowed.');
      return;
    }

    setUploading(true);
    setSuccessMessage('Compressing logo...');
    setErrorMessage(null);

    if (!navigator.onLine) {
      setErrorMessage('You are offline. Please connect to the internet to upload files.');
      setUploading(false);
      return;
    }

    try {
      const compressedFile = await compressImage(file, 800, 800);
      setSuccessMessage('Uploading logo...');
      const storageRef = ref(storage, `companies/${currentStaff.companyId}/logo`);
      
      const uploadTask = uploadBytesResumable(storageRef, compressedFile);
      
      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setSuccessMessage(`Uploading logo: ${Math.round(progress)}%`);
        }, 
        (error) => {
          console.error('Upload failed', error);
          setErrorMessage('Logo upload failed: ' + error.message);
          setUploading(false);
        }, 
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          setSettings(prev => ({ ...prev, logoUrl: url }));
          await updateDoc(doc(db, 'companies', currentStaff.companyId), { logoUrl: url });
          setSuccessMessage('Logo uploaded successfully!');
          setUploading(false);
        }
      );
    } catch (error: any) {
      console.error('Compression failed', error);
      setErrorMessage('Logo compression failed: ' + error.message);
      setUploading(false);
    }
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentStaff?.companyId) return;

    setUploading(true);
    setSuccessMessage('Compressing signature...');
    try {
      const compressedFile = await compressImage(file, 400, 200);
      setSuccessMessage('Uploading signature...');
      const storageRef = ref(storage, `companies/${currentStaff.companyId}/signature`);
      
      const uploadTask = uploadBytesResumable(storageRef, compressedFile);
      
      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setSuccessMessage(`Uploading signature: ${Math.round(progress)}%`);
        }, 
        (error) => {
          setErrorMessage('Signature upload failed: ' + error.message);
          setUploading(false);
        }, 
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          setSettings(prev => ({ ...prev, ownerSignature: url }));
          await updateDoc(doc(db, 'companies', currentStaff.companyId), { ownerSignature: url });
          setSuccessMessage('Signature uploaded successfully!');
          setUploading(false);
        }
      );
    } catch (error: any) {
      setErrorMessage('Signature compression failed: ' + error.message);
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
    
    // Check if staff already exists in this company
    if (staff.some(s => s.email.toLowerCase() === newStaffEmail.toLowerCase())) {
      setErrorMessage('This email is already added to your staff list.');
      return;
    }

    // Generate a temporary password
    const generatedPass = Math.random().toString(36).slice(-8);
    setSuccessMessage('Creating staff account...');
    setErrorMessage(null);

    try {
      // Create user in Firebase Auth using secondary app instance to avoid logging out admin
      const secondaryApp = initializeApp(firebaseConfig, 'Secondary');
      const secondaryAuth = getAuth(secondaryApp);
      let uid = '';
      
      try {
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newStaffEmail, generatedPass);
        uid = userCredential.user.uid;
        await signOut(secondaryAuth);
      } catch (authError: any) {
        if (authError.code === 'auth/email-already-in-use') {
          // Email exists in Auth, check if it exists in our staff collection
          const q = query(collection(db, 'staff'), where('email', '==', newStaffEmail));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            throw new Error('This user is already registered as staff in a company.');
          }
          // Not in staff collection, so we can add as pending
          uid = ''; // Will be linked on first login
        } else {
          throw authError;
        }
      } finally {
        await deleteApp(secondaryApp);
      }

      const staffData = {
        name: newStaffName,
        email: newStaffEmail,
        mobile: newStaffMobile,
        address: newStaffAddress,
        role: newStaffRole,
        uid: uid,
        companyId: currentStaff.companyId,
        position: newStaffPosition,
        tempPassword: uid ? generatedPass : '', // Only show temp pass if we created the account
        permissions: features.map(f => f.id)
      };

      if (uid) {
        // Use UID as document ID for better performance and consistency
        await setDoc(doc(db, 'staff', uid), staffData);
      } else {
        // Create a pending record with random ID
        await addDoc(collection(db, 'staff'), staffData);
      }
      
      setTempPassword(uid ? generatedPass : null);
      setNewStaffEmail('');
      setNewStaffName('');
      setNewStaffMobile('');
      setNewStaffAddress('');
      setNewStaffRole('staff');
      
      if (uid) {
        setSuccessMessage('Staff member added successfully! Give them the temporary password.');
      } else {
        setSuccessMessage('User already has an account. They have been added to your staff list and can log in with their existing password.');
      }
    } catch (error: any) {
      console.error('Failed to add staff', error);
      setErrorMessage('Failed to add staff: ' + error.message);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) return;
    setChangingPassword(true);
    try {
      await changePassword(newPassword);
      setSuccessMessage('Password changed successfully!');
      setNewPassword('');
    } catch (error: any) {
      setErrorMessage('Failed to change password: ' + error.message);
    } finally {
      setChangingPassword(false);
    }
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

  const handleDeleteCompany = async () => {
    if (!currentStaff?.companyId) return;
    setUploading(true);
    try {
      // 1. Delete all staff members
      const staffQuery = query(collection(db, 'staff'), where('companyId', '==', currentStaff.companyId));
      const staffDocs = await getDocs(staffQuery);
      const staffDeletes = staffDocs.docs.map(d => deleteDoc(d.ref));
      await Promise.all(staffDeletes);

      // 2. Delete company document
      await deleteDoc(doc(db, 'companies', currentStaff.companyId));

      setSuccessMessage('Account deleted successfully. Logging out...');
      setTimeout(() => {
        logout();
      }, 2000);
    } catch (error: any) {
      setErrorMessage('Failed to delete account: ' + error.message);
    } finally {
      setUploading(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!isAdmin) return <div className="p-8 text-center">Access Denied</div>;
  if (!company && !isSuperAdmin) return <div className="p-8 text-center">No company associated with this account.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {company && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={cn(
            "p-6 rounded-3xl border flex items-center justify-between gap-6 shadow-sm",
            showExpiryWarning ? "bg-red-50 border-red-100" : "bg-zinc-900 border-zinc-800 text-white"
          )}>
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg",
                showExpiryWarning ? "bg-red-500 text-white" : "bg-primary text-white"
              )}>
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <div className={cn("text-sm font-medium opacity-70", !showExpiryWarning && "text-zinc-400")}>
                  {isTrial ? 'Trial Period' : 'Subscription Plan'}: <span className="font-bold">{company.planName}</span>
                </div>
                <div className={cn("text-2xl font-black", showExpiryWarning ? "text-red-600" : "text-white")}>
                  {remainingDays} Days Remaining
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-3xl border bg-white border-zinc-100 flex items-center justify-between gap-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shadow-lg">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <div className="text-sm font-medium text-zinc-500">
                  Referral Program: <span className="font-bold text-primary">{company.referralCount || 0} Referrals</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-zinc-900">{company.referralCode || 'N/A'}</span>
                  <button 
                    onClick={handleCopyReferral}
                    className="p-1.5 hover:bg-zinc-100 rounded-lg transition-all text-zinc-400 hover:text-zinc-900"
                    title="Copy Code"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {company && (
        <div className="space-y-8">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-4xl font-bold text-zinc-900">Company Identity</h1>
              {setActiveTab && (
                <button 
                  onClick={() => setActiveTab('subscription')}
                  className="flex items-center gap-2 px-6 py-3 bg-primary/10 text-primary rounded-2xl font-bold hover:bg-primary/20 transition-all"
                >
                  <Zap className="w-5 h-5" />
                  Upgrade Packages
                </button>
              )}
            </div>
            <p className="text-zinc-500">Configure the business details displayed on your estimates.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8">
            <div className="space-y-6">
              <div className="bg-white p-10 rounded-[48px] border border-zinc-100 shadow-sm text-center space-y-6">
                <div className="relative inline-block">
                  <div className="w-32 h-32 bg-zinc-900 rounded-[32px] flex items-center justify-center text-white text-5xl font-black shadow-2xl overflow-hidden">
                    {settings.logoUrl ? (
                      <img 
                        key={settings.logoUrl}
                        src={settings.logoUrl} 
                        alt="Logo" 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer" 
                        crossOrigin="anonymous"
                      />
                    ) : (
                      settings.name?.[0] || 'P'
                    )}
                  </div>
                  <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 transition-all">
                    <Upload size={18} />
                    <input type="file" className="hidden" onChange={handleLogoUpload} accept="image/*" />
                  </label>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-zinc-900">{settings.name}</h3>
                  <div className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">Active Workspace</div>
                </div>
              </div>

              <div className="bg-primary p-8 rounded-[40px] text-white relative overflow-hidden">
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                    <FileText size={24} />
                  </div>
                  <h3 className="text-lg font-bold uppercase tracking-widest mb-2">Identity Note</h3>
                  <p className="text-white/70 text-sm leading-relaxed">
                    Changes made here will automatically reflect on all new estimates and reports you generate.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-10 rounded-[56px] border border-zinc-100 shadow-sm">
              <form onSubmit={handleSaveSettings} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3 md:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Organization Name</label>
                    <input
                      type="text"
                      value={settings.name}
                      onChange={e => setSettings(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Email Id</label>
                    <input
                      type="email"
                      value={settings.email || ''}
                      onChange={e => setSettings(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                      placeholder="Business Email Address"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Contact Number</label>
                    <input
                      type="tel"
                      value={settings.phone || ''}
                      onChange={e => setSettings(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                    />
                  </div>

                  <div className="space-y-3 md:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Registered Address</label>
                    <textarea
                      value={settings.address}
                      onChange={e => setSettings(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all h-32"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">GST Number</label>
                    <div className="flex items-center gap-4">
                      <input
                        type="text"
                        value={settings.gst}
                        onChange={e => setSettings(prev => ({ ...prev, gst: e.target.value }))}
                        className="flex-1 px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                        disabled={!settings.gstEnabled}
                      />
                      <button
                        type="button"
                        onClick={() => setSettings(prev => ({ ...prev, gstEnabled: !prev.gstEnabled }))}
                        className={cn(
                          "px-6 py-5 rounded-3xl font-bold transition-all",
                          settings.gstEnabled ? "bg-primary text-white" : "bg-zinc-100 text-zinc-400"
                        )}
                      >
                        {settings.gstEnabled ? 'GST ON' : 'GST OFF'}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">CIN Number</label>
                    <input
                      type="text"
                      value={settings.cin || ''}
                      onChange={e => setSettings(prev => ({ ...prev, cin: e.target.value }))}
                      className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                      placeholder="Corporate Identification Number"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">TIN Number</label>
                    <input
                      type="text"
                      value={settings.tin || ''}
                      onChange={e => setSettings(prev => ({ ...prev, tin: e.target.value }))}
                      className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                      placeholder="Tax Identification Number"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">PAN Number</label>
                    <input
                      type="text"
                      value={settings.pan || ''}
                      onChange={e => setSettings(prev => ({ ...prev, pan: e.target.value }))}
                      className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                      placeholder="Permanent Account Number"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">TAN Number</label>
                    <input
                      type="text"
                      value={settings.tan || ''}
                      onChange={e => setSettings(prev => ({ ...prev, tan: e.target.value }))}
                      className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                      placeholder="Tax Deduction Account Number"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Estimate Template</label>
                    <select
                      value={settings.estimateTemplate}
                      onChange={e => setSettings(prev => ({ ...prev, estimateTemplate: e.target.value as 'classic' | 'modern' }))}
                      className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                    >
                      <option value="classic">Classic Template</option>
                      <option value="modern">Modern Template</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Invoice Template</label>
                    <select
                      value={settings.invoiceTemplate}
                      onChange={e => setSettings(prev => ({ ...prev, invoiceTemplate: e.target.value as 'classic' | 'modern' }))}
                      className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                    >
                      <option value="classic">Classic Template</option>
                      <option value="modern">Modern Template</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Theme Color</label>
                    <div className="flex gap-4 items-center px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl">
                      <input
                        type="color"
                        value={settings.themeColor}
                        onChange={e => setSettings(prev => ({ ...prev, themeColor: e.target.value }))}
                        className="h-10 w-10 rounded-xl cursor-pointer border-none bg-transparent"
                      />
                      <span className="font-mono font-bold text-zinc-500 uppercase">{settings.themeColor}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-zinc-900 text-white py-6 rounded-[32px] text-xl font-black uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-2xl shadow-zinc-900/20"
                >
                  Save Identity Changes
                </button>

                <div className="pt-4 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => window.open('https://drive.google.com/file/d/1OI13OZ5H0jQgBsr6mFbk6wtRcu5lAWJC/view?usp=sharing', '_blank')}
                    className="w-full flex items-center justify-center gap-3 py-5 bg-primary/10 text-primary rounded-[32px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all border-2 border-primary/20 mb-4"
                  >
                    <Smartphone className="w-6 h-6" />
                    Download Android App
                  </button>

                  <div className="p-8 bg-red-50 rounded-[32px] border border-red-100 space-y-4">
                    <div className="flex items-center gap-3 text-red-600">
                      <Trash2 className="w-6 h-6" />
                      <h3 className="text-lg font-bold uppercase tracking-widest">Danger Zone</h3>
                    </div>
                    <p className="text-sm text-red-700 font-medium">
                      Once you delete your company account, there is no going back. All your data, including staff, clients, estimates, and projects, will be permanently removed.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
                    >
                      Delete Company Account
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Company Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110] p-4 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-[40px] max-w-md w-full space-y-6 shadow-2xl border border-red-100">
            <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
              <Trash2 className="w-10 h-10" />
            </div>
            <div className="text-center space-y-3">
              <h3 className="text-2xl font-black text-zinc-900 uppercase tracking-tight">Delete Account?</h3>
              <div className="p-4 bg-red-50 rounded-2xl text-left border border-red-100">
                <p className="text-red-800 text-sm font-bold leading-relaxed">
                  Notice: If any payment made will not be refund any condition, once account delete your all data will loss.
                </p>
              </div>
              <p className="text-zinc-500 text-sm font-medium">
                This action is permanent and cannot be undone. Are you absolutely sure?
              </p>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-6 py-4 rounded-2xl font-bold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteCompany}
                disabled={uploading}
                className="flex-1 px-6 py-4 rounded-2xl font-bold text-white bg-red-600 hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 disabled:opacity-50"
              >
                {uploading ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {company && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Referral Code</p>
              <p className="text-xl font-black text-zinc-900 font-mono tracking-tighter">{company.referralCode || 'N/A'}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Total Referrals</p>
              <p className="text-xl font-black text-zinc-900">{company.referralCount || 0}</p>
            </div>
          </div>
          <div className="bg-primary p-6 rounded-2xl text-white shadow-lg shadow-primary/20 flex items-center justify-between">
            <div>
              <p className="text-xs text-white/70 font-medium uppercase tracking-wider">Referral Benefit</p>
              <p className="text-lg font-bold leading-tight">Get 10% OFF on next package</p>
            </div>
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

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

        <form onSubmit={handleAddStaff} className="space-y-4 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Staff Name"
              value={newStaffName}
              onChange={e => setNewStaffName(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
              required
            />
            <input
              type="email"
              placeholder="Staff Email"
              value={newStaffEmail}
              onChange={e => setNewStaffEmail(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
              required
            />
            <input
              type="tel"
              placeholder="Mobile Number"
              value={newStaffMobile}
              onChange={e => setNewStaffMobile(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
            />
            <div className="flex flex-col gap-2">
              <select
                value={positions.includes(newStaffPosition) ? newStaffPosition : 'Custom'}
                onChange={e => {
                  if (e.target.value !== 'Custom') {
                    setNewStaffPosition(e.target.value);
                  } else {
                    setNewStaffPosition('Custom');
                  }
                }}
                className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary bg-white"
              >
                {positions.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              {(newStaffPosition === 'Custom' || !positions.includes(newStaffPosition)) && (
                <input
                  type="text"
                  placeholder="Enter Custom Position"
                  value={newStaffPosition === 'Custom' ? '' : newStaffPosition}
                  onChange={e => setNewStaffPosition(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                  required
                />
              )}
            </div>
            <select
              value={newStaffRole}
              onChange={e => setNewStaffRole(e.target.value as 'admin' | 'staff')}
              className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary bg-white"
            >
              <option value="staff">Staff Member</option>
              <option value="admin">Admin</option>
            </select>
            <div className="md:col-span-2">
              <textarea
                placeholder="Address"
                value={newStaffAddress}
                onChange={e => setNewStaffAddress(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary h-20"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-zinc-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-zinc-800 transition-all"
          >
            <UserPlus className="w-5 h-5" />
            Add Staff Member
          </button>
        </form>

        {tempPassword && (
          <div className="mb-8 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="text-amber-500 w-5 h-5" />
              <div>
                <div className="text-sm font-bold text-amber-900">Temporary Password Generated</div>
                <div className="text-xs text-amber-700">Please share this with the staff member: <span className="font-mono font-black text-lg ml-2">{tempPassword}</span></div>
              </div>
            </div>
            <button onClick={() => setTempPassword(null)} className="p-2 hover:bg-amber-100 rounded-lg">
              <X className="w-4 h-4 text-amber-500" />
            </button>
          </div>
        )}

        <div className="space-y-3">
          {staff.filter(m => m.uid !== user?.uid).map(member => (
            <div key={member.id} className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-zinc-200 rounded-full flex items-center justify-center font-bold text-zinc-600 text-lg">
                    {member.name[0]}
                  </div>
                  <div>
                    <div className="font-bold text-zinc-900">{member.name}</div>
                    <div className="text-[10px] font-black text-primary uppercase tracking-widest">{member.position || 'Staff'}</div>
                    <div className="text-sm text-zinc-500 flex items-center gap-2">
                      <Mail className="w-3 h-3" />
                      {member.email}
                    </div>
                    {member.tempPassword && (
                      <div className="mt-2 p-2 bg-amber-50 border border-amber-100 rounded-lg flex items-center gap-2 text-[10px] text-amber-700">
                        <Lock className="w-3 h-3 text-amber-500" />
                        <span>Temp Password: <span className="font-mono font-black text-xs">{member.tempPassword}</span></span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                    member.role === 'admin' ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                  )}>
                    {member.role}
                  </span>
                  <button
                    onClick={() => setEditingStaff(member)}
                    className="p-2 text-zinc-400 hover:text-primary hover:bg-zinc-100 rounded-lg transition-all"
                    title="Edit Staff"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-zinc-200/50">
                {member.mobile && (
                  <div className="flex items-center gap-2 text-sm text-zinc-600">
                    <Phone className="w-4 h-4 text-primary" />
                    {member.mobile}
                  </div>
                )}
                {member.address && (
                  <div className="flex items-center gap-2 text-sm text-zinc-600">
                    <MapPin className="w-4 h-4 text-primary" />
                    {member.address}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {features.map(f => {
                  const hasAccess = member.permissions?.includes(f.id) || member.role === 'admin';
                  if (!hasAccess) return null;
                  return (
                    <div key={f.id} className="flex items-center gap-1 px-2 py-1 bg-white rounded-lg border border-zinc-200 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                      <f.icon className="w-3 h-3" />
                      {f.name}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Staff Modal */}
      {editingStaff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white p-8 rounded-3xl max-w-2xl w-full space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-zinc-900">Edit Staff Member</h3>
              <button onClick={() => setEditingStaff(null)} className="p-2 hover:bg-zinc-100 rounded-full">
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700">Mobile Number</label>
                <input
                  type="tel"
                  value={editMobile}
                  onChange={e => setEditMobile(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700">Position</label>
                <div className="flex flex-col gap-2">
                  <select
                    value={positions.includes(editPosition) ? editPosition : 'Custom'}
                    onChange={e => {
                      if (e.target.value !== 'Custom') {
                        setEditPosition(e.target.value);
                      } else {
                        setEditPosition('Custom');
                      }
                    }}
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary bg-white"
                  >
                    {positions.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  {(editPosition === 'Custom' || !positions.includes(editPosition)) && (
                    <input
                      type="text"
                      placeholder="Enter Custom Position"
                      value={editPosition === 'Custom' ? '' : editPosition}
                      onChange={e => setEditPosition(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                      required
                    />
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700">Role</label>
                <select
                  value={editRole}
                  onChange={e => setEditRole(e.target.value as 'admin' | 'staff' | 'super_admin')}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary bg-white"
                >
                  <option value="staff">Staff Member</option>
                  <option value="admin">Admin</option>
                  {editRole === 'super_admin' && <option value="super_admin">Super Admin</option>}
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold text-zinc-700">Address</label>
                <textarea
                  value={editAddress}
                  onChange={e => setEditAddress(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary h-20"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-100">
              <h4 className="text-sm font-bold text-zinc-900 mb-4 flex items-center gap-2">
                <Shield className="text-primary w-4 h-4" />
                Feature Permissions
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {features.map(feature => (
                  <label 
                    key={feature.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all",
                      staffPermissions.includes(feature.id) ? "border-primary bg-primary/5" : "border-zinc-100 hover:border-zinc-200"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <feature.icon className={cn("w-4 h-4", staffPermissions.includes(feature.id) ? "text-primary" : "text-zinc-400")} />
                      <span className="text-sm font-bold text-zinc-700">{feature.name}</span>
                    </div>
                    <input 
                      type="checkbox"
                      className="hidden"
                      checked={staffPermissions.includes(feature.id)}
                      onChange={() => {
                        if (staffPermissions.includes(feature.id)) {
                          setStaffPermissions(prev => prev.filter(id => id !== feature.id));
                        } else {
                          setStaffPermissions(prev => [...prev, feature.id]);
                        }
                      }}
                    />
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                      staffPermissions.includes(feature.id) ? "border-primary bg-primary text-white" : "border-zinc-200"
                    )}>
                      {staffPermissions.includes(feature.id) && <CheckCircle2 className="w-3 h-3" />}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button 
                onClick={() => setEditingStaff(null)}
                className="flex-1 px-6 py-3 rounded-xl font-bold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleUpdateStaff}
                className="flex-1 px-6 py-3 rounded-xl font-bold text-white bg-zinc-900 hover:bg-zinc-800 transition-all"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

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
