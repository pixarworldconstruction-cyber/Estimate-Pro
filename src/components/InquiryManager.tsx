import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { Plus, Search, Phone, MapPin, MoreVertical, Trash2, Edit2, X, FileText, Mail, Filter, User, Tag, IndianRupee, Package, Calendar, CheckCircle, Bell } from 'lucide-react';
import { Inquiry, Staff } from '../types';
import ConfirmModal from './ConfirmModal';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { OperationType, handleFirestoreError } from '../firebase';
import { toast } from 'sonner';

export default function InquiryManager() {
  const { staff, isAdmin, isSuperAdmin } = useAuth();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [inquiryToDelete, setInquiryToDelete] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [companyStaff, setCompanyStaff] = useState<Staff[]>([]);

  const [formData, setFormData] = useState<Partial<Inquiry>>({
    customerName: '',
    contactNumber: '',
    emailId: '',
    address: '',
    source: '',
    productInterested: '',
    budget: 0,
    inquiryDate: new Date().toISOString().split('T')[0],
    status: 'new',
    notes: '',
    assignedTo: '',
    estimateProvided: false,
    contactDataAccess: false
  });

  useEffect(() => {
    if (!staff?.companyId) return;

    const inquiriesQuery = query(
      collection(db, 'inquiries'),
      where('companyId', '==', staff.companyId)
    );

    const unsubscribe = onSnapshot(inquiriesQuery, (snapshot) => {
      const sortedInquiries = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Inquiry))
        .sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
          const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        });
      setInquiries(sortedInquiries);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'inquiries'));

    // Fetch company staff for assignment
    const staffQuery = query(
      collection(db, 'staff'),
      where('companyId', '==', staff.companyId)
    );
    const unsubStaff = onSnapshot(staffQuery, (snapshot) => {
      setCompanyStaff(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff)));
    });

    return () => {
      unsubscribe();
      unsubStaff();
    };
  }, [staff]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staff?.companyId) return;

    const dataToSave = {
      ...formData,
      companyId: staff.companyId,
      updatedAt: serverTimestamp(),
      createdAt: selectedInquiry ? selectedInquiry.createdAt : serverTimestamp()
    };

    try {
      if (selectedInquiry) {
        await updateDoc(doc(db, 'inquiries', selectedInquiry.id), dataToSave);
        toast.success('Inquiry updated successfully');
      } else {
        await addDoc(collection(db, 'inquiries'), dataToSave);
        toast.success('Inquiry added successfully');
      }
      setIsModalOpen(false);
      setSelectedInquiry(null);
      resetForm();
    } catch (error) {
      console.error('Error saving inquiry:', error);
      toast.error('Failed to save inquiry');
    }
  };

  const resetForm = () => {
    setFormData({
      customerName: '',
      contactNumber: '',
      emailId: '',
      address: '',
      source: '',
      productInterested: '',
      budget: 0,
      inquiryDate: new Date().toISOString().split('T')[0],
      status: 'new',
      notes: '',
      assignedTo: '',
      estimateProvided: false,
      contactDataAccess: false
    });
  };

  const handleDelete = async () => {
    if (!inquiryToDelete) return;
    try {
      await deleteDoc(doc(db, 'inquiries', inquiryToDelete));
      toast.success('Inquiry deleted successfully');
      setInquiryToDelete(null);
    } catch (error) {
      console.error('Error deleting inquiry:', error);
      toast.error('Failed to delete inquiry');
    }
  };

  const filteredInquiries = inquiries.filter(i => {
    const matchesSearch = i.customerName.toLowerCase().includes(search.toLowerCase()) || 
                         i.contactNumber.includes(search) ||
                         i.productInterested.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || i.status === statusFilter;
    const matchesSource = sourceFilter === 'all' || i.source === sourceFilter;
    return matchesSearch && matchesStatus && matchesSource;
  });

  const sources = Array.from(new Set(inquiries.map(i => i.source))).filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold text-zinc-900">Inquiries</h1>
        <button
          onClick={() => {
            resetForm();
            setSelectedInquiry(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
        >
          <Plus className="w-5 h-5" />
          Add Inquiry
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search inquiries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white rounded-xl border border-zinc-100 outline-none focus:border-primary transition-all"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-zinc-100 outline-none focus:border-primary transition-all text-sm appearance-none"
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="lost">Lost</option>
              <option value="converted">Converted</option>
            </select>
          </div>
          <div className="relative flex-1">
            <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-zinc-100 outline-none focus:border-primary transition-all text-sm appearance-none"
            >
              <option value="all">All Sources</option>
              {sources.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredInquiries.map((inquiry) => (
          <div key={inquiry.id} className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg text-zinc-900">{inquiry.customerName}</h3>
                <div className="flex items-center gap-2 text-zinc-400 text-xs mt-1">
                  <Tag className="w-3 h-3" />
                  <span>{inquiry.source}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setFormData(inquiry);
                    setSelectedInquiry(inquiry);
                    setIsModalOpen(true);
                  }}
                  className="p-2 text-zinc-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setInquiryToDelete(inquiry.id)}
                  className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-zinc-600">
                <div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <span className="text-sm">{inquiry.inquiryDate ? format(new Date(inquiry.inquiryDate), 'dd MMM yyyy') : 'N/A'}</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-600">
                <div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center">
                  <Phone className="w-4 h-4" />
                </div>
                <span className="text-sm">{inquiry.contactNumber}</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-600">
                <div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="text-sm truncate">{inquiry.productInterested}</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-600">
                <div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center">
                  <IndianRupee className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold">₹{inquiry.budget.toLocaleString()}</span>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-2">
                {inquiry.estimateProvided && (
                  <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-md flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Estimate Provided
                  </span>
                )}
                {inquiry.contactDataAccess && (
                  <span className="px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-md flex items-center gap-1">
                    <Bell className="w-3 h-3" />
                    Reminder Access
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-zinc-50">
              <span className={cn(
                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                inquiry.status === 'new' ? "bg-blue-50 text-blue-600" :
                inquiry.status === 'contacted' ? "bg-amber-50 text-amber-600" :
                inquiry.status === 'qualified' ? "bg-indigo-50 text-indigo-600" :
                inquiry.status === 'lost' ? "bg-red-50 text-red-600" :
                "bg-green-50 text-green-600"
              )}>
                {inquiry.status}
              </span>
              <span className="text-[10px] text-zinc-400 font-medium">
                {inquiry.createdAt ? format(inquiry.createdAt.toDate(), 'dd MMM yyyy') : 'Just now'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {filteredInquiries.length === 0 && (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-zinc-200">
          <div className="w-16 h-16 bg-zinc-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-zinc-300" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900">No inquiries found</h3>
          <p className="text-zinc-500">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Inquiry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-black text-zinc-900">{selectedInquiry ? 'Edit Inquiry' : 'Add New Inquiry'}</h2>
                  <p className="text-zinc-500 text-sm mt-1">Capture customer interest and details</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-100 rounded-xl transition-all">
                  <X className="w-6 h-6 text-zinc-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Customer Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
                      <input
                        required
                        type="text"
                        value={formData.customerName}
                        onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                        className="w-full pl-12 pr-4 py-3 bg-zinc-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="Full Name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Contact Number</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
                      <input
                        required
                        type="tel"
                        value={formData.contactNumber}
                        onChange={e => setFormData({ ...formData, contactNumber: e.target.value })}
                        className="w-full pl-12 pr-4 py-3 bg-zinc-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="Phone Number"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Email ID</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
                      <input
                        type="email"
                        value={formData.emailId}
                        onChange={e => setFormData({ ...formData, emailId: e.target.value })}
                        className="w-full pl-12 pr-4 py-3 bg-zinc-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="email@example.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Source</label>
                    <div className="relative">
                      <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
                      <input
                        type="text"
                        value={formData.source}
                        onChange={e => setFormData({ ...formData, source: e.target.value })}
                        className="w-full pl-12 pr-4 py-3 bg-zinc-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="e.g. Website, Referral, Instagram"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Product Interested</label>
                    <div className="relative">
                      <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
                      <input
                        required
                        type="text"
                        value={formData.productInterested}
                        onChange={e => setFormData({ ...formData, productInterested: e.target.value })}
                        className="w-full pl-12 pr-4 py-3 bg-zinc-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="Product or Service"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Inquiry Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
                      <input
                        required
                        type="date"
                        value={formData.inquiryDate}
                        onChange={e => setFormData({ ...formData, inquiryDate: e.target.value })}
                        className="w-full pl-12 pr-4 py-3 bg-zinc-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Budget (₹)</label>
                    <div className="relative">
                      <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
                      <input
                        type="number"
                        value={formData.budget}
                        onChange={e => setFormData({ ...formData, budget: Number(e.target.value) })}
                        className="w-full pl-12 pr-4 py-3 bg-zinc-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-4 text-zinc-400 w-4 h-4" />
                    <textarea
                      value={formData.address}
                      onChange={e => setFormData({ ...formData, address: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 bg-zinc-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all h-24"
                      placeholder="Customer Address"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-4 py-3 bg-zinc-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="qualified">Qualified</option>
                      <option value="lost">Lost</option>
                      <option value="converted">Converted</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Assign To</label>
                    <select
                      value={formData.assignedTo}
                      onChange={e => setFormData({ ...formData, assignedTo: e.target.value })}
                      className="w-full px-4 py-3 bg-zinc-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    >
                      <option value="">Unassigned</option>
                      {companyStaff.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.position})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-3 bg-zinc-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all h-24"
                    placeholder="Additional details..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center gap-3 p-4 bg-zinc-50 rounded-xl">
                    <input
                      type="checkbox"
                      id="estimateProvided"
                      checked={formData.estimateProvided}
                      onChange={e => setFormData({ ...formData, estimateProvided: e.target.checked })}
                      className="w-5 h-5 rounded border-zinc-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="estimateProvided" className="text-sm font-bold text-zinc-700 cursor-pointer">
                      Estimate Provided?
                    </label>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-zinc-50 rounded-xl">
                    <input
                      type="checkbox"
                      id="contactDataAccess"
                      checked={formData.contactDataAccess}
                      onChange={e => setFormData({ ...formData, contactDataAccess: e.target.checked })}
                      className="w-5 h-5 rounded border-zinc-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="contactDataAccess" className="text-sm font-bold text-zinc-700 cursor-pointer">
                      Contact Access for Reminders?
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 bg-zinc-100 text-zinc-600 rounded-2xl font-bold hover:bg-zinc-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                  >
                    {selectedInquiry ? 'Update Inquiry' : 'Save Inquiry'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!inquiryToDelete}
        onClose={() => setInquiryToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Inquiry"
        message="Are you sure you want to delete this inquiry? This action cannot be undone."
      />
    </div>
  );
}
