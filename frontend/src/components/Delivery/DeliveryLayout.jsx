import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { Home, Package, Wallet, User } from 'lucide-react';
import { API_BASE, API_URL } from '../../config/api';
import axios from 'axios';
import { io } from 'socket.io-client';
import useDeliveryStore from '../../store/useDeliveryStore';
import { Bell } from 'lucide-react';
import useModal from '../../hooks/useModal';

const DeliveryLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { theme, notifications, unreadCount, setNotifications, addNotification, markAsRead, markAllAsRead } = useDeliveryStore();
  const { openModal } = useModal();

  // Authenticate and fetch profile on layout load
  useEffect(() => {
    const fetchNotifications = async (token) => {
      try {
        const { data } = await axios.get(`${API_BASE}/delivery/notifications`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setNotifications(data);
      } catch (error) {
        console.error('Failed to fetch notifications', error);
      }
    };

    const fetchProfile = async () => {
      const stored = localStorage.getItem('deliveryPartnerInfo');
      if (!stored) {
        navigate('/delivery/login');
        return;
      }

      const parsedInfo = JSON.parse(stored);
      try {
        const { data } = await axios.get(`${API_BASE}/delivery/profile`, {
          headers: { Authorization: `Bearer ${parsedInfo.token}` }
        });
        setPartner(data);
        fetchNotifications(parsedInfo.token);
      } catch (error) {
        console.error('Failed to fetch profile', error);
        localStorage.removeItem('deliveryPartnerInfo');
        navigate('/delivery/login');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  useEffect(() => {
    // Setup socket connection for notifications
    const stored = localStorage.getItem('deliveryPartnerInfo');
    if (stored) {
      const parsedInfo = JSON.parse(stored);
      const socket = io(API_URL);
      
      socket.emit('join', {
        token: parsedInfo.token,
        role: 'delivery',
        partnerId: parsedInfo.id || parsedInfo._id
      });

      socket.on('delivery_assigned', (data) => {
        const newNotif = {
          id: data.orderId + Date.now(), // temp id until refreshed
          title: 'New Delivery Assigned',
          message: data.message,
          type: 'order_assigned',
          isRead: false,
          createdAt: new Date().toISOString()
        };
        addNotification(newNotif);
        // Play notification sound if needed
      });

      return () => socket.disconnect();
    }
  }, []);

  const handleMarkAsRead = async (id) => {
    markAsRead(id);
    try {
      const stored = localStorage.getItem('deliveryPartnerInfo');
      const parsedInfo = JSON.parse(stored);
      await axios.put(`${API_BASE}/delivery/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${parsedInfo.token}` }
      });
    } catch (error) {
      console.error('Failed to mark as read', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    markAllAsRead();
    try {
      const stored = localStorage.getItem('deliveryPartnerInfo');
      const parsedInfo = JSON.parse(stored);
      await axios.put(`${API_BASE}/delivery/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${parsedInfo.token}` }
      });
    } catch (error) {
      console.error('Failed to mark all as read', error);
    }
  };

  useEffect(() => {
    // Apply theme
    const root = document.documentElement;
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const navItems = [
    { path: '/delivery/home', icon: Home, label: 'Home' },
    { path: '/delivery/orders', icon: Package, label: 'Orders' },
    { path: '/delivery/earnings', icon: Wallet, label: 'Earnings' },
    { path: '/delivery/profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 md:pb-0 md:flex transition-colors duration-300">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-screen sticky top-0 shrink-0 z-[100] transition-colors duration-300">
        <div className="p-6 flex items-center justify-between border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-600 text-white rounded-xl flex items-center justify-center font-bold text-xl">
              {partner?.name?.charAt(0) || 'D'}
            </div>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white leading-tight">Partner Hub</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{partner?.status}</p>
            </div>
          </div>
          <div className="relative">
            <button 
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} 
              className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer outline-none"
            >
              <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></span>
              )}
            </button>

            {isNotificationsOpen && (
              <div className="absolute top-12 left-0 md:left-auto md:right-0 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden transform transition-all">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                  <h3 className="font-bold text-gray-900 dark:text-white">Notifications</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 px-2 py-1 rounded-full">{unreadCount} New</span>
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllAsRead} className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white underline">
                        Read All
                      </button>
                    )}
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map(notif => (
                      <div 
                        key={notif.id} 
                        onClick={() => !notif.isRead && handleMarkAsRead(notif.id)}
                        className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-50 dark:border-gray-700 cursor-pointer ${notif.isRead ? 'opacity-60' : 'bg-orange-50/30 dark:bg-orange-900/10'}`}
                      >
                        <p className={`text-sm font-semibold text-gray-900 dark:text-white ${!notif.isRead ? 'font-bold' : ''}`}>{notif.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{notif.message}</p>
                        <p className="text-[10px] text-gray-400 mt-2">{new Date(notif.createdAt).toLocaleString()}</p>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">No notifications yet.</div>
                  )}
                </div>
                <div className="p-3 text-center border-t border-gray-100 dark:border-gray-700">
                  <button onClick={() => setIsNotificationsOpen(false)} className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline">Close</button>
                </div>
              </div>
            )}
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-bold' 
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 font-medium'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-[100vw] md:max-w-none overflow-x-hidden relative">
        <Outlet context={{ partner, setPartner }} />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-[100] pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)] dark:shadow-none transition-colors duration-300">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path) || 
                             (location.pathname === '/delivery/documents' && item.path === '/delivery/profile');
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                  isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                <Icon className={`w-6 h-6 transition-transform ${isActive ? 'scale-110' : 'scale-100'}`} strokeWidth={isActive ? 2.5 : 2} />
                <span className={`text-[10px] font-medium ${isActive ? 'font-bold' : ''}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default DeliveryLayout;
