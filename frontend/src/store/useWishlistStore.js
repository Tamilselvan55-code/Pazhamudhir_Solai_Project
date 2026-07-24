import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import { API_BASE } from '../config/api';
import useAuthStore from './useAuthStore';

export const useWishlistStore = create(
  persist(
    (set, get) => ({
      wishlistItems: [],
      loading: false,
      error: null,

      fetchWishlist: async () => {
        const userInfo = useAuthStore.getState().userInfo;
        if (!userInfo || !userInfo.token) {
          set({ wishlistItems: [] });
          return;
        }

        set({ loading: true, error: null });
        try {
          const { data } = await axios.get(`${API_BASE}/auth/wishlist`, {
            headers: { Authorization: `Bearer ${userInfo.token}` }
          });
          const items = Array.isArray(data) ? data : [];
          set({ wishlistItems: items, loading: false });
        } catch (err) {
          console.error('Fetch wishlist error:', err);
          set({ error: err.response?.data?.message || 'Failed to fetch wishlist', loading: false });
        }
      },

      isInWishlist: (productId) => {
        if (!productId) return false;
        const items = get().wishlistItems || [];
        return items.some(item => (item._id === productId || item.id === productId));
      },

      toggleWishlist: async (product) => {
        const userInfo = useAuthStore.getState().userInfo;
        if (!userInfo || !userInfo.token) return false;

        const prodId = product._id || product.id;
        if (!prodId) return false;

        const isWishlisted = get().isInWishlist(prodId);
        const currentItems = get().wishlistItems || [];

        // Optimistic UI Update
        let nextItems = [];
        if (isWishlisted) {
          nextItems = currentItems.filter(item => (item._id !== prodId && item.id !== prodId));
        } else {
          nextItems = [...currentItems, product];
        }

        set({ wishlistItems: nextItems });

        try {
          if (isWishlisted) {
            const { data } = await axios.delete(`${API_BASE}/auth/wishlist/${prodId}`, {
              headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            if (Array.isArray(data)) set({ wishlistItems: data });
            return { success: true, action: 'removed' };
          } else {
            const { data } = await axios.post(`${API_BASE}/auth/wishlist/${prodId}`, {}, {
              headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            if (Array.isArray(data)) set({ wishlistItems: data });
            return { success: true, action: 'added' };
          }
        } catch (err) {
          console.error('Toggle wishlist error, reverting state:', err);
          set({ wishlistItems: currentItems }); // Revert on failure
          return { success: false, action: 'error' };
        }
      },

      removeFromWishlist: async (productId) => {
        return get().toggleWishlist({ _id: productId, id: productId });
      },

      clearWishlist: () => set({ wishlistItems: [] })
    }),
    {
      name: 'pazhamudhir-wishlist-storage',
      getStorage: () => localStorage
    }
  )
);

export default useWishlistStore;
