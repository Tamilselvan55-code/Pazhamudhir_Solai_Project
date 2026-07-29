import { API_BASE } from '../../config/api';
import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Truck, Plus, Search, Edit2, Shield, User, Loader2, FileText, CheckCircle, XCircle, ArrowDownToLine } from 'lucide-react';
import AdminLayout from '../../components/Admin/AdminLayout';
import DocumentManagementModal from '../../components/Admin/DocumentManagementModal';
import VehicleTypeSelector from '../../components/Admin/VehicleTypeSelector';
import DeliveryPartnerSuccessModal from '../../components/Admin/DeliveryPartnerSuccessModal';
import useAuthStore from '../../store/useAuthStore';
import axios from 'axios';
import useModal from '../../hooks/useModal';

const DeliveryPartners = () => {
  const { adminInfo } = useAuthStore();
  const { toast } = useModal();
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetSuccessModalOpen, setResetSuccessModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState(null);

  // Delivery Partner Success Modal state
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [createdPartnerData, setCreatedPartnerData] = useState(null);
  const [vehicleError, setVehicleError] = useState('');
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    vehicleNumber: '',
    vehicleType: 'Two Wheeler',
    emergencyContact: '',
    status: 'Available',
    isActive: true
  });
  
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/admin/delivery-partners`, {
        headers: { Authorization: `Bearer ${adminInfo.token}` }
      });
      setPartners(data);
    } catch (error) {
      toast('Failed to fetch delivery partners', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (partner = null) => {
    setVehicleError('');
    if (partner) {
      setSelectedPartner(partner);
      setFormData({
        name: partner.name,
        email: partner.email,
        mobile: partner.mobile,
        vehicleNumber: partner.vehicleNumber || '',
        vehicleType: partner.vehicleType || 'Two Wheeler',
        emergencyContact: partner.emergencyContact || '',
        status: partner.status,
        isActive: partner.isActive
      });
    } else {
      setSelectedPartner(null);
      setFormData({
        name: '',
        email: '',
        mobile: '',
        vehicleNumber: '',
        vehicleType: 'Two Wheeler',
        emergencyContact: '',
        status: 'Available',
        isActive: true
      });
    }
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.vehicleType) {
      setVehicleError('Vehicle selection is mandatory.');
      return;
    }
    setVehicleError('');
    setActionLoading(true);
    
    try {
      if (selectedPartner) {
        await axios.put(`${API_BASE}/admin/delivery-partners/${selectedPartner.id}`, formData, {
          headers: { Authorization: `Bearer ${adminInfo.token}` }
        });
        toast('Delivery partner updated successfully', 'success');
        setModalOpen(false);
        fetchPartners();
      } else {
        const { data } = await axios.post(`${API_BASE}/admin/delivery-partners`, formData, {
          headers: { Authorization: `Bearer ${adminInfo.token}` }
        });
        setModalOpen(false);
        setCreatedPartnerData({
          name: data.name || formData.name,
          mobile: data.mobile || formData.mobile,
          email: data.email || formData.email,
          tempPassword: data.tempPassword
        });
        setSuccessModalOpen(true);
      }
    } catch (error) {
      toast(error.response?.data?.message || 'Failed to save delivery partner', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuccessDone = () => {
    setSuccessModalOpen(false);
    setCreatedPartnerData(null);
    fetchPartners();
    toast('Delivery Partner created successfully.', 'success');
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const { data } = await axios.put(`${API_BASE}/admin/delivery-partners/${selectedPartner.id}/reset-password`, {}, {
        headers: { Authorization: `Bearer ${adminInfo.token}` }
      });
      toast('Password reset successfully', 'success');
      setNewPassword(data.tempPassword);
      setShowPassword(false);
      setPasswordCopied(false);
      setResetModalOpen(false);
      setResetSuccessModalOpen(true);
    } catch (error) {
      toast(error.response?.data?.message || 'Failed to reset password', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const isSuperAdmin = adminInfo?.role === 'SuperAdmin' || adminInfo?.role === 'Super Admin';
  if (!adminInfo || (!isSuperAdmin && !adminInfo.permissions?.users)) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const filteredPartners = partners.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.mobile.includes(searchQuery) ||
                          p.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' ? true :
                          statusFilter === 'Inactive' ? !p.isActive :
                          p.status === statusFilter;
                          
    return matchesSearch && matchesStatus;
  });

  const exportCSV = () => {
    const headers = ['Employee ID', 'Name', 'Mobile', 'Email', 'Vehicle Number', 'Vehicle Type', 'Status'];
    const rows = filteredPartners.map(p => [
      p.employeeId, p.name, p.mobile, p.email, p.vehicleNumber || '-', p.vehicleType || '-', !p.isActive ? 'Inactive' : p.status
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `delivery_partners_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Truck className="w-7 h-7 text-[#22C55E]" />
            Delivery Partners
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">Manage delivery personnel</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={exportCSV}
            className="admin-btn-secondary px-4 py-2 flex items-center gap-2 text-sm"
          >
            <ArrowDownToLine className="w-4 h-4" /> Export CSV
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="admin-btn-primary px-4 py-2 flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" /> Add Partner
          </button>
        </div>
      </div>

      <div className="admin-table-container mb-6">
        <div className="p-5 admin-table-header flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[250px] max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search by name, email or mobile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="admin-search-bar w-full"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-wide">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="admin-search-bar h-10 px-3 bg-white/4 border border-white/8 text-white focus:border-[#22C55E]"
            >
              <option value="All" className="text-gray-900">All Partners</option>
              <option value="Available" className="text-gray-900">Available</option>
              <option value="On Delivery" className="text-gray-900">On Delivery</option>
              <option value="Offline" className="text-gray-900">Offline</option>
              <option value="Inactive" className="text-gray-900">Inactive</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center flex flex-col items-center">
            <Loader2 className="w-8 h-8 text-[#22C55E] animate-spin mb-4" />
            <p className="text-[#94A3B8] text-sm font-bold uppercase tracking-widest">Loading delivery partners...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/8 text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider bg-white/4">
                  <th className="py-4 px-6">Photo</th>
                  <th className="py-4 px-6">Name</th>
                  <th className="py-4 px-6">Partner ID</th>
                  <th className="py-4 px-6">Phone</th>
                  <th className="py-4 px-6">Vehicle</th>
                  <th className="py-4 px-6">Verification Status</th>
                  <th className="py-4 px-6">Current Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-xs text-white">
                {filteredPartners.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-[#94A3B8] font-medium">
                      No delivery partners found.
                    </td>
                  </tr>
                ) : (
                  filteredPartners.map(partner => (
                    <tr key={partner.id} className="admin-table-row group">
                      <td className="py-4 px-6">
                        {partner.profileImage ? (
                          <img src={partner.profileImage} alt={partner.name} className="w-10 h-10 rounded-full object-cover shadow-sm transition-transform group-hover:scale-110" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[#F59E0B]/20 border border-[#F59E0B]/30 flex items-center justify-center text-[#F59E0B] font-black shrink-0 shadow-sm transition-transform group-hover:scale-110">
                            {partner.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm font-bold text-white group-hover:text-[#22C55E] transition-colors">
                          {partner.name}
                        </div>
                        <div className="text-[10px] text-[#94A3B8]">{partner.email}</div>
                      </td>
                      <td className="py-4 px-6 text-xs text-[#94A3B8] font-mono">
                        {partner.employeeId}
                      </td>
                      <td className="py-4 px-6 text-xs text-[#94A3B8]">
                        {partner.mobile}
                      </td>
                      <td className="py-4 px-6 text-[11px] font-mono text-[#94A3B8]">
                        {partner.vehicleNumber || '-'} <br/>
                        <span className="text-[10px] text-[#94A3B8]/70 font-sans">{partner.vehicleType}</span>
                      </td>
                      <td className="py-4 px-6">
                        {partner.isVerified ? (
                          <span className="px-2.5 py-1 inline-flex text-[10px] font-bold rounded-full bg-green-500/20 text-green-400 border border-green-500/30 uppercase">
                            🟢 Verified
                          </span>
                        ) : partner.documents?.status === 'Rejected' ? (
                          <span className="px-2.5 py-1 inline-flex text-[10px] font-bold rounded-full bg-red-500/20 text-red-400 border border-red-500/30 uppercase">
                            🔴 Rejected
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 inline-flex text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase">
                            🟡 Pending
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 inline-flex text-[10px] font-bold rounded-full ${
                          !partner.isActive || partner.status === 'Inactive' ? 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30' :
                          partner.status === 'Available' ? 'bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/30' :
                          partner.status === 'On Delivery' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                          'bg-white/10 text-white border border-white/20'
                        }`}>
                          {!partner.isActive ? 'Inactive' : partner.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right space-x-2">
                        <button
                          onClick={() => { setSelectedPartner(partner); setReviewModalOpen(true); }}
                          className="text-[#94A3B8] hover:text-white transition-colors p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5"
                          title="Review Documents"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenModal(partner)}
                          className="text-[#94A3B8] hover:text-[#22C55E] transition-colors p-2 rounded-lg bg-white/5 hover:bg-[#22C55E]/10 border border-white/5 hover:border-[#22C55E]/20"
                          title="Edit Partner"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setSelectedPartner(partner); setResetModalOpen(true); }}
                          className="text-[#94A3B8] hover:text-[#EF4444] transition-colors p-2 rounded-lg bg-white/5 hover:bg-[#EF4444]/10 border border-white/5 hover:border-[#EF4444]/20"
                          title="Reset Password"
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit / Create Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0F172A] border border-slate-700/60 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-700/60 flex justify-between items-center bg-slate-900/60">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#22C55E]" />
                {selectedPartner ? 'Edit Delivery Partner' : 'Add Delivery Partner'}
              </h3>
              <button 
                onClick={() => setModalOpen(false)} 
                className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-1">Full Name <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:border-[#22C55E] outline-none transition-all text-white placeholder-slate-500 text-sm"
                    placeholder="Enter partner name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Mobile Number <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    required
                    value={formData.mobile}
                    onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:border-[#22C55E] outline-none transition-all text-white placeholder-slate-500 text-sm"
                    placeholder="Mobile number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Email <span className="text-red-400">*</span></label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:border-[#22C55E] outline-none transition-all text-white placeholder-slate-500 text-sm"
                    placeholder="Email address"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-300 mb-1">Vehicle Number</label>
                  <input
                    type="text"
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData({...formData, vehicleNumber: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:border-[#22C55E] outline-none transition-all text-white placeholder-slate-500 text-sm"
                    placeholder="e.g. TN-01-AB-1234"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-300 mb-1">Emergency Contact</label>
                  <input
                    type="text"
                    value={formData.emergencyContact}
                    onChange={(e) => setFormData({...formData, emergencyContact: e.target.value})}
                    placeholder="+91"
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:border-[#22C55E] outline-none transition-all text-white placeholder-slate-500 text-sm"
                  />
                </div>

                {/* Premium Vehicle Type Selector */}
                <div className="col-span-2">
                  <VehicleTypeSelector
                    value={formData.vehicleType}
                    onChange={(val) => {
                      setFormData({ ...formData, vehicleType: val });
                      if (val) setVehicleError('');
                    }}
                    error={vehicleError}
                  />
                </div>

                {selectedPartner && (
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-slate-300 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="w-full px-3.5 py-2.5 bg-[#1E293B] border border-white/10 rounded-xl focus:border-[#22C55E] outline-none transition-all text-white text-sm"
                    >
                      <option value="Available">Available</option>
                      <option value="On Delivery">On Delivery</option>
                      <option value="Offline">Offline</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                )}
                {selectedPartner && (
                  <div className="col-span-2 sm:col-span-1 flex items-center pt-6">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-sm">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                        className="h-4 w-4 rounded accent-[#22C55E]"
                      />
                      <span>Active Account</span>
                    </label>
                  </div>
                )}
              </div>
              <div className="pt-4 flex justify-end space-x-3 border-t border-slate-700/40 mt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-700/80 rounded-xl text-slate-300 hover:bg-white/5 font-medium text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-[#22C55E] hover:bg-[#16A34A] text-white rounded-xl font-bold text-sm disabled:opacity-70 flex items-center gap-2 transition-all shadow-lg shadow-[#22C55E]/20"
                >
                  {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Partner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delivery Partner Success Dialog */}
      <DeliveryPartnerSuccessModal
        isOpen={successModalOpen}
        onClose={handleSuccessDone}
        partnerData={createdPartnerData}
      />

      {/* Reset Password Confirmation Modal */}
      {resetModalOpen && selectedPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0F172A] border border-slate-700/60 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-700/60 flex justify-between items-center bg-slate-900/60">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-orange-400" /> Reset Delivery Partner Password
              </h3>
              <button 
                onClick={() => setResetModalOpen(false)} 
                disabled={actionLoading}
                className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-50"
              >
                &times;
              </button>
            </div>
            
            <div className="p-6">
              {actionLoading ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" />
                  <p className="text-white font-semibold">Generating secure temporary password...</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-300 leading-relaxed mb-6">
                    You are about to generate a temporary password for this delivery partner. <br/><br/>
                    The current password will become <strong className="text-red-400">invalid immediately</strong>. <br/><br/>
                    Continue?
                  </p>
                  <div className="flex justify-end space-x-3 border-t border-slate-700/40 pt-4">
                    <button
                      type="button"
                      onClick={() => setResetModalOpen(false)}
                      className="px-5 py-2.5 border border-slate-700/80 rounded-xl text-slate-300 hover:bg-white/5 font-medium text-sm transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleResetPassword}
                      className="px-6 py-2.5 bg-orange-600 text-white rounded-xl hover:bg-orange-700 font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-orange-600/20"
                    >
                      Generate Password
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Success Modal */}
      {resetSuccessModalOpen && selectedPartner && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0F172A] border border-slate-700/60 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col items-center text-center p-8">
            <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-6 ring-8 ring-green-500/10">
              <CheckCircle className="w-8 h-8" />
            </div>
            
            <h3 className="text-xl font-bold text-white mb-2">
              Password Reset Successfully
            </h3>
            <p className="text-sm text-slate-400 mb-8 leading-relaxed">
              A temporary password has been generated successfully for <span className="text-white font-semibold">{selectedPartner.name}</span>.
            </p>

            <div className="w-full bg-slate-900 border border-slate-700/50 rounded-2xl p-4 mb-6 relative">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Temporary Password</p>
              <div className="flex items-center justify-between">
                <span className="text-xl font-mono text-white tracking-widest font-bold">
                  {showPassword ? newPassword : '••••••••'}
                </span>
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 rounded-lg transition-colors border border-slate-700"
                >
                  {showPassword ? 'Hide 👁' : 'Show 👁'}
                </button>
              </div>
            </div>

            <div className="w-full grid grid-cols-2 gap-3 mb-6">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(newPassword);
                  setPasswordCopied(true);
                  setTimeout(() => setPasswordCopied(false), 2000);
                }}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors border ${
                  passwordCopied 
                    ? 'bg-green-600 border-green-500 text-white' 
                    : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-white'
                }`}
              >
                {passwordCopied ? <CheckCircle className="w-4 h-4" /> : '📋'}
                {passwordCopied ? 'Copied!' : 'Copy'}
              </button>
              
              <div className="relative group">
                <button className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-blue-500/20">
                  📤 Share
                </button>
                <div className="absolute bottom-[110%] left-0 right-0 hidden group-hover:flex flex-col bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl z-10 animate-in slide-in-from-bottom-2">
                  <a 
                    href={`https://wa.me/?text=Hello ${selectedPartner.name}, your new temporary password is: ${newPassword}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700 text-left flex items-center gap-2"
                  >
                    WhatsApp
                  </a>
                  <a 
                    href={`mailto:?subject=Your New Temporary Password&body=Hello ${selectedPartner.name},%0D%0A%0D%0AYour new temporary password is: ${newPassword}`} 
                    className="px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700 text-left border-t border-slate-700 flex items-center gap-2"
                  >
                    Email
                  </a>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setResetSuccessModalOpen(false);
                setNewPassword('');
              }}
              className="w-full py-3 bg-slate-800 border border-slate-700/50 text-white rounded-xl font-bold hover:bg-slate-700 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Document Management Modal */}
      <DocumentManagementModal 
        isOpen={reviewModalOpen} 
        onClose={() => setReviewModalOpen(false)} 
        partner={selectedPartner}
        token={adminInfo.token}
        onVerify={fetchPartners}
      />
    </AdminLayout>
  );
};

export default DeliveryPartners;

