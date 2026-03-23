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

  const initialFormData: Partial<Estimate> = {
    clientId: '',
    items: [],
    total: 0,
    subtotal: 0,
    gstAmount: 0,
    discountPercentage: 0,
    discountAmount: 0,
    status: 'pending',
    revisions: 0,
    terms: [
      '50% advance payment required to start the project.',
      'GST will be charged extra as applicable.',
      'Validity of this estimate is 15 days.'
    ]
  };

  const [formData, setFormData] = useState<Partial<Estimate>>(initialFormData);

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

  const calculateTotal = (items: EstimateItem[], discountPerc: number = 0) => {
    const subtotal = items.reduce((acc, item) => {
      const length = Number(item.length) || 0;
      const width = Number(item.width) || 0;
      const price = Number(item.price) || 0;
      const qty = Number(item.qty) || 0;
      const area = (length && width) ? length * width : 1;
      return acc + (price * qty * area);
    }, 0);
    
    const discountAmt = subtotal * ((Number(discountPerc) || 0) / 100);
    const afterDiscount = subtotal - discountAmt;
    
    const gstAmt = items.reduce((acc, item) => {
      const length = Number(item.length) || 0;
      const width = Number(item.width) || 0;
      const price = Number(item.price) || 0;
      const qty = Number(item.qty) || 0;
      const gst = Number(item.gst) || 0;
      const area = (length && width) ? length * width : 1;
      const itemBase = price * qty * area;
      const itemDiscount = itemBase * ((Number(discountPerc) || 0) / 100);
      return acc + (itemBase - itemDiscount) * (gst / 100);
    }, 0);

    return {
      subtotal: Number(subtotal.toFixed(2)),
      discountAmount: Number(discountAmt.toFixed(2)),
      gstAmount: Number(gstAmt.toFixed(2)),
      total: Number((afterDiscount + gstAmt).toFixed(2))
    };
  };

  const addItemToEstimate = (item: Item) => {
    const newItems = [...(formData.items || [])];
    newItems.push({
      itemId: item.id,
      name: item.name,
      qty: 1,
      price: item.price,
      gst: item.gst,
      length: 0,
      width: 0,
      unit: 'ft'
    });
    const totals = calculateTotal(newItems, formData.discountPercentage);
    setFormData(prev => ({ ...prev, items: newItems, ...totals }));
  };

  const updateItem = (index: number, updates: Partial<EstimateItem>) => {
    const newItems = [...(formData.items || [])];
    newItems[index] = { ...newItems[index], ...updates };
    if (newItems[index].qty <= 0) {
      newItems.splice(index, 1);
    }
    const totals = calculateTotal(newItems, formData.discountPercentage);
    setFormData(prev => ({ ...prev, items: newItems, ...totals }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staff?.companyId) return;

    const dataToSave = {
      ...formData,
      companyId: staff.companyId,
      updatedAt: serverTimestamp(),
      createdBy: staff.uid,
      createdByName: staff.name,
    };

    if (selectedEstimate) {
      if (formData.status === 'revision') {
        dataToSave.revisions = (selectedEstimate.revisions || 0) + 1;
      }
      await updateDoc(doc(db, 'estimates', selectedEstimate.id), dataToSave);
    } else {
      dataToSave.createdAt = serverTimestamp();
      dataToSave.revisions = 0;
      await addDoc(collection(db, 'estimates'), dataToSave);
    }
    setIsModalOpen(false);
    setSelectedEstimate(null);
    setFormData(initialFormData);
  };

  const [estimateToPrint, setEstimateToPrint] = useState<Estimate | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

  const generateCanvas = async () => {
    const element = pdfRef.current;
    if (!element) return null;
    
    // Temporarily show the element off-screen to allow html2canvas to capture it
    element.style.display = 'block';
    element.style.position = 'fixed';
    element.style.left = '-9999px';
    element.style.top = '0';
    
    try {
      const canvas = await html2canvas(element, { 
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      return canvas;
    } finally {
      element.style.display = 'none';
    }
  };

  const handleDownloadPDF = async (estimate: Estimate) => {
    setEstimateToPrint(estimate);
    // Wait for state update and render
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const canvas = await generateCanvas();
    if (!canvas) return;

    try {
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      // Split into multiple pages if needed
      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Estimate_${estimate.id.slice(0, 5)}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setEstimateToPrint(null);
    }
  };

  const handleDownloadImage = async (estimate: Estimate, format: 'png' | 'jpg') => {
    setEstimateToPrint(estimate);
    await new Promise(resolve => setTimeout(resolve, 100));

    const canvas = await generateCanvas();
    if (!canvas) return;

    const imgData = canvas.toDataURL(`image/${format === 'jpg' ? 'jpeg' : 'png'}`);
    const link = document.createElement('a');
    link.download = `Estimate_${estimate.id.slice(0, 5)}.${format}`;
    link.href = imgData;
    link.click();
    setEstimateToPrint(null);
  };

  const handleViewPDF = async (estimate: Estimate) => {
    setEstimateToPrint(estimate);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const canvas = await generateCanvas();
    if (!canvas) return;

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    
    const pdfBlob = pdf.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    window.open(url, '_blank');
    setEstimateToPrint(null);
  };

  const handleShare = async (estimate: Estimate, format: 'png' | 'jpg' | 'pdf' = 'png') => {
    setEstimateToPrint(estimate);
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      const canvas = await generateCanvas();
      if (!canvas) return;

      let file: File;
      if (format === 'pdf') {
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        const pdfBlob = pdf.output('blob');
        file = new File([pdfBlob], `Estimate_${estimate.id.slice(0, 5)}.pdf`, { type: 'application/pdf' });
      } else {
        const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, mimeType));
        if (!blob) return;
        file = new File([blob], `Estimate_${estimate.id.slice(0, 5)}.${format}`, { type: mimeType });
      }
      
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Estimate',
          text: `Estimate for ${clients.find(c => c.id === estimate.clientId)?.name}`
        });
      } else {
        const url = URL.createObjectURL(file);
        const link = document.createElement('a');
        link.download = file.name;
        link.href = url;
        link.click();
      }
    } catch (error) {
      console.error('Sharing failed', error);
    } finally {
      setEstimateToPrint(null);
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
                      {estimate.createdByName && <span className="ml-2">• By {estimate.createdByName}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm",
                      estimate.status === 'approved' ? "bg-emerald-500 text-white shadow-emerald-500/20" :
                      estimate.status === 'pending' ? "bg-amber-500 text-white shadow-amber-500/20" :
                      estimate.status === 'rejected' ? "bg-rose-500 text-white shadow-rose-500/20" :
                      estimate.status === 'revision' ? "bg-indigo-500 text-white shadow-indigo-500/20" : "bg-zinc-500 text-white shadow-zinc-500/20"
                    )}>
                      {estimate.status}
                    </span>
                  </div>
                  {estimate.revisions > 0 && (
                    <span className="text-[10px] text-zinc-400 font-medium">Rev: {estimate.revisions}</span>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center mb-6">
                <div className="text-3xl font-black text-zinc-900 tracking-tight">{formatCurrency(estimate.total)}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{estimate.items.length} Items</div>
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
                    onClick={() => handleViewPDF(estimate)}
                    className="p-2 bg-zinc-50 text-zinc-600 hover:text-primary hover:bg-primary-light rounded-xl transition-all"
                    title="View PDF"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
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
                    onClick={() => handleDownloadImage(estimate, 'jpg')}
                    className="p-2 bg-zinc-50 text-zinc-600 hover:text-primary hover:bg-primary-light rounded-xl transition-all flex items-center justify-center"
                    title="Download JPG"
                  >
                    <span className="text-[10px] font-bold">JPG</span>
                  </button>
                  <button 
                    onClick={() => handleShare(estimate, 'pdf')}
                    className="p-2 bg-zinc-50 text-zinc-600 hover:text-primary hover:bg-primary-light rounded-xl transition-all"
                    title="Share PDF"
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
                          <th className="px-4 py-3">Dimensions</th>
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
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  value={item.length || 0}
                                  onChange={e => updateItem(index, { length: parseFloat(e.target.value) || 0 })}
                                  className="w-12 px-1 py-1 rounded border border-zinc-200 text-xs"
                                  placeholder="L"
                                />
                                <span className="text-zinc-400">x</span>
                                <input
                                  type="number"
                                  value={item.width || 0}
                                  onChange={e => updateItem(index, { width: parseFloat(e.target.value) || 0 })}
                                  className="w-12 px-1 py-1 rounded border border-zinc-200 text-xs"
                                  placeholder="W"
                                />
                                <select
                                  value={item.unit || 'ft'}
                                  onChange={e => updateItem(index, { unit: e.target.value as any })}
                                  className="px-1 py-1 rounded border border-zinc-200 text-[10px]"
                                >
                                  <option value="ft">ft</option>
                                  <option value="m">m</option>
                                  <option value="in">in</option>
                                </select>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button type="button" onClick={() => updateItem(index, { qty: item.qty - 1 })}>
                                  <MinusCircle className="w-4 h-4 text-zinc-400 hover:text-red-500" />
                                </button>
                                <span className="w-8 text-center font-bold">{item.qty}</span>
                                <button type="button" onClick={() => updateItem(index, { qty: item.qty + 1 })}>
                                  <PlusCircle className="w-4 h-4 text-zinc-400 hover:text-primary" />
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-zinc-600">{formatCurrency(item.price)}</td>
                            <td className="px-4 py-3 text-zinc-600">{item.gst}%</td>
                            <td className="px-4 py-3 text-right font-bold text-zinc-900">
                              {formatCurrency(item.price * item.qty * ((item.length && item.width) ? item.length * item.width : 1) * (1 + item.gst / 100))}
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
                      <span>{formatCurrency(formData.subtotal || 0)}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-400">Discount (%)</span>
                        <input
                          type="number"
                          value={formData.discountPercentage || 0}
                          onChange={e => {
                            const perc = parseFloat(e.target.value) || 0;
                            const totals = calculateTotal(formData.items || [], perc);
                            setFormData(prev => ({ ...prev, discountPercentage: perc, ...totals }));
                          }}
                          className="w-16 px-2 py-1 bg-zinc-800 rounded border border-zinc-700 text-xs text-white outline-none focus:border-primary"
                        />
                      </div>
                      <span className="text-red-400">-{formatCurrency(formData.discountAmount || 0)}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>GST Amount</span>
                      <span>{formatCurrency(formData.gstAmount || 0)}</span>
                    </div>
                    <div className="border-t border-zinc-800 pt-3 flex justify-between text-xl font-bold">
                      <span>Total Amount</span>
                      <span className="text-primary">{formatCurrency(formData.total || 0)}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Status</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['pending', 'approved', 'rejected', 'revision'].map(s => (
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
      <div style={{ display: 'none' }}>
        <div ref={pdfRef} style={{ width: '210mm', padding: '48px', backgroundColor: '#ffffff', color: '#18181b', fontFamily: 'sans-serif' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '48px' }}>
            <div>
              {company?.logoUrl && (
                <img src={company.logoUrl} alt="Logo" style={{ width: '96px', height: '96px', marginBottom: '16px', objectFit: 'contain' }} referrerPolicy="no-referrer" />
              )}
              <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#18181b', margin: 0 }}>{company?.name || 'Construction Estimate Pro'}</h1>
              <p style={{ fontSize: '14px', color: '#71717a', whiteSpace: 'pre-line', marginTop: '8px' }}>{company?.address}</p>
              <div style={{ fontSize: '12px', color: '#71717a', marginTop: '8px' }}>
                {company?.gst && <p>GST: {company.gst}</p>}
                {company?.pan && <p>PAN: {company.pan}</p>}
                {company?.tan && <p>TAN: {company.tan}</p>}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h2 style={{ fontSize: '36px', fontWeight: '900', color: '#e4e4e7', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px', margin: 0 }}>Estimate</h2>
              <div style={{ fontSize: '14px', color: '#18181b' }}>
                <p><span style={{ fontWeight: 'bold' }}>Date:</span> {estimateToPrint?.createdAt ? format(estimateToPrint.createdAt.toDate(), 'dd MMM yyyy') : format(new Date(), 'dd MMM yyyy')}</p>
                <p><span style={{ fontWeight: 'bold' }}>Estimate #:</span> {estimateToPrint?.id.slice(0, 8).toUpperCase()}</p>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '48px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#a1a1aa', marginBottom: '8px' }}>Estimate For:</h3>
            {estimateToPrint?.clientId && (
              <div>
                <p style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>{clients.find(c => c.id === estimateToPrint.clientId)?.name}</p>
                <p style={{ fontSize: '14px', color: '#71717a', margin: '4px 0' }}>{clients.find(c => c.id === estimateToPrint.clientId)?.siteAddress}</p>
                <p style={{ fontSize: '14px', color: '#71717a', margin: 0 }}>Mob: {clients.find(c => c.id === estimateToPrint.clientId)?.mob1}</p>
              </div>
            )}
          </div>

          <table style={{ width: '100%', marginBottom: '48px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #18181b', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>
                <th style={{ padding: '16px 0' }}>Description</th>
                <th style={{ padding: '16px 0', textAlign: 'center' }}>Dimensions</th>
                <th style={{ padding: '16px 0', textAlign: 'center' }}>Qty</th>
                <th style={{ padding: '16px 0', textAlign: 'right' }}>Rate</th>
                <th style={{ padding: '16px 0', textAlign: 'center' }}>GST</th>
                <th style={{ padding: '16px 0', textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody style={{ borderBottom: '1px solid #f4f4f5' }}>
              {estimateToPrint?.items?.map((item, index) => (
                <tr key={index} style={{ fontSize: '14px', borderBottom: '1px solid #f4f4f5' }}>
                  <td style={{ padding: '16px 0', fontWeight: '500' }}>{item.name}</td>
                  <td style={{ padding: '16px 0', textAlign: 'center' }}>
                    {item.length && item.width ? `${item.length} x ${item.width} ${item.unit}` : '-'}
                  </td>
                  <td style={{ padding: '16px 0', textAlign: 'center' }}>{item.qty}</td>
                  <td style={{ padding: '16px 0', textAlign: 'right' }}>{formatCurrency(item.price)}</td>
                  <td style={{ padding: '16px 0', textAlign: 'center' }}>{item.gst}%</td>
                  <td style={{ padding: '16px 0', textAlign: 'right', fontWeight: 'bold' }}>
                    {formatCurrency(item.price * item.qty * (item.length && item.width ? item.length * item.width : 1) * (1 + item.gst / 100))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5} style={{ padding: '8px 0', textAlign: 'right', fontSize: '14px', color: '#71717a' }}>Subtotal</td>
                <td style={{ padding: '8px 0', textAlign: 'right', fontSize: '14px', fontWeight: 'bold' }}>{formatCurrency(estimateToPrint?.subtotal || 0)}</td>
              </tr>
              {estimateToPrint?.discountAmount && estimateToPrint.discountAmount > 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '8px 0', textAlign: 'right', fontSize: '14px', color: '#ef4444' }}>Discount ({estimateToPrint.discountPercentage}%)</td>
                  <td style={{ padding: '8px 0', textAlign: 'right', fontSize: '14px', fontWeight: 'bold', color: '#ef4444' }}>-{formatCurrency(estimateToPrint.discountAmount)}</td>
                </tr>
              ) : null}
              <tr>
                <td colSpan={5} style={{ padding: '8px 0', textAlign: 'right', fontSize: '14px', color: '#71717a' }}>GST Amount</td>
                <td style={{ padding: '8px 0', textAlign: 'right', fontSize: '14px', fontWeight: 'bold' }}>{formatCurrency(estimateToPrint?.gstAmount || 0)}</td>
              </tr>
              <tr style={{ borderTop: '2px solid #18181b' }}>
                <td colSpan={5} style={{ padding: '24px 0', textAlign: 'right', fontWeight: 'bold', fontSize: '20px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Grand Total</td>
                <td style={{ padding: '24px 0', textAlign: 'right', fontWeight: 'bold', fontSize: '24px', color: '#10b981' }}>{formatCurrency(estimateToPrint?.total || 0)}</td>
              </tr>
            </tfoot>
          </table>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px' }}>
            <div>
              <h3 style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#a1a1aa', marginBottom: '16px' }}>Terms & Conditions</h3>
              <ul style={{ fontSize: '12px', color: '#71717a', paddingLeft: '16px', margin: 0 }}>
                {estimateToPrint?.terms?.map((term, index) => (
                  <li key={index} style={{ marginBottom: '8px' }}>{term}</li>
                ))}
              </ul>
            </div>
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'end', justifyContent: 'end' }}>
              {company?.ownerSignature && (
                <img src={company.ownerSignature} alt="Signature" style={{ height: '64px', marginBottom: '8px', objectFit: 'contain' }} referrerPolicy="no-referrer" />
              )}
              <div style={{ width: '192px', borderBottom: '1px solid #18181b', marginBottom: '8px' }}></div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Authorized Signatory</p>
              <p style={{ fontSize: '10px', color: '#a1a1aa', marginTop: '4px', margin: 0 }}>For {company?.name}</p>
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
