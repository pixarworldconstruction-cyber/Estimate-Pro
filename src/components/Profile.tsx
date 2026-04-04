import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Save, User, Mail, Lock, Phone, MapPin, CheckCircle2, FileText, Users, Package, Bell } from 'lucide-react';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { cn } from '../lib/utils';

export default function Profile() {
  const { user, staff, changePassword } = useAuth();
  const [name, setName] = useState(staff?.name || '');
  const [mobile, setMobile] = useState(staff?.mobile || '');
  const [address, setAddress] = useState(staff?.address || '');
  const [gender, setGender] = useState(staff?.gender || '');
  const [birthdate, setBirthdate] = useState(staff?.birthdate || '');
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (staff) {
      setName(staff.name || '');
      setMobile(staff.mobile || '');
      setAddress(staff.address || '');
      setGender(staff.gender || '');
      setBirthdate(staff.birthdate || '');
    }
  }, [staff]);

  const features = [
    { id: 'estimates', name: 'Estimates', icon: FileText },
    { id: 'clients', name: 'Clients', icon: Users },
    { id: 'items', name: 'Items', icon: Package },
    { id: 'reminders', name: 'Reminders', icon: Bell },
  ];

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staff?.id) return;
    setUpdatingProfile(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      await updateDoc(doc(db, 'staff', staff.id), {
        name,
        mobile,
        address,
        gender,
        birthdate
      });
      setSuccessMessage('Profile updated successfully!');
    } catch (error: any) {
      setErrorMessage('Failed to update profile: ' + error.message);
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) return;
    setChangingPassword(true);
    setSuccessMessage(null);
    setErrorMessage(null);
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

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100">
        <h2 className="text-2xl font-bold text-zinc-900 mb-8 flex items-center gap-2">
          <User className="text-primary" />
          My Profile
        </h2>

        <div className="space-y-8">
          <div className="flex items-center gap-6 p-6 bg-zinc-50 rounded-3xl border border-zinc-100">
            <div className="w-20 h-20 bg-primary text-white rounded-full flex items-center justify-center text-3xl font-bold shadow-lg shadow-primary/20">
              {staff?.name?.[0] || user?.email?.[0]?.toUpperCase()}
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-black text-zinc-900">{staff?.name || 'User'}</div>
              <div className="text-zinc-500 flex items-center gap-2 font-medium">
                <Mail className="w-4 h-4" />
                {user?.email}
              </div>
              <div className="pt-2">
                <span className="px-4 py-1.5 bg-zinc-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest">
                  {staff?.role || 'Staff'}
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="Your full name"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary" />
                  Mobile Number
                </label>
                <input
                  type="tel"
                  value={mobile}
                  onChange={e => setMobile(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="Your mobile number"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  Address
                </label>
                <textarea
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all h-24"
                  placeholder="Your address"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700">Gender</label>
                <select
                  value={gender}
                  onChange={e => setGender(e.target.value as any)}
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700">Birthdate</label>
                <input
                  type="date"
                  value={birthdate}
                  onChange={e => setBirthdate(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={updatingProfile}
              className="flex items-center gap-2 bg-primary text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {updatingProfile ? 'Saving...' : 'Save Profile Details'}
            </button>
          </form>

          {staff?.role !== 'super_admin' && (
            <div className="pt-8 border-t border-zinc-100">
              <h3 className="text-lg font-bold text-zinc-900 mb-6 flex items-center gap-2">
                <Shield className="text-primary w-5 h-5" />
                Allocated Features
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {features.map(feature => {
                  const isAllocated = staff?.permissions?.includes(feature.id) || staff?.role === 'admin';
                  return (
                    <div 
                      key={feature.id}
                      className={cn(
                        "p-4 rounded-2xl border flex flex-col items-center gap-3 transition-all",
                        isAllocated ? "bg-primary/5 border-primary/20" : "bg-zinc-50 border-zinc-100 opacity-50"
                      )}
                    >
                      <feature.icon className={cn("w-6 h-6", isAllocated ? "text-primary" : "text-zinc-400")} />
                      <span className={cn("text-[10px] font-black uppercase tracking-widest", isAllocated ? "text-primary" : "text-zinc-400")}>
                        {feature.name}
                      </span>
                      {isAllocated && <CheckCircle2 className="w-4 h-4 text-primary" />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-8 border-t border-zinc-100">
            <h3 className="text-xl font-bold text-zinc-900 mb-6 flex items-center gap-2">
              <Lock className="text-primary" />
              Change Password
            </h3>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">New Password</label>
                <input
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                  required
                  minLength={6}
                />
              </div>
              <button
                type="submit"
                disabled={changingPassword}
                className="w-full flex items-center justify-center gap-2 bg-zinc-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-zinc-800 transition-all disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                {changingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {(successMessage || errorMessage) && (
        <div className="fixed bottom-8 right-8 z-[100] animate-in slide-in-from-bottom-4">
          <div className={cn(
            "px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 min-w-[300px]",
            successMessage ? "bg-white border-green-100 text-green-800" : "bg-white border-red-100 text-red-800"
          )}>
            {successMessage ? (
              <Shield className="w-5 h-5 text-green-500" />
            ) : (
              <Lock className="w-5 h-5 text-red-500" />
            )}
            <p className="font-bold flex-1">{successMessage || errorMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
