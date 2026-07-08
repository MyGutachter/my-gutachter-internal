import React from 'react';
import { Toaster } from 'react-hot-toast';
import { Navigate, Route, BrowserRouter as Router, Routes, useLocation, useSearchParams } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import { VideoCall } from './features/video/VideoCall';
import MeetingSummary from './features/video/components/dashboard/MeetingSummary';
import MainLayout from './features/video/layouts/MainLayout';
import ForgotPasswordPage from './features/video/pages/ForgotPasswordPage';
import OrderDeepLinkPage from './features/video/pages/OrderDeepLinkPage';
import ProfilePage from './features/video/pages/ProfilePage';
import ResetPasswordPage from './features/video/pages/ResetPasswordPage';
import SettingsPage from './features/video/pages/SettingsPage';
import TwoFactorSetupPage from './features/video/pages/TwoFactorSetupPage';
import AllScanRecordsPage from './features/video/pages/dashboard/AllScanRecordsPage';
import DashboardPage from './features/video/pages/dashboard/DashboardPage';
import OrderDetailsPage from './features/video/pages/dashboard/OrderDetailsPage';
import './i18n/i18n';
import AdminLoginPage from './pages/AdminLoginPage';
import { AdminPage } from './pages/AdminPage';
import AuthPage from './pages/AuthPage';
import BillingPage from './pages/BillingPage';
import HubPage from './pages/HubPage';
import OrdersOverviewPage from './pages/OrdersOverviewPage';
import ReportFormPage from './pages/ReportFormPage';
import VehicleListPage from './pages/VehicleListPage';
import { useAuthStore } from './store/authStore';
import { useReportStore } from './store/reportStore';
import { useUIStore } from './store/uiStore';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = useAuthStore((state) => state.token);
  const authHydrated = useAuthStore((state) => state._hasHydrated);
  const uiHydrated = useUIStore((state) => state._hasHydrated);
  const reportHydrated = useReportStore((state) => state._hasHydrated);

  if (!authHydrated || !uiHydrated || !reportHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = useAuthStore((state) => state.token);
  const role = useAuthStore((state) => state.role);
  const authHydrated = useAuthStore((state) => state._hasHydrated);
  const uiHydrated = useUIStore((state) => state._hasHydrated);
  const reportHydrated = useReportStore((state) => state._hasHydrated);

  if (!authHydrated || !uiHydrated || !reportHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!token || role !== 'ADMIN') {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

/** Redirect that carries the original query string across to the new path. */
const RedirectPreserve: React.FC<{ to: string }> = ({ to }) => {
  const location = useLocation();
  return <Navigate to={`${to}${location.search}`} replace />;
};

const HomeRoute: React.FC = () => {
  const [searchParams] = useSearchParams();
  const caseNumber = searchParams.get('caseNumber');
  const role = useAuthStore((state) => state.role);
  const isVideoxpert = useAuthStore((state) => state.isVideoxpert);

  // Deep-link into a specific order → jump straight to the relevant app,
  // bypassing the hub. Video-flow SSO tokens carry isVideoxpert=true.
  if (caseNumber) {
    if (isVideoxpert) {
      return <Navigate to={`/video/order/${encodeURIComponent(caseNumber)}`} replace />;
    }
    return <Navigate to={`/report?caseNumber=${caseNumber}`} replace />;
  }

  // Report-only roles skip the chooser.
  if (role === 'ADMIN') {
    return <Navigate to="/report/admin" replace />;
  }
  if (role === 'ACCOUNTING') {
    return <Navigate to="/report/billing" replace />;
  }
  // Experts/dispatch can use either app → let them pick.
  return <Navigate to="/hub" replace />;
};

const App: React.FC = () => {
  const token = useAuthStore((state) => state.token);
  const fetchGlobalConfig = useReportStore((state) => state.fetchGlobalConfig);
  const configFetchedRef = React.useRef(false);

  React.useEffect(() => {
    if (token) {
      if (configFetchedRef.current) return;
      configFetchedRef.current = true;
      fetchGlobalConfig();
    } else {
      configFetchedRef.current = false;
    }
  }, [token, fetchGlobalConfig]);

  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      <Router>
        <ScrollToTop />
        <Routes>
          {/* ---- Shared / public ---- */}
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/login" element={<AdminLoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomeRoute />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hub"
            element={
              <ProtectedRoute>
                <HubPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ProfilePage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <SettingsPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* ---- Vehicle Report app (/report/*) ---- */}
          <Route
            path="/report"
            element={
              <ProtectedRoute>
                <OrdersOverviewPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/report/form"
            element={
              <ProtectedRoute>
                <ReportFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/report/list"
            element={
              <ProtectedRoute>
                <VehicleListPage onBack={() => window.history.back()} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/report/admin"
            element={
              <AdminRoute>
                <AdminPage />
              </AdminRoute>
            }
          />
          <Route
            path="/report/billing"
            element={
              <ProtectedRoute>
                <BillingPage />
              </ProtectedRoute>
            }
          />

          {/* ---- Video Expert app (/video/*) — faithful port wrapped in MainLayout ---- */}
          <Route
            path="/video"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <DashboardPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          {/* Video call — organizer/expert side (auth in the WS join message). Full-screen, no shell. */}
          <Route
            path="/video/call"
            element={
              <ProtectedRoute>
                <VideoCall />
              </ProtectedRoute>
            }
          />
          <Route
            path="/video/scan-records"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <AllScanRecordsPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/video/meeting-summary/:roomId"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <MeetingSummary />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/video/order/:orderId"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <OrderDetailsPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/video/2fa-setup"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <TwoFactorSetupPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          {/* Order deep-link (?apikey= optional) — resolves auth then opens the order. The
              id-less form is OMT's "open the video app" link with no specific order (T7.9);
              the same component falls back to /video (or /) when orderId is absent. */}
          <Route path="/order/:orderId" element={<OrderDeepLinkPage />} />
          <Route path="/order" element={<OrderDeepLinkPage />} />
          {/* Guest side — PUBLIC (joins as role:"guest", no JWT). */}
          <Route path="/guest-video" element={<VideoCall />} />

          {/* ---- Back-compat redirects (old flat paths / bookmarks) ---- */}
          <Route path="/orders" element={<RedirectPreserve to="/report" />} />
          <Route path="/list" element={<Navigate to="/report/list" replace />} />
          <Route path="/admin" element={<Navigate to="/report/admin" replace />} />
          <Route path="/billing" element={<Navigate to="/report/billing" replace />} />
          <Route path="/video-call" element={<RedirectPreserve to="/video/call" />} />
        </Routes>
      </Router>
    </>
  );
};

export default App;
