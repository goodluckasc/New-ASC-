import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SnackbarProvider } from 'notistack';
import { CssBaseline } from '@mui/material';
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/Common/ProtectedRoute';
import LoadingScreen from './components/Common/LoadingScreen';
import Login from './pages/Dashboard/Login';
import Dashboard from './pages/Dashboard/Dashboard';

import VehicleList from './pages/Vehicles/VehicleList';
import JobCardList from './pages/JobCards/JobCardList';
import JobCardForm from './pages/JobCards/JobCardForm';
import ItemList from './pages/Inventory/ItemList';
import StockAdjustment from './pages/Inventory/StockAdjustment';
import SupplierList from './pages/Suppliers/SupplierList';
import PurchaseList from './pages/Purchases/PurchaseList';
import PurchaseForm from './pages/Purchases/PurchaseForm';
import InvoiceList from './pages/Billing/InvoiceList';
import InvoiceForm from './pages/Billing/InvoiceForm';
import PaymentList from './pages/Payments/PaymentList';
import DeliveryList from './pages/Delivery/DeliveryList';
import DeliveryForm from './pages/Delivery/DeliveryForm';
import CallList from './pages/Calls/CallList';
import FollowUpList from './pages/Followups/FollowUpList';
import Reports from './pages/Reports/Reports';
import Settings from './pages/Settings/Settings';
import Setup from './pages/Settings/Setup';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/setup" element={<Setup />} />
      <Route
        path="/"
        element={
          user ? (
            <Layout>
              <Outlet />
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<ProtectedRoute requiredModule="dashboard"><Dashboard /></ProtectedRoute>} />
        <Route path="customers" element={<Navigate to="/vehicles" replace />} />
        <Route path="vehicles" element={<ProtectedRoute requiredModule="vehicles"><VehicleList /></ProtectedRoute>} />
        <Route path="jobcards" element={<ProtectedRoute requiredModule="jobCards"><JobCardList /></ProtectedRoute>} />
        <Route path="jobcards/new" element={<ProtectedRoute requiredModule="jobCards" requiredAction="create"><JobCardForm /></ProtectedRoute>} />
        <Route path="jobcards/:id" element={<ProtectedRoute requiredModule="jobCards"><JobCardForm /></ProtectedRoute>} />
        <Route path="jobcards/:id/edit" element={<ProtectedRoute requiredModule="jobCards" requiredAction="update"><JobCardForm /></ProtectedRoute>} />
        <Route path="inventory" element={<ProtectedRoute requiredModule="inventory"><ItemList /></ProtectedRoute>} />
        <Route path="inventory/adjustments" element={<ProtectedRoute requiredModule="stockAdjustments"><StockAdjustment /></ProtectedRoute>} />
        <Route path="suppliers" element={<ProtectedRoute requiredModule="suppliers"><SupplierList /></ProtectedRoute>} />
        <Route path="purchases" element={<ProtectedRoute requiredModule="purchases"><PurchaseList /></ProtectedRoute>} />
        <Route path="purchases/new" element={<ProtectedRoute requiredModule="purchases" requiredAction="create"><PurchaseForm /></ProtectedRoute>} />
        <Route path="billing" element={<ProtectedRoute requiredModule="invoices"><InvoiceList /></ProtectedRoute>} />
        <Route path="billing/new" element={<ProtectedRoute requiredModule="invoices" requiredAction="create"><InvoiceForm /></ProtectedRoute>} />
        <Route path="billing/:id" element={<ProtectedRoute requiredModule="invoices"><InvoiceList /></ProtectedRoute>} />
        <Route path="payments" element={<ProtectedRoute requiredModule="payments"><PaymentList /></ProtectedRoute>} />
        <Route path="delivery" element={<ProtectedRoute requiredModule="deliveries"><DeliveryList /></ProtectedRoute>} />
        <Route path="delivery/new" element={<ProtectedRoute requiredModule="deliveries" requiredAction="create"><DeliveryForm /></ProtectedRoute>} />
        <Route path="calls" element={<ProtectedRoute requiredModule="calls"><CallList /></ProtectedRoute>} />
        <Route path="followups" element={<ProtectedRoute requiredModule="followUps"><FollowUpList /></ProtectedRoute>} />
        <Route path="reports" element={<ProtectedRoute requiredModule="reports"><Reports /></ProtectedRoute>} />
        <Route path="settings" element={<ProtectedRoute requiredModule="settings"><Settings /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <CssBaseline />
        <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </SnackbarProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}