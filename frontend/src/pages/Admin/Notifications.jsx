import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  Bell, BellOff, ShoppingCart, UserPlus, CheckCircle, XCircle,
  Search, Filter, Trash2, Check, CheckCheck, RefreshCw, Loader2,
  Clock, Phone, FileText, Package, IndianRupee, Eye, X, AlertCircle
} from 'lucide-react';
import { io as socketIO } from 'socket.io-client';
import axios from 'axios';
import AdminLayout from '../../components/Admin/AdminLayout';
import useAuthStore from '../../store/useAuthStore';
import useModal from '../../hooks/useModal';
import { formatCurrency } from '../../utils/currency';

const API_BASE = 'http://localhost:5000/api/admin';
const SOCKET_URL = 'http://localhost:5000';

// ── Helpers ──────────────────────────────────────────────────────────────────

const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const date = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  return { date, time };
};

const isToday = (dateStr) => {
  const d = new Date(dateStr);
  const now = new Date();
  return d.toDateString() === now.toDateString();
};

const isWithinDays = (dateStr, days) => {
  const d = new Date(dateStr);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return d >= cutoff;
};

// ── Type Config ──────────────────────────────────────────────────────────────

const getTypeConfig = (type) => {
  switch (type) {
    case 'order':
      return { icon: ShoppingCart, label: 'New Order', color: '#22C55E', bg: 'rgba(34,197,94,0.12)', border: '#22C55E', emoji: '🛒' };
    case 'order_accepted':
      return { icon: CheckCircle, label: 'Order Accepted', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', border: '#3B82F6', emoji: '✅' };
    case 'order_cancelled':
      return { icon: XCircle, label: 'Order Cancelled', color: '#EF4444', bg: 'rgba(239,68,68,0.12)', border: '#EF4444', emoji: '❌' };
    case 'user':
      return { icon: UserPlus, label: 'New Customer', color: '#A855F7', bg: 'rgba(168,85,247,0.12)', border: '#A855F7', emoji: '👤' };
    case 'stock':
      return { icon: Package, label: 'Stock Alert', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: '#F59E0B', emoji: '⚠️' };
    default:
      return { icon: Bell, label: 'Notification', color: '#94A3B8', bg: 'rgba(148,163,184,0.12)', border: '#94A3B8', emoji: '🔔' };
  }
};

// ── Stat Card ─────────────────────────────────────────────────────────────────

const StatCard = ({ title, value, icon: Icon, color, bg, loading }) => (
  <div className="admin-card group relative overflow-hidden">
    <div
      className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity pointer-events-none"
      style={{ background: color }}
    />
    <div className="flex items-center justify-between mb-4 relative z-10">
      <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">{title}</span>
      <div className="p-2.5 rounded-[14px] border border-white/8" style={{ background: bg }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
    </div>
    <div className="relative z-10">
      {loading ? (
        <div className="w-12 h-8 bg-white/10 rounded-lg animate-pulse" />
      ) : (
        <h3 className="text-3xl font-black text-white tracking-tight">{value}</h3>
      )}
    </div>
  </div>
);

// ── Notification Card ─────────────────────────────────────────────────────────

const NotificationCard = ({ notif, onMarkRead, onDelete, onViewOrder, onViewCustomer, isNew }) => {
  const cfg = getTypeConfig(notif.type);
  const dt = formatDateTime(notif.createdAt);
  const [deleting, setDeleting] = useState(false);
  const [marking, setMarking] = useState(false);
  const isOrder = ['order', 'order_accepted', 'order_cancelled'].includes(notif.type);
  const isCustomer = notif.type === 'user';

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(notif._id);
    setDeleting(false);
  };

  const handleMark = async () => {
    if (notif.isRead) return;
    setMarking(true);
    await onMarkRead(notif._id);
    setMarking(false);
  };

  return (
    <div
      className={`relative rounded-[22px] border transition-all duration-300 overflow-hidden group
        ${notif.isRead
          ? 'bg-[#081A38]/70 border-white/6 opacity-75 hover:opacity-90'
          : 'bg-[#081A38] border-white/10 hover:border-white/20'
        }
        ${isNew ? 'animate-pulse-once' : ''}
      `}
      style={!notif.isRead ? {
        borderLeft: `4px solid ${cfg.border}`,
        boxShadow: `0 0 20px ${cfg.border}22, 0 8px 30px rgba(0,0,0,0.4)`
      } : {
        boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-[14px] flex items-center justify-center text-xl shrink-0"
            style={{ background: cfg.bg, border: `1px solid ${cfg.border}30` }}
          >
            {cfg.emoji}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">{notif.title}</span>
              {!notif.isRead && (
                <span
                  className="text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse"
                  style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}40` }}
                >
                  NEW
                </span>
              )}
            </div>
            <span className="text-[11px] font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
          </div>
        </div>

        {/* Time & delete */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <p className="text-[11px] font-semibold text-[#94A3B8]">{dt.time}</p>
            <p className="text-[10px] text-[#4B5563]">{dt.date}</p>
          </div>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1.5 rounded-xl hover:bg-red-500/15 text-[#4B5563] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
            title="Delete notification"
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-5 border-t border-white/5" />

      {/* Body — Order type */}
      {isOrder && (notif.customerName || notif.invoiceNumber) && (
        <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {notif.customerName && (
            <div>
              <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">Customer</p>
              <p className="text-sm font-semibold text-white">{notif.customerName}</p>
            </div>
          )}
          {notif.phone && (
            <div>
              <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">Phone</p>
              <p className="text-sm font-semibold text-white flex items-center gap-1">
                <Phone className="w-3 h-3 text-[#94A3B8]" />{notif.phone}
              </p>
            </div>
          )}
          {notif.invoiceNumber && (
            <div>
              <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">Invoice</p>
              <p className="text-sm font-mono font-bold" style={{ color: cfg.color }}>{notif.invoiceNumber}</p>
            </div>
          )}
          {notif.totalItems > 0 && (
            <div>
              <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">Items</p>
              <p className="text-sm font-semibold text-white">{notif.totalItems} Products</p>
            </div>
          )}
          {notif.orderTotal > 0 && (
            <div>
              <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">Total</p>
              <p className="text-sm font-bold text-white">{formatCurrency(notif.orderTotal)}</p>
            </div>
          )}
          {notif.paymentMethod && (
            <div>
              <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">Payment</p>
              <p className="text-sm font-semibold text-white">
                {notif.paymentMethod === 'COD' ? 'Cash on Delivery' : notif.paymentMethod}
              </p>
            </div>
          )}
          {notif.orderStatus && (
            <div>
              <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">Status</p>
              <StatusBadge status={notif.orderStatus} />
            </div>
          )}
        </div>
      )}

      {/* Body — Customer type */}
      {isCustomer && (notif.customerName || notif.phone) && (
        <div className="px-5 py-4 flex flex-wrap gap-6">
          {notif.customerName && (
            <div>
              <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">Name</p>
              <p className="text-sm font-semibold text-white">{notif.customerName}</p>
            </div>
          )}
          {notif.phone && (
            <div>
              <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">Phone</p>
              <p className="text-sm font-semibold text-white flex items-center gap-1">
                <Phone className="w-3 h-3 text-[#94A3B8]" />{notif.phone}
              </p>
            </div>
          )}
          <div>
            <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">Registered</p>
            <p className="text-sm font-semibold text-white">{dt.date} {dt.time}</p>
          </div>
        </div>
      )}

      {/* Stock / Generic body */}
      {!isOrder && !isCustomer && (
        <div className="px-5 py-4">
          <p className="text-sm text-[#94A3B8]">{notif.message}</p>
        </div>
      )}

      {/* Actions */}
      <div className="px-5 pb-5 pt-3 flex items-center gap-2.5 flex-wrap">
        {isOrder && notif.orderId && (
          <button
            id={`notif-view-order-${notif._id}`}
            onClick={() => onViewOrder(notif.orderId || notif.link)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-[12px] text-xs font-bold transition-all duration-200 hover:scale-105"
            style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}30` }}
          >
            <Eye className="w-3.5 h-3.5" /> View Order
          </button>
        )}
        {isCustomer && (
          <button
            id={`notif-view-customer-${notif._id}`}
            onClick={onViewCustomer}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-[12px] text-xs font-bold transition-all duration-200 hover:scale-105"
            style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}30` }}
          >
            <Eye className="w-3.5 h-3.5" /> View Customer
          </button>
        )}
        {!notif.isRead && (
          <button
            id={`notif-mark-read-${notif._id}`}
            onClick={handleMark}
            disabled={marking}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-[12px] text-xs font-bold bg-white/6 border border-white/10 text-[#94A3B8] hover:text-white hover:bg-white/10 transition-all"
          >
            {marking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Mark as Read
          </button>
        )}
      </div>
    </div>
  );
};

// ── Status Badge ───────────────────────────────────────────────────────────────

const StatusBadge = ({ status }) => {
  const map = {
    Pending: 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30',
    Accepted: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    'Out for Delivery': 'bg-[#3B82F6]/15 text-[#3B82F6] border-[#3B82F6]/30',
    Delivered: 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30',
    Cancelled: 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${map[status] || 'bg-white/10 text-white border-white/20'}`}>
      {status}
    </span>
  );
};

// ── Skeleton Card ─────────────────────────────────────────────────────────────

const SkeletonCard = () => (
  <div className="admin-card animate-pulse">
    <div className="flex items-start gap-3 mb-4">
      <div className="w-11 h-11 rounded-[14px] bg-white/10 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-white/10 rounded-lg w-2/3" />
        <div className="h-3 bg-white/8 rounded w-1/3" />
      </div>
    </div>
    <div className="grid grid-cols-3 gap-3 mb-4">
      {[1,2,3].map(i => (
        <div key={i} className="space-y-1.5">
          <div className="h-2.5 bg-white/8 rounded w-2/3" />
          <div className="h-4 bg-white/10 rounded w-full" />
        </div>
      ))}
    </div>
    <div className="flex gap-2">
      <div className="h-8 bg-white/8 rounded-xl w-24" />
      <div className="h-8 bg-white/6 rounded-xl w-24" />
    </div>
  </div>
);

// ── Empty State ────────────────────────────────────────────────────────────────

const EmptyState = ({ filter }) => (
  <div className="col-span-full flex flex-col items-center justify-center py-24 text-center">
    <div className="relative mb-6">
      <div className="w-24 h-24 rounded-full bg-[#22C55E]/10 flex items-center justify-center">
        <BellOff className="w-12 h-12 text-[#22C55E]/50" />
      </div>
      <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-[#081A38] border border-white/10 flex items-center justify-center">
        <span className="text-lg">✨</span>
      </div>
    </div>
    <h3 className="text-xl font-black text-white mb-2">All Caught Up!</h3>
    <p className="text-sm text-[#94A3B8] max-w-xs">
      {filter === 'unread'
        ? 'No unread notifications. You\'re all set!'
        : filter === 'today'
          ? 'No notifications received today yet.'
          : 'No notifications match your current filter or search.'}
    </p>
  </div>
);

// ── Filter Tabs ────────────────────────────────────────────────────────────────

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'order', label: 'Orders' },
  { key: 'user', label: 'New Customers' },
  { key: 'order_accepted', label: 'Accepted' },
  { key: 'order_cancelled', label: 'Cancelled' },
  { key: 'unread', label: 'Unread' },
  { key: 'read', label: 'Read' },
  { key: 'today', label: 'Today' },
  { key: 'last7days', label: 'Last 7 Days' },
];

// ── Main Page ─────────────────────────────────────────────────────────────────

const Notifications = () => {
  const { adminInfo } = useAuthStore();
  const navigate = useNavigate();
  const { adminConfirm, toast } = useModal();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [newIds, setNewIds] = useState(new Set());

  // Stats
  const [stats, setStats] = useState({
    total: 0, unread: 0, todayOrders: 0, newCustomers: 0
  });

  const socketRef = useRef(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async (showRefresh = false) => {
    if (!adminInfo?.token) return;
    if (showRefresh) setRefreshing(true); else setLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}/notifications`, {
        headers: { Authorization: `Bearer ${adminInfo.token}` },
        params: { limit: 100 }
      });
      const notifs = data.notifications || [];
      setNotifications(notifs);

      // Compute stats
      const todayOrders = notifs.filter(n => ['order', 'order_accepted', 'order_cancelled'].includes(n.type) && isToday(n.createdAt)).length;
      const newCustomers = notifs.filter(n => n.type === 'user').length;
      setStats({
        total: data.total || notifs.length,
        unread: data.unreadCount || notifs.filter(n => !n.isRead).length,
        todayOrders,
        newCustomers
      });
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [adminInfo?.token]);

  // Initial load
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Socket.io for real-time updates
  useEffect(() => {
    if (!adminInfo?.token) return;

    const socket = socketIO(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join', { role: 'admin' });
    });

    socket.on('admin_notification', (notif) => {
      setNotifications(prev => {
        const exists = prev.find(n => n._id === notif._id);
        if (exists) return prev;
        return [notif, ...prev];
      });
      setNewIds(prev => new Set([...prev, notif._id]));
      // Clear "new" highlight after 3s
      setTimeout(() => {
        setNewIds(prev => { const n = new Set(prev); n.delete(notif._id); return n; });
      }, 3000);
      setStats(prev => ({
        ...prev,
        total: prev.total + 1,
        unread: prev.unread + 1,
        todayOrders: ['order', 'order_accepted', 'order_cancelled'].includes(notif.type) && isToday(notif.createdAt)
          ? prev.todayOrders + 1 : prev.todayOrders,
        newCustomers: notif.type === 'user' ? prev.newCustomers + 1 : prev.newCustomers
      }));
    });

    socket.on('admin:notification:unreadCount', ({ count }) => {
      setStats(prev => ({ ...prev, unread: count }));
    });

    return () => {
      socket.disconnect();
    };
  }, [adminInfo?.token]);

  // Mark single as read
  const handleMarkRead = useCallback(async (id) => {
    try {
      await axios.patch(`${API_BASE}/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${adminInfo.token}` }
      });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setStats(prev => ({ ...prev, unread: Math.max(0, prev.unread - 1) }));
    } catch (err) {
      console.error('Mark read error:', err);
    }
  }, [adminInfo.token]);

  // Mark all as read
  const handleMarkAllRead = useCallback(async () => {
    const ok = await adminConfirm('Mark All as Read?', 'This will mark all unread notifications as read.');
    if (!ok) return;
    try {
      await axios.patch(`${API_BASE}/notifications/mark-read`, {}, {
        headers: { Authorization: `Bearer ${adminInfo.token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setStats(prev => ({ ...prev, unread: 0 }));
      toast('Success', 'All notifications marked as read.');
    } catch (err) {
      console.error('Mark all read error:', err);
    }
  }, [adminInfo.token, adminConfirm, toast]);

  // Delete single
  const handleDelete = useCallback(async (id) => {
    try {
      await axios.delete(`${API_BASE}/notifications/${id}`, {
        headers: { Authorization: `Bearer ${adminInfo.token}` }
      });
      setNotifications(prev => {
        const n = prev.find(x => x._id === id);
        const updated = prev.filter(x => x._id !== id);
        setStats(s => ({
          ...s,
          total: Math.max(0, s.total - 1),
          unread: n && !n.isRead ? Math.max(0, s.unread - 1) : s.unread
        }));
        return updated;
      });
    } catch (err) {
      console.error('Delete error:', err);
    }
  }, [adminInfo.token]);

  // Delete all read
  const handleDeleteAllRead = useCallback(async () => {
    const readCount = notifications.filter(n => n.isRead).length;
    if (readCount === 0) {
      toast('Info', 'No read notifications to delete.');
      return;
    }
    const ok = await adminConfirm('Delete All Read Notifications?', `This will permanently delete ${readCount} read notification(s).`);
    if (!ok) return;
    try {
      await axios.delete(`${API_BASE}/notifications/delete-read`, {
        headers: { Authorization: `Bearer ${adminInfo.token}` }
      });
      setNotifications(prev => prev.filter(n => !n.isRead));
      setStats(prev => ({ ...prev, total: Math.max(0, prev.total - readCount) }));
      toast('Success', `${readCount} read notifications deleted.`);
    } catch (err) {
      console.error('Delete read error:', err);
    }
  }, [adminInfo.token, notifications, adminConfirm, toast]);

  // Navigate to order / user
  const handleViewOrder = useCallback((orderId) => {
    navigate('/admin/orders');
  }, [navigate]);

  const handleViewCustomer = useCallback(() => {
    navigate('/admin/users');
  }, [navigate]);

  // Filtering + search
  const filteredNotifications = notifications.filter(n => {
    // Filter by active tab
    if (activeFilter === 'unread') { if (n.isRead) return false; }
    else if (activeFilter === 'read') { if (!n.isRead) return false; }
    else if (activeFilter === 'today') { if (!isToday(n.createdAt)) return false; }
    else if (activeFilter === 'last7days') { if (!isWithinDays(n.createdAt, 7)) return false; }
    else if (activeFilter === 'order') { if (!['order', 'order_accepted', 'order_cancelled'].includes(n.type)) return false; }
    else if (activeFilter !== 'all') { if (n.type !== activeFilter) return false; }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const name = (n.customerName || '').toLowerCase();
      const phone = (n.phone || '').toLowerCase();
      const invoice = (n.invoiceNumber || '').toLowerCase();
      const title = (n.title || '').toLowerCase();
      const type = (n.type || '').toLowerCase();
      if (!name.includes(q) && !phone.includes(q) && !invoice.includes(q) && !title.includes(q) && !type.includes(q)) {
        return false;
      }
    }

    return true;
  });

  const unreadInView = filteredNotifications.filter(n => !n.isRead).length;

  if (!adminInfo || !adminInfo.token) return <Navigate to="/admin/login" />;

  return (
    <AdminLayout>
      <div className="space-y-8">

        {/* ── Page Header ──────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-[#22C55E] to-[#16A34A] flex items-center justify-center shadow-lg shadow-green-500/20">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">Notification Center</h1>
                <p className="text-xs font-semibold text-[#94A3B8] mt-0.5">
                  View all customer activities and new orders in real time.
                </p>
              </div>
            </div>
            {stats.unread > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
                {stats.unread} New Notifications
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="notif-refresh-btn"
              onClick={() => fetchNotifications(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-[14px] text-xs font-bold bg-white/6 border border-white/10 text-[#94A3B8] hover:text-white hover:bg-white/10 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            {unreadInView > 0 && (
              <button
                id="notif-mark-all-read-btn"
                onClick={handleMarkAllRead}
                className="flex items-center gap-2 px-4 py-2.5 rounded-[14px] text-xs font-bold bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E] hover:bg-[#22C55E]/25 transition-all"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark All Read
              </button>
            )}
            <button
              id="notif-delete-read-btn"
              onClick={handleDeleteAllRead}
              className="flex items-center gap-2 px-4 py-2.5 rounded-[14px] text-xs font-bold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Read
            </button>
          </div>
        </div>

        {/* ── Stats Grid ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Notifications"
            value={loading ? '—' : stats.total}
            icon={Bell}
            color="#22C55E"
            bg="rgba(34,197,94,0.12)"
            loading={loading}
          />
          <StatCard
            title="Unread Notifications"
            value={loading ? '—' : stats.unread}
            icon={AlertCircle}
            color="#F59E0B"
            bg="rgba(245,158,11,0.12)"
            loading={loading}
          />
          <StatCard
            title="Today's Orders"
            value={loading ? '—' : stats.todayOrders}
            icon={ShoppingCart}
            color="#3B82F6"
            bg="rgba(59,130,246,0.12)"
            loading={loading}
          />
          <StatCard
            title="New Customers"
            value={loading ? '—' : stats.newCustomers}
            icon={UserPlus}
            color="#A855F7"
            bg="rgba(168,85,247,0.12)"
            loading={loading}
          />
        </div>

        {/* ── Search + Filter Bar ────────────────────────────────────────── */}
        <div className="admin-card !p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] pointer-events-none" />
            <input
              id="notif-search-input"
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by customer name, phone, invoice number, or type..."
              className="admin-search-bar w-full pl-11 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-[#94A3B8] shrink-0" />
            {FILTERS.map(f => (
              <button
                key={f.key}
                id={`notif-filter-${f.key}`}
                onClick={() => setActiveFilter(f.key)}
                className={`px-3.5 py-1.5 rounded-[10px] text-xs font-bold transition-all duration-200 ${
                  activeFilter === f.key
                    ? 'bg-[#22C55E] text-white shadow-lg shadow-green-500/20'
                    : 'bg-white/6 border border-white/10 text-[#94A3B8] hover:text-white hover:bg-white/10'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Results Summary ────────────────────────────────────────────── */}
        {!loading && (
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-[#94A3B8]">
              {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''} found
              {searchQuery && ` for "${searchQuery}"`}
            </p>
            {filteredNotifications.length > 0 && (
              <p className="text-[10px] font-semibold text-[#4B5563]">
                Sorted by newest first
              </p>
            )}
          </div>
        )}

        {/* ── Notification Cards ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          ) : filteredNotifications.length === 0 ? (
            <EmptyState filter={activeFilter} />
          ) : (
            filteredNotifications.map(n => (
              <NotificationCard
                key={n._id}
                notif={n}
                onMarkRead={handleMarkRead}
                onDelete={handleDelete}
                onViewOrder={handleViewOrder}
                onViewCustomer={handleViewCustomer}
                isNew={newIds.has(n._id)}
              />
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default Notifications;
