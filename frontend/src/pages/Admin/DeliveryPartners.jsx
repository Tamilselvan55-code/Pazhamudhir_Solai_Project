import { API_BASE } from '../../config/api';
import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Truck, Plus, Search, Edit2, Shield, User, Loader2, FileText, CheckCircle, XCircle, ArrowDownToLine } from 'lucide-react';
import AdminLayout from '../../components/Admin/AdminLayout';
import DocumentReviewModal from '../../components/Admin/DocumentReviewModal';
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
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState(null);
  
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
    setActionLoading(true);
    
    try {
      if (selectedPartner) {
        await axios.put(`${API_BASE}/admin/delivery-partners/${selectedPartner.id}`, formData, {
          headers: { Authorization: `Bearer ${adminInfo.token}` }
        });
        toast('Delivery partner updated successfully', 'success');
      } else {
        const { data } = await axios.post(`${API_BASE}/admin/delivery-partners`, formData, {
          headers: { Authorization: `Bearer ${adminInfo.token}` }
        });
        toast('Delivery partner created successfully', 'success');
        window.alert(`Important: The temporary password for ${data.name} is: ${data.tempPassword}\nPlease share this with the partner.`);
      }
      setModalOpen(false);
      fetchPartners();
    } catch (error) {
      toast(error.response?.data?.message || 'Failed to save delivery partner', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const { data } = await axios.put(`${API_BASE}/admin/delivery-partners/${selectedPartner.id}/reset-password`, {}, {
        headers: { Authorization: `Bearer ${adminInfo.token}` }
      });
      toast('Password reset successfully', 'success');
      setResetModalOpen(false);
      window.alert(`Important: The new temporary password for ${selectedPartner.name} is: ${data.tempPassword}\nPlease share this with the partner.`);
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
                  <th className="py-4 px-6 w-1/4">Name / Contact</th>
                  <th className="py-4 px-6">Vehicle Number</th>
                  <th className="py-4 px-6">Status</th>
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
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-[12px] bg-[#F59E0B]/20 border border-[#F59E0B]/30 flex items-center justify-center text-[#F59E0B] font-black shrink-0 shadow-sm transition-transform group-hover:scale-110">
                            {partner.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white group-hover:text-[#22C55E] transition-colors">
                              {partner.name} <span className="text-[10px] text-[#94A3B8] font-normal">({partner.employeeId})</span>
                            </div>
                            <div className="text-[11px] text-[#94A3B8] mt-0.5">{partner.mobile}</div>
                            <div className="text-[11px] text-[#94A3B8]">{partner.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-[11px] font-mono text-[#94A3B8]">
                        {partner.vehicleNumber || '-'}
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
                        {partner.documents?.status === 'Pending' && (
                          <span className="ml-2 px-2 py-0.5 inline-flex text-[9px] font-bold rounded-full bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30 uppercase tracking-wider">
                            Docs Pending
                          </span>
                        )}
                        {!partner.isVerified && partner.documents?.status !== 'Pending' && (
                          <span className="ml-2 px-2 py-0.5 inline-flex text-[9px] font-bold rounded-full bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30 uppercase tracking-wider">
                            Unverified
                          </span>
                        )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">
                {selectedPartner ? 'Edit Delivery Partner' : 'Add Delivery Partner'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                  <input
                    type="text"
                    required
                    value={formData.mobile}
                    onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-gray-900"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Number</label>
                  <input
                    type="text"
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData({...formData, vehicleNumber: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-gray-900"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
                  <select
                    value={formData.vehicleType}
                    onChange={(e) => setFormData({...formData, vehicleType: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-white text-gray-900"
                  >
                    <option value="Two Wheeler">Two Wheeler</option>
                    <option value="Three Wheeler">Three Wheeler</option>
                    <option value="Four Wheeler">Four Wheeler</option>
                    <option value="Bicycle">Bicycle</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact Number</label>
                  <input
                    type="text"
                    value={formData.emergencyContact}
                    onChange={(e) => setFormData({...formData, emergencyContact: e.target.value})}
                    placeholder="+91"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-gray-900"
                  />
                </div>
                {selectedPartner && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-white text-gray-900"
                    >
                      <option value="Available">Available</option>
                      <option value="On Delivery">On Delivery</option>
                      <option value="Offline">Offline</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                )}
                {selectedPartner && (
                  <div className="col-span-2 flex items-center mt-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                      Active Account
                    </label>
                  </div>
                )}
              </div>
              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-70 flex items-center gap-2"
                >
                  {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Partner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModalOpen && selectedPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">Reset Password</h3>
              <button onClick={() => setResetModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                &times;
              </button>
            </div>
            
            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Clicking reset will generate a new temporary password for <span className="font-semibold text-gray-900">{selectedPartner.name}</span>. You will be able to copy the new password after generating it.
              </p>
              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium disabled:opacity-70 flex items-center gap-2"
                >
                  {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Review Modal */}
      <DocumentReviewModal 
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
