import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  IndianRupee, 
  FileText, 
  Clock, 
  Download, 
  Share2, 
  Calendar,
  ChevronDown,
  Target,
  BarChart3
} from 'lucide-react';
import { motion } from 'motion/react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Estimate } from '../types';

const COLORS = ['#10b981', '#3b82f6', '#ef4444'];

export default function BusinessInsights() {
  const { staff } = useAuth();
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    if (!staff?.companyId) return;
    const q = query(collection(db, 'estimates'), where('companyId', '==', staff.companyId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEstimates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Estimate)));
    });
    return () => unsubscribe();
  }, [staff?.companyId]);

  const stats = {
    conversionRate: estimates.length ? (estimates.filter(e => e.status === 'approved').length / estimates.length * 100).toFixed(1) : '0.0',
    totalValue: estimates.filter(e => e.status === 'approved').reduce((acc, e) => acc + (e.total || 0), 0),
    pendingPipeline: estimates.filter(e => e.status === 'pending').length,
    totalEstimates: estimates.length
  };

  const performanceData = [
    { name: 'Jan', business: 4000, estimates: 2400 },
    { name: 'Feb', business: 3000, estimates: 1398 },
    { name: 'Mar', business: 2000, estimates: 9800 },
    { name: 'Apr', business: 2780, estimates: 3908 },
    { name: 'May', business: 1890, estimates: 4800 },
    { name: 'Jun', business: 2390, estimates: 3800 },
  ];

  const distributionData = [
    { name: 'Approved', value: estimates.filter(e => e.status === 'approved').length },
    { name: 'Pending', value: estimates.filter(e => e.status === 'pending').length },
    { name: 'Rejected', value: estimates.filter(e => e.status === 'rejected').length },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <TrendingUp className="text-white w-6 h-6" />
            </div>
            <h1 className="text-4xl font-bold text-zinc-900">Business Insights</h1>
          </div>
          <p className="text-zinc-500">Real-time analysis of your construction pipeline and conversion metrics.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-2xl px-4 py-2 shadow-sm">
            <Calendar size={18} className="text-zinc-400" />
            <input type="date" className="bg-transparent border-none outline-none text-sm font-bold text-zinc-600" />
            <span className="text-zinc-300 text-xs font-bold uppercase">to</span>
            <input type="date" className="bg-transparent border-none outline-none text-sm font-bold text-zinc-600" />
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-2xl text-sm font-bold text-zinc-600 hover:bg-zinc-50 transition-all shadow-sm">
              <FileText size={18} className="text-red-500" />
              PDF
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-2xl text-sm font-bold text-zinc-600 hover:bg-zinc-50 transition-all shadow-sm">
              <Download size={18} className="text-blue-500" />
              PNG
            </button>
            <button className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-2xl text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
              <Share2 size={18} />
              Share
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Conversion Rate', value: `${stats.conversionRate}%`, icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Total Business Value', value: `₹${(stats.totalValue / 100000).toFixed(1)}L`, icon: IndianRupee, color: 'text-emerald-500', bg: 'bg-emerald-50', sub: `FROM ${estimates.filter(e => e.status === 'approved').length} PROJECTS` },
          { label: 'Pending Pipeline', value: stats.pendingPipeline, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', sub: 'ACTIVE ESTIMATES' },
          { label: 'Total Estimates', value: stats.totalEstimates, icon: FileText, color: 'text-zinc-500', bg: 'bg-zinc-50', sub: 'FILTERED COUNT' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-8 rounded-[40px] border border-zinc-100 shadow-sm relative overflow-hidden group"
          >
            <div className="relative z-10">
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-4">{stat.label}</div>
              <div className="text-4xl font-black text-zinc-900 mb-2">{stat.value}</div>
              {stat.sub && <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{stat.sub}</div>}
              {stat.label === 'Conversion Rate' && (
                <div className="mt-4 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${stats.conversionRate}%` }} />
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
        <div className="bg-white p-8 rounded-[48px] border border-zinc-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
              <BarChart3 className="text-primary w-5 h-5" />
              Monthly Performance
            </h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Business</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-zinc-200" />
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Estimates</span>
              </div>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="colorBusiness" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 'bold', fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 'bold', fill: '#94a3b8' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
                />
                <Area type="monotone" dataKey="business" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorBusiness)" />
                <Area type="monotone" dataKey="estimates" stroke="#e2e8f0" strokeWidth={4} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[48px] border border-zinc-100 shadow-sm">
          <h3 className="text-xl font-bold text-zinc-900 mb-8 flex items-center gap-2">
            <Target className="text-primary w-5 h-5" />
            Status Distribution
          </h3>
          <div className="h-[300px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="text-3xl font-black text-zinc-900">{estimates.length}</div>
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total</div>
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-6 mt-6">
            {distributionData.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{d.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-zinc-900 p-12 rounded-[56px] text-white relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-4xl font-black mb-4">Revenue Forecast</h2>
          <p className="text-zinc-500 mb-12 max-w-md">Based on your current pending pipeline value.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4">Pipeline Value</div>
              <div className="text-5xl font-black">₹0.00L</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4">Expected Revenue (at 0%)</div>
              <div className="text-5xl font-black text-primary">₹0.00L</div>
            </div>
            <div className="bg-white/5 backdrop-blur-md p-6 rounded-[32px] border border-white/10">
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4">Top Project Scope</div>
              <div className="text-xl font-bold">New Construction (Turnkey)</div>
            </div>
          </div>
        </div>
        <div className="absolute -right-20 -bottom-20 opacity-10">
          <TrendingUp size={400} />
        </div>
      </div>
    </div>
  );
}
