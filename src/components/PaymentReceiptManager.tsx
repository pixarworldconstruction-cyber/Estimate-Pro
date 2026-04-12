import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Download, 
  Printer, 
  Send, 
  Trash2, 
  Eye, 
  X, 
  FileText, 
  User, 
  Calendar, 
  IndianRupee, 
  CreditCard, 
  Hash,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { PaymentReceipt, Client, Invoice, Estimate } from '../types';
import { format } from 'date-fns';
import { cn, formatCurrency, toDate, numberToWords } from '../lib/utils';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function PaymentReceiptManager() {
  const { staff, company, isSuperAdmin } = useAuth();
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [activeView, setActiveView] = useState<'list' | 'create' | 'view'>('list');
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentReceipt | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const receiptRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<Partial<PaymentReceipt>>({
    amount: 0,
    paymentDate: format(new Date(), 'yyyy-MM-dd'),
    paymentMode: 'Cash',
    authorizedBy: staff?.name || '',
  });

  useEffect(() => {
    if (!staff) return;

    const receiptsQuery = isSuperAdmin
      ? query(collection(db, 'paymentReceipts'))
      : query(collection(db, 'paymentReceipts'), where('companyId', '==', staff.companyId));

    const unsubscribe = onSnapshot(receiptsQuery, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PaymentReceipt[];
      
      setReceipts(fetched.sort((a, b) => {
        const dateA = toDate(a.createdAt).getTime();
        const dateB = toDate(b.createdAt).getTime();
        return dateB - dateA;
      }));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'paymentReceipts');
    });

    // Fetch clients
    const clientsQuery = isSuperAdmin
      ? query(collection(db, 'clients'))
      : query(collection(db, 'clients'), where('companyId', '==', staff.companyId));
    
    getDocs(clientsQuery).then(snapshot => {
      setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Client[]);
    });

    // Fetch invoices
    const invoicesQuery = isSuperAdmin
      ? query(collection(db, 'invoices'))
      : query(collection(db, 'invoices'), where('companyId', '==', staff.companyId));
    
    getDocs(invoicesQuery).then(snapshot => {
      setInvoices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Invoice[]);
    });

    // Fetch estimates
    const estimatesQuery = isSuperAdmin
      ? query(collection(db, 'estimates'), where('status', '==', 'approved'))
      : query(collection(db, 'estimates'), where('companyId', '==', staff.companyId), where('status', '==', 'approved'));
    
    getDocs(estimatesQuery).then(snapshot => {
      setEstimates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Estimate[]);
    });

    return () => unsubscribe();
  }, [staff, isSuperAdmin]);

  const handleCreateReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !formData.clientId || !formData.amount) return;

    const client = clients.find(c => c.id === formData.clientId);
    if (!client) return;

    setIsSaving(true);
    try {
      const prefix = company?.paymentReceiptPrefix || 'RCPT-';
      const nextNum = company?.paymentReceiptNextNumber || 1;
      
      const receiptData = {
        ...formData,
        clientName: client.name,
        clientAddress: client.siteAddress || client.currentAddress,
        companyId: company.id,
        receiptNumber: `${prefix}${nextNum.toString().padStart(4, '0')}`,
        amountInWords: numberToWords(formData.amount || 0),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'paymentReceipts'), receiptData);
      
      // Increment receipt number
      if (company?.id) {
        await updateDoc(doc(db, 'companies', company.id), {
          paymentReceiptNextNumber: nextNum + 1
        });
      }

      toast.success('Payment receipt created successfully');
      setSelectedReceipt({ ...receiptData, id: docRef.id, createdAt: new Date() } as PaymentReceipt);
      setActiveView('view');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'paymentReceipts');
      toast.error('Failed to create receipt');
    } finally {
      setIsSaving(false);
    }
  };

  const generatePDF = async (receipt: PaymentReceipt) => {
    if (!receiptRef.current) return;
    
    const canvas = await html2canvas(receiptRef.current, {
      scale: 2,
      useCORS: true,
      logging: false,
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Receipt-${receipt.receiptNumber}.pdf`);
  };

  const filteredReceipts = receipts.filter(r => 
    r.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (activeView === 'view' && selectedReceipt) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setActiveView('list')}
            className="px-4 py-2 text-zinc-500 font-bold hover:bg-zinc-100 rounded-xl transition-all"
          >
            ← Back to List
          </button>
          <div className="flex gap-2">
            <button 
              onClick={() => generatePDF(selectedReceipt)}
              className="flex items-center gap-2 bg-zinc-100 text-zinc-900 px-4 py-2 rounded-xl font-bold hover:bg-zinc-200 transition-all"
            >
              <Download className="w-4 h-4" />
              Download
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

        <div className="bg-white rounded-[40px] border border-zinc-100 shadow-xl overflow-hidden max-w-4xl mx-auto">
          <div ref={receiptRef} className="p-12 bg-white">
            {/* Receipt Header */}
            <div className="flex justify-between items-start border-b-4 border-zinc-900 pb-8 mb-8">
              <div>
                <h1 className="text-4xl font-black uppercase tracking-tighter text-zinc-900">Payment Receipt</h1>
                <p className="text-zinc-500 mt-2 font-bold">No: <span className="text-zinc-900">{selectedReceipt.receiptNumber}</span></p>
              </div>
              <div className="text-right">
                {company?.logoUrl ? (
                  <img src={company.logoUrl} alt="Logo" className="w-20 h-20 object-contain ml-auto" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-20 h-20 bg-zinc-100 rounded-2xl flex items-center justify-center ml-auto">
                    <span className="text-2xl font-black">{company?.name?.[0]}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Company Info */}
            <div className="grid grid-cols-2 gap-12 mb-12">
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">From</h4>
                <p className="text-lg font-black text-zinc-900">{company?.name}</p>
                <p className="text-sm text-zinc-500 mt-1 leading-relaxed">{company?.address}</p>
                <div className="mt-4 space-y-1">
                  <p className="text-xs text-zinc-500 font-bold">Email: <span className="text-zinc-900">{company?.email}</span></p>
                  <p className="text-xs text-zinc-500 font-bold">Phone: <span className="text-zinc-900">{company?.phone}</span></p>
                  {company?.gst && <p className="text-xs text-zinc-500 font-bold">GST: <span className="text-zinc-900">{company.gst}</span></p>}
                </div>
              </div>
              <div className="text-right">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Receipt Details</h4>
                <div className="space-y-2">
                  <p className="text-sm font-bold text-zinc-500">Date: <span className="text-zinc-900">{format(toDate(selectedReceipt.paymentDate), 'dd MMM yyyy')}</span></p>
                  <p className="text-sm font-bold text-zinc-500">Mode: <span className="text-zinc-900">{selectedReceipt.paymentMode}</span></p>
                  {selectedReceipt.referenceNumber && (
                    <p className="text-sm font-bold text-zinc-500">Ref No: <span className="text-zinc-900">{selectedReceipt.referenceNumber}</span></p>
                  )}
                </div>
              </div>
            </div>

            {/* Received From */}
            <div className="bg-zinc-50 rounded-3xl p-8 mb-12">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4">Received From</h4>
              <p className="text-xl font-black text-zinc-900">{selectedReceipt.clientName}</p>
              <p className="text-sm text-zinc-500 mt-2">{selectedReceipt.clientAddress}</p>
            </div>

            {/* Amount Section */}
            <div className="border-2 border-zinc-900 rounded-3xl p-8 mb-12">
              <div className="flex justify-between items-center mb-6">
                <span className="text-lg font-bold text-zinc-500">Amount Received</span>
                <span className="text-3xl font-black text-zinc-900">{formatCurrency(selectedReceipt.amount)}</span>
              </div>
              <div className="pt-6 border-t border-zinc-200">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Amount in Words</h4>
                <p className="text-lg font-bold text-zinc-900 italic">Rupees {selectedReceipt.amountInWords}</p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-end mt-20">
              <div className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest">
                This is a computer generated receipt
              </div>
              <div className="text-center">
                <div className="w-48 border-b-2 border-zinc-900 mb-2"></div>
                <p className="text-sm font-black text-zinc-900">{selectedReceipt.authorizedBy}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Authorized Signatory</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {activeView === 'list' ? (
        <>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input 
                type="text"
                placeholder="Search receipts by client or number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
              />
            </div>
            <button 
              onClick={() => setActiveView('create')}
              className="w-full md:w-auto flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Plus className="w-5 h-5" />
              Create Receipt
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReceipts.map((receipt) => (
              <div 
                key={receipt.id}
                className="group bg-white p-6 rounded-[32px] border border-zinc-100 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-500"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-emerald-50 rounded-2xl">
                    <IndianRupee className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{receipt.receiptNumber}</p>
                    <p className="text-xs font-bold text-zinc-500 mt-1">{format(toDate(receipt.paymentDate), 'dd MMM yyyy')}</p>
                  </div>
                </div>

                <h3 className="text-lg font-black text-zinc-900 mb-1 truncate">{receipt.clientName}</h3>
                <p className="text-2xl font-black text-primary mb-4">{formatCurrency(receipt.amount)}</p>

                <div className="flex items-center gap-2 mb-6">
                  <div className="px-3 py-1 bg-zinc-100 rounded-full text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                    {receipt.paymentMode}
                  </div>
                  {receipt.referenceNumber && (
                    <div className="px-3 py-1 bg-blue-50 rounded-full text-[10px] font-black text-blue-600 uppercase tracking-widest truncate max-w-[120px]">
                      {receipt.referenceNumber}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setSelectedReceipt(receipt);
                      setActiveView('view');
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-zinc-50 text-zinc-600 rounded-2xl text-xs font-bold hover:bg-zinc-100 transition-all"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                  <button 
                    onClick={async () => {
                      if (confirm('Are you sure you want to delete this receipt?')) {
                        try {
                          await deleteDoc(doc(db, 'paymentReceipts', receipt.id));
                          toast.success('Receipt deleted');
                        } catch (err) {
                          toast.error('Failed to delete');
                        }
                      }
                    }}
                    className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {filteredReceipts.length === 0 && (
              <div className="col-span-full py-20 text-center bg-white rounded-[40px] border border-dashed border-zinc-200">
                <div className="w-20 h-20 bg-zinc-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-10 h-10 text-zinc-300" />
                </div>
                <h3 className="text-xl font-black text-zinc-900">No receipts found</h3>
                <p className="text-zinc-500 mt-2">Create your first payment receipt to get started.</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-[40px] border border-zinc-100 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-zinc-900">Create Payment Receipt</h2>
            <button onClick={() => setActiveView('list')} className="p-2 hover:bg-zinc-100 rounded-xl transition-all">
              <X className="w-6 h-6 text-zinc-400" />
            </button>
          </div>

          <form onSubmit={handleCreateReceipt} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Select Invoice (Optional)</label>
                <select 
                  value={formData.invoiceId || ''}
                  onChange={(e) => {
                    const inv = invoices.find(i => i.id === e.target.value);
                    if (inv) {
                      setFormData({ 
                        ...formData, 
                        invoiceId: inv.id, 
                        clientId: inv.clientId, 
                        amount: inv.total,
                        estimateId: '' 
                      });
                    } else {
                      setFormData({ ...formData, invoiceId: '' });
                    }
                  }}
                  className="w-full px-4 py-4 bg-zinc-50 border-none rounded-2xl focus:ring-2 focus:ring-primary/20 font-bold appearance-none"
                >
                  <option value="">No Invoice</option>
                  {invoices.map(inv => (
                    <option key={inv.id} value={inv.id}>{inv.invoiceNumber} - {inv.clientName} ({formatCurrency(inv.total)})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Select Estimate (Optional)</label>
                <select 
                  value={formData.estimateId || ''}
                  onChange={(e) => {
                    const est = estimates.find(i => i.id === e.target.value);
                    if (est) {
                      setFormData({ 
                        ...formData, 
                        estimateId: est.id, 
                        clientId: est.clientId, 
                        amount: est.total,
                        invoiceId: '' 
                      });
                    } else {
                      setFormData({ ...formData, estimateId: '' });
                    }
                  }}
                  className="w-full px-4 py-4 bg-zinc-50 border-none rounded-2xl focus:ring-2 focus:ring-primary/20 font-bold appearance-none"
                >
                  <option value="">No Estimate</option>
                  {estimates.map(est => (
                    <option key={est.id} value={est.id}>{est.estimateNumber} - {est.clientName} ({formatCurrency(est.total)})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Select Client</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <select 
                  required
                  value={formData.clientId || ''}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  className="w-full pl-12 pr-4 py-4 bg-zinc-50 border-none rounded-2xl focus:ring-2 focus:ring-primary/20 font-bold appearance-none"
                >
                  <option value="">Choose a client...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Amount (₹)</label>
                <div className="relative">
                  <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input 
                    type="number"
                    required
                    min="1"
                    value={formData.amount || ''}
                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    className="w-full pl-12 pr-4 py-4 bg-zinc-50 border-none rounded-2xl focus:ring-2 focus:ring-primary/20 font-bold"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Payment Date</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input 
                    type="date"
                    required
                    value={formData.paymentDate}
                    onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 bg-zinc-50 border-none rounded-2xl focus:ring-2 focus:ring-primary/20 font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Payment Mode</label>
                <div className="relative">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <select 
                    required
                    value={formData.paymentMode}
                    onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 bg-zinc-50 border-none rounded-2xl focus:ring-2 focus:ring-primary/20 font-bold appearance-none"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="UPI">UPI</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Reference No.</label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input 
                    type="text"
                    value={formData.referenceNumber || ''}
                    onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 bg-zinc-50 border-none rounded-2xl focus:ring-2 focus:ring-primary/20 font-bold"
                    placeholder="Check/Transaction ID"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Authorized By</label>
              <div className="relative">
                <CheckCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input 
                  type="text"
                  required
                  value={formData.authorizedBy}
                  onChange={(e) => setFormData({ ...formData, authorizedBy: e.target.value })}
                  className="w-full pl-12 pr-4 py-4 bg-zinc-50 border-none rounded-2xl focus:ring-2 focus:ring-primary/20 font-bold"
                  placeholder="Name of signatory"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isSaving}
              className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                'Generate Receipt'
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
