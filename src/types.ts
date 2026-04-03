export interface Company {
  id: string;
  name: string;
  logoUrl?: string;
  address?: string;
  email?: string;
  phone?: string;
  gst?: string;
  cin?: string;
  pan?: string;
  tan?: string;
  tin?: string;
  themeColor?: string;
  staffLimit?: number;
  estimateLimit?: number; // Max number of estimates allowed
  editTimeLimit?: number; // Max days allowed to edit an estimate
  ownerSignature?: string;
  createdAt: any;
  status: 'active' | 'suspended' | 'trial' | 'expired';
  planName: string;
  expiryDate: any;
  features: string[];
  featureTrials?: { [featureId: string]: any }; // Expiry dates for specific features
  adminName?: string;
  adminEmail?: string;
  tempPassword?: string;
  referralCode?: string; // Their own code
  referredBy?: string; // The code they used to sign up
  referralCount?: number; // How many companies they referred
  showWelcome?: boolean;
  subscriptionStatus?: 'active' | 'past_due' | 'unpaid' | 'canceled' | 'trialing';
  currentPeriodEnd?: any;
  paymentMethod?: 'card' | 'upi';
  gstEnabled?: boolean;
  usedEstimates?: number;
  website?: string;
  estimateTemplate?: string;
  invoiceTemplate?: string;
  estimatePrefix?: string;
  estimateNextNumber?: number;
  invoicePrefix?: string;
  invoiceNextNumber?: number;
}

export interface PricingPackage {
  id: string;
  name: string;
  price: number;
  originalPrice?: number; // Crossed out price
  period: 'monthly' | 'yearly' | 'one-time';
  features: string[];
  popular?: boolean;
  type: 'subscription' | 'addon';
  estimateLimit?: number;
  staffLimit?: number;
  description?: string;
}

export interface PaymentSettings {
  razorpayKeyId: string;
  razorpayKeySecret: string;
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
  tempPassword?: string;
  position?: 'Accountant' | 'Manager' | 'Marketing Executive' | 'Sales Executive' | 'Site Engineer' | 'Site Supervisor' | 'Civil Engineer' | 'Custom' | string;
}

export interface Client {
  id: string;
  companyId: string;
  name: string;
  email: string;
  phone: string;
  currentAddress: string;
  siteAddress: string;
  mob1: string;
  mob2?: string;
  pan?: string;
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
  unit: string;
  gstSlab: 0 | 5 | 12 | 18 | 28;
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
  total: number;
}

export interface Estimate {
  id: string;
  companyId: string;
  clientId: string;
  // Snapshot of client info at time of creation
  clientName: string;
  clientMob1: string;
  clientMob2?: string;
  clientPan?: string;
  siteAddress: string;
  currentAddress: string;
  propertyType: string;
  scopeOfWork: string;
  completionTime: string;
  budget: string;
  
  items: EstimateItem[];
  subtotal: number;
  gstAmount: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discountAmount: number;
  total: number;
  status: 'pending' | 'approved' | 'rejected' | 'viewed' | 'revision';
  revisions: number;
  terms: string[];
  createdAt: any;
  updatedAt: any;
  createdBy: string;
  createdByName: string;
  estimateNumber: string;
  gstOverride?: number;
  isGstManual?: boolean;
}

export interface InvoiceItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  unit: string;
  gstSlab: number;
  total: number;
  length?: number;
  width?: number;
}

export interface Invoice {
  id: string;
  companyId: string;
  clientId: string;
  clientName: string;
  items: InvoiceItem[];
  subtotal: number;
  gstTotal: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  dueDate: string;
  createdAt: any;
  updatedAt: any;
  invoiceNumber: string;
  notes?: string;
  estimateId?: string;
}

export interface Project {
  id: string;
  companyId: string;
  clientId: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'on-hold' | 'cancelled';
  startDate: string;
  location: string;
  assignedStaffIds: string[];
  createdAt: any;
  updatedAt: any;
}

export interface DailyReport {
  id: string;
  projectId: string;
  staffId: string;
  staffName: string;
  date: string;
  todayWork: string;
  workCompleted: string;
  workProcess: string;
  notes?: string;
  createdAt: any;
  photos?: string[];
  laborCount?: number;
  laborDetails?: string;
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

export interface LandingPageContent {
  hero: {
    title: string;
    subtitle: string;
    ctaText: string;
    imageUrl: string;
  };
  about: {
    title: string;
    subtitle: string;
    features: { icon: string; title: string; desc: string }[];
  };
  packages: {
    title: string;
    subtitle: string;
    plans: { name: string; price: string; period: string; features: string[]; popular?: boolean }[];
  };
  contact: {
    title: string;
    subtitle: string;
    email: string;
    phone: string;
    address: string;
  };
  privacyPolicy: string;
  termsAndConditions: string;
}

export interface SupportContent {
  name: string;
  email: string;
  phone: string;
  availability: string;
  note: string;
}
