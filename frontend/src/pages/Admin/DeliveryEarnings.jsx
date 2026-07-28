import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { DollarSign, Search, CheckCircle, Clock, FileText, Download } from 'lucide-react';
import AdminLayout from '../../components/Admin/AdminLayout';
import useAuthStore from '../../store/useAuthStore';
import axios from 'axios';
import { API_BASE } from '../../config/api';

const DeliveryEarnings = () => {
  const { adminInfo } = useAuthStore();
  const [earnings, setEarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [settleLoading, setSettleLoading] = useState(null);

  useEffect(() => {
    fetchEarnings();
  }, []);

  const fetchEarnings = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_BASE}/admin/delivery-earnings`, {
        headers: { Authorization: `Bearer ${adminInfo.token}` }
      });
      setEarnings(data.earnings || []);
    } catch (error) {
      console.error('Failed to fetch delivery earnings', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSettle = async (partnerId) => {
    const ref = prompt("Enter payment reference number (optional):");
    if (ref === null) return;

    setSettleLoading(partnerId);
    try {
      await axios.post(`${API_BASE}/admin/delivery-earnings/${partnerId}/settle`, { referenceId: ref }, {
        headers: { Authorization: `Bearer ${adminInfo.token}` }
      });
      fetchEarnings();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to process settlement');
    } finally {
      setSettleLoading(null);
    }
  };

  const exportCSV = () => {
    const csvRows = ['Partner Name,ID,Completed Deliveries,Pending Amount (Rs),Paid Amount (Rs),Lifetime Earnings (Rs)'];
    earnings.forEach(p => {
      csvRows.push(`"${p.name}","${p.employeeId}",${p.completedDeliveries},${p.pendingAmount},${p.paidAmount},${p.totalLifetimeEarnings}`);
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Delivery_Earnings_Report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!adminInfo || !adminInfo.permissions?.reports) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const filteredEarnings = earnings.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPending = earnings.reduce((acc, curr) => acc + curr.pendingAmount, 0);
  const totalPaid = earnings.reduce((acc, curr) => acc + curr.paidAmount, 0);

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-green-600" />
            Delivery Earnings Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage and settle earnings for your delivery fleet.</p>
        </div>

        <button onClick={exportCSV} className="flex items-center gap-1.5 bg-white px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-xs">
          <Download className="w-4 h-4 text-gray-500" /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Pending</p>
            <p className="text-2xl font-black text-gray-900 mt-0.5">₹{totalPending}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Paid</p>
            <p className="text-2xl font-black text-gray-900 mt-0.5">₹{totalPaid}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Partners</p>
            <p className="text-2xl font-black text-gray-900 mt-0.5">{earnings.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/50">
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            Partner Settlements
          </h2>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search partner or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-100 text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">
                <th className="py-4 px-6">Delivery Partner</th>
                <th className="py-4 px-6 text-center">Completed Deliveries</th>
                <th className="py-4 px-6 text-right">Lifetime Earned</th>
                <th className="py-4 px-6 text-right">Paid Amount</th>
                <th className="py-4 px-6 text-right">Pending Amount</th>
                <th className="py-4 px-6 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm font-medium text-gray-800">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-gray-500">Loading...</td>
                </tr>
              ) : filteredEarnings.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-gray-400">No earnings data found.</td>
                </tr>
              ) : (
                filteredEarnings.map(partner => (
                  <tr key={partner.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6">
                      <p className="font-bold text-gray-900">{partner.name}</p>
                      <p className="text-xs text-gray-500">{partner.employeeId} &middot; {partner.mobile}</p>
                    </td>
                    <td className="py-4 px-6 text-center">{partner.completedDeliveries}</td>
                    <td className="py-4 px-6 text-right">₹{partner.totalLifetimeEarnings}</td>
                    <td className="py-4 px-6 text-right text-green-600 font-bold">₹{partner.paidAmount}</td>
                    <td className="py-4 px-6 text-right text-amber-600 font-bold">₹{partner.pendingAmount}</td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handleSettle(partner.id)}
                        disabled={partner.pendingAmount === 0 || settleLoading === partner.id}
                        className="px-4 py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 w-full max-w-[120px] mx-auto bg-green-600 hover:bg-green-700 text-white"
                      >
                        {settleLoading === partner.id ? 'Processing...' : 'Pay Now'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default DeliveryEarnings;
