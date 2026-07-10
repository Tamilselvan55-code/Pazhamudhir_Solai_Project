import { API_BASE as config_API_BASE, API_URL as config_API_URL } from '../../config/api';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapPin, Plus, Edit2, Trash2, CheckCircle, Home, Briefcase, Navigation, Loader2 } from 'lucide-react';
import useAuthStore from '../../store/useAuthStore';
import useModal from '../../hooks/useModal';

const API_BASE = config_API_BASE;

const getAddressIcon = (label) => {
  if (label === 'Home') return <Home className="w-5 h-5 text-green-600" />;
  if (label === 'Work') return <Briefcase className="w-5 h-5 text-blue-600" />;
  return <MapPin className="w-5 h-5 text-purple-600" />;
};

const SavedAddressesTab = () => {
  const { userInfo } = useAuthStore();
  const { userAlert, userConfirm } = useModal();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    label: 'Home',
    fullAddress: '',
    street: '',
    city: '',
    state: 'Tamil Nadu',
    pincode: '',
    isDefault: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const headers = userInfo?.token ? { Authorization: `Bearer ${userInfo.token}` } : {};

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_BASE}/auth/addresses`, { headers });
      setAddresses(data || []);
    } catch (err) {
      console.error('Failed to fetch addresses', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleOpenModal = (addr = null) => {
    if (addr) {
      setEditingId(addr._id);
      setFormData({
        label: addr.label || 'Home',
        fullAddress: addr.fullAddress || '',
        street: addr.street || '',
        city: addr.city || '',
        state: addr.state || 'Tamil Nadu',
        pincode: addr.pincode || '',
        isDefault: !!addr.isDefault,
      });
    } else {
      setEditingId(null);
      setFormData({
        label: 'Home',
        fullAddress: '',
        street: '',
        city: '',
        state: 'Tamil Nadu',
        pincode: '',
        isDefault: addresses.length === 0,
      });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fullAddress.trim()) {
      userAlert('Invalid Address', 'Please enter your address.');
      return;
    }

    try {
      setSubmitting(true);
      if (editingId) {
        await axios.put(`${API_BASE}/auth/addresses/${editingId}`, formData, { headers });
      } else {
        await axios.post(`${API_BASE}/auth/addresses`, formData, { headers });
      }
      setModalOpen(false);
      fetchAddresses();
      userAlert('Delivery Location Updated', 'Your delivery address has been updated successfully.');
    } catch (err) {
      userAlert('Save Failed', 'Failed to save address. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = await userConfirm('Delete Address?', 'Are you sure you want to delete this address?', { danger: true, confirmLabel: 'Delete' });
    if (!ok) return;
    try {
      await axios.delete(`${API_BASE}/auth/addresses/${id}`, { headers });
      fetchAddresses();
    } catch (err) {
      userAlert('Delete Failed', 'Failed to delete address.');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 flex items-center justify-center gap-2 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin text-green-600" />
        <span>Loading saved addresses...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Bar */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Saved Addresses</h2>
          <p className="text-xs text-gray-500 mt-0.5">Manage your delivery locations for faster checkout</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-2xl shadow-md transition-all flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Add New Address
        </button>
      </div>

      {/* Grid of Addresses */}
      {addresses.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 space-y-3">
          <div className="w-16 h-16 rounded-full bg-green-50 text-green-600 mx-auto flex items-center justify-center">
            <MapPin className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-gray-800">No Saved Addresses Found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            You haven't added any saved addresses yet. Add your Home or Work address for quick 1-click delivery selection.
          </p>
          <button
            onClick={() => handleOpenModal()}
            className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl inline-flex items-center gap-1.5 mt-2 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Address Now
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {addresses.map((addr) => (
            <div
              key={addr._id}
              className={`bg-white rounded-3xl p-6 border transition-all relative ${
                addr.isDefault ? 'border-green-300 shadow-md bg-green-50/20' : 'border-gray-100 shadow-sm hover:border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-gray-50 rounded-2xl">
                    {getAddressIcon(addr.label)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      {addr.label}
                      {addr.isDefault && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-extrabold rounded-full">
                          Default
                        </span>
                      )}
                    </h4>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenModal(addr)}
                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-colors"
                    title="Edit Address"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(addr._id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    title="Delete Address"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-sm font-medium text-gray-700 mt-4 leading-relaxed">
                {addr.fullAddress || addr.street}
              </p>
              {(addr.city || addr.state || addr.pincode) && (
                <p className="text-xs text-gray-500 mt-1">
                  {[addr.city, addr.state, addr.pincode].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editingId ? 'Edit Address' : 'Add New Address'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Address Label</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Home', 'Work', 'Other'].map((lbl) => (
                    <button
                      type="button"
                      key={lbl}
                      onClick={() => setFormData({ ...formData, label: lbl })}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        formData.label === lbl
                          ? 'bg-green-600 border-green-600 text-white shadow-sm'
                          : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Full Address</label>
                <textarea
                  rows={3}
                  required
                  placeholder="House no, Street name, Landmark, Area..."
                  value={formData.fullAddress}
                  onChange={(e) => setFormData({ ...formData, fullAddress: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-green-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">City</label>
                  <input
                    type="text"
                    placeholder="City / Town"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-green-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Pincode</label>
                  <input
                    type="text"
                    placeholder="602105"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-green-500 text-sm"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="rounded text-green-600 focus:ring-green-500 w-4 h-4"
                />
                <span className="text-xs font-semibold text-gray-700">Set as default delivery address</span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingId ? 'Save Changes' : 'Add Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavedAddressesTab;
