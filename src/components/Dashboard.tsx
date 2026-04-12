import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, limit, where, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Users, 
  FileText, 
  Bell, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  ArrowRight,
  Plus,
  Handshake,
  Ban,
  GitBranch,
  Eye,
  Pencil,
  Trash2,
  X
} from 'lucide-react';
import { Client, Estimate, Reminder, Announcement } from '../types';
import { formatCurrency, cn, toDate } from '../lib/utils';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { OperationType, handleFirestoreError } from '../firebase';
import ConfirmModal from './ConfirmModal';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import LivePresence from './LivePresence';

export default function Dashboard({ setActiveTab, setSelectedEstimateId }: { 
  setActiveTab: (tab: string) => void;
  setSelectedEstimateId?: (id: string | null, mode?: 'view' | 'edit') => void;
}) {
  const { staff, company, isSuperAdmin } = useAuth();
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (company?.showWelcome) {
      setShowWelcome(true);
    }
  }, [company?.showWelcome]);

  const closeWelcome = async () => {
    if (company?.id) {
      await updateDoc(doc(db, 'companies', company.id), { showWelcome: false });
    }
    setShowWelcome(false);
  };

  const [stats, setStats] = useState({
    totalClients: 0,
    totalEstimates: 0,
    totalEstimatesCount: 0,
    pendingEstimates: 0,
    activeReminders: 0,
    totalRevenue: 0,
    totalEstimateValue: 0,
    conversionRate: 0
  });
  const [timePeriod, setTimePeriod] = useState<'all' | 'month' | 'week' | 'year'>('all');
  const [recentEstimates, setRecentEstimates] = useState<Estimate[]>([]);
  const [upcomingReminders, setUpcomingReminders] = useState<Reminder[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [estimateToDelete, setEstimateToDelete] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<string[]>(() => {
    const saved = localStorage.getItem('dismissed_announcements');
    return saved ? JSON.parse(saved) : [];
  });

  const dismissAnnouncement = (id: string) => {
    const updated = [...dismissedAnnouncements, id];
    setDismissedAnnouncements(updated);
    localStorage.setItem('dismissed_announcements', JSON.stringify(updated));
  };

  useEffect(() => {
    if (!staff?.companyId && !isSuperAdmin) return;

    const announcementsQuery = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const unsubAnnouncements = onSnapshot(announcementsQuery, (snapshot) => {
      const allAnnouncements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
      
      // Filter based on target
      const filtered = allAnnouncements.filter(ann => {
        if (isSuperAdmin) return true;
        if (ann.targetType === 'all') return true;
        if (ann.targetType === 'selected' || ann.targetType === 'individual') {
          return ann.targetCompanyIds?.includes(staff?.companyId || '');
        }
        return false;
      });
      setAnnouncements(filtered);
    });

    return () => unsubAnnouncements();
  }, [staff, isSuperAdmin]);

  useEffect(() => {
    if (!staff) return;

    const clientsQuery = isSuperAdmin 
      ? query(collection(db, 'clients'))
      : query(collection(db, 'clients'), where('companyId', '==', staff.companyId));

    const unsubClients = onSnapshot(clientsQuery, (snapshot) => {
      setStats(prev => ({ ...prev, totalClients: snapshot.size }));
      const sortedClients = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Client))
        .sort((a, b) => a.name.localeCompare(b.name));
      setClients(sortedClients);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'clients'));

    const estimatesQuery = isSuperAdmin
      ? query(collection(db, 'estimates'))
      : query(collection(db, 'estimates'), where('companyId', '==', staff.companyId));

    const unsubEstimates = onSnapshot(estimatesQuery, (snapshot) => {
      const allEstimates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Estimate));
      
      const filterByTime = (estimates: Estimate[]) => {
        if (timePeriod === 'all') return estimates;
        const now = new Date();
        return estimates.filter(e => {
          const date = toDate(e.createdAt);
          if (timePeriod === 'week') {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return date >= weekAgo;
          }
          if (timePeriod === 'month') {
            const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            return date >= monthAgo;
          }
          if (timePeriod === 'year') {
            const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
            return date >= yearAgo;
          }
          return true;
        });
      };

      const filteredEstimates = filterByTime(allEstimates);
      const approved = filteredEstimates.filter(e => e.status === 'approved');
      const pending = filteredEstimates.filter(e => e.status === 'pending').length;
      const revenue = approved.reduce((acc, e) => acc + (e.total || 0), 0);
      const totalVal = filteredEstimates.reduce((acc, e) => acc + (e.total || 0), 0);
      const conversion = filteredEstimates.length ? (approved.length / filteredEstimates.length * 100) : 0;

      setStats(prev => ({ 
        ...prev, 
        totalEstimates: filteredEstimates.length, 
        totalEstimatesCount: allEstimates.length,
        pendingEstimates: pending,
        totalRevenue: revenue,
        totalEstimateValue: totalVal,
        conversionRate: conversion
      }));
      
      const sortedEstimates = allEstimates
        .sort((a, b) => {
          const dateA = toDate(a.createdAt);
          const dateB = toDate(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 10);
      setRecentEstimates(sortedEstimates);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'estimates'));

    const remindersQuery = isSuperAdmin
      ? query(collection(db, 'reminders'), where('status', '==', 'pending'))
      : query(collection(db, 'reminders'), where('companyId', '==', staff.companyId), where('status', '==', 'pending'));

    const unsubReminders = onSnapshot(remindersQuery, (snapshot) => {
      setStats(prev => ({ ...prev, activeReminders: snapshot.size }));
      const sortedReminders = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Reminder))
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(0, 5);
      setUpcomingReminders(sortedReminders);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'reminders'));

    return () => {
      unsubClients();
      unsubEstimates();
      unsubReminders();
    };
  }, [staff, timePeriod]);

  const handleStatusUpdate = async (estimateId: string, status: Estimate['status']) => {
    try {
      await updateDoc(doc(db, 'estimates', estimateId), { status });
    } catch (error) {
      console.error('Failed to update status', error);
    }
  };

  const handleDelete = async () => {
    if (!estimateToDelete) return;
    try {
      await deleteDoc(doc(db, 'estimates', estimateToDelete));
      setEstimateToDelete(null);
    } catch (error) {
      console.error('Failed to delete estimate', error);
    }
  };

  return (
    <div className="space-y-10">
      {/* Announcements Section */}
      {announcements.filter(a => !dismissedAnnouncements.includes(a.id)).length > 0 && (
        <div className="space-y-4">
          {announcements.filter(a => !dismissedAnnouncements.includes(a.id)).map(ann => (
            <motion.div
              key={ann.id}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-primary/5 border border-primary/20 p-6 rounded-3xl relative overflow-hidden group"
            >
              <button
                onClick={() => dismissAnnouncement(ann.id)}
                className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-900 hover:bg-white rounded-xl transition-all z-10"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-all">
                <Bell className="w-12 h-12 text-primary" />
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-zinc-900 text-lg">{ann.title}</h3>
                  <p className="text-zinc-600 mt-1 whitespace-pre-wrap">{ann.message}</p>
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-3">
                    {ann.createdAt ? format(toDate(ann.createdAt), 'dd MMM yyyy HH:mm') : 'Just now'}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-5xl font-black text-zinc-900 tracking-tighter mb-2">Project Hub</h1>
          <p className="text-zinc-500 font-medium">Estimates are synced in real-time with your cloud account.</p>
          {company?.estimateLimit && (
            <p className="text-xs text-zinc-500 mt-1">
              Usage: <span className="font-bold text-primary">{stats.totalEstimatesCount} / {company.estimateLimit}</span> Estimates
            </p>
          )}
        </div>
        <button
          onClick={() => {
            if (company?.estimateLimit && stats.totalEstimatesCount >= company.estimateLimit) {
              toast.error(`Estimate limit reached (${company.estimateLimit}). Please upgrade your package.`);
              return;
            }
            setActiveTab('estimates');
          }}
          className="flex items-center gap-2 bg-zinc-900 text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-zinc-900/20 hover:scale-[1.02] transition-all"
        >
          <Plus className="w-5 h-5" />
          New Estimate
        </button>
      </div>

      <LivePresence />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
        <div className="bg-white p-6 md:p-10 rounded-3xl md:rounded-[40px] shadow-sm border border-zinc-100 relative overflow-hidden group">
          <div className="text-[8px] md:text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-2 md:mb-4">Conversion Rate</div>
          <div className="text-3xl md:text-4xl font-black text-zinc-900">{stats.conversionRate.toFixed(0)}%</div>
        </div>
        
        <div className="bg-white p-6 md:p-10 rounded-3xl md:rounded-[40px] shadow-sm border-l-4 border-l-primary border border-zinc-100 relative overflow-hidden group">
          <div className="text-[8px] md:text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-2 md:mb-4">Aggregate Value</div>
          <div className="text-3xl md:text-4xl font-black text-zinc-900">{formatCurrency(stats.totalEstimateValue)}</div>
        </div>

        <div className="bg-white p-6 md:p-10 rounded-3xl md:rounded-[40px] shadow-sm border border-zinc-100 relative overflow-hidden group">
          <div className="text-[8px] md:text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-2 md:mb-4">Business Value</div>
          <div className="text-3xl md:text-4xl font-black text-emerald-500">{formatCurrency(stats.totalRevenue)}</div>
        </div>
      </div>

      {/* Recent Estimates Table */}
      <div className="bg-white rounded-[40px] shadow-sm border border-zinc-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50/50 border-b border-zinc-100">
              <th className="px-8 py-6 text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Est No.</th>
              <th className="px-8 py-6 text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Customer</th>
              <th className="px-8 py-6 text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Status</th>
              <th className="px-8 py-6 text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Total</th>
              <th className="px-8 py-6 text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {recentEstimates.map(estimate => {
              const client = clients.find(c => c.id === estimate.clientId);
              return (
                <tr key={estimate.id} className="hover:bg-zinc-50/50 transition-all group">
                  <td className="px-8 py-8">
                    <span className="text-sm font-bold text-primary hover:underline cursor-pointer" onClick={() => setActiveTab('estimates')}>
                      {estimate.estimateNumber || `EST-${estimate.id.slice(0, 6).toUpperCase()}`}
                    </span>
                  </td>
                  <td className="px-8 py-8">
                    <div className="font-black text-zinc-900">{client?.name || 'Unknown'}</div>
                  </td>
                  <td className="px-8 py-8">
                    <span className={cn(
                      "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest",
                      estimate.status === 'approved' ? "bg-emerald-100 text-emerald-700" :
                      estimate.status === 'pending' ? "bg-blue-100 text-blue-700" :
                      estimate.status === 'rejected' ? "bg-rose-100 text-rose-700" :
                      estimate.status === 'revision' ? "bg-indigo-100 text-indigo-700" : "bg-zinc-100 text-zinc-700"
                    )}>
                      {estimate.status}
                    </span>
                  </td>
                  <td className="px-8 py-8">
                    <div className="text-xl font-black text-zinc-900">{formatCurrency(estimate.total)}</div>
                  </td>
                  <td className="px-8 py-8">
                    <div className="flex items-center justify-center gap-3">
                      <div className="flex items-center gap-2 pr-4 border-r border-zinc-100">
                        <button 
                          onClick={() => handleStatusUpdate(estimate.id, 'pending')}
                          className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-500 hover:text-white transition-all shadow-sm"
                          title="Set Pending"
                        >
                          <Clock className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleStatusUpdate(estimate.id, 'approved')}
                          className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                          title="Approve"
                        >
                          <Handshake className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleStatusUpdate(estimate.id, 'rejected')}
                          className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                          title="Reject"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={async () => {
                            const estimateRef = doc(db, 'estimates', estimate.id);
                            await updateDoc(estimateRef, { 
                              status: 'revision',
                              revisions: (estimate.revisions || 0) + 1,
                              updatedAt: serverTimestamp()
                            });
                            if (setSelectedEstimateId) setSelectedEstimateId(estimate.id, 'edit');
                            setActiveTab('estimates');
                          }}
                          className="p-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-500 hover:text-white transition-all shadow-sm"
                          title="Revision"
                        >
                          <GitBranch className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            if (setSelectedEstimateId) setSelectedEstimateId(estimate.id, 'view');
                            setActiveTab('estimates');
                          }}
                          className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-500 hover:text-white transition-all shadow-sm"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => {
                            if (company?.editTimeLimit) {
                              const createdDate = toDate(estimate.createdAt);
                              const daysDiff = (new Date().getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
                              if (daysDiff > company.editTimeLimit) {
                                toast.error(`Editing period has expired (${company.editTimeLimit} days). This estimate can no longer be modified.`);
                                return;
                              }
                            }
                            if (setSelectedEstimateId) setSelectedEstimateId(estimate.id, 'edit');
                            setActiveTab('estimates');
                          }}
                          className="p-3 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-500 hover:text-white transition-all shadow-sm"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setEstimateToDelete(estimate.id)}
                          className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {recentEstimates.length === 0 && (
          <div className="p-20 text-center">
            <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-10 h-10 text-zinc-200" />
            </div>
            <p className="text-zinc-400 font-medium italic">No recent estimates found.</p>
          </div>
        )}
      </div>

      {/* Upcoming Reminders (Optional, keeping it but styled better) */}
      {company?.features?.includes('reminders') && upcomingReminders.length > 0 && (
        <div className="bg-white p-10 rounded-[40px] shadow-sm border border-zinc-100">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-black text-zinc-900">Upcoming Reminders</h2>
            <button 
              onClick={() => setActiveTab('reminders')}
              className="text-primary text-sm font-bold flex items-center gap-2 hover:underline"
            >
              View All <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingReminders.map(reminder => {
              const client = clients.find(c => c.id === reminder.clientId);
              return (
                <div key={reminder.id} className="flex items-center justify-between p-6 bg-zinc-50 rounded-3xl border border-zinc-100">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-zinc-400 border border-zinc-100 shadow-sm">
                      <Bell className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-bold text-zinc-900">{reminder.title}</div>
                      <div className="text-xs text-zinc-500">For: {client?.name || 'Unknown'}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-zinc-900">{format(new Date(reminder.dueDate), 'dd MMM')}</div>
                    <div className="text-[10px] text-zinc-400 uppercase font-bold">Due</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!estimateToDelete}
        onClose={() => setEstimateToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Estimate?"
        message="Are you sure you want to delete this estimate? This action cannot be undone."
        confirmText="Delete"
      />

      {showWelcome && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[40px] p-10 max-w-lg w-full shadow-2xl text-center space-y-6"
          >
            <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-black text-zinc-900 tracking-tight">Welcome to Your Trial!</h2>
            <p className="text-zinc-600 leading-relaxed">
              We've set up a <span className="font-bold text-primary">10-day trial</span> for you with <span className="font-bold">all features unlocked</span>. 
              You can add up to <span className="font-bold">3 staff members</span> to your company during this period.
            </p>
            <div className="bg-zinc-50 p-6 rounded-3xl text-left space-y-3">
              <div className="flex items-center gap-3 text-sm font-bold text-zinc-700">
                <div className="w-2 h-2 bg-primary rounded-full" />
                Full access to all engineering tools
              </div>
              <div className="flex items-center gap-3 text-sm font-bold text-zinc-700">
                <div className="w-2 h-2 bg-primary rounded-full" />
                Unlimited estimates & client management
              </div>
              <div className="flex items-center gap-3 text-sm font-bold text-zinc-700">
                <div className="w-2 h-2 bg-primary rounded-full" />
                Real-time reminders & insights
              </div>
            </div>
            <button 
              onClick={closeWelcome}
              className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
            >
              Get Started
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

