import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { API_BASE as config_API_BASE, API_URL as config_API_URL } from '../../config/api';
import { TrendingUp, Plus, Edit2, Trash2, Calendar, Percent, Eye, EyeOff, Loader2, ShieldAlert, Search, Upload, Tag } from 'lucide-react';
import AdminLayout from '../../components/Admin/AdminLayout';
import useAuthStore from '../../store/useAuthStore';
import axios from 'axios';
import useModal from '../../hooks/useModal';
import { formatCurrency } from '../../utils/currency';

const safeFormatDate = (dateVal) => {
  if (!dateVal) return 'N/A';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (e) {
    return 'N/A';
  }
};

const safeInputDate = (dateVal) => {
  if (!dateVal) return '';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  } catch (e) {
    return '';
  }
};

const Offers = () => {
  const { adminInfo } = useAuthStore();
  const location = useLocation();
  const { adminAlert, adminConfirm } = useModal();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState(() => new URLSearchParams(window.location.search).get('search') || '');

  useEffect(() => {
    const q = new URLSearchParams(location.search).get('search');
    if (q !== null) {
      setSearchQuery(q);
    }
  }, [location.search]);
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Active' | 'Expired'

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('add');
  const [selectedId, setSelectedId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    discountPercentage: 10,
    minOrderValue: 200,
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    bannerImage: '',
    couponCode: '',
    description: '',
    status: 'Active'
  });

  const fetchOffers = async () => {
    if (!adminInfo || !adminInfo.token) return;
    try {
      setLoading(true);
      const { data } = await axios.get(`${config_API_BASE}/admin/offers`, {
        headers: { Authorization: `Bearer ${adminInfo.token}` }
      });
      setOffers(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      console.error('Fetch offers error:', err);
      setOffers([]);
      setError(err.response?.data?.message || 'Failed to load promotional offers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, [adminInfo]);

  const openAddModal = () => {
    setModalType('add');
    setSelectedId(null);
    setModalError('');
    setFormData({
      title: '',
      discountPercentage: 10,
      minOrderValue: 200,
      validFrom: safeInputDate(new Date()),
      validUntil: safeInputDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
      bannerImage: '',
      couponCode: '',
      description: '',
      status: 'Active'
    });
    setModalOpen(true);
  };

  const openEditModal = (offer) => {
    if (!offer) return;
    setModalType('edit');
    setSelectedId(offer._id || offer.id);
    setModalError('');
    setFormData({
      title: offer.title || '',
      discountPercentage: offer.discountPercentage || 0,
      minOrderValue: offer.minOrderValue || 0,
      validFrom: safeInputDate(offer.validFrom),
      validUntil: safeInputDate(offer.validUntil),
      bannerImage: offer.bannerImage || '',
      couponCode: offer.couponCode || '',
      description: offer.description || '',
      status: offer.status || 'Active'
    });
    setModalOpen(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const uploadData = new FormData();
    uploadData.append('images', file);

    try {
      setUploadingImage(true);
      const { data } = await axios.post(`${config_API_BASE}/admin/upload`, uploadData, {
        headers: {
          Authorization: `Bearer ${adminInfo.token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      if (data.urls && data.urls.length > 0) {
        setFormData(prev => ({ ...prev, bannerImage: data.urls[0] }));
      }
    } catch (err) {
      console.error('Image upload error:', err);
      setModalError('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!formData.title.trim()) {
      setModalError('Offer title is required.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        discountPercentage: Number(formData.discountPercentage),
        minOrderValue: Number(formData.minOrderValue)
      };

      if (modalType === 'add') {
        await axios.post(`${config_API_BASE}/admin/offers`, payload, {
          headers: { Authorization: `Bearer ${adminInfo.token}` }
        });
        setToastMsg('Offer created successfully!');
      } else {
        await axios.put(`${config_API_BASE}/admin/offers/${selectedId}`, payload, {
          headers: { Authorization: `Bearer ${adminInfo.token}` }
        });
        setToastMsg('Offer updated successfully!');
      }
      setTimeout(() => setToastMsg(''), 4000);
      setModalOpen(false);
      fetchOffers();
    } catch (err) {
      const actualError = err.response?.data?.message || 'Server error while saving offer.';
      setModalError(actualError);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, title) => {
    const ok = await adminConfirm(
      'Delete Offer?',
      `Are you sure you want to delete:\n\n"${title}"\n\nThis action cannot be undone.`,
      { danger: true, confirmLabel: '🗑️ Delete' }
    );
    if (!ok) return;
    try {
      await axios.delete(`${config_API_BASE}/admin/offers/${id}`, {
        headers: { Authorization: `Bearer ${adminInfo.token}` }
      });
      setToastMsg('Offer deleted successfully!');
      setTimeout(() => setToastMsg(''), 4000);
      fetchOffers();
    } catch (err) {
      const actualError = err.response?.data?.message || 'Failed to delete offer';
      adminAlert('error', 'Delete Failed', actualError);
    }
  };

  const handleToggleStatus = async (offer) => {
    const targetId = offer._id || offer.id;
    const newStatus = offer.status === 'Active' ? 'Expired' : 'Active';
    try {
      await axios.patch(
        `${config_API_BASE}/admin/offers/${targetId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${adminInfo.token}` } }
      );
      fetchOffers();
    } catch (err) {
      setError('Failed to update offer status');
    }
  };

  // Safe Filtered Offers Calculation
  const query = (typeof searchQuery === 'string' ? searchQuery : String(searchQuery || '')).trim().toLowerCase();
  const filteredOffers = (Array.isArray(offers) ? offers : []).filter(off => {
    if (!off) return false;
    const titleStr = typeof off.title === 'string' ? off.title : String(off.title || '');
    const codeStr = typeof off.couponCode === 'string' ? off.couponCode : String(off.couponCode || '');
    const matchesSearch = titleStr.toLowerCase().includes(query) || codeStr.toLowerCase().includes(query);

    if (statusFilter === 'Active') return matchesSearch && off.status === 'Active';
    if (statusFilter === 'Expired') return matchesSearch && off.status !== 'Active';
    return matchesSearch;
  });

  return (
    <AdminLayout>
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-[#22C55E] text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 text-sm font-bold animate-bounce">
          <span>✓</span> {toastMsg}
        </div>
      )}
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
              <div className="p-2.5 rounded-[16px] bg-white/4 border border-white/8 shadow-sm">
                <TrendingUp className="w-6 h-6 text-[#22C55E]" />
              </div>
              Offers & Banners Management
            </h1>
            <p className="text-sm text-[#94A3B8] mt-1">Create promotional discount offers, banners, and set validity dates.</p>
          </div>
          <button
            onClick={openAddModal}
            className="admin-btn-primary h-[40px] px-4 font-bold text-xs flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Create Offer
          </button>
        </div>

        {/* Search & Filter bar */}
        <div className="bg-[#081A38] border border-white/8 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search offer title or promo code..."
              className="admin-search-bar"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-white font-bold"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {['All', 'Active', 'Expired'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === st
                    ? 'bg-[#22C55E] text-white shadow-md'
                    : 'bg-white/4 text-[#94A3B8] hover:text-white border border-white/8'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-[#EF4444]/20 border border-[#EF4444]/30 text-white px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#EF4444]" /> {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 admin-card">
            <Loader2 className="w-10 h-10 text-[#22C55E] animate-spin mb-4" />
            <p className="text-sm font-semibold text-[#94A3B8]">Loading promotional offers...</p>
          </div>
        ) : (
          <div className="admin-table-container">
            <div className="overflow-x-auto admin-scroll">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="admin-table-header text-xs font-bold text-[#94A3B8] uppercase tracking-wider border-b border-white/8">
                    <th className="px-6 py-4">Banner Image</th>
                    <th className="px-6 py-4">Offer Title</th>
                    <th className="px-6 py-4">Coupon Code</th>
                    <th className="px-6 py-4">Discount</th>
                    <th className="px-6 py-4">Min Order</th>
                    <th className="px-6 py-4">Validity</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/6 text-xs">
                  {filteredOffers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-20 text-center">
                        <div className="w-16 h-16 rounded-[20px] bg-white/4 border border-white/8 flex items-center justify-center mx-auto mb-4 shadow-sm">
                          {searchQuery ? <Search className="w-8 h-8 text-[#94A3B8]" /> : <TrendingUp className="w-8 h-8 text-[#94A3B8]" />}
                        </div>
                        <p className="text-base font-bold text-white">
                          {searchQuery ? 'No matching offers found' : 'No promotional offers found'}
                        </p>
                        <p className="text-xs text-[#94A3B8] mt-1">
                          {searchQuery ? 'Try adjusting your search query' : "Click 'Create Offer' above to launch your first promotion"}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredOffers.map((off) => {
                      const itemKey = off._id || off.id;
                      return (
                        <tr key={itemKey} className="hover:bg-white/4 transition-colors group">
                          <td className="px-6 py-3.5">
                            <div className="w-16 h-10 rounded-xl bg-white/4 overflow-hidden flex items-center justify-center border border-white/8 shadow-sm">
                              {off.bannerImage ? (
                                <img src={off.bannerImage} alt={off.title} className="w-full h-full object-cover" />
                              ) : (
                                <Percent className="w-5 h-5 text-[#94A3B8]" />
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-3.5 font-bold text-white text-sm">
                            {off.title}
                            {off.description && (
                              <p className="text-[10px] text-[#94A3B8] font-normal mt-0.5 line-clamp-1">{off.description}</p>
                            )}
                          </td>
                          <td className="px-6 py-3.5 font-mono text-cyan-400 font-bold">
                            {off.couponCode ? (
                              <span className="px-2 py-0.5 rounded bg-cyan-400/10 border border-cyan-400/30">
                                {off.couponCode}
                              </span>
                            ) : (
                              <span className="text-[#4B5563]">—</span>
                            )}
                          </td>
                          <td className="px-6 py-3.5 font-black text-[#22C55E] text-sm">{off.discountPercentage}% OFF</td>
                          <td className="px-6 py-3.5 font-semibold text-gray-300">{formatCurrency(off.minOrderValue)}</td>
                          <td className="px-6 py-3.5 text-gray-300 font-medium">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-4 h-4 text-[#94A3B8]" />
                              <span>
                                {safeFormatDate(off.validFrom)} - {safeFormatDate(off.validUntil)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-3.5 text-center">
                            {off.status === 'Active' ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/30">
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-white/10 text-[#94A3B8] border border-white/10">
                                Expired
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleToggleStatus(off)}
                                className="p-2 hover:bg-white/10 text-[#94A3B8] hover:text-white rounded-xl transition-colors border border-transparent hover:border-white/8"
                                title={off.status === 'Active' ? 'Mark as Expired' : 'Mark as Active'}
                              >
                                {off.status === 'Active' ? <EyeOff className="w-4 h-4 text-[#F59E0B]" /> : <Eye className="w-4 h-4 text-[#22C55E]" />}
                              </button>
                              <button
                                onClick={() => openEditModal(off)}
                                className="p-2 hover:bg-white/10 text-[#22C55E] hover:text-[#22C55E] rounded-xl transition-colors border border-transparent hover:border-white/8"
                                title="Edit Offer"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(itemKey, off.title)}
                                className="p-2 hover:bg-[#EF4444]/20 text-[#EF4444] hover:text-[#EF4444] rounded-xl transition-colors border border-transparent hover:border-[#EF4444]/30"
                                title="Delete Offer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Create / Edit Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-[#081A38] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-scaleUp max-h-[90vh] overflow-y-auto admin-scroll">
              <button
                onClick={() => setModalOpen(false)}
                className="absolute top-5 right-5 text-[#94A3B8] hover:text-white font-bold p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
              <h2 className="text-lg font-black text-white mb-5 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#22C55E]" />
                {modalType === 'add' ? 'Create New Offer' : 'Edit Offer'}
              </h2>
              {modalError && (
                <div className="mb-4 p-3 bg-[#EF4444]/20 border border-[#EF4444]/30 text-white rounded-xl text-xs font-bold flex items-center gap-2">
                  <span>⚠️</span> {modalError}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-[#94A3B8] mb-1.5 uppercase tracking-wide">Offer Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Festival Special Offer"
                    className="admin-form-input text-xs h-[40px] px-3 font-medium bg-[#020B24]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#94A3B8] mb-1.5 uppercase tracking-wide">Discount (%) *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={100}
                      value={formData.discountPercentage}
                      onChange={(e) => setFormData({ ...formData, discountPercentage: Number(e.target.value) })}
                      className="admin-form-input text-xs h-[40px] px-3 font-bold bg-[#020B24]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#94A3B8] mb-1.5 uppercase tracking-wide">Min Order (₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={formData.minOrderValue}
                      onChange={(e) => setFormData({ ...formData, minOrderValue: Number(e.target.value) })}
                      className="admin-form-input text-xs h-[40px] px-3 font-bold bg-[#020B24]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#94A3B8] mb-1.5 uppercase tracking-wide">Coupon / Promo Code</label>
                  <input
                    type="text"
                    value={formData.couponCode}
                    onChange={(e) => setFormData({ ...formData, couponCode: e.target.value.toUpperCase() })}
                    placeholder="e.g. FESTIVAL10"
                    className="admin-form-input text-xs h-[40px] px-3 font-mono font-bold uppercase bg-[#020B24]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#94A3B8] mb-1.5 uppercase tracking-wide">Valid From</label>
                    <input
                      type="date"
                      value={formData.validFrom}
                      onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                      className="admin-form-input text-xs h-[40px] px-3 font-medium bg-[#020B24]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#94A3B8] mb-1.5 uppercase tracking-wide">Valid Until</label>
                    <input
                      type="date"
                      value={formData.validUntil}
                      onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                      className="admin-form-input text-xs h-[40px] px-3 font-medium bg-[#020B24]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#94A3B8] mb-1.5 uppercase tracking-wide">Banner Image</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={formData.bannerImage}
                      onChange={(e) => setFormData({ ...formData, bannerImage: e.target.value })}
                      placeholder="https://... or upload file"
                      className="admin-form-input text-xs h-[40px] px-3 font-medium bg-[#020B24] flex-1"
                    />
                    <label className="admin-btn-secondary h-[40px] px-3 font-bold text-xs flex items-center gap-1 cursor-pointer shrink-0">
                      {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      <span>Upload</span>
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                  </div>
                  {formData.bannerImage && (
                    <div className="mt-2 w-full h-24 rounded-xl overflow-hidden bg-white/4 border border-white/8">
                      <img src={formData.bannerImage} alt="Banner preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-[#94A3B8] mb-1.5 uppercase tracking-wide">Description</label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Short description..."
                    className="admin-form-input text-xs p-3 font-medium bg-[#020B24] resize-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#94A3B8] mb-1.5 uppercase tracking-wide">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="admin-form-input text-xs h-[40px] px-3 font-bold bg-[#020B24]"
                  >
                    <option value="Active" className="bg-[#081A38] text-white">Active</option>
                    <option value="Expired" className="bg-[#081A38] text-white">Expired</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={submitting || uploadingImage}
                  className="admin-btn-primary w-full h-[44px] font-bold text-xs flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitting ? 'Saving...' : modalType === 'add' ? 'Create Offer' : 'Save Changes'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Offers;
