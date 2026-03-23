import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, limit, where } from 'firebase/firestore';
import { 
  Users, 
  FileText, 
  Bell, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { Client, Estimate, Reminder } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { OperationType, handleFirestoreError } from '../firebase';

export default function Dashboard({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const { staff, company } = useAuth();
  const [stats, setStats] = useState({
    totalClients: 0,
    totalEstimates: 0,
    pendingEstimates: 0,
    activeReminders: 0,
    totalRevenue: 0,
    totalEstimateValue: 0
  });
  const [timePeriod, setTimePeriod] = useState<'all' | 'month' | 'week' | 'year'>('all');
  const [recentEstimates, setRecentEstimates] = useState<Estimate[]>([]);
  const [upcomingReminders, setUpcomingReminders] = useState<Reminder[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    if (!staff) return;

    const unsubClients = onSnapshot(query(collection(db, 'clients'), where('companyId', '==', staff.companyId)), (snapshot) => {
      setStats(prev => ({ ...prev, totalClients: snapshot.size }));
      const sortedClients = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Client))
        .sort((a, b) => a.name.localeCompare(b.name));
      setClients(sortedClients);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'clients'));

    const unsubEstimates = onSnapshot(query(collection(db, 'estimates'), where('companyId', '==', staff.companyId)), (snapshot) => {
      const allEstimates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Estimate));
      
      const filterByTime = (estimates: Estimate[]) => {
        if (timePeriod === 'all') return estimates;
        const now = new Date();
        return estimates.filter(e => {
          const date = e.createdAt?.toDate?.() || new Date(e.createdAt);
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
      const pending = filteredEstimates.filter(e => e.status === 'pending').length;
      const revenue = filteredEstimates.filter(e => e.status === 'approved').reduce((acc, e) => acc + (e.total || 0), 0);
      const totalVal = filteredEstimates.reduce((acc, e) => acc + (e.total || 0), 0);

      setStats(prev => ({ 
        ...prev, 
        totalEstimates: filteredEstimates.length, 
        pendingEstimates: pending,
        totalRevenue: revenue,
        totalEstimateValue: totalVal
      }));
      
      const sortedEstimates = allEstimates
        .sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
          const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 5);
      setRecentEstimates(sortedEstimates);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'estimates'));

    const qReminders = query(
      collection(db, 'reminders'), 
      where('companyId', '==', staff.companyId),
      where('status', '==', 'pending')
    );
    const unsubReminders = onSnapshot(qReminders, (snapshot) => {
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

  const statCards = [
    ...(company?.features?.includes('clients') ? [{ label: 'Total Clients', value: stats.totalClients, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' }] : []),
    ...(company?.features?.includes('estimates') ? [{ label: 'Total Estimates', value: stats.totalEstimates, icon: FileText, color: 'text-purple-500', bg: 'bg-purple-50' }] : []),
    ...(company?.features?.includes('estimates') ? [{ label: 'Pending Estimates', value: stats.pendingEstimates, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' }] : []),
    ...(company?.features?.includes('reminders') ? [{ label: 'Active Reminders', value: stats.activeReminders, icon: Bell, color: 'text-rose-500', bg: 'bg-rose-50' }] : []),
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">
            Welcome to {company?.name || 'Estimate Pro'}!
          </h1>
          <p className="text-zinc-500">Here's what's happening with your projects today.</p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <select 
            value={timePeriod}
            onChange={(e) => setTimePeriod(e.target.value as any)}
            className="bg-white border border-zinc-200 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-primary"
          >
            <option value="all">All Time</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
          {company?.features?.includes('estimates') && (
            <div className="flex gap-4">
              <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-zinc-100">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Total Revenue (Approved)</div>
                <div className="text-xl font-black text-primary">{formatCurrency(stats.totalRevenue)}</div>
              </div>
              <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-zinc-100">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Total Estimate Value</div>
                <div className="text-xl font-black text-zinc-900">{formatCurrency(stats.totalEstimateValue)}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100 flex items-center gap-4">
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", stat.bg)}>
              <stat.icon className={cn("w-6 h-6", stat.color)} />
            </div>
            <div>
              <div className="text-2xl font-bold text-zinc-900">{stat.value}</div>
              <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Estimates */}
        {company?.features?.includes('estimates') && (
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-zinc-900">Recent Estimates</h2>
              <button 
                onClick={() => setActiveTab('estimates')}
                className="text-primary text-sm font-bold flex items-center gap-1 hover:underline"
              >
                View All <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              {recentEstimates.map(estimate => {
                const client = clients.find(c => c.id === estimate.clientId);
                return (
                  <div key={estimate.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-zinc-400 border border-zinc-100">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-zinc-900">{client?.name || 'Unknown'}</div>
                        <div className="text-xs text-zinc-500">{formatCurrency(estimate.total)}</div>
                      </div>
                    </div>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                      estimate.status === 'approved' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                    )}>
                      {estimate.status}
                    </span>
                  </div>
                );
              })}
              {recentEstimates.length === 0 && <p className="text-center text-zinc-400 py-8 italic">No estimates yet.</p>}
            </div>
          </div>
        )}

        {/* Upcoming Reminders */}
        {company?.features?.includes('reminders') && (
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-zinc-900">Upcoming Reminders</h2>
              <button 
                onClick={() => setActiveTab('reminders')}
                className="text-primary text-sm font-bold flex items-center gap-1 hover:underline"
              >
                View All <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              {upcomingReminders.map(reminder => {
                const client = clients.find(c => c.id === reminder.clientId);
                return (
                  <div key={reminder.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-zinc-400 border border-zinc-100">
                        <Bell className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-zinc-900">{reminder.title}</div>
                        <div className="text-xs text-zinc-500">For: {client?.name || 'Unknown'}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-zinc-900">{format(new Date(reminder.dueDate), 'dd MMM')}</div>
                      <div className="text-[10px] text-zinc-400 uppercase">Due Date</div>
                    </div>
                  </div>
                );
              })}
              {upcomingReminders.length === 0 && <p className="text-center text-zinc-400 py-8 italic">No reminders yet.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
