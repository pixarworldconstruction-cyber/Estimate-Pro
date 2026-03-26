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
