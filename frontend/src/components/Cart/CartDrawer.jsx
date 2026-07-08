import React from 'react';
import { X, Plus, Minus, ShoppingBag } from 'lucide-react';
import useCartStore from '../../store/useCartStore';
import { useNavigate } from 'react-router-dom';
import useModal from '../../hooks/useModal';
import { formatCurrency } from '../../utils/currency';

const CartDrawer = ({ isOpen, onClose }) => {
  const { cartItems, updateQuantity, getTotalPrice, getTotalItems } = useCartStore();
  const { userConfirm } = useModal();
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/40 z-[60] transition-opacity" 
        onClick={onClose}
      />
      <div className="fixed bottom-0 md:top-0 md:right-0 md:bottom-auto left-0 md:left-auto w-full md:w-[400px] h-[80vh] md:h-screen bg-gray-50 z-[70] flex flex-col rounded-t-2xl md:rounded-none shadow-2xl transition-transform duration-300 transform translate-y-0 md:translate-x-0">
        
        {/* Header */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100 rounded-t-2xl md:rounded-none">
          <h2 className="font-bold text-lg flex items-center">
            <ShoppingBag className="w-5 h-5 mr-2 text-primary" />
            My Cart
          </h2>
          <button onClick={onClose} className="p-1 text-gray-500 hover:bg-gray-100 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500">
              <ShoppingBag className="w-16 h-16 text-gray-200 mb-4" />
              <p>Your cart is empty</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cartItems.map((item) => (
                <div key={item.product} className="bg-white p-3 rounded-xl shadow-sm flex gap-3">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                    <img src={item.image || 'https://via.placeholder.com/150'} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-800 line-clamp-1">{item.name}</h3>
                      {(item.tamilName || item.nameTamil) && (
                        <span className="text-[11px] text-green-700 font-semibold block">{item.tamilName || item.nameTamil}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-bold text-gray-900">{formatCurrency(item.price * item.quantity)}</span>
                      <div className="flex items-center bg-primary text-white rounded-lg shadow-sm">
                        <button onClick={async () => {
                          if (item.quantity <= 1) {
                            const ok = await userConfirm('Remove Item?', 'Do you want to remove this item from your cart?', { danger: true, confirmLabel: 'Remove' });
                            if (ok) updateQuantity(item.product, 0);
                          } else {
                            updateQuantity(item.product, item.quantity - 1);
                          }
                        }} className="p-1 hover:bg-green-700">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-xs font-bold w-6 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product, item.quantity + 1)} className="p-1 hover:bg-green-700">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="bg-white border-t border-gray-100 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] pb-safe">
            <div className="flex justify-between items-center mb-4 text-sm">
              <span className="text-gray-600">Total Bill</span>
              <span className="font-bold text-lg">{formatCurrency(getTotalPrice())}</span>
            </div>
            <button 
              onClick={() => { onClose(); navigate('/checkout'); }}
              className="w-full bg-primary text-white font-bold py-3.5 rounded-xl shadow-md hover:bg-green-700 transition-colors flex items-center justify-between px-4"
            >
              <span>{getTotalItems()} Items</span>
              <span className="flex items-center">Proceed to Checkout <span className="ml-2">→</span></span>
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default CartDrawer;
