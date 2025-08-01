import { 
    Customer, Product, Vendor, PayrollEmployee, AdvancePayment, PayrollRecord, User, Contact,
    EmployeeCategory, UserRole, DocumentStatus
} from '@/types';

// ============================================================================
// DATA VALIDATION SCHEMAS & DEFAULTS
// ============================================================================

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    fixedData?: any;
}

export interface DataDefaults {
    customers: Partial<Customer>;
    products: Partial<Product>;
    vendors: Partial<Vendor>;
    quotes: any;
    sales_orders: any;
    delivery_orders: any;
    purchase_orders: any;
    payroll_employees: Partial<PayrollEmployee>;
    payroll_advances: Partial<AdvancePayment>;
    payroll_records: Partial<PayrollRecord>;
    users: Partial<User>;
}

// Generate unique ID
const generateId = () => Math.random().toString(36).substr(2, 9);

// Default values for each data type
export const DATA_DEFAULTS: DataDefaults = {
    customers: {
        name: '',
        gstin: '',
        contacts: [],
        shippingAddresses: [],
        primaryContactName: 'Default Contact',
        primaryContactEmail: ''
    },
    products: {
        name: '',
        description: '',
        unit: 'pcs',
        rate: 0,
        hsnCode: ''
    },
    vendors: {
        name: '',
        gstin: '',
        address: ''
    },
    quotes: {
        quoteNumber: '',
        customerName: '',
        contactName: '',
        contactPhone: '',
        contactEmail: '',
        customerGstin: '',
        issueDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        lineItems: [],
        subTotal: 0,
        gstTotal: 0,
        total: 0,
        terms: [],
        status: DocumentStatus.Draft,
        revisionNumber: 1
    },
    sales_orders: {
        orderNumber: '',
        quoteNumber: '',
        clientPoNumber: '',
        customerName: '',
        contactName: '',
        contactPhone: '',
        contactEmail: '',
        customerGstin: '',
        orderDate: new Date().toISOString(),
        lineItems: [],
        subTotal: 0,
        gstTotal: 0,
        total: 0,
        terms: [],
        status: DocumentStatus.Draft,
        deliveredQuantities: {}
    },
    delivery_orders: {
        deliveryNumber: '',
        salesOrderNumber: '',
        customerName: '',
        contactName: '',
        contactPhone: '',
        contactEmail: '',
        deliveryDate: new Date().toISOString(),
        customerGstin: '',
        lineItems: [],
        status: DocumentStatus.Draft
    },
    purchase_orders: {
        poNumber: '',
        vendorName: '',
        vendorGstin: '',
        vendorAddress: '',
        orderDate: new Date().toISOString(),
        deliveryAddress: '',
        lineItems: [],
        subTotal: 0,
        gstTotal: 0,
        total: 0,
        status: DocumentStatus.Draft
    },
    payroll_employees: {
        employee_id: '',
        name: '',
        department: '',
        category: EmployeeCategory.InOffice,
        monthly_ctc: 0,
        annual_ctc: 0,
        status: 'Active',
        bankAccounts: []
    },
    payroll_advances: {
        amount: 0,
        balance_amount: 0,
        date_given: new Date().toISOString(),
        status: 'Active',
        transactions: []
    },
    payroll_records: {
        payroll_month: '',
        status: 'Draft',
        days_present: 0,
        overtime_hours: 0,
        overtime_days: 0,
        basic_pay: 0,
        hra: 0,
        special_allowance: 0,
        overtime: 0,
        gross_pay: 0,
        pf: 0,
        esi: 0,
        pt: 0,
        tds: 0,
        advance_deduction: 0,
        total_deductions: 0,
        net_pay: 0,
        employee_name: '',
        employee_code: '',
        category: EmployeeCategory.InOffice
    },
    users: {
        name: '',
        email: '',
        role: UserRole.Viewer,
        hasErpAccess: false,
        hasPayrollAccess: false,
        hasProjectsAccess: false
    }
};

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

export const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^[\+]?[0-9\-\(\)\s]{10,15}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
};

export const validateGSTIN = (gstin: string): boolean => {
    if (!gstin) return true; // GSTIN is optional
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstinRegex.test(gstin);
};

export const validateHSNCode = (hsnCode: string): boolean => {
    if (!hsnCode) return true; // HSN is optional
    const hsnRegex = /^[0-9]{4,8}$/;
    return hsnRegex.test(hsnCode);
};

export const validatePincode = (pincode: string): boolean => {
    if (!pincode) return true; // Pincode is optional
    const pincodeRegex = /^[0-9]{6}$/;
    return pincodeRegex.test(pincode);
};

export const sanitizeString = (value: any): string => {
    if (value === null || value === undefined) return '';
    return String(value).trim();
};

export const sanitizeNumber = (value: any, defaultValue: number = 0): number => {
    if (value === null || value === undefined || value === '') return defaultValue;
    const num = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : Number(value);
    return isNaN(num) ? defaultValue : num;
};

export const sanitizeBoolean = (value: any, defaultValue: boolean = false): boolean => {
    if (value === null || value === undefined) return defaultValue;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        const lower = value.toLowerCase().trim();
        return lower === 'true' || lower === '1' || lower === 'yes';
    }
    return Boolean(value);
};

export const sanitizeDate = (value: any, defaultValue?: string): string => {
    if (!value) return defaultValue || new Date().toISOString();
    
    // Handle Firestore Timestamp
    if (value && typeof value === 'object' && value.seconds) {
        return new Date(value.seconds * 1000).toISOString();
    }
    
    // Handle date string or Date object
    try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
            return date.toISOString();
        }
    } catch (e) {
        // Invalid date
    }
    
    return defaultValue || new Date().toISOString();
};

// ============================================================================
// SPECIFIC VALIDATORS
// ============================================================================

export const validateCustomer = (data: any): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Apply defaults and sanitize
    const customer = { ...DATA_DEFAULTS.customers, ...data };
    customer.name = sanitizeString(customer.name);
    customer.gstin = sanitizeString(customer.gstin);
    
    // Required fields
    if (!customer.name) {
        errors.push('Customer name is required');
    }
    
    // GSTIN validation
    if (customer.gstin && !validateGSTIN(customer.gstin)) {
        errors.push('Invalid GSTIN format');
    }
    
    // Ensure contacts array exists and has at least one contact
    if (!Array.isArray(customer.contacts)) {
        customer.contacts = [];
    }
    
    if (customer.contacts.length === 0) {
        warnings.push('No contacts found, adding default contact');
        customer.contacts.push({
            id: generateId(),
            name: customer.primaryContactName || 'Default Contact',
            email: customer.primaryContactEmail || '',
            phone: '',
            isPrimary: true
        });
    }
    
    // Validate contacts
    customer.contacts = customer.contacts.map((contact: any, index: number) => ({
        id: contact.id || generateId(),
        name: sanitizeString(contact.name) || `Contact ${index + 1}`,
        email: sanitizeString(contact.email),
        phone: sanitizeString(contact.phone),
        isPrimary: sanitizeBoolean(contact.isPrimary, index === 0)
    }));
    
    // Validate contact emails
    customer.contacts.forEach((contact: Contact, index: number) => {
        if (contact.email && !validateEmail(contact.email)) {
            errors.push(`Invalid email format for contact ${index + 1}: ${contact.email}`);
        }
        if (contact.phone && !validatePhone(contact.phone)) {
            warnings.push(`Phone format may be invalid for contact ${index + 1}: ${contact.phone}`);
        }
    });
    
    // Ensure primary contact exists
    if (!customer.contacts.some((c: Contact) => c.isPrimary)) {
        customer.contacts[0].isPrimary = true;
        warnings.push('No primary contact found, setting first contact as primary');
    }
    
    // Ensure addresses exist
    if (!Array.isArray(customer.shippingAddresses)) {
        customer.shippingAddresses = [];
    }
    
    if (customer.shippingAddresses.length === 0) {
        warnings.push('No shipping addresses found, adding default address');
        customer.shippingAddresses.push({
            id: generateId(),
            line1: 'Default Address',
            city: '',
            state: '',
            pincode: '',
            isDefault: true
        });
    }
    
    // Validate shipping addresses
    customer.shippingAddresses = customer.shippingAddresses.map((addr: any, index: number) => {
        const sanitized = {
            id: addr.id || generateId(),
            line1: sanitizeString(addr.line1) || `Address ${index + 1}`,
            line2: sanitizeString(addr.line2),
            city: sanitizeString(addr.city),
            state: sanitizeString(addr.state),
            pincode: sanitizeString(addr.pincode),
            isDefault: sanitizeBoolean(addr.isDefault, index === 0)
        };
        
        if (sanitized.pincode && !validatePincode(sanitized.pincode)) {
            warnings.push(`Invalid pincode format for address ${index + 1}: ${sanitized.pincode}`);
        }
        
        return sanitized;
    });
    
    // Ensure billing address exists
    if (!customer.billingAddress || typeof customer.billingAddress !== 'object') {
        customer.billingAddress = {
            id: generateId(),
            line1: 'Default Billing Address',
            city: '',
            state: '',
            pincode: '',
            isDefault: true
        };
        warnings.push('No billing address found, adding default billing address');
    } else {
        customer.billingAddress = {
            id: customer.billingAddress.id || generateId(),
            line1: sanitizeString(customer.billingAddress.line1) || 'Default Billing Address',
            line2: sanitizeString(customer.billingAddress.line2),
            city: sanitizeString(customer.billingAddress.city),
            state: sanitizeString(customer.billingAddress.state),
            pincode: sanitizeString(customer.billingAddress.pincode),
            isDefault: true
        };
        
        if (customer.billingAddress.pincode && !validatePincode(customer.billingAddress.pincode)) {
            warnings.push(`Invalid pincode format for billing address: ${customer.billingAddress.pincode}`);
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        fixedData: customer
    };
};

export const validateProduct = (data: any): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const product = { ...DATA_DEFAULTS.products, ...data };
    product.name = sanitizeString(product.name);
    product.description = sanitizeString(product.description);
    product.unit = sanitizeString(product.unit) || 'pcs';
    product.rate = sanitizeNumber(product.rate, 0);
    product.hsnCode = sanitizeString(product.hsnCode);
    
    if (!product.name) {
        errors.push('Product name is required');
    }
    
    if (product.rate < 0) {
        errors.push('Product rate cannot be negative');
    }
    
    if (product.hsnCode && !validateHSNCode(product.hsnCode)) {
        warnings.push(`Invalid HSN code format: ${product.hsnCode}`);
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        fixedData: product
    };
};

export const validateVendor = (data: any): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const vendor = { ...DATA_DEFAULTS.vendors, ...data };
    vendor.name = sanitizeString(vendor.name);
    vendor.gstin = sanitizeString(vendor.gstin);
    vendor.address = sanitizeString(vendor.address);
    
    if (!vendor.name) {
        errors.push('Vendor name is required');
    }
    
    if (vendor.gstin && !validateGSTIN(vendor.gstin)) {
        errors.push('Invalid GSTIN format');
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        fixedData: vendor
    };
};

export const validatePayrollEmployee = (data: any): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const employee = { ...DATA_DEFAULTS.payroll_employees, ...data };
    employee.employee_id = sanitizeString(employee.employee_id);
    employee.name = sanitizeString(employee.name);
    employee.email = sanitizeString(employee.email);
    employee.phone = sanitizeString(employee.phone);
    employee.department = sanitizeString(employee.department);
    employee.monthly_ctc = sanitizeNumber(employee.monthly_ctc, 0);
    employee.annual_ctc = sanitizeNumber(employee.annual_ctc, 0);
    employee.status = employee.status === 'Inactive' ? 'Inactive' : 'Active';
    
    // Validate category
    if (!Object.values(EmployeeCategory).includes(employee.category)) {
        employee.category = EmployeeCategory.InOffice;
        warnings.push('Invalid employee category, defaulting to In-office Employee');
    }
    
    if (!employee.employee_id) {
        errors.push('Employee ID is required');
    }
    
    if (!employee.name) {
        errors.push('Employee name is required');
    }
    
    if (employee.email && !validateEmail(employee.email)) {
        errors.push(`Invalid email format: ${employee.email}`);
    }
    
    if (employee.phone && !validatePhone(employee.phone)) {
        warnings.push(`Phone format may be invalid: ${employee.phone}`);
    }
    
    if (employee.monthly_ctc < 0) {
        errors.push('Monthly CTC cannot be negative');
    }
    
    if (employee.annual_ctc < 0) {
        errors.push('Annual CTC cannot be negative');
    }
    
    // Auto-calculate annual CTC if not provided
    if (employee.monthly_ctc > 0 && employee.annual_ctc === 0) {
        employee.annual_ctc = employee.monthly_ctc * 12;
        warnings.push('Annual CTC calculated from monthly CTC');
    }
    
    // Validate bank accounts
    if (!Array.isArray(employee.bankAccounts)) {
        employee.bankAccounts = [];
    }
    
    employee.bankAccounts = employee.bankAccounts.map((account: any, index: number) => ({
        id: account.id || generateId(),
        bankName: sanitizeString(account.bankName) || `Bank ${index + 1}`,
        accountNumber: sanitizeString(account.accountNumber),
        ifsc: sanitizeString(account.ifsc),
        isDefault: sanitizeBoolean(account.isDefault, index === 0)
    }));
    
    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        fixedData: employee
    };
};

export const validateUser = (data: any): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const user = { ...DATA_DEFAULTS.users, ...data };
    user.name = sanitizeString(user.name);
    user.email = sanitizeString(user.email);
    user.hasErpAccess = sanitizeBoolean(user.hasErpAccess, false);
    user.hasPayrollAccess = sanitizeBoolean(user.hasPayrollAccess, false);
    user.hasProjectsAccess = sanitizeBoolean(user.hasProjectsAccess, false);
    
    // Validate role
    if (!Object.values(UserRole).includes(user.role)) {
        user.role = UserRole.Viewer;
        warnings.push('Invalid user role, defaulting to Viewer');
    }
    
    if (!user.name) {
        errors.push('User name is required');
    }
    
    if (!user.email) {
        errors.push('User email is required');
    } else if (!validateEmail(user.email)) {
        errors.push(`Invalid email format: ${user.email}`);
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        fixedData: user
    };
};

// ============================================================================
// GENERIC VALIDATOR
// ============================================================================

export const validateData = (collection: string, data: any): ValidationResult => {
    switch (collection) {
        case 'customers':
            return validateCustomer(data);
        case 'products':
            return validateProduct(data);
        case 'vendors':
            return validateVendor(data);
        case 'payroll_employees':
            return validatePayrollEmployee(data);
        case 'users':
            return validateUser(data);
        default:
            return {
                isValid: true,
                errors: [],
                warnings: [`No specific validation available for collection: ${collection}`],
                fixedData: data
            };
    }
};