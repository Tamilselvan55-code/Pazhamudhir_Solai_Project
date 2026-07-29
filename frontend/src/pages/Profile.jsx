import { API_BASE as config_API_BASE, API_URL as config_API_URL } from '../config/api';
import React, { useState, useEffect } from 'react';
import SEO from '../components/SEO/SEO';
import { useNavigate, Link, Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, ShoppingBag, Settings, LogOut } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import useSettingsStore from '../store/useSettingsStore';

import DashboardSidebar from '../components/Profile/DashboardSidebar';
import DashboardOverviewTab from '../components/Profile/DashboardOverviewTab';
import MyOrdersTab from '../components/Profile/MyOrdersTab';
import SavedAddressesTab from '../components/Profile/SavedAddressesTab';
import WishlistTab from '../components/Profile/WishlistTab';
import ProfileDetailsTab from '../components/Profile/ProfileDetailsTab';
import AccountSettingsTab from '../components/Profile/AccountSettingsTab';
import OrderDetailsModal from '../components/Profile/OrderDetailsModal';
import InvoiceModal from '../components/Profile/InvoiceModal';

const API_BASE = config_API_BASE;

const Profile = () => {
  const { userInfo, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const settings = useSettingsStore(s => s.settings);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [invoiceOrder, setInvoiceOrder] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [location]);

  useEffect(() => {
    document.title = 'User Dashboard | Pazhamudhir Solai';
    if (userInfo) {
      fetchOrders();
    }
    const handlePaymentUpdate = () => {
      if (userInfo) fetchOrders();
    };
    const handleOrderUpdate = () => {
      if (userInfo) fetchOrders();
    };
    window.addEventListener('socket_payment_update', handlePaymentUpdate);
    window.addEventListener('socket_order_update', handleOrderUpdate);
    return () => {
      window.removeEventListener('socket_payment_update', handlePaymentUpdate);
      window.removeEventListener('socket_order_update', handleOrderUpdate);
    };
  }, [userInfo]);

  // If not logged in, redirect to login page
  if (!userInfo) {
    return <Navigate to="/login" replace />;
  }

  const fetchOrders = async () => {
    try {
      setOrdersLoading(true);
      const headers = userInfo?.token ? { Authorization: `Bearer ${userInfo.token}` } : {};
      const { data } = await axios.get(`${API_BASE}/orders/user/myorders`, { headers });
      setOrders(data || []);
    } catch (err) {
      // Fallback if protected endpoint fails or older token format
      try {
        const { data } = await axios.get(`${API_BASE}/orders/myorders/${userInfo._id}`);
        setOrders(data || []);
      } catch (e) {
        console.error('Failed to fetch orders', e);
      }
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const totalSpent = orders.reduce((acc, curr) => acc + (curr.totalPrice || 0), 0);
  const activeSelectedOrder = selectedOrder
    ? orders.find(o => o._id === selectedOrder._id) || selectedOrder
    : null;

  return (
    <>
      <SEO title={`My Profile | ${settings?.storeName || 'Tiruchendur Murugan Pazhamudhir Solai'}`} description="View your profile, orders, and wishlist." canonicalPath="/profile" />
      <div className="min-h-screen pb-24 bg-[#f7fdf7]">
      {/* 1. Large Premium Profile Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-500 rounded-b-[2rem] sm:rounded-b-[3rem] p-6 sm:p-10 text-white shadow-md relative mb-6 min-h-[140px] flex items-center pt-8 sm:pt-12">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Avatar */}
            <div className="w-14 h-14 sm:w-20 sm:h-20 bg-white rounded-full flex items-center justify-center text-green-600 text-2xl sm:text-3xl font-bold shadow-sm shrink-0">
              {(userInfo?.fullName || userInfo?.name || 'U').charAt(0).toUpperCase()}
            </div>
            {/* Info */}
            <div className="flex flex-col justify-center">
              <h1 className="text-lg sm:text-2xl font-bold leading-tight">{userInfo?.fullName || userInfo?.name || 'Valued Customer'}</h1>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setActiveTab('profile')}
              className="hidden sm:flex px-5 py-2.5 bg-white text-green-600 rounded-full text-sm font-bold shadow hover:bg-green-50 transition-colors"
            >
              Edit Profile
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className="sm:hidden px-4 py-2 bg-white text-green-600 rounded-full text-xs font-bold shadow hover:bg-green-50 transition-colors"
            >
              Edit
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className="w-9 h-9 sm:w-11 sm:h-11 bg-white rounded-full flex items-center justify-center text-green-600 shadow hover:bg-green-50 transition-colors shrink-0"
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        
        {/* Top Navigation Back Link */}
        <div className="mb-6 flex items-center justify-between">
          {activeTab !== 'dashboard' ? (
            <button 
              onClick={() => setActiveTab('dashboard')} 
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-green-600 font-semibold transition-colors bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Profile
            </button>
          ) : (
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-green-600 font-semibold transition-colors bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Store
            </Link>
          )}
        </div>

        {/* Dashboard Layout: Sidebar | Content */}
        <div className="flex flex-col lg:grid lg:grid-cols-4 gap-4 sm:gap-8 items-start">
          
          {/* Left Sidebar — Desktop only */}
          <div className="hidden lg:block lg:col-span-1">
            <DashboardSidebar
              userInfo={userInfo}
              totalOrders={orders.length}
              totalSpent={totalSpent}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onLogout={handleLogout}
            />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 w-full animate-fadeIn">
            {activeTab === 'dashboard' && (
              <DashboardOverviewTab
                userInfo={userInfo}
                orders={orders}
                onLogout={handleLogout}
                onViewAllOrders={() => setActiveTab('orders')}
                onViewDetails={(order) => setSelectedOrder(order)}
                onViewTab={setActiveTab}
              />
            )}

            {activeTab === 'orders' && (
              <MyOrdersTab
                orders={orders}
                loading={ordersLoading}
                onRefresh={fetchOrders}
                onViewDetails={(order) => setSelectedOrder(order)}
                onDownloadInvoice={(order) => setInvoiceOrder(order)}
              />
            )}

            {activeTab === 'addresses' && <SavedAddressesTab />}

            {activeTab === 'wishlist' && <WishlistTab />}

            {activeTab === 'profile' && <ProfileDetailsTab />}

            {activeTab === 'settings' && <AccountSettingsTab onLogout={handleLogout} />}
          </div>
        </div>

        {/* Mobile Logout Button (Moved from Header) */}
        <div className="lg:hidden mt-8 mb-4">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-red-50 text-red-600 rounded-2xl font-bold shadow-sm border border-red-100 hover:bg-red-100 transition-colors"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>

      {/* Modals */}
      {activeSelectedOrder && (
        <OrderDetailsModal
          order={activeSelectedOrder}
          onClose={() => setSelectedOrder(null)}
          onDownloadInvoice={(order) => { setSelectedOrder(null); setInvoiceOrder(order); }}
        />
      )}

      {invoiceOrder && (
        <InvoiceModal
          order={invoiceOrder}
          userInfo={userInfo}
          onClose={() => setInvoiceOrder(null)}
        />
      )}
      </div>
    </>
  );
};

export default Profile;
