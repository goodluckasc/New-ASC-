import { Timestamp } from 'firebase/firestore';

export type DateType = Timestamp | string | Date;

export const UserRole = {
  Admin: 'Admin',
  Manager: 'Manager',
  ServiceAdvisor: 'ServiceAdvisor',
  Accounts: 'Accounts',
  StoreKeeper: 'StoreKeeper',
  Technician: 'Technician',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export interface User {
  id: string;
  displayName: string;
  email: string;
  phone?: string;
  role: UserRole;
  photoURL?: string;
  isActive: boolean;
  createdAt: DateType;
  updatedAt?: DateType;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, displayName: string, role: UserRole) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  alternativeMobile?: string;
  email?: string;
  address?: string;
  nationalId?: string;
  notes?: string;
  createdAt: DateType;
  updatedAt: DateType;
  vehicleCount?: number;
}

export interface Vehicle {
  id: string;
  customerId: string;
  registrationNumber: string;
  chassisNumber?: string;
  engineNumber?: string;
  brand: string;
  model: string;
  variant?: string;
  color?: string;
  fuelType?: string;
  purchaseDate?: DateType;
  warrantyStatus?: string;
  currentOdometer?: number;
  lastServiceDate?: DateType;
  nextServiceDueDate?: DateType;
  dcNo?: string;
  dcDate?: DateType;
  createdAt: DateType;
}

export interface LabourItem {
  id: string;
  labourName: string;
  description?: string;
  quantity: number;
  rate: number;
  discount: number;
  amount: number;
}

export interface PartItem {
  id: string;
  itemId?: string;
  itemName: string;
  partNumber?: string;
  quantity: number;
  sellingPrice: number;
  discount: number;
  total: number;
}

export type JobCardPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type JobCardStatus = 'Open' | 'Waiting Parts' | 'In Progress' | 'Ready' | 'Delivered' | 'Cancelled';

export interface JobCard {
  id: string;
  jobCardNumber: string;
  date: DateType;
  customerId: string;
  customerName: string;
  vehicleId: string;
  vehicleRegNo: string;
  odometerReading: number;
  complaintDescription: string;
  inspectionNotes?: string;
  estimatedDelivery?: DateType;
  assignedTechnician?: string;
  priority: JobCardPriority;
  status: JobCardStatus;
  labourItems: LabourItem[];
  partsItems: PartItem[];
  notes?: string;
  attachments?: string[];
  photos?: string[];
  totalLabour: number;
  totalParts: number;
  grandTotal: number;
  createdAt: DateType;
  updatedAt: DateType;
}

export interface InventoryItem {
  id: string;
  itemCode: string;
  barcode?: string;
  qrCode?: string;
  partNumber?: string;
  partName: string;
  category?: string;
  brand?: string;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  minimumStock: number;
  currentStock: number;
  availableStock: number;
  reservedStock: number;
  issuedStock: number;
  rackLocation?: string;
  supplier?: string;
  supplierId?: string;
  createdAt: DateType;
  updatedAt: DateType;
}

export interface PaymentHistory {
  date: DateType;
  amount: number;
  method: string;
  reference?: string;
}

export interface Supplier {
  id: string;
  name: string;
  mobile: string;
  address?: string;
  email?: string;
  previousBalance: number;
  currentDue: number;
  paymentHistory: PaymentHistory[];
  createdAt: DateType;
}

export interface PurchaseItem {
  id: string;
  itemId: string;
  itemName: string;
  partNumber?: string;
  quantity: number;
  unitCost: number;
}

export interface Purchase {
  id: string;
  purchaseNumber: string;
  date: DateType;
  supplierId: string;
  supplierName: string;
  invoiceNumber?: string;
  items: PurchaseItem[];
  subtotal: number;
  discount: number;
  vat: number;
  total: number;
  paid: number;
  due: number;
  createdAt: DateType;
}

export type InvoiceStatus = 'Paid' | 'Partial' | 'Unpaid';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  jobCardId: string;
  jobCardNumber: string;
  customerId: string;
  customerName: string;
  vehicleDetails?: string;
  companyDetails?: string;
  labourItems: LabourItem[];
  partsItems: PartItem[];
  discount: number;
  vat: number;
  subtotal: number;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  status: InvoiceStatus;
  createdAt: DateType;
}

export type PaymentMethod = 'Cash' | 'Card' | 'Bank' | 'Mobile Banking';

export interface Payment {
  id: string;
  invoiceId: string;
  jobCardId?: string;
  amount: number;
  method: PaymentMethod;
  date: DateType;
  reference?: string;
  notes?: string;
  createdAt: DateType;
}

export interface Delivery {
  id: string;
  jobCardId: string;
  jobCardNumber: string;
  vehicleId: string;
  deliveryDate: DateType;
  odometerOut?: number;
  notes?: string;
  createdAt: DateType;
}

export type CallStatus =
  | 'Pending'
  | 'Called'
  | 'Busy'
  | 'No Answer'
  | 'Customer Coming'
  | 'Follow-up Required'
  | 'Completed'
  | 'Not Interested';

export interface Call {
  id: string;
  customerId: string;
  customerName: string;
  mobile: string;
  vehicleId?: string;
  vehicleRegNo?: string;
  lastServiceDate?: DateType;
  daysSinceService?: number;
  status: CallStatus;
  notes?: string;
  createdAt: DateType;
  updatedAt: DateType;
}

export interface FollowUp {
  id: string;
  customerId: string;
  customerName: string;
  mobile: string;
  vehicleId?: string;
  vehicleRegNo?: string;
  date: DateType;
  time?: string;
  notes?: string;
  nextFollowUpDate?: DateType;
  status: 'Pending' | 'Completed' | 'Cancelled';
  callId?: string;
  createdAt: DateType;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: DateType;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  description: string;
  timestamp: DateType;
}

export type StockAdjustmentType = 'Damage' | 'Lost' | 'Manual' | 'Expired';

export interface StockAdjustment {
  id: string;
  itemId: string;
  itemName: string;
  type: StockAdjustmentType;
  quantity: number;
  reason?: string;
  createdAt: DateType;
}

export interface DashboardStats {
  totalCustomers: number;
  totalVehicles: number;
  vehiclesInsideWorkshop: number;
  openJobCards: number;
  completedJobs: number;
  deliveredVehicles: number;
  todaysService: number;
  todaysDelivery: number;
  todaysCollection: number;
  labourIncome: number;
  partsSales: number;
  pendingBills: number;
  duePayments: number;
  lowStockItems: number;
  vehiclesDueForService: number;
  todaysFollowups: number;
}

export interface Permission {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

export type Permissions = {
  [module in
    | 'dashboard'
    | 'customers'
    | 'vehicles'
    | 'jobCards'
    | 'inventory'
    | 'suppliers'
    | 'purchases'
    | 'invoices'
    | 'payments'
    | 'deliveries'
    | 'calls'
    | 'followUps'
    | 'notifications'
    | 'activityLogs'
    | 'stockAdjustments'
    | 'users'
    | 'settings'
    | 'reports']: Permission;
};
