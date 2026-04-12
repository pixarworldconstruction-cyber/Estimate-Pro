import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  ChevronRight, 
  FileText, 
  IndianRupee, 
  TrendingUp, 
  Clock,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Filter
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { Client, Estimate, Invoice, PaymentReceipt } from '../types';
import { formatCurrency, cn, toDate } from '../lib/utils';
import { format } from 'date-fns';

interface CustomerAccount {
  client: Client;
  estimates: Estimate[];
  invoices: Invoice[];
  receipts: PaymentReceipt[];
  totalInvoiced: number;
  totalReceived: number;
  balance: number;
}

export default function CustomerManager() {
  const { staff, isSuperAdmin } = useAuth();
  const [accounts, setAccounts] = useState<CustomerAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<CustomerAccount | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!staff) return;

    const companyId = staff.companyId;
    
    // Fetch all necessary data
    const clientsQuery = isSuperAdmin ? query(collection(db, 'clients')) : query(collection(db, 'clients'), where('companyId', '==', companyId));
    const estimatesQuery = isSuperAdmin ? query(collection(db, 'estimates')) : query(collection(db, 'estimates'), where('companyId', '==', companyId));
    const invoicesQuery = isSuperAdmin ? query(collection(db, 'invoices')) : query(collection(db, 'invoices'), where('companyId', '==', companyId));
    const receiptsQuery = isSuperAdmin ? query(collection(db, 'paymentReceipts')) : query(collection(db, 'paymentReceipts'), where('companyId', '==', companyId));

    const unsubClients = onSnapshot(clientsQuery, (clientSnap) => {
      const allClients = clientSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
      
      const unsubEstimates = onSnapshot(estimatesQuery, (estSnap) => {
        const allEstimates = estSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Estimate));
        
        const unsubInvoices = onSnapshot(invoicesQuery, (invSnap) => {
          const allInvoices = invSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));
          
          const unsubReceipts = onSnapshot(receiptsQuery, (recSnap) => {
            const allReceipts = recSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaymentReceipt));
            
            // Build accounts
            const customerAccounts: CustomerAccount[] = allClients.map(client => {
              const clientEstimates = allEstimates.filter(e => e.clientId === client.id && e.status === 'approved');
              const clientInvoices = allInvoices.filter(i => i.clientId === client.id);
              const clientReceipts = allReceipts.filter(r => r.clientId === client.id);
              
              const totalInvoiced = clientInvoices.reduce((sum, inv) => sum + inv.total, 0);
              const totalReceived = clientReceipts.reduce((sum, rec) => sum + rec.amount, 0);
              
              return {
                client,
                estimates: clientEstimates,
                invoices: clientInvoices,
                receipts: clientReceipts,
                totalInvoiced,
                totalReceived,
                balance: totalInvoiced - totalReceived
              };
            }).filter(acc => acc.estimates.length > 0 || acc.invoices.length > 0); // Only show those with business

            setAccounts(customerAccounts);
            setIsLoading(false);
          }, (err) => handleFirestoreError(err, OperationType.GET, 'paymentReceipts'));
        }, (err) => handleFirestoreError(err, OperationType.GET, 'invoices'));
      }, (err) => handleFirestoreError(err, OperationType.GET, 'estimates'));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'clients'));

    return () => {
      unsubClients();
    };
  }, [staff, isSuperAdmin]);

  const filteredAccounts = accounts.filter(acc => 
    acc.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acc.client.phone.includes(searchTerm)
  );

  if (selectedAccount) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setSelectedAccount(null)}
            className="px-4 py-2 text-zinc-500 font-bold hover:bg-zinc-100 rounded-xl transition-all"
          >
            ← Back to Customers
          </button>
          <div className="flex gap-2">
            <div className="px-4 py-2 bg-zinc-100 rounded-xl text-sm font-bold text-zinc-600">
              Customer ID: {selectedAccount.client.id.slice(-6).toUpperCase()}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customer Profile Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-8 rounded-[32px] border border-zinc-100 shadow-sm">
              <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-6">
                <Users className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-black text-zinc-900 mb-1">{selectedAccount.client.name}</h2>
              <p className="text-zinc-500 font-medium mb-6">{selectedAccount.client.phone}</p>
              
              <div className="space-y-4">
                <div className="p-4 bg-zinc-50 rounded-2xl">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Site Address</p>
                  <p className="text-sm font-bold text-zinc-700 leading-relaxed">{selectedAccount.client.siteAddress}</p>
                </div>
                <div className="p-4 bg-zinc-50 rounded-2xl">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Project Type</p>
                  <p className="text-sm font-bold text-zinc-700">{selectedAccount.client.projectType} - {selectedAccount.client.projectCategory}</p>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 p-8 rounded-[32px] text-white shadow-xl shadow-zinc-900/20">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Outstanding Balance</p>
              <h3 className="text-4xl font-black mb-6">{formatCurrency(selectedAccount.balance)}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Total Invoiced</p>
                  <p className="text-lg font-bold">{formatCurrency(selectedAccount.totalInvoiced)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Total Paid</p>
                  <p className="text-lg font-bold text-emerald-400">{formatCurrency(selectedAccount.totalReceived)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Transaction History */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-[32px] border border-zinc-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                <h3 className="text-lg font-black text-zinc-900">Account Statement</h3>
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-zinc-100 rounded-full text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                    {selectedAccount.invoices.length + selectedAccount.receipts.length} Transactions
                  </span>
                </div>
              </div>
              
              <div className="divide-y divide-zinc-50">
                {/* Combine and sort transactions */}
                {[
                  ...selectedAccount.invoices.map(inv => ({ ...inv, type: 'invoice' as const })),
                  ...selectedAccount.receipts.map(rec => ({ ...rec, type: 'receipt' as const }))
                ].sort((a, b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime()).map((tx, idx) => (
                  <div key={idx} className="p-6 flex items-center justify-between hover:bg-zinc-50 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center",
                        tx.type === 'invoice' ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"
                      )}>
                        {tx.type === 'invoice' ? <FileText className="w-6 h-6" /> : <IndianRupee className="w-6 h-6" />}
                      </div>
                      <div>
                        <p className="text-sm font-black text-zinc-900">
                          {tx.type === 'invoice' ? `Invoice ${tx.invoiceNumber}` : `Payment Receipt ${tx.receiptNumber}`}
                        </p>
                        <p className="text-xs font-bold text-zinc-400 mt-0.5">
                          {format(toDate(tx.createdAt), 'dd MMM yyyy, hh:mm a')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "text-lg font-black",
                        tx.type === 'invoice' ? "text-zinc-900" : "text-emerald-600"
                      )}>
                        {tx.type === 'invoice' ? `+ ${formatCurrency(tx.total)}` : `- ${formatCurrency(tx.amount)}`}
                      </p>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-0.5">
                        {tx.type === 'invoice' ? 'Debit' : 'Credit'}
                      </p>
                    </div>
                  </div>
                ))}

                {selectedAccount.invoices.length === 0 && selectedAccount.receipts.length === 0 && (
                  <div className="p-20 text-center">
                    <Clock className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
                    <p className="text-zinc-500 font-bold">No transactions found</p>
                  </div>
                )}
              </div>
            </div>

            {/* Approved Estimates */}
            <div className="bg-white rounded-[32px] border border-zinc-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-zinc-100">
                <h3 className="text-lg font-black text-zinc-900">Approved Estimates</h3>
              </div>
              <div className="divide-y divide-zinc-50">
                {selectedAccount.estimates.map((est) => (
                  <div key={est.id} className="p-6 flex items-center justify-between hover:bg-zinc-50 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                        <CheckCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-zinc-900">{est.estimateNumber}</p>
                        <p className="text-xs font-bold text-zinc-400 mt-0.5">{est.scopeOfWork}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-zinc-900">{formatCurrency(est.total)}</p>
                      <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-0.5">Approved</p>
                    </div>
                  </div>
                ))}
                {selectedAccount.estimates.length === 0 && (
                  <div className="p-12 text-center text-zinc-400 font-bold">No approved estimates</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <input 
            type="text"
            placeholder="Search customers by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="px-4 py-3 bg-white border border-zinc-200 rounded-2xl flex items-center gap-2 text-sm font-bold text-zinc-600">
            <Users className="w-4 h-4 text-primary" />
            {accounts.length} Customers
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-[32px] border border-zinc-100 shadow-sm animate-pulse">
              <div className="w-12 h-12 bg-zinc-100 rounded-2xl mb-4"></div>
              <div className="h-6 bg-zinc-100 rounded-lg w-3/4 mb-2"></div>
              <div className="h-4 bg-zinc-100 rounded-lg w-1/2 mb-6"></div>
              <div className="h-10 bg-zinc-100 rounded-2xl"></div>
            </div>
          ))
        ) : (
          filteredAccounts.map((acc) => (
            <div 
              key={acc.client.id}
              onClick={() => setSelectedAccount(acc)}
              className="group bg-white p-6 rounded-[32px] border border-zinc-100 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-500 cursor-pointer relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronRight className="w-6 h-6 text-primary" />
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-zinc-50 rounded-2xl flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <Users className="w-7 h-7 text-zinc-400 group-hover:text-primary transition-colors" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-zinc-900 group-hover:text-primary transition-colors">{acc.client.name}</h3>
                  <p className="text-xs font-bold text-zinc-400">{acc.client.phone}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-3 bg-zinc-50 rounded-2xl">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Invoiced</p>
                  <p className="text-sm font-bold text-zinc-900">{formatCurrency(acc.totalInvoiced)}</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-2xl">
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Paid</p>
                  <p className="text-sm font-bold text-emerald-600">{formatCurrency(acc.totalReceived)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-zinc-50">
                <div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Balance Due</p>
                  <p className={cn(
                    "text-lg font-black",
                    acc.balance > 0 ? "text-red-500" : "text-emerald-500"
                  )}>
                    {formatCurrency(acc.balance)}
                  </p>
                </div>
                <div className="flex -space-x-2">
                  {acc.estimates.length > 0 && (
                    <div className="w-8 h-8 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center" title="Estimates">
                      <FileText className="w-4 h-4 text-blue-600" />
                    </div>
                  )}
                  {acc.invoices.length > 0 && (
                    <div className="w-8 h-8 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center" title="Invoices">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}

        {!isLoading && filteredAccounts.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-[40px] border border-dashed border-zinc-200">
            <div className="w-20 h-20 bg-zinc-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-10 h-10 text-zinc-300" />
            </div>
            <h3 className="text-xl font-black text-zinc-900">No customers yet</h3>
            <p className="text-zinc-500 mt-2">Clients with approved estimates or invoices will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
