import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, query, orderBy, serverTimestamp, where, increment } from 'firebase/firestore';
import { Plus, Search, Trash2, Edit2, FileText, Download, Share2, Save, User, Package, PlusCircle, MinusCircle, History, CheckCircle, Clock, Eye, IndianRupee, Calculator, Bell, X } from 'lucide-react';
import { toast } from 'sonner';
import { Estimate, Client, Item, EstimateItem, Company } from '../types';
import ConfirmModal from './ConfirmModal';
import { formatCurrency, cn, toDate } from '../lib/utils';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { useAuth } from '../contexts/AuthContext';
import { OperationType, handleFirestoreError } from '../firebase';

export default function EstimateBuilder({ initialEstimateId, initialMode, onClearInitialId }: { 
  initialEstimateId?: string | null;
  initialMode?: 'view' | 'edit';
  onClearInitialId?: () => void;
}) {
  const { company, staff, isSuperAdmin } = useAuth();
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate | null>(null);
  const [estimateToDelete, setEstimateToDelete] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const initialFormData: Partial<Estimate> = {
    clientId: '',
    clientName: '',
    clientMob1: '',
    clientMob2: '',
    clientPan: '',
    siteAddress: '',
    currentAddress: '',
    propertyType: 'Resident',
    scopeOfWork: 'New Box Construction',
    completionTime: '',
    budget: '',
    items: [],
    total: 0,
    subtotal: 0,
    gstAmount: 0,
    discountType: 'percentage',
    discountValue: 0,
    discountAmount: 0,
    status: 'pending',
    revisions: 0,
    estimateNumber: `EST-${Math.floor(100000 + Math.random() * 900000)}`,
    terms: [
      'Plinth height up to 18inch from road level up, Foundation up to 5ft. from road level down.',
      'Steel size for above estimate will use 8mm, 10mm, 12mm, 14mm, 16mm. Larger sizes will be extra.',
      'Above rate only covers Masonry, Plaster, Foundation RCC, PCC, Slab, Beam Column RCC Work.',
      'Reti(sand), Kapchit(grit), Red Brick as per standard material available in local market.',
      'Inside 1 coat mala Plaster finish, outside 1 coat Plaster.',
      'All internal walls will be partition wall size, outer walls will be 9" thick as per drawing.',
      'Landscape, Garden, Terrace Garden, Compound Wall, Gate, balcony railings not included in above rate.',
      'Above all item price GST not included, GST charge extra as per item.',
      'Selection of higher range of material selected by Client will be charged extra.',
      'Drinking Water, Regular use water & Electricity should be provided by client.',
      'FINAL BILL WILL BE ON THE BASIS OF ACTUAL MEASUREMENT AND ACTUAL WORK DONE.'
    ]
  };

  const [formData, setFormData] = useState<Partial<Estimate>>(initialFormData);

  useEffect(() => {
    if (!staff) return;
    
    const estimatesQuery = isSuperAdmin
      ? query(collection(db, 'estimates'))
      : query(collection(db, 'estimates'), where('companyId', '==', staff.companyId));

    const unsubEstimates = onSnapshot(estimatesQuery, (snapshot) => {
      const sortedEstimates = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Estimate))
        .sort((a, b) => {
          const dateA = toDate(a.createdAt);
          const dateB = toDate(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        });
      setEstimates(sortedEstimates);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'estimates'));

    const clientsQuery = isSuperAdmin
      ? query(collection(db, 'clients'))
      : query(collection(db, 'clients'), where('companyId', '==', staff.companyId));

    const unsubClients = onSnapshot(clientsQuery, (snapshot) => {
      const sortedClients = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Client))
        .sort((a, b) => a.name.localeCompare(b.name));
      setClients(sortedClients);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'clients'));
    
    const itemsQuery = isSuperAdmin
      ? query(collection(db, 'items'))
      : query(collection(db, 'items'), where('companyId', '==', staff.companyId));

    const unsubItems = onSnapshot(itemsQuery, (snapshot) => {
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

  useEffect(() => {
    if (initialEstimateId && estimates.length > 0) {
      const estimate = estimates.find(e => e.id === initialEstimateId);
      if (estimate) {
        setSelectedEstimate(estimate);
        setFormData(estimate);
        setIsModalOpen(true);
        setIsPreviewMode(initialMode === 'view');
        if (onClearInitialId) onClearInitialId();
      }
    }
  }, [initialEstimateId, initialMode, estimates, onClearInitialId]);

  const calculateTotal = (items: EstimateItem[], discountType: 'percentage' | 'fixed' = 'percentage', discountValue: number = 0, isGstManual: boolean = false, gstOverride: number = 0) => {
    const subtotal = items.reduce((acc, item) => acc + item.total, 0);
    
    let discountAmt = 0;
    if (discountType === 'percentage') {
      discountAmt = subtotal * ((Number(discountValue) || 0) / 100);
    } else {
      discountAmt = Number(discountValue) || 0;
    }
    
    const afterDiscount = subtotal - discountAmt;
    
    let gstAmt = 0;
    if (isGstManual) {
      gstAmt = Number(gstOverride) || 0;
    } else {
      gstAmt = items.reduce((acc, item) => {
        const itemBase = item.total;
        const itemDiscount = discountType === 'percentage' 
          ? itemBase * ((Number(discountValue) || 0) / 100)
          : (itemBase / subtotal) * discountAmt;
        return acc + (itemBase - itemDiscount) * (item.gst / 100);
      }, 0);
    }

    return {
      subtotal: Number(subtotal.toFixed(2)),
      discountAmount: Number(discountAmt.toFixed(2)),
      gstAmount: Number(gstAmt.toFixed(2)),
      total: Number((afterDiscount + gstAmt).toFixed(2))
    };
  };

  const calculateItemTotal = (item: Partial<EstimateItem>) => {
    const length = Number(item.length) || 0;
    const width = Number(item.width) || 0;
    const price = Number(item.price) || 0;
    const qty = Number(item.qty) || 0;
    const area = (length && width) ? length * width : 1;
    return Number((price * qty * area).toFixed(2));
  };

  const addItemToEstimate = (item: Item) => {
    const newItems = [...(formData.items || [])];
    const newItem: EstimateItem = {
      itemId: item.id,
      name: item.name,
      qty: 1,
      price: item.price,
      gst: item.gst,
      length: 0,
      width: 0,
      unit: 'ft',
      total: 0
    };
    newItem.total = calculateItemTotal(newItem);
    newItems.push(newItem);
    const totals = calculateTotal(newItems, formData.discountType, formData.discountValue, formData.isGstManual, formData.gstOverride);
    setFormData(prev => ({ ...prev, items: newItems, ...totals }));
  };

  const updateItem = (index: number, updates: Partial<EstimateItem>) => {
    const newItems = [...(formData.items || [])];
    newItems[index] = { ...newItems[index], ...updates };
    if (newItems[index].qty <= 0) {
      newItems.splice(index, 1);
    } else {
      newItems[index].total = calculateItemTotal(newItems[index]);
    }
    const totals = calculateTotal(newItems, formData.discountType, formData.discountValue, formData.isGstManual, formData.gstOverride);
    setFormData(prev => ({ ...prev, items: newItems, ...totals }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staff?.companyId) return;

    // Check Estimate Limit for new estimates
    if (!selectedEstimate && company?.estimateLimit && (company.usedEstimates || 0) >= company.estimateLimit) {
      toast.error(`Estimate limit reached (${company.estimateLimit}). Please upgrade your package.`);
      return;
    }

    // Check Edit Time Limit for existing estimates
    if (selectedEstimate && company?.editTimeLimit) {
      const createdDate = toDate(selectedEstimate.createdAt);
      const daysDiff = (new Date().getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > company.editTimeLimit) {
        toast.error(`Editing period has expired (${company.editTimeLimit} days). This estimate can no longer be modified.`);
        return;
      }
    }

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
      const updatedEstimate = { ...dataToSave, id: selectedEstimate.id } as Estimate;
      setSelectedEstimate(updatedEstimate);
      setFormData(updatedEstimate);
    } else {
      dataToSave.createdAt = serverTimestamp();
      dataToSave.revisions = 0;
      const docRef = await addDoc(collection(db, 'estimates'), dataToSave);
      
      // Increment usedEstimates count in company document
      await updateDoc(doc(db, 'companies', staff.companyId), {
        usedEstimates: increment(1)
      });

      const newEstimate = { ...dataToSave, id: docRef.id, createdAt: { toDate: () => new Date() } } as any;
      setSelectedEstimate(newEstimate);
      setFormData(newEstimate);
    }
    setIsPreviewMode(true);
  };

  const [estimateToPrint, setEstimateToPrint] = useState<Estimate | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [reminderFormData, setReminderFormData] = useState({
    clientId: '',
    title: '',
    dueDate: format(new Date(), "yyyy-MM-dd'T'HH:mm")
  });

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staff?.companyId || !reminderFormData.clientId) return;

    try {
      await addDoc(collection(db, 'reminders'), {
        ...reminderFormData,
        companyId: staff.companyId,
        status: 'pending',
        createdAt: serverTimestamp(),
        createdBy: staff.uid,
        createdByName: staff.name
      });
      toast.success('Reminder set successfully');
      setIsReminderModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reminders');
      toast.error('Failed to set reminder');
    }
  };

  const generateCanvas = async () => {
    const element = pdfRef.current;
    if (!element) return null;
    
    try {
      // Wait for images to load
      const images = element.querySelectorAll('img');
      await Promise.all(Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }));

      // Extra wait for layout and fonts
      await new Promise(resolve => setTimeout(resolve, 1000));

      const canvas = await html2canvas(element, { 
        scale: 2,
        useCORS: true,
        allowTaint: false, // Changed to false to prevent tainted canvas
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
        onclone: (clonedDoc) => {
          // Fix for html2canvas not supporting oklch colors (Tailwind v4)
          const allElements = clonedDoc.getElementsByTagName('*');
          for (let i = 0; i < allElements.length; i++) {
            const el = allElements[i] as HTMLElement;
            const style = window.getComputedStyle(el);
            
            // Check common color properties
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

          const clonedElement = clonedDoc.querySelector('[data-pdf-content]');
          if (clonedElement instanceof HTMLElement) {
            clonedElement.style.display = 'block';
            clonedElement.style.visibility = 'visible';
            clonedElement.style.position = 'relative';
            clonedElement.style.left = '0';
            clonedElement.style.top = '0';
            clonedElement.style.margin = '0';
            clonedElement.style.padding = '20mm';
            clonedElement.style.width = '210mm';
            clonedElement.style.height = 'auto';
            clonedElement.style.minHeight = '297mm';
          }
        }
      });

      return canvas;
    } catch (error) {
      console.error('Canvas generation failed:', error);
      return null;
    }
  };

  const handleDownloadPDF = async (estimate: Estimate) => {
    if (isGenerating) return;
    setIsGenerating(true);
    setEstimateToPrint(estimate);
    
    try {
      // Wait for state update and render
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const canvas = await generateCanvas();
      if (!canvas) {
        toast.error('Failed to generate PDF canvas');
        return;
      }

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

      pdf.save(`Estimate_${estimate.estimateNumber || estimate.id?.slice(0, 5)}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast.error('Failed to generate PDF');
    } finally {
      setEstimateToPrint(null);
      setIsGenerating(false);
    }
  };

  const handleDownloadImage = async (estimate: Estimate, format: 'png' | 'jpg') => {
    if (isGenerating) return;
    setIsGenerating(true);
    setEstimateToPrint(estimate);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await generateCanvas();
      if (!canvas) {
        toast.error('Failed to generate image canvas');
        return;
      }

      const imgData = canvas.toDataURL(`image/${format === 'jpg' ? 'jpeg' : 'png'}`);
      const link = document.createElement('a');
      link.download = `Estimate_${estimate.estimateNumber || estimate.id?.slice(0, 5)}.${format}`;
      link.href = imgData;
      link.click();
    } catch (error) {
      console.error('Image generation failed:', error);
      toast.error('Failed to generate image');
    } finally {
      setEstimateToPrint(null);
      setIsGenerating(false);
    }
  };

  const handleViewPDF = async (estimate: Estimate) => {
    if (isGenerating) return;
    setIsGenerating(true);
    setEstimateToPrint(estimate);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const canvas = await generateCanvas();
      if (!canvas) {
        toast.error('Failed to generate PDF preview');
        return;
      }

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      // Multi-page support for view as well
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
      
      const pdfBlob = pdf.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      const newWindow = window.open(url, '_blank');
      if (!newWindow) {
        // Fallback if popup is blocked
        pdf.save(`Estimate_${estimate.estimateNumber || estimate.id?.slice(0, 5)}.pdf`);
      }
    } catch (err) {
      console.error('PDF view failed:', err);
      toast.error('Failed to view PDF');
    } finally {
      setEstimateToPrint(null);
      setIsGenerating(false);
    }
  };

  const handleShare = async (estimate: Estimate, format: 'png' | 'jpg' | 'pdf' = 'png') => {
    if (isGenerating) return;
    setIsGenerating(true);
    setEstimateToPrint(estimate);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await generateCanvas();
      if (!canvas) {
        toast.error('Failed to generate sharing canvas');
        return;
      }

      let file: File;
      const fileName = `Estimate_${estimate.estimateNumber || estimate.id?.slice(0, 5)}`;

      if (format === 'pdf') {
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        // Multi-page support
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

        const pdfBlob = pdf.output('blob');
        file = new File([pdfBlob], `${fileName}.pdf`, { type: 'application/pdf' });
      } else {
        const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, mimeType));
        if (!blob) {
          toast.error('Failed to create image blob');
          return;
        }
        file = new File([blob], `${fileName}.${format}`, { type: mimeType });
      }
      
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Estimate',
          text: `Estimate for ${clients.find(c => c.id === estimate.clientId)?.name || estimate.clientName}`
        });
      } else {
        const url = URL.createObjectURL(file);
        const link = document.createElement('a');
        link.download = file.name;
        link.href = url;
        link.click();
        toast.info('Sharing not supported, downloading instead');
      }
    } catch (error) {
      console.error('Sharing failed', error);
      toast.error('Failed to share estimate');
    } finally {
      setEstimateToPrint(null);
      setIsGenerating(false);
    }
  };

  const handleDownloadExcel = (estimate: Estimate) => {
    const data = [
      ['Estimate Number', estimate.estimateNumber],
      ['Date', format(new Date(), 'dd/MM/yyyy')],
      ['Customer Name', estimate.clientName],
      ['Mobile', estimate.clientMob1],
      ['Site Address', estimate.siteAddress],
      [''],
      ['Sr.', 'Item Name', 'Unit', 'Price', 'Qty', 'Total'],
      ...(estimate.items?.map((item, index) => [
        index + 1,
        item.name,
        item.unit,
        item.price,
        item.qty,
        item.total
      ]) || []),
      [''],
      ['', '', '', '', 'Subtotal', estimate.subtotal],
      ['', '', '', '', 'GST', estimate.gstAmount],
      ['', '', '', '', 'Grand Total', estimate.total],
      [''],
      ['Terms & Conditions'],
      ...(estimate.terms?.map((term, index) => [`${index + 1}. ${term}`]) || [])
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Estimate');
    XLSX.writeFile(wb, `Estimate_${estimate.estimateNumber}.xlsx`);
  };

  const handlePrint = async (estimate: Estimate) => {
    if (isGenerating) return;
    setIsGenerating(true);
    setEstimateToPrint(estimate);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const canvas = await generateCanvas();
      if (!canvas) {
        toast.error('Failed to generate print canvas');
        return;
      }

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const windowContent = `
        <!DOCTYPE html>
        <html>
          <head><title>Print Estimate</title></head>
          <body style="margin: 0; display: flex; justify-content: center; align-items: center;">
            <img src="${imgData}" style="width: 100%; max-width: 800px;" />
            <script>
              window.onload = () => {
                window.print();
                window.onafterprint = () => window.close();
              };
            </script>
          </body>
        </html>
      `;
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(windowContent);
        printWindow.document.close();
      } else {
        toast.error('Popup blocked. Please allow popups to print.');
      }
    } catch (error) {
      console.error('Print failed', error);
      toast.error('Failed to print estimate');
    } finally {
      setEstimateToPrint(null);
      setIsGenerating(false);
    }
  };

  const handleDelete = async () => {
    if (!estimateToDelete || !staff?.companyId) return;
    try {
      await deleteDoc(doc(db, 'estimates', estimateToDelete));
      
      // Decrement usedEstimates count in company document
      await updateDoc(doc(db, 'companies', staff.companyId), {
        usedEstimates: increment(-1)
      });
      
      setEstimateToDelete(null);
      toast.success('Estimate deleted successfully');
    } catch (error) {
      console.error('Delete failed', error);
      toast.error('Failed to delete estimate');
    }
  };

  const filteredEstimates = estimates.filter(e => {
    const client = clients.find(c => c.id === e.clientId);
    return client?.name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Estimates</h1>
          {company?.estimateLimit && (
            <p className="text-xs text-zinc-500 mt-1">
              Usage: <span className="font-bold text-primary">{company.usedEstimates || 0} / {company.estimateLimit}</span> Estimates
            </p>
          )}
        </div>
        <button
          onClick={() => {
            if (company?.estimateLimit && (company.usedEstimates || 0) >= company.estimateLimit) {
              toast.error(`Estimate limit reached (${company.estimateLimit}). Please upgrade your package.`);
              return;
            }
            setSelectedEstimate(null);
            setFormData({
              ...initialFormData,
              estimateNumber: `EST-${Math.floor(100000 + Math.random() * 900000)}`
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
                      {estimate.createdAt ? format(toDate(estimate.createdAt), 'dd MMM yyyy') : 'Just now'}
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
                    if (company?.editTimeLimit) {
                      const createdDate = toDate(estimate.createdAt);
                      const daysDiff = (new Date().getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
                      if (daysDiff > company.editTimeLimit) {
                        toast.error(`Editing period has expired (${company.editTimeLimit} days). This estimate can no longer be modified.`);
                        return;
                      }
                    }
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
                  <button 
                    onClick={() => {
                      setReminderFormData({
                        clientId: estimate.clientId,
                        title: `Follow up: Estimate ${estimate.estimateNumber || estimate.id.slice(0, 5)}`,
                        dueDate: format(new Date(Date.now() + 86400000), "yyyy-MM-dd'T'HH:mm") // Tomorrow
                      });
                      setIsReminderModalOpen(true);
                    }}
                    className="p-2 bg-zinc-50 text-zinc-600 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all"
                    title="Set Reminder"
                  >
                    <Bell className="w-5 h-5" />
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
          <div className="bg-zinc-50 w-full max-w-7xl h-full max-h-[95vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-8 border-b border-zinc-200 bg-white rounded-t-3xl flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold text-zinc-900">
                  {isPreviewMode ? 'Estimate Preview' : (selectedEstimate ? `Editing Estimate ${selectedEstimate.estimateNumber}` : 'Create Professional Estimate')}
                </h2>
                <div className="flex bg-zinc-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setIsPreviewMode(false)}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                      !isPreviewMode ? "bg-white text-primary shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                    )}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPreviewMode(true)}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                      isPreviewMode ? "bg-white text-primary shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                    )}
                  >
                    Preview
                  </button>
                </div>
              </div>
              <button 
                onClick={() => { setIsModalOpen(false); setIsPreviewMode(false); }} 
                className="flex items-center gap-2 px-4 py-2 hover:bg-zinc-100 rounded-xl transition-all text-zinc-500 font-bold text-sm"
              >
                <MinusCircle className="w-5 h-5" />
                {selectedEstimate ? 'Cancel Edit' : 'Close'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isPreviewMode ? (
                <div className="p-8 space-y-8 bg-zinc-100 min-h-full flex flex-col items-center">
                <div className="flex flex-col gap-6 w-full max-w-4xl">
                  <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm">
                    <div className="flex gap-2">
                      <div className="group relative">
                        <button className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-all">
                          <Download className="w-4 h-4" />
                          Download
                        </button>
                        <div className="absolute top-full left-0 mt-2 w-40 bg-white rounded-xl shadow-xl border border-zinc-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                          <button onClick={() => handleDownloadPDF(selectedEstimate!)} className="w-full px-4 py-2 text-left text-xs font-bold text-zinc-600 hover:bg-zinc-50 hover:text-primary transition-all flex items-center gap-2">
                            <FileText className="w-4 h-4" /> PDF Document
                          </button>
                          <button onClick={() => handleDownloadImage(selectedEstimate!, 'png')} className="w-full px-4 py-2 text-left text-xs font-bold text-zinc-600 hover:bg-zinc-50 hover:text-primary transition-all flex items-center gap-2">
                            <Eye className="w-4 h-4" /> PNG Image
                          </button>
                          <button onClick={() => handleDownloadImage(selectedEstimate!, 'jpg')} className="w-full px-4 py-2 text-left text-xs font-bold text-zinc-600 hover:bg-zinc-50 hover:text-primary transition-all flex items-center gap-2">
                            <Eye className="w-4 h-4" /> JPG Image
                          </button>
                          <button onClick={() => handleDownloadExcel(selectedEstimate!)} className="w-full px-4 py-2 text-left text-xs font-bold text-zinc-600 hover:bg-zinc-50 hover:text-primary transition-all flex items-center gap-2">
                            <History className="w-4 h-4" /> Excel Sheet
                          </button>
                        </div>
                      </div>

                      <div className="group relative">
                        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 text-zinc-600 rounded-xl text-xs font-bold hover:bg-zinc-50 transition-all">
                          <Share2 className="w-4 h-4" />
                          Share
                        </button>
                        <div className="absolute top-full left-0 mt-2 w-40 bg-white rounded-xl shadow-xl border border-zinc-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                          <button onClick={() => handleShare(selectedEstimate!, 'pdf')} className="w-full px-4 py-2 text-left text-xs font-bold text-zinc-600 hover:bg-zinc-50 hover:text-primary transition-all flex items-center gap-2">
                            <FileText className="w-4 h-4" /> Share PDF
                          </button>
                          <button onClick={() => handleShare(selectedEstimate!, 'png')} className="w-full px-4 py-2 text-left text-xs font-bold text-zinc-600 hover:bg-zinc-50 hover:text-primary transition-all flex items-center gap-2">
                            <Eye className="w-4 h-4" /> Share Image
                          </button>
                        </div>
                      </div>

                      <button 
                        onClick={() => handlePrint(selectedEstimate!)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 text-zinc-600 rounded-xl text-xs font-bold hover:bg-zinc-50 transition-all"
                      >
                        <FileText className="w-4 h-4" />
                        Print
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsPreviewMode(false)}
                        className="px-6 py-2 bg-white border border-zinc-200 text-zinc-600 font-bold rounded-xl hover:bg-zinc-50 transition-all text-xs"
                      >
                        Back to Edit
                      </button>
                      <button
                        onClick={() => {
                          setIsModalOpen(false);
                          setIsPreviewMode(false);
                          setFormData(initialFormData);
                          if (onClearInitialId) onClearInitialId();
                        }}
                        className="px-6 py-2 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-105 transition-all text-xs"
                      >
                        Finish & Close
                      </button>
                    </div>
                  </div>

                  <div className="bg-zinc-100 p-4 md:p-12 rounded-[40px] shadow-inner overflow-auto max-h-[70vh]">
                    <div 
                      ref={pdfRef}
                      data-pdf-content
                      className="bg-white mx-auto shadow-2xl p-8 md:p-12 space-y-8"
                      style={{ width: '210mm', minHeight: '297mm' }}
                    >
                      {/* Reuse the PDF template logic here for preview */}
                      <div className="space-y-6">
                    <div className="flex justify-between items-center border-b-2 border-zinc-900 pb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-amber-400 rounded-full flex items-center justify-center overflow-hidden">
                          {company?.logoUrl ? (
                            <img 
                              key={company.logoUrl}
                              src={company.logoUrl} 
                              alt="Logo" 
                              className="w-full h-full object-contain" 
                              referrerPolicy="no-referrer" 
                              crossOrigin="anonymous"
                            />
                          ) : (
                            <span className="text-2xl font-black">{company?.name?.[0] || 'P'}</span>
                          )}
                        </div>
                        <div>
                          <h1 className="text-xl font-black text-zinc-900 leading-tight">{company?.name}</h1>
                          <p className="text-[10px] text-zinc-500">{company?.address}</p>
                        </div>
                      </div>
                      <div className="text-right text-[9px] text-zinc-500 space-y-0.5">
                        <p>CIN: {company?.cin}</p>
                        <p>GST: {company?.gst}</p>
                        <p>Mo: {company?.phone}</p>
                        <p>Email: {company?.email}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center border border-zinc-900 p-2">
                      <h2 className="text-sm font-bold underline uppercase">General Estimate</h2>
                      <p className="text-xs font-bold">Date: {formData.createdAt ? format(toDate(formData.createdAt), 'dd/MM/yyyy') : format(new Date(), 'dd/MM/yyyy')}</p>
                    </div>

                    <table className="w-full border-collapse text-xs">
                      <tbody>
                        <tr>
                          <td className="border border-zinc-900 p-2 font-bold w-1/4 bg-zinc-50">Customer Name:</td>
                          <td className="border border-zinc-900 p-2 w-1/2">{formData.clientName}</td>
                          <td className="border border-zinc-900 p-2 font-bold w-1/6 bg-zinc-50">Mob:</td>
                          <td className="border border-zinc-900 p-2">{formData.clientMob1}</td>
                        </tr>
                        <tr>
                          <td className="border border-zinc-900 p-2 font-bold bg-zinc-50">Alt Mobile:</td>
                          <td className="border border-zinc-900 p-2">{formData.clientMob2 || 'N/A'}</td>
                          <td className="border border-zinc-900 p-2 font-bold bg-zinc-50">PAN No:</td>
                          <td className="border border-zinc-900 p-2">{formData.clientPan || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td className="border border-zinc-900 p-2 font-bold bg-zinc-50">Site Address:</td>
                          <td className="border border-zinc-900 p-2">{formData.siteAddress}</td>
                          <td className="border border-zinc-900 p-2 font-bold bg-zinc-50">EST No:</td>
                          <td className="border border-zinc-900 p-2 font-bold text-primary">{formData.estimateNumber}</td>
                        </tr>
                        <tr>
                          <td className="border border-zinc-900 p-2 font-bold bg-zinc-50">Current Address:</td>
                          <td className="border border-zinc-900 p-2">{formData.currentAddress || 'N/A'}</td>
                          <td className="border border-zinc-900 p-2 font-bold bg-zinc-50">Date:</td>
                          <td className="border border-zinc-900 p-2">{format(new Date(), 'dd/MM/yyyy')}</td>
                        </tr>
                        <tr>
                          <td className="border border-zinc-900 p-2 font-bold bg-zinc-50">Property Type:</td>
                          <td className="border border-zinc-900 p-2">{formData.propertyType}</td>
                          <td className="border border-zinc-900 p-2 font-bold bg-zinc-50">Scope of Work:</td>
                          <td className="border border-zinc-900 p-2">{formData.scopeOfWork}</td>
                        </tr>
                        <tr>
                          <td className="border border-zinc-900 p-2 font-bold bg-zinc-50">Est. Completion:</td>
                          <td className="border border-zinc-900 p-2">{formData.completionTime || 'N/A'}</td>
                          <td className="border border-zinc-900 p-2 font-bold bg-zinc-50">Budget:</td>
                          <td className="border border-zinc-900 p-2 font-bold">{formData.budget || 'N/A'}</td>
                        </tr>
                      </tbody>
                    </table>

                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="bg-zinc-50">
                          <th className="border border-zinc-900 p-2 text-left w-12">Sr.</th>
                          <th className="border border-zinc-900 p-2 text-left">Item Name</th>
                          <th className="border border-zinc-900 p-2 text-center w-20">L x W</th>
                          <th className="border border-zinc-900 p-2 text-center w-20">Area</th>
                          <th className="border border-zinc-900 p-2 text-center w-16">Unit</th>
                          <th className="border border-zinc-900 p-2 text-center w-20">Rate</th>
                          <th className="border border-zinc-900 p-2 text-center w-16">Qty.</th>
                          <th className="border border-zinc-900 p-2 text-right w-24">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.items?.map((item, index) => (
                          <tr key={index}>
                            <td className="border border-zinc-900 p-2 text-center">{index + 1}</td>
                            <td className="border border-zinc-900 p-2 font-medium">{item.name}</td>
                            <td className="border border-zinc-900 p-2 text-center">
                              {item.length && item.width ? `${item.length} x ${item.width}` : '-'}
                            </td>
                            <td className="border border-zinc-900 p-2 text-center">
                              {item.length && item.width ? (item.length * item.width).toFixed(2) : '-'}
                            </td>
                            <td className="border border-zinc-900 p-2 text-center uppercase">{item.unit}</td>
                            <td className="border border-zinc-900 p-2 text-center">₹{item.price}</td>
                            <td className="border border-zinc-900 p-2 text-center">{item.qty}</td>
                            <td className="border border-zinc-900 p-2 text-right font-bold">₹{item.total?.toLocaleString('en-IN')}</td>
                          </tr>
                        ))}
                        <tr>
                          <td colSpan={7} className="border border-zinc-900 p-2 text-right font-bold text-[10px]">SUB TOTAL</td>
                          <td className="border border-zinc-900 p-2 text-right font-bold">₹{formData.subtotal?.toLocaleString('en-IN')}</td>
                        </tr>
                        <tr>
                          <td colSpan={7} className="border border-zinc-900 p-2 text-right font-bold text-[10px]">GST (ESTIMATED)</td>
                          <td className="border border-zinc-900 p-2 text-right font-bold">+ ₹{formData.gstAmount?.toLocaleString('en-IN')}</td>
                        </tr>
                        <tr className="bg-zinc-900 text-white">
                          <td colSpan={7} className="border border-zinc-900 p-3 text-right font-bold text-xs">GRAND TOTAL ESTIMATED</td>
                          <td className="border border-zinc-900 p-3 text-right font-bold text-lg">₹{formData.total?.toLocaleString('en-IN')}</td>
                        </tr>
                      </tbody>
                    </table>

                    <div className="border border-zinc-900">
                      <div className="bg-zinc-900 text-white p-1.5 text-center font-bold text-[10px] uppercase">Work Details & Terms</div>
                      <div className="p-4 space-y-1.5">
                        {formData.terms?.map((term, index) => (
                          <div key={index} className="flex gap-2 text-[10px]">
                            <span className="font-bold">{index + 1}.</span>
                            <p>{term}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 space-y-8 bg-zinc-100 min-h-full flex flex-col items-center">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full max-w-4xl">
                  {/* Customer & Project Profile */}
            <div className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-100 pb-4 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-primary uppercase tracking-widest">Customer & Project Profile</h3>
                      <p className="text-[10px] text-zinc-500 font-medium">Manage customer details and project scope</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Select Existing Client:</span>
                      <select
                        onChange={e => {
                          const client = clients.find(c => c.id === e.target.value);
                          if (client) {
                            setFormData(prev => ({ 
                              ...prev, 
                              clientId: client.id,
                              clientName: client.name,
                              clientMob1: client.mob1,
                              clientMob2: client.mob2 || '',
                              clientPan: client.pan || '',
                              siteAddress: client.siteAddress,
                              currentAddress: client.currentAddress,
                              propertyType: client.projectCategory || 'Resident',
                              scopeOfWork: client.projectType || 'New Box Construction',
                              budget: client.budget?.toString() || ''
                            }));
                          }
                        }}
                        className="text-xs border border-zinc-200 rounded-lg px-3 py-1.5 outline-none focus:border-primary transition-all font-medium bg-zinc-50 min-w-[200px]"
                        value={formData.clientId || ''}
                      >
                        <option value="">-- Select from Directory --</option>
                        {clients.map(c => (
                          <option key={c.id} value={c.id}>{c.name} ({c.mob1})</option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        clientId: '',
                        clientName: '',
                        clientMob1: '',
                        clientMob2: '',
                        clientPan: '',
                        siteAddress: '',
                        currentAddress: '',
                        propertyType: 'Resident',
                        scopeOfWork: 'New Box Construction',
                        budget: ''
                      }))}
                      className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                      title="Clear Customer Data"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Customer Name</label>
                    <input
                      type="text"
                      value={formData.clientName}
                      onChange={e => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                      className="w-full py-2 border-b border-zinc-200 outline-none focus:border-primary transition-all text-sm font-medium"
                      placeholder="Enter Customer Name"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Mobile Number</label>
                    <input
                      type="text"
                      value={formData.clientMob1}
                      onChange={e => setFormData(prev => ({ ...prev, clientMob1: e.target.value }))}
                      className="w-full py-2 border-b border-zinc-200 outline-none focus:border-primary transition-all text-sm font-medium"
                      placeholder="Mobile Number"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Alt Mobile</label>
                    <input
                      type="text"
                      value={formData.clientMob2}
                      onChange={e => setFormData(prev => ({ ...prev, clientMob2: e.target.value }))}
                      className="w-full py-2 border-b border-zinc-200 outline-none focus:border-primary transition-all text-sm font-medium"
                      placeholder="Alt Mobile"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">PAN Number</label>
                    <input
                      type="text"
                      value={formData.clientPan}
                      onChange={e => setFormData(prev => ({ ...prev, clientPan: e.target.value }))}
                      className="w-full py-2 border-b border-zinc-200 outline-none focus:border-primary transition-all text-sm font-medium"
                      placeholder="PAN Number"
                    />
                  </div>
                  <div className="lg:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Site Address</label>
                    <input
                      type="text"
                      value={formData.siteAddress}
                      onChange={e => setFormData(prev => ({ ...prev, siteAddress: e.target.value }))}
                      className="w-full py-2 border-b border-zinc-200 outline-none focus:border-primary transition-all text-sm font-medium"
                      placeholder="Site Address"
                    />
                  </div>
                  <div className="lg:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Current Address</label>
                    <input
                      type="text"
                      value={formData.currentAddress}
                      onChange={e => setFormData(prev => ({ ...prev, currentAddress: e.target.value }))}
                      className="w-full py-2 border-b border-zinc-200 outline-none focus:border-primary transition-all text-sm font-medium"
                      placeholder="Current Address"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Property Type</label>
                    <select
                      value={formData.propertyType}
                      onChange={e => setFormData(prev => ({ ...prev, propertyType: e.target.value }))}
                      className="w-full py-2 border-b border-zinc-200 outline-none focus:border-primary transition-all text-sm font-medium bg-transparent"
                    >
                      <option value="Resident">Resident</option>
                      <option value="Commercial">Commercial</option>
                      <option value="Industrial">Industrial</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Scope of Work</label>
                    <select
                      value={formData.scopeOfWork}
                      onChange={e => setFormData(prev => ({ ...prev, scopeOfWork: e.target.value }))}
                      className="w-full py-2 border-b border-zinc-200 outline-none focus:border-primary transition-all text-sm font-medium bg-transparent"
                    >
                      <option value="New Box Construction">New Box Construction</option>
                      <option value="Turnkey Project">Turnkey Project</option>
                      <option value="Renovation">Renovation</option>
                      <option value="Interior Design">Interior Design</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Estimate Completion</label>
                    <input
                      type="text"
                      value={formData.completionTime}
                      onChange={e => setFormData(prev => ({ ...prev, completionTime: e.target.value }))}
                      className="w-full py-2 border-b border-zinc-200 outline-none focus:border-primary transition-all text-sm font-medium"
                      placeholder="e.g. 6 Months"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Budget</label>
                    <input
                      type="text"
                      value={formData.budget}
                      onChange={e => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                      className="w-full py-2 border-b border-zinc-200 outline-none focus:border-primary transition-all text-sm font-medium"
                      placeholder="Approx Budget"
                    />
                  </div>
                </div>

                {!formData.clientId && formData.clientName && (
                  <div className="pt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!staff?.companyId) return;
                        try {
                          const docRef = await addDoc(collection(db, 'clients'), {
                            companyId: staff.companyId,
                            name: formData.clientName,
                            mob1: formData.clientMob1,
                            mob2: formData.clientMob2,
                            pan: formData.clientPan,
                            siteAddress: formData.siteAddress,
                            currentAddress: formData.currentAddress,
                            projectType: formData.scopeOfWork,
                            projectCategory: formData.propertyType,
                            budget: Number(formData.budget) || 0,
                            createdAt: serverTimestamp()
                          });
                          setFormData(prev => ({ ...prev, clientId: docRef.id }));
                          toast.success('Client saved to directory');
                        } catch (error) {
                          toast.error('Failed to save client');
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl text-xs font-bold hover:bg-primary/20 transition-all"
                    >
                      <PlusCircle className="w-4 h-4" />
                      Save to Client Directory
                    </button>
                  </div>
                )}
            </div>

              {/* Measurement & Pricing Table */}
              <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
                  <h3 className="font-bold text-zinc-800">Measurement & Pricing Table</h3>
                  <button 
                    type="button"
                    onClick={() => {
                      const newItem: EstimateItem = {
                        itemId: 'custom-' + Date.now(),
                        name: 'Custom Item',
                        qty: 1,
                        price: 0,
                        gst: 18,
                        length: 0,
                        width: 0,
                        unit: 'ft',
                        total: 0
                      };
                      const newItems = [...(formData.items || []), newItem];
                      const totals = calculateTotal(newItems, formData.discountType, formData.discountValue, formData.isGstManual, formData.gstOverride);
                      setFormData(prev => ({ ...prev, items: newItems, ...totals }));
                    }}
                    className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md shadow-primary/20 hover:scale-105 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Add Custom Item
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-50 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-100">
                        <th className="px-6 py-4">SR.</th>
                        <th className="px-6 py-4">Item Name</th>
                        <th className="px-6 py-4">L / H</th>
                        <th className="px-6 py-4">W / D</th>
                        <th className="px-6 py-4">Unit</th>
                        <th className="px-6 py-4">GST%</th>
                        <th className="px-6 py-4">Price</th>
                        <th className="px-6 py-4">QTY.</th>
                        <th className="px-6 py-4 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {formData.items?.map((item, index) => (
                        <tr key={index} className="group hover:bg-zinc-50/50 transition-all">
                          <td className="px-6 py-4 text-xs text-zinc-400 font-medium">{index + 1}</td>
                          <td className="px-6 py-4">
                            <input
                              type="text"
                              value={item.name}
                              onChange={e => updateItem(index, { name: e.target.value })}
                              className="w-full bg-transparent border-none outline-none text-sm font-semibold text-zinc-800 focus:ring-0 p-0"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="number"
                              value={item.length || 0}
                              onChange={e => updateItem(index, { length: parseFloat(e.target.value) || 0 })}
                              className="w-16 bg-transparent border-none outline-none text-sm font-medium text-zinc-600 focus:ring-0 p-0"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="number"
                              value={item.width || 0}
                              onChange={e => updateItem(index, { width: parseFloat(e.target.value) || 0 })}
                              className="w-16 bg-transparent border-none outline-none text-sm font-medium text-zinc-600 focus:ring-0 p-0"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <select
                              value={item.unit || 'ft'}
                              onChange={e => updateItem(index, { unit: e.target.value })}
                              className="bg-transparent border-none outline-none text-sm font-medium text-zinc-600 focus:ring-0 p-0"
                            >
                              <option value="ft">ft</option>
                              <option value="m">m</option>
                              <option value="in">in</option>
                              <option value="Unit">Unit</option>
                            </select>
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="number"
                              value={item.gst || 0}
                              onChange={e => updateItem(index, { gst: parseFloat(e.target.value) || 0 })}
                              className="w-12 bg-transparent border-none outline-none text-sm font-medium text-zinc-600 focus:ring-0 p-0"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="number"
                              value={item.price || 0}
                              onChange={e => updateItem(index, { price: parseFloat(e.target.value) || 0 })}
                              className="w-24 bg-transparent border-none outline-none text-sm font-medium text-zinc-600 focus:ring-0 p-0"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <button type="button" onClick={() => updateItem(index, { qty: item.qty - 1 })} className="text-zinc-300 hover:text-red-500 transition-all">
                                <MinusCircle className="w-4 h-4" />
                              </button>
                              <span className="text-sm font-bold text-zinc-700 w-4 text-center">{item.qty}</span>
                              <button type="button" onClick={() => updateItem(index, { qty: item.qty + 1 })} className="text-zinc-300 hover:text-primary transition-all">
                                <PlusCircle className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-4">
                              <span className="text-sm font-bold text-zinc-900">{formatCurrency(item.total)}</span>
                              <button 
                                type="button" 
                                onClick={() => updateItem(index, { qty: 0 })}
                                className="opacity-0 group-hover:opacity-100 p-1 text-zinc-300 hover:text-red-500 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(!formData.items || formData.items.length === 0) && (
                    <div className="p-12 text-center text-zinc-400 italic text-sm">No items added to the table yet.</div>
                  )}
                </div>

                <div className="p-8 bg-zinc-50/50 border-t border-zinc-100 flex flex-col md:flex-row gap-8 justify-between items-start">
                  {/* GST Breakdown Summary */}
                  <div className="bg-white p-6 rounded-2xl border border-zinc-200 w-full max-w-md space-y-4 shadow-sm">
                    <div className="flex justify-between items-center">
                      <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">GST Breakdown Summary</h4>
                      <div className="flex bg-zinc-100 p-1 rounded-lg">
                        <button 
                          type="button"
                          onClick={() => {
                            const totals = calculateTotal(formData.items || [], formData.discountType, formData.discountValue, false, 0);
                            setFormData(prev => ({ ...prev, isGstManual: false, ...totals }));
                          }}
                          className={cn(
                            "px-3 py-1 rounded-md text-[9px] font-bold transition-all",
                            !formData.isGstManual ? "bg-primary text-white shadow-sm" : "text-zinc-500"
                          )}
                        >
                          AUTO (Line-based)
                        </button>
                        <button 
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, isGstManual: true }));
                          }}
                          className={cn(
                            "px-3 py-1 rounded-md text-[9px] font-bold transition-all",
                            formData.isGstManual ? "bg-primary text-white shadow-sm" : "text-zinc-500"
                          )}
                        >
                          MANUAL OVERRIDE
                        </button>
                      </div>
                    </div>
                    
                    <div className="border-t border-zinc-100 pt-4 space-y-2">
                      {!formData.isGstManual ? (
                        <div className="text-[10px] text-zinc-400 italic">
                          {formData.items?.length ? 'GST calculated based on line items.' : 'No GST applied to any line items.'}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-zinc-600">Manual GST Amount</span>
                          <input
                            type="number"
                            value={formData.gstOverride || 0}
                            onChange={e => {
                              const val = parseFloat(e.target.value) || 0;
                              const totals = calculateTotal(formData.items || [], formData.discountType, formData.discountValue, true, val);
                              setFormData(prev => ({ ...prev, gstOverride: val, ...totals }));
                            }}
                            className="w-24 px-2 py-1 bg-zinc-50 rounded border border-zinc-200 text-xs font-bold text-zinc-900 outline-none focus:border-primary"
                          />
                        </div>
                      )}
                      <div className="flex justify-between items-center pt-2 border-t border-zinc-50">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Total Computed GST</span>
                        <span className="text-sm font-bold text-primary">{formatCurrency(formData.gstAmount || 0)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Totals Section */}
                  <div className="w-full max-w-md space-y-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Sub Total</span>
                        <span className="text-2xl font-black text-zinc-900">{formatCurrency(formData.subtotal || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Effective GST</span>
                        <span className="text-lg font-bold text-primary">+ {formatCurrency(formData.gstAmount || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Discount</span>
                        <div className="flex items-center gap-2">
                          <div className="flex bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
                            <button 
                              type="button"
                              onClick={() => {
                                const totals = calculateTotal(formData.items || [], 'fixed', formData.discountValue, formData.isGstManual, formData.gstOverride);
                                setFormData(prev => ({ ...prev, discountType: 'fixed', ...totals }));
                              }}
                              className={cn("p-1.5 rounded-md transition-all", formData.discountType === 'fixed' ? "bg-primary text-white" : "text-zinc-400")}
                            >
                              <IndianRupee className="w-3 h-3" />
                            </button>
                            <button 
                              type="button"
                              onClick={() => {
                                const totals = calculateTotal(formData.items || [], 'percentage', formData.discountValue, formData.isGstManual, formData.gstOverride);
                                setFormData(prev => ({ ...prev, discountType: 'percentage', ...totals }));
                              }}
                              className={cn("p-1.5 rounded-md transition-all", formData.discountType === 'percentage' ? "bg-primary text-white" : "text-zinc-400")}
                            >
                              <span className="text-[10px] font-bold">%</span>
                            </button>
                          </div>
                          <input
                            type="number"
                            value={formData.discountValue || 0}
                            onChange={e => {
                              const val = parseFloat(e.target.value) || 0;
                              const totals = calculateTotal(formData.items || [], formData.discountType, val, formData.isGstManual, formData.gstOverride);
                              setFormData(prev => ({ ...prev, discountValue: val, ...totals }));
                            }}
                            className="w-20 px-3 py-2 bg-zinc-50 rounded-xl border border-zinc-200 text-sm font-bold text-zinc-900 outline-none focus:border-primary text-center"
                          />
                          <span className="text-xs font-bold text-red-500">(- {formatCurrency(formData.discountAmount || 0)})</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-zinc-200 flex justify-between items-center">
                      <span className="text-lg font-black text-zinc-900 uppercase tracking-tighter">Estimate Grand Total</span>
                      <span className="text-5xl font-black text-primary tracking-tighter">{formatCurrency(formData.total || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Quick Add Catalog */}
                <div className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm space-y-6">
                  <div className="flex items-center gap-2 text-primary">
                    <PlusCircle className="w-5 h-5" />
                    <h3 className="font-bold">Quick Add Catalog</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2">
                    {items.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => addItemToEstimate(item)}
                        className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-zinc-100 hover:border-primary hover:bg-primary-light transition-all text-left group"
                      >
                        <div className="space-y-1">
                          <div className="font-bold text-zinc-800 text-xs group-hover:text-primary transition-all">{item.name}</div>
                          <div className="text-[10px] text-zinc-400 font-medium">{formatCurrency(item.price)}</div>
                        </div>
                        <Plus className="w-4 h-4 text-zinc-300 group-hover:text-primary transition-all" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* AI Suggestion Engine */}
                <div className="bg-indigo-900 p-8 rounded-2xl shadow-xl shadow-indigo-900/20 space-y-6 text-white relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-all">
                    <Calculator className="w-32 h-32 rotate-12" />
                  </div>
                  <div className="relative z-10 space-y-6">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-amber-400 rounded-lg">
                        <Save className="w-5 h-5 text-indigo-900" />
                      </div>
                      <h3 className="text-xl font-bold">AI Suggestion Engine</h3>
                    </div>
                    <p className="text-indigo-100 text-sm leading-relaxed">
                      Generate project-specific items based on scope and type with suggested tax rates.
                    </p>
                    <button 
                      type="button"
                      className="w-full bg-white text-indigo-900 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-all shadow-lg"
                    >
                      Analyze Scope & Add Suggestions
                    </button>
                  </div>
                </div>
              </div>

              {/* Terms & Conditions */}
              <div className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-zinc-800">Work Details & Terms</h3>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, terms: [...(prev.terms || []), ''] }))}
                    className="text-primary text-xs font-bold flex items-center gap-1 hover:underline"
                  >
                    <Plus className="w-3 h-3" />
                    Add New Term
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {formData.terms?.map((term, index) => (
                    <div key={index} className="flex gap-3 group items-start">
                      <span className="text-xs font-bold text-zinc-300 mt-2">{index + 1}</span>
                      <div className="flex-1 relative">
                        <textarea
                          value={term}
                          onChange={e => {
                            const newTerms = [...(formData.terms || [])];
                            newTerms[index] = e.target.value;
                            setFormData(prev => ({ ...prev, terms: newTerms }));
                          }}
                          className="w-full px-4 py-2 bg-zinc-50 rounded-xl border border-zinc-100 text-xs text-zinc-600 outline-none focus:border-primary resize-none h-16"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newTerms = [...(formData.terms || [])];
                            newTerms.splice(index, 1);
                            setFormData(prev => ({ ...prev, terms: newTerms }));
                          }}
                          className="absolute top-2 right-2 p-1 text-red-500 opacity-0 group-hover:opacity-100 transition-all bg-white rounded-md shadow-sm"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-8 py-4 rounded-2xl font-bold text-zinc-500 hover:bg-zinc-100 transition-all"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="px-12 py-4 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/20 hover:scale-105 transition-all flex items-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {selectedEstimate ? 'Update Estimate' : 'Save & Generate Estimate'}
                </button>
              </div>
            </form>
          </div>
        )}
        </div>
      </div>
    </div>
  )}

      {/* Hidden PDF Template */}
      <div style={{ position: 'fixed', top: '-9999px', left: '-9999px', zIndex: -100 }}>
        <div ref={pdfRef} data-pdf-content style={{ width: '210mm', padding: '20mm', backgroundColor: '#ffffff', color: '#18181b', fontFamily: 'sans-serif', position: 'relative', minHeight: '297mm' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px solid #fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#fbbf24' }}>
                {company?.logoUrl ? (
                  <img 
                    key={company.logoUrl}
                    src={company.logoUrl} 
                    alt="Logo" 
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                    referrerPolicy="no-referrer" 
                    crossOrigin="anonymous"
                  />
                ) : (
                  <span style={{ fontSize: '32px', fontWeight: 'bold', color: 'black' }}>{company?.name?.[0] || 'P'}</span>
                )}
              </div>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', margin: 0 }}>{company?.name || 'Pixar World Construction Private Limited'}</h1>
                <p style={{ fontSize: '11px', color: '#475569', margin: '2px 0' }}>{company?.address || 'FF-08 Fortune Greens, Vadodara'}</p>
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '9px', color: '#475569', lineHeight: '1.4' }}>
              {company?.cin && <p style={{ margin: 0 }}>CIN : {company.cin}</p>}
              {company?.gst && <p style={{ margin: 0 }}>GST : {company.gst}</p>}
              {company?.phone && <p style={{ margin: 0 }}>Mo: {company.phone}</p>}
              {company?.email && <p style={{ margin: 0 }}>Email: {company.email}</p>}
            </div>
          </div>

          <div style={{ height: '2px', backgroundColor: '#0f172a', marginBottom: '20px' }}></div>

          {/* Title and Date */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #0f172a', padding: '8px 15px', marginBottom: '15px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, textDecoration: 'underline' }}>General Estimate</h2>
            <p style={{ fontSize: '14px', fontWeight: 'bold', margin: 0 }}>Date: {estimateToPrint?.createdAt ? format(toDate(estimateToPrint.createdAt), 'dd/MM/yyyy') : format(new Date(), 'dd/MM/yyyy')}</p>
          </div>

          {/* Customer Details Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '12px' }}>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #0f172a', padding: '6px 10px', fontWeight: 'bold', width: '20%', backgroundColor: '#f8fafc' }}>Customer Name :</td>
                <td style={{ border: '1px solid #0f172a', padding: '6px 10px', width: '45%' }}>{estimateToPrint?.clientName}</td>
                <td style={{ border: '1px solid #0f172a', padding: '6px 10px', fontWeight: 'bold', width: '15%', backgroundColor: '#f8fafc' }}>Mob :</td>
                <td style={{ border: '1px solid #0f172a', padding: '6px 10px', width: '20%' }}>{estimateToPrint?.clientMob1}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #0f172a', padding: '6px 10px', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>Alt Mobile :</td>
                <td style={{ border: '1px solid #0f172a', padding: '6px 10px' }}>{estimateToPrint?.clientMob2 || 'N/A'}</td>
                <td style={{ border: '1px solid #0f172a', padding: '6px 10px', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>PAN No :</td>
                <td style={{ border: '1px solid #0f172a', padding: '6px 10px' }}>{estimateToPrint?.clientPan || 'N/A'}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #0f172a', padding: '6px 10px', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>Site Address :</td>
                <td style={{ border: '1px solid #0f172a', padding: '6px 10px' }}>{estimateToPrint?.siteAddress}</td>
                <td style={{ border: '1px solid #0f172a', padding: '6px 10px', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>EST No :</td>
                <td style={{ border: '1px solid #0f172a', padding: '6px 10px', fontWeight: 'bold' }}>{estimateToPrint?.estimateNumber}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #0f172a', padding: '6px 10px', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>Current Address :</td>
                <td style={{ border: '1px solid #0f172a', padding: '6px 10px' }}>{estimateToPrint?.currentAddress || 'N/A'}</td>
                <td style={{ border: '1px solid #0f172a', padding: '6px 10px', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>Date :</td>
                <td style={{ border: '1px solid #0f172a', padding: '6px 10px' }}>{estimateToPrint?.createdAt ? format(toDate(estimateToPrint.createdAt), 'dd/MM/yyyy') : format(new Date(), 'dd/MM/yyyy')}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #0f172a', padding: '6px 10px', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>Property Type :</td>
                <td style={{ border: '1px solid #0f172a', padding: '6px 10px' }}>{estimateToPrint?.propertyType}</td>
                <td style={{ border: '1px solid #0f172a', padding: '6px 10px', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>Scope of Work :</td>
                <td style={{ border: '1px solid #0f172a', padding: '6px 10px' }}>{estimateToPrint?.scopeOfWork}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #0f172a', padding: '6px 10px', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>Est. Completion :</td>
                <td style={{ border: '1px solid #0f172a', padding: '6px 10px' }}>{estimateToPrint?.completionTime || 'N/A'}</td>
                <td style={{ border: '1px solid #0f172a', padding: '6px 10px', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>Budget :</td>
                <td style={{ border: '1px solid #0f172a', padding: '6px 10px', fontWeight: 'bold' }}>{estimateToPrint?.budget || 'N/A'}</td>
              </tr>
            </tbody>
          </table>

          {/* Items Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '0', fontSize: '12px' }}>
            <thead>
              <tr style={{ textAlign: 'left' }}>
                <th style={{ border: '1px solid #0f172a', padding: '8px 10px', width: '5%' }}>Sr.</th>
                <th style={{ border: '1px solid #0f172a', padding: '8px 10px', width: '35%' }}>Item Name</th>
                <th style={{ border: '1px solid #0f172a', padding: '8px 10px', width: '10%', textAlign: 'center' }}>L x W</th>
                <th style={{ border: '1px solid #0f172a', padding: '8px 10px', width: '10%', textAlign: 'center' }}>Area</th>
                <th style={{ border: '1px solid #0f172a', padding: '8px 10px', width: '8%', textAlign: 'center' }}>Unit</th>
                <th style={{ border: '1px solid #0f172a', padding: '8px 10px', width: '10%', textAlign: 'center' }}>Rate</th>
                <th style={{ border: '1px solid #0f172a', padding: '8px 10px', width: '7%', textAlign: 'center' }}>Qty.</th>
                <th style={{ border: '1px solid #0f172a', padding: '8px 10px', width: '15%', textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {estimateToPrint?.items?.map((item, index) => (
                <tr key={index}>
                  <td style={{ border: '1px solid #0f172a', padding: '8px 10px', textAlign: 'center' }}>{index + 1}</td>
                  <td style={{ border: '1px solid #0f172a', padding: '8px 10px' }}>{item.name}</td>
                  <td style={{ border: '1px solid #0f172a', padding: '8px 10px', textAlign: 'center' }}>
                    {item.length && item.width ? `${item.length} x ${item.width}` : '-'}
                  </td>
                  <td style={{ border: '1px solid #0f172a', padding: '8px 10px', textAlign: 'center' }}>
                    {item.length && item.width ? (item.length * item.width).toFixed(2) : '-'}
                  </td>
                  <td style={{ border: '1px solid #0f172a', padding: '8px 10px', textAlign: 'center' }}>{item.unit}</td>
                  <td style={{ border: '1px solid #0f172a', padding: '8px 10px', textAlign: 'center' }}>{item.price}</td>
                  <td style={{ border: '1px solid #0f172a', padding: '8px 10px', textAlign: 'center' }}>{item.qty}</td>
                  <td style={{ border: '1px solid #0f172a', padding: '8px 10px', textAlign: 'right', fontWeight: 'bold' }}>₹ {item.total?.toLocaleString('en-IN')}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={7} style={{ border: '1px solid #0f172a', padding: '6px 10px', textAlign: 'right', fontWeight: 'bold', fontSize: '10px' }}>SUB TOTAL</td>
                <td style={{ border: '1px solid #0f172a', padding: '6px 10px', textAlign: 'right', fontWeight: 'bold' }}>₹ {estimateToPrint?.subtotal?.toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td colSpan={7} style={{ border: '1px solid #0f172a', padding: '6px 10px', textAlign: 'right', fontWeight: 'bold', fontSize: '10px' }}>GST (ESTIMATED)</td>
                <td style={{ border: '1px solid #0f172a', padding: '6px 10px', textAlign: 'right', fontWeight: 'bold' }}>+ ₹ {estimateToPrint?.gstAmount?.toLocaleString('en-IN')}</td>
              </tr>
              <tr style={{ backgroundColor: '#0f172a', color: 'white' }}>
                <td colSpan={7} style={{ border: '1px solid #0f172a', padding: '10px', textAlign: 'right', fontWeight: 'bold', fontSize: '12px' }}>GRAND TOTAL ESTIMATED</td>
                <td style={{ border: '1px solid #0f172a', padding: '10px', textAlign: 'right', fontWeight: 'bold', fontSize: '16px' }}>₹ {estimateToPrint?.total?.toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>

          {/* Work Details & Terms */}
          <div style={{ marginTop: '30px', border: '1px solid #0f172a' }}>
            <div style={{ backgroundColor: '#0f172a', color: 'white', padding: '6px 15px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase' }}>
              Work Details & Terms
            </div>
            <div style={{ padding: '15px' }}>
              <table style={{ width: '100%', fontSize: '10px', borderCollapse: 'collapse' }}>
                <tbody>
                  {estimateToPrint?.terms?.map((term, index) => (
                    <tr key={index}>
                      <td style={{ width: '20px', fontWeight: 'bold', verticalAlign: 'top', paddingBottom: '5px' }}>{index + 1}</td>
                      <td style={{ paddingBottom: '5px' }}>{term}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer / Signatory */}
          <div style={{ position: 'absolute', bottom: '20mm', left: '20mm', right: '20mm' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div style={{ fontSize: '9px', color: '#94a3b8' }}>
                <p style={{ margin: 0 }}>{company?.website || 'www.pixarworldconstruction.in'}</p>
              </div>
              <div style={{ textAlign: 'center', width: '200px' }}>
                <div style={{ borderTop: '1px solid #0f172a', marginBottom: '5px' }}></div>
                <p style={{ fontSize: '12px', fontWeight: 'bold', margin: 0 }}>Authorized Signatory</p>
              </div>
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

      {/* Quick Reminder Modal */}
      {isReminderModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-[40px] p-8 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Set Follow-up Reminder</h2>
              <button onClick={() => setIsReminderModalOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-all">
                <X className="w-6 h-6 text-zinc-400" />
              </button>
            </div>
            <form onSubmit={handleCreateReminder} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Reminder Title</label>
                <input
                  type="text"
                  required
                  value={reminderFormData.title}
                  onChange={e => setReminderFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="e.g., Call client for approval"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Due Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={reminderFormData.dueDate}
                  onChange={e => setReminderFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsReminderModalOpen(false)}
                  className="flex-1 px-6 py-3 border border-zinc-200 text-zinc-600 font-bold rounded-2xl hover:bg-zinc-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
                >
                  Set Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
