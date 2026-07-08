import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  MapPin, CheckCircle, AlertTriangle, Navigation,
  ShoppingBag, User, Phone,
  Banknote, Package, ArrowLeft, Loader2, Info,
} from 'lucide-react';
import useCartStore from '../store/useCartStore';
import useLocationStore, { haversineDistance, STORE_LOCATION } from '../store/useLocationStore';
import useAuthStore from '../store/useAuthStore';
import LiveLocationPanel from '../components/Location/LiveLocationPanel';
import useModal from '../hooks/useModal';
import { formatCurrency } from '../utils/currency';
import useSettingsStore from '../store/useSettingsStore';

// Temporary testing value. Change back to 5 KM before production.
const MAX_KM = Number(import.meta.env.VITE_DELIVERY_RADIUS_KM) || 5;
const API_BASE = 'http://localhost:5000/api';

/* ── Haversine wrapper for recipient location ──────────────────────────────── */
const calcDistance = (lat, lon) =>
  haversineDistance(lat, lon, STORE_LOCATION.lat, STORE_LOCATION.lon);

/* ═══════════════════════════════════════════════════════════════════════════ */
const Checkout = () => {
  const { userAlert } = useModal();
  const navigate  = useNavigate();
  const { cartItems, getTotalPrice, clearCart } = useCartStore();
  const {
    userLocation, fullAddress, city, state, pincode,
    distanceKm, isEligible, loading: locLoading, error: locError,
    permissionDenied,
    setManualLocation, requestLiveGPS, saveAddressToBackend,
  } = useLocationStore();
  const { userInfo } = useAuthStore();

  /* ── Order placed state ─────────────────────────────────────────────────── */
  const [placed, setPlaced]           = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);

  /* ── Address form ───────────────────────────────────────────────────────── */
  const [fullName,       setFullName]       = useState(userInfo?.fullName || userInfo?.name || '');
  const [phoneNumber,    setPhoneNumber]    = useState(userInfo?.phoneNumber || '');
  const [addressDetails, setAddressDetails] = useState('');

  /* ── Payment — COD only ─────────────────────────────────────────────────── */
  const paymentMethod = 'COD';

  /* ── Order API state ────────────────────────────────────────────────────── */
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError,   setOrderError]   = useState('');
  const [isValidatingCart, setIsValidatingCart] = useState(false);
  const [cartProductsValid, setCartProductsValid] = useState(true);

  // Safe Calculations
  const sanitizedItems = cartItems.map(item => {
    let p = Number(item.price);
    if (isNaN(p) || p === undefined) p = 0;
    let q = Number(item.quantity);
    if (isNaN(q) || q === undefined || q <= 0) q = 1;
    return {
      ...item,
      price: p,
      quantity: q,
      total: p * q
    };
  });

  useEffect(() => {
    const checkCartValidity = async () => {
      if (sanitizedItems.length === 0) return;
      try {
        const { data } = await axios.post(`${API_BASE}/products/validate-cart`, { cartItems: sanitizedItems });
        if (data.success && data.hasChanges) {
          setCartProductsValid(false);
        } else {
          setCartProductsValid(true);
        }
      } catch (err) {
        console.error('Failed to validate cart items on checkout:', err);
      }
    };
    checkCartValidity();
  }, [JSON.stringify(sanitizedItems)]);

  const settings = useSettingsStore((s) => s.settings);

  const minOrderValue = settings?.minOrderValue ?? 0;
  const maxOrderValue = settings?.maxOrderValue ?? 100000;
  const freeDeliveryThreshold = settings?.freeDeliveryThreshold ?? 500;
  const baseDeliveryCharges = settings?.deliveryCharges ?? 40;
  const gstPercentage = settings?.gstPercentage ?? 0;

  const itemTotal = sanitizedItems.reduce((sum, item) => sum + item.total, 0);
  const gstAmount = Math.round((itemTotal * (gstPercentage / 100)) * 100) / 100;
  const deliveryFee = itemTotal >= freeDeliveryThreshold ? 0 : baseDeliveryCharges;
  const totalToPay = Math.round((itemTotal + gstAmount + deliveryFee) * 100) / 100;

  const isMinOrderSatisfied = itemTotal >= minOrderValue;
  const isMaxOrderSatisfied = itemTotal <= maxOrderValue;

  const hasLocation = !!userLocation;
  const isDeliveryAvailable = isEligible && hasLocation;
  const isCartNotEmpty = sanitizedItems.length > 0;
  const isNameEntered = fullName.trim() !== '';
  const isPhoneEntered = phoneNumber.trim() !== '';
  const isAddressEntered = addressDetails.trim() !== '';
  const isTotalGreaterThanZero = totalToPay > 0;

  const formValid =
    isDeliveryAvailable &&
    isCartNotEmpty &&
    isNameEntered &&
    isPhoneEntered &&
    isAddressEntered &&
    isMinOrderSatisfied &&
    isMaxOrderSatisfied &&
    isTotalGreaterThanZero;

  const canPlaceOrder = formValid && cartProductsValid;
  const buttonDisabled = !formValid || !cartProductsValid || orderLoading || isValidatingCart;

  const total = totalToPay;
  const deliveryAvailable = isDeliveryAvailable;

  // Debug Logs
  console.log('Cart:', cartItems);
  console.log('Total:', total);
  console.log('Delivery Available:', deliveryAvailable);
  console.log('Form Valid:', formValid);
  console.log('Cart Valid:', cartProductsValid);
  console.log('Button Disabled:', buttonDisabled);

  /* ── Empty cart ─────────────────────────────────────────────────────────── */
  if (cartItems.length === 0 && !placed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <ShoppingBag className="w-10 h-10 text-gray-300" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Your cart is empty</h2>
        <p className="text-gray-400 text-sm mb-6">Add some products before checking out.</p>
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-bold"
          style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', boxShadow: '0 4px 14px rgba(22,163,74,.35)' }}
        >
          <ArrowLeft className="w-4 h-4" /> Go Shopping
        </button>
      </div>
    );
  }

  /* ── Order placed success screen ────────────────────────────────────────── */
  if (placed && placedOrder) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
          style={{ background: 'linear-gradient(135deg,#bbf7d0,#86efac)', boxShadow: '0 8px 32px rgba(22,163,74,.25)' }}
        >
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Placed Successfully</h2>
        <p className="text-gray-500 mb-1 text-sm">Your order has been placed successfully.</p>
        <p className="text-xs text-gray-400 font-mono mb-6">{placedOrder.invoiceNumber}</p>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6 w-full max-w-sm text-left">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500">Items</span>
            <span className="font-semibold text-gray-800">{placedOrder.orderItems?.length || cartItems.length}</span>
          </div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500">Payment Method</span>
            <span className="font-semibold text-green-700 flex items-center gap-1">🪙 Cash on Delivery</span>
          </div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500">Payment Status</span>
            <span className="font-semibold text-orange-600">⏳ Pending (Pay on delivery)</span>
          </div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500">Distance</span>
            <span className="font-semibold text-green-600">{placedOrder.shippingAddress?.distanceFromStore} km</span>
          </div>
          <div className="flex justify-between font-bold text-base pt-3 border-t border-gray-100">
            <span className="text-gray-900">Total</span>
            <span className="text-gray-900">{formatCurrency(placedOrder.totalPrice)}</span>
          </div>
        </div>

        <div className="flex gap-3 w-full max-w-sm">
          <button
            onClick={() => navigate('/profile')}
            className="flex-1 py-3 rounded-xl text-white text-sm font-bold"
            style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', boxShadow: '0 4px 14px rgba(22,163,74,.35)' }}
          >
            View Orders
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex-1 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  /* ── Place order ────────────────────────────────────────────────────────── */
  const handlePlaceOrder = async () => {
    if (!canPlaceOrder || buttonDisabled) return;
    if (!userInfo?._id) {
      navigate('/login');
      return;
    }

    // Check invalid items locally first
    const invalidItem = sanitizedItems.find(item => 
      !item.product || 
      !/^[0-9a-fA-F]{24}$/.test(item.product) || 
      !(Number(item.quantity) > 0) || 
      !(Number(item.price) >= 0)
    );

    if (invalidItem || !cartProductsValid) {
      const validOnly = sanitizedItems.filter(item => item.product && /^[0-9a-fA-F]{24}$/.test(item.product));
      useCartStore.getState().setCartItems(validOnly);
      await userAlert('Cart Updated', 'Some products in your cart are no longer available. Please review your cart.');
      navigate('/cart');
      return;
    }

    setOrderError('');
    setIsValidatingCart(true);

    try {
      // Re-fetch latest product information from backend before placing order
      const { data: valData } = await axios.post(`${API_BASE}/products/validate-cart`, { cartItems: sanitizedItems });
      if (valData.success && valData.hasChanges) {
        setCartProductsValid(false);
        setIsValidatingCart(false);
        useCartStore.getState().setCartItems(valData.validItems);
        await userAlert('Cart Updated', 'Some products in your cart are no longer available. Please review your cart.');
        navigate('/cart');
        return;
      }
    } catch (err) {
      setIsValidatingCart(false);
      setOrderError('Unable to verify product availability. Please try again.');
      return;
    }

    setIsValidatingCart(false);
    setOrderLoading(true);

    try {
      const payload = {
        user:         userInfo._id,
        orderItems:   sanitizedItems.map(item => ({
          product: item.product,
          name: item.name,
          tamilName: item.tamilName || item.nameTamil || '',
          nameTamil: item.nameTamil || item.tamilName || '',
          quantity: item.quantity,
          price: item.price,
          image: item.image
        })),
        totalPrice:   totalToPay,
        paymentMethod,
        notes:        addressDetails,
        shippingAddress: {
          fullAddress:       fullAddress,
          city:              city,
          state:             state,
          pincode:           pincode,
          lat:               userLocation?.lat,
          lon:               userLocation?.lon,
          distanceFromStore: distanceKm,
          deliveryAvailable: isEligible,
        },
        recipient: {
          isForAnotherPerson: false,
          name:               fullName,
          phone:              phoneNumber,
        },
      };

      const headers = userInfo?.token
        ? { Authorization: `Bearer ${userInfo.token}` }
        : {};

      const { data } = await axios.post(`${API_BASE}/orders`, payload, { headers });
      clearCart();
      setPlacedOrder(data);
      setPlaced(true);

    } catch (err) {
      const respData = err.response?.data;
      if (respData?.updatedCart || respData?.message?.includes('no longer available')) {
        if (respData.updatedCart) {
          useCartStore.getState().setCartItems(respData.updatedCart);
        }
        await userAlert('Cart Updated', 'Some products in your cart are no longer available. Please review your cart.');
        navigate('/cart');
        return;
      }
      setOrderError(respData?.message || 'Failed to place order. Please try again.');
      userAlert('Something Went Wrong', 'Please try again later.');
    } finally {
      setOrderLoading(false);
    }
  };

  /* ════════════════════════════════════════════════════════════════════════ */
  return (
    <>
      {/* ── Page ──────────────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 py-6 md:py-10 pb-28 grid md:grid-cols-2 gap-6 md:gap-8">

        {/* ══════════════ LEFT COLUMN — Delivery Details ══════════════════ */}
        <div className="space-y-5">
          <h2 className="text-xl font-bold text-gray-900">Delivery Details</h2>

          {/* ── Live Location Panel ──────────────────────────────────────── */}
          <LiveLocationPanel />

          {/* ── Contact Info ───────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4"
            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
            <h3 className="text-sm font-bold text-gray-800">Contact & Address Details</h3>

            <div className="flex items-center border-2 border-gray-200 rounded-xl px-3.5 gap-2 focus-within:border-green-500 transition-colors">
              <User className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Your Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="flex-1 py-3 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
              />
            </div>

            <div className="flex items-center border-2 border-gray-200 rounded-xl px-3.5 gap-2 focus-within:border-green-500 transition-colors">
              <Phone className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="tel"
                placeholder="Phone Number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="flex-1 py-3 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
              />
            </div>

            <textarea
              placeholder="House No, Street, Landmark"
              rows={2}
              value={addressDetails}
              onChange={(e) => setAddressDetails(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-3.5 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-500 transition-colors resize-none"
            />
          </div>
        </div>

        {/* ══════════════ RIGHT COLUMN — Order Summary ════════════════════ */}
        <div className="space-y-5">
          <h2 className="text-xl font-bold text-gray-900">Order Summary</h2>

          {/* ── Cart Items ─────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <Package className="w-4 h-4 text-gray-400" />
              <p className="text-sm font-bold text-gray-800">Items ({sanitizedItems.length})</p>
            </div>

            <div className="max-h-56 overflow-y-auto divide-y divide-gray-50">
              {sanitizedItems.map((item) => (
                <div key={item.product} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                    {item.image
                      ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      : <ShoppingBag className="w-4 h-4 text-gray-300" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
                    <p className="text-xs text-gray-400">{item.quantity} × {formatCurrency(item.price)}</p>
                  </div>
                  <p className="text-sm font-bold text-gray-900 shrink-0">{formatCurrency(item.total)}</p>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="px-5 py-4 border-t border-gray-100 space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Item Total</span>
                <span className="font-medium text-gray-800">{formatCurrency(itemTotal)}</span>
              </div>
              {gstPercentage > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">GST ({gstPercentage}%)</span>
                  <span className="font-medium text-gray-800">{formatCurrency(gstAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Delivery Fee</span>
                <span className={`font-semibold ${deliveryFee === 0 ? 'text-green-600' : 'text-gray-800'}`}>
                  {deliveryFee === 0 ? 'FREE' : formatCurrency(deliveryFee)}
                </span>
              </div>
              <div className="flex justify-between font-bold text-base pt-3 border-t border-gray-100">
                <span className="text-gray-900">Total to Pay</span>
                <span className="text-gray-900">{formatCurrency(totalToPay)}</span>
              </div>
            </div>
          </div>

          {/* ── Payment Method — Cash on Delivery only ─────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3"
            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-gray-800">Payment Method</p>
              {!isEligible && hasLocation && (
                <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                  Disabled
                </span>
              )}
            </div>

            {/* COD — only option, always selected */}
            <div
              className={`flex items-center gap-3.5 p-4 rounded-xl border-2 transition-all ${
                isEligible
                  ? 'border-green-400 bg-green-50'
                  : 'border-gray-200 bg-gray-50 opacity-50'
              }`}
            >
              <div className="w-4 h-4 rounded-full border-2 border-green-500 flex items-center justify-center shrink-0">
                {isEligible && (
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                )}
              </div>
              <Banknote className="w-5 h-5 text-green-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">Cash on Delivery (COD)</p>
                <p className="text-xs text-gray-400">Pay in cash when your order is delivered</p>
              </div>
              <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full shrink-0">
                Only Option
              </span>
            </div>

            {!isEligible && hasLocation && (
              <p className="text-xs text-red-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                Payment disabled — delivery not available at this location
              </p>
            )}
          </div>

          {/* ── Order Error ────────────────────────────────────────────── */}
          {orderError && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 font-medium">{orderError}</p>
            </div>
          )}

          {/* ── Validation Messages ─────────────────────────────────────── */}
          <div className="space-y-2">
            {!isCartNotEmpty && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-left">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 font-medium">Please add products to your cart.</p>
              </div>
            )}
            {isCartNotEmpty && !isDeliveryAvailable && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-left">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 font-medium">Delivery is not available for your location.</p>
              </div>
            )}
            {isCartNotEmpty && isDeliveryAvailable && !isNameEntered && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-orange-50 border border-orange-200 text-left">
                <Info className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                <p className="text-xs text-orange-700 font-medium">Please enter your name.</p>
              </div>
            )}
            {isCartNotEmpty && isDeliveryAvailable && isNameEntered && !isPhoneEntered && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-orange-50 border border-orange-200 text-left">
                <Info className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                <p className="text-xs text-orange-700 font-medium">Please enter your phone number.</p>
              </div>
            )}
            {isCartNotEmpty && isDeliveryAvailable && isNameEntered && isPhoneEntered && !isAddressEntered && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-orange-50 border border-orange-200 text-left">
                <Info className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                <p className="text-xs text-orange-700 font-medium">Please enter your address.</p>
              </div>
            )}
            {!isMinOrderSatisfied && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-left">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 font-medium">
                  Minimum order value required is {formatCurrency(minOrderValue)}. Your items total is {formatCurrency(itemTotal)}.
                </p>
              </div>
            )}
            {!isMaxOrderSatisfied && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-left">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 font-medium">
                  Maximum order value allowed is {formatCurrency(maxOrderValue)}. Your items total is {formatCurrency(itemTotal)}.
                </p>
              </div>
            )}
          </div>

          {/* ── Place Order Button ─────────────────────────────────────── */}
          <button
            id="place-order-btn"
            onClick={handlePlaceOrder}
            disabled={buttonDisabled}
            className="w-full py-4 rounded-2xl text-white text-base font-bold flex items-center justify-center gap-2.5 transition-all"
            style={{
              background: !buttonDisabled
                ? 'linear-gradient(135deg, #16a34a, #15803d)'
                : '#d1d5db',
              boxShadow: !buttonDisabled
                ? '0 6px 20px rgba(22,163,74,0.40)'
                : 'none',
              cursor: buttonDisabled ? 'not-allowed' : 'pointer',
            }}
          >
            {orderLoading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Placing Order...</>
            ) : (
              <>Place Order — {formatCurrency(totalToPay)}</>
            )}
          </button>

          <p className="text-[11px] text-gray-400 text-center">
            By placing the order, you agree to our delivery terms. Free delivery within {MAX_KM} km of the store.
          </p>
        </div>
      </div>
    </>
  );
};

export default Checkout;
