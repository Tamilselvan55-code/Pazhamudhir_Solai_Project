import { API_BASE } from '../../config/api';
import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Truck, Plus, Search, Edit2, Shield, User, Loader2, FileText, CheckCircle, XCircle } from 'lucide-react';
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

  if (!adminInfo || !adminInfo.permissions?.users) {
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
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="w-7 h-7 text-green-600" />
            Delivery Partners
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage delivery personnel</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-200 transition-colors border border-gray-200 font-medium text-sm"
          >
            Export CSV
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Partner
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4 bg-gray-50/50 rounded-t-xl flex-wrap">
          <div className="relative flex-1 min-w-[250px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email or mobile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all bg-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500 font-medium">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            >
              <option value="All">All Partners</option>
              <option value="Available">Available</option>
              <option value="On Delivery">On Delivery</option>
              <option value="Offline">Offline</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center flex flex-col items-center">
            <Loader2 className="w-8 h-8 text-green-500 animate-spin mb-4" />
            <p className="text-gray-500 text-sm font-medium">Loading delivery partners...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/4">Name / Contact</th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vehicle Number</th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPartners.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-gray-500 text-sm">
                      No delivery partners found.
                    </td>
                  </tr>
                ) : (
                  filteredPartners.map(partner => (
                    <tr key={partner.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold shrink-0">
                            {partner.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{partner.name} <span className="text-xs text-gray-500 font-normal">({partner.employeeId})</span></div>
                            <div className="text-xs text-gray-500">{partner.mobile}</div>
                            <div className="text-xs text-gray-500">{partner.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-700">
                        {partner.vehicleNumber || '-'}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          !partner.isActive || partner.status === 'Inactive' ? 'bg-red-100 text-red-800' :
                          partner.status === 'Available' ? 'bg-green-100 text-green-800' :
                          partner.status === 'On Delivery' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {!partner.isActive ? 'Inactive' : partner.status}
                        </span>
                        {partner.documents?.status === 'Pending' && (
                          <span className="ml-2 px-2 py-0.5 inline-flex text-[10px] leading-5 font-bold rounded-full bg-amber-100 text-amber-800">
                            Docs Pending
                          </span>
                        )}
                        {!partner.isVerified && partner.documents?.status !== 'Pending' && (
                          <span className="ml-2 px-2 py-0.5 inline-flex text-[10px] leading-5 font-bold rounded-full bg-red-100 text-red-800">
                            Unverified
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right space-x-3">
                        <button
                          onClick={() => { setSelectedPartner(partner); setReviewModalOpen(true); }}
                          className="text-indigo-600 hover:text-indigo-900 transition-colors p-1 rounded-md hover:bg-indigo-50"
                          title="Review Documents"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenModal(partner)}
                          className="text-blue-600 hover:text-blue-900 transition-colors p-1 rounded-md hover:bg-blue-50"
                          title="Edit Partner"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setSelectedPartner(partner); setResetModalOpen(true); }}
                          className="text-orange-600 hover:text-orange-900 transition-colors p-1 rounded-md hover:bg-orange-50"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                  <input
                    type="text"
                    required
                    value={formData.mobile}
                    onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Number</label>
                  <input
                    type="text"
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData({...formData, vehicleNumber: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
                  <select
                    value={formData.vehicleType}
                    onChange={(e) => setFormData({...formData, vehicleType: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-white"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                  />
                </div>
                {selectedPartner && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-white"
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
