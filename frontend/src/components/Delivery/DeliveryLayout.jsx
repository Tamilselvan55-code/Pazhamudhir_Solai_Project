import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { Home, Package, Wallet, User, Bell, X, Sun, Moon, ChevronRight, Truck, LogOut } from 'lucide-react';
import { API_BASE, API_URL } from '../../config/api';
import axios from 'axios';
import { io } from 'socket.io-client';
import useDeliveryStore from '../../store/useDeliveryStore';
import useModal from '../../hooks/useModal';

const DeliveryLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { theme, setTheme, notifications, unreadCount, setNotifications, addNotification, markAsRead, markAllAsRead } = useDeliveryStore();
  const { openModal } = useModal();

  // ── Apply theme to document root whenever it changes ──────────────────────
  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = (t) => {
      if (t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };
    applyTheme(theme);

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e) => applyTheme('system');
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [theme]);

  // ── Authenticate and fetch profile on layout load ─────────────────────────
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

  // ── Socket.io for real-time notifications ─────────────────────────────────
  useEffect(() => {
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
          id: data.orderId + Date.now(),
          title: 'New Delivery Assigned',
          message: data.message,
          type: 'order_assigned',
          isRead: false,
          createdAt: new Date().toISOString()
        };
        addNotification(newNotif);
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

  const handleLogout = () => {
    localStorage.removeItem('deliveryPartnerInfo');
    navigate('/delivery/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center transition-colors duration-300">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Loading Partner Hub...</p>
        </div>
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20 md:pb-0 md:flex transition-colors duration-300">
      
      {/* ── Desktop Sidebar ─────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 h-screen sticky top-0 shrink-0 z-[100] transition-colors duration-300 shadow-sm">
        
        {/* Sidebar header */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-700 text-white rounded-2xl flex items-center justify-center font-black text-lg shadow-md shadow-green-500/30">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-gray-900 dark:text-white leading-tight text-sm">Partner Hub</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Delivery Management</p>
            </div>
          </div>
        </div>

        {/* Partner quick card */}
        <div className="mx-3 mt-4 mb-2 p-3 bg-gray-50 dark:bg-gray-800/70 rounded-2xl border border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center gap-3">
            {partner?.profileImage ? (
              <img src={partner.profileImage} alt={partner.name} className="w-10 h-10 rounded-xl object-cover ring-2 ring-green-500/20" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-green-600 text-white font-black flex items-center justify-center text-base shadow-sm">
                {partner?.name?.charAt(0).toUpperCase() || 'P'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-bold text-gray-900 dark:text-white text-sm truncate">{partner?.name || 'Partner'}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${partner?.status === 'Available' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                <span className={`text-xs font-semibold ${partner?.status === 'Available' ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                  {partner?.status === 'Available' ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <p className="text-[9px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest px-2 mb-3">Navigation</p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-bold shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/70 font-medium hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Icon className={`w-4.5 h-4.5 flex-shrink-0 transition-transform ${isActive ? '' : 'group-hover:scale-110'}`} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-sm">{item.label}</span>
                {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-50" />}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar footer actions */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-800 space-y-1">
          {/* Notifications button */}
          <button
            onClick={() => setIsNotificationsOpen(true)}
            className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/70 hover:text-gray-900 dark:hover:text-white transition-all font-medium text-sm"
          >
            <div className="relative">
              <Bell className="w-4.5 h-4.5" strokeWidth={2} />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full text-white text-[8px] font-black flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </div>
            <span>Notifications</span>
            {unreadCount > 0 && <span className="ml-auto bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-red-100 dark:border-red-900/30">{unreadCount} new</span>}
          </button>

          {/* Theme toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/70 hover:text-gray-900 dark:hover:text-white transition-all font-medium text-sm"
          >
            {theme === 'dark' ? <Sun className="w-4.5 h-4.5" strokeWidth={2} /> : <Moon className="w-4.5 h-4.5" strokeWidth={2} />}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all font-medium text-sm"
          >
            <LogOut className="w-4.5 h-4.5" strokeWidth={2} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Notifications Slide Panel ────────────────────────────────── */}
      {isNotificationsOpen && (
        <div className="fixed inset-0 z-[200] overflow-hidden" aria-labelledby="notif-panel-title" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity" onClick={() => setIsNotificationsOpen(false)} />
          <div className="fixed inset-y-0 right-0 max-w-sm w-full flex">
            <div className="w-screen max-w-sm bg-white dark:bg-gray-900 shadow-2xl flex flex-col h-full transition-colors duration-300 border-l border-gray-100 dark:border-gray-800">
              
              {/* Panel header */}
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-orange-50 dark:bg-orange-900/20 rounded-xl flex items-center justify-center">
                    <Bell className="w-4 h-4 text-orange-500" />
                  </div>
                  <h2 className="text-lg font-black text-gray-900 dark:text-white" id="notif-panel-title">Notifications</h2>
                  {unreadCount > 0 && (
                    <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 py-0.5 px-2 rounded-full text-xs font-black">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllAsRead} className="text-xs font-bold text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors px-2 py-1 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/10">
                      Mark all read
                    </button>
                  )}
                  <button
                    type="button"
                    className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    onClick={() => setIsNotificationsOpen(false)}
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>

              {/* Panel body */}
              <div className="flex-1 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800/80">
                {notifications.length > 0 ? (
                  notifications.map(notif => (
                    <div
                      key={notif.id}
                      onClick={() => !notif.isRead && handleMarkAsRead(notif.id)}
                      className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer relative group ${notif.isRead ? '' : 'bg-orange-50/40 dark:bg-orange-900/5'}`}
                    >
                      {!notif.isRead && (
                        <div className="absolute top-4 right-4 w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                      )}
                      <div className="flex gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${notif.isRead ? 'bg-gray-100 dark:bg-gray-800' : 'bg-orange-100 dark:bg-orange-900/30'}`}>
                          <Bell className={`w-3.5 h-3.5 ${notif.isRead ? 'text-gray-400' : 'text-orange-500'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${!notif.isRead ? 'font-black text-gray-900 dark:text-white' : 'font-semibold text-gray-600 dark:text-gray-300'}`}>
                            {notif.title}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed line-clamp-2">{notif.message}</p>
                          <p className="text-[10px] font-bold text-gray-300 dark:text-gray-600 mt-2">{new Date(notif.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8 gap-4">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center">
                      <Bell className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-700 dark:text-gray-300">You're all caught up!</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">New delivery assignments will appear here.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content Area ────────────────────────────────────────── */}
      <main className="flex-1 w-full max-w-[100vw] md:max-w-none overflow-x-hidden relative">
        <Outlet context={{ partner, setPartner }} />
      </main>

      {/* ── Mobile Bottom Navigation ─────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[100] transition-colors duration-300">
        {/* Glassmorphism background */}
        <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-t border-gray-200/80 dark:border-gray-800/80 shadow-[0_-4px_30px_rgba(0,0,0,0.08)]">
          <div className="flex justify-around items-center h-16 px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path) ||
                               (location.pathname === '/delivery/documents' && item.path === '/delivery/profile');
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center justify-center flex-1 h-full gap-1 relative transition-all duration-200 ${
                    isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                >
                  {isActive && (
                    <span className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-8 bg-green-500/10 dark:bg-green-400/10 rounded-xl" />
                  )}
                  <Icon className={`w-5.5 h-5.5 relative z-10 transition-all ${isActive ? 'scale-110' : 'scale-100'}`} strokeWidth={isActive ? 2.5 : 2} />
                  <span className={`text-[10px] relative z-10 ${isActive ? 'font-black' : 'font-medium'}`}>
                    {item.label}
                  </span>
                  {item.path === '/delivery/orders' && unreadCount > 0 && (
                    <span className="absolute top-2 right-1/4 translate-x-2 w-4 h-4 bg-red-500 rounded-full text-white text-[8px] font-black flex items-center justify-center z-20">{unreadCount > 9 ? '9+' : unreadCount}</span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
};

export default DeliveryLayout;
