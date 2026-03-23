export interface Company {
  id: string;
  name: string;
  logoUrl?: string;
  address?: string;
  email?: string;
  phone?: string;
  gst?: string;
  pan?: string;
  tan?: string;
  themeColor?: string;
  staffLimit?: number;
  ownerSignature?: string;
  createdAt: any;
  status: 'active' | 'suspended' | 'trial' | 'expired';
  planName: string;
  expiryDate: any;
  features: string[];
  adminName?: string;
  adminEmail?: string;
  tempPassword?: string;
}

export interface Staff {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'staff';
  uid: string;
  companyId: string; // Empty for super_admin
  permissions?: string[]; // List of feature IDs they can access
  mobile?: string;
  address?: string;
}

export interface Client {
  id: string;
  companyId: string;
  name: string;
  currentAddress: string;
  siteAddress: string;
  mob1: string;
  mob2?: string;
  projectType: 'Turnkey' | 'Box' | 'Renovation' | 'Interior';
  projectCategory: 'Residential' | 'Commercial' | 'Industrial';
  budget: number;
  details?: string;
}

export interface Item {
  id: string;
  companyId: string;
  name: string;
  price: number;
  gst: number;
}

export interface EstimateItem {
  itemId: string;
  name: string;
  qty: number;
  price: number;
  gst: number;
  length?: number;
  width?: number;
  unit?: string;
}

export interface Estimate {
  id: string;
  companyId: string;
  clientId: string;
  items: EstimateItem[];
  subtotal: number;
  gstAmount: number;
  discountPercentage: number;
  discountAmount: number;
  total: number;
  status: 'pending' | 'approved' | 'rejected' | 'viewed' | 'revision';
  revisions: number;
  terms: string[];
  createdAt: any;
  updatedAt: any;
  createdBy: string;
  createdByName: string;
}

export interface Reminder {
  id: string;
  companyId: string;
  clientId: string;
  title: string;
  status: 'pending' | 'done' | 'renew';
  dueDate: any;
  createdAt: any;
  createdBy: string;
  createdByName: string;
}

export interface CRMHistory {
  id: string;
  companyId: string;
  clientId: string;
  type: 'chat' | 'call' | 'meeting';
  notes: string;
  timestamp: any;
}
