import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, query, orderBy, serverTimestamp, where } from 'firebase/firestore';
import { Plus, Search, Trash2, Edit2, FileText, Download, Share2, Save, User, Package, PlusCircle, MinusCircle, History, CheckCircle, Clock, Eye } from 'lucide-react';
import { Estimate, Client, Item, EstimateItem, Company } from '../types';
import ConfirmModal from './ConfirmModal';
import { formatCurrency, cn } from '../lib/utils';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useAuth } from '../contexts/AuthContext';
import { OperationType, handleFirestoreError } from '../firebase';

export default function EstimateBuilder() {
  const { company, staff } = useAuth();
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate | null>(null);
  const [estimateToDelete, setEstimateToDelete] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const pdfRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<Partial<Estimate>>({
    clientId: '',
    items: [],
    total: 0,
    status: 'pending',
    revisions: 0,
    terms: [
      '50% advance payment required to start the project.',
      'GST will be charged extra as applicable.',
      'Validity of this estimate is 15 days.'
    ]
  });

  useEffect(() => {
    if (!staff) return;
    
    const qEstimates = query(
      collection(db, 'estimates'), 
      where('companyId', '==', staff.companyId)
    );
    const unsubEstimates = onSnapshot(qEstimates, (snapshot) => {
      const sortedEstimates = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Estimate))
        .sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
      setEstimates(sortedEstimates);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'estimates'));

    const qClients = query(
      collection(db, 'clients'), 
      where('companyId', '==', staff.companyId)
    );
    const unsubClients = onSnapshot(qClients, (snapshot) => {
      const sortedClients = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Client))
        .sort((a, b) => a.name.localeCompare(b.name));
      setClients(sortedClients);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'clients'));
    
    const qItems = query(
      collection(db, 'items'), 
      where('companyId', '==', staff.companyId)
    );
    const unsubItems = onSnapshot(qItems, (snapshot) => {
      const sortedItems = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Item))
        .sort((a, b) => a.name.localeCompare(b.name));
      setItems(sortedItems);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'items'));

    return () => {
      unsubEstimates();
      unsubClients();
      unsubItems();
    };
  }, [staff]);

  const calculateTotal = (items: EstimateItem[]) => {
    return items.reduce((acc, item) => {
      const base = item.price * item.qty;
      const gstAmount = base * (item.gst / 100);
      return acc + base + gstAmount;
    }, 0);
  };

  const addItemToEstimate = (item: Item) => {
    const newItems = [...(formData.items || [])];
    const existing = newItems.find(i => i.itemId === item.id);
    if (existing) {
      existing.qty += 1;
    } else {
      newItems.push({
        itemId: item.id,
        name: item.name,
        qty: 1,
        price: item.price,
        gst: item.gst
      });
    }
    setFormData(prev => ({ ...prev, items: newItems, total: calculateTotal(newItems) }));
  };

  const updateItemQty = (index: number, qty: number) => {
    const newItems = [...(formData.items || [])];
    if (qty <= 0) {
      newItems.splice(index, 1);
    } else {
      newItems[index].qty = qty;
    }
    setFormData(prev => ({ ...prev, items: newItems, total: calculateTotal(newItems) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...formData,
      updatedAt: serverTimestamp(),
    };

    if (selectedEstimate) {
      if (formData.status === 'revision') {
        data.revisions = (selectedEstimate.revisions || 0) + 1;
      }
      await updateDoc(doc(db, 'estimates', selectedEstimate.id), data);
    } else {
      data.createdAt = serverTimestamp();
      data.revisions = 0;
      await addDoc(collection(db, 'estimates'), data);
    }
    setIsModalOpen(false);
    setSelectedEstimate(null);
    setFormData({ clientId: '', items: [], total: 0, status: 'pending', revisions: 0, terms: formData.terms });
  };

  const handleDownloadPDF = async (estimate: Estimate) => {
    const element = pdfRef.current;
    if (!element) return;

    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Estimate_${estimate.id.slice(0, 5)}.pdf`);
  };

  const handleDownloadImage = async (estimate: Estimate, format: 'png' | 'jpg') => {
    const element = pdfRef.current;
    if (!element) return;

    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL(`image/${format === 'jpg' ? 'jpeg' : 'png'}`);
    const link = document.createElement('a');
    link.download = `Estimate_${estimate.id.slice(0, 5)}.${format}`;
    link.href = imgData;
    link.click();
  };

  const handleShare = async (estimate: Estimate) => {
    const element = pdfRef.current;
    if (!element) return;

    try {
      const canvas = await html2canvas(element, { scale: 2 });
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) return;

      const file = new File([blob], `Estimate_${estimate.id.slice(0, 5)}.png`, { type: 'image/png' });
      
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Estimate',
          text: `Estimate for ${clients.find(c => c.id === estimate.clientId)?.name}`
        });
      } else {
        handleDownloadImage(estimate, 'png');
      }
    } catch (error) {
      console.error('Sharing failed', error);
    }
  };

  const handleDelete = async () => {
    if (!estimateToDelete) return;
    await deleteDoc(doc(db, 'estimates', estimateToDelete));
    setEstimateToDelete(null);
  };

  const filteredEstimates = estimates.filter(e => {
    const client = clients.find(c => c.id === e.clientId);
    return client?.name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold text-zinc-900">Estimates</h1>
        <button
          onClick={() => {
            setSelectedEstimate(null);
            setFormData({ 
              clientId: '', items: [], total: 0, status: 'pending', revisions: 0, 
              terms: [
                '50% advance payment required to start the project.',
                'GST will be charged extra as applicable.',
                'Validity of this estimate is 15 days.'
              ] 
            });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
        >
          <Plus className="w-5 h-5" />
          Create New Estimate
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search by client name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-2xl border border-zinc-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredEstimates.map(estimate => {
          const client = clients.find(c => c.id === estimate.clientId);
          return (
            <div key={estimate.id} className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-500">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-900">{client?.name || 'Unknown Client'}</h3>
                    <div className="text-xs text-zinc-400">
                      {estimate.createdAt ? format(estimate.createdAt.toDate(), 'dd MMM yyyy') : 'Just now'}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    estimate.status === 'approved' ? "bg-green-100 text-green-700" :
                    estimate.status === 'pending' ? "bg-amber-100 text-amber-700" :
                    estimate.status === 'revision' ? "bg-blue-100 text-blue-700" : "bg-zinc-100 text-zinc-700"
                  )}>
                    {estimate.status}
                  </span>
                  {estimate.revisions > 0 && (
                    <span className="text-[10px] text-zinc-400 font-medium">Rev: {estimate.revisions}</span>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center mb-6">
                <div className="text-2xl font-bold text-primary">{formatCurrency(estimate.total)}</div>
                <div className="text-sm text-zinc-500">{estimate.items.length} Items</div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setSelectedEstimate(estimate);
                    setFormData(estimate);
                    setIsModalOpen(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-zinc-50 text-zinc-600 font-bold rounded-xl hover:bg-zinc-100 transition-all"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <div className="flex gap-1">
                  <button 
                    onClick={() => handleDownloadPDF(estimate)}
                    className="p-2 bg-zinc-50 text-zinc-600 hover:text-primary hover:bg-primary-light rounded-xl transition-all"
                    title="Download PDF"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleDownloadImage(estimate, 'png')}
                    className="p-2 bg-zinc-50 text-zinc-600 hover:text-primary hover:bg-primary-light rounded-xl transition-all flex items-center justify-center"
                    title="Download PNG"
                  >
                    <span className="text-[10px] font-bold">PNG</span>
                  </button>
                  <button 
                    onClick={() => handleShare(estimate)}
                    className="p-2 bg-zinc-50 text-zinc-600 hover:text-primary hover:bg-primary-light rounded-xl transition-all"
                    title="Share"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
                <button 
                  onClick={() => setEstimateToDelete(estimate.id)}
                  className="p-2 bg-zinc-50 text-zinc-600 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  title="Delete"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white w-full max-w-5xl rounded-3xl p-8 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-zinc-900">
                {selectedEstimate ? 'Edit Estimate' : 'Create New Estimate'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full">
                <MinusCircle className="w-6 h-6 text-zinc-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                {/* Client Selection */}
                <div className="space-y-4">
                  <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    Select Client
                  </h3>
                  <select
                    value={formData.clientId}
                    onChange={e => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                    required
                  >
                    <option value="">Choose a client...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.mob1})</option>
                    ))}
                  </select>
                </div>

                {/* Item Selection */}
                <div className="space-y-4">
                  <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" />
                    Add Items
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto p-1">
                    {items.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => addItemToEstimate(item)}
                        className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100 hover:border-primary hover:bg-primary-light transition-all text-left"
                      >
                        <div>
                          <div className="font-bold text-zinc-800 text-sm">{item.name}</div>
                          <div className="text-xs text-zinc-500">{formatCurrency(item.price)}</div>
                        </div>
                        <PlusCircle className="w-5 h-5 text-primary" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selected Items List */}
                <div className="space-y-4">
                  <h3 className="font-bold text-zinc-900">Estimate Items</h3>
                  <div className="bg-zinc-50 rounded-2xl border border-zinc-100 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-zinc-100/50 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                          <th className="px-4 py-3">Item</th>
                          <th className="px-4 py-3">Qty</th>
                          <th className="px-4 py-3">Price</th>
                          <th className="px-4 py-3">GST</th>
                          <th className="px-4 py-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {formData.items?.map((item, index) => (
                          <tr key={index} className="text-sm">
                            <td className="px-4 py-3 font-bold text-zinc-800">{item.name}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button type="button" onClick={() => updateItemQty(index, item.qty - 1)}>
                                  <MinusCircle className="w-4 h-4 text-zinc-400 hover:text-red-500" />
                                </button>
                                <span className="w-8 text-center font-bold">{item.qty}</span>
                                <button type="button" onClick={() => updateItemQty(index, item.qty + 1)}>
                                  <PlusCircle className="w-4 h-4 text-zinc-400 hover:text-primary" />
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-zinc-600">{formatCurrency(item.price)}</td>
                            <td className="px-4 py-3 text-zinc-600">{item.gst}%</td>
                            <td className="px-4 py-3 text-right font-bold text-zinc-900">
                              {formatCurrency(item.price * item.qty * (1 + item.gst / 100))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {(!formData.items || formData.items.length === 0) && (
                      <div className="p-8 text-center text-zinc-400 italic text-sm">No items added yet.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                {/* Summary & Status */}
                <div className="bg-zinc-900 text-white p-6 rounded-3xl space-y-6 shadow-xl shadow-zinc-900/20">
                  <h3 className="font-bold text-lg">Estimate Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-zinc-400">
                      <span>Subtotal</span>
                      <span>{formatCurrency(formData.total || 0)}</span>
                    </div>
                    <div className="border-t border-zinc-800 pt-3 flex justify-between text-xl font-bold">
                      <span>Total Amount</span>
                      <span className="text-primary">{formatCurrency(formData.total || 0)}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Status</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['pending', 'approved', 'viewed', 'revision'].map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, status: s as any }))}
                          className={cn(
                            "py-2 rounded-xl text-xs font-bold capitalize transition-all",
                            formData.status === s ? "bg-primary text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    {selectedEstimate ? 'Update Estimate' : 'Save Estimate'}
                  </button>
                </div>

                {/* Terms & Conditions */}
                <div className="space-y-4">
                  <h3 className="font-bold text-zinc-900">Terms & Conditions</h3>
                  <div className="space-y-2">
                    {formData.terms?.map((term, index) => (
                      <div key={index} className="flex gap-2 group">
                        <input
                          type="text"
                          value={term}
                          onChange={e => {
                            const newTerms = [...(formData.terms || [])];
                            newTerms[index] = e.target.value;
                            setFormData(prev => ({ ...prev, terms: newTerms }));
                          }}
                          className="flex-1 px-3 py-2 bg-zinc-50 rounded-lg border border-zinc-100 text-sm outline-none focus:border-primary"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newTerms = [...(formData.terms || [])];
                            newTerms.splice(index, 1);
                            setFormData(prev => ({ ...prev, terms: newTerms }));
                          }}
                          className="p-2 text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, terms: [...(prev.terms || []), ''] }))}
                      className="text-primary text-xs font-bold flex items-center gap-1 hover:underline"
                    >
                      <Plus className="w-3 h-3" />
                      Add Term
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hidden PDF Template */}
      <div className="hidden">
        <div ref={pdfRef} className="w-[210mm] p-12 bg-white text-zinc-900 font-sans">
          <div className="flex justify-between items-start mb-12">
            <div>
              {company?.logoUrl && (
                <img src={company.logoUrl} alt="Logo" className="w-24 h-24 mb-4 object-contain" referrerPolicy="no-referrer" />
              )}
              <h1 className="text-3xl font-bold text-zinc-900">{company?.name || 'Construction Estimate Pro'}</h1>
              <p className="text-sm text-zinc-500 whitespace-pre-line mt-2">{company?.address}</p>
            </div>
            <div className="text-right">
              <h2 className="text-4xl font-black text-zinc-200 uppercase tracking-widest mb-4">Estimate</h2>
              <div className="space-y-1 text-sm">
                <p><span className="font-bold">Date:</span> {format(new Date(), 'dd MMM yyyy')}</p>
                <p><span className="font-bold">GST:</span> {company?.gst}</p>
                <p><span className="font-bold">PAN:</span> {company?.pan}</p>
              </div>
            </div>
          </div>

          <div className="mb-12">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Estimate For:</h3>
            {formData.clientId && (
              <div>
                <p className="text-xl font-bold">{clients.find(c => c.id === formData.clientId)?.name}</p>
                <p className="text-sm text-zinc-500">{clients.find(c => c.id === formData.clientId)?.siteAddress}</p>
                <p className="text-sm text-zinc-500">Mob: {clients.find(c => c.id === formData.clientId)?.mob1}</p>
              </div>
            )}
          </div>

          <table className="w-full mb-12">
            <thead>
              <tr className="border-b-2 border-zinc-900 text-left text-sm font-bold">
                <th className="py-4">Description</th>
                <th className="py-4 text-center">Qty</th>
                <th className="py-4 text-right">Rate</th>
                <th className="py-4 text-center">GST</th>
                <th className="py-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {formData.items?.map((item, index) => (
                <tr key={index} className="text-sm">
                  <td className="py-4 font-medium">{item.name}</td>
                  <td className="py-4 text-center">{item.qty}</td>
                  <td className="py-4 text-right">{formatCurrency(item.price)}</td>
                  <td className="py-4 text-center">{item.gst}%</td>
                  <td className="py-4 text-right font-bold">{formatCurrency(item.price * item.qty * (1 + item.gst / 100))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-zinc-900">
                <td colSpan={4} className="py-6 text-right font-bold text-xl uppercase tracking-wider">Grand Total</td>
                <td className="py-6 text-right font-bold text-2xl text-primary">{formatCurrency(formData.total || 0)}</td>
              </tr>
            </tfoot>
          </table>

          <div className="grid grid-cols-2 gap-12">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">Terms & Conditions</h3>
              <ul className="text-xs text-zinc-500 space-y-2 list-disc pl-4">
                {formData.terms?.map((term, index) => (
                  <li key={index}>{term}</li>
                ))}
              </ul>
            </div>
            <div className="text-right flex flex-col items-end justify-end">
              <div className="w-48 border-b border-zinc-900 mb-2"></div>
              <p className="text-xs font-bold uppercase tracking-widest">Authorized Signatory</p>
              <p className="text-[10px] text-zinc-400 mt-1">For {company?.name}</p>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!estimateToDelete}
        onClose={() => setEstimateToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Estimate?"
        message="Are you sure you want to delete this estimate? This action cannot be undone."
        confirmText="Delete"
      />
    </div>
  );
}
