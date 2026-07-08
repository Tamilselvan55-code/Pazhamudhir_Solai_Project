import React, { useState, useEffect } from 'react';
import { Tags, Plus, Search, Edit2, Trash2, Eye, EyeOff, Loader2, ShieldAlert } from 'lucide-react';
import AdminLayout from '../../components/Admin/AdminLayout';
import useAuthStore from '../../store/useAuthStore';
import axios from 'axios';
import useModal from '../../hooks/useModal';

const Categories = () => {
  const { adminInfo } = useAuthStore();
  const { adminAlert, adminConfirm } = useModal();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('add'); // 'add' | 'edit'
  const [selectedId, setSelectedId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    tamilName: '',
    description: '',
    image: '',
    displayOrder: 0,
    status: 'Active'
  });

  const fetchCategories = async () => {
    if (!adminInfo) return;
    try {
      setLoading(true);
      const { data } = await axios.get('http://localhost:5000/api/admin/categories', {
        headers: { Authorization: `Bearer ${adminInfo.token}` },
        params: { search: searchQuery || undefined }
      });
      setCategories(data);
      setError('');
    } catch (err) {
      console.error('Fetch categories error:', err);
      setError(err.response?.data?.message || 'Failed to load categories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [adminInfo]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e) => {
    e.preventDefault();
    fetchCategories();
  };

  const openAddModal = () => {
    setModalType('add');
    setSelectedId(null);
    setFormData({
      name: '',
      tamilName: '',
      description: '',
      image: '',
      displayOrder: categories.length + 1,
      status: 'Active'
    });
    setModalOpen(true);
  };

  const openEditModal = (cat) => {
    setModalType('edit');
    setSelectedId(cat._id);
    setFormData({
      name: cat.name || '',
      tamilName: cat.tamilName || '',
      description: cat.description || '',
      image: cat.image || '',
      displayOrder: cat.displayOrder || 0,
      status: cat.status || 'Active'
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (modalType === 'add') {
        await axios.post('http://localhost:5000/api/admin/categories', formData, {
          headers: { Authorization: `Bearer ${adminInfo.token}` }
        });
      } else {
        await axios.put(`http://localhost:5000/api/admin/categories/${selectedId}`, formData, {
          headers: { Authorization: `Bearer ${adminInfo.token}` }
        });
      }
      setModalOpen(false);
      fetchCategories();
    } catch (err) {
      adminAlert('error', 'Save Failed', err.response?.data?.message || 'Error saving category. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    const ok = await adminConfirm('Delete Category?', `Are you sure you want to delete "${name}"?\n\nThis action cannot be undone.`, { danger: true, confirmLabel: '🗑️ Delete' });
    if (!ok) return;
    try {
      await axios.delete(`http://localhost:5000/api/admin/categories/${id}`, {
        headers: { Authorization: `Bearer ${adminInfo.token}` }
      });
      fetchCategories();
    } catch (err) {
      adminAlert('error', 'Delete Failed', err.response?.data?.message || 'Failed to delete category.');
    }
  };

  const handleToggleStatus = async (cat) => {
    const newStatus = cat.status === 'Active' ? 'Hidden' : 'Active';
    try {
      await axios.patch(`http://localhost:5000/api/admin/categories/${cat._id}/status`, {
        status: newStatus
      }, {
        headers: { Authorization: `Bearer ${adminInfo.token}` }
      });
      fetchCategories();
    } catch (err) {
      adminAlert('error', 'Update Failed', 'Failed to update category status. Please try again.');
    }
  };

  const handleMoveCategory = async (cat, direction) => {
    const index = categories.findIndex(c => c._id === cat._id);
    if (index === -1) return;

    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === categories.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const reorderedList = [...categories];

    const originalOrder = reorderedList[index].displayOrder;
    reorderedList[index].displayOrder = reorderedList[targetIndex].displayOrder;
    reorderedList[targetIndex].displayOrder = originalOrder;

    const temp = reorderedList[index];
    reorderedList[index] = reorderedList[targetIndex];
    reorderedList[targetIndex] = temp;

    setCategories(reorderedList);

    try {
      const orders = reorderedList.map(c => ({ id: c._id, displayOrder: c.displayOrder }));
      await axios.post('http://localhost:5000/api/admin/categories/reorder', { orders }, {
        headers: { Authorization: `Bearer ${adminInfo.token}` }
      });
    } catch (err) {
      console.error(err);
      adminAlert('error', 'Reorder Failed', 'Failed to save new category ordering.');
      fetchCategories();
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
              <div className="p-2.5 rounded-[16px] bg-white/4 border border-white/8 shadow-sm">
                <Tags className="w-6 h-6 text-[#22C55E]" />
              </div>
              Category Management
            </h1>
            <p className="text-sm text-[#94A3B8] mt-1">Organize product categories, display ordering and visibility status.</p>
          </div>
          <button
            onClick={openAddModal}
            className="admin-btn-primary h-[40px] px-4 font-bold text-xs flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Category
          </button>
        </div>

        {/* Search Bar (55px) */}
        <div className="admin-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <form onSubmit={handleSearch} className="relative w-full max-w-lg">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search category by English or Tamil name..."
              className="admin-search-bar"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); fetchCategories(); }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-white font-bold"
              >
                ✕
              </button>
            )}
          </form>
          <div className="text-xs font-bold text-[#94A3B8] px-3 py-2 rounded-xl bg-white/4 border border-white/8 shrink-0">
            Total Categories: <strong className="text-white">{categories.length}</strong>
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
            <p className="text-sm font-semibold text-[#94A3B8]">Loading store categories...</p>
          </div>
        ) : (
          <div className="admin-table-container">
            <div className="overflow-x-auto admin-scroll">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="admin-table-header text-xs font-bold text-[#94A3B8] uppercase tracking-wider border-b border-white/8">
                    <th className="px-6 py-4">Image</th>
                    <th className="px-6 py-4">Category Name</th>
                    <th className="px-6 py-4">Tamil Name</th>
                    <th className="px-6 py-4 text-center">Total Products</th>
                    <th className="px-6 py-4 text-center">Display Order</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/6 text-xs">
                  {categories.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-20 text-center">
                        <div className="w-16 h-16 rounded-[20px] bg-white/4 border border-white/8 flex items-center justify-center mx-auto mb-4 shadow-sm">
                          <Tags className="w-8 h-8 text-[#94A3B8]" />
                        </div>
                        <p className="text-base font-bold text-white">No categories found</p>
                        <p className="text-xs text-[#94A3B8] mt-1">Try searching for a different keyword or create a new category</p>
                      </td>
                    </tr>
                  ) : (
                    categories.map((cat) => (
                      <tr key={cat._id} className="hover:bg-white/4 transition-colors group">
                        <td className="px-6 py-3.5">
                          <div className="w-11 h-11 rounded-xl bg-white/4 border border-white/8 overflow-hidden flex items-center justify-center shadow-sm">
                            {cat.image ? (
                              <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                            ) : (
                              <Tags className="w-5 h-5 text-[#94A3B8]" />
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3.5 font-bold text-white text-sm">{cat.name}</td>
                        <td className="px-6 py-3.5 font-semibold text-gray-300">{cat.tamilName || '-'}</td>
                        <td className="px-6 py-3.5 text-center font-bold">
                          <span className="bg-white/6 border border-white/8 text-white px-3 py-1 rounded-full text-xs">{cat.productCount || 0}</span>
                        </td>
                        <td className="px-6 py-3.5 text-center font-bold text-sm">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleMoveCategory(cat, 'up')}
                              disabled={categories.findIndex(c => c._id === cat._id) === 0}
                              className="p-1 text-[#94A3B8] hover:text-[#22C55E] disabled:opacity-20"
                              title="Move Up"
                            >
                              ▲
                            </button>
                            <span className="text-white font-mono min-w-[24px]">#{cat.displayOrder || 0}</span>
                            <button
                              type="button"
                              onClick={() => handleMoveCategory(cat, 'down')}
                              disabled={categories.findIndex(c => c._id === cat._id) === categories.length - 1}
                              className="p-1 text-[#94A3B8] hover:text-[#22C55E] disabled:opacity-20"
                              title="Move Down"
                            >
                              ▼
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          {cat.status === 'Active' ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/30">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-white/10 text-[#94A3B8] border border-white/10">
                              Hidden
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleToggleStatus(cat)}
                              className="p-2 hover:bg-white/10 text-[#94A3B8] hover:text-white rounded-xl transition-colors border border-transparent hover:border-white/8"
                              title={cat.status === 'Active' ? 'Hide category' : 'Show category'}
                            >
                              {cat.status === 'Active' ? <EyeOff className="w-4 h-4 text-[#F59E0B]" /> : <Eye className="w-4 h-4 text-[#22C55E]" />}
                            </button>
                            <button
                              onClick={() => openEditModal(cat)}
                              className="p-2 hover:bg-white/10 text-[#22C55E] hover:text-[#22C55E] rounded-xl transition-colors border border-transparent hover:border-white/8"
                              title="Edit Category"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(cat._id, cat.name)}
                              className="p-2 hover:bg-[#EF4444]/20 text-[#EF4444] hover:text-[#EF4444] rounded-xl transition-colors border border-transparent hover:border-[#EF4444]/30"
                              title="Delete Category"
                            >
                              <Trash2 className="w-4 h-4" />
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
                <Tags className="w-5 h-5 text-[#22C55E]" />
                {modalType === 'add' ? 'Add New Category' : 'Edit Category'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-[#94A3B8] mb-1.5 uppercase tracking-wide">Category Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Fresh Fruits"
                    className="admin-form-input text-xs h-[40px] px-3 font-medium bg-[#020B24]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#94A3B8] mb-1.5 uppercase tracking-wide">Tamil Name</label>
                  <input
                    type="text"
                    value={formData.tamilName}
                    onChange={(e) => setFormData({ ...formData, tamilName: e.target.value })}
                    placeholder="e.g. பழங்கள்"
                    className="admin-form-input text-xs h-[40px] px-3 font-medium bg-[#020B24]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#94A3B8] mb-1.5 uppercase tracking-wide">Image URL</label>
                  <input
                    type="text"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    placeholder="https://..."
                    className="admin-form-input text-xs h-[40px] px-3 font-medium bg-[#020B24]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#94A3B8] mb-1.5 uppercase tracking-wide">Display Order</label>
                    <input
                      type="number"
                      value={formData.displayOrder}
                      onChange={(e) => setFormData({ ...formData, displayOrder: Number(e.target.value) })}
                      className="admin-form-input text-xs h-[40px] px-3 font-bold bg-[#020B24]"
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
                      <option value="Hidden" className="bg-[#081A38] text-white">Hidden</option>
                    </select>
                  </div>
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
                <button
                  type="submit"
                  disabled={submitting}
                  className="admin-btn-primary w-full h-[44px] font-bold text-xs flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitting ? 'Saving...' : modalType === 'add' ? 'Create Category' : 'Save Changes'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Categories;
