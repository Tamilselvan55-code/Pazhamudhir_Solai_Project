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
import InstallPrompt from './components/Layout/InstallPrompt';
import { ModalProvider } from './components/Modal/ModalProvider';
import GuestToastProvider from './components/Layout/GuestToastProvider';
import useSettingsStore from './store/useSettingsStore';
import useNotificationStore from './store/useNotificationStore';

// Lazy Loaded Customer Pages
const Home = lazy(() => import('./pages/Home'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
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

const AdminRedirectHandler = () => {
  const { adminInfo, userInfo } = useAuthStore();
  if (userInfo && (!adminInfo || !adminInfo.token)) {
    return <Navigate to="/login?error=access_denied" replace />;
  }
  if (adminInfo && adminInfo.token) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <Navigate to="/admin/login" replace />;
};

function App() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartNotice, setCartNotice] = useState('');
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

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

  // Global Axios interceptor for 401 Unauthorized token errors (Requirement 6)
  useEffect(() => {
    const interceptorId = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          if (window.location.pathname.startsWith('/admin')) {
            import('./store/useAuthStore').then((store) => {
              store.default.getState().adminLogout();
              window.location.href = '/admin/login?reason=session_expired';
            });
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

  if (settings?.maintenanceMode && !isAdminRoute) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f7fdf7] p-6 text-center select-none">
        <div className="w-20 h-20 rounded-[28px] bg-green-500/10 border border-green-500/20 flex items-center justify-center text-3xl mb-5 animate-bounce">
          🛠️
        </div>
        <h1 className="text-xl font-extrabold text-gray-800">Under Maintenance</h1>
        <p className="text-xs text-gray-500 mt-2 max-w-xs leading-relaxed">
          We're currently performing maintenance. Please check back shortly.
        </p>
        <p className="text-[10px] text-gray-400 mt-8">
          © {new Date().getFullYear()} {settings.websiteName || 'Tiruchendur Murugan Pazhamudhir Solai'}
        </p>
      </div>
    );
  }

  return (
    <ModalProvider>
    <GuestToastProvider />
    <div className="min-h-screen relative" style={{ background: '#f7fdf7' }}>
      {cartNotice && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-orange-600 text-white px-6 py-3 rounded-xl shadow-xl flex items-center gap-3 text-sm font-semibold animate-bounce">
          <span>{cartNotice}</span>
          <button onClick={() => setCartNotice('')} className="font-bold text-lg ml-2 hover:opacity-80">✕</button>
        </div>
      )}

      {!isAdminRoute && <Navbar toggleCart={() => setIsCartOpen(true)} />}
      {!isAdminRoute && <LocationBanner />}

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
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/dashboard" element={<Profile />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/notifications" element={<CustomerNotifications />} />
            
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<Users />} />
            <Route path="/admin/products" element={<Products />} />
            <Route path="/admin/orders" element={<Orders />} />
            <Route path="/admin/reports" element={<Reports />} />
            <Route path="/admin/settings" element={<Settings />} />
            <Route path="/admin/categories" element={<Categories />} />
            <Route path="/admin/offers" element={<Offers />} />
            <Route path="/admin/payments" element={<Payments />} />
            <Route path="/admin/notifications" element={<Notifications />} />
            <Route path="/admin/staff" element={<Staff />} />
            <Route path="/admin/database" element={<DatabaseController />} />
            <Route path="/admin/system-logs" element={<SystemLogs />} />

            <Route path="*" element={<Home />} />
          </Routes>
        </Suspense>
      </main>

      {!isAdminRoute && (
        <footer className="bg-white border-t border-gray-100 py-8 px-4 mt-12 pb-24 text-center">
          <div className="max-w-4xl mx-auto space-y-2">
            <h3 className="font-extrabold text-gray-800 text-base">Tiruchendur Murugan Pazhamudhir Solai</h3>
            <p className="text-gray-500 text-xs">Fresh fruits, vegetables, groceries and daily essentials delivered within our service area.</p>
            <p className="text-gray-400 text-xs pt-3 border-t border-gray-50 mt-3">
              © {new Date().getFullYear()} Tiruchendur Murugan Pazhamudhir Solai. All rights reserved. • www.tiruchendurmuruganpazhamudhirsolai.com
            </p>
          </div>
        </footer>
      )}

      {!isAdminRoute && <BottomNav />}
      {!isAdminRoute && <InstallPrompt />}
      {!isAdminRoute && <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />}
    </div>
    </ModalProvider>
  );
}

export default App;
