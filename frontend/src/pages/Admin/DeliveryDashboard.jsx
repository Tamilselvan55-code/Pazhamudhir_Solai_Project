import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Truck, CheckCircle, Clock, XCircle, Users, Activity, BarChart, Package } from 'lucide-react';
import AdminLayout from '../../components/Admin/AdminLayout';
import useAuthStore from '../../store/useAuthStore';
import axios from 'axios';
import { API_BASE } from '../../config/api';

const DeliveryDashboard = () => {
  const { adminInfo } = useAuthStore();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/admin/delivery-partners/analytics`, {
        headers: { Authorization: `Bearer ${adminInfo.token}` }
      });
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to fetch analytics', error);
    } finally {
      setLoading(false);
    }
  };

  if (!adminInfo || !adminInfo.permissions?.users) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const kpis = analytics ? [
    { label: 'Total Partners', value: analytics.partners.total, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Available', value: analytics.partners.available, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
    { label: 'On Delivery', value: analytics.partners.onDelivery, icon: Truck, color: 'text-orange-600', bg: 'bg-orange-100' },
    { label: 'Offline / Inactive', value: analytics.partners.offline + analytics.partners.inactive, icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' }
  ] : [];

  const orderStats = analytics ? [
    { label: 'Active Deliveries', value: analytics.orders.active, icon: Activity, color: 'text-purple-600', bg: 'bg-purple-100' },
    { label: 'Completed Today', value: analytics.orders.completedToday, icon: Package, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { label: 'Completed This Month', value: analytics.orders.completedThisMonth, icon: BarChart, color: 'text-indigo-600', bg: 'bg-indigo-100' }
  ] : [];

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Truck className="w-7 h-7 text-green-600" />
          Delivery Dashboard
        </h1>
        <p className="text-sm text-gray-500 mt-1">Overview of delivery operations and partner performance</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4">Partner Status</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {kpis.map((kpi, index) => (
                <div key={index} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${kpi.bg}`}>
                    <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">{kpi.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4">Order Metrics</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {orderStats.map((stat, index) => (
                <div key={index} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.bg}`}>
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
                  <p className="text-3xl font-extrabold text-gray-900 mt-1">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default DeliveryDashboard;
