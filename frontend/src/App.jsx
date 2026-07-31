import { API_BASE as config_API_BASE, API_URL as config_API_URL } from './config/api';
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import axios from 'axios';
import useCartStore from './store/useCartStore';
import useAuthStore from './store/useAuthStore';
import Navbar from './components/Layout/Navbar';
import BottomNav from './components/Layout/BottomNav';
import LocationBanner from './components/Location/LocationBanner';
import CartDrawer from './components/Cart/CartDrawer';

import MaintenancePage from './pages/MaintenancePage';
import InstallPrompt from './components/Layout/InstallPrompt';
import { ModalProvider } from './components/Modal/ModalProvider';
import GuestToastProvider from './components/Layout/GuestToastProvider';
import useSettingsStore from './store/useSettingsStore';
import useNotificationStore from './store/useNotificationStore';
import ProtectedRoute from './components/ProtectedRoute';

// Lazy Loaded Customer Pages
const Home = lazy(() => import('./pages/Home'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Legal = lazy(() => import('./pages/Legal'));
const UserCategories = lazy(() => import('./pages/Categories'));
const Profile = lazy(() => import('./pages/Profile'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const CustomerNotifications = lazy(() => import('./pages/Notifications'));

// Lazy Loaded Admin Pages
const AdminLogin = lazy(() => import('./pages/Admin/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/Admin/AdminDashboard'));
const Users = lazy(() => import('./pages/Admin/Users'));
const Orders = lazy(() => import('./pages/Admin/Orders'));
const Products = lazy(() => import('./pages/Admin/Products'));
const Reports = lazy(() => import('./pages/Admin/Reports'));
const Settings = lazy(() => import('./pages/Admin/Settings'));
const Categories = lazy(() => import('./pages/Admin/Categories'));
const Offers = lazy(() => import('./pages/Admin/Offers'));
const Payments = lazy(() => import('./pages/Admin/Payments'));
const Notifications = lazy(() => import('./pages/Admin/Notifications'));
const Staff = lazy(() => import('./pages/Admin/Staff'));
const DatabaseController = lazy(() => import('./pages/Admin/Database'));
const SystemLogs = lazy(() => import('./pages/Admin/SystemLogs'));
const DeliveryPartners = lazy(() => import('./pages/Admin/DeliveryPartners'));
const AdminDeliveryDashboard = lazy(() => import('./pages/Admin/DeliveryDashboard'));
const AdminDeliveryEarnings = lazy(() => import('./pages/Admin/DeliveryEarnings'));

// Lazy Loaded Delivery Pages
const DeliveryLogin = lazy(() => import('./pages/Delivery/Login'));
const DeliveryLayout = lazy(() => import('./components/Delivery/DeliveryLayout'));
const DeliveryHome = lazy(() => import('./pages/Delivery/Home'));
const DeliveryOrders = lazy(() => import('./pages/Delivery/Orders'));
const DeliveryProfile = lazy(() => import('./pages/Delivery/Profile'));
const DeliveryEarnings = lazy(() => import('./pages/Delivery/Earnings'));
const DeliveryDocuments = lazy(() => import('./pages/Delivery/Documents'));

const AdminRedirectHandler = () => {
  return <Navigate to="/admin/dashboard" replace />;
};

function App() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartNotice, setCartNotice] = useState('');
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isDeliveryRoute = location.pathname.startsWith('/delivery');
  const hideCustomerLayout = isAdminRoute || isDeliveryRoute;

  const initSocketSync = useCartStore((s) => s.initSocketSync);
  const fetchSettings = useSettingsStore((s) => s.fetchSettings);
  const initSettingsSocket = useSettingsStore((s) => s.initSocketSync);
  const settings = useSettingsStore((s) => s.settings);

  useEffect(() => {
    initSocketSync();
    fetchSettings();
    initSettingsSocket();

    const validateStorageCart = async () => {
      const items = useCartStore.getState().cartItems;
      if (!items || items.length === 0) return;
      try {
        const { data } = await axios.post(`${config_API_BASE}/products/validate-cart`, { cartItems: items });
        if (data.success && data.hasChanges) {
          useCartStore.getState().setCartItems(data.validItems);
          setCartNotice('Some unavailable products were removed from your cart.');
        }
      } catch (err) {
        console.error('Failed to validate cart on startup:', err);
      }
    };
    validateStorageCart();
  }, [initSocketSync, fetchSettings, initSettingsSocket]);

  // Global Axios interceptor for comprehensive error handling (Requirement Phase 20)
  useEffect(() => {
    const interceptorId = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (!error.response) {
          setCartNotice('Network Error: Please check your internet connection.');
        } else {
          const { status } = error.response;
          if (status === 401) {
            if (window.location.pathname.startsWith('/admin')) {
              import('./store/useAuthStore').then((store) => {
                store.default.getState().adminLogout();
                window.location.href = '/admin/login?reason=session_expired';
              });
            } else if (window.location.pathname.startsWith('/delivery')) {
              localStorage.removeItem('deliveryPartnerInfo');
              window.location.href = '/delivery/login?reason=session_expired';
            } else {
              useAuthStore.getState().logout();
              setCartNotice('Session expired. Please log in again.');
            }
          } else if (status === 403) {
            setCartNotice('Forbidden: You do not have permission for this action.');
          } else if (status === 404) {
            setCartNotice('Resource not found.');
          } else if (status >= 500) {
            setCartNotice('Server Error: Something went wrong on our end. Please try again.');
          }
        }
        return Promise.reject(error);
      }
    );
    return () => {
      axios.interceptors.response.eject(interceptorId);
    };
  }, []);

  const { userInfo } = useAuthStore();
  const initNotificationSocket = useNotificationStore((s) => s.initSocket);
  const disconnectNotificationSocket = useNotificationStore((s) => s.disconnectSocket);
  const fetchUnreadCount = useNotificationStore((s) => s.fetchUnreadCount);

  useEffect(() => {
    if (userInfo && userInfo._id) {
      initNotificationSocket(userInfo._id);
      fetchUnreadCount();
    } else {
      disconnectNotificationSocket();
    }
  }, [userInfo, initNotificationSocket, disconnectNotificationSocket, fetchUnreadCount]);

  useEffect(() => {
    if (location.pathname === '/cart' || location.search.includes('cart=open')) {
      setIsCartOpen(true);
    }
  }, [location]);

  if (settings?.maintenanceMode && !hideCustomerLayout) {
    return <MaintenancePage />;
  }

  return (
    <ModalProvider>
    <GuestToastProvider />
    <div className="min-h-screen relative" style={{ background: '#f7fdf7' }}>
      {cartNotice && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-orange-600 text-white px-4 sm:px-6 py-3 rounded-xl shadow-xl flex items-center gap-3 text-sm font-semibold animate-bounce max-w-[90vw] sm:max-w-none">
          <span className="line-clamp-2 sm:line-clamp-none">{cartNotice}</span>
          <button onClick={() => setCartNotice('')} className="font-bold text-lg ml-2 hover:opacity-80 shrink-0">✕</button>
        </div>
      )}

      {!hideCustomerLayout && <Navbar toggleCart={() => setIsCartOpen(true)} />}
      {!hideCustomerLayout && <LocationBanner />}

      <main className="flex-1">
        <Suspense fallback={
          <div className="min-h-[60vh] flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-3 border-green-600 border-t-transparent rounded-full animate-spin mb-2"></div>
            <p className="text-xs font-semibold text-gray-500">Loading page...</p>
          </div>
        }>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/cart" element={<Home />} />
            <Route path="/admin" element={<AdminRedirectHandler />} />
            <Route path="/checkout" element={<ProtectedRoute role="customer"><Checkout /></ProtectedRoute>} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/categories" element={<UserCategories />} />
            <Route path="/profile" element={<ProtectedRoute role="customer"><Profile /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute role="customer"><Profile /></ProtectedRoute>} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/notifications" element={<ProtectedRoute role="customer"><CustomerNotifications /></ProtectedRoute>} />
            <Route path="/legal" element={<Legal />} />
            
            <Route path="/delivery/login" element={<DeliveryLogin />} />
            <Route element={<DeliveryLayout />}>
              <Route path="/delivery/dashboard" element={<Navigate to="/delivery/home" replace />} />
              <Route path="/delivery/home" element={<ProtectedRoute role="delivery"><DeliveryHome /></ProtectedRoute>} />
              <Route path="/delivery/orders" element={<ProtectedRoute role="delivery"><DeliveryOrders /></ProtectedRoute>} />
              <Route path="/delivery/earnings" element={<ProtectedRoute role="delivery"><DeliveryEarnings /></ProtectedRoute>} />
              <Route path="/delivery/profile" element={<ProtectedRoute role="delivery"><DeliveryProfile /></ProtectedRoute>} />
              <Route path="/delivery/documents" element={<ProtectedRoute role="delivery"><DeliveryDocuments /></ProtectedRoute>} />
            </Route>
            
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute role="admin"><Users /></ProtectedRoute>} />
            <Route path="/admin/products" element={<ProtectedRoute role="admin"><Products /></ProtectedRoute>} />
            <Route path="/admin/orders" element={<ProtectedRoute role="admin"><Orders /></ProtectedRoute>} />
            <Route path="/admin/reports" element={<ProtectedRoute role="admin"><Reports /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute role="admin"><Settings /></ProtectedRoute>} />
            <Route path="/admin/categories" element={<ProtectedRoute role="admin"><Categories /></ProtectedRoute>} />
            <Route path="/admin/offers" element={<ProtectedRoute role="admin"><Offers /></ProtectedRoute>} />
            <Route path="/admin/payments" element={<ProtectedRoute role="admin"><Payments /></ProtectedRoute>} />
            <Route path="/admin/notifications" element={<ProtectedRoute role="admin"><Notifications /></ProtectedRoute>} />
            <Route path="/admin/staff" element={<ProtectedRoute role="admin"><Staff /></ProtectedRoute>} />
            <Route path="/admin/database" element={<ProtectedRoute role="admin"><DatabaseController /></ProtectedRoute>} />
            <Route path="/admin/system-logs" element={<ProtectedRoute role="admin"><SystemLogs /></ProtectedRoute>} />
            <Route path="/admin/delivery-partners" element={<ProtectedRoute role="admin"><DeliveryPartners /></ProtectedRoute>} />
            <Route path="/admin/delivery-dashboard" element={<ProtectedRoute role="admin"><AdminDeliveryDashboard /></ProtectedRoute>} />
            <Route path="/admin/delivery-earnings" element={<ProtectedRoute role="admin"><AdminDeliveryEarnings /></ProtectedRoute>} />

            <Route path="*" element={<Home />} />
          </Routes>
        </Suspense>
      </main>

      {!hideCustomerLayout && (
        <footer className="bg-white border-t border-gray-100 py-8 px-4 mt-12 pb-24 text-center">
          <div className="max-w-4xl mx-auto space-y-2">
            <h3 className="font-extrabold text-gray-800 text-base">{settings?.storeName || 'Tiruchendur Murugan Pazhamudhir Solai'}</h3>
            <p className="text-gray-500 text-xs">{settings?.storeDescription || 'Fresh fruits, vegetables, groceries and daily essentials.'}</p>
            <div className="flex flex-wrap justify-center items-center gap-x-3 gap-y-2 py-2">
              <a href="/legal?tab=privacy" className="text-xs text-green-600 hover:underline">Privacy Policy</a>
              <span className="text-gray-300 text-xs hidden sm:inline">|</span>
              <a href="/legal?tab=terms" className="text-xs text-green-600 hover:underline">Terms &amp; Conditions</a>
              <span className="text-gray-300 text-xs hidden sm:inline">|</span>
              <a href="/legal?tab=contact" className="text-xs text-green-600 hover:underline">Contact Us</a>
              <span className="text-gray-300 text-xs hidden sm:inline">|</span>
              <a href="/legal?tab=about" className="text-xs text-green-600 hover:underline">About Us</a>
            </div>
            <p className="text-gray-400 text-xs pt-3 border-t border-gray-50 mt-3">
              {settings?.footerContent || `© ${new Date().getFullYear()} ${settings?.websiteName || 'Tiruchendur Murugan Pazhamudhir Solai'}. All rights reserved.`}
            </p>
          </div>
        </footer>
      )}

      {!hideCustomerLayout && <BottomNav />}
      {!hideCustomerLayout && <InstallPrompt />}
      {!hideCustomerLayout && <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />}
    </div>
    </ModalProvider>
  );
}

export default App;
