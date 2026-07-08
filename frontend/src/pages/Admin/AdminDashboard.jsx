import React, { useState, useEffect } from 'react';
import { 
  Users, ShoppingBag, ShoppingCart, IndianRupee, 
  Clock, Package, ArrowUpRight, CheckCircle,
  AlertTriangle, Calendar, BarChart3, Bell, Check, Loader2, ArrowRight
} from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import AdminLayout from '../../components/Admin/AdminLayout';
import useAuthStore from '../../store/useAuthStore';
import useModal from '../../hooks/useModal';
import { formatCurrency } from '../../utils/currency';

/* ── Premium SaaS Stat Card Component ─────────────────────────────────── */
const StatCard = ({ title, value, icon: Icon, iconBg, iconColor, gradientBg }) => (
  <div className="admin-card group relative overflow-hidden">
    <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl opacity-25 group-hover:opacity-50 transition-opacity pointer-events-none ${gradientBg || 'bg-[#22C55E]'}`}></div>
    <div className="flex items-center justify-between mb-4 relative z-10">
      <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">{title}</span>
      <div className="p-3 rounded-[16px] bg-white/4 border border-white/8 transition-transform duration-300 group-hover:scale-110 shadow-sm">
        <Icon className={`w-5 h-5 ${iconColor || 'text-[#22C55E]'}`} />
      </div>
    </div>
    <div className="flex items-baseline justify-between relative z-10">
      <h3 className="text-3xl font-black text-white tracking-tight">{value}</h3>
    </div>
  </div>
);

/* ── Custom SVG Area/Line Chart ───────────────────────────────────────── */
const CustomAreaChart = ({ data, dataKey, color, title }) => {
  if (!data || data.length === 0) return null;
  const values = data.map(d => d[dataKey]);
  const maxVal = Math.max(...values, 10);
  const minVal = 0;
  
  const width = 500;
  const height = 150;
  const padding = 30;
  
  const points = data.map((d, i) => {
    const x = padding + (i * (width - padding * 2)) / (data.length - 1);
    const y = height - padding - ((d[dataKey] - minVal) * (height - padding * 2)) / (maxVal - minVal);
    return { x, y };
  });

  const pathD = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
    : '';

  return (
    <div className="admin-card space-y-4">
      <h3 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wide">{title}</h3>
      <div className="w-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
          <defs>
            <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0.0} />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.5, 1].map((ratio, i) => {
            const y = padding + ratio * (height - padding * 2);
            const val = Math.round(maxVal - ratio * (maxVal - minVal));
            return (
              <g key={i} className="opacity-20">
                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(255,255,255,0.2)" strokeDasharray="3" />
                <text x={padding - 6} y={y + 3} textAnchor="end" className="text-[8px] fill-[#94A3B8] font-bold">
                  {dataKey === 'revenue' ? `₹${val}` : val}
                </text>
              </g>
            );
          })}

          {/* Area under curve */}
          <path d={areaD} fill={`url(#gradient-${dataKey})`} />

          {/* Line */}
          <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />

          {/* Data Points */}
          {points.map((p, i) => (
            <g key={i} className="group/dot cursor-pointer">
              <circle
                cx={p.x}
                cy={p.y}
                r="3.5"
                fill="#ffffff"
                stroke={color}
                strokeWidth="2.5"
              />
              <title>{data[i].date}: {dataKey === 'revenue' ? `₹${data[i][dataKey]}` : data[i][dataKey]}</title>
            </g>
          ))}

          {/* X Axis Labels */}
          {data.map((d, i) => {
            const x = padding + (i * (width - padding * 2)) / (data.length - 1);
            return (
              <text key={i} x={x} y={height - 5} textAnchor="middle" className="text-[8px] fill-[#94A3B8] font-bold">
                {d.date}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

/* ── Recent Order Row ─────────────────────────────────────────────────── */
const OrderRow = ({ id, invoiceNumber, customer, total, status, date }) => {
  const statusColors = {
    'Pending':          'bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/30',
    'Accepted':         'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'Packed':           'bg-purple-500/20 text-purple-400 border-purple-500/30',
    'Out for Delivery': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    'Delivered':        'bg-[#22C55E]/20 text-[#22C55E] border-[#22C55E]/30',
    'Cancelled':        'bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/30',
  };
  return (
    <div className="flex items-center justify-between py-4 border-b border-white/6 last:border-0 hover:bg-white/3 px-2 rounded-xl transition-colors">
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="w-9 h-9 rounded-[14px] bg-white/4 border border-white/8 flex items-center justify-center shrink-0">
          <Package className="w-4 h-4 text-[#22C55E]" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-white truncate">{customer}</p>
          <p className="text-[10px] text-[#94A3B8]">{invoiceNumber} · {new Date(date).toLocaleDateString('en-IN')}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs font-bold text-white">{formatCurrency(total)}</span>
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${statusColors[status] || 'bg-white/10 text-white border-white/20'}`}>
          {status}
        </span>
      </div>
    </div>
  );
};

/* ── Top Product Row ──────────────────────────────────────────────────── */
const ProductRow = ({ rank, name, sold, revenue, image }) => (
  <div className="flex items-center gap-3.5 py-3.5 border-b border-white/6 last:border-0 hover:bg-white/3 px-2 rounded-xl transition-colors">
    <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-[11px] font-extrabold shrink-0 ${
      rank === 1 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 
      rank === 2 ? 'bg-white/10 text-gray-300 border border-white/15' : 
      rank === 3 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-white/5 text-[#94A3B8] border border-white/8'
    }`}>
      {rank}
    </div>
    <div className="w-9 h-9 rounded-[14px] bg-white/4 border border-white/8 overflow-hidden shrink-0 flex items-center justify-center">
      {image ? <img src={image} alt={name} className="w-full h-full object-cover" /> : <ShoppingBag className="w-4 h-4 text-[#94A3B8]" />}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-bold text-white truncate">{name}</p>
      <p className="text-[10px] text-[#94A3B8]">{sold} sold</p>
    </div>
    <span className="text-xs font-bold text-[#22C55E]">{formatCurrency(revenue)}</span>
  </div>
);

/* ── Main Dashboard ───────────────────────────────────────────────────── */
const AdminDashboard = () => {
  const { adminInfo } = useAuthStore();
  const { adminAlert } = useModal();
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [topProducts, setTopProducts] = useState([]);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Calendar State
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventType, setNewEventType] = useState('Stock Arrival');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch Dashboard Stats
  const fetchDashboardData = async () => {
    if (!adminInfo) return;
    try {
      const { data } = await axios.get('http://localhost:5000/api/admin/dashboard-stats', {
        headers: { Authorization: `Bearer ${adminInfo.token}` }
      });
      setStats(data.stats);
      setChartData(data.chartData);
      setRecentOrders(data.recentOrders);
      setTopProducts(data.topProducts);
    } catch (err) {
      setError('Failed to fetch dashboard data');
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!adminInfo) return;
    try {
      const { data } = await axios.get('http://localhost:5000/api/admin/notifications', {
        headers: { Authorization: `Bearer ${adminInfo.token}` }
      });
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      console.error('Fetch notifications failed:', err);
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    if (!adminInfo) return;
    try {
      await axios.patch('http://localhost:5000/api/admin/notifications/mark-read', {}, {
        headers: { Authorization: `Bearer ${adminInfo.token}` }
      });
      setUnreadCount(0);
      fetchNotifications();
    } catch (err) {
      console.error('Mark read notifications failed:', err);
    }
  };

  // Fetch calendar events
  const fetchCalendarEvents = async () => {
    if (!adminInfo) return;
    try {
      const { data } = await axios.get('http://localhost:5000/api/admin/calendar-events', {
        headers: { Authorization: `Bearer ${adminInfo.token}` }
      });
      setCalendarEvents(data);
    } catch (err) {
      console.error('Fetch calendar events failed:', err);
    }
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;
    try {
      await axios.post('http://localhost:5000/api/admin/calendar-events', {
        title: newEventTitle,
        eventType: newEventType,
        date: selectedDate
      }, { headers: { Authorization: `Bearer ${adminInfo.token}` } });
      setNewEventTitle('');
      fetchCalendarEvents();
    } catch (err) {
      adminAlert('error', 'Failed to Add Event', 'Could not add the calendar event. Please try again.');
    }
  };

  const handleDeleteEvent = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/api/admin/calendar-events/${id}`, {
        headers: { Authorization: `Bearer ${adminInfo.token}` }
      });
      fetchCalendarEvents();
    } catch (err) {
      adminAlert('error', 'Failed to Delete Event', 'Could not delete the calendar event. Please try again.');
    }
  };

  useEffect(() => {
    if (!adminInfo) return;

    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchDashboardData(), fetchNotifications(), fetchCalendarEvents()]);
      setLoading(false);
      console.log('✓ Dashboard connected');
    };
    loadAll();

    // Configure WebSockets for live notifications
    const socket = io('http://localhost:5000');
    socket.on('connect', () => {
      console.log('✓ Socket connected');
    });

    socket.on('admin_notification', (newNotif) => {
      setNotifications(prev => [newNotif, ...prev.slice(0, 49)]);
      setUnreadCount(curr => curr + 1);
      // Re-trigger stats count update to keep dashboard numbers aligned
      fetchDashboardData();
    });

    socket.on('payment_updated', () => fetchDashboardData());
    socket.on('payment_update', () => fetchDashboardData());

    const handleWinPaymentUpdate = () => fetchDashboardData();
    window.addEventListener('socket_payment_update', handleWinPaymentUpdate);

    return () => {
      socket.disconnect();
      window.removeEventListener('socket_payment_update', handleWinPaymentUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminInfo]);

  if (!adminInfo) {
    return <Navigate to="/admin/login" replace />;
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="min-h-[70vh] flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-green-600 mb-2" />
          <p className="text-sm font-semibold text-gray-500">Loading store dashboard metrics...</p>
        </div>
      </AdminLayout>
    );
  }

  // Cards representation array
  const statsList = stats ? [
    { title: 'Today\'s Revenue', value: formatCurrency(stats.todayRevenue || 0), icon: IndianRupee, iconBg: 'bg-[#22C55E]/10', iconColor: 'text-[#22C55E]', gradientBg: 'bg-[#22C55E]' },
    { title: 'Today\'s Orders', value: stats.todayOrders || 0, icon: Clock, iconBg: 'bg-blue-500/10', iconColor: 'text-blue-400', gradientBg: 'bg-blue-500' },
    { title: 'New Customers Today', value: stats.newCustomersToday || 0, icon: Users, iconBg: 'bg-cyan-500/10', iconColor: 'text-cyan-400', gradientBg: 'bg-cyan-500' },
    { title: 'Cancelled Orders Today', value: stats.cancelledOrdersToday || 0, icon: AlertTriangle, iconBg: 'bg-red-500/10', iconColor: 'text-red-400', gradientBg: 'bg-red-500' },
    { title: 'Average Order Value', value: formatCurrency(stats.avgOrderValue || 0), icon: Package, iconBg: 'bg-indigo-500/10', iconColor: 'text-indigo-400', gradientBg: 'bg-indigo-500' },
    { title: 'Top Selling Product', value: stats.topSellingProduct || 'N/A', icon: ShoppingBag, iconBg: 'bg-amber-500/10', iconColor: 'text-amber-400', gradientBg: 'bg-amber-500' },
    { title: 'Low Stock Products', value: stats.lowStockProducts || 0, icon: AlertTriangle, iconBg: 'bg-yellow-500/10', iconColor: 'text-yellow-400', gradientBg: 'bg-yellow-500' },
    { title: 'Revenue Growth', value: `${stats.revenueGrowthPct >= 0 ? '+' : ''}${stats.revenueGrowthPct || 0}%`, icon: ArrowUpRight, iconBg: 'bg-[#22C55E]/10', iconColor: 'text-[#22C55E]', gradientBg: 'bg-[#22C55E]' },
    { title: 'Total Revenue (All Time)', value: formatCurrency(stats.totalRevenue || 0), icon: IndianRupee, iconBg: 'bg-violet-500/10', iconColor: 'text-violet-400', gradientBg: 'bg-violet-500' }
  ] : [];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <AdminLayout>
      {/* ─── Page Header ─────────────────────────────────────────────── */}
      {/* ─── Page Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-2.5">
            {greeting}, {adminInfo.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">Live enterprise metrics & overview for Tiruchendur Murugan Pazhamudhir Solai</p>
        </div>
        <div className="flex items-center gap-2.5 text-xs text-white bg-white/4 px-4 py-3 rounded-[18px] border border-white/8 shadow-sm">
          <Calendar className="w-4 h-4 text-[#22C55E]" />
          <span className="font-bold">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</span>
        </div>
      </div>

      {/* ─── Dashboard Stats Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-9 gap-6 mb-8">
        {statsList.map(s => (
          <div key={s.title} className="xl:col-span-3">
            <StatCard {...s} />
          </div>
        ))}
      </div>

      {/* ─── Charts Row ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <CustomAreaChart data={chartData} dataKey="revenue" color="#22C55E" title="Revenue Timeline (Last 7 Days)" />
        <CustomAreaChart data={chartData} dataKey="sales" color="#16A34A" title="Sales Timeline (Orders count)" />
      </div>

      {/* ─── Bottom Sections Grid ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Orders Table */}
        <div className="lg:col-span-2 admin-table-container">
          <div className="flex items-center justify-between px-6 py-5 admin-table-header">
            <div>
              <h2 className="text-sm font-bold text-white">Recent Orders</h2>
              <p className="text-[11px] text-[#94A3B8] mt-0.5">Latest deliveries & checkout requests</p>
            </div>
            <Link
              to="/admin/orders"
              className="text-xs font-bold text-[#22C55E] hover:text-white bg-white/6 px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 border border-white/8"
            >
              All Orders <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="px-6 py-3">
            {recentOrders.length === 0 ? (
              <p className="text-xs text-[#94A3B8] py-8 text-center">No orders registered today.</p>
            ) : (
              recentOrders.map(order => (
                <OrderRow
                  key={order._id}
                  id={order._id}
                  invoiceNumber={order.invoiceNumber}
                  customer={order.user?.fullName || 'Walk-in / Guest'}
                  total={order.totalPrice}
                  status={order.status}
                  date={order.createdAt}
                />
              ))
            )}
          </div>
        </div>

        {/* Top-Selling Products */}
        <div className="admin-table-container">
          <div className="flex items-center justify-between px-6 py-5 admin-table-header">
            <div>
              <h2 className="text-sm font-bold text-white">Top Products</h2>
              <p className="text-[11px] text-[#94A3B8] mt-0.5">Best sellers from active categories</p>
            </div>
            <div className="p-2.5 bg-amber-500/20 border border-amber-500/30 rounded-xl">
              <BarChart3 className="w-4 h-4 text-amber-400" />
            </div>
          </div>
          <div className="px-6 py-3">
            {topProducts.length === 0 ? (
              <p className="text-xs text-[#94A3B8] py-8 text-center">No sales registered yet.</p>
            ) : (
              topProducts.map((p, index) => (
                <ProductRow
                  key={p._id || index}
                  rank={index + 1}
                  name={p.name}
                  sold={p.sold}
                  revenue={p.revenue}
                  image={p.image}
                />
              ))
            )}
          </div>
        </div>

        {/* Real-time Alerts Panel */}
        <div className="lg:col-span-2 admin-table-container">
          <div className="flex items-center justify-between px-6 py-5 admin-table-header">
            <div className="flex items-center gap-3">
              <div className="relative p-2 rounded-xl bg-white/6 border border-white/8">
                <Bell className="w-4 h-4 text-[#22C55E]" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#EF4444] text-white rounded-full flex items-center justify-center text-[8px] font-bold">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Real-Time Activity Logs & Notifications</h2>
                <p className="text-[11px] text-[#94A3B8] mt-0.5">Live store events log powered by Socket.io</p>
              </div>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-bold text-[#22C55E] hover:text-white bg-white/6 px-3 py-1.5 rounded-xl border border-white/8 flex items-center gap-1.5 transition-colors"
              >
                <Check className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>
          <div className="divide-y divide-white/6 max-h-80 overflow-y-auto px-6 admin-scroll">
            {notifications.length === 0 ? (
              <p className="text-xs text-[#94A3B8] py-8 text-center">No notifications found.</p>
            ) : (
              notifications.map((n) => {
                const isNew = !n.read;
                return (
                  <div key={n._id} className={`flex items-start justify-between py-4 ${isNew ? 'bg-white/4 px-3 rounded-xl my-1' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl shrink-0 border ${
                        n.type === 'New Order' ? 'bg-[#22C55E]/20 text-[#22C55E] border-[#22C55E]/30' :
                        n.type === 'Low Stock' ? 'bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/30' :
                        n.type === 'Out of Stock' ? 'bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/30' :
                        'bg-blue-500/20 text-blue-400 border-blue-500/30'
                      }`}>
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div>
                        <p className={`text-xs ${isNew ? 'font-bold text-white' : 'text-gray-300'}`}>{n.message}</p>
                        <p className="text-[10px] text-[#94A3B8] mt-1">{new Date(n.createdAt).toLocaleTimeString('en-IN')} · {n.type}</p>
                      </div>
                    </div>
                    {isNew && (
                      <span className="w-2 h-2 rounded-full bg-[#22C55E] mt-2 shrink-0"></span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Interactive Store Calendar Widget */}
        <div className="admin-table-container flex flex-col">
          <div className="flex items-center justify-between px-6 py-5 admin-table-header">
            <div>
              <h2 className="text-sm font-bold text-white">Store Reminders</h2>
              <p className="text-[11px] text-[#94A3B8] mt-0.5">Schedule promotions & restocks</p>
            </div>
            <div className="p-2 bg-white/6 rounded-xl border border-white/8">
              <Calendar className="w-4 h-4 text-[#22C55E]" />
            </div>
          </div>
          <div className="p-6 space-y-4 flex-1 flex flex-col">
            <form onSubmit={handleAddEvent} className="space-y-3">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="admin-form-input text-xs h-[44px]"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Event title..."
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="admin-form-input text-xs h-[44px] flex-1"
                />
                <select
                  value={newEventType}
                  onChange={(e) => setNewEventType(e.target.value)}
                  className="admin-form-input text-xs h-[44px] w-24 px-2"
                >
                  <option value="Stock Arrival" className="bg-[#081A38]">Stock</option>
                  <option value="Promotion" className="bg-[#081A38]">Offer</option>
                  <option value="Meeting" className="bg-[#081A38]">Meeting</option>
                  <option value="General" className="bg-[#081A38]">Other</option>
                </select>
              </div>
              <button type="submit" className="admin-btn-primary w-full h-[44px] text-xs">
                + Schedule Reminder
              </button>
            </form>

            <div className="border-t border-white/8 pt-4 flex-1 overflow-y-auto max-h-48 space-y-2.5 admin-scroll">
              <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Scheduled Events</p>
              {calendarEvents.length === 0 ? (
                <p className="text-xs text-[#94A3B8] text-center py-4">No events scheduled.</p>
              ) : (
                calendarEvents.map((ev) => (
                  <div key={ev._id} className="flex items-center justify-between p-3 rounded-xl bg-white/4 border border-white/8 hover:bg-white/6 transition-colors">
                    <div>
                      <p className="text-xs font-bold text-white">{ev.title}</p>
                      <p className="text-[10px] text-[#94A3B8] mt-0.5">{new Date(ev.date).toLocaleDateString('en-IN')} · <span className="text-[#22C55E] font-semibold">{ev.eventType}</span></p>
                    </div>
                    <button
                      onClick={() => handleDeleteEvent(ev._id)}
                      className="text-[#94A3B8] hover:text-[#EF4444] text-xs font-bold px-2 py-1 rounded transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

    </AdminLayout>
  );
};

export default AdminDashboard;
