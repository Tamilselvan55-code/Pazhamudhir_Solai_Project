import React, { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Truck, CheckCircle, Clock, XCircle, Users, Activity, BarChart, Package, MapPin, Phone, RefreshCw, Navigation, Shield, ExternalLink, AlertTriangle, Star, Trophy, ArrowDownToLine } from 'lucide-react';
import AdminLayout from '../../components/Admin/AdminLayout';
import useAuthStore from '../../store/useAuthStore';
import axios from 'axios';
import { API_BASE, API_URL } from '../../config/api';
import { io } from 'socket.io-client';
import AssignDeliveryModal from '../../components/Admin/AssignDeliveryModal';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

const DeliveryDashboard = () => {
  const { adminInfo } = useAuthStore();
  const [partnerStatus, setPartnerStatus] = useState(null); // From /admin/delivery-partners/analytics
  const [partners, setPartners] = useState([]); // From /admin/delivery-partners
  const [activeOrders, setActiveOrders] = useState([]); // From /admin/orders
  const [liveLocations, setLiveLocations] = useState({});

  // Phase 16 Analytics State
  const [analytics, setAnalytics] = useState(null); // From /admin/delivery-analytics
  const [period, setPeriod] = useState('week');
  const [loading, setLoading] = useState(true);

  // Reassign modal state
  const [reassignOrder, setReassignOrder] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, [period]);

  useEffect(() => {
    const socket = io(API_URL, { transports: ['websocket', 'polling'] });
    socket.emit('join', { role: 'admin' });

    socket.on('partner_location_changed', (data) => {
      if (data?.partnerId) {
        setLiveLocations(prev => ({ ...prev, [data.partnerId]: data }));
      }
    });

    socket.on('delivery_assigned', () => fetchDashboardData());
    socket.on('order_status_updated', () => fetchDashboardData());
    socket.on('order_update', () => fetchDashboardData());
    socket.on('rating_submitted', () => fetchDashboardData());

    return () => socket.disconnect();
  }, [period]); // re-fetch with current period

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, partnerStatusRes, partnersRes, ordersRes] = await Promise.all([
        axios.get(`${API_BASE}/admin/delivery-analytics?period=${period}`, { headers: { Authorization: `Bearer ${adminInfo.token}` } }),
        axios.get(`${API_BASE}/admin/delivery-partners/analytics`, { headers: { Authorization: `Bearer ${adminInfo.token}` } }),
        axios.get(`${API_BASE}/admin/delivery-partners`, { headers: { Authorization: `Bearer ${adminInfo.token}` } }),
        axios.get(`${API_BASE}/admin/orders?limit=30`, { headers: { Authorization: `Bearer ${adminInfo.token}` } })
      ]);

      setAnalytics(analyticsRes.data);
      setPartnerStatus(partnerStatusRes.data);
      setPartners(partnersRes.data || []);
      const activeList = (ordersRes.data?.orders || []).filter(
        o => o.deliveryPartnerId && !o.isDelivered && o.status !== 'Cancelled'
      );
      setActiveOrders(activeList);
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
    } finally {
      setLoading(false);
    }
  };

  const exportAnalytics = () => {
    if (!analytics) return;
    const csvRows = ['Partner Name,Completed,Cancelled,Avg Delivery Time (mins),Avg Rating,Acceptance Rate (%)'];
    analytics.byPartner.forEach(p => {
      csvRows.push(`"${p.name}",${p.completed},${p.cancelled},${p.avgDeliveryMinutes},${p.avgRating || 'N/A'},${p.acceptanceRate}`);
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Delivery_Analytics_${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!adminInfo || !adminInfo.permissions?.users) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const kpis = partnerStatus ? [
    { label: 'Total Partners', value: partnerStatus.partners.total, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Available', value: partnerStatus.partners.available, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
    { label: 'Busy (On Delivery)', value: partnerStatus.partners.onDelivery, icon: Truck, color: 'text-orange-600', bg: 'bg-orange-100' },
    { label: 'Offline / Inactive', value: partnerStatus.partners.offline + partnerStatus.partners.inactive, icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' }
  ] : [];

  const summary = analytics?.summary;
  const leaderboard = analytics?.leaderboard;
  const chartData = analytics?.dailyChart || [];

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-7 h-7 text-indigo-600" />
            Delivery Analytics &amp; Operations Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">Real-time GPS tracking, fleet management, and performance insights.</p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={exportAnalytics} className="flex items-center gap-1.5 bg-white px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-xs">
            <ArrowDownToLine className="w-4 h-4 text-gray-500" /> Export CSV
          </button>
          <button onClick={fetchDashboardData} className="flex items-center gap-1.5 bg-white px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-xs">
            <RefreshCw className={`w-4 h-4 text-indigo-600 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Phase 16: Time Period Tabs */}
      <div className="flex bg-white rounded-xl border border-gray-200 p-1 mb-6 max-w-max shadow-xs">
        {['today', 'yesterday', 'week', 'month'].map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${period === p ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            {p === 'week' ? 'Last 7 Days' : p === 'month' ? 'This Month' : p}
          </button>
        ))}
      </div>

      {loading && !analytics ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Phase 16: Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs flex flex-col justify-center">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Assigned</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{summary?.total || 0}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs flex flex-col justify-center">
              <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Completed</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{summary?.completed || 0}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs flex flex-col justify-center">
              <p className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">Pending/Active</p>
              <p className="text-2xl font-black text-amber-600 mt-1">{summary?.pending || 0}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs flex flex-col justify-center">
              <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider">Cancelled</p>
              <p className="text-2xl font-black text-red-600 mt-1">{summary?.cancelled || 0}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs flex flex-col justify-center">
              <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">Avg Delivery Time</p>
              <p className="text-xl font-black text-blue-600 mt-1">{summary?.avgDeliveryMinutes || 0} <span className="text-xs text-blue-400 font-bold">mins</span></p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs flex flex-col justify-center">
              <p className="text-[10px] text-yellow-500 font-bold uppercase tracking-wider">Avg Rating</p>
              <p className="text-xl font-black text-yellow-600 mt-1">⭐ {summary?.avgRating || 'N/A'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Delivery Volume Chart */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 lg:col-span-2 flex flex-col">
              <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart className="w-5 h-5 text-indigo-500" /> Delivery Volume (Last 7 Days)
              </h2>
              <div className="flex-1 min-h-[250px] w-full">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <RechartsTooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="deliveries" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-sm text-gray-400">No chart data available</div>
                )}
              </div>
            </div>

            {/* Leaderboards */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-4">
              <h2 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" /> Partner Leaderboards
              </h2>
              
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-xl border border-emerald-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold shrink-0">1</div>
                <div>
                  <p className="text-[10px] font-bold text-emerald-700 uppercase">Most Deliveries</p>
                  <p className="text-sm font-black text-gray-900">{leaderboard?.topByDeliveries?.name || 'N/A'}</p>
                  <p className="text-xs font-semibold text-emerald-600">{leaderboard?.topByDeliveries?.completed || 0} Completed</p>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-4 rounded-xl border border-amber-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold shrink-0">⭐</div>
                <div>
                  <p className="text-[10px] font-bold text-amber-700 uppercase">Highest Rated</p>
                  <p className="text-sm font-black text-gray-900">{leaderboard?.topByRating?.name || 'N/A'}</p>
                  <p className="text-xs font-semibold text-amber-600">{leaderboard?.topByRating?.avgRating ? `${leaderboard.topByRating.avgRating} / 5.0` : 'No ratings'}</p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold shrink-0"><Clock className="w-5 h-5" /></div>
                <div>
                  <p className="text-[10px] font-bold text-blue-700 uppercase">Fastest Avg Time</p>
                  <p className="text-sm font-black text-gray-900">{leaderboard?.topBySpeed?.name || 'N/A'}</p>
                  <p className="text-xs font-semibold text-blue-600">{leaderboard?.topBySpeed?.avgDeliveryMinutes ? `${leaderboard.topBySpeed.avgDeliveryMinutes} mins` : 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Partner Status KPI Cards (Existing) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((kpi, index) => (
              <div key={index} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs flex items-center gap-4 hover:border-gray-200 transition-all">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${kpi.bg}`}>
                  <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wide">{kpi.label}</p>
                  <p className="text-xl font-black text-gray-900 mt-0.5">{kpi.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Live Operations Map & Active GPS Section */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-red-500 animate-bounce" />
                Live Active Operations &amp; Partner GPS Markers
              </h2>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" /> Socket Live Stream
              </span>
            </div>

            {Object.keys(liveLocations).length === 0 ? (
              <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-500 text-xs border border-gray-100">
                No active GPS streaming from delivery partners right now. Coordinates stream automatically when partners mark orders 'On Delivery'.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.values(liveLocations).map((loc) => (
                  <div key={loc.partnerId} className="bg-gradient-to-r from-green-50/50 to-emerald-50/50 rounded-xl p-4 border border-green-200 shadow-2xs flex flex-col justify-between space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900 text-sm">{loc.partnerName || 'Delivery Partner'}</span>
                      <span className="px-2 py-0.5 bg-green-600 text-white text-[10px] font-bold rounded-full">ACTIVE GPS</span>
                    </div>
                    <p className="text-xs text-gray-600 font-mono">
                      📍 Lat: {loc.lat?.toFixed(5)}, Lon: {loc.lon?.toFixed(5)}
                    </p>
                    <div className="flex items-center justify-between pt-2 border-t border-green-100 text-[11px]">
                      <span className="text-gray-500">Updated: {new Date(loc.timestamp).toLocaleTimeString('en-IN')}</span>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lon}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 font-bold hover:underline flex items-center gap-1"
                      >
                        View Map ↗
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live Partner Fleet Table (Phase 12) + Ratings (Phase 15/16) */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" /> Live Delivery Fleet &amp; Dispatch Status
              </h2>
              <span className="text-xs font-bold text-gray-500">{partners.length} Total Registered Partners</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Partner Name</th>
                    <th className="py-3.5 px-6">Phone / Contact</th>
                    <th className="py-3.5 px-6">Rating</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6">Active Assignment</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs font-semibold text-gray-800">
                  {partners.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-gray-400 font-medium">No delivery partners found.</td>
                    </tr>
                  ) : (
                    partners.map(p => {
                      const activeOrd = activeOrders.find(o => o.deliveryPartnerId === p.id);
                      const analyticsPartner = analytics?.byPartner?.find(ap => ap.id === p.id);

                      return (
                        <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-600 font-bold flex items-center justify-center shrink-0">
                                {p.profileImage ? (
                                  <img src={p.profileImage} alt="Partner" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                  p.name.charAt(0).toUpperCase()
                                )}
                              </div>
                              <div>
                                <p className="text-gray-900 font-bold">{p.name}</p>
                                <p className="text-[11px] text-gray-400 font-normal">ID: {p.employeeId} &middot; {p.vehicleType}</p>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-6">
                            <a href={`tel:+91${p.mobile}`} className="text-green-600 hover:underline flex items-center gap-1">
                              <Phone className="w-3 h-3" /> +91 {p.mobile}
                            </a>
                          </td>

                          <td className="py-4 px-6">
                            <div className="flex flex-col">
                              {analyticsPartner?.avgRating ? (
                                <span className="text-amber-500 font-bold text-sm">⭐ {analyticsPartner.avgRating}</span>
                              ) : (
                                <span className="text-gray-400">No rating</span>
                              )}
                              <span className="text-[10px] text-gray-500 font-normal">{analyticsPartner?.completed || 0} delivered</span>
                            </div>
                          </td>

                          <td className="py-4 px-6">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              !p.isActive ? 'bg-red-100 text-red-700' :
                              p.status === 'Available' ? 'bg-green-100 text-green-800' :
                              p.status === 'On Delivery' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {!p.isActive ? 'Inactive' : p.status}
                            </span>
                          </td>

                          <td className="py-4 px-6">
                            {activeOrd ? (
                              <div>
                                <Link to={`/admin/orders?search=${activeOrd.invoiceNumber || activeOrd.id}`} className="text-blue-600 hover:underline font-bold">
                                  {activeOrd.invoiceNumber || `#${activeOrd.id.slice(-6).toUpperCase()}`}
                                </Link>
                                <p className="text-[11px] text-gray-500">{activeOrd.user?.fullName || 'Customer'}</p>
                              </div>
                            ) : (
                              <span className="text-gray-400 font-normal">None (Idle)</span>
                            )}
                          </td>

                          <td className="py-4 px-6 text-right space-x-2">
                            {p.mobile && (
                              <a
                                href={`tel:+91${p.mobile}`}
                                className="px-2.5 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-xs font-bold transition-colors border border-green-200 inline-flex items-center gap-1"
                              >
                                <Phone className="w-3 h-3" /> Call
                              </a>
                            )}
                            {activeOrd && (
                              <button
                                onClick={() => setReassignOrder(activeOrd)}
                                className="px-2.5 py-1.5 bg-orange-50 text-orange-700 hover:bg-orange-100 rounded-lg text-xs font-bold transition-colors border border-orange-200 inline-flex items-center gap-1"
                              >
                                Reassign
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Reassign Modal */}
      {reassignOrder && (
        <AssignDeliveryModal
          order={reassignOrder}
          token={adminInfo.token}
          onClose={() => setReassignOrder(null)}
          onAssignSuccess={() => {
            setReassignOrder(null);
            fetchDashboardData();
          }}
        />
      )}
    </AdminLayout>
  );
};

export default DeliveryDashboard;
