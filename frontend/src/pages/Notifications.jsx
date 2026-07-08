import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Bell, Package, Truck, Gift, Heart, ShoppingCart, 
  CreditCard, Shield, User, Search, Trash2, CheckCircle, 
  ArrowLeft, SlidersHorizontal, Settings, AlertCircle
} from 'lucide-react';
import useNotificationStore from '../store/useNotificationStore';
import useAuthStore from '../store/useAuthStore';

const iconMap = {
  package: Package,
  truck: Truck,
  gift: Gift,
  heart: Heart,
  'shopping-cart': ShoppingCart,
  'credit-card': CreditCard,
  shield: Shield,
  user: User,
  bell: Bell
};

const categoryTabs = [
  { id: 'all', label: 'All', icon: Bell },
  { id: 'orders', label: 'Orders', icon: Package },
  { id: 'offers', label: 'Offers', icon: Gift },
  { id: 'delivery', label: 'Delivery', icon: Truck },
  { id: 'account', label: 'Account', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'system', label: 'System', icon: AlertCircle }
];

const priorityColors = {
  high: 'bg-red-50 text-red-700 border-red-100',
  normal: 'bg-green-50 text-green-700 border-green-100',
  low: 'bg-gray-50 text-gray-700 border-gray-100'
};

const Notifications = () => {
  const { userInfo } = useAuthStore();
  const navigate = useNavigate();

  const {
    notifications,
    unreadCount,
    total,
    page,
    totalPages,
    loading,
    settings,
    fetchNotifications,
    fetchSettings,
    updateSettings,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    initSocket
  } = useNotificationStore();

  const [activeView, setActiveView] = useState('inbox'); // 'inbox' or 'settings'
  const [selectedTab, setSelectedTab] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'read', 'unread'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'unread'
  const [currentPage, setCurrentPage] = useState(1);

  // Prefs toggles state
  const [prefs, setPrefs] = useState({
    orderNotifications: true,
    offerNotifications: true,
    deliveryNotifications: true,
    securityNotifications: true,
    promotionalNotifications: true,
    generalNotifications: true
  });

  useEffect(() => {
    document.title = 'Notifications | Tiruchendur Murugan Pazhamudhir Solai';
    if (!userInfo) {
      navigate('/login');
      return;
    }
    initSocket(userInfo._id);
    fetchSettings();
  }, [userInfo, initSocket, fetchSettings, navigate]);

  useEffect(() => {
    if (settings) {
      setPrefs({
        orderNotifications: settings.orderNotifications ?? true,
        offerNotifications: settings.offerNotifications ?? true,
        deliveryNotifications: settings.deliveryNotifications ?? true,
        securityNotifications: settings.securityNotifications ?? true,
        promotionalNotifications: settings.promotionalNotifications ?? true,
        generalNotifications: settings.generalNotifications ?? true
      });
    }
  }, [settings]);

  // Fetch notifications on filter/page change
  useEffect(() => {
    if (userInfo && activeView === 'inbox') {
      fetchNotifications({
        page: currentPage,
        limit: 10,
        type: selectedTab,
        status: filterStatus,
        search: searchQuery,
        sort: sortBy
      });
    }
  }, [userInfo, activeView, selectedTab, filterStatus, sortBy, currentPage, fetchNotifications]);

  // Debounced search trigger
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (userInfo && activeView === 'inbox') {
        setCurrentPage(1);
        fetchNotifications({
          page: 1,
          limit: 10,
          type: selectedTab,
          status: filterStatus,
          search: searchQuery,
          sort: sortBy
        });
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const handleTabChange = (tabId) => {
    setSelectedTab(tabId);
    setCurrentPage(1);
  };

  const handleStatusChange = (status) => {
    setFilterStatus(status);
    setCurrentPage(1);
  };

  const handleSortChange = (sort) => {
    setSortBy(sort);
    setCurrentPage(1);
  };

  const handleTogglePref = async (key) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    await updateSettings(updated);
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      await markAsRead(notif._id);
    }
    
    // Redirect logic based on notification type/actionUrl
    if (notif.actionUrl) {
      navigate(notif.actionUrl);
    } else if (notif.type === 'order') {
      navigate('/profile?tab=orders');
    } else if (notif.type === 'offer') {
      navigate('/');
    } else if (notif.type === 'security') {
      navigate('/profile');
    }
  };

  return (
    <div className="min-h-screen pb-24 pt-8 px-4 sm:px-6 lg:px-8" style={{ background: '#f7fdf7' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header Block */}
        <div className="mb-6 flex items-center justify-between">
          <Link to="/profile" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-green-600 font-semibold transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveView('inbox')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeView === 'inbox'
                  ? 'bg-green-600 text-white shadow-md shadow-green-600/10'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
              }`}
            >
              Inbox ({unreadCount})
            </button>
            <button
              onClick={() => setActiveView('settings')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeView === 'settings'
                  ? 'bg-green-600 text-white shadow-md shadow-green-600/10'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
              }`}
            >
              <Settings size={13} />
              Settings
            </button>
          </div>
        </div>

        {/* Dedicated Notifications View */}
        {activeView === 'inbox' && (
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-50 pb-6 mb-6">
              <div>
                <h1 className="text-2xl font-black text-gray-800">Notifications</h1>
                <p className="text-xs text-gray-500 mt-1">
                  You have {unreadCount} unread notifications out of {total} total alerts.
                </p>
              </div>

              {/* Top Action Toggles */}
              <div className="flex items-center gap-2">
                <button
                  onClick={markAllAsRead}
                  disabled={unreadCount === 0}
                  className="px-3.5 py-2 rounded-xl border border-gray-100 text-xs font-bold text-gray-600 hover:text-green-600 hover:bg-green-50/30 transition-all flex items-center gap-1 disabled:opacity-40 disabled:pointer-events-none"
                >
                  <CheckCircle size={13} />
                  Mark All Read
                </button>
                <button
                  onClick={clearAll}
                  disabled={total === 0}
                  className="px-3.5 py-2 rounded-xl border border-gray-100 text-xs font-bold text-red-600 hover:bg-red-50/50 transition-all flex items-center gap-1 disabled:opacity-40 disabled:pointer-events-none"
                >
                  <Trash2 size={13} />
                  Clear All
                </button>
              </div>
            </div>

            {/* Filters Bar: Search & Status Selector */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-6">
              {/* Search */}
              <div className="relative md:col-span-6">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search notification messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-100 text-xs text-gray-800 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
                />
              </div>

              {/* Status Selectors */}
              <div className="flex items-center gap-2 md:col-span-3">
                <SlidersHorizontal size={13} className="text-gray-400 shrink-0" />
                <select
                  value={filterStatus}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-100 text-xs font-semibold text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20"
                >
                  <option value="all">All Alerts</option>
                  <option value="unread">Unread Only</option>
                  <option value="read">Read Only</option>
                </select>
              </div>

              {/* Sorting Selectors */}
              <div className="md:col-span-3">
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-100 text-xs font-semibold text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="unread">Unread First</option>
                </select>
              </div>
            </div>

            {/* Category Swiper Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 border-b border-gray-50 no-scrollbar">
              {categoryTabs.map((tab) => {
                const TabIcon = tab.icon;
                const isActive = selectedTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-green-500 text-white shadow-md shadow-green-500/10'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100/70 border border-transparent'
                    }`}
                  >
                    <TabIcon size={13} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Notifications Feed */}
            {loading ? (
              // Skeletons
              <div className="space-y-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-20 bg-gray-50 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              // Empty State
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-[22px] bg-green-500/10 flex items-center justify-center mb-4">
                  <Bell className="w-8 h-8 text-green-600 animate-pulse" />
                </div>
                <h3 className="text-base font-extrabold text-gray-800">No notifications yet</h3>
                <p className="text-xs text-gray-400 mt-1 max-w-sm">
                  We'll notify you here when something important happens, like updates on your orders or promotional offers.
                </p>
              </div>
            ) : (
              // List Content
              <div className="space-y-3">
                {notifications.map((notif) => {
                  const NotifIcon = iconMap[notif.icon] || Bell;
                  return (
                    <div
                      key={notif._id}
                      className={`group border rounded-2xl p-4 flex gap-4 items-start transition-all relative ${
                        notif.isRead 
                          ? 'bg-white hover:bg-gray-50 border-gray-100' 
                          : 'bg-green-50/30 hover:bg-green-50/50 border-green-100/50'
                      }`}
                    >
                      {/* Read Indicator dot */}
                      {!notif.isRead && (
                        <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-green-600 shadow" />
                      )}

                      {/* Icon */}
                      <div className={`p-2.5 rounded-xl border shrink-0 ${
                        notif.isRead 
                          ? 'bg-gray-50 border-gray-100 text-gray-500' 
                          : 'bg-green-100/40 border-green-100 text-green-600'
                      }`}>
                        <NotifIcon size={16} />
                      </div>

                      {/* Info body */}
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleNotificationClick(notif)}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className={`text-xs font-bold leading-tight ${notif.isRead ? 'text-gray-800' : 'text-green-950 font-black'}`}>
                            {notif.title}
                          </h4>
                          {notif.priority && notif.priority !== 'normal' && (
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border capitalize shrink-0 ${priorityColors[notif.priority]}`}>
                              {notif.priority}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{notif.message}</p>
                        <span className="text-[10px] text-gray-400 font-semibold block mt-2">
                          {new Date(notif.createdAt || notif.updatedAt).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notif.isRead && (
                          <button
                            onClick={() => markAsRead(notif._id)}
                            title="Mark as Read"
                            className="p-1.5 rounded-lg border border-gray-100 text-gray-400 hover:text-green-600 hover:bg-white hover:shadow transition-all"
                          >
                            <CheckCircle size={13} />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notif._id)}
                          title="Delete notification"
                          className="p-1.5 rounded-lg border border-gray-100 text-gray-400 hover:text-red-500 hover:bg-white hover:shadow transition-all"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-50 pt-6 mt-6">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="px-4 py-2 border border-gray-100 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                >
                  Previous
                </button>
                <span className="text-xs text-gray-500 font-semibold">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="px-4 py-2 border border-gray-100 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* Dedicated Settings View */}
        {activeView === 'settings' && (
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 md:p-8">
            <div className="border-b border-gray-50 pb-6 mb-6">
              <h1 className="text-2xl font-black text-gray-800">Notification Settings</h1>
              <p className="text-xs text-gray-500 mt-1">
                Customize how and when you receive notifications from Tiruchendur Murugan Pazhamudhir Solai.
              </p>
            </div>

            {/* Toggle Switches */}
            <div className="space-y-6">
              {[
                {
                  key: 'orderNotifications',
                  title: 'Order Status updates',
                  description: 'Receive real-time updates when your orders are placed, accepted, packed, or completed.'
                },
                {
                  key: 'deliveryNotifications',
                  title: 'Delivery Updates',
                  description: 'Stay updated when a delivery partner is assigned, out for delivery, delayed, or when OTP triggers.'
                },
                {
                  key: 'offerNotifications',
                  title: 'Offers & Discounts',
                  description: 'Get notified of festival sales, custom coupon codes, cashback offers, and seasonal discounts.'
                },
                {
                  key: 'securityNotifications',
                  title: 'Security & Account Alerts',
                  description: 'Critical notifications about logins, password resets, email updates, and verification OTPs.'
                },
                {
                  key: 'promotionalNotifications',
                  title: 'Promotions & Back-in-Stock Alerts',
                  description: 'Get notified when limited-time products or items in your wishlist come back in stock.'
                },
                {
                  key: 'generalNotifications',
                  title: 'General & Store Announcements',
                  description: 'Holiday schedules, maintenance alerts, website features, and new arrivals notices.'
                }
              ].map((item) => (
                <div key={item.key} className="flex items-start justify-between gap-4 p-4 border border-gray-50 rounded-2xl hover:bg-gray-50/50 transition-colors">
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-gray-800">{item.title}</h3>
                    <p className="text-[11px] text-gray-400 leading-relaxed max-w-lg">{item.description}</p>
                  </div>
                  
                  {/* Premium Switch */}
                  <button
                    onClick={() => handleTogglePref(item.key)}
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none shrink-0 ${
                      prefs[item.key] ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-sm transform duration-200 ease-out ${
                        prefs[item.key] ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>

            {/* Back Button */}
            <div className="border-t border-gray-50 pt-6 mt-8 flex justify-end">
              <button
                onClick={() => setActiveView('inbox')}
                className="px-6 py-2.5 rounded-xl bg-green-600 text-white text-xs font-bold hover:bg-green-700 shadow-md shadow-green-600/10 transition-colors"
              >
                Go back to Inbox
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
