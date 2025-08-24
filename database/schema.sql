-- ABS OMS MySQL Database Schema
-- Converted from Firebase Firestore to MySQL
-- Created: January 2025

CREATE DATABASE IF NOT EXISTS abs_oms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE abs_oms;

-- ========================================
-- USERS AND AUTHENTICATION
-- ========================================

CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('Admin', 'Maker', 'Approver', 'Viewer') DEFAULT 'Viewer',
    has_erp_access BOOLEAN DEFAULT TRUE,
    has_payroll_access BOOLEAN DEFAULT FALSE,
    has_projects_access BOOLEAN DEFAULT FALSE,
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    
    INDEX idx_users_email (email),
    INDEX idx_users_role (role)
);

CREATE TABLE user_theme_preferences (
    user_id VARCHAR(255) PRIMARY KEY,
    colors JSON,
    typography JSON,
    layout JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE user_sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    token VARCHAR(500) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_sessions_token (token),
    INDEX idx_sessions_user_expires (user_id, expires_at)
);

-- ========================================
-- COMPANY SETTINGS AND CONFIGURATION
-- ========================================

CREATE TABLE company_details (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    gstin VARCHAR(50),
    phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(255),
    logo_url VARCHAR(500),
    enable_whatsapp BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE bank_details (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT,
    bank_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(100) NOT NULL,
    ifsc_code VARCHAR(20) NOT NULL,
    account_holder_name VARCHAR(255) NOT NULL,
    branch VARCHAR(255),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (company_id) REFERENCES company_details(id) ON DELETE CASCADE
);

CREATE TABLE points_of_contact (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    designation VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_poc_default (is_default)
);

CREATE TABLE document_numbering (
    id INT PRIMARY KEY AUTO_INCREMENT,
    document_type ENUM('quote', 'sales_order', 'delivery_order', 'purchase_order') NOT NULL UNIQUE,
    prefix VARCHAR(20) DEFAULT '',
    current_number INT DEFAULT 1,
    suffix VARCHAR(20) DEFAULT '',
    date_format VARCHAR(50) DEFAULT '',
    reset_annually BOOLEAN DEFAULT FALSE,
    last_reset_year INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE terms_and_conditions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    content TEXT,
    document_type VARCHAR(50) DEFAULT 'general',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ========================================
-- CUSTOMERS AND VENDORS
-- ========================================

CREATE TABLE customers (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    gstin VARCHAR(50),
    primary_contact_name VARCHAR(255),
    primary_contact_email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_customers_name (name),
    INDEX idx_customers_gstin (gstin)
);

CREATE TABLE customer_contacts (
    id VARCHAR(255) PRIMARY KEY,
    customer_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    INDEX idx_customer_contacts_customer (customer_id)
);

CREATE TABLE customer_addresses (
    id VARCHAR(255) PRIMARY KEY,
    customer_id VARCHAR(255) NOT NULL,
    type ENUM('billing', 'shipping') NOT NULL,
    line1 VARCHAR(255) NOT NULL,
    line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    INDEX idx_customer_addresses_customer (customer_id),
    INDEX idx_customer_addresses_type (type)
);

CREATE TABLE vendors (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    gstin VARCHAR(50),
    primary_contact_name VARCHAR(255),
    primary_contact_email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_vendors_name (name),
    INDEX idx_vendors_gstin (gstin)
);

CREATE TABLE vendor_contacts (
    id VARCHAR(255) PRIMARY KEY,
    vendor_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
    INDEX idx_vendor_contacts_vendor (vendor_id)
);

CREATE TABLE vendor_addresses (
    id VARCHAR(255) PRIMARY KEY,
    vendor_id VARCHAR(255) NOT NULL,
    type ENUM('billing', 'shipping') NOT NULL,
    line1 VARCHAR(255) NOT NULL,
    line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
    INDEX idx_vendor_addresses_vendor (vendor_id),
    INDEX idx_vendor_addresses_type (type)
);

-- ========================================
-- PRODUCTS AND INVENTORY
-- ========================================

CREATE TABLE products (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    unit VARCHAR(50) NOT NULL,
    rate DECIMAL(15,2) DEFAULT 0,
    hsn_code VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_products_name (name),
    INDEX idx_products_hsn (hsn_code)
);

CREATE TABLE inventory (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id VARCHAR(255) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    current_stock DECIMAL(15,3) DEFAULT 0,
    reserved_stock DECIMAL(15,3) DEFAULT 0,
    available_stock DECIMAL(15,3) GENERATED ALWAYS AS (current_stock - reserved_stock) STORED,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_product_inventory (product_id),
    INDEX idx_inventory_product (product_id),
    INDEX idx_inventory_stock_levels (current_stock, available_stock)
);

CREATE TABLE stock_transactions (
    id VARCHAR(255) PRIMARY KEY,
    product_id VARCHAR(255) NOT NULL,
    transaction_type ENUM('in', 'out', 'adjustment') NOT NULL,
    quantity DECIMAL(15,3) NOT NULL,
    reference_type ENUM('delivery_order', 'purchase_order', 'manual_adjustment', 'initial_stock') NOT NULL,
    reference_id VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_stock_transactions_product (product_id),
    INDEX idx_stock_transactions_reference (reference_type, reference_id),
    INDEX idx_stock_transactions_date (created_at)
);

-- ========================================
-- SALES OPERATIONS
-- ========================================

CREATE TABLE quotes (
    id VARCHAR(255) PRIMARY KEY,
    quote_number VARCHAR(100) UNIQUE NOT NULL,
    revision_number INT DEFAULT 0,
    customer_id VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    issue_date DATE NOT NULL,
    valid_until DATE,
    status ENUM('Draft', 'Sent', 'Discussion', 'Approved', 'Rejected', 'Expired') DEFAULT 'Draft',
    subtotal DECIMAL(15,2) DEFAULT 0,
    discount DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) DEFAULT 0,
    terms TEXT,
    notes TEXT,
    point_of_contact_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (point_of_contact_id) REFERENCES points_of_contact(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_quotes_customer (customer_id),
    INDEX idx_quotes_status (status),
    INDEX idx_quotes_date (issue_date),
    INDEX idx_quotes_number (quote_number)
);

CREATE TABLE quote_line_items (
    id VARCHAR(255) PRIMARY KEY,
    quote_id VARCHAR(255) NOT NULL,
    product_id VARCHAR(255) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    description TEXT,
    quantity DECIMAL(15,3) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    rate DECIMAL(15,2) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    line_order INT DEFAULT 0,
    
    FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_quote_items_quote (quote_id),
    INDEX idx_quote_items_product (product_id)
);

CREATE TABLE sales_orders (
    id VARCHAR(255) PRIMARY KEY,
    order_number VARCHAR(100) UNIQUE NOT NULL,
    quote_id VARCHAR(255),
    customer_id VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    order_date DATE NOT NULL,
    expected_delivery DATE,
    status ENUM('Approved', 'Partial', 'Delivered', 'Cancelled') DEFAULT 'Approved',
    subtotal DECIMAL(15,2) DEFAULT 0,
    discount DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) DEFAULT 0,
    terms TEXT,
    notes TEXT,
    point_of_contact_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    
    FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE SET NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (point_of_contact_id) REFERENCES points_of_contact(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_sales_orders_customer (customer_id),
    INDEX idx_sales_orders_quote (quote_id),
    INDEX idx_sales_orders_status (status),
    INDEX idx_sales_orders_date (order_date)
);

CREATE TABLE sales_order_line_items (
    id VARCHAR(255) PRIMARY KEY,
    order_id VARCHAR(255) NOT NULL,
    product_id VARCHAR(255) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    description TEXT,
    quantity DECIMAL(15,3) NOT NULL,
    delivered_quantity DECIMAL(15,3) DEFAULT 0,
    pending_quantity DECIMAL(15,3) GENERATED ALWAYS AS (quantity - delivered_quantity) STORED,
    unit VARCHAR(50) NOT NULL,
    rate DECIMAL(15,2) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    line_order INT DEFAULT 0,
    
    FOREIGN KEY (order_id) REFERENCES sales_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_sales_order_items_order (order_id),
    INDEX idx_sales_order_items_product (product_id),
    INDEX idx_sales_order_items_pending (pending_quantity)
);

CREATE TABLE delivery_orders (
    id VARCHAR(255) PRIMARY KEY,
    delivery_number VARCHAR(100) UNIQUE NOT NULL,
    sales_order_id VARCHAR(255) NOT NULL,
    customer_id VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    delivery_date DATE NOT NULL,
    vehicle_number VARCHAR(50),
    driver_name VARCHAR(255),
    status ENUM('Pending', 'In Transit', 'Delivered') DEFAULT 'Pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    
    FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_delivery_orders_sales_order (sales_order_id),
    INDEX idx_delivery_orders_customer (customer_id),
    INDEX idx_delivery_orders_status (status),
    INDEX idx_delivery_orders_date (delivery_date)
);

CREATE TABLE delivery_order_line_items (
    id VARCHAR(255) PRIMARY KEY,
    delivery_id VARCHAR(255) NOT NULL,
    product_id VARCHAR(255) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    description TEXT,
    quantity DECIMAL(15,3) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    line_order INT DEFAULT 0,
    
    FOREIGN KEY (delivery_id) REFERENCES delivery_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_delivery_items_delivery (delivery_id),
    INDEX idx_delivery_items_product (product_id)
);

-- ========================================
-- PURCHASE OPERATIONS
-- ========================================

CREATE TABLE purchase_orders (
    id VARCHAR(255) PRIMARY KEY,
    po_number VARCHAR(100) UNIQUE NOT NULL,
    vendor_id VARCHAR(255) NOT NULL,
    vendor_name VARCHAR(255) NOT NULL,
    order_date DATE NOT NULL,
    expected_delivery DATE,
    status ENUM('Draft', 'Sent', 'Confirmed', 'Partial', 'Received', 'Cancelled') DEFAULT 'Draft',
    subtotal DECIMAL(15,2) DEFAULT 0,
    discount DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) DEFAULT 0,
    terms TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_purchase_orders_vendor (vendor_id),
    INDEX idx_purchase_orders_status (status),
    INDEX idx_purchase_orders_date (order_date)
);

CREATE TABLE purchase_order_line_items (
    id VARCHAR(255) PRIMARY KEY,
    po_id VARCHAR(255) NOT NULL,
    product_id VARCHAR(255) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    description TEXT,
    quantity DECIMAL(15,3) NOT NULL,
    received_quantity DECIMAL(15,3) DEFAULT 0,
    pending_quantity DECIMAL(15,3) GENERATED ALWAYS AS (quantity - received_quantity) STORED,
    unit VARCHAR(50) NOT NULL,
    rate DECIMAL(15,2) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    line_order INT DEFAULT 0,
    
    FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_po_items_po (po_id),
    INDEX idx_po_items_product (product_id),
    INDEX idx_po_items_pending (pending_quantity)
);

-- ========================================
-- TRANSPORT MANAGEMENT
-- ========================================

CREATE TABLE transporters (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    vehicle_number VARCHAR(50),
    vehicle_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_transporters_name (name),
    INDEX idx_transporters_vehicle (vehicle_number)
);

CREATE TABLE transport_transactions (
    id VARCHAR(255) PRIMARY KEY,
    transporter_id VARCHAR(255) NOT NULL,
    type ENUM('cost', 'payment') NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    description TEXT NOT NULL,
    date DATE NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved',
    approved_by VARCHAR(255),
    approved_at TIMESTAMP NULL,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (transporter_id) REFERENCES transporters(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_transport_transactions_transporter (transporter_id),
    INDEX idx_transport_transactions_type (type),
    INDEX idx_transport_transactions_status (status),
    INDEX idx_transport_transactions_date (date)
);

-- ========================================
-- PAYROLL MANAGEMENT
-- ========================================

CREATE TABLE payroll_employees (
    id VARCHAR(255) PRIMARY KEY,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    designation VARCHAR(255),
    department VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    aadhar_number VARCHAR(20),
    pan_number VARCHAR(20),
    bank_account VARCHAR(100),
    ifsc_code VARCHAR(20),
    address TEXT,
    hire_date DATE,
    salary DECIMAL(15,2) DEFAULT 0,
    category ENUM('Management', 'Skilled', 'Semi-Skilled', 'Unskilled') DEFAULT 'Skilled',
    status ENUM('Active', 'Inactive', 'Terminated') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_employees_employee_id (employee_id),
    INDEX idx_employees_name (name),
    INDEX idx_employees_status (status),
    INDEX idx_employees_category (category)
);

CREATE TABLE leave_requests (
    id VARCHAR(255) PRIMARY KEY,
    employee_id VARCHAR(255) NOT NULL,
    employee_name VARCHAR(255) NOT NULL,
    leave_type ENUM('Sick', 'Casual', 'Annual', 'Emergency', 'Other') NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_requested DECIMAL(5,2) NOT NULL,
    reason TEXT,
    status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
    approved_by VARCHAR(255),
    approved_at TIMESTAMP NULL,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (employee_id) REFERENCES payroll_employees(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_leave_requests_employee (employee_id),
    INDEX idx_leave_requests_status (status),
    INDEX idx_leave_requests_dates (start_date, end_date)
);

CREATE TABLE advance_payments (
    id VARCHAR(255) PRIMARY KEY,
    employee_id VARCHAR(255) NOT NULL,
    employee_name VARCHAR(255) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    request_date DATE NOT NULL,
    reason TEXT,
    status ENUM('Pending', 'Approved', 'Paid', 'Rejected') DEFAULT 'Pending',
    approved_by VARCHAR(255),
    approved_at TIMESTAMP NULL,
    paid_at TIMESTAMP NULL,
    payment_method VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (employee_id) REFERENCES payroll_employees(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_advance_payments_employee (employee_id),
    INDEX idx_advance_payments_status (status),
    INDEX idx_advance_payments_date (request_date)
);

CREATE TABLE payroll_runs (
    id VARCHAR(255) PRIMARY KEY,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    status ENUM('Draft', 'Processing', 'Completed', 'Cancelled') DEFAULT 'Draft',
    total_employees INT DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    processed_by VARCHAR(255),
    processed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_payroll_runs_period (period_start, period_end),
    INDEX idx_payroll_runs_status (status)
);

CREATE TABLE payroll_entries (
    id VARCHAR(255) PRIMARY KEY,
    payroll_run_id VARCHAR(255) NOT NULL,
    employee_id VARCHAR(255) NOT NULL,
    employee_name VARCHAR(255) NOT NULL,
    basic_salary DECIMAL(15,2) DEFAULT 0,
    allowances DECIMAL(15,2) DEFAULT 0,
    deductions DECIMAL(15,2) DEFAULT 0,
    advances_deducted DECIMAL(15,2) DEFAULT 0,
    gross_salary DECIMAL(15,2) DEFAULT 0,
    net_salary DECIMAL(15,2) DEFAULT 0,
    days_worked DECIMAL(5,2) DEFAULT 0,
    days_absent DECIMAL(5,2) DEFAULT 0,
    overtime_hours DECIMAL(5,2) DEFAULT 0,
    overtime_amount DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (payroll_run_id) REFERENCES payroll_runs(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES payroll_employees(id) ON DELETE CASCADE,
    INDEX idx_payroll_entries_run (payroll_run_id),
    INDEX idx_payroll_entries_employee (employee_id)
);

-- ========================================
-- PROJECTS MANAGEMENT
-- ========================================

CREATE TABLE projects (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status ENUM('Planning', 'Active', 'On Hold', 'Completed', 'Cancelled') DEFAULT 'Planning',
    priority ENUM('Low', 'Medium', 'High', 'Critical') DEFAULT 'Medium',
    start_date DATE,
    end_date DATE,
    required_access_level ENUM('Admin', 'Approver', 'Maker', 'Viewer') DEFAULT 'Viewer',
    created_by VARCHAR(255),
    assigned_to JSON, -- Array of user IDs
    tags JSON, -- Array of tags
    progress DECIMAL(5,2) DEFAULT 0, -- Percentage
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_projects_status (status),
    INDEX idx_projects_priority (priority),
    INDEX idx_projects_access_level (required_access_level),
    INDEX idx_projects_dates (start_date, end_date)
);

CREATE TABLE project_tasks (
    id VARCHAR(255) PRIMARY KEY,
    project_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status ENUM('To Do', 'In Progress', 'Review', 'Done') DEFAULT 'To Do',
    priority ENUM('Low', 'Medium', 'High', 'Critical') DEFAULT 'Medium',
    assigned_to VARCHAR(255),
    due_date DATE,
    completed_at TIMESTAMP NULL,
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_project_tasks_project (project_id),
    INDEX idx_project_tasks_assignee (assigned_to),
    INDEX idx_project_tasks_status (status),
    INDEX idx_project_tasks_due_date (due_date)
);

-- ========================================
-- SCRATCHPAD AND NOTES
-- ========================================

CREATE TABLE scratchpads (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    tags JSON, -- Array of tags
    is_shared BOOLEAN DEFAULT FALSE,
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_scratchpads_created_by (created_by),
    INDEX idx_scratchpads_shared (is_shared),
    FULLTEXT idx_scratchpads_search (title, content)
);

-- ========================================
-- SYSTEM AUDIT AND LOGS
-- ========================================

CREATE TABLE audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_audit_logs_user (user_id),
    INDEX idx_audit_logs_action (action),
    INDEX idx_audit_logs_resource (resource_type, resource_id),
    INDEX idx_audit_logs_date (created_at)
);

-- ========================================
-- FILE UPLOADS AND ATTACHMENTS
-- ========================================

CREATE TABLE file_uploads (
    id VARCHAR(255) PRIMARY KEY,
    original_name VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    uploaded_by VARCHAR(255),
    resource_type VARCHAR(100), -- e.g., 'quote', 'invoice', 'project'
    resource_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_file_uploads_resource (resource_type, resource_id),
    INDEX idx_file_uploads_user (uploaded_by)
);

-- ========================================
-- INITIAL DATA SETUP
-- ========================================

-- Insert default company details
INSERT INTO company_details (name) VALUES ('ABS Order Management System');

-- Insert default document numbering
INSERT INTO document_numbering (document_type, prefix, current_number) VALUES
('quote', 'QT-', 1),
('sales_order', 'SO-', 1),
('delivery_order', 'DO-', 1),
('purchase_order', 'PO-', 1);

-- Insert default terms and conditions
INSERT INTO terms_and_conditions (content, document_type) VALUES
('Payment terms: Net 30 days from invoice date.', 'general');

-- Note: Admin user will be created through the application setup process
-- to ensure proper password hashing and security