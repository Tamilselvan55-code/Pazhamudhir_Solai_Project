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
    const stored = localStorage.getItem('deliveryPartnerInfo');
    if (!stored) return;
    const parsedInfo = JSON.parse(stored);

    try {
      const { data } = await axios.put(`${API_BASE}/delivery/profile`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${parsedInfo.token}` }
      });
      setPartner(data);
    } catch (error) {
      console.error('Failed to update status', error);
      toast('error', 'Failed to update status');
    }
  };

  const StatCard = ({ icon: Icon, label, value, colorClass, delay }) => (
    <div className={`bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between animate-in fade-in slide-in-from-bottom-4 duration-500 transition-colors`} style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${colorClass}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div>
        <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">{label}</p>
        <p className="text-2xl font-black text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-gray-50 dark:bg-gray-900 pb-24 transition-colors duration-300">
      {/* Top Header / Profile Section */}
      <div className="bg-white dark:bg-gray-800 rounded-b-[2rem] pt-12 pb-8 px-6 shadow-sm border-b border-gray-100 dark:border-gray-700 relative overflow-hidden transition-colors">
        <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 dark:bg-green-900/20 rounded-full blur-3xl -mr-10 -mt-10 opacity-70"></div>
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {partner?.profileImage ? (
              <img src={partner?.profileImage} alt={partner?.name} className="w-16 h-16 rounded-full object-cover shadow-md ring-4 ring-white dark:ring-gray-800 transition-colors" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-bold text-2xl shadow-md ring-4 ring-white dark:ring-gray-800 shrink-0 transition-colors">
                {partner?.name?.charAt(0).toUpperCase() || 'D'}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Hello,</p>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">{partner?.name?.split(' ')[0] || 'Rider'}</h1>
            </div>
          </div>
          
          <div className="flex flex-col items-end">
            <button
              disabled={!partner?.isVerified}
              onClick={() => {
                if (!partner?.isVerified) return;
                updateStatus(partner?.status === 'Available' ? 'Offline' : 'Available');
              }}
              className={`relative inline-flex items-center justify-center w-14 h-8 rounded-full transition-colors ${
                !partner?.isVerified 
                  ? 'bg-gray-200 dark:bg-gray-700 cursor-not-allowed'
                  : partner?.status === 'Available' 
                    ? 'bg-green-500 dark:bg-green-600' 
                    : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span className={`inline-block w-6 h-6 bg-white rounded-full transition-transform transform shadow-sm ${
                partner?.status === 'Available' ? 'translate-x-3' : '-translate-x-3'
              }`} />
            </button>
            <span className={`text-xs font-bold mt-1.5 ${partner?.status === 'Available' ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
              {partner?.status === 'Available' ? 'Online' : 'Offline'}
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
        <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">Today's Overview</h2>
        
        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
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
              label="Earnings" 
              value={`₹${metrics?.totalEarnings || 0}`} 
              colorClass="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" 
              delay={100}
            />
            <StatCard 
              icon={PackageCheck} 
              label="Completed" 
              value={metrics?.deliveriesToday || 0} 
              colorClass="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" 
              delay={200}
            />
            <StatCard 
              icon={Clock} 
              label="Pending" 
              value={metrics?.pendingDeliveries || 0} 
              colorClass="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400" 
              delay={300}
            />
            <StatCard 
              icon={Package} 
              label="Active" 
              value={metrics?.activeDeliveries || 0} 
              colorClass="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400" 
              delay={400}
            />
            <StatCard 
              icon={Wallet} 
              label="Wallet Balance" 
              value={`₹${partner?.walletBalance || 0}`} 
              colorClass="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" 
              delay={500}
            />
            <StatCard 
              icon={Star} 
              label="Rating" 
              value={metrics?.rating || '4.8'} 
              colorClass="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400" 
              delay={600}
            />
            <StatCard 
              icon={Target} 
              label="Acceptance" 
              value={`${metrics?.acceptanceRate || '98'}%`} 
              colorClass="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400" 
              delay={700}
            />
            <StatCard 
              icon={CheckCircle} 
              label="Completion" 
              value={`${metrics?.completionRate || '99'}%`} 
              colorClass="bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400" 
              delay={800}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryHome;
