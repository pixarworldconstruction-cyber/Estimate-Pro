import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
}

export function toDate(value: any): Date {
  if (!value) return new Date();
  try {
    // Check if it's already a Date object
    if (value instanceof Date) return value;
    
    // Check if it's a Firestore Timestamp (has toDate method)
    if (value && typeof value === 'object' && typeof value.toDate === 'function') {
      return value.toDate();
    }
    
    // Check if it's a Firestore Timestamp-like object (seconds/nanoseconds)
    if (value && typeof value === 'object' && 'seconds' in value) {
      return new Date(value.seconds * 1000);
    }
    
    // Handle ISO strings or other date strings
    if (typeof value === 'string') {
      const date = new Date(value);
      return isNaN(date.getTime()) ? new Date() : date;
    }
    
    // Handle numbers (timestamps)
    if (typeof value === 'number') {
      return new Date(value);
    }
  } catch (e) {
    console.error("Error converting to date", e);
  }
  return new Date();
}

export function numberToWords(num: number): string {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (isNaN(num)) return '';
  if (num === 0) return 'Zero Only';
  
  const numStr = Math.floor(num).toString();
  if (numStr.length > 9) return 'Amount too large';
  
  const n = ('000000000' + numStr).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  
  let str = '';
  str += (Number(n[1]) !== 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
  str += (Number(n[2]) !== 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
  str += (Number(n[3]) !== 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
  str += (Number(n[4]) !== 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
  str += (Number(n[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'Only' : 'Only';
  
  return str.trim();
}
