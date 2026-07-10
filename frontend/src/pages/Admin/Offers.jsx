import { API_BASE as config_API_BASE, API_URL as config_API_URL } from '../../config/api';
import { TrendingUp, Plus, Edit2, Trash2, Calendar, DollarSign, Percent, Eye, EyeOff, Loader2, ShieldAlert, Search } from 'lucide-react';
import AdminLayout from '../../components/Admin/AdminLayout';
import useAuthStore from '../../store/useAuthStore';
import axios from 'axios';
import useModal from '../../hooks/useModal';
import { formatCurrency } from '../../utils/currency';

const Offers = () => {
  const { adminInfo } = useAuthStore();
  const { adminAlert, adminConfirm } = useModal();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('add');
  const [selectedId, setSelectedId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    discountPercentage: 10,
    minOrderValue: 200,
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0],
    bannerImage: '',
    status: 'Active'
  });

  const fetchOffers = async () => {
    if (!adminInfo) return;
    try {
      setLoading(true);
      const { data } = await axios.get(`${config_API_BASE}/admin/offers`, {
        headers: { Authorization: `Bearer ${adminInfo.token}` }
      });
      setOffers(data);
      setError('');
    } catch (err) {
      console.error('Fetch offers error:', err);
      setError(err.response?.data?.message || 'Failed to load offers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, [adminInfo]); // eslint-disable-line react-hooks/exhaustive-deps

  const openAddModal = () => {
    setModalType('add');
    setSelectedId(null);
    setModalError('');
    setFormData({
      title: '',
      discountPercentage: 10,
      minOrderValue: 200,
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0],
      bannerImage: '',
      status: 'Active'
    });
    setModalOpen(true);
  };

  const openEditModal = (offer) => {
    setModalType('edit');
    setSelectedId(offer._id);
    setModalError('');
    setFormData({
      title: offer.title || '',
      discountPercentage: offer.discountPercentage || 0,
      minOrderValue: offer.minOrderValue || 0,
      validFrom: offer.validFrom ? new Date(offer.validFrom).toISOString().split('T')[0] : '',
      validUntil: offer.validUntil ? new Date(offer.validUntil).toISOString().split('T')[0] : '',
      bannerImage: offer.bannerImage || '',
      status: offer.status || 'Active'
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    try {
      setSubmitting(true);
      if (modalType === 'add') {
        await axios.post(`${config_API_BASE}/admin/offers`, formData, {
          headers: { Authorization: `Bearer ${adminInfo.token}` }
        });
        setToastMsg('Offer created successfully!');
      } else {
        await axios.put(`${config_API_BASE}/admin/offers/${selectedId}`, formData, {
          headers: { Authorization: `Bearer ${adminInfo.token}` }
        });
        setToastMsg('Offer updated successfully!');
      }
      setTimeout(() => setToastMsg(''), 4000);
      setModalOpen(false);
      fetchOffers();
    } catch (err) {
      const actualError = err.response?.data?.message || 'Server error while saving offer';
      setModalError(actualError);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, title) => {
    const ok = await adminConfirm('Delete Offer?', `Are you sure you want to delete:\n\n"${title}"\n\nThis action cannot be undone.`, { danger: true, confirmLabel: '🗑️ Delete' });
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
    const newStatus = offer.status === 'Active' ? 'Expired' : 'Active';
    try {
      await axios.patch(`${config_API_BASE}/admin/offers/${offer._id}/status`, {
        status: newStatus
      }, {
        headers: { Authorization: `Bearer ${adminInfo.token}` }
      });
      fetchOffers();
    } catch (err) {
      setError('Failed to update status');
    }
  };

  return (
    <AdminLayout>
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-[#22C55E] text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 text-sm font-bold animate-bounce">
          <span>✓</span> {toastMsg}
        </div>
      )}
      <div className="space-y-8">
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

        {/* Search bar */}
        <div className="bg-[#081A38] border border-white/8 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search offer title..."
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
                    <th className="px-6 py-4">Discount</th>
                    <th className="px-6 py-4">Min Order</th>
                    <th className="px-6 py-4">Validity</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/6 text-xs">
                  {(() => {
                    const filteredOffers = offers.filter(off => 
                      (off.title || '').toLowerCase().includes(searchQuery.trim().toLowerCase())
                    );
                    if (filteredOffers.length === 0) {
                      return (
                        <tr>
                          <td colSpan={7} className="px-6 py-20 text-center">
                            <div className="w-16 h-16 rounded-[20px] bg-white/4 border border-white/8 flex items-center justify-center mx-auto mb-4 shadow-sm">
                              {searchQuery ? <Search className="w-8 h-8 text-[#94A3B8]" /> : <TrendingUp className="w-8 h-8 text-[#94A3B8]" />}
                            </div>
                            <p className="text-base font-bold text-white">
                              {searchQuery ? 'No matching offers found' : 'No promotional offers found'}
                            </p>
                            <p className="text-xs text-[#94A3B8] mt-1">
                              {searchQuery ? 'Try adjusting your search query' : 'Click \'Create Offer\' above to launch your first promotion'}
                            </p>
                          </td>
                        </tr>
                      );
                    }
                    return filteredOffers.map((off) => (
                      <tr key={off._id} className="hover:bg-white/4 transition-colors group">
                        <td className="px-6 py-3.5">
                          <div className="w-16 h-10 rounded-xl bg-white/4 overflow-hidden flex items-center justify-center border border-white/8 shadow-sm">
                            {off.bannerImage ? (
                              <img src={off.bannerImage} alt={off.title} className="w-full h-full object-cover" />
                            ) : (
                              <Percent className="w-5 h-5 text-[#94A3B8]" />
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3.5 font-bold text-white text-sm">{off.title}</td>
                        <td className="px-6 py-3.5 font-black text-[#22C55E] text-sm">{off.discountPercentage}% OFF</td>
                        <td className="px-6 py-3.5 font-semibold text-gray-300">{formatCurrency(off.minOrderValue)}</td>
                        <td className="px-6 py-3.5 text-gray-300 font-medium">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-[#94A3B8]" />
                            <span>{new Date(off.validFrom).toLocaleDateString()} - {new Date(off.validUntil).toLocaleDateString()}</span>
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
                              onClick={() => handleDelete(off._id, off.title)}
                              className="p-2 hover:bg-[#EF4444]/20 text-[#EF4444] hover:text-[#EF4444] rounded-xl transition-colors border border-transparent hover:border-[#EF4444]/30"
                              title="Delete Offer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-[#081A38] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-scaleUp">
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
                    placeholder="e.g. Pongal Special Festival Sale"
                    className="admin-form-input text-xs h-[40px] px-3 font-medium bg-[#020B24]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#94A3B8] mb-1.5 uppercase tracking-wide">Discount (%) *</label>
                    <input
                      type="number"
                      required
                      value={formData.discountPercentage}
                      onChange={(e) => setFormData({ ...formData, discountPercentage: Number(e.target.value) })}
                      className="admin-form-input text-xs h-[40px] px-3 font-bold bg-[#020B24]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#94A3B8] mb-1.5 uppercase tracking-wide">Min Order Value (₹)</label>
                    <input
                      type="number"
                      value={formData.minOrderValue}
                      onChange={(e) => setFormData({ ...formData, minOrderValue: Number(e.target.value) })}
                      className="admin-form-input text-xs h-[40px] px-3 font-bold bg-[#020B24]"
                    />
                  </div>
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
                  <label className="block font-bold text-[#94A3B8] mb-1.5 uppercase tracking-wide">Banner Image URL</label>
                  <input
                    type="text"
                    value={formData.bannerImage}
                    onChange={(e) => setFormData({ ...formData, bannerImage: e.target.value })}
                    placeholder="https://..."
                    className="admin-form-input text-xs h-[40px] px-3 font-medium bg-[#020B24]"
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
                  disabled={submitting}
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
