import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Item {
  description: string;
  quantity: number;
  price: number;
}

interface TemplateProps {
  type: 'estimate' | 'invoice';
  companyName: string;
  clientName: string;
  items: Item[];
  total: number;
  status: string;
  date: string;
}

export const ModernTemplate: React.FC<TemplateProps> = ({
  type,
  companyName,
  clientName,
  items,
  total,
  status,
  date,
}) => {
  return (
    <div className="p-8 bg-white shadow-lg max-w-4xl mx-auto font-sans text-gray-800">
      <div className="flex justify-between items-start mb-12">
        <div>
          <h1 className="text-4xl font-bold uppercase tracking-tight text-black">{type}</h1>
          <p className="text-gray-500 mt-1">#{Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-semibold">{companyName}</h2>
          <p className="text-gray-500">{date}</p>
        </div>
      </div>

      <div className="mb-12">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Bill To</p>
        <h3 className="text-lg font-medium">{clientName}</h3>
      </div>

      <table className="w-full mb-12">
        <thead>
          <tr className="border-b-2 border-black">
            <th className="text-left py-4 font-bold uppercase text-xs tracking-widest">Description</th>
            <th className="text-right py-4 font-bold uppercase text-xs tracking-widest">Qty</th>
            <th className="text-right py-4 font-bold uppercase text-xs tracking-widest">Price</th>
            <th className="text-right py-4 font-bold uppercase text-xs tracking-widest">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="border-b border-gray-100">
              <td className="py-4">{item.description}</td>
              <td className="py-4 text-right">{item.quantity}</td>
              <td className="py-4 text-right">${item.price.toFixed(2)}</td>
              <td className="py-4 text-right font-medium">${(item.quantity * item.price).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end">
        <div className="w-64">
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">Subtotal</span>
            <span>${total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-4">
            <span className="text-xl font-bold">Total</span>
            <span className="text-xl font-bold">${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="mt-24 pt-8 border-t border-gray-100 text-center text-gray-400 text-xs">
        <p>Thank you for your business.</p>
        <p className="mt-1">{status.toUpperCase()}</p>
      </div>
    </div>
  );
};

export const ClassicTemplate: React.FC<TemplateProps> = ({
  type,
  companyName,
  clientName,
  items,
  total,
  status,
  date,
}) => {
  return (
    <div className="p-12 bg-[#fdfdfd] shadow-xl max-w-4xl mx-auto border border-gray-200 font-serif text-gray-900">
      <div className="text-center mb-12 border-b-4 border-double border-gray-800 pb-8">
        <h2 className="text-3xl font-bold italic mb-2">{companyName}</h2>
        <div className="flex justify-center gap-8 text-sm text-gray-600 italic">
          <span>Date: {date}</span>
          <span>{type.toUpperCase()}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-12 mb-12">
        <div className="bg-gray-50 p-6 border border-gray-200">
          <h3 className="text-xs font-bold uppercase tracking-widest mb-4 border-b border-gray-300 pb-2">From</h3>
          <p className="font-bold">{companyName}</p>
          <p className="text-sm text-gray-600 italic">Authorized Signature Required</p>
        </div>
        <div className="bg-gray-50 p-6 border border-gray-200">
          <h3 className="text-xs font-bold uppercase tracking-widest mb-4 border-b border-gray-300 pb-2">To</h3>
          <p className="font-bold">{clientName}</p>
        </div>
      </div>

      <div className="border border-gray-800">
        <div className="grid grid-cols-12 bg-gray-800 text-white font-bold text-xs uppercase tracking-widest p-3">
          <div className="col-span-6">Description</div>
          <div className="col-span-2 text-center">Qty</div>
          <div className="col-span-2 text-right">Unit Price</div>
          <div className="col-span-2 text-right">Amount</div>
        </div>
        {items.map((item, i) => (
          <div key={i} className={cn("grid grid-cols-12 p-3 border-b border-gray-200 text-sm", i % 2 === 0 ? "bg-white" : "bg-gray-50")}>
            <div className="col-span-6">{item.description}</div>
            <div className="col-span-2 text-center">{item.quantity}</div>
            <div className="col-span-2 text-right">${item.price.toFixed(2)}</div>
            <div className="col-span-2 text-right font-bold">${(item.quantity * item.price).toFixed(2)}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-end">
        <div className="w-72 border-2 border-gray-800 p-4">
          <div className="flex justify-between mb-2 text-sm">
            <span>Subtotal:</span>
            <span>${total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t border-gray-800 pt-2">
            <span>Grand Total:</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="mt-16 italic text-sm text-gray-600">
        <p>Notes: This {type} is valid for 30 days. Status: {status}</p>
      </div>
    </div>
  );
};
