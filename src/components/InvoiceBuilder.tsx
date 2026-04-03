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
            {company?.invoiceTemplate === 'modern' ? (
              /* Modern Invoice Template - Dark Theme */
              <div style={{ fontFamily: 'Inter, sans-serif', color: '#ffffff', backgroundColor: '#18181b', minHeight: '297mm', padding: '40px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '60px' }}>
                  <div>
                    <div style={{ width: '120px', height: '120px', backgroundColor: '#27272a', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', overflow: 'hidden', border: '1px solid #3f3f46' }}>
                      {company?.logoUrl ? (
                        <img src={company.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} referrerPolicy="no-referrer" crossOrigin="anonymous" />
                      ) : (
                        <span style={{ fontSize: '48px', fontWeight: '900', color: '#ffffff' }}>{company?.name?.[0] || 'P'}</span>
                      )}
                    </div>
                    <h1 style={{ fontSize: '32px', fontWeight: '900', margin: 0, letterSpacing: '-0.02em', color: '#ffffff' }}>{company?.name}</h1>
                    <p style={{ fontSize: '14px', color: '#a1a1aa', maxWidth: '300px', marginTop: '8px', lineHeight: '1.5' }}>{company?.address}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#10b981', fontSize: '48px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '-0.05em', marginBottom: '10px', lineHeight: '1' }}>Invoice</div>
                    <div style={{ fontSize: '14px', color: '#a1a1aa' }}>
                      <p style={{ margin: '4px 0' }}>Invoice No: <span style={{ color: '#ffffff', fontWeight: 'bold' }}>{selectedInvoice.invoiceNumber}</span></p>
                      <p style={{ margin: '4px 0' }}>Date: <span style={{ color: '#ffffff', fontWeight: 'bold' }}>{selectedInvoice.createdAt ? format(toDate(selectedInvoice.createdAt), 'dd MMM yyyy') : format(new Date(), 'dd MMM yyyy')}</span></p>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '60px' }}>
                  <div style={{ backgroundColor: '#27272a', padding: '30px', borderRadius: '24px', border: '1px solid #3f3f46' }}>
                    <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '15px' }}>Bill To</h4>
                    <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#ffffff', margin: 0 }}>{selectedInvoice.clientName}</p>
                  </div>
                  <div style={{ backgroundColor: '#27272a', padding: '30px', borderRadius: '24px', border: '1px solid #3f3f46' }}>
                    <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '15px' }}>Payment Info</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                        <span style={{ color: '#a1a1aa' }}>Status</span>
                        <span style={{ color: selectedInvoice.status === 'paid' ? '#10b981' : '#f59e0b', fontWeight: 'bold', textTransform: 'uppercase' }}>{selectedInvoice.status}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                        <span style={{ color: '#a1a1aa' }}>Due Date</span>
                        <span style={{ color: '#ffffff', fontWeight: 'bold' }}>{selectedInvoice.dueDate ? format(new Date(selectedInvoice.dueDate), 'dd MMM yyyy') : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '40px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #3f3f46' }}>
                      <th style={{ padding: '15px 20px', textAlign: 'left', color: '#71717a', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Item Description</th>
                      <th style={{ padding: '15px 20px', textAlign: 'center', color: '#71717a', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Qty</th>
                      <th style={{ padding: '15px 20px', textAlign: 'right', color: '#71717a', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Price</th>
                      <th style={{ padding: '15px 20px', textAlign: 'right', color: '#71717a', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items.map((item, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid #27272a' }}>
                        <td style={{ padding: '20px' }}>
                          <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#ffffff', margin: 0 }}>{item.name}</p>
                        </td>
                        <td style={{ padding: '20px', textAlign: 'center', color: '#ffffff', fontSize: '16px' }}>{item.quantity}</td>
                        <td style={{ padding: '20px', textAlign: 'right', color: '#ffffff', fontSize: '16px' }}>₹{item.price.toLocaleString('en-IN')}</td>
                        <td style={{ padding: '20px', textAlign: 'right', color: '#10b981', fontSize: '16px', fontWeight: 'bold' }}>₹{item.total.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ width: '350px', backgroundColor: '#27272a', padding: '30px', borderRadius: '24px', border: '1px solid #3f3f46' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontSize: '16px' }}>
                      <span style={{ color: '#a1a1aa' }}>Subtotal</span>
                      <span style={{ color: '#ffffff' }}>₹{selectedInvoice.subtotal.toLocaleString('en-IN')}</span>
                    </div>
                    {company?.gstEnabled && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '16px' }}>
                        <span style={{ color: '#a1a1aa' }}>GST Total</span>
                        <span style={{ color: '#10b981' }}>+ ₹{selectedInvoice.gstTotal.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div style={{ height: '1px', backgroundColor: '#3f3f46', marginBottom: '20px' }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#71717a', textTransform: 'uppercase' }}>Total Amount</span>
                      <span style={{ fontSize: '32px', fontWeight: '900', color: '#10b981' }}>₹{selectedInvoice.total.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '60px', borderTop: '1px solid #3f3f46', paddingTop: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div style={{ fontSize: '12px', color: '#71717a' }}>
                    <p style={{ margin: '4px 0', color: '#ffffff', fontWeight: 'bold' }}>Notes & Terms</p>
                    <p style={{ margin: 0, maxWidth: '400px', lineHeight: '1.6' }}>{selectedInvoice.notes || 'Thank you for your business. Please make payment within 15 days.'}</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    {company?.ownerSignature && (
                      <img src={company.ownerSignature} alt="Signature" style={{ width: '120px', height: 'auto', marginBottom: '10px', filter: 'invert(1)' }} />
                    )}
                    <div style={{ width: '180px', height: '1px', backgroundColor: '#3f3f46', marginBottom: '10px' }}></div>
                    <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#ffffff', margin: 0 }}>Authorized Signatory</p>
                  </div>
                </div>
              </div>
            ) : (
              /* Classic Invoice Template - Traditional Business Look */
              <div style={{ fontFamily: 'Times New Roman, serif', color: '#18181b', backgroundColor: '#ffffff', minHeight: '297mm', padding: '50px', border: '1px solid #e4e4e7' }}>
                <div style={{ textAlign: 'center', borderBottom: '2px solid #18181b', paddingBottom: '20px', marginBottom: '30px' }}>
                  {company?.logoUrl && (
                    <img src={company.logoUrl} alt="Logo" style={{ width: '80px', height: 'auto', marginBottom: '10px' }} referrerPolicy="no-referrer" crossOrigin="anonymous" />
                  )}
                  <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 5px 0', textTransform: 'uppercase' }}>{company?.name}</h1>
                  <p style={{ fontSize: '12px', margin: '2px 0' }}>{company?.address}</p>
                  <p style={{ fontSize: '12px', margin: '2px 0' }}>Phone: {company?.phone} | Email: {company?.email}</p>
                  {company?.gst && <p style={{ fontSize: '12px', margin: '2px 0' }}>GSTIN: {company.gst}</p>}
                </div>

                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                  <h2 style={{ fontSize: '22px', fontWeight: 'bold', textDecoration: 'underline', margin: 0, textTransform: 'uppercase' }}>Tax Invoice</h2>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', fontSize: '13px' }}>
                  <div style={{ width: '50%', border: '1px solid #18181b', padding: '15px' }}>
                    <p style={{ fontWeight: 'bold', borderBottom: '1px solid #18181b', paddingBottom: '5px', marginBottom: '10px', textTransform: 'uppercase' }}>Bill To:</p>
                    <p style={{ fontSize: '15px', fontWeight: 'bold', margin: '0 0 5px 0' }}>{selectedInvoice.clientName}</p>
                  </div>
                  <div style={{ width: '40%', border: '1px solid #18181b', padding: '15px' }}>
                    <p style={{ margin: '5px 0' }}><strong>Invoice No:</strong> {selectedInvoice.invoiceNumber}</p>
                    <p style={{ margin: '5px 0' }}><strong>Date:</strong> {selectedInvoice.createdAt ? format(toDate(selectedInvoice.createdAt), 'dd/MM/yyyy') : format(new Date(), 'dd/MM/yyyy')}</p>
                    <p style={{ margin: '5px 0' }}><strong>Due Date:</strong> {selectedInvoice.dueDate ? format(toDate(selectedInvoice.dueDate), 'dd/MM/yyyy') : 'N/A'}</p>
                    <p style={{ margin: '5px 0' }}><strong>Status:</strong> <span style={{ textTransform: 'uppercase' }}>{selectedInvoice.status}</span></p>
                  </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f4f4f5', border: '1px solid #18181b' }}>
                      <th style={{ border: '1px solid #18181b', padding: '10px', textAlign: 'center', width: '50px' }}>Sr.</th>
                      <th style={{ border: '1px solid #18181b', padding: '10px', textAlign: 'left' }}>Description of Goods / Services</th>
                      <th style={{ border: '1px solid #18181b', padding: '10px', textAlign: 'center', width: '80px' }}>Qty</th>
                      <th style={{ border: '1px solid #18181b', padding: '10px', textAlign: 'right', width: '120px' }}>Rate</th>
                      <th style={{ border: '1px solid #18181b', padding: '10px', textAlign: 'right', width: '120px' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items.map((item, index) => (
                      <tr key={index}>
                        <td style={{ border: '1px solid #18181b', padding: '10px', textAlign: 'center' }}>{index + 1}</td>
                        <td style={{ border: '1px solid #18181b', padding: '10px' }}>
                          <p style={{ fontWeight: 'bold', margin: 0 }}>{item.name}</p>
                        </td>
                        <td style={{ border: '1px solid #18181b', padding: '10px', textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ border: '1px solid #18181b', padding: '10px', textAlign: 'right' }}>{item.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td style={{ border: '1px solid #18181b', padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={4} style={{ border: '1px solid #18181b', padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>Subtotal</td>
                      <td style={{ border: '1px solid #18181b', padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>{selectedInvoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                    {company?.gstEnabled && (
                      <tr>
                        <td colSpan={4} style={{ border: '1px solid #18181b', padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>GST Total</td>
                        <td style={{ border: '1px solid #18181b', padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>{selectedInvoice.gstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    )}
                    <tr style={{ backgroundColor: '#f4f4f5' }}>
                      <td colSpan={4} style={{ border: '1px solid #18181b', padding: '12px', textAlign: 'right', fontWeight: 'bold', fontSize: '15px' }}>Grand Total</td>
                      <td style={{ border: '1px solid #18181b', padding: '12px', textAlign: 'right', fontWeight: 'bold', fontSize: '15px' }}>₹ {selectedInvoice.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ marginBottom: '40px', fontSize: '12px' }}>
                  <p style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '5px' }}>Terms & Conditions:</p>
                  <p style={{ margin: 0, whiteSpace: 'pre-line', lineHeight: '1.5' }}>{selectedInvoice.notes || '1. Goods once sold will not be taken back.\n2. Interest @ 18% will be charged if payment is not made within due date.\n3. Subject to local jurisdiction.'}</p>
                </div>

                <div style={{ marginTop: '80px', display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ textAlign: 'center', width: '200px' }}>
                    <p style={{ fontSize: '12px', marginBottom: '40px' }}>Receiver's Signature</p>
                    <div style={{ borderTop: '1px solid #18181b' }}></div>
                  </div>
                  <div style={{ textAlign: 'center', width: '250px' }}>
                    <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '10px' }}>For {company?.name}</p>
                    {company?.ownerSignature && (
                      <img src={company.ownerSignature} alt="Signature" style={{ width: '120px', height: 'auto', marginBottom: '5px' }} />
                    )}
                    <div style={{ borderTop: '1px solid #18181b', marginTop: company?.ownerSignature ? '0' : '40px' }}></div>
                    <p style={{ fontSize: '12px', fontWeight: 'bold', marginTop: '5px' }}>Authorized Signatory</p>
                  </div>
                </div>
              </div>
            )}
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
