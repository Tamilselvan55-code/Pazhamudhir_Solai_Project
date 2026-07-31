import React, { useState, useEffect } from 'react';
import { X, Package, MapPin, Truck, FileText, Phone, User, Star, Navigation, Activity, ShieldCheck, KeyRound, ShoppingCart, CheckCircle, Home, XCircle, Clock, CreditCard, Banknote } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import ProductImage from '../Product/ProductImage';
import { formatDisplayAddressLines } from '../../utils/addressFormatter';
import { io } from 'socket.io-client';
import { API_URL, API_BASE } from '../../config/api';
import axios from 'axios';
import useAuthStore from '../../store/useAuthStore';
import useModal from '../../hooks/useModal';

const getStatusBadge = (status) => {
  const colors = {
    Pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    Accepted: 'bg-blue-100 text-blue-800 border-blue-200',
    Confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
    Packed: 'bg-purple-100 text-purple-800 border-purple-200',
    Packing: 'bg-purple-100 text-purple-800 border-purple-200',
    'Out for Delivery': 'bg-orange-100 text-orange-800 border-orange-200',
    'Out For Delivery': 'bg-orange-100 text-orange-800 border-orange-200',
    Delivered: 'bg-green-100 text-green-800 border-green-200',
    Cancelled: 'bg-red-100 text-red-800 border-red-200',
    Rejected: 'bg-red-100 text-red-800 border-red-200',
  };
  return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
};

const OrderDetailsModal = ({ order, onClose, onDownloadInvoice, onRatingUpdate }) => {
  const { userInfo } = useAuthStore();
  const { toast } = useModal();
  const [currentOrder, setCurrentOrder] = useState(order);
  const [showLiveTrack, setShowLiveTrack] = useState(false);
  const [partnerLoc, setPartnerLoc] = useState(null);
  const [liveOtp, setLiveOtp] = useState(null);

  // Phase 15: Rating state
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [review, setReview] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  useEffect(() => {
    setCurrentOrder(order);
    setLiveOtp(null);
    // If order already has a rating, mark as submitted
    if (order?.customerRating) {
      setRating(order.customerRating);
      setRatingSubmitted(true);
    } else {
      setRating(0);
      setRatingSubmitted(false);
    }
  }, [order]);

  // Socket.io for real-time OTP + status (Phase 14 & 11)
  useEffect(() => {
    if (!currentOrder) return;
    const socket = io(API_URL, { transports: ['websocket', 'polling'] });
    const orderId = currentOrder.id || currentOrder._id;
    const userId = userInfo?.id || userInfo?._id;

    const token = useAuthStore.getState().userInfo?.token;
    if (userId) socket.emit('join', { userId, token });

    socket.on('otp_generated', (data) => {
      if (data.orderId === orderId) {
        setLiveOtp(data.otp);
      }
    });

    socket.on('otp_verified', (data) => {
      if (data.orderId === orderId) {
        setCurrentOrder(prev => ({ ...prev, isDelivered: true, status: 'Delivered', deliveryOtpVerified: true }));
        setLiveOtp(null);
      }
    });

    socket.on('order_status_updated', (data) => {
      if (data.orderId === orderId) {
        setCurrentOrder(prev => ({ ...prev, status: data.status }));
      }
    });

    socket.on('delivery_assigned', (data) => {
      if (data.orderId === orderId) {
        setCurrentOrder(prev => ({ ...prev, deliveryPartnerId: data.partnerId }));
      }
    });

    socket.on(`order_location_${orderId}`, (data) => setPartnerLoc(data));
    socket.on('partner_location_changed', (data) => {
      if (data.orderId === orderId || data.partnerId === currentOrder.deliveryPartnerId) {
        setPartnerLoc(data);
      }
    });

    return () => socket.disconnect();
  }, [currentOrder?.id, currentOrder?._id, userInfo]);

  const handleSubmitRating = async () => {
    if (!rating) return;
    setRatingSubmitting(true);
    try {
      const orderId = currentOrder.id || currentOrder._id;
      const headers = userInfo?.token ? { Authorization: `Bearer ${userInfo.token}` } : {};
      await axios.post(`${API_BASE}/orders/${orderId}/rate`, { rating, review }, { headers });
      setRatingSubmitted(true);
      setCurrentOrder(prev => ({ ...prev, customerRating: rating, customerReview: review }));
      if (onRatingUpdate) onRatingUpdate();
      toast('success', 'Rating submitted successfully');
    } catch (err) {
      toast('error', err.response?.data?.message || 'Failed to submit rating');
    } finally {
      setRatingSubmitting(false);
    }
  };

  if (!currentOrder) return null;

  const orderId = currentOrder.id || currentOrder._id;
  const status = currentOrder.status || 'Pending';

  const orderDate = new Date(currentOrder.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  // Professional Timeline logic matching User Request
  const timelineSteps = (() => {
    const fmt = (ts) => (ts ? new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : null);

    if (status === 'Cancelled' || status === 'Cancelled by Customer' || status === 'Rejected by Store') {
      return [
        { label: 'Order Placed', status: 'completed', time: fmt(currentOrder.createdAt), icon: ShoppingCart },
        { label: 'Cancelled', status: 'cancelled', time: null, icon: XCircle }
      ];
    }

    const isAccepted = ['Accepted', 'Order Confirmed', 'Packing', 'Packed', 'Out for Delivery', 'Out For Delivery', 'Delivered'].includes(status);
    const isPacked = ['Packed', 'Out for Delivery', 'Out For Delivery', 'Delivered'].includes(status);
    const isAssigned = Boolean(currentOrder.deliveryPartnerId || currentOrder.deliveryAssignedAt);
    const isOutForDel = ['Out for Delivery', 'Out For Delivery', 'Delivered'].includes(status) || Boolean(currentOrder.pickedUpAt);
    const isDelivered = status === 'Delivered';

    return [
      { label: 'Order Placed', status: 'completed', time: fmt(currentOrder.createdAt), icon: ShoppingCart },
      { label: 'Accepted', status: isAccepted ? 'completed' : 'upcoming', time: isAccepted ? fmt(currentOrder.deliveryAcceptedAt || currentOrder.createdAt) : null, icon: CheckCircle },
      { label: 'Packed', status: isPacked ? 'completed' : (isAccepted ? 'active' : 'upcoming'), time: isPacked ? fmt(currentOrder.pickedUpAt) : null, icon: Package },
      { label: 'Assigned to Delivery Partner', status: isAssigned ? 'completed' : 'upcoming', time: isAssigned ? fmt(currentOrder.deliveryAssignedAt) : null, icon: User },
      { label: 'Out for Delivery', status: isOutForDel ? 'completed' : 'upcoming', time: isOutForDel ? fmt(currentOrder.outForDeliveryAt) : null, icon: Truck },
      { label: 'Delivered', status: isDelivered ? 'completed' : 'upcoming', time: isDelivered ? fmt(currentOrder.deliveredAt) : null, icon: Home }
    ];
  })();

  const isTrackable = ['Accepted', 'Packed', 'Out for Delivery', 'Out For Delivery'].includes(status) || Boolean(currentOrder.deliveryPartnerId);
  const isOutForDelivery = ['Out for Delivery', 'Out For Delivery'].includes(status);
  const isDelivered = status === 'Delivered';

  // OTP to display (from live socket event or server-side if available)
  const displayOtp = liveOtp || (isOutForDelivery ? currentOrder.deliveryOtp : null);

  const remainingKm = currentOrder.shippingAddress?.distanceFromStore ?? 3.5;
  const estimatedMins = Math.max(8, Math.round(remainingKm * 3 + 5));

  const mapsDestinationUrl = (() => {
    const addr = currentOrder.shippingAddress;
    if (addr?.lat && addr?.lon) return `https://www.google.com/maps/dir/?api=1&destination=${addr.lat},${addr.lon}`;
    const formatted = [addr?.doorNo, addr?.street, addr?.area, addr?.city, addr?.pincode || addr?.postalCode].filter(Boolean).join(', ');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formatted || 'Sriperumbudur')}`;
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl max-w-2xl w-full shadow-2xl border border-gray-100 flex flex-col"
        style={{ maxHeight: '90vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-5 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-50 rounded-2xl text-green-600">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Order {currentOrder.invoiceNumber || `#${orderId.slice(-6).toUpperCase()}`}</h3>
              <p className="text-xs text-gray-500">Placed on {orderDate}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onDownloadInvoice(currentOrder)}
              className="px-2.5 sm:px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <FileText className="w-4 h-4" /> <span className="hidden sm:inline">Invoice</span>
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">

          {/* Delivered Banner */}
          {isDelivered && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center justify-between text-green-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-lg">✓</div>
                <div>
                  <p className="text-sm font-extrabold">Delivered Successfully!</p>
                  <p className="text-xs text-green-600 mt-0.5">
                    {currentOrder.deliveredAt ? new Date(currentOrder.deliveredAt).toLocaleString('en-IN') : 'Delivered'}
                    {currentOrder.deliveryOtpVerified && <span className="ml-2 font-bold text-green-700">• OTP Verified ✓</span>}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Feature 2: Order Status Card */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-md">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-4">
              <div>
                <p className="text-xs text-gray-400 font-bold tracking-wider mb-1">ORDER NUMBER</p>
                <p className="text-sm font-extrabold text-gray-800">{currentOrder.invoiceNumber || `#${orderId.slice(-6).toUpperCase()}`}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-bold tracking-wider mb-1">ORDER DATE</p>
                <div className="flex items-center gap-1.5 text-sm font-bold text-gray-800">
                  <Clock className="w-4 h-4 text-gray-400" /> {orderDate}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-bold tracking-wider mb-1">ESTIMATED DELIVERY</p>
                <p className="text-sm font-bold text-gray-800">{estimatedMins} Mins</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-bold tracking-wider mb-1">PAYMENT METHOD</p>
                <div className="flex items-center gap-1.5 text-sm font-bold text-gray-800">
                  {currentOrder.paymentMethod === 'COD' ? <Banknote className="w-4 h-4 text-green-600" /> : <CreditCard className="w-4 h-4 text-blue-600" />}
                  {currentOrder.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Online Payment'}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-bold tracking-wider mb-1">PAYMENT STATUS</p>
                <p className={`text-sm font-bold ${currentOrder.isPaid ? 'text-green-600' : 'text-orange-500'}`}>
                  {currentOrder.isPaid ? 'Paid' : 'Pending'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-bold tracking-wider mb-1">TOTAL AMOUNT</p>
                <p className="text-lg font-black text-green-600">{formatCurrency(currentOrder.totalPrice)}</p>
              </div>
            </div>
            
            <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500">CURRENT STATUS</span>
              <span className={`px-4 py-1.5 rounded-full text-xs font-extrabold border shadow-sm ${getStatusBadge(status)}`}>{status}</span>
            </div>
          </div>

          {/* Phase 14: OTP Card — shown when Out For Delivery */}
          {isOutForDelivery && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-blue-900">Your Delivery OTP</p>
                  <p className="text-[11px] text-blue-600">Valid for 10 minutes • Single use</p>
                </div>
              </div>

              {displayOtp ? (
                <>
                  <div className="flex items-center justify-center gap-3 my-3">
                    {String(displayOtp).split('').map((digit, i) => (
                      <div key={i} className="w-12 h-14 bg-white border-2 border-blue-300 rounded-xl flex items-center justify-center text-2xl font-black text-blue-900 shadow-xs">
                        {digit}
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-center text-blue-700 font-semibold mt-2 bg-blue-100 py-1.5 px-3 rounded-lg">
                    🔒 Share this OTP <strong>only after receiving your order</strong>. Do not share with anyone else.
                  </p>
                </>
              ) : (
                <div className="text-center text-sm text-blue-600 py-3 font-medium">
                  OTP will appear here once the delivery partner is on the way.
                </div>
              )}
            </div>
          )}

          {/* Feature 1: Professional Timeline */}
          <div className="bg-white p-5 sm:p-7 rounded-3xl border border-gray-100 shadow-lg relative overflow-hidden">
            <h4 className="text-sm font-extrabold text-gray-800 mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-600" /> Order Tracking
            </h4>
            
            <div className="relative">
              {/* Desktop Horizontal Line */}
              <div className="hidden md:block absolute top-6 left-6 right-6 h-1 bg-gray-100 rounded-full" />
              {/* Mobile Vertical Line */}
              <div className="block md:hidden absolute top-6 bottom-6 left-6 w-1 bg-gray-100 rounded-full" />

              <div className="flex flex-col md:flex-row justify-between relative z-10 gap-y-8">
                {timelineSteps.map((step, idx) => {
                  const Icon = step.icon;
                  let bgClass = 'bg-gray-100 text-gray-400 border-gray-200';
                  let textClass = 'text-gray-400';
                  let ringClass = '';
                  let lineHighlight = '';

                  if (step.status === 'completed') {
                    bgClass = 'bg-green-500 text-white border-green-500';
                    textClass = 'text-green-700 font-bold';
                    lineHighlight = 'bg-green-500';
                  } else if (step.status === 'cancelled') {
                    bgClass = 'bg-red-500 text-white border-red-500';
                    textClass = 'text-red-600 font-bold';
                  } else if (step.status === 'active') {
                    bgClass = 'bg-blue-500 text-white border-blue-500';
                    textClass = 'text-blue-700 font-bold';
                    ringClass = 'ring-4 ring-blue-100 animate-pulse';
                    lineHighlight = 'bg-blue-300';
                  }

                  return (
                    <div key={step.label} className="flex md:flex-col items-center md:items-center relative group w-full md:w-auto">
                      
                      {/* Highlighted line connector */}
                      {idx > 0 && lineHighlight && (
                        <>
                          <div className={`hidden md:block absolute right-[50%] w-[100%] top-6 h-1 -z-10 ${lineHighlight} transition-all duration-700 ease-in-out`} />
                          <div className={`block md:hidden absolute bottom-[50%] h-[100%] left-6 w-1 -z-10 ${lineHighlight} transition-all duration-700 ease-in-out`} />
                        </>
                      )}

                      <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-500 shadow-sm shrink-0 z-10 ${bgClass} ${ringClass} group-hover:scale-110`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      
                      <div className="ml-4 md:ml-0 md:mt-4 flex flex-col md:items-center w-full">
                        <span className={`text-sm md:text-xs text-left md:text-center transition-colors duration-300 ${textClass}`}>
                          {step.label}
                        </span>
                        {step.time && (
                          <span className="text-xs md:text-[10px] text-gray-500 font-medium mt-0.5">
                            {step.time}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Delivery Partner Card */}
          {currentOrder.deliveryPartner && (
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-2xl border border-orange-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-orange-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-orange-500" /> Your Delivery Partner
                </h4>
                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" /> Online
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-orange-500 text-white font-bold flex items-center justify-center text-base shadow-sm shrink-0">
                    {currentOrder.deliveryPartner.profileImage ? (
                      <img src={currentOrder.deliveryPartner.profileImage} alt="Partner" className="w-full h-full rounded-full object-cover" />
                    ) : currentOrder.deliveryPartner.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                      {currentOrder.deliveryPartner.name}
                      {currentOrder.customerRating && <span className="text-xs font-bold text-amber-500">⭐ {currentOrder.customerRating}.0</span>}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {currentOrder.deliveryPartner.vehicleType || 'Vehicle'}: <span className="font-semibold text-gray-700">{currentOrder.deliveryPartner.vehicleNumber || 'Registered'}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {currentOrder.deliveryPartner.mobile && (
                    <a href={`tel:+91${currentOrder.deliveryPartner.mobile}`}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs">
                      <Phone className="w-3.5 h-3.5" /> Call
                    </a>
                  )}
                  {isTrackable && (
                    <button onClick={() => setShowLiveTrack(!showLiveTrack)}
                      className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition-colors border ${showLiveTrack ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-orange-600 border-orange-300 hover:bg-orange-50'}`}>
                      <Activity className="w-3.5 h-3.5" /> {showLiveTrack ? 'Hide' : 'Track Live'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Live Tracking ETA */}
          {(showLiveTrack || (isTrackable && !isDelivered)) && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping" />
                  <span className="text-xs font-bold text-gray-900">Live GPS Tracking &amp; ETA</span>
                </div>
                <span className="text-xs font-extrabold text-orange-600">~{estimatedMins} mins away</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center bg-gray-50 p-3 rounded-xl">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Distance</p>
                  <p className="text-sm font-extrabold text-gray-800 mt-0.5">{remainingKm} km</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Last Updated</p>
                  <p className="text-sm font-extrabold text-green-600 mt-0.5">
                    {partnerLoc?.timestamp ? new Date(partnerLoc.timestamp).toLocaleTimeString('en-IN') : 'Just Now'}
                  </p>
                </div>
              </div>
              <div className="relative h-40 bg-slate-100 rounded-xl overflow-hidden border border-gray-200 flex flex-col items-center justify-center p-4 text-center">
                <MapPin className="w-7 h-7 text-orange-500 animate-bounce mb-1" />
                <p className="text-xs font-bold text-gray-800">
                  {partnerLoc ? `Partner @ ${partnerLoc.lat?.toFixed(4)}, ${partnerLoc.lon?.toFixed(4)}` : 'Partner moving towards your address'}
                </p>
                <a href={mapsDestinationUrl} target="_blank" rel="noopener noreferrer"
                  className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors">
                  <Navigation className="w-3.5 h-3.5" /> Open in Google Maps ↗
                </a>
              </div>
            </div>
          )}

          {/* Phase 15: Rating Dialog — shown after delivery */}
          {isDelivered && (
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs text-center space-y-3">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <p className="text-sm font-bold text-gray-800">Rate Your Delivery Experience</p>
              </div>
              {ratingSubmitted ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className={`w-6 h-6 ${s <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                    ))}
                  </div>
                  <p className="text-xs font-bold text-green-600">Thank you for your feedback! ✓</p>
                  {currentOrder.customerReview && <p className="text-xs text-gray-500 italic">"{currentOrder.customerReview}"</p>}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-1.5">
                    {[1, 2, 3, 4, 5].map(s => (
                      <button key={s} onClick={() => setRating(s)}
                        onMouseEnter={() => setHoveredRating(s)}
                        onMouseLeave={() => setHoveredRating(0)}
                        className="p-1 hover:scale-125 transition-transform">
                        <Star className={`w-7 h-7 transition-colors ${s <= (hoveredRating || rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                      </button>
                    ))}
                  </div>
                  {rating > 0 && (
                    <textarea
                      value={review}
                      onChange={e => setReview(e.target.value)}
                      placeholder="Share your delivery experience... (optional)"
                      rows={2}
                      className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 resize-none outline-none focus:ring-2 focus:ring-green-500 text-gray-700"
                    />
                  )}
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => { setRatingSubmitted(true); setRating(0); }}
                      className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-200 transition-colors">
                      Skip
                    </button>
                    <button
                      onClick={handleSubmitRating}
                      disabled={!rating || ratingSubmitting}
                      className="px-5 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5">
                      {ratingSubmitting ? <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-3 h-3" /> : null}
                      Submit Rating
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Products List */}
          <div>
            <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-green-600" /> Products Ordered ({currentOrder.orderItems?.length || 0})
            </h4>
            <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden bg-white">
              {currentOrder.orderItems?.map((item, index) => {
                const prod = item.product || {};
                const img = item.image || prod.image;
                const name = item.name || prod.name || 'Product';
                return (
                  <div key={index} className="p-3.5 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl border border-gray-100 shrink-0 overflow-hidden bg-gray-50">
                        <ProductImage src={img} alt={name} category={item.category || prod.category} fit="cover" size="sm" className="w-full h-full" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">{name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{formatCurrency(item.price)} x {item.quantity}</p>
                      </div>
                    </div>
                    <p className="text-sm font-extrabold text-gray-900">{formatCurrency(item.price * item.quantity)}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Delivery Address */}
          {currentOrder.shippingAddress && (
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-green-600" /> Delivery Address
              </h4>
              <div className="text-sm font-semibold text-gray-800 leading-relaxed">
                {formatDisplayAddressLines(currentOrder.shippingAddress, currentOrder.notes).map((line, idx) => (
                  <div key={idx}>{line}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;
