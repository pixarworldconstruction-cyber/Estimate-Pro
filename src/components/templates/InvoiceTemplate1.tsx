import React from 'react';
import { Company, Invoice } from '../../types';

interface Props {
  company: Company;
  invoice: Invoice;
}

export const InvoiceTemplate1: React.FC<Props> = ({ company, invoice }) => {
  return (
    <div className="p-8 bg-white text-gray-800 font-sans max-w-4xl mx-auto border shadow-sm">
      <div className="flex justify-between items-start border-b pb-8 mb-8">
        <div>
          {company.logoUrl && (
            <img src={company.logoUrl} alt={company.name} className="h-16 mb-4 object-contain" referrerPolicy="no-referrer" />
          )}
          <h1 className="text-2xl font-bold text-primary uppercase tracking-wider">{company.name}</h1>
          <p className="text-sm text-gray-500 max-w-xs">{company.address}</p>
          <p className="text-sm text-gray-500">{company.email} | {company.phone}</p>
          {company.gst && <p className="text-xs font-semibold mt-1">GSTIN: {company.gst}</p>}
        </div>
        <div className="text-right">
          <h2 className="text-4xl font-light text-gray-400 uppercase mb-2">Invoice</h2>
          <div className="space-y-1">
            <p className="text-sm font-semibold">Invoice #: <span className="font-normal">{invoice.invoiceNumber}</span></p>
            <p className="text-sm font-semibold">Date: <span className="font-normal">{new Date(invoice.createdAt?.seconds * 1000).toLocaleDateString()}</span></p>
            <p className="text-sm font-semibold">Due Date: <span className="font-normal">{new Date(invoice.dueDate).toLocaleDateString()}</span></p>
            <p className="text-sm font-semibold">Status: <span className="font-normal uppercase">{invoice.status}</span></p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-12 mb-12">
        <div>
          <h3 className="text-xs font-bold uppercase text-gray-400 mb-3 tracking-widest border-b pb-1">Bill To</h3>
          <p className="font-bold text-lg">{invoice.clientName}</p>
          {/* Add more client info if available in invoice object or fetched */}
        </div>
      </div>

      <table className="w-full mb-8">
        <thead>
          <tr className="bg-gray-50 border-b-2 border-gray-200">
            <th className="py-3 px-4 text-left text-xs font-bold uppercase tracking-wider">Description</th>
            <th className="py-3 px-4 text-right text-xs font-bold uppercase tracking-wider">Qty</th>
            <th className="py-3 px-4 text-right text-xs font-bold uppercase tracking-wider">Rate</th>
            <th className="py-3 px-4 text-right text-xs font-bold uppercase tracking-wider">GST %</th>
            <th className="py-3 px-4 text-right text-xs font-bold uppercase tracking-wider">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {invoice.items.map((item, idx) => (
            <tr key={idx} className="hover:bg-gray-50 transition-colors">
              <td className="py-4 px-4">
                <p className="font-semibold text-sm">{item.name}</p>
              </td>
              <td className="py-4 px-4 text-right text-sm">{item.quantity} {item.unit}</td>
              <td className="py-4 px-4 text-right text-sm">₹{item.price.toLocaleString()}</td>
              <td className="py-4 px-4 text-right text-sm">{item.gstSlab}%</td>
              <td className="py-4 px-4 text-right text-sm font-semibold">₹{item.total.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end mb-12">
        <div className="w-64 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-semibold">₹{invoice.subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">GST Amount</span>
            <span className="font-semibold">₹{invoice.gstTotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between border-t-2 border-primary pt-3">
            <span className="text-lg font-bold uppercase">Total</span>
            <span className="text-lg font-bold text-primary">₹{invoice.total.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {invoice.notes && (
        <div className="mb-12">
          <h3 className="text-xs font-bold uppercase text-gray-400 mb-3 tracking-widest border-b pb-1">Notes</h3>
          <p className="text-xs text-gray-500 whitespace-pre-wrap">{invoice.notes}</p>
        </div>
      )}

      <div className="flex justify-between items-end mt-16 pt-8 border-t border-dashed">
        <div className="text-[10px] text-gray-400 uppercase">
          <p>Generated on {new Date().toLocaleDateString()}</p>
          <p>This is a computer generated document.</p>
        </div>
        <div className="text-center w-48">
          {company.ownerSignature ? (
            <img src={company.ownerSignature} alt="Signature" className="h-12 mx-auto mb-2 object-contain" referrerPolicy="no-referrer" />
          ) : (
            <div className="h-12 border-b border-gray-300 mb-2"></div>
          )}
          <p className="text-xs font-bold uppercase">Authorized Signatory</p>
          <p className="text-[10px] text-gray-500">{company.name}</p>
        </div>
      </div>
    </div>
  );
};
