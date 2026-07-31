import React, { useEffect, useState } from 'react';
import { useOutletContext, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../../config/api';
import { 
  IndianRupee, PackageCheck, Package, Clock, Wallet, Star, 
  CheckCircle, Target, Loader2, TrendingUp, Zap, ArrowRight, Bell
} from 'lucide-react';
import useDeliveryStore from '../../store/useDeliveryStore';

const SkeletonCard = () => (
  <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 animate-pulse">
    <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 mb-4" />
    <div className="h-3 w-16 bg-gray-100 dark:bg-gray-800 rounded-full mb-2" />
    <div className="h-7 w-12 bg-gray-200 dark:bg-gray-700 rounded-lg" />
  </div>
);

const DeliveryHome = () => {
  const { partner, setPartner } = useOutletContext();
  const navigate = useNavigate();
  const { unreadCount } = useDeliveryStore();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    const fetchAnalytics = async () => {
      const stored = localStorage.getItem('deliveryPartnerInfo');
      if (!stored) return;
      const parsedInfo = JSON.parse(stored);
      try {
        const { data } = await axios.get(`${API_BASE}/delivery/analytics`, {
          headers: { Authorization: `Bearer ${parsedInfo.token}` }
        });
        setMetrics(data);
      } catch (err) {
        console.error('Failed to fetch analytics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const updateStatus = async (newStatus) => {
    if (isToggling) return;
    const stored = localStorage.getItem('deliveryPartnerInfo');
    if (!stored) return;
    const parsedInfo = JSON.parse(stored);

    const previousStatus = partner?.status;
    setPartner({ ...partner, status: newStatus });
    setIsToggling(true);

    try {
      const { data } = await axios.put(`${API_BASE}/delivery/profile`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${parsedInfo.token}` }
      });
      setPartner(data);
      const updatedInfo = { ...parsedInfo, ...data, token: parsedInfo.token };
      localStorage.setItem('deliveryPartnerInfo', JSON.stringify(updatedInfo));

      import('socket.io-client').then(({ io }) => {
        const socketURL = API_BASE.replace('/api', '');
        const socket = io(socketURL, { transports: ['websocket', 'polling'] });
        socket.on('connect', () => {
          socket.emit('delivery_status_change', { partnerId: data.id || data._id, status: data.status });
          setTimeout(() => socket.disconnect(), 1000);
        });
      });
    } catch (error) {
      console.error('Failed to update status', error);
      setPartner({ ...partner, status: previousStatus });
      setToastMsg('Failed to update status. Please try again.');
      setTimeout(() => setToastMsg(''), 3000);
    } finally {
      setIsToggling(false);
    }
  };

  const StatCard = ({ icon: Icon, label, value, colorClass, bgClass, delay }) => (
    <div
      className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 hover:shadow-md hover:-translate-y-0.5 transform transition-all duration-300"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${bgClass}`}>
        <Icon className={`w-5 h-5 ${colorClass}`} strokeWidth={2} />
      </div>
      <p className="text-gray-400 dark:text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{value}</p>
    </div>
  );

  const isOnline = partner?.status === 'Available';
  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? 'Good Morning' : greetingHour < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div className="min-h-[100dvh] bg-gray-50 dark:bg-gray-950 transition-colors duration-300 relative">
      
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] bg-gray-900 dark:bg-gray-700 text-white px-4 py-2.5 rounded-2xl shadow-xl text-sm font-semibold flex items-center gap-2 border border-gray-700 dark:border-gray-600">
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── Header Banner ─────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 transition-colors duration-300 relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-56 h-56 bg-green-100 dark:bg-green-900/10 rounded-full blur-3xl -mr-20 -mt-20 opacity-60 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-50 dark:bg-emerald-900/10 rounded-full blur-2xl -ml-10 -mb-10 opacity-50 pointer-events-none" />

        <div className="relative z-10 px-5 pt-8 pb-6">
          <div className="flex items-center justify-between">
            {/* Partner greeting */}
            <div className="flex items-center gap-4">
              {partner?.profileImage ? (
                <img src={partner.profileImage} alt={partner.name} className="w-14 h-14 rounded-2xl object-cover shadow-md ring-2 ring-green-500/20" />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-400 to-green-700 flex items-center justify-center text-white font-black text-2xl shadow-md ring-2 ring-green-500/20 flex-shrink-0">
                  {partner?.name?.charAt(0).toUpperCase() || 'P'}
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500">{greeting},</p>
                <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">
                  {partner?.name?.split(' ')[0] || 'Partner'}
                </h1>
                {partner?.vehicleNumber && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 font-medium">{partner.vehicleType} · {partner.vehicleNumber}</p>
                )}
              </div>
            </div>

            {/* Online/Offline toggle */}
            <div className="flex flex-col items-center gap-2">
              <button
                disabled={!partner?.isVerified || isToggling}
                onClick={() => {
                  if (!partner?.isVerified || isToggling) return;
                  updateStatus(isOnline ? 'Offline' : 'Available');
                }}
                className={`relative inline-flex items-center justify-center w-14 h-7 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
                  !partner?.isVerified
                    ? 'bg-gray-200 dark:bg-gray-700 cursor-not-allowed opacity-50'
                    : isOnline
                      ? 'bg-green-500 hover:bg-green-600 focus:ring-green-500'
                      : 'bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 focus:ring-gray-400'
                }`}
                aria-label={isOnline ? 'Go offline' : 'Go online'}
              >
                {isToggling ? (
                  <Loader2 className="w-3.5 h-3.5 text-white animate-spin absolute" />
                ) : (
                  <span className={`inline-block w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${isOnline ? 'translate-x-3.5' : '-translate-x-3.5'}`} />
                )}
              </button>
              <span className={`text-[10px] font-black uppercase tracking-widest ${isOnline ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                {isToggling ? '...' : isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>

          {/* Verification pending banner */}
          {!partner?.isVerified && (
            <div className="mt-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-xl p-3.5 flex gap-3 items-start">
              <CheckCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Verification Pending</p>
                <p className="text-xs text-amber-600 dark:text-amber-400/80 mt-0.5">Admin approval required to start accepting orders.</p>
              </div>
            </div>
          )}

          {/* Status pills */}
          <div className="mt-4 flex gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${isOnline ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900/40' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              {isOnline ? 'Accepting Orders' : 'Not Accepting Orders'}
            </span>
            {partner?.isVerified && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40">
                <CheckCircle className="w-3 h-3" />Verified
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Dashboard Cards ────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 pt-6 pb-28 space-y-6">

        {/* Section header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-gray-900 dark:text-white">Today's Overview</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
          <Link to="/delivery/earnings" className="flex items-center gap-1 text-xs font-bold text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors">
            Full Report <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={IndianRupee} label="Today's Earnings" value={`₹${metrics?.totalEarnings || 0}`}
              bgClass="bg-green-50 dark:bg-green-900/20" colorClass="text-green-600 dark:text-green-400" delay={0} />
            <StatCard icon={PackageCheck} label="Completed" value={metrics?.deliveriesToday || 0}
              bgClass="bg-blue-50 dark:bg-blue-900/20" colorClass="text-blue-600 dark:text-blue-400" delay={50} />
            <StatCard icon={Clock} label="Pending" value={metrics?.pendingDeliveries || 0}
              bgClass="bg-amber-50 dark:bg-amber-900/20" colorClass="text-amber-600 dark:text-amber-400" delay={100} />
            <StatCard icon={Zap} label="Active" value={metrics?.activeDeliveries || 0}
              bgClass="bg-purple-50 dark:bg-purple-900/20" colorClass="text-purple-600 dark:text-purple-400" delay={150} />
            <StatCard icon={Star} label="Rating" value={metrics?.rating || '—'}
              bgClass="bg-yellow-50 dark:bg-yellow-900/20" colorClass="text-yellow-500 dark:text-yellow-400" delay={200} />
            <StatCard icon={Target} label="Distance" value={`${metrics?.distanceToday || 0} km`}
              bgClass="bg-indigo-50 dark:bg-indigo-900/20" colorClass="text-indigo-600 dark:text-indigo-400" delay={250} />
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <h3 className="text-sm font-black text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/delivery/orders" className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 flex items-center gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
              <div className="w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Package className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">My Orders</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">View active orders</p>
              </div>
            </Link>
            <Link to="/delivery/earnings" className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 flex items-center gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
              <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">Earnings</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">Track payouts</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Empty state for no orders */}
        {!loading && metrics?.deliveriesToday === 0 && metrics?.pendingDeliveries === 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-8 text-center">
            <div className="w-14 h-14 bg-orange-50 dark:bg-orange-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Package className="w-7 h-7 text-orange-400 dark:text-orange-400" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">No active orders yet</h3>
            <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs mx-auto">
              {isOnline
                ? 'Waiting for new orders to be assigned to you.'
                : 'Go online to start receiving delivery assignments.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryHome;
