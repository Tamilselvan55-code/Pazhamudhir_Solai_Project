import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useDeliveryStore = create(
  persist(
    (set) => ({
      theme: 'system', // 'light', 'dark', 'system'
      setTheme: (theme) => set({ theme }),
      
      notificationsEnabled: true,
      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
      
      soundEnabled: true,
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
      
      vibrationEnabled: true,
      setVibrationEnabled: (enabled) => set({ vibrationEnabled: enabled }),
      
      locationTracking: true,
      setLocationTracking: (enabled) => set({ locationTracking: enabled }),
      
      unreadCount: 0,
      notifications: [],
      setNotifications: (notifications) => set({ 
        notifications, 
        unreadCount: notifications.filter(n => !n.isRead).length 
      }),
      addNotification: (notification) => set((state) => ({ 
        notifications: [notification, ...state.notifications],
        unreadCount: state.unreadCount + 1
      })),
      markAsRead: (id) => set((state) => ({
        notifications: state.notifications.map(n => n.id === id ? { ...n, isRead: true } : n),
        unreadCount: Math.max(0, state.unreadCount - 1)
      })),
      markAllAsRead: () => set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, isRead: true })),
        unreadCount: 0
      })),
      setUnreadCount: (count) => set({ unreadCount: count }),
      incrementUnread: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
      clearUnread: () => set((state) => ({ unreadCount: 0, notifications: state.notifications.map(n => ({ ...n, isRead: true })) })),
    }),
    {
      name: 'delivery-partner-settings',
    }
  )
);

export default useDeliveryStore;
