// Core Address and Contact interfaces
export interface Address {
  id: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  isPrimary: boolean;
}

// Customer interfaces
export interface Customer {
  id: string;
  name: string;
  gstin: string;
  contacts?: Contact[];
  billingAddress?: Address;
  shippingAddresses?: Address[];
  primaryContactName?: string;
  primaryContactEmail?: string;
}

export type FormContact = Omit<Contact, 'id'> & { id?: string };
export type FormAddress = Omit<Address, 'id'> & { id?: string };

export type CustomerFormData = {
  id?: string;
  name: string;
  gstin: string;
  contacts: FormContact[];
  billingAddress: FormAddress;
  shippingAddresses: FormAddress[];
};

// Product interfaces
export interface Product {
  id: string;
  name: string;
  description: string;
  unit: string; // e.g., 'pcs', 'kg', 'ltr'
  rate: number;
  hsnCode: string;
}

export type ProductFormData = Omit<Product, 'id'> & { id?: string };

// Vendor interfaces
export interface Vendor {
  id: string;
  name: string;
  gstin: string;
  address: string;
}

export type VendorFormData = Omit<Vendor, 'id'> & { id?: string };

// Document Status enum
export enum DocumentStatus {
  Draft = 'Draft',
  Sent = 'Sent',
  Discussion = 'Discussion',
  Approved = 'Approved',
  Rejected = 'Rejected',
  Closed = 'Closed',
  Partial = 'Partial',
  Dispatched = 'Dispatched',
  Superseded = 'Superseded'
}

// Document Line Item interface
export interface DocumentLineItem {
  id: string;
  productId: string;
  productName: string;
  description: string;
  hsnCode: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxRate: number;
  total: number;
}

// Sales Document interfaces
export interface Quote {
  id: string;
  quoteNumber: string;
  customerId: string;
  customerName: string;
  contactId: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  billingAddress: Address;
  shippingAddress: Address;
  customerGstin: string;
  issueDate: string;
  expiryDate: string;
  lineItems: DocumentLineItem[];
  subTotal: number;
  gstTotal: number;
  total: number;
  terms: string[];
  status: DocumentStatus;
  revisionNumber?: number;
  originalQuoteId?: string;
  linkedSalesOrderId?: string;
  additionalDescription?: string;
  pointOfContactId?: string;
}

export interface SalesOrder {
  id: string;
  orderNumber: string;
  linkedQuoteId: string;
  quoteNumber: string;
  clientPoNumber: string;
  customerId: string;
  customerName: string;
  contactId: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  billingAddress: Address;
  shippingAddress: Address;
  customerGstin: string;
  orderDate: string;
  lineItems: DocumentLineItem[];
  subTotal: number;
  gstTotal: number;
  total: number;
  terms: string[];
  status: DocumentStatus;
  pointOfContactId?: string;
  deliveredQuantities: Record<string, number>;
  additionalDescription?: string;
}

export interface DeliveryOrder {
  id: string;
  deliveryNumber: string;
  salesOrderId: string;
  salesOrderNumber: string;
  customerId: string;
  customerName: string;
  contactId: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  deliveryDate: string;
  billingAddress: Address;
  shippingAddress: Address;
  customerGstin: string;
  lineItems: DocumentLineItem[];
  status: DocumentStatus;
  vehicleNumber?: string;
  additionalDescription?: string;
  pointOfContactId?: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  vendorGstin: string;
  vendorAddress: string;
  orderDate: string;
  deliveryAddress: string;
  lineItems: DocumentLineItem[];
  subTotal: number;
  gstTotal: number;
  total: number;
  status: DocumentStatus;
  additionalDescription?: string;
  pointOfContactId?: string;
}

// Inventory interfaces
export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: 'in' | 'out';
  quantity: number;
  date: string;
  notes: string;
}

export interface InventoryItem {
  productId: string;
  productName: string;
  currentStock: number;
  unit: string;
  lastUpdated: string;
}

// User and Settings interfaces
export enum UserRole {
  Admin = 'Admin',
  Maker = 'Maker',
  Approver = 'Approver',
  Viewer = 'Viewer'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  hasErpAccess: boolean;
  hasPayrollAccess: boolean;
  hasProjectsAccess: boolean;
  themePreferences?: UserThemePreferences;
}

export interface UserThemePreferences {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    success: string;
    warning: string;
    danger: string;
    info: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
  };
  typography: {
    fontSize: 'xs' | 'sm' | 'base' | 'lg' | 'xl';
    fontFamily: string;
    lineHeight: number;
    letterSpacing: number;
  };
  layout: {
    borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'xl';
    spacing: 'tight' | 'normal' | 'relaxed';
    sidebarWidth: string;
    headerHeight: string;
    animation: 'none' | 'reduced' | 'normal' | 'enhanced';
  };
  effects: {
    crtMode: boolean;
    scanlines: boolean;
    glow: boolean;
    flicker: boolean;
    curvature: boolean;
    themeClass: string;
  };
  theme: 'light' | 'dark';
}

export type UserFormData = Omit<User, 'id' | 'password'> & { id?: string; password?: string };

// Company and Settings interfaces
export interface BankDetails {
  name: string;
  branch: string;
  accountNumber: string;
  ifsc: string;
}

export interface EmailSettings {
  emailjsServiceId: string;
  emailjsTemplateId: string;
  emailjsPublicKey: string;
  fromEmail: string;
  notificationEmail: string;
  enableNotifications: boolean;
}

export interface CompanyDetails {
  name: string;
  gstin: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  bankAccount?: string;
  bankDetails?: BankDetails;
  deliveryAddress: string;
  emailSettings?: EmailSettings;
}

export interface PointOfContact {
  id: string;
  name: string;
  designation: string;
  phone: string;
  email: string;
  isDefault: boolean;
  created_at: string;
  updated_at: string;
}

// Payroll interfaces
export enum EmployeeCategory {
  InOffice = 'In-office Employee',
  Factory = 'Factory Worker',
  OnSite = 'On-site Personnel',
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  isDefault: boolean;
}

export interface PayrollEmployee {
  id: string;
  employee_id: string;
  name: string;
  email?: string;
  phone?: string;
  department: string;
  category: EmployeeCategory;
  monthly_ctc: number;
  annual_ctc: number;
  status: 'Active' | 'Inactive';
  created_at?: string;
  bankAccounts?: BankAccount[];
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  user_id: string;
  leave_type: 'sick' | 'casual' | 'earned' | 'maternity' | 'paternity' | 'other';
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
}

export interface AdvanceTransaction {
  date: string;
  type: 'issued' | 'deducted' | 'reverted' | 'topped-up';
  amount: number;
  notes: string;
  related_doc_id?: string;
}

export interface AdvancePayment {
  id: string;
  employee_id: string;
  amount: number;
  balance_amount: number;
  date_given: string;
  status: 'Active' | 'Fully Deducted';
  notes?: string;
  transactions?: AdvanceTransaction[];
}

export interface PayrollRecord {
  id: string;
  employee_id: string;
  payroll_month: string;
  status: 'Draft' | 'Processed' | 'Paid';
  days_present: number;
  overtime_hours?: number;
  overtime_days?: number;
  overtime_details?: string;
  basic_pay: number;
  hra: number;
  special_allowance: number;
  overtime: number;
  gross_pay: number;
  pf: number;
  esi: number;
  pt: number;
  tds: number;
  advance_deduction: number;
  advance_payment_id?: string;
  total_deductions: number;
  net_pay: number;
  employee_name: string;
  employee_code: string;
  category: EmployeeCategory;
  remittance_account?: BankAccount;
}

export interface PayrollSettings {
  id?: string;
  user_id?: string;
  company_name?: string;
  company_address?: string;
  company_logo_url?: string;
  pf_enabled: boolean;
  esi_enabled: boolean;
  pt_enabled: boolean;
  tds_enabled: boolean;
  pf_percentage: number;
  esi_percentage: number;
  pt_amount: number;
  tds_percentage: number;
  tds_annual_limit: number;
  hra_percentage: number;
  special_allowance_percentage: number;
  basic_pay_percentage: number;
}

// Chat interfaces
export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: string;
}

export interface ActiveUser {
  userId: string;
  userName: string;
  lastActive: string;
}

// Mobile-specific interfaces
export interface SyncState {
  lastSyncTime: string;
  isOnline: boolean;
  isSyncing: boolean;
  pendingOperations: number;
}

export interface LocalOperation {
  id: string;
  collection: string;
  operation: 'create' | 'update' | 'delete';
  data: any;
  timestamp: string;
  synced: boolean;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  syncInterval: number; // minutes
  autoSync: boolean;
  offlineMode: boolean;
  notifications: boolean;
}