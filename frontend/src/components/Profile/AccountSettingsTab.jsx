import { API_BASE as config_API_BASE, API_URL as config_API_URL } from '../../config/api';
import React, { useState } from 'react';
import axios from 'axios';
import { Key, ShieldAlert, LogOut, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import useAuthStore from '../../store/useAuthStore';
import useModal from '../../hooks/useModal';

const API_BASE = config_API_BASE;

const AccountSettingsTab = ({ onLogout }) => {
  const { userInfo } = useAuthStore();
  const { userAlert, userPrompt } = useModal();
  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '' });
  const [passLoading, setPassLoading] = useState(false);
  const [passSuccess, setPassSuccess] = useState('');
  const [passError, setPassError] = useState('');

  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  const headers = userInfo?.token ? { Authorization: `Bearer ${userInfo.token}` } : {};

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPassSuccess('');
    setPassError('');

    try {
      setPassLoading(true);
      await axios.put(`${API_BASE}/auth/password`, passForm, { headers });
      setPassSuccess('Password updated successfully!');
      setPassForm({ currentPassword: '', newPassword: '' });
    } catch (err) {
      setPassError(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setPassLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    try {
      setOtpLoading(true);
      await axios.post(`${API_BASE}/auth/send-otp`, { email: userInfo?.email });
      setOtpSent(true);
      userAlert('OTP Sent', `OTP sent to ${userInfo?.email}! Check your inbox or terminal log.`);
    } catch (err) {
      userAlert('Error', err.response?.data?.message || 'Failed to send OTP.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmation = await userPrompt('Delete Account', 'To permanently delete your account, type "DELETE" below:', { placeholder: 'DELETE', danger: true });
    if (confirmation !== 'DELETE') return;

    try {
      await axios.delete(`${API_BASE}/auth/account`, { headers });
      await userAlert('Account Deleted', 'Your account has been deleted.');
      onLogout();
    } catch (err) {
      userAlert('Error', 'Failed to delete account.');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-2xl">
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900">Account Settings</h2>
        <p className="text-xs text-gray-500 mt-0.5">Manage security, passwords, and account status</p>
      </div>

      {/* Change Password Card */}
      <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
        <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Key className="w-5 h-5 text-green-600" /> Change Password
        </h3>

        {passSuccess && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-2xl flex items-center gap-2 text-sm font-semibold">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span>{passSuccess}</span>
          </div>
        )}

        {passError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm font-semibold">
            {passError}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Current Password</label>
            <input
              type="password"
              required
              placeholder="Enter current password"
              value={passForm.currentPassword}
              onChange={(e) => setPassForm({ ...passForm, currentPassword: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:border-green-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">New Password</label>
            <input
              type="password"
              required
              minLength={8}
              placeholder="At least 8 characters"
              value={passForm.newPassword}
              onChange={(e) => setPassForm({ ...passForm, newPassword: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:border-green-500 text-sm"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={otpLoading}
              className="text-xs font-bold text-green-600 hover:text-green-700 underline flex items-center gap-1"
            >
              {otpLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Forgot Password? Send OTP
            </button>

            <button
              type="submit"
              disabled={passLoading}
              className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-1.5"
            >
              {passLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Update Password
            </button>
          </div>
        </form>
      </div>

      {/* Logout Card */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center justify-between">
        <div>
          <h4 className="font-bold text-sm text-gray-900">Logout from Account</h4>
          <p className="text-xs text-gray-500 mt-0.5">Sign out of your active session on this browser</p>
        </div>
        <button
          onClick={onLogout}
          className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
        >
          <LogOut className="w-4 h-4 text-gray-600" /> Logout
        </button>
      </div>

      {/* Delete Account Danger Zone */}
      <div className="bg-red-50/50 rounded-3xl p-6 border border-red-100 shadow-sm flex items-center justify-between">
        <div>
          <h4 className="font-bold text-sm text-red-600 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4" /> Delete Account
          </h4>
          <p className="text-xs text-red-500 mt-0.5">Permanently delete your account and all associated personal data</p>
        </div>
        <button
          onClick={handleDeleteAccount}
          className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
        >
          Delete Account
        </button>
      </div>
    </div>
  );
};

export default AccountSettingsTab;
