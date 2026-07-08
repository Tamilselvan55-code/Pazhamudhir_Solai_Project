import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { io } from 'socket.io-client';

const sanitizeCartItem = (item) => {
  let price = Number(item.price);
  if (isNaN(price) || price === undefined) {
    price = 0;
  }
  let quantity = Number(item.quantity);
  if (isNaN(quantity) || quantity === undefined || quantity <= 0) {
    quantity = 1;
  }
  return {
    product: item.product,
    name: item.name || '',
    tamilName: item.tamilName || item.nameTamil || '',
    nameTamil: item.nameTamil || item.tamilName || '',
    price: price,
    quantity: quantity,
    image: item.image || '',
  };
};

const sanitizeCartItems = (items) => {
  if (!Array.isArray(items)) return [];
  return items.map(sanitizeCartItem);
};

const useCartStore = create(
  persist(
    (set, get) => ({
      cartItems: [],
      socketConnected: false,

      addToCart: (product, quantity = 1) => {
        const item = get().cartItems.find((x) => x.product === product._id);
        const qtyToAdd = Number(quantity);
        const safeQtyToAdd = isNaN(qtyToAdd) || qtyToAdd <= 0 ? 1 : qtyToAdd;

        if (item) {
          set((state) => {
            const updated = state.cartItems.map((x) =>
              x.product === item.product
                ? { ...x, quantity: Number(x.quantity || 1) + safeQtyToAdd }
                : x
            );
            return { cartItems: sanitizeCartItems(updated) };
          });
        } else {
          set((state) => {
            const newItem = {
              product: product._id,
              name: product.name,
              tamilName: product.tamilName || product.nameTamil || '',
              nameTamil: product.nameTamil || product.tamilName || '',
              price: Number(product.price),
              image: product.image,
              quantity: safeQtyToAdd,
            };
            return { cartItems: sanitizeCartItems([...state.cartItems, newItem]) };
          });
        }
      },

      removeFromCart: (id) => {
        set((state) => ({
          cartItems: sanitizeCartItems(state.cartItems.filter((x) => x.product !== id)),
        }));
      },

      updateQuantity: (id, quantity) => {
        const qtyVal = Number(quantity);
        if (isNaN(qtyVal) || qtyVal <= 0) {
          get().removeFromCart(id);
          return;
        }
        set((state) => {
          const updated = state.cartItems.map((x) =>
            x.product === id ? { ...x, quantity: qtyVal } : x
          );
          return { cartItems: sanitizeCartItems(updated) };
        });
      },

      clearCart: () => set({ cartItems: [] }),

      setCartItems: (items) => set({ cartItems: sanitizeCartItems(items) }),

      getTotalPrice: () => get().cartItems.reduce((acc, item) => {
        const price = Number(item.price);
        const quantity = Number(item.quantity);
        const safePrice = isNaN(price) ? 0 : price;
        const safeQuantity = isNaN(quantity) || quantity <= 0 ? 1 : quantity;
        return acc + (safePrice * safeQuantity);
      }, 0),

      getTotalItems: () => get().cartItems.reduce((acc, item) => {
        const quantity = Number(item.quantity);
        const safeQuantity = isNaN(quantity) || quantity <= 0 ? 1 : quantity;
        return acc + safeQuantity;
      }, 0),

      // Initialize real-time synchronization from Socket.io broadcasts
      initSocketSync: () => {
        if (get().socketConnected) return;

        try {
          const socket = io('http://localhost:5000');

          socket.on('product_update', (updatedProd) => {
            console.log('[Socket.io Client] Received product update:', updatedProd);
            window.dispatchEvent(new CustomEvent('socket_product_update', { detail: updatedProd }));

            // Find matching product in cart
            const cartItems = get().cartItems;
            const inCart = cartItems.find(x => x.product === updatedProd._id);
            if (!inCart) return;

            // If product was disabled, deleted, or out of stock, eject from cart
            if (updatedProd.isActive === false || updatedProd.isDeleted || updatedProd.inStock === false || (updatedProd.stock !== undefined && updatedProd.stock <= 0)) {
              get().removeFromCart(updatedProd._id);
              return;
            }

            // Sync price and image changes instantly
            set((state) => {
              const updated = state.cartItems.map((item) =>
                item.product === updatedProd._id
                  ? {
                      ...item,
                      price: updatedProd.price !== undefined ? Number(updatedProd.price) : item.price,
                      image: updatedProd.image !== undefined ? updatedProd.image : item.image
                    }
                  : item
              );
              return { cartItems: sanitizeCartItems(updated) };
            });
          });

          socket.on('category_update', (cat) => {
            window.dispatchEvent(new CustomEvent('socket_category_update', { detail: cat }));
          });

          socket.on('offer_update', (offer) => {
            window.dispatchEvent(new CustomEvent('socket_offer_update', { detail: offer }));
          });

          socket.on('payment_updated', (data) => {
            window.dispatchEvent(new CustomEvent('socket_payment_update', { detail: data }));
          });

          socket.on('payment_update', (data) => {
            window.dispatchEvent(new CustomEvent('socket_payment_update', { detail: data }));
          });

          socket.on('order_update', (data) => {
            window.dispatchEvent(new CustomEvent('socket_order_update', { detail: data }));
          });

          socket.on('order_status_updated', (data) => {
            window.dispatchEvent(new CustomEvent('socket_order_update', { detail: data }));
          });

          set({ socketConnected: true });
        } catch (error) {
          console.error('[Socket.io Client] Connection failed:', error);
        }
      }
    }),
    {
      name: 'cart-storage',
      // Only persist cart items, don't persist socketConnected state
      partialize: (state) => ({ cartItems: state.cartItems }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.cartItems = sanitizeCartItems(state.cartItems);
        }
      }
    }
  )
);

export default useCartStore;
