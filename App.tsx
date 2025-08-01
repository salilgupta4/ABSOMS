



import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import Dashboard from '@/components/Dashboard';
import SettingsPage from '@/components/settings/SettingsPage';
import CompanyDetails from '@/components/settings/CompanyDetails';
import ThemeSettings from '@/components/settings/ThemeSettings';
import DocumentNumbering from '@/components/settings/DocumentNumbering';
import PdfCustomizer from '@/components/settings/PdfCustomizer';
import UserManagement from '@/components/users/UserManagement';
import CustomerList from '@/components/customers/CustomerList';
import CustomerForm from '@/components/customers/CustomerForm';
import ProductList from '@/components/products/ProductList';
import ProductForm from '@/components/products/ProductForm';
import QuoteList from '@/components/sales/QuoteList';
import SalesOrderList from '@/components/sales/SalesOrderList';
import DeliveryOrderList from '@/components/sales/DeliveryOrderList';
import PendingItems from '@/components/sales/PendingItems';
import PurchaseOrderList from '@/components/purchase/PurchaseOrderList';
import QuoteForm from '@/components/sales/QuoteForm';
import SalesOrderForm from '@/components/sales/SalesOrderForm';
import DeliveryOrderForm from '@/components/sales/DeliveryOrderForm';
import PurchaseOrderForm from '@/components/purchase/PurchaseOrderForm';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AdminRoute from '@/components/auth/AdminRoute';
import SettingsRoute from '@/components/auth/SettingsRoute';
import LoginPage from '@/components/auth/LoginPage';
import QuoteView from '@/components/sales/QuoteView';
import SalesOrderView from '@/components/sales/SalesOrderView';
import SalesOrderEditForm from '@/components/sales/SalesOrderEditForm';
import DeliveryOrderView from '@/components/sales/DeliveryOrderView';
import DeliveryOrderEditForm from '@/components/sales/DeliveryOrderEditForm';
import VendorList from '@/components/vendors/VendorList';
import VendorForm from '@/components/vendors/VendorForm';
import { PurchaseOrderView } from '@/components/purchase/PurchaseOrderView';
import TermsSettings from '@/components/settings/TermsSettings';
import PointOfContactManagement from '@/components/settings/PointOfContactManagement';
import InventoryList from '@/components/inventory/InventoryList';
import StockHistory from '@/components/inventory/StockHistory';
import DataManagement from './components/admin/DataManagement';
import FirebaseMigration from './components/admin/FirebaseMigration';
import ScratchpadList from './components/scratchpad/ScratchpadList';
import ScratchpadView from './components/scratchpad/ScratchpadView';
import PayrollLayout from './components/payroll/PayrollLayout';
import PayrollDashboard from './components/payroll/PayrollDashboard';
import EmployeeList from './components/payroll/EmployeeList';
import RunPayroll from './components/payroll/RunPayroll';
import LeaveManagement from './components/payroll/LeaveManagement';
import AdvancePayments from './components/payroll/AdvancePayments';
import PayrollReports from './components/payroll/PayrollReports';
import PayrollSettings from './components/payroll/PayrollSettings';
import ProjectsModule from './components/projects/ProjectsModule';

function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <ThemeProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route 
                path="/*"
                element={
                  <ProtectedRoute>
                    <Routes>
                      <Route element={<Layout />}>
                        <Route index element={<Navigate to="/dashboard" replace />} />
                        <Route path="dashboard" element={<Dashboard />} />
                        
                        <Route path="customers" element={<CustomerList />} />
                        <Route path="customers/new" element={<CustomerForm />} />
                        <Route path="customers/:id/edit" element={<CustomerForm />} />

                        <Route path="products" element={<ProductList />} />
                        <Route path="products/new" element={<ProductForm />} />
                        <Route path="products/:id/edit" element={<ProductForm />} />

                        <Route path="vendors" element={<VendorList />} />
                        <Route path="vendors/new" element={<VendorForm />} />
                        <Route path="vendors/:id/edit" element={<VendorForm />} />

                        <Route path="sales/quotes" element={<QuoteList />} />
                        <Route path="sales/quotes/new" element={<QuoteForm />} />
                        <Route path="sales/quotes/:id/edit" element={<QuoteForm />} />
                        <Route path="sales/quotes/:id/view" element={<QuoteView />} />

                        <Route path="sales/orders" element={<SalesOrderList />} />
                        <Route path="sales/orders/new/:quoteId" element={<SalesOrderForm />} />
                        <Route path="sales/orders/:id/edit" element={<SalesOrderEditForm />} />
                        <Route path="sales/orders/:id/view" element={<SalesOrderView />} />
                        
                        <Route path="sales/deliveries" element={<DeliveryOrderList />} />
                        <Route path="sales/deliveries/new/:orderId" element={<DeliveryOrderForm />} />
                        <Route path="sales/deliveries/:id/edit" element={<DeliveryOrderEditForm />} />
                        <Route path="sales/deliveries/:id/view" element={<DeliveryOrderView />} />
                        
                        <Route path="sales/pending-items" element={<PendingItems />} />

                        <Route path="purchase/orders" element={<PurchaseOrderList />} />
                        <Route path="purchase/orders/new" element={<PurchaseOrderForm />} />
                        <Route path="purchase/orders/:id/edit" element={<PurchaseOrderForm />} />
                        <Route path="purchase/orders/:id/view" element={<PurchaseOrderView />} />

                        <Route path="inventory" element={<InventoryList />} />
                        <Route path="inventory/:productId/history" element={<StockHistory />} />
                        
                        <Route path="scratchpad" element={<ScratchpadList />} />
                        <Route path="scratchpad/:id" element={<ScratchpadView />} />

                        <Route path="projects/*" element={
                          <ProtectedRoute permissionKey="hasProjectsAccess">
                            <ProjectsModule />
                          </ProtectedRoute>
                        } />

                        <Route path="payroll" element={
                          <ProtectedRoute permissionKey="hasPayrollAccess">
                            <PayrollLayout />
                          </ProtectedRoute>
                        }>
                           <Route index element={<Navigate to="dashboard" replace />} />
                           <Route path="dashboard" element={<PayrollDashboard />} />
                           <Route path="employees" element={<EmployeeList />} />
                           <Route path="run-payroll" element={<RunPayroll />} />
                           <Route path="leaves" element={<LeaveManagement />} />
                           <Route path="advances" element={<AdvancePayments />} />
                           <Route path="reports" element={<PayrollReports />} />
                           <Route path="settings" element={<PayrollSettings />} />
                        </Route>

                        <Route path="users" element={
                          <AdminRoute>
                            <UserManagement />
                          </AdminRoute>
                        } />
                        
                        <Route path="settings" element={
                          <SettingsRoute>
                            <SettingsPage />
                          </SettingsRoute>
                        }>
                          <Route index element={<Navigate to="company" replace />} />
                          <Route path="company" element={<CompanyDetails />} />
                          <Route path="contacts" element={<PointOfContactManagement />} />
                          <Route path="theme" element={<ThemeSettings />} />
                          <Route path="numbering" element={<DocumentNumbering />} />
                          <Route path="pdf" element={<PdfCustomizer />} />
                          <Route path="terms" element={<TermsSettings />} />
                          <Route path="data" element={
                            <AdminRoute>
                              <DataManagement />
                            </AdminRoute>
                          } />
                          <Route path="migrate" element={
                            <AdminRoute>
                              <FirebaseMigration />
                            </AdminRoute>
                          } />
                        </Route>

                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                      </Route>
                    </Routes>
                  </ProtectedRoute>
                } 
              />
            </Routes>
        </ThemeProvider>
      </AuthProvider>
    </HashRouter>
  );
}

export default App;