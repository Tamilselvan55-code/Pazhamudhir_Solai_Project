import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { DollarSign, Search, CheckCircle, Clock, FileText, Download, ArrowDownToLine, Users } from 'lucide-react';
import AdminLayout from '../../components/Admin/AdminLayout';
import useAuthStore from '../../store/useAuthStore';
import axios from 'axios';
import { API_BASE } from '../../config/api';
import { StatCard } from '../../components/Admin/DashboardShared';
import useModal from '../../hooks/useModal';

const DeliveryEarnings = () => {
  const { adminInfo } = useAuthStore();
  const { adminPrompt, toast } = useModal();
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
    const ref = await adminPrompt("Enter Reference", "Enter payment reference number (optional):");
    if (ref === null) return;

    setSettleLoading(partnerId);
    try {
      await axios.post(`${API_BASE}/admin/delivery-earnings/${partnerId}/settle`, { referenceId: ref }, {
        headers: { Authorization: `Bearer ${adminInfo.token}` }
      });
      fetchEarnings();
    } catch (error) {
      toast('error', error.response?.data?.message || 'Failed to process settlement');
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

  const isSuperAdmin = adminInfo?.role === 'SuperAdmin' || adminInfo?.role === 'Super Admin';
  if (!adminInfo || (!isSuperAdmin && !adminInfo.permissions?.reports)) {
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
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-[#22C55E]" />
            Delivery Earnings Management
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">Manage and settle earnings for your delivery fleet.</p>
        </div>

        <button onClick={exportCSV} className="admin-btn-secondary px-4 py-2 flex items-center gap-2 text-sm">
          <ArrowDownToLine className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard title="Total Pending" value={`₹${totalPending}`} icon={Clock} iconColor="text-[#F59E0B]" gradientBg="bg-[#F59E0B]" />
        <StatCard title="Total Paid" value={`₹${totalPaid}`} icon={CheckCircle} iconColor="text-[#22C55E]" gradientBg="bg-[#22C55E]" />
        <StatCard title="Active Partners" value={earnings.length} icon={Users} iconColor="text-blue-500" gradientBg="bg-blue-500" />
      </div>

      <div className="admin-table-container mb-6">
        <div className="p-5 admin-table-header flex flex-col sm:flex-row items-center justify-between gap-4">
          <h2 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wide flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#22C55E]" /> Partner Settlements
          </h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search partner or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="admin-search-bar w-full"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/8 text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider bg-white/4">
                <th className="py-4 px-6">Delivery Partner</th>
                <th className="py-4 px-6 text-center">Completed Deliveries</th>
                <th className="py-4 px-6 text-right">Lifetime Earned</th>
                <th className="py-4 px-6 text-right">Paid Amount</th>
                <th className="py-4 px-6 text-right">Pending Amount</th>
                <th className="py-4 px-6 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="text-xs text-white">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-[#94A3B8]">Loading...</td>
                </tr>
              ) : filteredEarnings.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-[#94A3B8]">No earnings data found.</td>
                </tr>
              ) : (
                filteredEarnings.map(partner => (
                  <tr key={partner.id} className="admin-table-row group">
                    <td className="py-4 px-6">
                      <p className="font-bold text-white group-hover:text-[#22C55E] transition-colors">{partner.name}</p>
                      <p className="text-[11px] text-[#94A3B8] mt-0.5">{partner.employeeId} &middot; {partner.mobile}</p>
                    </td>
                    <td className="py-4 px-6 text-center text-[#94A3B8] font-bold">{partner.completedDeliveries}</td>
                    <td className="py-4 px-6 text-right font-mono text-white">₹{partner.totalLifetimeEarnings}</td>
                    <td className="py-4 px-6 text-right font-mono text-[#22C55E] font-bold">₹{partner.paidAmount}</td>
                    <td className="py-4 px-6 text-right font-mono text-[#F59E0B] font-bold">₹{partner.pendingAmount}</td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handleSettle(partner.id)}
                        disabled={partner.pendingAmount === 0 || settleLoading === partner.id}
                        className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 w-full max-w-[120px] mx-auto ${
                          partner.pendingAmount === 0 
                            ? 'bg-white/5 text-[#94A3B8] border border-white/10' 
                            : 'bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30 hover:bg-[#22C55E]/20'
                        }`}
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
