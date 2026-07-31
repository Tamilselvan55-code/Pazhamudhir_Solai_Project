import React, { useEffect, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../../config/api';
import { IndianRupee, PackageCheck, Package, Clock, Wallet, Star, CheckCircle, Target, Loader2 } from 'lucide-react';
import useModal from '../../hooks/useModal';

const DeliveryHome = () => {
  const { partner, setPartner } = useOutletContext();
  const navigate = useNavigate();
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

    // Optimistic UI Update
    const previousStatus = partner?.status;
    setPartner({ ...partner, status: newStatus });
    setIsToggling(true);

    try {
      const { data } = await axios.put(`${API_BASE}/delivery/profile`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${parsedInfo.token}` }
      });
      
      setPartner(data);
      
      // Update LocalStorage
      const updatedInfo = { ...parsedInfo, ...data, token: parsedInfo.token };
      localStorage.setItem('deliveryPartnerInfo', JSON.stringify(updatedInfo));

      // Emit real-time status change to admin
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
      // Rollback
      setPartner({ ...partner, status: previousStatus });
      setToastMsg('Failed to update status. Please try again.');
      setTimeout(() => setToastMsg(''), 3000);
    } finally {
      setIsToggling(false);
    }
  };

  const StatCard = ({ icon: Icon, label, value, colorClass, delay }) => (
    <div className={`bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] dark:shadow-none border border-gray-100 dark:border-gray-700 flex flex-col justify-between hover:-translate-y-1 transform transition-all duration-300 animate-in fade-in slide-in-from-bottom-4`} style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colorClass}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <div>
        <p className="text-gray-500 dark:text-gray-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1 line-clamp-1">{label}</p>
        <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-gray-50 dark:bg-gray-900 pb-24 transition-colors duration-300 relative">
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] bg-gray-900 text-white px-4 py-2 rounded-full shadow-lg text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <span>{toastMsg}</span>
        </div>
      )}
      {/* Top Header / Profile Section */}
      <div className="bg-white dark:bg-gray-800 rounded-b-[2rem] pt-12 pb-8 px-6 shadow-sm border-b border-gray-100 dark:border-gray-700 relative overflow-hidden transition-colors">
        <div className="absolute top-0 right-0 w-48 h-48 bg-green-100 dark:bg-green-900/20 rounded-full blur-3xl -mr-16 -mt-16 opacity-70"></div>
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {partner?.profileImage ? (
              <img src={partner?.profileImage} alt={partner?.name} className="w-16 h-16 rounded-full object-cover shadow-lg ring-4 ring-white/50 dark:ring-gray-800 transition-all hover:scale-105 duration-300" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-black text-2xl shadow-lg ring-4 ring-white/50 dark:ring-gray-800 shrink-0 transition-all hover:scale-105 duration-300">
                {partner?.name?.charAt(0).toUpperCase() || 'D'}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                {new Date().getHours() < 12 ? 'Good Morning,' : new Date().getHours() < 17 ? 'Good Afternoon,' : 'Good Evening,'}
              </p>
              <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{partner?.name?.split(' ')[0] || 'Partner'}</h1>
            </div>
          </div>
          
          <div className="flex flex-col items-end">
            <button
              disabled={!partner?.isVerified || isToggling}
              onClick={() => {
                if (!partner?.isVerified || isToggling) return;
                updateStatus(partner?.status === 'Available' ? 'Offline' : 'Available');
              }}
              className={`relative inline-flex items-center justify-center w-16 h-8 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-800 ${
                !partner?.isVerified 
                  ? 'bg-gray-200 dark:bg-gray-700 cursor-not-allowed opacity-50'
                  : partner?.status === 'Available' 
                    ? 'bg-green-500 hover:bg-green-600' 
                    : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
              }`}
            >
              {isToggling ? (
                <Loader2 className="w-4 h-4 text-white animate-spin absolute" />
              ) : (
                <span className={`inline-block w-6 h-6 bg-white rounded-full transition-transform transform shadow-md duration-300 ${
                  partner?.status === 'Available' ? 'translate-x-4' : '-translate-x-4'
                }`} />
              )}
            </button>
            <span className={`text-xs font-bold mt-2 uppercase tracking-wide transition-colors ${partner?.status === 'Available' ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
              {isToggling ? 'Updating...' : partner?.status === 'Available' ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        {!partner?.isVerified && (
          <div className="mt-6 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-900/50 rounded-2xl p-4 flex gap-3 transition-colors">
            <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center shrink-0">
              <CheckCircle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-orange-800 dark:text-orange-300">Verification Pending</p>
              <p className="text-xs text-orange-600 dark:text-orange-400/80 mt-1">Please wait for admin approval to start receiving orders.</p>
            </div>
          </div>
        )}
      </div>

      {/* Main Dashboard Cards */}
      <div className="p-6 space-y-6">
        <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Today's Overview</h2>
        
        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 h-32 animate-pulse flex flex-col justify-between">
                <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-gray-700"></div>
                <div>
                  <div className="h-3 w-16 bg-gray-100 dark:bg-gray-700 rounded mb-2"></div>
                  <div className="h-6 w-12 bg-gray-200 dark:bg-gray-600 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <StatCard 
              icon={IndianRupee} 
              label="Today's Earnings" 
              value={`₹${metrics?.totalEarnings || 0}`} 
              colorClass="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400" 
              delay={100}
            />
            <StatCard 
              icon={PackageCheck} 
              label="Completed Orders" 
              value={metrics?.deliveriesToday || 0} 
              colorClass="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400" 
              delay={200}
            />
            <StatCard 
              icon={Clock} 
              label="Pending Orders" 
              value={metrics?.pendingDeliveries || 0} 
              colorClass="bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400" 
              delay={300}
            />
            <StatCard 
              icon={Package} 
              label="Active Deliveries" 
              value={metrics?.activeDeliveries || 0} 
              colorClass="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400" 
              delay={400}
            />
            <StatCard 
              icon={Star} 
              label="Average Rating" 
              value={metrics?.rating || 'No Rating'} 
              colorClass="bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400" 
              delay={500}
            />
            <StatCard 
              icon={Target} 
              label="Today's Distance" 
              value={`${metrics?.distanceToday || 0} km`} 
              colorClass="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400" 
              delay={600}
            />
            <StatCard 
              icon={Wallet} 
              label="Weekly Earnings" 
              value={`₹${(metrics?.weeklyDeliveries * 40) || 0}`} // fallback approx calculation 
              colorClass="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400" 
              delay={700}
            />
          </div>
        )}

        {/* Empty State for no orders */}
        {!loading && metrics?.deliveriesToday === 0 && metrics?.pendingDeliveries === 0 && (
          <div className="mt-8 text-center p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-orange-500 dark:text-orange-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No active orders yet</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Ensure you are marked as "Online" to start receiving delivery assignments from the store.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryHome;
