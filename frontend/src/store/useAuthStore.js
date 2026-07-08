import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

const API = 'http://localhost:5000/api/auth';
const ADMIN_API = 'http://localhost:5000/api/admin/auth';

const useAuthStore = create(
  persist(
    (set) => ({
      userInfo: null,
      adminInfo: null,
      loading: false,
      error: null,

      // ── Register ──────────────────────────────────────────────────────────
      register: async ({ fullName, phoneNumber, email, password }) => {
        set({ loading: true, error: null });
        try {
          const { data } = await axios.post(`${API}/register`, { fullName, phoneNumber, email, password });
          set({ loading: false, error: null });
          return { success: true, message: data.message };
        } catch (err) {
          const msg = err.response?.data?.message || 'Registration failed. Please check your details and try again.';
          set({ loading: false, error: msg });
          return { success: false, message: msg };
        }
      },

      login: async ({ phoneNumber, password }) => {
        set({ loading: true, error: null });
        try {
          const { data } = await axios.post(`${API}/login`, { phoneNumber, password });
          set({ userInfo: data, loading: false, error: null });
          return { success: true };
        } catch (err) {
          const msg = err.response?.data?.message || 'Login failed. Please try again.';
          const needsVerification = err.response?.data?.needsVerification || false;
          const email = err.response?.data?.email || '';
          set({ loading: false, error: msg });
          return { success: false, message: msg, needsVerification, email };
        }
      },

      // ── Send OTP ─────────────────────────────────────────────────────────
      sendOtp: async ({ email }) => {
        set({ loading: true, error: null });
        try {
          const { data } = await axios.post(`${API}/send-otp`, { email });
          set({ loading: false, error: null });
          return { success: true, message: data.message };
        } catch (err) {
          const msg = err.response?.data?.message || 'Failed to send OTP. Please try again.';
          set({ loading: false, error: msg });
          return { success: false, message: msg };
        }
      },

      // ── Verify OTP ────────────────────────────────────────────────────────
      verifyOtp: async ({ email, otp }) => {
        set({ loading: true, error: null });
        try {
          const { data } = await axios.post(`${API}/verify-otp`, { email, otp });
          set({ loading: false, error: null });
          return { success: true, message: data.message, resetToken: data.resetToken };
        } catch (err) {
          const msg = err.response?.data?.message || 'OTP verification failed.';
          set({ loading: false, error: msg });
          return { success: false, message: msg };
        }
      },

      // ── Reset Password (OTP flow) ─────────────────────────────────────────
      resetPasswordOtp: async ({ resetToken, password }) => {
        set({ loading: true, error: null });
        try {
          const { data } = await axios.post(`${API}/reset-password-otp`, { resetToken, password });
          set({ loading: false, error: null });
          return { success: true, message: data.message };
        } catch (err) {
          const msg = err.response?.data?.message || 'Password reset failed.';
          set({ loading: false, error: msg });
          return { success: false, message: msg };
        }
      },

      // ── Admin Login ───────────────────────────────────────────────────────
      adminLogin: async ({ email, password }) => {
        set({ loading: true, error: null });
        try {
          const { data } = await axios.post(`${ADMIN_API}/login`, { email, password });
          set({ adminInfo: data, loading: false, error: null });
          return { success: true };
        } catch (err) {
          const msg = err.response?.data?.message || 'Admin login failed.';
          set({ loading: false, error: msg });
          return { success: false, message: msg };
        }
      },

      // ── Logout ────────────────────────────────────────────────────────────
      logout: () => set({ userInfo: null, error: null }),
      adminLogout: () => set({ adminInfo: null, error: null }),

      clearError: () => set({ error: null }),
    }),
    { name: 'auth-storage', partialize: (state) => ({ userInfo: state.userInfo, adminInfo: state.adminInfo }) }
  )
);

export default useAuthStore;
