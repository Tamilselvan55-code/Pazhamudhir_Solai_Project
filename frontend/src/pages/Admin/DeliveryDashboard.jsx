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
import { StatCard, CustomAreaChart } from '../../components/Admin/DashboardShared';

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
  }, [period]);

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

  const isSuperAdmin = adminInfo?.role === 'SuperAdmin' || adminInfo?.role === 'Super Admin';
  if (!adminInfo || (!isSuperAdmin && !adminInfo.permissions?.users)) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const kpis = partnerStatus ? [
    { label: 'Total Partners', value: partnerStatus.partners.total, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500' },
    { label: 'Available', value: partnerStatus.partners.available, icon: CheckCircle, color: 'text-[#22C55E]', bg: 'bg-[#22C55E]' },
    { label: 'Busy (On Delivery)', value: partnerStatus.partners.onDelivery, icon: Truck, color: 'text-[#F59E0B]', bg: 'bg-[#F59E0B]' },
    { label: 'Offline / Inactive', value: partnerStatus.partners.offline + partnerStatus.partners.inactive, icon: XCircle, color: 'text-[#EF4444]', bg: 'bg-[#EF4444]' }
  ] : [];

  const summary = analytics?.summary;
  const leaderboard = analytics?.leaderboard;
  const chartData = analytics?.dailyChart || [];

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="w-7 h-7 text-[#22C55E]" />
            Delivery Analytics &amp; Operations Dashboard
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">Real-time GPS tracking, fleet management, and performance insights.</p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={exportAnalytics} className="admin-btn-secondary px-4 py-2 flex items-center gap-2 text-xs">
            <ArrowDownToLine className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={fetchDashboardData} className="admin-btn-primary px-4 py-2 flex items-center gap-2 text-xs">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Phase 16: Time Period Tabs */}
      <div className="flex bg-[#081A38] rounded-xl border border-white/8 p-1 mb-6 max-w-max shadow-lg">
        {['today', 'yesterday', 'week', 'month'].map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${period === p ? 'bg-[#22C55E] text-white shadow-sm' : 'text-[#94A3B8] hover:bg-white/5 hover:text-white'}`}
          >
            {p === 'week' ? 'Last 7 Days' : p === 'month' ? 'This Month' : p}
          </button>
        ))}
      </div>

      {loading && !analytics ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#22C55E]"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Phase 16: Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard title="Total Assigned" value={summary?.total || 0} icon={Package} iconColor="text-[#22C55E]" gradientBg="bg-[#22C55E]" />
            <StatCard title="Completed" value={summary?.completed || 0} icon={CheckCircle} iconColor="text-[#22C55E]" gradientBg="bg-[#22C55E]" />
            <StatCard title="Pending/Active" value={summary?.pending || 0} icon={Activity} iconColor="text-[#F59E0B]" gradientBg="bg-[#F59E0B]" />
            <StatCard title="Cancelled" value={summary?.cancelled || 0} icon={XCircle} iconColor="text-[#EF4444]" gradientBg="bg-[#EF4444]" />
            <StatCard title="Avg Time" value={`${summary?.avgDeliveryMinutes || 0}m`} icon={Clock} iconColor="text-blue-500" gradientBg="bg-blue-500" />
            <StatCard title="Avg Rating" value={`⭐ ${summary?.avgRating || 'N/A'}`} icon={Star} iconColor="text-yellow-500" gradientBg="bg-yellow-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Delivery Volume Chart */}
            <div className="lg:col-span-2">
              <CustomAreaChart data={chartData} dataKey="deliveries" color="#4f46e5" title="Delivery Volume (Last 7 Days)" />
            </div>

            {/* Leaderboards */}
            <div className="admin-card space-y-4">
              <h2 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wide flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#F59E0B]" /> Partner Leaderboards
              </h2>
              
              <div className="bg-white/4 p-4 rounded-[16px] border border-white/8 flex items-center gap-3 hover:bg-white/10 transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-[#22C55E]/20 text-[#22C55E] flex items-center justify-center font-bold shrink-0">1</div>
                <div>
                  <p className="text-[10px] font-bold text-[#94A3B8] uppercase">Most Deliveries</p>
                  <p className="text-sm font-black text-white">{leaderboard?.topByDeliveries?.name || 'N/A'}</p>
                  <p className="text-xs font-semibold text-[#22C55E]">{leaderboard?.topByDeliveries?.completed || 0} Completed</p>
                </div>
              </div>
              
              <div className="bg-white/4 p-4 rounded-[16px] border border-white/8 flex items-center gap-3 hover:bg-white/10 transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] flex items-center justify-center font-bold shrink-0">⭐</div>
                <div>
                  <p className="text-[10px] font-bold text-[#94A3B8] uppercase">Highest Rated</p>
                  <p className="text-sm font-black text-white">{leaderboard?.topByRating?.name || 'N/A'}</p>
                  <p className="text-xs font-semibold text-[#F59E0B]">{leaderboard?.topByRating?.avgRating ? `${leaderboard.topByRating.avgRating} / 5.0` : 'No ratings'}</p>
                </div>
              </div>

              <div className="bg-white/4 p-4 rounded-[16px] border border-white/8 flex items-center gap-3 hover:bg-white/10 transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold shrink-0"><Clock className="w-5 h-5" /></div>
                <div>
                  <p className="text-[10px] font-bold text-[#94A3B8] uppercase">Fastest Avg Time</p>
                  <p className="text-sm font-black text-white">{leaderboard?.topBySpeed?.name || 'N/A'}</p>
                  <p className="text-xs font-semibold text-blue-400">{leaderboard?.topBySpeed?.avgDeliveryMinutes ? `${leaderboard.topBySpeed.avgDeliveryMinutes} mins` : 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Partner Status KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((kpi, index) => (
              <StatCard key={index} title={kpi.label} value={kpi.value} icon={kpi.icon} iconColor={kpi.color} gradientBg={kpi.bg} />
            ))}
          </div>

          {/* Live Operations Map & Active GPS Section */}
          <div className="admin-card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wide flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#EF4444] animate-bounce" />
                Live Active Operations &amp; Partner GPS Markers
              </h2>
              <span className="px-3 py-1 bg-[#22C55E]/10 text-[#22C55E] rounded-full text-[10px] font-bold flex items-center gap-1.5 border border-[#22C55E]/20">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-ping" /> Socket Stream
              </span>
            </div>
            {Object.keys(liveLocations).length === 0 ? (
              <div className="bg-white/4 rounded-[16px] p-6 text-center text-[#94A3B8] text-xs border border-white/8">
                No active GPS streaming from delivery partners right now.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.values(liveLocations).map((loc) => (
                  <div key={loc.partnerId} className="bg-white/4 rounded-[16px] p-4 border border-white/8 hover:border-[#22C55E]/50 transition-colors flex flex-col justify-between space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">{loc.partnerName || 'Delivery Partner'}</span>
                      <span className="px-2 py-0.5 bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/30 text-[9px] font-bold rounded-full">ACTIVE GPS</span>
                    </div>
                    <p className="text-xs text-[#94A3B8] font-mono">
                      📍 Lat: {loc.lat?.toFixed(5)}, Lon: {loc.lon?.toFixed(5)}
                    </p>
                    <div className="flex items-center justify-between pt-2 border-t border-white/8 text-[10px]">
                      <span className="text-[#94A3B8]">Updated: {new Date(loc.timestamp).toLocaleTimeString('en-IN')}</span>
                      <a href={`https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lon}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 font-bold hover:underline flex items-center gap-1">
                        View Map ↗
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live Partner Fleet Table */}
          <div className="admin-table-container">
            <div className="p-5 admin-table-header flex items-center justify-between">
              <h2 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wide flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" /> Live Delivery Fleet &amp; Dispatch Status
              </h2>
              <span className="text-[10px] font-bold text-white bg-white/10 px-3 py-1 rounded-full">{partners.length} Partners</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/8 text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider bg-white/4">
                    <th className="py-3 px-5">Partner Name</th>
                    <th className="py-3 px-5">Phone / Contact</th>
                    <th className="py-3 px-5">Rating</th>
                    <th className="py-3 px-5">Status</th>
                    <th className="py-3 px-5">Active Assignment</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-xs text-white">
                  {partners.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-[#94A3B8] font-medium">No delivery partners found.</td>
                    </tr>
                  ) : (
                    partners.map(p => {
                      const activeOrd = activeOrders.find(o => o.deliveryPartnerId === p.id);
                      const analyticsPartner = analytics?.byPartner?.find(ap => ap.id === p.id);
                      return (
                        <tr key={p.id} className="admin-table-row group">
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] font-bold flex items-center justify-center shrink-0 border border-[#F59E0B]/30">
                                {p.profileImage ? (
                                  <img src={p.profileImage} alt="Partner" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                  p.name.charAt(0).toUpperCase()
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-white group-hover:text-[#22C55E] transition-colors">{p.name}</p>
                                <p className="text-[10px] text-[#94A3B8]">ID: {p.employeeId} &middot; {p.vehicleType}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-5">
                            <a href={`tel:+91${p.mobile}`} className="text-[#22C55E] hover:underline flex items-center gap-1">
                              <Phone className="w-3 h-3" /> +91 {p.mobile}
                            </a>
                          </td>
                          <td className="py-4 px-5">
                            <div className="flex flex-col">
                              {analyticsPartner?.avgRating ? (
                                <span className="text-[#F59E0B] font-bold text-xs flex items-center gap-1"><Star className="w-3 h-3 fill-current"/> {analyticsPartner.avgRating}</span>
                              ) : (
                                <span className="text-[#94A3B8] text-[10px]">No rating</span>
                              )}
                              <span className="text-[9px] text-[#94A3B8] uppercase">{analyticsPartner?.completed || 0} delivered</span>
                            </div>
                          </td>
                          <td className="py-4 px-5">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              !p.isActive ? 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30' :
                              p.status === 'Available' ? 'bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/30' :
                              p.status === 'On Delivery' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-white/10 text-white border border-white/20'
                            }`}>
                              {!p.isActive ? 'Inactive' : p.status}
                            </span>
                          </td>
                          <td className="py-4 px-5">
                            {activeOrd ? (
                              <div>
                                <Link to={`/admin/orders?search=${activeOrd.invoiceNumber || activeOrd.id}`} className="text-blue-400 hover:underline font-bold text-xs">
                                  {activeOrd.invoiceNumber || `#${activeOrd.id.slice(-6).toUpperCase()}`}
                                </Link>
                                <p className="text-[10px] text-[#94A3B8]">{activeOrd.user?.fullName || 'Customer'}</p>
                              </div>
                            ) : (
                              <span className="text-[#94A3B8] text-xs">None (Idle)</span>
                            )}
                          </td>
                          <td className="py-4 px-5 text-right space-x-2">
                            {p.mobile && (
                              <a
                                href={`tel:+91${p.mobile}`}
                                className="px-3 py-1.5 bg-white/5 text-white hover:bg-white/10 rounded-[10px] text-[10px] font-bold transition-colors border border-white/10 inline-flex items-center gap-1.5"
                              >
                                <Phone className="w-3 h-3" /> Call
                              </a>
                            )}
                            {activeOrd && (
                              <button
                                onClick={() => setReassignOrder(activeOrd)}
                                className="px-3 py-1.5 bg-[#F59E0B]/10 text-[#F59E0B] hover:bg-[#F59E0B]/20 rounded-[10px] text-[10px] font-bold transition-colors border border-[#F59E0B]/30 inline-flex items-center gap-1.5"
                              >
                                <RefreshCw className="w-3 h-3" /> Reassign
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
