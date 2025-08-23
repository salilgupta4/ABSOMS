# API Reference & Component Documentation

## 📋 Overview

This document provides comprehensive documentation for the ABS OMS API services, React components, hooks, and utilities. The application follows a service-oriented architecture with Firebase as the backend.

## 🔥 Firebase Services API

### Authentication Service

#### `authService.ts`

```typescript
// Sign in user
const signIn = async (email: string, password: string): Promise<User> => {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
};

// Sign up new user
const signUp = async (email: string, password: string, userData: Partial<User>): Promise<User> => {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await createUserProfile(credential.user.uid, userData);
  return credential.user;
};

// Sign out current user
const signOut = async (): Promise<void> => {
  await auth.signOut();
};

// Get current user profile
const getCurrentUserProfile = async (): Promise<UserProfile | null> => {
  const user = auth.currentUser;
  if (!user) return null;
  
  const doc = await getDoc(doc(db, 'users', user.uid));
  return doc.exists() ? { id: doc.id, ...doc.data() } as UserProfile : null;
};
```

### Sales Service

#### `salesService.ts`

```typescript
// Quotes Management
export const getQuotes = async (): Promise<Quote[]> => {
  const quotesRef = collection(db, 'quotes');
  const q = query(quotesRef, orderBy('issueDate', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quote));
};

export const createQuote = async (quote: Partial<Quote>): Promise<Quote> => {
  const quoteNumber = await generateQuoteNumber();
  const newQuote = {
    ...quote,
    quoteNumber,
    status: DocumentStatus.Draft,
    issueDate: new Date().toISOString(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  
  const docRef = await addDoc(collection(db, 'quotes'), newQuote);
  return { id: docRef.id, ...newQuote } as Quote;
};

export const updateQuote = async (id: string, updates: Partial<Quote>): Promise<void> => {
  const quoteRef = doc(db, 'quotes', id);
  await updateDoc(quoteRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
};

export const deleteQuote = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'quotes', id));
};

// Sales Orders Management
export const getSalesOrders = async (): Promise<SalesOrder[]> => {
  const ordersRef = collection(db, 'sales_orders');
  const q = query(ordersRef, orderBy('orderDate', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SalesOrder));
};

export const convertQuoteToSalesOrder = async (quoteId: string): Promise<SalesOrder> => {
  const quote = await getQuote(quoteId);
  if (!quote) throw new Error('Quote not found');
  
  const salesOrder: Partial<SalesOrder> = {
    ...quote,
    orderNumber: await generateSalesOrderNumber(),
    orderDate: new Date().toISOString(),
    status: DocumentStatus.Approved,
    deliveredQuantities: {},
    createdAt: serverTimestamp()
  };
  
  delete salesOrder.id;
  delete salesOrder.quoteNumber;
  
  const docRef = await addDoc(collection(db, 'sales_orders'), salesOrder);
  
  // Update quote status
  await updateQuote(quoteId, { status: DocumentStatus.Closed });
  
  return { id: docRef.id, ...salesOrder } as SalesOrder;
};
```

### Inventory Service

#### `inventoryService.ts`

```typescript
// Get current inventory
export const getInventory = async (): Promise<InventoryItem[]> => {
  const inventoryRef = collection(db, 'inventory');
  const snapshot = await getDocs(inventoryRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));
};

// Update stock levels
export const updateStock = async (
  productId: string, 
  quantity: number, 
  type: 'in' | 'out' | 'adjustment',
  reason: string,
  referenceDocument?: string
): Promise<void> => {
  const batch = writeBatch(db);
  
  // Get current stock
  const inventoryRef = doc(db, 'inventory', productId);
  const inventoryDoc = await getDoc(inventoryRef);
  const currentStock = inventoryDoc.exists() ? inventoryDoc.data().currentStock : 0;
  
  // Calculate new stock
  let newStock: number;
  switch (type) {
    case 'in':
      newStock = currentStock + quantity;
      break;
    case 'out':
      newStock = currentStock - quantity;
      break;
    case 'adjustment':
      newStock = quantity;
      break;
    default:
      throw new Error('Invalid stock movement type');
  }
  
  // Update inventory
  batch.set(inventoryRef, {
    productId,
    currentStock: newStock,
    lastUpdated: serverTimestamp()
  }, { merge: true });
  
  // Create stock movement record
  const movementRef = doc(collection(db, 'stock_movements'));
  batch.set(movementRef, {
    productId,
    type,
    quantity,
    previousStock: currentStock,
    newStock,
    reason,
    referenceDocument,
    createdAt: serverTimestamp()
  });
  
  await batch.commit();
};

// Get stock history
export const getStockHistory = async (productId: string): Promise<StockMovement[]> => {
  const movementsRef = collection(db, 'stock_movements');
  const q = query(
    movementsRef,
    where('productId', '==', productId),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockMovement));
};
```

### Payroll Service

#### `payrollService.ts`

```typescript
// Employee Management
export const getPayrollEmployees = async (): Promise<PayrollEmployee[]> => {
  const employeesRef = collection(db, 'payroll_employees');
  const q = query(employeesRef, where('isActive', '==', true), orderBy('name'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PayrollEmployee));
};

export const createEmployee = async (employee: Partial<PayrollEmployee>): Promise<PayrollEmployee> => {
  const employeeId = await generateEmployeeId();
  const newEmployee = {
    ...employee,
    employeeId,
    isActive: true,
    createdAt: serverTimestamp()
  };
  
  const docRef = await addDoc(collection(db, 'payroll_employees'), newEmployee);
  return { id: docRef.id, ...newEmployee } as PayrollEmployee;
};

// Payroll Processing
export const processPayroll = async (
  month: number, 
  year: number, 
  employeeIds?: string[]
): Promise<PayrollRecord[]> => {
  const employees = await getPayrollEmployees();
  const targetEmployees = employeeIds 
    ? employees.filter(emp => employeeIds.includes(emp.id))
    : employees;
  
  const payrollRecords: PayrollRecord[] = [];
  const batch = writeBatch(db);
  
  for (const employee of targetEmployees) {
    const record = await calculatePayroll(employee, month, year);
    const recordRef = doc(collection(db, 'payroll_records'));
    
    batch.set(recordRef, {
      ...record,
      processedAt: serverTimestamp(),
      processedBy: auth.currentUser?.uid
    });
    
    payrollRecords.push({ id: recordRef.id, ...record } as PayrollRecord);
  }
  
  await batch.commit();
  return payrollRecords;
};

// Calculate individual payroll
const calculatePayroll = async (
  employee: PayrollEmployee, 
  month: number, 
  year: number
): Promise<Partial<PayrollRecord>> => {
  const settings = await getPayrollSettings();
  const advances = await getEmployeeAdvances(employee.id, month, year);
  const leaves = await getEmployeeLeaves(employee.id, month, year);
  
  // Basic calculations
  const workingDays = getWorkingDaysInMonth(month, year);
  const actualDays = workingDays - leaves.totalDays;
  const dailySalary = employee.salary.basic / workingDays;
  
  // Earnings
  const basic = (dailySalary * actualDays);
  const hra = basic * (settings.hraPercentage / 100);
  const allowances = employee.salary.allowances;
  const grossSalary = basic + hra + allowances;
  
  // Deductions
  const pf = basic * (settings.pfPercentage / 100);
  const esi = grossSalary * (settings.esiPercentage / 100);
  const tds = calculateTDS(grossSalary * 12) / 12; // Annual TDS divided by 12
  const advanceDeduction = advances.reduce((sum, adv) => sum + adv.amount, 0);
  
  const totalDeductions = pf + esi + tds + advanceDeduction;
  const netPay = grossSalary - totalDeductions;
  
  return {
    employeeId: employee.id,
    month,
    year,
    earnings: {
      basic,
      hra,
      allowances,
      overtime: 0,
      bonus: 0
    },
    deductions: {
      pf,
      esi,
      tds,
      advance: advanceDeduction,
      other: 0
    },
    netPay,
    workingDays,
    actualDays,
    leaveDays: leaves.totalDays,
    status: 'draft'
  };
};
```

## 🎯 React Components API

### Core UI Components

#### Button Component

```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  to?: string; // For navigation
  onClick?: () => void;
  children: React.ReactNode;
}

// Usage
<Button 
  variant="primary" 
  size="md" 
  icon={<Plus size={16} />}
  onClick={handleCreate}
>
  Create Quote
</Button>

<Button 
  to="/sales/quotes" 
  variant="secondary"
>
  View All Quotes
</Button>
```

#### Card Component

```typescript
interface CardProps {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}

// Usage
<Card 
  title="Recent Quotes" 
  icon={<FileText size={20} />}
  actions={<Button to="/sales/quotes/new">New Quote</Button>}
>
  <QuoteList quotes={recentQuotes} />
</Card>
```

#### SearchableInput Component

```typescript
interface SearchableInputProps<T> {
  searchInputRef: React.RefObject<HTMLInputElement>;
  searchTerm: string;
  placeholder: string;
  filteredItems: T[];
  selectedIndex: number;
  showResults: boolean;
  onInputChange: (value: string) => void;
  onInputFocus: () => void;
  onItemSelect: (item: T, index: number) => void;
  renderItem: (item: T, index: number, isSelected: boolean) => React.ReactNode;
  className?: string;
  maxResults?: number;
}

// Usage
<SearchableInput
  searchInputRef={searchInputRef}
  searchTerm={searchTerm}
  placeholder="Search customers..."
  filteredItems={filteredCustomers}
  selectedIndex={selectedIndex}
  showResults={showResults}
  onInputChange={handleInputChange}
  onInputFocus={handleInputFocus}
  onItemSelect={selectCustomer}
  renderItem={(customer, index, isSelected) => (
    <div className={isSelected ? 'bg-blue-500 text-white' : ''}>
      {customer.name} - {customer.email}
    </div>
  )}
  className="w-full md:w-1/2"
/>
```

### Business Components

#### QuoteForm Component

```typescript
interface QuoteFormProps {
  initialData?: Partial<Quote>;
  mode: 'create' | 'edit';
  onSave: (quote: Quote) => void;
  onCancel: () => void;
}

// Usage
<QuoteForm
  mode="create"
  onSave={handleSaveQuote}
  onCancel={() => navigate('/sales/quotes')}
/>

<QuoteForm
  initialData={existingQuote}
  mode="edit"
  onSave={handleUpdateQuote}
  onCancel={() => navigate(`/sales/quotes/${quoteId}/view`)}
/>
```

#### PendingItemsTVMode Component

```typescript
interface PendingItemsTVModeProps {
  refreshInterval?: number; // in seconds, default 30
  itemsPerPage?: number; // default 9
  autoNavigate?: boolean; // default true
}

// Usage
<PendingItemsTVMode 
  refreshInterval={60}
  itemsPerPage={12}
  autoNavigate={true}
/>
```

#### InventoryList Component

```typescript
interface InventoryListProps {
  filters?: InventoryFilters;
  onStockAdjustment?: (productId: string, adjustment: StockAdjustment) => void;
  onProductEdit?: (productId: string) => void;
  showActions?: boolean;
}

// Usage
<InventoryList
  filters={{ lowStock: true, category: 'electronics' }}
  onStockAdjustment={handleStockAdjustment}
  onProductEdit={handleProductEdit}
  showActions={canEdit}
/>
```

### Form Components

#### CustomerForm Component

```typescript
interface CustomerFormProps {
  initialData?: Partial<Customer>;
  onSubmit: (customer: Customer) => Promise<void>;
  onCancel: () => void;
  mode: 'create' | 'edit';
}

// Usage
const CustomerFormPage = () => {
  const navigate = useNavigate();
  const { customerId } = useParams();
  
  const handleSubmit = async (customerData: Customer) => {
    if (customerId) {
      await updateCustomer(customerId, customerData);
    } else {
      await createCustomer(customerData);
    }
    navigate('/customers');
  };
  
  return (
    <CustomerForm
      initialData={existingCustomer}
      onSubmit={handleSubmit}
      onCancel={() => navigate('/customers')}
      mode={customerId ? 'edit' : 'create'}
    />
  );
};
```

## 🎣 Custom Hooks API

### Data Fetching Hooks

#### useQuotes Hook

```typescript
interface UseQuotesOptions {
  filters?: QuoteFilters;
  realtime?: boolean;
}

interface UseQuotesReturn {
  quotes: Quote[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  createQuote: (quote: Partial<Quote>) => Promise<Quote>;
  updateQuote: (id: string, updates: Partial<Quote>) => Promise<void>;
  deleteQuote: (id: string) => Promise<void>;
}

const useQuotes = (options?: UseQuotesOptions): UseQuotesReturn => {
  // Implementation
};

// Usage
const QuoteListPage = () => {
  const { 
    quotes, 
    loading, 
    error, 
    createQuote, 
    deleteQuote 
  } = useQuotes({ 
    filters: { status: 'draft' }, 
    realtime: true 
  });
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  
  return (
    <div>
      {quotes.map(quote => (
        <QuoteCard 
          key={quote.id} 
          quote={quote} 
          onDelete={() => deleteQuote(quote.id)}
        />
      ))}
    </div>
  );
};
```

#### useInventory Hook

```typescript
interface UseInventoryOptions {
  lowStockOnly?: boolean;
  category?: string;
  realtime?: boolean;
}

interface UseInventoryReturn {
  inventory: InventoryItem[];
  lowStockItems: InventoryItem[];
  loading: boolean;
  error: string | null;
  updateStock: (productId: string, quantity: number, type: StockMovementType) => Promise<void>;
  getStockHistory: (productId: string) => Promise<StockMovement[]>;
}

// Usage
const InventoryPage = () => {
  const { 
    inventory, 
    lowStockItems, 
    loading, 
    updateStock 
  } = useInventory({ realtime: true });
  
  const handleStockAdjustment = async (productId: string, newStock: number) => {
    await updateStock(productId, newStock, 'adjustment');
  };
  
  return (
    <div>
      <LowStockAlert items={lowStockItems} />
      <InventoryTable 
        items={inventory} 
        onStockUpdate={handleStockAdjustment}
      />
    </div>
  );
};
```

### UI Interaction Hooks

#### useKeyboardShortcuts Hook

```typescript
interface ShortcutMap {
  [key: string]: () => void;
}

const useKeyboardShortcuts = (shortcuts: ShortcutMap) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = `${event.ctrlKey ? 'ctrl+' : ''}${event.key.toLowerCase()}`;
      const handler = shortcuts[key];
      
      if (handler) {
        event.preventDefault();
        handler();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
};

// Usage
const QuoteListPage = () => {
  const navigate = useNavigate();
  
  useKeyboardShortcuts({
    'ctrl+n': () => navigate('/sales/quotes/new'),
    'ctrl+f': () => document.getElementById('search')?.focus(),
    'escape': () => setSelectedQuote(null)
  });
  
  return <QuoteList />;
};
```

#### useSearchableList Hook

```typescript
interface UseSearchableListOptions<T> {
  items: T[];
  searchFields: (keyof T)[];
  onItemSelect?: (item: T) => void;
  maxResults?: number;
}

interface UseSearchableListReturn<T> {
  searchTerm: string;
  filteredItems: T[];
  selectedIndex: number;
  showResults: boolean;
  searchInputRef: React.RefObject<HTMLInputElement>;
  handleInputChange: (value: string) => void;
  handleInputFocus: () => void;
  selectItem: (item: T, index: number) => void;
  handleKeyDown: (event: KeyboardEvent) => void;
}

// Usage
const CustomerSelector = ({ onSelect }: { onSelect: (customer: Customer) => void }) => {
  const { customers } = useCustomers();
  
  const {
    searchTerm,
    filteredItems,
    selectedIndex,
    showResults,
    searchInputRef,
    handleInputChange,
    handleInputFocus,
    selectItem
  } = useSearchableList({
    items: customers,
    searchFields: ['name', 'email', 'phone'],
    onItemSelect: onSelect,
    maxResults: 10
  });
  
  return (
    <SearchableInput
      searchInputRef={searchInputRef}
      searchTerm={searchTerm}
      placeholder="Search customers..."
      filteredItems={filteredItems}
      selectedIndex={selectedIndex}
      showResults={showResults}
      onInputChange={handleInputChange}
      onInputFocus={handleInputFocus}
      onItemSelect={selectItem}
      renderItem={(customer) => (
        <div>
          <div className="font-semibold">{customer.name}</div>
          <div className="text-sm text-gray-600">{customer.email}</div>
        </div>
      )}
    />
  );
};
```

### Business Logic Hooks

#### useDocumentNumbering Hook

```typescript
const useDocumentNumbering = (documentType: DocumentType) => {
  const [nextNumber, setNextNumber] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchNextNumber = async () => {
      try {
        const settings = await getDocumentNumberingSettings();
        const number = await generateNextNumber(documentType, settings);
        setNextNumber(number);
      } catch (error) {
        console.error('Error fetching next number:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchNextNumber();
  }, [documentType]);
  
  return { nextNumber, loading };
};

// Usage
const QuoteForm = () => {
  const { nextNumber, loading } = useDocumentNumbering('quote');
  
  if (loading) return <LoadingSpinner />;
  
  return (
    <form>
      <input 
        value={nextNumber} 
        disabled 
        label="Quote Number"
      />
      {/* Rest of form */}
    </form>
  );
};
```

#### usePermissions Hook

```typescript
interface UsePermissionsReturn {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
  hasRole: (role: UserRole) => boolean;
  hasPermission: (module: string, action: string) => boolean;
}

const usePermissions = (): UsePermissionsReturn => {
  const { user } = useAuth();
  
  const canCreate = useMemo(() => 
    canPerformAction(user, 'create'), [user]);
  
  const canEdit = useMemo(() => 
    canPerformAction(user, 'edit'), [user]);
  
  const canDelete = useMemo(() => 
    canPerformAction(user, 'delete'), [user]);
  
  const canApprove = useMemo(() => 
    canPerformAction(user, 'approve'), [user]);
  
  const hasRole = useCallback((role: UserRole) => 
    user?.role === role, [user]);
  
  const hasPermission = useCallback((module: string, action: string) => 
    canPerformAction(user, action, module), [user]);
  
  return {
    canCreate,
    canEdit,
    canDelete,
    canApprove,
    hasRole,
    hasPermission
  };
};

// Usage
const QuoteActions = ({ quote }: { quote: Quote }) => {
  const { canEdit, canDelete, canApprove } = usePermissions();
  
  return (
    <div className="flex space-x-2">
      {canEdit && (
        <Button onClick={() => editQuote(quote.id)}>
          Edit
        </Button>
      )}
      {canDelete && (
        <Button variant="danger" onClick={() => deleteQuote(quote.id)}>
          Delete
        </Button>
      )}
      {canApprove && quote.status === 'draft' && (
        <Button variant="success" onClick={() => approveQuote(quote.id)}>
          Approve
        </Button>
      )}
    </div>
  );
};
```

## 🔧 Utility Functions API

### Data Validation

```typescript
// Validation utilities
export const validators = {
  required: (value: any) => !!value || 'This field is required',
  
  email: (value: string) => 
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || 'Invalid email format',
  
  phone: (value: string) => 
    /^[6-9]\d{9}$/.test(value) || 'Invalid Indian phone number',
  
  gstin: (value: string) => 
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(value) || 
    'Invalid GSTIN format',
  
  pan: (value: string) => 
    /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value) || 'Invalid PAN format',
  
  minLength: (min: number) => (value: string) => 
    value.length >= min || `Must be at least ${min} characters`,
  
  maxLength: (max: number) => (value: string) => 
    value.length <= max || `Must be no more than ${max} characters`,
  
  numeric: (value: string) => 
    /^[0-9]+$/.test(value) || 'Must be numeric',
  
  decimal: (value: string) => 
    /^[0-9]+(\.[0-9]{1,2})?$/.test(value) || 'Invalid decimal format'
};

// Usage
const validateCustomerForm = (data: Partial<Customer>) => {
  const errors: Record<string, string> = {};
  
  const nameError = validators.required(data.name);
  if (nameError !== true) errors.name = nameError;
  
  const emailError = validators.email(data.email || '');
  if (emailError !== true) errors.email = emailError;
  
  if (data.gstin) {
    const gstinError = validators.gstin(data.gstin);
    if (gstinError !== true) errors.gstin = gstinError;
  }
  
  return Object.keys(errors).length > 0 ? errors : null;
};
```

### Formatting Utilities

```typescript
// Number and currency formatting
export const formatCurrency = (amount: number, currency: string = '₹'): string => {
  return `${currency}${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

export const formatNumber = (num: number): string => {
  return num.toLocaleString('en-IN');
};

// Date formatting
export const formatDate = (date: string | Date, format: 'short' | 'long' = 'short'): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (format === 'long') {
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }
  
  return d.toLocaleDateString('en-GB');
};

// Text utilities
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const capitalizeWords = (str: string): string => {
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

// Usage
const QuoteCard = ({ quote }: { quote: Quote }) => {
  return (
    <div className="p-4 border rounded">
      <h3>{quote.customerName}</h3>
      <p>Amount: {formatCurrency(quote.total)}</p>
      <p>Date: {formatDate(quote.issueDate, 'long')}</p>
      <p>{truncateText(quote.notes || '', 100)}</p>
    </div>
  );
};
```

### PDF Generation Utilities

```typescript
// PDF generation for documents
export const generateQuotePDF = async (quote: Quote): Promise<Blob> => {
  const doc = new jsPDF();
  
  // Add company header
  const companySettings = await getCompanySettings();
  addCompanyHeader(doc, companySettings);
  
  // Add quote details
  doc.setFontSize(20);
  doc.text('QUOTATION', 20, 40);
  
  doc.setFontSize(12);
  doc.text(`Quote No: ${quote.quoteNumber}`, 20, 55);
  doc.text(`Date: ${formatDate(quote.issueDate)}`, 20, 65);
  doc.text(`Valid Until: ${formatDate(quote.validUntil)}`, 20, 75);
  
  // Add customer details
  doc.text('Bill To:', 20, 95);
  doc.text(quote.customerName, 20, 105);
  
  // Add line items table
  const tableData = quote.lineItems.map(item => [
    item.productName,
    item.description,
    item.quantity.toString(),
    item.unit,
    formatCurrency(item.unitPrice),
    formatCurrency(item.total)
  ]);
  
  autoTable(doc, {
    head: [['Product', 'Description', 'Qty', 'Unit', 'Rate', 'Amount']],
    body: tableData,
    startY: 120,
    theme: 'striped'
  });
  
  // Add totals
  const finalY = (doc as any).lastAutoTable.finalY + 20;
  doc.text(`Subtotal: ${formatCurrency(quote.subtotal)}`, 140, finalY);
  doc.text(`Tax: ${formatCurrency(quote.tax)}`, 140, finalY + 10);
  doc.text(`Total: ${formatCurrency(quote.total)}`, 140, finalY + 20);
  
  // Add terms and conditions
  if (quote.terms) {
    doc.text('Terms & Conditions:', 20, finalY + 40);
    doc.text(quote.terms, 20, finalY + 50, { maxWidth: 170 });
  }
  
  return doc.output('blob');
};

// Usage
const downloadQuotePDF = async (quote: Quote) => {
  const pdfBlob = await generateQuotePDF(quote);
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Quote-${quote.quoteNumber}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
};
```

This API reference provides comprehensive documentation for integrating with and extending the ABS OMS system. Each component and service is designed to be modular, reusable, and easily testable.