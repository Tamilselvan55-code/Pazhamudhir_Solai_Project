import React, { useState } from 'react';
import { useOutletContext, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../../config/api';
import { 
  User, Shield, FileText, Settings, LogOut, ChevronRight, KeyRound, 
  MapPin, Phone, Car, HelpCircle, FileCheck, Moon 
} from 'lucide-react';
import useModal from '../../hooks/useModal';

const DeliveryProfile = () => {
  const { partner } = useOutletContext();
  const navigate = useNavigate();
  const { userAlert, toast } = useModal();

  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '' });
  const [passwordStatus, setPasswordStatus] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('deliveryPartnerInfo');
    navigate('/delivery/login');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordStatus('');
    setPasswordLoading(true);
    const stored = localStorage.getItem('deliveryPartnerInfo');
    if (!stored) return;
    const parsedInfo = JSON.parse(stored);

    try {
      await axios.put(`${API_BASE}/delivery/profile/password`, passwordData, {
        headers: { Authorization: `Bearer ${parsedInfo.token}` }
      });
      setPasswordStatus('Password changed successfully');
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPasswordData({ currentPassword: '', newPassword: '' });
        setPasswordStatus('');
      }, 1500);
    } catch (error) {
      setPasswordStatus(error.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white px-6 pt-10 pb-6 shadow-sm border-b border-gray-100 z-10 sticky top-0">
        <h1 className="text-2xl font-black text-gray-900">Profile</h1>
      </div>

      <div className="flex-1 p-4 sm:p-6 pb-24 overflow-y-auto">
        {/* Profile Card */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 mb-6 flex flex-col items-center text-center">
          <div className="relative mb-4">
            {partner?.profileImage ? (
              <img src={partner?.profileImage} alt={partner?.name} className="w-24 h-24 rounded-full object-cover shadow-lg ring-4 ring-green-50" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-black text-4xl shadow-lg ring-4 ring-green-50">
                {partner?.name?.charAt(0).toUpperCase() || 'D'}
              </div>
            )}
            {partner?.isVerified && (
              <div className="absolute bottom-0 right-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center border-4 border-white shadow-sm" title="Verified">
                <Shield className="w-4 h-4" />
              </div>
            )}
          </div>
          <h2 className="text-xl font-black text-gray-900">{partner?.name}</h2>
          <p className="text-sm font-semibold text-gray-500 mt-1">{partner?.mobile}</p>
          <div className="flex items-center gap-2 mt-3">
            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold uppercase tracking-wide">ID: {partner?.employeeId || 'N/A'}</span>
            <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide ${partner?.isVerified ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
              {partner?.isVerified ? 'Verified' : 'Pending'}
            </span>
          </div>
        </div>

        {/* Info Grid */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-6 space-y-4">
          <div className="flex items-center gap-4 border-b border-gray-50 pb-4">
            <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center shrink-0">
              <Car className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Vehicle</p>
              <p className="text-sm font-bold text-gray-900">{partner?.vehicleNumber || 'Not provided'}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Service Area</p>
              <p className="text-sm font-bold text-gray-900">Sriperumbudur Hub</p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
          <Link to="/delivery/documents" className="flex items-center justify-between p-5 hover:bg-gray-50 transition-colors border-b border-gray-50">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                <FileCheck className="w-5 h-5 text-blue-600" />
              </div>
              <span className="font-bold text-gray-900">Document Center</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
          <button onClick={() => setIsPasswordModalOpen(true)} className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors border-b border-gray-50 text-left">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-orange-600" />
              </div>
              <span className="font-bold text-gray-900">Change Password</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
          <button onClick={() => userAlert('Coming Soon', 'Dark mode is under development.')} className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors border-b border-gray-50 text-left">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center">
                <Moon className="w-5 h-5 text-indigo-600" />
              </div>
              <span className="font-bold text-gray-900">Dark Mode</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
          <button onClick={() => userAlert('Coming Soon', 'Support center is under development.')} className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors text-left">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-teal-50 rounded-full flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-teal-600" />
              </div>
              <span className="font-bold text-gray-900">Help & Support</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <button 
          onClick={handleLogout}
          className="w-full bg-red-50 text-red-600 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:bg-red-100 transition-colors"
        >
          <LogOut className="w-5 h-5" /> Logout
        </button>
      </div>

      {/* Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[200] bg-gray-900/60 backdrop-blur-sm flex justify-center items-end sm:items-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative animate-in slide-in-from-bottom-10">
            <div className="w-16 h-1 rounded-full bg-gray-200 mx-auto mb-6 sm:hidden"></div>
            
            <h2 className="text-xl font-black text-gray-900 mb-6">Change Password</h2>
            
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm font-semibold transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">New Password</label>
                <input
                  type="password"
                  required
                  minLength="6"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm font-semibold transition-all"
                />
              </div>
              
              {passwordStatus && (
                <div className={`text-xs font-bold p-3 rounded-xl ${passwordStatus.includes('successfully') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {passwordStatus}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="flex-1 py-4 rounded-xl font-bold text-sm text-gray-600 bg-gray-100 active:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="flex-[2] py-4 rounded-xl font-bold text-sm text-white bg-green-600 active:bg-green-700 disabled:opacity-70 disabled:active:bg-green-600 shadow-md shadow-green-600/30"
                >
                  {passwordLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryProfile;
