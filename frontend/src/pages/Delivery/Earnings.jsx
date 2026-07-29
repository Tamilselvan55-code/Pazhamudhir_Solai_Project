import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { DollarSign, Clock, CheckCircle, TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { API_BASE } from '../../config/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
          
          // Generate chart data by grouping by date
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

  const getStatusColor = (status) => {
    if (status === 'Paid') return 'text-green-600 bg-green-50 border-green-200';
    return 'text-amber-600 bg-amber-50 border-amber-200';
  };

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white px-6 pt-10 pb-6 shadow-sm border-b border-gray-100 z-10 sticky top-0">
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          Earnings
        </h1>
        <p className="text-sm text-gray-500 mt-1">Track your deliveries and settlements.</p>
      </div>

      <div className="p-4 sm:p-6 pb-24 overflow-y-auto">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-2">
              <CheckCircle className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Total Deliveries</p>
            <span className="text-2xl font-black text-gray-900">{summary.totalDeliveries || 0}</span>
          </div>
          
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-2">
              <TrendingUp className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Total Paid</p>
            <span className="text-2xl font-black text-gray-900">₹{summary.paidAmount || 0}</span>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 col-span-2 relative overflow-hidden flex flex-col items-center justify-center text-center">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-full -mr-8 -mt-8 opacity-50 pointer-events-none"></div>
            <div className="relative z-10">
              <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-2 mx-auto">
                <Clock className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Pending Settlement</p>
              <div className="flex items-center gap-2 justify-center">
                <span className="text-4xl font-black text-amber-600">₹{summary.pendingAmount || 0}</span>
                {summary.pendingAmount > 0 && (
                  <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-lg">Unpaid</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Chart Section */}
        {chartData.length > 0 && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-6">
            <h3 className="font-bold text-gray-800 mb-4 text-sm">Earnings Trend</h3>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={(val) => `₹${val}`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#16a34a', fontWeight: 'bold' }}
                    formatter={(value) => [`₹${value}`, 'Earnings']}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#16a34a" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* History */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-50 flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Recent Payouts</h2>
          </div>
          
          {loading ? (
            <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-green-500 rounded-full animate-spin mb-3"></div>
            </div>
          ) : earnings.length === 0 ? (
            <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center">
              <AlertCircle className="w-12 h-12 mb-3 opacity-20 text-gray-400" />
              <p className="font-bold text-gray-600 text-sm">No earnings recorded yet.</p>
              <p className="text-xs mt-1 max-w-xs">Complete deliveries to start earning.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {earnings.map((e) => (
                <div key={e.id} className="p-5 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-black text-gray-900">{e.order?.invoiceNumber || 'Order'}</span>
                      <p className="text-[11px] font-semibold text-gray-400 mt-0.5">
                        {new Date(e.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-green-600">₹{e.totalEarned}</p>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border mt-1 inline-block ${getStatusColor(e.isSettled ? 'Paid' : 'Pending')}`}>
                        {e.isSettled ? 'Paid' : 'Pending'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                    <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg">Base: ₹{e.baseEarnings}</span>
                    {e.distanceBonus > 0 && <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg">Dist: ₹{e.distanceBonus}</span>}
                    {e.peakHourBonus > 0 && <span className="bg-orange-50 text-orange-700 px-2.5 py-1 rounded-lg">Peak: ₹{e.peakHourBonus}</span>}
                    <span className="bg-gray-50 text-gray-400 px-2.5 py-1 rounded-lg ml-auto border border-gray-100">{e.distanceKm.toFixed(1)} km</span>
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
