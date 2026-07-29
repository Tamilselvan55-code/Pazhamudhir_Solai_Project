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
      setUnreadCount: (count) => set({ unreadCount: count }),
      incrementUnread: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
      clearUnread: () => set({ unreadCount: 0 }),
    }),
    {
      name: 'delivery-partner-settings',
    }
  )
);

export default useDeliveryStore;
