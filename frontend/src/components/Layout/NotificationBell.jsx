import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Bell, Package, Truck, Gift, Heart, ShoppingCart, 
  CreditCard, Shield, User, CheckCircle, Clock
} from 'lucide-react';
import useNotificationStore from '../../store/useNotificationStore';
import useAuthStore from '../../store/useAuthStore';

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

const formatTimeAgo = (dateInput) => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const NotificationBell = () => {
  const { userInfo } = useAuthStore();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const {
    latestNotifications,
    unreadCount,
    fetchLatestNotifications,
    markAsRead,
    markAllAsRead
  } = useNotificationStore();

  useEffect(() => {
    if (userInfo) {
      fetchLatestNotifications();
    }
  }, [userInfo, fetchLatestNotifications]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!userInfo) return null;

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      fetchLatestNotifications();
    }
  };

  const handleNotificationClick = async (notif) => {
    setIsOpen(false);
    if (!notif.isRead) {
      await markAsRead(notif._id);
    }
    
    // Redirect logic
    if (notif.actionUrl) {
      navigate(notif.actionUrl);
    } else if (notif.type === 'order') {
      navigate('/profile?tab=orders');
    } else if (notif.type === 'offer') {
      navigate('/');
    } else if (notif.type === 'security') {
      navigate('/profile');
    } else {
      navigate('/notifications');
    }
  };

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    await markAllAsRead();
  };

  const handleViewAll = () => {
    setIsOpen(false);
    navigate('/notifications');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={handleToggle}
        className="p-2 rounded-xl text-gray-700 hover:text-green-600 transition-colors relative focus:outline-none"
        style={{ background: 'rgba(22,163,74,0.06)' }}
        title="Notifications"
      >
        <Bell size={22} className={unreadCount > 0 ? 'animate-swing' : ''} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: '#fff',
              fontSize: 9,
              fontWeight: 800,
              borderRadius: '50%',
              minWidth: 17,
              height: 17,
              padding: '0 4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #fff',
              boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="absolute right-0 mt-3.5 w-80 bg-white rounded-3xl shadow-2xl border border-gray-100 py-3 z-[1000] overflow-hidden"
          style={{
            transformOrigin: 'top right',
            animation: 'dropdownFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Header */}
          <div className="px-4 pb-2.5 mb-2 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-black text-gray-800">Notifications</h4>
              <p className="text-[10px] text-gray-400 font-semibold mt-0.5">{unreadCount} unread alerts</p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[10px] font-bold text-green-600 hover:text-green-700 transition-colors flex items-center gap-0.5"
              >
                <CheckCircle size={10} />
                Mark all read
              </button>
            )}
          </div>

          {/* List Content */}
          <div className="max-h-[300px] overflow-y-auto divide-y divide-gray-50/50">
            {latestNotifications.length === 0 ? (
              <div className="py-8 text-center px-4 flex flex-col items-center">
                <Bell size={24} className="text-gray-300 mb-2 animate-bounce" />
                <p className="text-[11px] font-bold text-gray-400">No notifications yet</p>
                <p className="text-[9px] text-gray-400 mt-0.5">We'll alert you of activity here.</p>
              </div>
            ) : (
              latestNotifications.map((notif) => {
                const IconComponent = iconMap[notif.icon] || Bell;
                return (
                  <div
                    key={notif._id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`px-4 py-3 flex gap-3 items-start cursor-pointer transition-colors ${
                      notif.isRead ? 'hover:bg-gray-50' : 'bg-green-50/20 hover:bg-green-50/40'
                    }`}
                  >
                    {/* Icon container */}
                    <div className={`p-2 rounded-lg border shrink-0 ${
                      notif.isRead 
                        ? 'bg-gray-50 border-gray-100 text-gray-400' 
                        : 'bg-green-100/30 border-green-100 text-green-600'
                    }`}>
                      <IconComponent size={13} />
                    </div>

                    {/* Meta info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-[11px] truncate leading-tight ${notif.isRead ? 'text-gray-800 font-semibold' : 'text-green-950 font-extrabold'}`}>
                          {notif.title}
                        </p>
                        {!notif.isRead && (
                          <div className="w-1.5 h-1.5 rounded-full bg-green-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-[10px] text-gray-500 truncate mt-1 leading-snug">{notif.message}</p>
                      <span className="text-[9px] text-gray-400 font-semibold flex items-center gap-0.5 mt-1.5">
                        <Clock size={9} />
                        {formatTimeAgo(notif.createdAt || notif.updatedAt)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Actions */}
          <div className="px-3 pt-2.5 mt-2 border-t border-gray-50 flex gap-2">
            <button
              onClick={handleViewAll}
              className="w-full text-center py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-[10px] font-black shadow-md shadow-green-600/10 transition-colors"
            >
              View All Notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
