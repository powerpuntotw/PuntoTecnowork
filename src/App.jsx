import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { PageWrapper } from './components/PageWrapper';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './components/Toast';
import { ProtectedRoute } from './components/ProtectedRoute';
import { BrandingProvider } from './contexts/BrandingContext';
import { Login } from './pages/Login';
import { AuthCallback } from './pages/AuthCallback';
import { NotFound } from './components/NotFound';
import { LegalPrivacy } from './pages/LegalPrivacy';
import { LegalTerms } from './pages/LegalTerms';
import { ErrorBoundary } from './components/ErrorBoundary';

// Layouts
import { ClienteLayout } from './layouts/ClienteLayout';
import { LocalLayout } from './layouts/LocalLayout';
import { AdminLayout } from './layouts/AdminLayout';

// Client Pages
import { ClienteDashboard } from './pages/cliente/Dashboard';
import { UploadFiles } from './pages/cliente/UploadFiles';
import { Rewards } from './pages/cliente/Rewards';
import { Orders as ClienteOrders } from './pages/cliente/Orders';
import { Profile } from './pages/cliente/Profile';
import { PointsHistory } from './pages/cliente/PointsHistory';
import { ClienteSupport } from './pages/cliente/Support';

// Local Pages
import { LocalDashboard } from './pages/local/Dashboard';
import { LocalOrders } from './pages/local/Orders';
import { LocalRedemptions, LocalClients } from './pages/local/Redemptions';
import { LocalPrices } from './pages/local/Prices';
import { LocalProfile } from './pages/local/Profile';
import { LocalSupport } from './pages/local/Support';

// Admin Pages
import { AdminDashboard } from './pages/admin/Dashboard';
import { AdminUsers } from './pages/admin/Users';
import { AdminLocations } from './pages/admin/Locations';
import { AdminOrders } from './pages/admin/Orders';
import { AdminRewards } from './pages/admin/Rewards';
import { AdminReports } from './pages/admin/Reports';
import { AdminSupport } from './pages/admin/Support';
import { AdminBranding } from './pages/admin/Branding';
import { AdminMaintenance } from './pages/admin/Maintenance';
import { AdminAuditLogs } from './pages/admin/AuditLogs';
import { AdminProfile } from './pages/admin/Profile';

function AnimatedRoutes() {
    const location = useLocation();
    return (
        <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
                {/* Public */}
                <Route path="/login" element={<PageWrapper><Login /></PageWrapper>} />
                <Route path="/auth/callback" element={<PageWrapper><AuthCallback /></PageWrapper>} />
                <Route path="/privacy" element={<PageWrapper><LegalPrivacy /></PageWrapper>} />
                <Route path="/terms" element={<PageWrapper><LegalTerms /></PageWrapper>} />

                {/* Client Routes */}
                <Route path="/cliente" element={
                    <ProtectedRoute allowedRoles={['client']}>
                        <ClienteLayout />
                    </ProtectedRoute>
                }>
                    <Route index element={<Navigate to="dashboard" replace />} />
                    <Route path="dashboard" element={<ErrorBoundary><PageWrapper><ClienteDashboard /></PageWrapper></ErrorBoundary>} />
                    <Route path="upload" element={<ErrorBoundary><PageWrapper><UploadFiles /></PageWrapper></ErrorBoundary>} />
                    <Route path="rewards" element={<ErrorBoundary><PageWrapper><Rewards /></PageWrapper></ErrorBoundary>} />
                    <Route path="orders" element={<ErrorBoundary><PageWrapper><ClienteOrders /></PageWrapper></ErrorBoundary>} />
                    <Route path="profile" element={<ErrorBoundary><PageWrapper><Profile /></PageWrapper></ErrorBoundary>} />
                    <Route path="points-history" element={<ErrorBoundary><PageWrapper><PointsHistory /></PageWrapper></ErrorBoundary>} />
                    <Route path="support" element={<ErrorBoundary><PageWrapper><ClienteSupport /></PageWrapper></ErrorBoundary>} />
                </Route>

                {/* Local Routes */}
                <Route path="/local" element={
                    <ProtectedRoute allowedRoles={['local']}>
                        <LocalLayout />
                    </ProtectedRoute>
                }>
                    <Route index element={<Navigate to="dashboard" replace />} />
                    <Route path="dashboard" element={<ErrorBoundary><PageWrapper><LocalDashboard /></PageWrapper></ErrorBoundary>} />
                    <Route path="orders" element={<ErrorBoundary><PageWrapper><LocalOrders /></PageWrapper></ErrorBoundary>} />
                    <Route path="clients" element={<ErrorBoundary><PageWrapper><LocalClients /></PageWrapper></ErrorBoundary>} />
                    <Route path="redemptions" element={<ErrorBoundary><PageWrapper><LocalRedemptions /></PageWrapper></ErrorBoundary>} />
                    <Route path="prices" element={<ErrorBoundary><PageWrapper><LocalPrices /></PageWrapper></ErrorBoundary>} />
                    <Route path="support" element={<ErrorBoundary><PageWrapper><LocalSupport /></PageWrapper></ErrorBoundary>} />
                    <Route path="profile" element={<ErrorBoundary><PageWrapper><LocalProfile /></PageWrapper></ErrorBoundary>} />
                </Route>

                {/* Admin Routes */}
                <Route path="/admin" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <AdminLayout />
                    </ProtectedRoute>
                }>
                    <Route index element={<Navigate to="dashboard" replace />} />
                    <Route path="dashboard" element={<ErrorBoundary><PageWrapper><AdminDashboard /></PageWrapper></ErrorBoundary>} />
                    <Route path="users" element={<ErrorBoundary><PageWrapper><AdminUsers /></PageWrapper></ErrorBoundary>} />
                    <Route path="locations" element={<ErrorBoundary><PageWrapper><AdminLocations /></PageWrapper></ErrorBoundary>} />
                    <Route path="orders" element={<ErrorBoundary><PageWrapper><AdminOrders /></PageWrapper></ErrorBoundary>} />
                    <Route path="rewards" element={<ErrorBoundary><PageWrapper><AdminRewards /></PageWrapper></ErrorBoundary>} />
                    <Route path="reports" element={<ErrorBoundary><PageWrapper><AdminReports /></PageWrapper></ErrorBoundary>} />
                    <Route path="support" element={<ErrorBoundary><PageWrapper><AdminSupport /></PageWrapper></ErrorBoundary>} />
                    <Route path="maintenance" element={<ErrorBoundary><PageWrapper><AdminMaintenance /></PageWrapper></ErrorBoundary>} />
                    <Route path="branding" element={<ErrorBoundary><PageWrapper><AdminBranding /></PageWrapper></ErrorBoundary>} />
                    <Route path="audit" element={<ErrorBoundary><PageWrapper><AdminAuditLogs /></PageWrapper></ErrorBoundary>} />
                    <Route path="profile" element={<ErrorBoundary><PageWrapper><AdminProfile /></PageWrapper></ErrorBoundary>} />
                </Route>

                {/* Default */}
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="*" element={<PageWrapper><NotFound /></PageWrapper>} />
            </Routes>
        </AnimatePresence>
    );
}

function App() {
    return (
        <AuthProvider>
            <BrandingProvider>
                <ToastProvider>
                    <ErrorBoundary>
                        <AnimatedRoutes />
                    </ErrorBoundary>
                </ToastProvider>
            </BrandingProvider>
        </AuthProvider>
    );
}

export default App;
