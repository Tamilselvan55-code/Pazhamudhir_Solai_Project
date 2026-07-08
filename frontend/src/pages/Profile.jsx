import React, { useState, useEffect } from 'react';
import { useNavigate, Link, Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';

import DashboardSidebar from '../components/Profile/DashboardSidebar';
import DashboardOverviewTab from '../components/Profile/DashboardOverviewTab';
import MyOrdersTab from '../components/Profile/MyOrdersTab';
import SavedAddressesTab from '../components/Profile/SavedAddressesTab';
import WishlistTab from '../components/Profile/WishlistTab';
import ProfileDetailsTab from '../components/Profile/ProfileDetailsTab';
import AccountSettingsTab from '../components/Profile/AccountSettingsTab';
import OrderDetailsModal from '../components/Profile/OrderDetailsModal';
import InvoiceModal from '../components/Profile/InvoiceModal';

const API_BASE = 'http://localhost:5000/api';

const Profile = () => {
  const { userInfo, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

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
    document.title = 'User Dashboard | Tiruchendur Murugan Pazhamudhir Solai';
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
    <div className="min-h-screen pb-24 pt-8 px-4 sm:px-6 lg:px-8" style={{ background: '#f7fdf7' }}>
      <div className="max-w-7xl mx-auto">
        
        {/* Top Navigation Back Link */}
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-green-600 font-semibold transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Store
          </Link>
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-green-600 hover:text-green-700 transition-colors">
            <ShoppingBag className="w-4 h-4" /> Continue Shopping
          </Link>
        </div>

        {/* Dashboard Layout: Left Sidebar | Main Dashboard Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          
          {/* Left Sidebar (Col 1) */}
          <div className="lg:col-span-1">
            <DashboardSidebar
              userInfo={userInfo}
              totalOrders={orders.length}
              totalSpent={totalSpent}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onLogout={handleLogout}
            />
          </div>

          {/* Main Dashboard Content (Col 3) */}
          <div className="lg:col-span-3">
            {activeTab === 'dashboard' && (
              <DashboardOverviewTab
                userInfo={userInfo}
                orders={orders}
                onLogout={handleLogout}
                onViewAllOrders={() => setActiveTab('orders')}
                onViewDetails={(order) => setSelectedOrder(order)}
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
  );
};

export default Profile;
