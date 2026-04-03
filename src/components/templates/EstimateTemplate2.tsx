import React from 'react';
import { Company, Client, Estimate } from '../../types';

interface Props {
  company: Company;
  estimate: Estimate;
}

export const EstimateTemplate2: React.FC<Props> = ({ company, estimate }) => {
  return (
    <div className="p-12 bg-white text-gray-900 font-serif max-w-4xl mx-auto border-2 border-gray-100 shadow-lg">
      <div className="grid grid-cols-2 gap-8 mb-16">
        <div className="space-y-4">
          {company.logoUrl && (
            <img src={company.logoUrl} alt={company.name} className="h-20 mb-6 object-contain" referrerPolicy="no-referrer" />
          )}
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">{company.name}</h1>
          <div className="text-sm text-gray-600 space-y-1">
            <p>{company.address}</p>
            <p>Email: {company.email}</p>
            <p>Phone: {company.phone}</p>
            {company.gst && <p className="font-semibold text-gray-800 uppercase tracking-widest text-[10px]">GSTIN: {company.gst}</p>}
          </div>
        </div>
        <div className="text-right flex flex-col justify-between">
          <div className="bg-gray-900 text-white p-6 inline-block ml-auto rounded-sm">
            <h2 className="text-2xl font-bold uppercase tracking-widest mb-1">Estimate</h2>
            <p className="text-xs opacity-70">Ref: {estimate.estimateNumber}</p>
          </div>
          <div className="text-sm text-gray-600 space-y-1 mt-8">
            <p className="font-bold text-gray-900 uppercase text-[10px] tracking-widest">Estimate Date</p>
            <p>{new Date(estimate.createdAt?.seconds * 1000).toLocaleDateString()}</p>
            <p className="font-bold text-gray-900 uppercase text-[10px] tracking-widest mt-4">Status</p>
            <p className="uppercase font-semibold text-primary">{estimate.status}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-16 mb-16 border-y border-gray-100 py-10">
        <div>
          <h3 className="text-[10px] font-bold uppercase text-gray-400 mb-4 tracking-widest">Client Details</h3>
          <p className="font-bold text-xl mb-1">{estimate.clientName}</p>
          <p className="text-sm text-gray-600 leading-relaxed">{estimate.currentAddress}</p>
          <p className="text-sm text-gray-600 mt-2">M: {estimate.clientMob1}</p>
        </div>
        <div>
          <h3 className="text-[10px] font-bold uppercase text-gray-400 mb-4 tracking-widest">Project Details</h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <p className="text-[10px] uppercase text-gray-400 font-bold">Site Address</p>
              <p className="text-sm text-gray-600">{estimate.siteAddress}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] uppercase text-gray-400 font-bold">Type</p>
                <p className="text-sm text-gray-600">{estimate.propertyType}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-gray-400 font-bold">Timeline</p>
                <p className="text-sm text-gray-600">{estimate.completionTime}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-12">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-900">
              <th className="py-4 text-left text-[10px] font-bold uppercase tracking-widest">Item Description</th>
              <th className="py-4 text-right text-[10px] font-bold uppercase tracking-widest">Quantity</th>
              <th className="py-4 text-right text-[10px] font-bold uppercase tracking-widest">Rate</th>
              <th className="py-4 text-right text-[10px] font-bold uppercase tracking-widest">GST</th>
              <th className="py-4 text-right text-[10px] font-bold uppercase tracking-widest">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {estimate.items.map((item, idx) => (
              <tr key={idx}>
                <td className="py-6 pr-4">
                  <p className="font-bold text-gray-900">{item.name}</p>
                </td>
                <td className="py-6 text-right text-sm text-gray-600">{item.qty} {item.unit}</td>
                <td className="py-6 text-right text-sm text-gray-600">₹{item.price.toLocaleString()}</td>
                <td className="py-6 text-right text-sm text-gray-600">{item.gst}%</td>
                <td className="py-6 text-right font-bold text-gray-900">₹{item.total.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end mb-16">
        <div className="w-80 bg-gray-50 p-8 rounded-sm space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 uppercase tracking-widest text-[10px] font-bold">Subtotal</span>
            <span className="font-bold">₹{estimate.subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 uppercase tracking-widest text-[10px] font-bold">GST Total</span>
            <span className="font-bold">₹{estimate.gstAmount.toLocaleString()}</span>
          </div>
          {estimate.discountAmount > 0 && (
            <div className="flex justify-between text-sm text-red-600">
              <span className="uppercase tracking-widest text-[10px] font-bold">Discount</span>
              <span className="font-bold">-₹{estimate.discountAmount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-gray-200 pt-4 mt-4">
            <span className="text-sm font-bold uppercase tracking-widest">Grand Total</span>
            <span className="text-2xl font-bold text-gray-900">₹{estimate.total.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-16">
        {estimate.terms && estimate.terms.length > 0 && (
          <div>
            <h3 className="text-[10px] font-bold uppercase text-gray-400 mb-4 tracking-widest">Terms & Conditions</h3>
            <ul className="text-[10px] text-gray-500 space-y-2 leading-relaxed">
              {estimate.terms.map((term, idx) => (
                <li key={idx} className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>{term}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex flex-col justify-end items-center">
          <div className="w-full max-w-[200px] text-center">
            {company.ownerSignature ? (
              <img src={company.ownerSignature} alt="Signature" className="h-16 mx-auto mb-4 object-contain" referrerPolicy="no-referrer" />
            ) : (
              <div className="h-16 border-b-2 border-gray-900 mb-4"></div>
            )}
            <p className="text-[10px] font-bold uppercase tracking-widest">Authorized Signature</p>
            <p className="text-[9px] text-gray-400 mt-1 italic">For {company.name}</p>
          </div>
        </div>
      </div>
      
      <div className="mt-20 pt-8 border-t border-gray-100 text-center">
        <p className="text-[9px] text-gray-400 uppercase tracking-[0.2em]">Thank you for your business</p>
      </div>
    </div>
  );
};
