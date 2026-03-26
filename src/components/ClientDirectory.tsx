import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, query, orderBy, where } from 'firebase/firestore';
import { Plus, Search, Phone, MapPin, MoreVertical, Trash2, Edit2, MessageSquare, Calendar, History, Bell, X, FileText, CheckCircle, Clock, MinusCircle } from 'lucide-react';
import { Client, CRMHistory, Reminder, Estimate } from '../types';
import ConfirmModal from './ConfirmModal';
import { cn, formatCurrency, toDate } from '../lib/utils';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { OperationType, handleFirestoreError } from '../firebase';

export default function ClientDirectory() {
  const { staff } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [crmHistory, setCrmHistory] = useState<CRMHistory[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [clientEstimates, setClientEstimates] = useState<Estimate[]>([]);
  const [historyNotes, setHistoryNotes] = useState('');
  const [historyType, setHistoryType] = useState<'chat' | 'call' | 'meeting'>('chat');
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Client>>({
    name: '',
    currentAddress: '',
    siteAddress: '',
    mob1: '',
    mob2: '',
    projectType: 'Turnkey',
    projectCategory: 'Residential',
    budget: 0,
    details: ''
  });

  useEffect(() => {
    if (!staff) return;
    const q = query(
      collection(db, 'clients'), 
      where('companyId', '==', staff.companyId)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sortedClients = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Client))
        .sort((a, b) => a.name.localeCompare(b.name));
      setClients(sortedClients);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'clients'));
    return () => unsubscribe();
  }, [staff]);

  useEffect(() => {
    if (viewingClient && staff) {
      const qHistory = query(
        collection(db, 'crmHistory'), 
        where('companyId', '==', staff.companyId),
        where('clientId', '==', viewingClient.id)
      );
      const unsubHistory = onSnapshot(qHistory, (snapshot) => {
        const sortedHistory = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as CRMHistory))
          .sort((a, b) => {
            const dateA = a.timestamp?.toDate?.() || new Date(a.timestamp);
            const dateB = b.timestamp?.toDate?.() || new Date(b.timestamp);
            return dateB.getTime() - dateA.getTime();
          });
        setCrmHistory(sortedHistory);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'crmHistory'));

      const qReminders = query(
        collection(db, 'reminders'), 
        where('companyId', '==', staff.companyId),
        where('clientId', '==', viewingClient.id)
      );
      const unsubReminders = onSnapshot(qReminders, (snapshot) => {
        const sortedReminders = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Reminder))
          .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
        setReminders(sortedReminders);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'reminders'));

      const qEstimates = query(
        collection(db, 'estimates'), 
        where('companyId', '==', staff.companyId),
        where('clientId', '==', viewingClient.id)
      );
      const unsubEstimates = onSnapshot(qEstimates, (snapshot) => {
        const sortedEstimates = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Estimate))
          .sort((a, b) => {
            const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
            const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
            return dateB.getTime() - dateA.getTime();
          });
        setClientEstimates(sortedEstimates);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'estimates'));

      return () => {
        unsubHistory();
        unsubReminders();
        unsubEstimates();
      };
    }
  }, [viewingClient, staff]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staff?.companyId) return;
    
    const dataToSave = {
      ...formData,
      companyId: staff.companyId
    };

    if (selectedClient) {
      await updateDoc(doc(db, 'clients', selectedClient.id), dataToSave);
    } else {
      await addDoc(collection(db, 'clients'), dataToSave);
    }
    setIsModalOpen(false);
    setSelectedClient(null);
    setFormData({
      name: '', currentAddress: '', siteAddress: '', mob1: '', mob2: '',
      projectType: 'Turnkey', projectCategory: 'Residential', budget: 0, details: ''
    });
  };

  const handleDelete = async () => {
    if (!clientToDelete) return;
    await deleteDoc(doc(db, 'clients', clientToDelete));
    setClientToDelete(null);
  };

  const handleAddHistory = async () => {
    if (!viewingClient || !historyNotes.trim() || !staff?.companyId) return;
    await addDoc(collection(db, 'crmHistory'), {
      clientId: viewingClient.id,
      companyId: staff.companyId,
      type: historyType,
      notes: historyNotes,
      timestamp: new Date().toISOString()
    });
    setHistoryNotes('');
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.mob1.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold text-zinc-900">Client Directory</h1>
        <button
          onClick={() => {
            setSelectedClient(null);
            setFormData({
              name: '', currentAddress: '', siteAddress: '', mob1: '', mob2: '',
              projectType: 'Turnkey', projectCategory: 'Residential', budget: 0, details: ''
            });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
        >
          <Plus className="w-5 h-5" />
          Add New Client
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search by name or mobile..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-2xl border border-zinc-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.map(client => (
          <div key={client.id} className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center font-bold text-primary text-xl">
                {client.name[0]}
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                <button 
                  onClick={() => {
                    setSelectedClient(client);
                    setFormData({
                      ...client,
                      mob2: client.mob2 || '',
                      details: client.details || ''
                    });
                    setIsModalOpen(true);
                  }}
                  className="p-2 text-zinc-400 hover:text-primary hover:bg-zinc-50 rounded-lg"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setClientToDelete(client.id)}
                  className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-zinc-900 mb-1">{client.name}</h3>
            <div className="flex items-center gap-2 text-zinc-500 text-sm mb-4">
              <Phone className="w-3 h-3" />
              {client.mob1} {client.mob2 && `/ ${client.mob2}`}
            </div>

            <div className="space-y-2 mb-6">
              <div className="flex items-start gap-2 text-sm text-zinc-600">
                <MapPin className="w-4 h-4 mt-0.5 text-zinc-400" />
                <span className="line-clamp-1">{client.siteAddress}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-zinc-100 text-zinc-600 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                  {client.projectType}
                </span>
                <span className="px-2 py-1 bg-zinc-100 text-zinc-600 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                  {client.projectCategory}
                </span>
                {client.budget > 0 && (
                  <span className="px-2 py-1 bg-primary/10 text-primary rounded-lg text-[10px] font-bold uppercase tracking-wider">
                    Budget: {formatCurrency(client.budget)}
                  </span>
                )}
              </div>
            </div>

            <button 
              onClick={() => setViewingClient(client)}
              className="w-full py-2 bg-zinc-50 text-zinc-600 font-bold rounded-xl hover:bg-primary hover:text-white transition-all"
            >
              View Details
            </button>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-8 max-h-[90vh] overflow-y-auto shadow-2xl">
            <h2 className="text-2xl font-bold text-zinc-900 mb-6">
              {selectedClient ? 'Edit Client' : 'Add New Client'}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-zinc-700">Client Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Mobile 1</label>
                <input
                  type="text"
                  value={formData.mob1}
                  onChange={e => setFormData(prev => ({ ...prev, mob1: e.target.value }))}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Mobile 2 (Optional)</label>
                <input
                  type="text"
                  value={formData.mob2}
                  onChange={e => setFormData(prev => ({ ...prev, mob2: e.target.value }))}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-zinc-700">Current Address</label>
                <input
                  type="text"
                  value={formData.currentAddress}
                  onChange={e => setFormData(prev => ({ ...prev, currentAddress: e.target.value }))}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-zinc-700">Site Address</label>
                <input
                  type="text"
                  value={formData.siteAddress}
                  onChange={e => setFormData(prev => ({ ...prev, siteAddress: e.target.value }))}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Project Type</label>
                <select
                  value={formData.projectType}
                  onChange={e => setFormData(prev => ({ ...prev, projectType: e.target.value as any }))}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                >
                  <option value="Turnkey">Turnkey Construction</option>
                  <option value="Box">Box Construction</option>
                  <option value="Renovation">Renovation</option>
                  <option value="Interior">Interior Project</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Category</label>
                <select
                  value={formData.projectCategory}
                  onChange={e => setFormData(prev => ({ ...prev, projectCategory: e.target.value as any }))}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                >
                  <option value="Residential">Residential</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Industrial">Industrial</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Budget (₹)</label>
                <input
                  type="number"
                  value={formData.budget}
                  onChange={e => setFormData(prev => ({ ...prev, budget: parseInt(e.target.value) || 0 }))}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-zinc-700">Additional Details</label>
                <textarea
                  value={formData.details}
                  onChange={e => setFormData(prev => ({ ...prev, details: e.target.value }))}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary h-24"
                />
              </div>
              <div className="flex gap-4 md:col-span-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/20"
                >
                  {selectedClient ? 'Update Client' : 'Save Client'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-zinc-100 text-zinc-600 py-3 rounded-xl font-bold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Client Detail View */}
      {viewingClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white w-full max-w-4xl rounded-3xl p-8 max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <button 
              onClick={() => setViewingClient(null)}
              className="absolute right-6 top-6 p-2 hover:bg-zinc-100 rounded-full"
            >
              <X className="w-6 h-6 text-zinc-400" />
            </button>

            <div className="flex flex-col md:flex-row gap-8 mb-8">
              <div className="w-24 h-24 bg-primary rounded-3xl flex items-center justify-center font-bold text-white text-4xl shadow-xl shadow-primary/20">
                {viewingClient.name[0]}
              </div>
              <div>
                <h2 className="text-3xl font-bold text-zinc-900 mb-2">{viewingClient.name}</h2>
                <div className="flex flex-wrap gap-4 text-zinc-500">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {viewingClient.mob1}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {viewingClient.siteAddress}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100">
                  <h3 className="font-bold text-zinc-900 mb-4 flex items-center gap-2">
                    <History className="w-5 h-5 text-primary" />
                    CRM History
                  </h3>
                  
                  {/* Add History Form */}
                  <div className="mb-6 bg-white p-4 rounded-xl border border-zinc-100 space-y-3">
                    <div className="flex gap-2">
                      {['chat', 'call', 'meeting'].map(type => (
                        <button
                          key={type}
                          onClick={() => setHistoryType(type as any)}
                          className={cn(
                            "flex-1 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                            historyType === type ? "bg-primary text-white" : "bg-zinc-100 text-zinc-400"
                          )}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                    <textarea
                      placeholder="Add interaction notes..."
                      value={historyNotes}
                      onChange={e => setHistoryNotes(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-100 outline-none focus:border-primary h-20"
                    />
                    <button
                      onClick={handleAddHistory}
                      className="w-full py-2 bg-zinc-900 text-white text-xs font-bold rounded-lg hover:bg-zinc-800 transition-all"
                    >
                      Log Interaction
                    </button>
                  </div>

                  <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                    {crmHistory.map(h => (
                      <div key={h.id} className="bg-white p-3 rounded-xl border border-zinc-100 text-sm">
                        <div className="flex justify-between mb-1">
                          <span className="font-bold uppercase text-[10px] tracking-wider text-primary">{h.type}</span>
                          <span className="text-zinc-400 text-[10px]">{format(new Date(h.timestamp), 'dd MMM, HH:mm')}</span>
                        </div>
                        <p className="text-zinc-600">{h.notes}</p>
                      </div>
                    ))}
                    {crmHistory.length === 0 && <p className="text-zinc-400 text-sm italic">No history yet.</p>}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100">
                  <h3 className="font-bold text-zinc-900 mb-4 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-primary" />
                    Active Reminders
                  </h3>
                  <div className="space-y-4">
                    {reminders.map(r => (
                      <div key={r.id} className="bg-white p-3 rounded-xl border border-zinc-100 flex justify-between items-center">
                        <div>
                          <div className="font-bold text-zinc-800">{r.title}</div>
                          <div className="text-xs text-zinc-400">Due: {format(new Date(r.dueDate), 'dd MMM yyyy')}</div>
                        </div>
                        <span className={cn(
                          "px-2 py-1 rounded-lg text-[10px] font-bold uppercase",
                          r.status === 'pending' ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
                        )}>
                          {r.status}
                        </span>
                      </div>
                    ))}
                    {reminders.length === 0 && <p className="text-zinc-400 text-sm italic">No reminders set.</p>}
                  </div>
                </div>

                <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100">
                  <h3 className="font-bold text-zinc-900 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Estimate History (Revisions)
                  </h3>
                  <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                    {clientEstimates.map(e => (
                      <div key={e.id} className="bg-white p-4 rounded-xl border border-zinc-100 flex justify-between items-center group">
                        <div>
                          <div className="font-bold text-zinc-800 flex items-center gap-2">
                            Estimate #{e.id.slice(-6).toUpperCase()}
                            {e.status === 'revision' && (
                              <span className="px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded text-[8px] font-black uppercase">Revision</span>
                            )}
                          </div>
                          <div className="text-xs text-zinc-400">
                            {format(toDate(e.createdAt), 'dd MMM yyyy')} • {formatCurrency(e.total)}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "px-2 py-1 rounded-lg text-[10px] font-bold uppercase",
                            e.status === 'approved' ? "bg-green-100 text-green-700" : 
                            e.status === 'rejected' ? "bg-red-100 text-red-700" :
                            "bg-amber-100 text-amber-700"
                          )}>
                            {e.status}
                          </span>
                        </div>
                      </div>
                    ))}
                    {clientEstimates.length === 0 && <p className="text-zinc-400 text-sm italic">No estimates generated yet.</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!clientToDelete}
        onClose={() => setClientToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Client?"
        message="Are you sure you want to delete this client? This will remove all their data from the system."
        confirmText="Delete"
      />
    </div>
  );
}
