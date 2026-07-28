import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, Clock, CheckCircle, TrendingUp, Calendar, AlertCircle, ArrowLeft } from 'lucide-react';
import useAuthStore from '../../store/useAuthStore';
import axios from 'axios';
import { API_BASE } from '../../config/api';

const DeliveryEarnings = () => {
  const { deliveryInfo } = useAuthStore();
  const navigate = useNavigate();
  const [earningsData, setEarningsData] = useState({ earnings: [], summary: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!deliveryInfo) {
      navigate('/delivery/login');
      return;
    }
    fetchEarnings();
  }, [navigate, deliveryInfo]);

  const fetchEarnings = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_BASE}/delivery/earnings`, {
        headers: { Authorization: `Bearer ${deliveryInfo.token}` }
      });
      if (data.success) {
        setEarningsData(data);
      }
    } catch (error) {
      console.error('Failed to fetch earnings', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('deliveryPartnerInfo');
    navigate('/delivery/login');
  };

  if (!deliveryInfo) {
    return null;
  }

  const { earnings, summary } = earningsData;

  const getStatusColor = (status) => {
    if (status === 'Paid') return 'text-green-600 bg-green-50 border-green-200';
    return 'text-amber-600 bg-amber-50 border-amber-200';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex-shrink-0 flex items-center gap-4">
              <button onClick={() => navigate('/delivery/dashboard')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <span className="font-bold text-xl text-orange-600">Earnings Dashboard</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleLogout}
                className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-6 max-w-5xl mx-auto pb-24">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <DollarSign className="w-8 h-8 text-green-600" />
            My Earnings
          </h1>
          <p className="text-sm text-gray-500 mt-1">Track your deliveries and settlements.</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-white p-4 rounded-2xl shadow-xs border border-gray-100">
            <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Deliveries</p>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-500" />
              <span className="text-xl sm:text-2xl font-black text-gray-900">{summary.totalDeliveries || 0}</span>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-2xl shadow-xs border border-gray-100">
            <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Paid</p>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <span className="text-xl sm:text-2xl font-black text-gray-900">₹{summary.paidAmount || 0}</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-xs border border-gray-100 col-span-2 md:col-span-2 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -mr-4 -mt-4 opacity-50 pointer-events-none"></div>
            <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Pending Settlement</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-6 h-6 text-amber-500" />
                <span className="text-2xl sm:text-3xl font-black text-amber-600">₹{summary.pendingAmount || 0}</span>
              </div>
              {summary.pendingAmount > 0 && (
                <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-lg">Unpaid</span>
              )}
            </div>
          </div>
        </div>

        {/* History */}
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-500" />
              Earnings History
            </h2>
          </div>
          
          {loading ? (
            <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-green-500 rounded-full animate-spin mb-3"></div>
              <p className="text-sm font-semibold">Loading earnings...</p>
            </div>
          ) : earnings.length === 0 ? (
            <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center">
              <AlertCircle className="w-10 h-10 mb-3 opacity-20" />
              <p className="font-bold text-gray-600 text-sm">No earnings recorded yet.</p>
              <p className="text-xs mt-1 max-w-xs">Complete deliveries to start earning.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {earnings.map((e) => (
                <div key={e.id} className="p-4 sm:p-5 hover:bg-gray-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-black text-gray-900">{e.order?.invoiceNumber || 'Order'}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusColor(e.isSettled ? 'Paid' : 'Pending')}`}>
                        {e.isSettled ? 'Paid' : 'Pending'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">
                      {new Date(e.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      <span className="mx-2">•</span>
                      {e.distanceKm.toFixed(1)} km
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold text-gray-600">
                      <span className="bg-gray-100 px-2 py-1 rounded-lg">Base: ₹{e.baseEarnings}</span>
                      {e.distanceBonus > 0 && <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-lg">Dist Bonus: ₹{e.distanceBonus}</span>}
                      {e.peakHourBonus > 0 && <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded-lg">Peak: ₹{e.peakHourBonus}</span>}
                    </div>
                  </div>
                  <div className="flex items-center sm:items-end flex-row sm:flex-col justify-between sm:justify-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 sm:block hidden">Total Earned</p>
                    <p className="text-2xl font-black text-green-600">₹{e.totalEarned}</p>
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
