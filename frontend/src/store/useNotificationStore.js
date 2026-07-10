import { create } from 'zustand';
import axios from 'axios';
import { io } from 'socket.io-client';
import useAuthStore from './useAuthStore';
import { API_URL as config_API_URL, API_BASE } from '../config/api';

const SOCKET_URL = config_API_URL;
const API_URL = API_BASE;

const getAuthHeaders = () => {
  const token = useAuthStore.getState().userInfo?.token;
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

const useNotificationStore = create((set, get) => ({
  notifications: [],
  latestNotifications: [],
  unreadCount: 0,
  total: 0,
  page: 1,
  totalPages: 1,
  loading: false,
  settings: null,
  socket: null,
  socketConnected: false,

  fetchNotifications: async (queryParams = {}) => {
    set({ loading: true });
    try {
      const { page = 1, limit = 10, type = 'all', status = 'all', search = '', sort = 'newest' } = queryParams;
      const response = await axios.get(`${API_URL}/notifications`, {
        params: { page, limit, type, status, search, sort },
        ...getAuthHeaders()
      });

      if (response.data.success) {
        set({
          notifications: response.data.notifications,
          total: response.data.total,
          unreadCount: response.data.unreadCount,
          page: response.data.page,
          totalPages: response.data.totalPages,
          loading: false
        });
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      set({ loading: false });
    }
  },

  fetchLatestNotifications: async () => {
    try {
      const response = await axios.get(`${API_URL}/notifications`, {
        params: { page: 1, limit: 5 },
        ...getAuthHeaders()
      });
      if (response.data.success) {
        set({
          latestNotifications: response.data.notifications,
          unreadCount: response.data.unreadCount
        });
      }
    } catch (err) {
      console.error('Failed to fetch latest notifications:', err);
    }
  },

  fetchUnreadCount: async () => {
    try {
      const response = await axios.get(`${API_URL}/notifications/unread-count`, getAuthHeaders());
      if (response.data.success) {
        set({ unreadCount: response.data.count });
      }
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  },

  markAsRead: async (id) => {
    try {
      const response = await axios.patch(`${API_URL}/notifications/${id}/read`, {}, getAuthHeaders());
      if (response.data.success) {
        // Sync lists locally
        set((state) => {
          const updatedNotifs = state.notifications.map((n) =>
            n._id === id ? { ...n, isRead: true } : n
          );
          const updatedLatest = state.latestNotifications.map((n) =>
            n._id === id ? { ...n, isRead: true } : n
          );
          const newUnreadCount = Math.max(0, state.unreadCount - 1);

          return {
            notifications: updatedNotifs,
            latestNotifications: updatedLatest,
            unreadCount: newUnreadCount
          };
        });
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  },

  markAllAsRead: async () => {
    try {
      const response = await axios.patch(`${API_URL}/notifications/read-all`, {}, getAuthHeaders());
      if (response.data.success) {
        set((state) => {
          const updatedNotifs = state.notifications.map((n) => ({ ...n, isRead: true }));
          const updatedLatest = state.latestNotifications.map((n) => ({ ...n, isRead: true }));
          return {
            notifications: updatedNotifs,
            latestNotifications: updatedLatest,
            unreadCount: 0
          };
        });
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  },

  deleteNotification: async (id) => {
    try {
      const response = await axios.delete(`${API_URL}/notifications/${id}`, getAuthHeaders());
      if (response.data.success) {
        set((state) => {
          const deletedNotif = state.notifications.find((n) => n._id === id);
          const wasUnread = deletedNotif ? !deletedNotif.isRead : false;

          const updatedNotifs = state.notifications.filter((n) => n._id !== id);
          const updatedLatest = state.latestNotifications.filter((n) => n._id !== id);
          const newUnreadCount = wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount;

          return {
            notifications: updatedNotifs,
            latestNotifications: updatedLatest,
            unreadCount: newUnreadCount
          };
        });
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  },

  clearAll: async () => {
    try {
      const response = await axios.delete(`${API_URL}/notifications/clear-all`, getAuthHeaders());
      if (response.data.success) {
        set({
          notifications: [],
          latestNotifications: [],
          unreadCount: 0,
          total: 0
        });
      }
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  },

  fetchSettings: async () => {
    try {
      const response = await axios.get(`${API_URL}/notification-settings`, getAuthHeaders());
      if (response.data.success) {
        set({ settings: response.data.settings });
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  },

  updateSettings: async (newSettings) => {
    try {
      const response = await axios.put(`${API_URL}/notification-settings`, newSettings, getAuthHeaders());
      if (response.data.success) {
        set({ settings: response.data.settings });
        return true;
      }
    } catch (err) {
      console.error('Failed to update settings:', err);
    }
    return false;
  },

  initSocket: (userId) => {
    if (get().socketConnected) return;

    try {
      const socket = io(SOCKET_URL);

      socket.on('connect', () => {
        console.log('[Socket.io Notifications] Connected as user:', userId);
        socket.emit('join', { userId });
      });

      socket.on('customer_notification', (notif) => {
        console.log('[Socket.io Notifications] New notification received:', notif);
        set((state) => {
          // Prepend to notifications and limit latest to 5
          const newNotifs = [notif, ...state.notifications];
          const newLatest = [notif, ...state.latestNotifications].slice(0, 5);
          return {
            notifications: newNotifs,
            latestNotifications: newLatest,
            unreadCount: state.unreadCount + 1
          };
        });
      });

      socket.on('customer:notification:unreadCount', (data) => {
        set({ unreadCount: data.count });
      });

      set({ socket, socketConnected: true });
    } catch (err) {
      console.error('[Socket.io Notifications] Connection error:', err);
    }
  },

  disconnectSocket: () => {
    const socket = get().socket;
    if (socket) {
      socket.disconnect();
      set({ socket: null, socketConnected: false });
      console.log('[Socket.io Notifications] Disconnected.');
    }
  }
}));

export default useNotificationStore;
