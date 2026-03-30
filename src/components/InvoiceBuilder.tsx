import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Plus, 
  Search, 
  FileText, 
  Download, 
  Trash2, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  IndianRupee,
  ChevronRight,
  Printer,
  Mail,
  MoreVertical,
  Calendar,
  User,
  Package,
  Percent,
  Eye,
  Share2,
  X,
  PlusCircle,
  MinusCircle,
  History,
  CheckCircle,
  Calculator,
  Bell,
  Save,
  Edit2
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  orderBy,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase';
import { Invoice, InvoiceItem, Item, Client, Estimate } from '../types';
import { format } from 'date-fns';
import { cn, formatCurrency, toDate } from '../lib/utils';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function InvoiceBuilder() {
  const { company, staff, isAdmin, isSuperAdmin } = useAuth();
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState<'list' | 'create' | 'view'>('list');
  const [isSaving, setIsSaving] = useState(false);
  const [savedInvoiceId, setSavedInvoiceId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Invoice>>({
    clientId: '',
    clientName: '',
    items: [],
    subtotal: 0,
    gstTotal: 0,
    total: 0,
    status: 'draft',
    dueDate: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    notes: ''
  });

  useEffect(() => {
    if (!staff) return;

    const invoicesQuery = isSuperAdmin
      ? query(collection(db, 'invoices'), orderBy('createdAt', 'desc'))
      : query(collection(db, 'invoices'), where('companyId', '==', staff.companyId), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(invoicesQuery, (snapshot) => {
      setInvoices(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Invoice[]);
    });

    // Fetch items
    const itemsQuery = isSuperAdmin
      ? query(collection(db, 'items'))
      : query(collection(db, 'items'), where('companyId', '==', staff.companyId));
    
    getDocs(itemsQuery).then(snapshot => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Item[]);
    });

    // Fetch clients
    const clientsQuery = isSuperAdmin
      ? query(collection(db, 'clients'))
      : query(collection(db, 'clients'), where('companyId', '==', staff.companyId));
    
    getDocs(clientsQuery).then(snapshot => {
      setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Client[]);
    });

    // Fetch estimates
    const estimatesQuery = isSuperAdmin
      ? query(collection(db, 'estimates'))
      : query(collection(db, 'estimates'), where('companyId', '==', staff.companyId));
    
    getDocs(estimatesQuery).then(snapshot => {
      setEstimates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Estimate[]);
    });

    return () => unsubscribe();
  }, [staff, isSuperAdmin]);

  const calculateTotals = (items: InvoiceItem[]) => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const gstTotal = items.reduce((sum, item) => {
      if (!company?.gstEnabled) return 0;
      const itemGst = (item.total * (item.gstSlab || 0)) / 100;
      return sum + itemGst;
    }, 0);
    return { subtotal, gstTotal, total: subtotal + gstTotal };
  };

  const calculateItemTotal = (item: Partial<InvoiceItem>) => {
    const length = Number(item.length) || 0;
    const width = Number(item.width) || 0;
    const price = Number(item.price) || 0;
    const quantity = Number(item.quantity) || 0;
    const area = (length && width) ? length * width : 1;
    return Number((price * quantity * area).toFixed(2));
  };

  const addItem = (item: Item) => {
    const newItem: InvoiceItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: item.name,
      price: item.price,
      quantity: 1,
      unit: item.unit || 'Nos',
      gstSlab: item.gstSlab || 18,
      length: 0,
      width: 0,
      total: item.price
    };

    const updatedItems = [...(formData.items || []), newItem];
    const totals = calculateTotals(updatedItems);
    setFormData(prev => ({ ...prev, items: updatedItems, ...totals }));
  };

  const updateItem = (id: string, updates: Partial<InvoiceItem>) => {
    const updatedItems = (formData.items || []).map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, ...updates };
        updatedItem.total = calculateItemTotal(updatedItem);
        return updatedItem;
      }
      return item;
    });
    const totals = calculateTotals(updatedItems);
    setFormData(prev => ({ ...prev, items: updatedItems, ...totals }));
  };

  const removeItem = (id: string) => {
    const updatedItems = (formData.items || []).filter(item => item.id !== id);
    const totals = calculateTotals(updatedItems);
    setFormData(prev => ({ ...prev, items: updatedItems, ...totals }));
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !formData.clientId) return;

    const client = clients.find(c => c.id === formData.clientId);
    if (!client) return;

    setIsSaving(true);
    try {
      const isEditing = !!formData.id;
      const invoiceData = {
        ...formData,
        clientName: client.name,
        companyId: company.id,
        updatedAt: serverTimestamp(),
      };

      if (!isEditing) {
        invoiceData.invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
        invoiceData.createdAt = serverTimestamp();
        const docRef = await addDoc(collection(db, 'invoices'), invoiceData);
        invoiceData.id = docRef.id;
      } else {
        await updateDoc(doc(db, 'invoices', formData.id!), invoiceData);
      }

      toast.success(isEditing ? 'Invoice updated successfully' : 'Invoice created successfully');
      
      const savedInvoice = {
        ...invoiceData,
        createdAt: isEditing ? toDate(formData.createdAt) : new Date(),
        updatedAt: new Date()
      } as Invoice;
      
      setSelectedInvoice(savedInvoice);
      setActiveView('view');
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast.error('Failed to save invoice');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEstimateSelect = (estimateId: string) => {
    const estimate = estimates.find(e => e.id === estimateId);
    if (!estimate) return;

    const invoiceItems: InvoiceItem[] = estimate.items.map(item => ({
      id: Math.random().toString(36).substr(2, 9),
      name: item.name,
      price: item.price,
      quantity: item.qty,
      unit: item.unit || 'Nos',
      gstSlab: item.gst || 18,
      total: item.total
    }));

    setFormData(prev => ({
      ...prev,
      items: invoiceItems,
      subtotal: estimate.subtotal,
      gstTotal: estimate.gstAmount,
      total: estimate.total,
      estimateId: estimate.id
    }));
  };

  const generatePDF = async (invoice: Invoice) => {
    if (!invoiceRef.current) return;
    
    const canvas = await html2canvas(invoiceRef.current, {
      scale: 2,
      useCORS: true,
      logging: false,
      windowWidth: invoiceRef.current.scrollWidth,
      windowHeight: invoiceRef.current.scrollHeight,
      onclone: (clonedDoc) => {
        // Fix for html2canvas not supporting oklch colors (Tailwind v4)
        const allElements = clonedDoc.getElementsByTagName('*');
        for (let i = 0; i < allElements.length; i++) {
          const el = allElements[i] as HTMLElement;
          const style = window.getComputedStyle(el);
          
          const props = ['color', 'backgroundColor', 'borderColor', 'fill', 'stroke'];
          props.forEach(prop => {
            const val = style.getPropertyValue(prop);
            if (val && val.includes('oklch')) {
              // Force standard colors for common Tailwind classes
              if (el.classList.contains('bg-primary')) el.style.backgroundColor = '#10b981';
              else if (el.classList.contains('bg-zinc-900')) el.style.backgroundColor = '#18181b';
              else if (el.classList.contains('bg-zinc-50')) el.style.backgroundColor = '#f8fafc';
              else if (el.classList.contains('text-zinc-900')) el.style.color = '#18181b';
              else if (el.classList.contains('text-zinc-500')) el.style.color = '#71717a';
              else if (el.classList.contains('border-zinc-900')) el.style.borderColor = '#18181b';
              else if (el.classList.contains('border-zinc-200')) el.style.borderColor = '#e4e4e7';
              else {
                // Generic fallback if we can't match a class
                if (prop === 'color') el.style.color = '#18181b';
                else if (prop === 'backgroundColor') el.style.backgroundColor = '#ffffff';
                else if (prop === 'borderColor') el.style.borderColor = '#e4e4e7';
              }
            }
          });
        }
      }
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    let heightLeft = pdfHeight;
    let position = 0;
    const pageHeight = pdf.internal.pageSize.getHeight();

    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`Invoice-${invoice.invoiceNumber}.pdf`);
  };

  const shareInvoice = async (invoice: Invoice) => {
    const text = `Invoice ${invoice.invoiceNumber} for ${invoice.clientName}\nTotal: ${formatCurrency(invoice.total)}\nDue Date: ${invoice.dueDate}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invoice ${invoice.invoiceNumber}`,
          text: text,
          url: window.location.href
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Invoice details copied to clipboard!');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-emerald-100 text-emerald-700';
      case 'sent': return 'bg-blue-100 text-blue-700';
      case 'overdue': return 'bg-red-100 text-red-700';
      default: return 'bg-zinc-100 text-zinc-700';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (activeView === 'view' && selectedInvoice) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setActiveView('list')}
            className="px-4 py-2 text-zinc-500 font-bold hover:bg-zinc-100 rounded-xl transition-all"
          >
            ← Back to Invoices
          </button>
          <div className="flex gap-2">
            <button 
              onClick={() => {
                setFormData(selectedInvoice);
                setActiveView('create');
              }}
              className="flex items-center gap-2 bg-zinc-100 text-zinc-900 px-4 py-2 rounded-xl font-bold hover:bg-zinc-200 transition-all"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
            <button 
              onClick={() => generatePDF(selectedInvoice)}
              className="flex items-center gap-2 bg-zinc-100 text-zinc-900 px-4 py-2 rounded-xl font-bold hover:bg-zinc-200 transition-all"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button 
              onClick={() => shareInvoice(selectedInvoice)}
              className="flex items-center gap-2 bg-zinc-100 text-zinc-900 px-4 py-2 rounded-xl font-bold hover:bg-zinc-200 transition-all"
            >
              <Send className="w-4 h-4" />
              Share
            </button>
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
        </div>

        <div className="bg-white rounded-[40px] border border-zinc-100 shadow-xl overflow-hidden">
          <div ref={invoiceRef} className="p-12 bg-white">
            {/* Invoice Header */}
            <div className="flex justify-between items-start mb-12">
              <div>
                {company?.logoUrl ? (
                  <img src={company.logoUrl} alt="Logo" className="h-16 mb-6 object-contain" referrerPolicy="no-referrer" crossOrigin="anonymous" />
                ) : (
                  <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white text-2xl font-black mb-6">
                    {company?.name?.[0]}
                  </div>
                )}
                <h2 className="text-4xl font-black text-zinc-900 tracking-tighter uppercase">Invoice</h2>
                <p className="text-zinc-500 font-bold mt-1">#{selectedInvoice.invoiceNumber}</p>
              </div>
              <div className="text-right">
                <h3 className="text-xl font-black text-zinc-900 uppercase tracking-tight mb-2">{company?.name}</h3>
                <div className="text-zinc-500 text-sm font-medium space-y-1">
                  <p>{company?.address}</p>
                  <p>{company?.email}</p>
                  <p>{company?.phone}</p>
                  <div className="flex flex-col items-end gap-1 mt-2">
                    {company?.cin && <p className="font-bold text-zinc-900">CIN: {company.cin}</p>}
                    {company?.gst && <p className="font-bold text-zinc-900">GST: {company.gst}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Billing Info */}
            <div className="grid grid-cols-2 gap-12 mb-12 py-12 border-y border-zinc-100">
              <div>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Bill To</p>
                <h4 className="text-xl font-black text-zinc-900 uppercase tracking-tight mb-2">{selectedInvoice.clientName}</h4>
                <div className="text-zinc-500 text-sm font-medium space-y-1">
                  {clients.find(c => c.id === selectedInvoice.clientId)?.siteAddress && (
                    <p>{clients.find(c => c.id === selectedInvoice.clientId)?.siteAddress}</p>
                  )}
                  <p>{clients.find(c => c.id === selectedInvoice.clientId)?.phone}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Date Issued</p>
                    <p className="font-bold text-zinc-900">{format(toDate(selectedInvoice.createdAt), 'MMMM d, yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Due Date</p>
                    <p className="font-bold text-zinc-900">{format(toDate(selectedInvoice.dueDate), 'MMMM d, yyyy')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full mb-12 border-collapse">
              <thead>
                <tr className="border-b-2 border-zinc-900 bg-zinc-50">
                  <th className="p-3 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest border border-zinc-900">Sr.</th>
                  <th className="p-3 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest border border-zinc-900">Item Name</th>
                  <th className="p-3 text-center text-[10px] font-black text-zinc-400 uppercase tracking-widest border border-zinc-900">L x W</th>
                  <th className="p-3 text-center text-[10px] font-black text-zinc-400 uppercase tracking-widest border border-zinc-900">Area</th>
                  <th className="p-3 text-center text-[10px] font-black text-zinc-400 uppercase tracking-widest border border-zinc-900">Unit</th>
                  <th className="p-3 text-center text-[10px] font-black text-zinc-400 uppercase tracking-widest border border-zinc-900">GST%</th>
                  <th className="p-3 text-right text-[10px] font-black text-zinc-400 uppercase tracking-widest border border-zinc-900">Rate</th>
                  <th className="p-3 text-center text-[10px] font-black text-zinc-400 uppercase tracking-widest border border-zinc-900">Qty</th>
                  <th className="p-3 text-right text-[10px] font-black text-zinc-400 uppercase tracking-widest border border-zinc-900">Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedInvoice.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-3 text-center text-xs font-bold text-zinc-900 border border-zinc-900">{idx + 1}</td>
                    <td className="p-3 text-xs font-bold text-zinc-900 border border-zinc-900">{item.name}</td>
                    <td className="p-3 text-center text-xs font-bold text-zinc-900 border border-zinc-900">
                      {item.length && item.width ? `${item.length} x ${item.width}` : '-'}
                    </td>
                    <td className="p-3 text-center text-xs font-bold text-zinc-900 border border-zinc-900">
                      {item.length && item.width ? (item.length * item.width).toFixed(2) : '-'}
                    </td>
                    <td className="p-3 text-center text-xs font-bold text-zinc-900 border border-zinc-900 uppercase">{item.unit}</td>
                    <td className="p-3 text-center text-xs font-bold text-zinc-900 border border-zinc-900">{item.gstSlab}%</td>
                    <td className="p-3 text-right text-xs font-bold text-zinc-900 border border-zinc-900">{formatCurrency(item.price)}</td>
                    <td className="p-3 text-center text-xs font-bold text-zinc-900 border border-zinc-900">{item.quantity}</td>
                    <td className="p-3 text-right text-xs font-black text-zinc-900 border border-zinc-900">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-80 space-y-4">
                <div className="flex justify-between text-zinc-500 font-bold">
                  <span>Subtotal</span>
                  <span>{formatCurrency(selectedInvoice.subtotal)}</span>
                </div>
                <div className="flex justify-between text-zinc-500 font-bold">
                  <span>GST Total</span>
                  <span>{formatCurrency(selectedInvoice.gstTotal)}</span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t-2 border-zinc-900">
                  <span className="text-xl font-black text-zinc-900 uppercase">Total</span>
                  <span className="text-3xl font-black text-primary tracking-tighter">{formatCurrency(selectedInvoice.total)}</span>
                </div>
              </div>
            </div>

            {selectedInvoice.notes && (
              <div className="mt-12 pt-12 border-t border-zinc-100">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Notes</p>
                <p className="text-zinc-600 text-sm leading-relaxed font-medium">{selectedInvoice.notes}</p>
              </div>
            )}

            <div className="mt-24 flex justify-between items-end">
              <div className="space-y-4">
                <div className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest">
                  Thank you for your business!
                </div>
                {company?.website && (
                  <div className="text-primary text-xs font-bold">
                    {company.website}
                  </div>
                )}
              </div>
              <div className="text-center">
                {company?.ownerSignature && (
                  <img src={company.ownerSignature} alt="Signature" className="h-16 mb-2 mx-auto object-contain" referrerPolicy="no-referrer" />
                )}
                <div className="w-48 border-t-2 border-zinc-900 pt-2">
                  <p className="text-xs font-black text-zinc-900 uppercase tracking-tight">Authorized Signatory</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeView === 'create') {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setActiveView('list')}
              className="p-2 hover:bg-zinc-100 rounded-lg transition-all"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            <h1 className="text-2xl font-bold text-zinc-900">Create New Invoice</h1>
          </div>
        </div>

        <form onSubmit={handleCreateInvoice} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Client Selection */}
            <div className="bg-white p-6 rounded-2xl border border-zinc-100 space-y-4">
              <h2 className="font-bold text-zinc-900 flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Client Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700">Select Client</label>
                  <select
                    value={formData.clientId}
                    onChange={e => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary bg-white"
                    required
                  >
                    <option value="">Choose a client...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                {formData.clientId && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-700">Import from Estimate</label>
                    <select
                      value={formData.estimateId || ''}
                      onChange={e => handleEstimateSelect(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary bg-white"
                    >
                      <option value="">Select an estimate (optional)...</option>
                      {estimates
                        .filter(e => e.clientId === formData.clientId)
                        .map(estimate => (
                          <option key={estimate.id} value={estimate.id}>
                            {estimate.estimateNumber} - {formatCurrency(estimate.total)}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700">Due Date</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={e => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Items Selection */}
            <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                <h2 className="font-bold text-zinc-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  Invoice Items
                </h2>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="text-primary font-bold text-sm flex items-center gap-1 hover:underline"
                >
                  <Plus className="w-4 h-4" /> Add Item
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-100">
                      <th className="px-4 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Sr.</th>
                      <th className="px-4 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Item Name</th>
                      <th className="px-4 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest">L / H</th>
                      <th className="px-4 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest">W / D</th>
                      <th className="px-4 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Unit</th>
                      <th className="px-4 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest">GST%</th>
                      <th className="px-4 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Price</th>
                      <th className="px-4 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Qty.</th>
                      <th className="px-4 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Total</th>
                      <th className="px-4 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {formData.items && formData.items.length > 0 ? (
                      formData.items.map((item, index) => (
                        <tr key={item.id} className="group hover:bg-zinc-50 transition-colors">
                          <td className="px-4 py-3 text-xs font-bold text-zinc-400">{index + 1}</td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={item.name}
                              onChange={e => updateItem(item.id, { name: e.target.value })}
                              className="w-full bg-transparent border-none outline-none font-bold text-zinc-900 text-sm"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={item.length || 0}
                              onChange={e => updateItem(item.id, { length: parseFloat(e.target.value) || 0 })}
                              className="w-16 bg-transparent border-none outline-none font-bold text-zinc-900 text-sm"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={item.width || 0}
                              onChange={e => updateItem(item.id, { width: parseFloat(e.target.value) || 0 })}
                              className="w-16 bg-transparent border-none outline-none font-bold text-zinc-900 text-sm"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={item.unit}
                              onChange={e => updateItem(item.id, { unit: e.target.value })}
                              className="bg-transparent border-none outline-none font-bold text-zinc-900 text-xs uppercase"
                            >
                              <option value="Nos">Nos</option>
                              <option value="Sft">Sft</option>
                              <option value="Cft">Cft</option>
                              <option value="Rft">Rft</option>
                              <option value="Kg">Kg</option>
                              <option value="Mt">Mt</option>
                              <option value="Bag">Bag</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={item.gstSlab}
                              onChange={e => updateItem(item.id, { gstSlab: parseInt(e.target.value) || 0 })}
                              className="w-12 bg-transparent border-none outline-none font-bold text-zinc-900 text-sm"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={item.price}
                              onChange={e => updateItem(item.id, { price: parseFloat(e.target.value) || 0 })}
                              className="w-24 bg-transparent border-none outline-none font-bold text-zinc-900 text-sm"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={e => updateItem(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                              className="w-16 bg-transparent border-none outline-none font-bold text-zinc-900 text-sm"
                            />
                          </td>
                          <td className="px-4 py-3 text-right font-black text-zinc-900 text-sm">
                            {formatCurrency(item.total)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="p-2 text-zinc-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={10} className="p-12 text-center text-zinc-400 italic">
                          No items added to the invoice yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-zinc-100">
              <label className="text-sm font-semibold text-zinc-700 block mb-2">Notes / Terms</label>
              <textarea
                value={formData.notes}
                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Payment terms, bank details, etc."
                className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary min-h-[100px]"
              />
            </div>
          </div>

          <div className="space-y-6">
            {/* Summary Card */}
            <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm sticky top-6">
              <h3 className="font-bold text-zinc-900 mb-6 pb-4 border-b border-zinc-50">Invoice Summary</h3>
              <div className="space-y-4">
                <div className="flex justify-between text-zinc-600">
                  <span>Subtotal</span>
                  <span className="font-medium">{formatCurrency(formData.subtotal || 0)}</span>
                </div>
                {company?.gstEnabled && (
                  <div className="flex justify-between text-zinc-600">
                    <span>GST Total</span>
                    <span className="font-medium text-emerald-600">+{formatCurrency(formData.gstTotal || 0)}</span>
                  </div>
                )}
                <div className="pt-4 border-t border-zinc-100 flex justify-between items-end">
                  <div>
                    <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Total Amount</div>
                    <div className="text-2xl font-black text-primary">{formatCurrency(formData.total || 0)}</div>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={!formData.clientId || !formData.items?.length}
                  className="w-full bg-primary text-white py-4 rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100"
                >
                  Generate Invoice
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Item Selection Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
                <h2 className="text-xl font-bold text-zinc-900">Add Items</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-200 rounded-full transition-all">
                  <Plus className="w-6 h-6 rotate-45 text-zinc-500" />
                </button>
              </div>
              <div className="p-4">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search catalog..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                  />
                </div>
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar space-y-2">
                  {items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => {
                        addItem(item);
                        setIsModalOpen(false);
                      }}
                      className="w-full p-4 flex items-center justify-between hover:bg-zinc-50 rounded-2xl border border-transparent hover:border-zinc-100 transition-all text-left"
                    >
                      <div>
                        <div className="font-bold text-zinc-900">{item.name}</div>
                        <div className="text-xs text-zinc-500">{item.unit} • {formatCurrency(item.price)}</div>
                      </div>
                      <Plus className="w-5 h-5 text-primary" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Invoices</h1>
          <p className="text-zinc-500">Manage billing and payments</p>
        </div>
        <button
          onClick={() => setActiveView('create')}
          className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
        >
          <Plus className="w-5 h-5" />
          New Invoice
        </button>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search invoices by number or client..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-2xl border border-zinc-200 outline-none focus:border-primary bg-white transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-zinc-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100">
                <th className="px-6 py-4 text-sm font-bold text-zinc-600 uppercase tracking-wider">Invoice #</th>
                <th className="px-6 py-4 text-sm font-bold text-zinc-600 uppercase tracking-wider">Client</th>
                <th className="px-6 py-4 text-sm font-bold text-zinc-600 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-sm font-bold text-zinc-600 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-sm font-bold text-zinc-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-sm font-bold text-zinc-600 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-zinc-50 transition-all group">
                  <td className="px-6 py-4">
                    <span className="font-bold text-zinc-900">{invoice.invoiceNumber}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-zinc-900">{invoice.clientName}</div>
                  </td>
                  <td className="px-6 py-4 text-zinc-600 text-sm">
                    {format(toDate(invoice.createdAt), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-primary">{formatCurrency(invoice.total)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn("px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider", getStatusColor(invoice.status))}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => {
                          setSelectedInvoice(invoice);
                          setActiveView('view');
                        }}
                        className="p-2 hover:bg-white rounded-lg text-zinc-400 hover:text-primary transition-all shadow-sm"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          setFormData(invoice);
                          setActiveView('create');
                        }}
                        className="p-2 hover:bg-white rounded-lg text-zinc-400 hover:text-primary transition-all shadow-sm"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => generatePDF(invoice)}
                        className="p-2 hover:bg-white rounded-lg text-zinc-400 hover:text-primary transition-all shadow-sm"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {invoices.length === 0 && (
            <div className="p-12 text-center text-zinc-500">
              No invoices generated yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
