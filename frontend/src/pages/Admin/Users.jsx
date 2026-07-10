import { API_BASE as config_API_BASE, API_URL as config_API_URL } from '../../config/api';
import React, { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Users as UsersIcon, Search, Mail, Phone, Calendar, Loader2,
  Lock, Unlock, ShieldAlert, X, Eye, MapPin, Package, Clock, Trash2,
  AlertTriangle, User, CheckCircle, ShoppingCart
} from 'lucide-react';
import AdminLayout from '../../components/Admin/AdminLayout';
import useAuthStore from '../../store/useAuthStore';
import axios from 'axios';
import useModal from '../../hooks/useModal';
import { formatCurrency } from '../../utils/currency';

const Users = () => {
  const { adminInfo } = useAuthStore();
  const { adminAlert, adminConfirm, adminPrompt, toast } = useModal();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, verificationFilter]);

  // User detail modal
  const [selectedUser, setSelectedUser] = useState(null);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userOrders, setUserOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Delete user confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [userToDeleteOrders, setUserToDeleteOrders] = useState([]);
  const [deleteOrdersLoading, setDeleteOrdersLoading] = useState(false);

  // Prevent scrolling when delete modal is open
  useEffect(() => {
    if (deleteDialogOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [deleteDialogOpen]);

  const fetchUsers = async () => {
    if (!adminInfo) return;
    try {
      setLoading(true);
      const token = adminInfo?.token;
      const { data } = await axios.get(`${config_API_BASE}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(data);
      setError('');
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.response?.data?.message || 'Failed to load users list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [adminInfo]); // eslint-disable-line react-hooks/exhaustive-deps

  // Filter users based on search and verification status
  const filteredUsers = users.filter(user => {
    const query = typeof searchQuery === 'string' ? searchQuery.trim().toLowerCase() : String(searchQuery || '').trim().toLowerCase();
    const fullNameStr = typeof user.fullName === 'string' ? user.fullName : String(user.fullName || '');
    const emailStr = typeof user.email === 'string' ? user.email : String(user.email || '');
    const phoneStr = typeof user.phoneNumber === 'string' ? user.phoneNumber : String(user.phoneNumber || '');
    const matchesSearch = (
      fullNameStr.toLowerCase().includes(query) ||
      phoneStr.includes(query) ||
      emailStr.toLowerCase().includes(query)
    );
    const matchesVerification =
      verificationFilter === 'all' ||
      (verificationFilter === 'verified' && user.isVerified !== false) ||
      (verificationFilter === 'pending' && user.isVerified === false);

    return matchesSearch && matchesVerification;
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);

  const handleToggleBlock = async (user) => {
    const isBlocking = !user.isBlocked;
    let reason = '';
    
    if (isBlocking) {
      reason = await adminPrompt('Block Customer', `Enter block reason for customer "${user.fullName}":`, { placeholder: 'e.g. Fraudulent activity, fake address...' });
      if (reason === null) return; // Cancelled prompt
    } else {
      const ok = await adminConfirm('Unblock Customer?', `Are you sure you want to unblock "${user.fullName}"? They will be able to place orders again.`);
      if (!ok) return;
    }

    try {
      await axios.patch(
        `${config_API_BASE}/admin/users/${user._id}/block`,
        { isBlocked: isBlocking, reason },
        { headers: { Authorization: `Bearer ${adminInfo?.token}` } }
      );
      fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update block status';
      setError(msg);
      adminAlert('error', 'Action Failed', msg);
    }
  };

  const handleOpenUserModal = async (user) => {
    setSelectedUser(user);
    setUserModalOpen(true);
    setOrdersLoading(true);
    try {
      const { data } = await axios.get(`${config_API_BASE}/admin/users/${user._id}/orders`, {
        headers: { Authorization: `Bearer ${adminInfo?.token}` }
      });
      setUserOrders(data || []);
    } catch (err) {
      console.error('Failed to load user order history:', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Opens the delete confirmation dialog for the chosen user
  const handleDeleteUser = async (user) => {
    setUserToDelete(user);
    setDeleteError('');
    setDeleteDialogOpen(true);
    setDeleteOrdersLoading(true);
    setUserToDeleteOrders([]);
    try {
      const { data } = await axios.get(`${config_API_BASE}/admin/users/${user._id}/orders`, {
        headers: { Authorization: `Bearer ${adminInfo?.token}` }
      });
      setUserToDeleteOrders(data || []);
    } catch (err) {
      console.error('Failed to load user order history for delete:', err);
    } finally {
      setDeleteOrdersLoading(false);
    }
  };

  // Called when admin clicks "Delete Permanently" in the dialog
  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await axios.delete(
        `${config_API_BASE}/admin/users/${userToDelete._id}`,
        { headers: { Authorization: `Bearer ${adminInfo?.token}` } }
      );
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      setUserToDeleteOrders([]);
      // Close user detail modal if the deleted user was open
      if (selectedUser && selectedUser._id === userToDelete._id) {
        setUserModalOpen(false);
        setSelectedUser(null);
      }
      toast("success", "User Account Deleted Successfully", "Customer data has been permanently removed. Dashboard updated successfully.");
      // Refresh the users list in real-time
      await fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.message || 'Unable to delete account. Please try again.';
      setDeleteError(msg);
      toast("error", "Unable to delete account.", "Please try again.");
    } finally {
      setDeleteLoading(false);
    }
  };


  if (!adminInfo) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* ─── Page Header ─────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
              <div className="p-2.5 rounded-[16px] bg-white/4 border border-white/8 shadow-sm">
                <UsersIcon className="w-6 h-6 text-[#22C55E]" />
              </div>
              Customer Registry
            </h1>
            <p className="text-sm text-[#94A3B8] mt-1">Review registrations, delivery addresses, block lists, and order history logs</p>
          </div>
        </div>

        {/* ─── Search & Controls (55px) ─────────────────────────────────── */}
        <div className="bg-[#081A38] border border-white/8 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by phone number, name or email..."
              className="admin-search-bar pl-12 w-full"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-white font-bold"
              >
                ✕
              </button>
            )}
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <select
              value={verificationFilter}
              onChange={(e) => setVerificationFilter(e.target.value)}
              className="bg-white/4 border border-white/8 rounded-xl px-4 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#22C55E] h-[45px] cursor-pointer"
            >
              <option value="all" className="bg-[#081A38]">All Email Statuses</option>
              <option value="verified" className="bg-[#081A38]">Verified</option>
              <option value="pending" className="bg-[#081A38]">Pending</option>
            </select>
            <div className="text-xs font-bold text-[#94A3B8] px-4 py-3 rounded-xl bg-white/4 border border-white/8 shrink-0 flex items-center h-[45px]">
              Showing <strong className="text-white mx-1">{filteredUsers.length}</strong> of <strong className="text-white mx-1">{users.length}</strong> registered customers
            </div>
          </div>
        </div>

        {/* ─── Error State ─────────────────────────────────────────────── */}
        {error && (
          <div className="bg-[#EF4444]/20 border border-[#EF4444]/30 text-white px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#EF4444]" /> {error}
          </div>
        )}

        {/* ─── Loading State ────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 bg-[#081A38] border border-white/8 rounded-2xl shadow-xl">
            <Loader2 className="w-10 h-10 text-[#22C55E] animate-spin mb-4" />
            <p className="text-sm font-semibold text-[#94A3B8]">Loading user database...</p>
          </div>
        ) : (
          /* ─── Table Card ──────────────────────────────────────────────── */
          <div className="bg-[#081A38] border border-white/8 rounded-2xl shadow-2xl overflow-hidden">
            <div className="overflow-x-auto max-h-[70vh] overflow-y-auto admin-scroll">
              <div className="min-w-[1190px]">
                
                {/* Sticky Header */}
                <div className="sticky top-0 z-20 bg-[#14213d] border-b border-white/8 h-[55px] flex items-center shrink-0">
                  <div className="grid grid-cols-[220px_150px_260px_150px_150px_100px_160px] w-full px-6 text-xs font-semibold text-[#94A3B8] uppercase tracking-[0.5px] items-center">
                    <div>Customer Name</div>
                    <div>Phone Number</div>
                    <div>Email Address</div>
                    <div className="text-center">Email Status</div>
                    <div className="text-center">Registration Date</div>
                    <div className="text-center">Total Orders</div>
                    <div className="text-center">Actions</div>
                  </div>
                </div>

                {/* Body Rows */}
                <div className="divide-y divide-white/6 text-xs">
                  {currentUsers.length === 0 ? (
                    <div className="py-20 text-center">
                      <div className="w-16 h-16 rounded-[20px] bg-white/4 border border-white/8 flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <UsersIcon className="w-8 h-8 text-[#94A3B8]" />
                      </div>
                      <p className="text-base font-bold text-white">No users found</p>
                      <p className="text-xs text-[#94A3B8] mt-1">Try searching with a different name, email, or phone number</p>
                    </div>
                  ) : (
                    currentUsers.map((user) => {
                      // Determine email status
                      let emailStatusText = 'Not Verified';
                      let emailStatusStyle = 'bg-amber-500/10 border border-amber-500/20 text-amber-500';
                      let emailDotColor = 'bg-amber-500';
                      if (user.isBlocked) {
                        emailStatusText = 'Blocked';
                        emailStatusStyle = 'bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444]';
                        emailDotColor = 'bg-[#EF4444]';
                      } else if (user.isVerified !== false) {
                        emailStatusText = 'Verified';
                        emailStatusStyle = 'bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E]';
                        emailDotColor = 'bg-[#22C55E]';
                      }

                      return (
                        <div
                          key={user._id}
                          className="grid grid-cols-[220px_150px_260px_150px_150px_100px_160px] w-full px-6 h-[64px] items-center transition-all duration-200 hover:bg-[#22C55E]/8 odd:bg-white/[0.01] even:bg-transparent"
                        >
                          {/* Customer Name */}
                          <div className="flex items-center gap-3 pr-4 min-w-0">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border shadow-sm ${
                              user.isBlocked ? 'bg-[#EF4444]/20 border-[#EF4444]/40 text-[#EF4444]' : 'bg-[#22C55E]/20 border-[#22C55E]/40 text-[#22C55E]'
                            }`}>
                              {(user.fullName || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="font-bold text-white text-sm truncate" title={user.fullName}>
                              {user.fullName || '-'}
                            </div>
                          </div>

                          {/* Phone Number */}
                          <div className="text-[#94A3B8] font-medium pr-4 truncate" title={user.phoneNumber}>
                            {user.phoneNumber || '-'}
                          </div>

                          {/* Email Address */}
                          <div className="text-gray-300 pr-4 truncate" title={user.email}>
                            {user.email || '-'}
                          </div>

                          {/* Email Verification */}
                          <div className="flex items-center justify-center pr-4">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${emailStatusStyle}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${emailDotColor}`} />
                              {emailStatusText}
                            </span>
                          </div>

                          {/* Registration Date */}
                          <div className="text-[#94A3B8] text-center pr-4">
                            {formatDate(user.createdAt)}
                          </div>

                          {/* Total Orders */}
                          <div className="text-center pr-4">
                            <span className="bg-[#0D1528] border border-white/10 text-white px-3 py-1 rounded-full text-xs font-bold inline-block min-w-[36px]">
                              {user.totalOrders || 0}
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center justify-center gap-[10px]">
                            <button
                              onClick={() => handleOpenUserModal(user)}
                              className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-full transition-all duration-200 flex items-center justify-center shrink-0"
                              title="View Customer"
                            >
                              <Eye className="w-[18px] h-[18px]" />
                            </button>
                            <button
                              onClick={() => handleToggleBlock(user)}
                              className={`p-2 rounded-full transition-all duration-200 flex items-center justify-center shrink-0 ${
                                user.isBlocked 
                                  ? 'text-amber-500 hover:text-amber-400 hover:bg-amber-500/10' 
                                  : 'text-gray-400 hover:text-white hover:bg-white/10'
                              }`}
                              title={user.isBlocked ? 'Unblock Customer' : 'Block Customer'}
                            >
                              {user.isBlocked ? (
                                <Unlock className="w-[18px] h-[18px]" />
                              ) : (
                                <Lock className="w-[18px] h-[18px]" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user)}
                              className="p-2 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-all duration-200 flex items-center justify-center shrink-0"
                              title="Delete Customer"
                            >
                              <Trash2 className="w-[18px] h-[18px]" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-white/6 bg-white/[0.02]">
                    <div className="text-xs text-[#94A3B8] font-semibold">
                      Showing <strong className="text-white">{indexOfFirstItem + 1}</strong> to{' '}
                      <strong className="text-white">
                        {Math.min(indexOfLastItem, filteredUsers.length)}
                      </strong>{' '}
                      of <strong className="text-white">{filteredUsers.length}</strong> customers
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/4 border border-white/8 text-gray-300 hover:text-white hover:bg-white/8 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      >
                        Previous
                      </button>
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentPage(i + 1)}
                          className={`w-9 h-9 rounded-xl text-xs font-bold border transition-all ${
                            currentPage === i + 1
                              ? 'bg-gradient-to-r from-[#22C55E] to-[#16A34A] border-[#22C55E] text-white shadow-sm'
                              : 'bg-white/4 border-white/6 text-gray-300 hover:bg-white/8'
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/4 border border-white/8 text-gray-300 hover:text-white hover:bg-white/8 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        )}

        {/* ─── User Profile & History Modal ────────────────────────────── */}
        {userModalOpen && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-[#081A38] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-scaleUp">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-white/4">
                <h2 className="text-base font-black text-white flex items-center gap-2">
                  <UsersIcon className="w-5 h-5 text-[#22C55E]" /> Customer Profile: {selectedUser.fullName}
                </h2>
                <button
                  onClick={() => setUserModalOpen(false)}
                  className="p-1 text-[#94A3B8] hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto admin-scroll">
                
                {/* Delivery Address */}
                <div className="bg-white/4 rounded-xl border border-white/8 p-5 space-y-2.5">
                  <h3 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#22C55E]" /> Saved Delivery Address (GPS geocoded)
                  </h3>
                  {selectedUser.deliveryAddress?.fullAddress ? (
                    <div className="text-xs text-gray-300 leading-relaxed space-y-1.5">
                      <p className="font-bold text-white text-sm">{selectedUser.deliveryAddress.fullAddress}</p>
                      <p className="text-xs text-[#94A3B8]">
                        {[selectedUser.deliveryAddress.city, selectedUser.deliveryAddress.state, selectedUser.deliveryAddress.pincode].filter(Boolean).join(', ')}
                      </p>
                      <p className="text-xs font-bold text-[#22C55E] pt-1">
                        📍 {selectedUser.deliveryAddress.distanceFromStore} km from store (Delivery: {selectedUser.deliveryAddress.deliveryAvailable ? '✅ Available' : '❌ Out of zone'})
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-[#94A3B8] italic">No GPS address geocoded yet by this customer.</p>
                  )}
                </div>

                {/* Blocked details if blocked */}
                {selectedUser.isBlocked && (
                  <div className="bg-[#EF4444]/20 border border-[#EF4444]/30 rounded-xl p-4 space-y-1">
                    <p className="text-xs font-bold text-[#EF4444] flex items-center gap-1.5 uppercase">
                      <Lock className="w-4 h-4" /> Banned Account Details
                    </p>
                    <p className="text-xs text-white font-medium">Reason: {selectedUser.blockedReason || 'No reason specified'}</p>
                  </div>
                )}

                {/* Order History */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#22C55E]" /> Purchase History ({userOrders.length} orders)
                  </h3>
                  {ordersLoading ? (
                    <div className="py-12 text-center text-xs text-[#94A3B8] flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-[#22C55E]" /> Loading history...
                    </div>
                  ) : userOrders.length === 0 ? (
                    <p className="text-xs text-[#94A3B8] italic text-center py-8 bg-white/4 rounded-xl border border-white/8">This customer has not placed any orders yet.</p>
                  ) : (
                    <div className="border border-white/8 rounded-xl overflow-hidden divide-y divide-white/6 bg-white/4">
                      {userOrders.map((o) => (
                        <div key={o._id} className="p-3.5 text-xs flex items-center justify-between hover:bg-white/4 transition-colors">
                          <div>
                            <p className="font-bold text-white">{o.invoiceNumber}</p>
                            <p className="text-[11px] text-[#94A3B8] flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3" /> {new Date(o.createdAt).toLocaleDateString('en-IN')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-[#22C55E] text-sm">{formatCurrency(o.totalPrice)}</p>
                            <p className="text-[11px] font-bold text-gray-300 mt-0.5">{o.status}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Footer */}
              <div className="flex justify-end p-5 bg-white/4 border-t border-white/10">
                <button
                  onClick={() => setUserModalOpen(false)}
                  className="admin-btn-primary h-[40px] px-6 font-bold text-xs"
                >
                  Close Profile
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Delete User Confirmation Dialog ─────────────────────────── */}
        {deleteDialogOpen && userToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
            <div className="bg-[#111827]/95 border border-white/10 rounded-[20px] w-full max-w-[680px] shadow-[0_20px_60px_rgba(0,0,0,0.45)] overflow-hidden animate-scaleUp flex flex-col max-h-[92vh] admin-scroll">
              
              {/* ── Header ── */}
              <div className="flex items-start justify-between px-8 py-6 border-b border-white/5 bg-white/[0.01]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#EF4444]/10 border border-[#EF4444]/20 flex items-center justify-center text-[#EF4444] shrink-0">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-[28px] font-black text-white leading-tight">Delete User Account</h2>
                    <p className="text-[15px] text-[#94A3B8] mt-1">This action permanently removes the customer's account.</p>
                  </div>
                </div>
                {!deleteLoading && (
                  <button
                    onClick={() => { setDeleteDialogOpen(false); setDeleteError(''); }}
                    className="p-1.5 text-[#94A3B8] hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* ── Scrollable Dialog Body ── */}
              <div className="px-8 py-6 space-y-6 overflow-y-auto admin-scroll">
                
                {/* Warning Alert Card */}
                <div className="bg-[#E11D48]/10 border border-[#E11D48]/20 rounded-[16px] p-5 flex items-start gap-4">
                  <AlertTriangle className="w-5 h-5 text-[#EF4444] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-[#E11D48] uppercase tracking-wide">Permanent Deletion</p>
                    <p className="text-xs text-[#FDA4AF] mt-1 font-semibold leading-relaxed">
                      This action cannot be undone. The customer's login account and all associated operational data will be permanently removed.
                    </p>
                  </div>
                </div>

                {/* Customer CRM Profile Card */}
                <div className="bg-white/4 border border-white/8 rounded-[16px] p-5 flex flex-col md:flex-row md:items-center justify-between gap-5">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-14 h-14 rounded-full bg-[#EF4444]/10 border border-[#EF4444]/20 flex items-center justify-center font-black text-xl text-[#EF4444] shrink-0 shadow-inner">
                      {(userToDelete.fullName || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-white text-[17px] truncate">{userToDelete.fullName}</p>
                      <p className="text-[13px] text-[#94A3B8] truncate mt-0.5">{userToDelete.email}</p>
                      <p className="text-[13px] text-[#94A3B8] truncate mt-0.5">{userToDelete.phoneNumber}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3 shrink-0 md:text-right">
                    <div>
                      <p className="text-[11px] text-[#94A3B8] font-bold uppercase tracking-wider">Member Since</p>
                      <p className="text-[13px] text-white font-bold mt-0.5">{formatDate(userToDelete.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-[#94A3B8] font-bold uppercase tracking-wider">Total Orders</p>
                      <p className="text-[13px] text-white font-bold mt-0.5">{userToDelete.totalOrders || 0}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-[#94A3B8] font-bold uppercase tracking-wider">Amount Spent</p>
                      <p className="text-[13px] text-[#22C55E] font-extrabold mt-0.5">
                        {deleteOrdersLoading ? (
                          <span className="text-[11px] text-[#94A3B8]">Loading spent...</span>
                        ) : (
                          formatCurrency((userToDeleteOrders || []).reduce((sum, o) => sum + (o.totalPrice || 0), 0))
                        )}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 sm:items-end">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        userToDelete.isVerified !== false ? 'bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      }`}>
                        {userToDelete.isVerified !== false ? 'Email Verified' : 'Pending Verification'}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold mt-0.5 ${
                        userToDelete.isBlocked ? 'bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20' : 'bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20'
                      }`}>
                        {userToDelete.isBlocked ? 'Blocked' : 'Active'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Four Clean Spacing Info Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { title: 'Account', desc: 'Login, Password, Sessions', icon: Lock, color: 'text-[#22C55E]', bg: 'bg-[#22C55E]/10' },
                    { title: 'Personal Data', desc: 'Phone, Email, Profile', icon: User, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                    { title: 'Shopping Data', desc: 'Cart, Wishlist, Addresses', icon: ShoppingCart, color: 'text-violet-400', bg: 'bg-violet-500/10' },
                    { title: 'Security', desc: 'OTP, Tokens, Verification', icon: ShieldAlert, color: 'text-amber-400', bg: 'bg-amber-500/10' }
                  ].map((card, i) => {
                    const Icon = card.icon;
                    return (
                      <div key={i} className="bg-white/4 border border-white/8 rounded-[16px] p-4 flex items-center gap-4 transition-all duration-300 hover:bg-white/8 hover:translate-y-[-2px] cursor-default">
                        <div className={`w-10 h-10 rounded-xl ${card.bg} ${card.color} flex items-center justify-center shrink-0 border border-white/5`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[15px] font-bold text-white leading-tight">{card.title}</p>
                          <p className="text-[13px] text-[#94A3B8] mt-0.5">{card.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Green Re-registration Info Box */}
                <div className="bg-[#22C55E]/10 border border-[#22C55E]/20 rounded-[16px] p-5 flex items-start gap-4">
                  <CheckCircle className="w-5 h-5 text-[#22C55E] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-[#22C55E]">Phone Number & Email Will Become Available Again</p>
                    <p className="text-xs text-[#86EFAC] mt-1 font-semibold leading-relaxed">
                      After deleting this account, the same phone number and email address can be used immediately to register a completely new account.
                    </p>
                  </div>
                </div>

                {/* Error Banner */}
                {deleteError && (
                  <div className="flex items-center gap-2 bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#F87171] px-4 py-3 rounded-xl text-xs font-bold">
                    <ShieldAlert className="w-4 h-4 shrink-0" /> {deleteError}
                  </div>
                )}
              </div>

              {/* ── Dialog Footer ── */}
              <div className="flex items-center justify-end gap-3 px-8 py-5 bg-white/3 border-t border-white/5">
                <button
                  onClick={() => { setDeleteDialogOpen(false); setDeleteError(''); }}
                  disabled={deleteLoading}
                  className="px-6 py-2.5 bg-white/6 hover:bg-white/10 border border-white/10 text-white font-bold text-xs rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed w-[100px] flex items-center justify-center h-[42px]"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteUser}
                  disabled={deleteLoading}
                  className="px-6 py-2.5 bg-[#EF4444] hover:bg-[#DC2626] text-white font-black text-xs rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-[#EF4444]/20 disabled:opacity-60 disabled:cursor-not-allowed h-[42px]"
                >
                  {deleteLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Deleting…</>
                  ) : (
                    <><Trash2 className="w-4 h-4" /> Delete Permanently</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Users;
