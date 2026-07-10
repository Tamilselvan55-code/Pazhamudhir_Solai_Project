import { API_BASE as config_API_BASE, API_URL as config_API_URL } from '../../config/api';
import React, { useState } from 'react';
import axios from 'axios';
import { User, Phone, Mail, CheckCircle, Loader2, Save } from 'lucide-react';
import useAuthStore from '../../store/useAuthStore';

const API_BASE = config_API_BASE;

const ProfileDetailsTab = () => {
  const { userInfo, setCredentials } = useAuthStore();
  const [formData, setFormData] = useState({
    fullName: userInfo?.fullName || userInfo?.name || '',
    phoneNumber: userInfo?.phoneNumber || '',
    email: userInfo?.email || '',
  });
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const headers = userInfo?.token ? { Authorization: `Bearer ${userInfo.token}` } : {};

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    try {
      setLoading(true);
      const { data } = await axios.put(`${API_BASE}/auth/profile`, formData, { headers });
      setCredentials(data);
      setSuccessMsg('Profile updated successfully!');
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900">Profile Details</h2>
        <p className="text-xs text-gray-500 mt-0.5">Manage your personal identification details</p>
      </div>

      <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm max-w-2xl">
        {successMsg && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-2xl flex items-center gap-2.5 text-sm font-semibold animate-fadeIn">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm font-semibold animate-fadeIn">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Full Name</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <User className="w-5 h-5" />
              </div>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:border-green-500 text-sm font-semibold text-gray-800"
              />
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Phone Number</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Phone className="w-5 h-5" />
              </div>
              <input
                type="text"
                required
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:border-green-500 text-sm font-semibold text-gray-800"
              />
            </div>
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Mail className="w-5 h-5" />
              </div>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:border-green-500 text-sm font-semibold text-gray-800"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-green-600/20 transition-all flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save Profile Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileDetailsTab;
