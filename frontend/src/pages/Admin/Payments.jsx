import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { CreditCard, Search, CheckCircle, Clock, XCircle, RefreshCw, Eye, Edit3, ShieldAlert, Loader2, UserCheck } from 'lucide-react';
import AdminLayout from '../../components/Admin/AdminLayout';
import useAuthStore from '../../store/useAuthStore';
import axios from 'axios';
import useModal from '../../hooks/useModal';
import { formatCurrencyDecimal } from '../../utils/currency';

const Payments = () => {
  const { adminInfo } = useAuthStore();
  const { adminAlert } = useModal();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  // Modal State
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('status'); // 'status', 'history'
  const [updating, setUpdating] = useState(false);

  const fetchPayments = async () => {
    if (!adminInfo) return;
    try {
      setLoading(true);
      const { data } = await axios.get('http://localhost:5000/api/admin/payments', {
        headers: { Authorization: `Bearer ${adminInfo.token}` },
        params: { status: filterStatus !== 'All' ? filterStatus : undefined, search: searchQuery.trim() || undefined }
      });
      setPayments(data);
      setError('');
    } catch (err) {
      console.error('Fetch payments error:', err);
      setError(err.response?.data?.message || 'Failed to load payments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
    const handlePaymentUpdate = () => fetchPayments();
    window.addEventListener('socket_payment_update', handlePaymentUpdate);
    return () => window.removeEventListener('socket_payment_update', handlePaymentUpdate);
  }, [adminInfo, filterStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e) => {
    e.preventDefault();
    fetchPayments();
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    if (!adminInfo) return;
    setLoading(true);
    axios.get('http://localhost:5000/api/admin/payments', {
      headers: { Authorization: `Bearer ${adminInfo.token}` },
      params: { status: filterStatus !== 'All' ? filterStatus : undefined, search: undefined }
    }).then(({ data }) => {
      setPayments(data);
      setError('');
    }).catch(err => {
      console.error('Fetch payments error:', err);
      setError(err.response?.data?.message || 'Failed to load payments.');
    }).finally(() => {
      setLoading(false);
    });
  };

  const openActionModal = (payment, tab = 'status') => {
    setSelectedPayment(payment);
    setActiveTab(tab);
    setModalOpen(true);
  };

  const handleStatusUpdate = async (statusToSet) => {
    if (!selectedPayment) return;
    try {
      setUpdating(true);
      await axios.patch(`http://localhost:5000/api/admin/payments/${selectedPayment._id}/status`, {
        status: statusToSet
      }, {
        headers: { Authorization: `Bearer ${adminInfo.token}` }
      });
      setModalOpen(false);
      fetchPayments();
    } catch (err) {
      adminAlert('error', 'Update Failed', err.response?.data?.message || err.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Paid':
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/30"><CheckCircle className="w-3.5 h-3.5 shrink-0" /> Paid</span>;
      case 'Failed':
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30"><XCircle className="w-3.5 h-3.5 shrink-0" /> Failed</span>;
      case 'Refunded':
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-[#A855F7]/20 text-[#A855F7] border border-[#A855F7]/30"><RefreshCw className="w-3.5 h-3.5 shrink-0" /> Refunded</span>;
      case 'Cash on Delivery (COD)':
      case 'COD':
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/30"><Clock className="w-3.5 h-3.5 shrink-0" /> COD</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30"><Clock className="w-3.5 h-3.5 shrink-0" /> Pending</span>;
    }
  };

  if (!adminInfo) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
              <div className="p-2.5 rounded-[16px] bg-white/4 border border-white/8 shadow-sm">
                <CreditCard className="w-6 h-6 text-[#22C55E]" />
              </div>
              Payment Management
            </h1>
            <p className="text-sm text-[#94A3B8] mt-1">Manage customer transactions, statuses, COD collections and audit histories.</p>
          </div>
        </div>

        {/* Filters and Search Bar (55px) */}
        <div className="admin-card flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {['All', 'Pending', 'Paid', 'Failed', 'Refunded', 'COD'].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterStatus(tab)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  filterStatus === tab
                    ? 'admin-btn-primary'
                    : 'bg-white/4 hover:bg-white/10 text-[#94A3B8] hover:text-white border border-white/8'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearch} className="relative w-full lg:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Order ID, Name, Phone..."
              className="admin-search-bar"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-white font-bold"
              >
                ✕
              </button>
            )}
          </form>
        </div>

        {error && (
          <div className="bg-[#EF4444]/20 border border-[#EF4444]/30 text-white px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#EF4444]" /> {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 admin-card">
            <Loader2 className="w-10 h-10 text-[#22C55E] animate-spin mb-4" />
            <p className="text-sm font-semibold text-[#94A3B8]">Loading payment records...</p>
          </div>
        ) : (
          <div className="admin-table-container">
            <div className="overflow-x-auto max-h-[70vh] admin-scroll">
              <table className="w-full text-left border-collapse relative">
                <thead className="sticky top-0 z-10">
                  <tr className="admin-table-header text-xs font-bold text-[#94A3B8] uppercase tracking-wider border-b border-white/8">
                    <th className="px-6 py-4">Order ID</th>
                    <th className="px-6 py-4">Customer Name</th>
                    <th className="px-6 py-4">Phone Number</th>
                    <th className="px-6 py-4">Payment Method</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4 text-center">Payment Status</th>
                    <th className="px-6 py-4">Payment Date</th>
                    <th className="px-6 py-4">Updated By</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/6 text-xs">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-20 text-center">
                        <div className="w-16 h-16 rounded-[20px] bg-white/4 border border-white/8 flex items-center justify-center mx-auto mb-4 shadow-sm">
                          <CreditCard className="w-8 h-8 text-[#94A3B8]" />
                        </div>
                        <p className="text-base font-bold text-white">No payments found</p>
                        <p className="text-xs text-[#94A3B8] mt-1">Try adjusting your status filter or search term</p>
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => (
                      <tr key={p._id} className="hover:bg-white/4 transition-colors group">
                        <td className="px-6 py-3.5 font-bold text-white text-sm">{p.orderId}</td>
                        <td className="px-6 py-3.5 font-semibold text-gray-200">{p.customerName}</td>
                        <td className="px-6 py-3.5 text-[#94A3B8]">+91 {p.phoneNumber}</td>
                        <td className="px-6 py-3.5">
                          <span className="font-bold bg-white/6 border border-white/8 px-3 py-1 rounded-lg text-gray-300 text-xs">{p.paymentMethod}</span>
                        </td>
                        <td className="px-6 py-3.5 font-black text-[#22C55E] text-sm">{formatCurrencyDecimal(p.amount)}</td>
                        <td className="px-6 py-3.5 text-center">{getStatusBadge(p.paymentStatus)}</td>
                        <td className="px-6 py-3.5 text-[#94A3B8]">{new Date(p.date).toLocaleDateString('en-IN')}</td>
                        <td className="px-6 py-3.5 font-medium text-gray-300">
                          <div className="flex items-center gap-1.5">
                            <UserCheck className="w-4 h-4 text-[#22C55E]" />
                            <span>{p.updatedBy || 'System'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openActionModal(p, 'status')}
                              className="px-3 py-1.5 bg-[#22C55E]/20 hover:bg-[#22C55E]/30 text-[#22C55E] font-bold rounded-xl transition-colors flex items-center gap-1.5 border border-[#22C55E]/30"
                              title="Update payment status"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Status
                            </button>
                            <button
                              onClick={() => openActionModal(p, 'history')}
                              className="p-2 bg-white/4 hover:bg-white/10 text-[#94A3B8] hover:text-white font-bold rounded-xl transition-colors border border-white/8"
                              title="View Audit History"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Action Modal */}
        {modalOpen && selectedPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-[#081A38] border border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-scaleUp">
              <button
                onClick={() => setModalOpen(false)}
                className="absolute top-5 right-5 text-[#94A3B8] hover:text-white font-bold p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
              <h2 className="text-lg font-black text-white mb-1 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#22C55E]" /> Manage Payment - {selectedPayment.orderId}
              </h2>
              <p className="text-xs text-[#94A3B8] mb-6">Customer: <strong className="text-white">{selectedPayment.customerName}</strong> | Amount: <strong className="text-[#22C55E]">{formatCurrencyDecimal(selectedPayment.amount)}</strong></p>

              {/* Tabs */}
              <div className="flex border-b border-white/10 mb-5 gap-2">
                <button
                  onClick={() => setActiveTab('status')}
                  className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all ${
                    activeTab === 'status' ? 'border-[#22C55E] text-[#22C55E]' : 'border-transparent text-[#94A3B8] hover:text-white'
                  }`}
                >
                  Update Status
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all ${
                    activeTab === 'history' ? 'border-[#22C55E] text-[#22C55E]' : 'border-transparent text-[#94A3B8] hover:text-white'
                  }`}
                >
                  Audit History ({selectedPayment.auditLog.length})
                </button>
              </div>

              {activeTab === 'status' && (
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-gray-300">Select new status for this payment record:</p>
                  <div className="grid grid-cols-2 gap-3">
                    {['Pending', 'Paid', 'Failed', 'Refunded', 'Cash on Delivery (COD)'].map((st) => (
                      <button
                        key={st}
                        disabled={updating || selectedPayment.paymentStatus === st}
                        onClick={() => handleStatusUpdate(st)}
                        className={`py-3 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
                          selectedPayment.paymentStatus === st
                            ? 'bg-white/4 border-white/8 text-gray-500 cursor-not-allowed opacity-60'
                            : st === 'Paid'
                            ? 'bg-[#22C55E]/20 border-[#22C55E]/40 text-[#22C55E] hover:bg-[#22C55E]/30 shadow-sm'
                            : st === 'Failed'
                            ? 'bg-[#EF4444]/20 border-[#EF4444]/40 text-[#EF4444] hover:bg-[#EF4444]/30 shadow-sm'
                            : st === 'Refunded'
                            ? 'bg-[#A855F7]/20 border-[#A855F7]/40 text-[#A855F7] hover:bg-[#A855F7]/30 shadow-sm'
                            : 'bg-[#3B82F6]/20 border-[#3B82F6]/40 text-[#3B82F6] hover:bg-[#3B82F6]/30 shadow-sm'
                        }`}
                      >
                        {st === 'Paid' && <CheckCircle className="w-4 h-4 shrink-0" />}
                        {st === 'Failed' && <XCircle className="w-4 h-4 shrink-0" />}
                        {st === 'Refunded' && <RefreshCw className="w-4 h-4 shrink-0" />}
                        {(st === 'Pending' || st === 'Cash on Delivery (COD)') && <Clock className="w-4 h-4 shrink-0" />}
                        <span>{st}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="max-h-60 overflow-y-auto space-y-3 pr-1 admin-scroll">
                  {selectedPayment.auditLog.length === 0 ? (
                    <p className="text-xs text-[#94A3B8] text-center py-8">No status update modifications recorded yet.</p>
                  ) : (
                    selectedPayment.auditLog.map((log, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-white/4 border border-white/8 text-xs space-y-1.5">
                        <div className="flex justify-between font-bold text-white">
                          <span className="flex items-center gap-1"><UserCheck className="w-3.5 h-3.5 text-[#22C55E]" /> Updated By: {log.updatedBy || 'Admin'}</span>
                          <span className="text-[#94A3B8] text-[10px]">{new Date(log.updatedTime).toLocaleString()}</span>
                        </div>
                        <div className="text-[#94A3B8]">
                          Status changed from <span className="font-bold text-[#EF4444]">{log.oldStatus}</span> to <span className="font-bold text-[#22C55E]">{log.newStatus}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Payments;
