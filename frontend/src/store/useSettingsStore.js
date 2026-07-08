import { create } from 'zustand';
import axios from 'axios';
import { io } from 'socket.io-client';

const API = 'http://localhost:5000/api/store/settings';

const hexToRgb = (hex) => {
  if (!hex || typeof hex !== 'string') return '22, 163, 74';
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '22, 163, 74';
};

const applySettings = (settings) => {
  if (!settings) return;

  // Title
  if (settings.browserTitle) {
    document.title = settings.browserTitle;
  } else if (settings.websiteName) {
    document.title = settings.websiteName;
  }

  // Favicon
  if (settings.favicon) {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    const iconUrl = settings.favicon.startsWith('http') || settings.favicon.startsWith('data:')
      ? settings.favicon
      : `http://localhost:5000${settings.favicon.startsWith('/') ? '' : '/'}${settings.favicon}`;
    link.href = iconUrl;
  }

  // Colors
  const root = document.documentElement;
  if (settings.primaryThemeColor) {
    root.style.setProperty('--color-primary', settings.primaryThemeColor);
    root.style.setProperty('--color-primary-rgb', hexToRgb(settings.primaryThemeColor));
  }
  if (settings.secondaryThemeColor) {
    root.style.setProperty('--color-secondary', settings.secondaryThemeColor);
    root.style.setProperty('--color-secondary-rgb', hexToRgb(settings.secondaryThemeColor));
  }
};

export const useSettingsStore = create((set, get) => ({
  settings: null,
  loading: false,
  error: null,
  socketConnected: false,

  fetchSettings: async () => {
    set({ loading: true });
    try {
      const { data } = await axios.get(API);
      set({ settings: data, loading: false });
      applySettings(data);
      return data;
    } catch (err) {
      console.error('Failed to fetch settings:', err);
      set({ error: err.message, loading: false });
      return null;
    }
  },

  updateSettingsState: (newSettings) => {
    set({ settings: newSettings });
    applySettings(newSettings);
  },

  initSocketSync: () => {
    if (get().socketConnected) return;

    try {
      const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000');
      socket.on('settings_update', (updatedSettings) => {
        console.log('[Socket.io Client] Received settings update:', updatedSettings);
        get().updateSettingsState(updatedSettings);
      });
      set({ socketConnected: true });
    } catch (error) {
      console.error('[Socket.io Client] Settings sync failed:', error);
    }
  }
}));

export default useSettingsStore;
