import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { IndianRupee, CheckCircle, Clock, TrendingUp, AlertCircle, ArrowUpRight, Wallet } from 'lucide-react';
import axios from 'axios';
import { API_BASE } from '../../config/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const SummaryCard = ({ icon: Icon, label, value, colorClass, bgClass, wide }) => (
  <div className={`bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 flex items-center gap-4 ${wide ? 'col-span-2' : ''} hover:shadow-md transition-all`}>
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${bgClass}`}>
      <Icon className={`w-6 h-6 ${colorClass}`} strokeWidth={2} />
    </div>
    <div>
      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-0.5">{label}</p>
      <p className={`text-2xl font-black ${colorClass}`}>{value}</p>
    </div>
  </div>
);

const DeliveryEarnings = () => {
  const { partner } = useOutletContext();
  const [earningsData, setEarningsData] = useState({ earnings: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    const fetchEarnings = async () => {
      const stored = localStorage.getItem('deliveryPartnerInfo');
      if (!stored) return;
      const parsedInfo = JSON.parse(stored);
      try {
        setLoading(true);
        const { data } = await axios.get(`${API_BASE}/delivery/earnings`, {
          headers: { Authorization: `Bearer ${parsedInfo.token}` }
        });
        if (data.success) {
          setEarningsData(data);
          const grouped = data.earnings.reduce((acc, curr) => {
            const dateStr = new Date(curr.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
            if (!acc[dateStr]) acc[dateStr] = 0;
            acc[dateStr] += curr.totalEarned;
            return acc;
          }, {});
          const cData = Object.keys(grouped).map(k => ({ name: k, amount: grouped[k] })).reverse();
          setChartData(cData);
        }
      } catch (error) {
        console.error('Failed to fetch earnings', error);
      } finally {
        setLoading(false);
      }
    };
    fetchEarnings();
  }, []);

  const { earnings, summary } = earningsData;

  const getStatusStyle = (isPaid) => isPaid
    ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/40'
    : 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/40';

  return (
    <div className="min-h-[100dvh] bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      
      {/* ── Sticky Header ──────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-900 px-5 pt-8 pb-5 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
            <Wallet className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white">Earnings</h1>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Track your deliveries and settlements</p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-6 pb-28 space-y-5">

        {/* ── Summary Cards ──────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className={`bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 animate-pulse ${i === 3 ? 'col-span-2' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800" />
                  <div className="flex-1">
                    <div className="h-2.5 w-20 bg-gray-100 dark:bg-gray-800 rounded mb-2" />
                    <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <SummaryCard icon={CheckCircle} label="Total Deliveries" value={summary.totalDeliveries || 0}
              bgClass="bg-blue-50 dark:bg-blue-900/20" colorClass="text-blue-600 dark:text-blue-400" />
            <SummaryCard icon={TrendingUp} label="Total Paid" value={`₹${summary.paidAmount || 0}`}
              bgClass="bg-green-50 dark:bg-green-900/20" colorClass="text-green-600 dark:text-green-400" />
            <div className="col-span-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-5 flex items-center gap-4 shadow-md shadow-amber-500/20">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-black text-orange-100 uppercase tracking-widest mb-0.5">Pending Settlement</p>
                <p className="text-3xl font-black text-white tracking-tight">₹{summary.pendingAmount || 0}</p>
              </div>
              {summary.pendingAmount > 0 && (
                <span className="bg-white/20 text-white text-xs font-black px-3 py-1.5 rounded-xl">Unpaid</span>
              )}
            </div>
          </div>
        )}

        {/* ── Earnings Chart ─────────────────────────────────────────── */}
        {!loading && chartData.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-black text-gray-900 dark:text-white text-sm">Earnings Trend</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Daily earnings breakdown</p>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-green-600 dark:text-green-400">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Last {chartData.length} days</span>
              </div>
            </div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="earningsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-gray-100 dark:text-gray-800" opacity={0.5} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={val => `₹${val}`} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 8px 16px rgba(0,0,0,0.08)', backgroundColor: 'white', fontSize: '12px', fontWeight: 700 }}
                    itemStyle={{ color: '#16a34a' }}
                    formatter={value => [`₹${value}`, 'Earnings']}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#16a34a" strokeWidth={2.5} fillOpacity={1} fill="url(#earningsGrad)" dot={{ fill: '#16a34a', strokeWidth: 0, r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── Payouts History ─────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
            <h2 className="font-black text-gray-900 dark:text-white text-sm">Payout History</h2>
            {earnings.length > 0 && (
              <span className="text-xs font-bold text-gray-400 dark:text-gray-500">{earnings.length} records</span>
            )}
          </div>

          {loading ? (
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {[1, 2, 3].map(i => (
                <div key={i} className="p-4 flex items-center justify-between animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800" />
                    <div>
                      <div className="h-3 w-24 bg-gray-100 dark:bg-gray-800 rounded mb-1.5" />
                      <div className="h-2.5 w-16 bg-gray-100 dark:bg-gray-800 rounded" />
                    </div>
                  </div>
                  <div className="h-5 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              ))}
            </div>
          ) : earnings.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center gap-3">
              <div className="w-14 h-14 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center">
                <IndianRupee className="w-7 h-7 text-gray-300 dark:text-gray-600" />
              </div>
              <p className="font-bold text-gray-600 dark:text-gray-400 text-sm">No earnings yet</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs">Complete your first delivery to see your earnings here.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-800/80">
              {earnings.map((e) => (
                <div key={e.id} className="px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <IndianRupee className="w-5 h-5 text-green-600 dark:text-green-400" strokeWidth={2} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white text-sm">{e.order?.invoiceNumber || 'Order'}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {new Date(e.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-black text-green-600 dark:text-green-400">₹{e.totalEarned}</p>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border inline-block mt-0.5 ${getStatusStyle(e.isSettled)}`}>
                        {e.isSettled ? 'Paid' : 'Pending'}
                      </span>
                    </div>
                  </div>
                  {/* Breakdown pills */}
                  <div className="flex flex-wrap gap-1.5 mt-3 ml-13">
                    <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px] font-bold px-2.5 py-1 rounded-lg">Base: ₹{e.baseEarnings}</span>
                    {e.distanceBonus > 0 && <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-[10px] font-bold px-2.5 py-1 rounded-lg">Dist: ₹{e.distanceBonus}</span>}
                    {e.peakHourBonus > 0 && <span className="bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 text-[10px] font-bold px-2.5 py-1 rounded-lg">Peak: ₹{e.peakHourBonus}</span>}
                    <span className="bg-gray-50 dark:bg-gray-800/80 text-gray-400 dark:text-gray-500 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-gray-100 dark:border-gray-700 ml-auto">{e.distanceKm?.toFixed(1)} km</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeliveryEarnings;
