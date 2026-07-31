import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { API_BASE, API_URL } from '../../config/api';
import { io } from 'socket.io-client';
import useModal from '../../hooks/useModal';
import { 
  Package, MapPin, Navigation, Phone, Search, 
  MessageCircle, Clock, AlertCircle, X, Check, ShieldCheck, Truck 
} from 'lucide-react';

const DeliveryOrders = () => {
  const { partner } = useOutletContext();
  const { userConfirm, toast } = useModal();
  const [orders, setOrders] = useState([]);
  const [historyOrders, setHistoryOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('Active');
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  
  // Incoming Order Modal
  const [incomingOrder, setIncomingOrder] = useState(null);
  const [timer, setTimer] = useState(30);

  // OTP Modal
  const [otpModalData, setOtpModalData] = useState({ isOpen: false, orderId: null, otp: '' });
  const [otpLoading, setOtpLoading] = useState(false);

  // Filters
  const [historyFilter, setHistoryFilter] = useState('Today');

  const ordersRef = useRef(orders);
  const timerRef = useRef(null);
  
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  const getToken = () => {
    const stored = localStorage.getItem('deliveryPartnerInfo');
    return stored ? JSON.parse(stored).token : null;
  };

  const fetchOrders = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/delivery/orders`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setOrders(data);
    } catch (err) {
      console.error('Failed to fetch orders', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}/delivery/orders?history=true`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setHistoryOrders(data);
    } catch (err) {
      console.error('Failed to fetch history', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'History') fetchHistory();
    else fetchOrders();
  }, [activeTab]);

  // Audio Playback
  const playRingtone = () => {
    try {
      if ('vibrate' in navigator) navigator.vibrate([200, 100, 200, 100, 500]);
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1108.73, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch (e) {}
  };

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    const socket = io(API_URL, { transports: ['websocket', 'polling'] });
    
    socket.on('connect', () => {
      const partnerInfo = JSON.parse(localStorage.getItem('deliveryPartnerInfo'));
      socket.emit('join', { role: 'delivery', partnerId: partnerInfo?._id || partnerInfo?.id, token: partnerInfo?.token });
    });

    socket.on('delivery_assigned', (data) => {
      const stored = localStorage.getItem('deliveryPartnerInfo');
      if (stored) {
        const storedPartner = JSON.parse(stored);
        if (storedPartner._id === data.partnerId || storedPartner.id === data.partnerId) {
          fetchOrders();
          if (data.order) {
            setIncomingOrder(data.order);
            setTimer(30);
            playRingtone();
          }
        }
      }
    });

    return () => socket.disconnect();
  }, []);

  // Timer logic for incoming order
  useEffect(() => {
    if (incomingOrder) {
      timerRef.current = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIncomingOrder(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [incomingOrder]);

  // Geolocation Streaming
  useEffect(() => {
    const token = getToken();
    if (!token || !partner || partner.status !== 'On Delivery') return;
    if (!('geolocation' in navigator)) return;

    let lastSent = 0;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastSent < 10000) return;
        lastSent = now;
        const { latitude: lat, longitude: lon, heading, speed } = pos.coords;
        const activeOrder = ordersRef.current.find(o => o.pickedUpAt && !o.isDelivered);
        
        axios.post(`${API_BASE}/delivery/location`, { 
          lat, lon, heading, speed, orderId: activeOrder?.id || activeOrder?._id 
        }, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => {});
      },
      (err) => console.log('Geolocation stream warning:', err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [partner?.status]);

  const handleAction = async (orderId, action) => {
    setActionLoading(orderId);
    try {
      await axios.patch(`${API_BASE}/delivery/orders/${orderId}/status`, { action }, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (action === 'Accept Order') {
        setIncomingOrder(null);
      }
      fetchOrders();
    } catch (err) {
      toast('error', err.response?.data?.message || `Failed to mark ${action}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (orderId) => {
    const isConfirmed = await userConfirm('Reject Order', 'Are you sure you want to reject this delivery?', { danger: true });
    if (!isConfirmed) return;
    setActionLoading(orderId);
    try {
      await axios.post(`${API_BASE}/delivery/orders/${orderId}/reject`, {}, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setIncomingOrder(null);
      fetchOrders();
    } catch (err) {
      toast('error', err.response?.data?.message || 'Failed to reject assignment');
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otpModalData.otp.length !== 4) return toast('warning', 'Enter a 4-digit OTP.');
    setOtpLoading(true);
    try {
      await axios.post(`${API_BASE}/delivery/orders/${otpModalData.orderId}/verify-otp`, { otp: otpModalData.otp }, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setOtpModalData({ isOpen: false, orderId: null, otp: '' });
      fetchOrders();
    } catch (err) {
      toast('error', err.response?.data?.message || 'Invalid OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  const getCategorized = () => {
    const assigned = orders.filter(o => !o.pickedUpAt && !o.isDelivered);
    const active = orders.filter(o => o.pickedUpAt && !o.isDelivered);
    const completed = orders.filter(o => o.isDelivered && new Date(o.updatedAt).toDateString() === new Date().toDateString());
    return { assigned, active, completed };
  };
  const categorized = getCategorized();
  const currentOrders = activeTab === 'Assigned' ? categorized.assigned : activeTab === 'Active' ? categorized.active : categorized.completed;

  const filteredHistory = historyOrders.filter(order => {
    if (historyFilter === 'Today') {
      const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
      return new Date(order.deliveredAt) >= startOfToday;
    }
    return true;
  });

  return (
    <div className="min-h-[100dvh] bg-gray-50 dark:bg-gray-950 flex flex-col transition-colors duration-300">
      {/* Header Tabs */}
      <div className="bg-white dark:bg-gray-900 sticky top-0 z-30 border-b border-gray-100 dark:border-gray-800 transition-colors shadow-sm">
        {/* Page title */}
        <div className="px-5 pt-5 pb-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
            <Package className="w-4 h-4 text-green-600 dark:text-green-400" strokeWidth={2} />
          </div>
          <h1 className="text-lg font-black text-gray-900 dark:text-white">My Orders</h1>
        </div>
        {/* Tabs */}
        <div className="flex border-t border-gray-50 dark:border-gray-800/50 px-1 overflow-x-auto hide-scrollbar">
          {['Assigned', 'Active', 'Completed', 'History'].map(tab => {
            const counts = { Assigned: categorized.assigned.length, Active: categorized.active.length, Completed: categorized.completed.length };
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 min-w-[90px] py-3 px-2 text-xs font-bold text-center whitespace-nowrap transition-all relative ${
                  activeTab === tab
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab !== 'History' ? (
                  <span className="inline-flex items-center gap-1.5">
                    {tab}
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                      activeTab === tab
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500'
                    }`}>{counts[tab]}</span>
                  </span>
                ) : tab}
                {activeTab === tab && <div className="absolute bottom-0 left-3 right-3 h-0.5 bg-green-600 dark:bg-green-500 rounded-t-full" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 p-4 pb-24 overflow-y-auto">
        {loading || (activeTab === 'History' && historyLoading) ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="w-10 h-10 border-3 border-green-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500">Loading orders...</p>
          </div>
        ) : activeTab === 'History' ? (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 hide-scrollbar">
              {['Today', 'This Week', 'This Month', 'All Time'].map(f => (
                <button
                  key={f}
                  onClick={() => setHistoryFilter(f)}
                  className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                    historyFilter === f ? 'bg-green-600 text-white shadow-sm' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
              {filteredHistory.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-10 text-center">
                  <div className="w-14 h-14 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Package className="w-7 h-7 text-gray-300 dark:text-gray-600" />
                  </div>
                  <p className="font-bold text-gray-600 dark:text-gray-400 text-sm">No delivery history</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Completed deliveries will appear here.</p>
                </div>
            ) : (
              <div className="space-y-3">
                {filteredHistory.map(order => (
                  <div key={order.id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 hover:shadow-sm transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white text-sm">{order.invoiceNumber || `#${order.id.slice(-6).toUpperCase()}`}</h4>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{order.user?.fullName}</p>
                      </div>
                      <span className="text-green-600 dark:text-green-400 font-black text-base">₹40</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500 border-t border-gray-50 dark:border-gray-800 pt-2 mt-2">
                      <span>{new Date(order.deliveredAt || order.updatedAt).toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="px-2 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-[10px] font-bold">Delivered</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : currentOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-gray-300 dark:text-gray-600" />
            </div>
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">No {activeTab} Orders</h3>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 max-w-xs">Stay online to receive new delivery pings.</p>
          </div>
        ) : (
          <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
            {currentOrders.map(order => {
              const customerName = order.user?.fullName || order.recipient?.name || 'Customer';
              const phone = order.user?.phoneNumber || order.recipient?.phone;
              const addr = order.shippingAddress;
              const mapsUrl = addr?.lat && addr?.lon 
                ? `https://www.google.com/maps/dir/?api=1&destination=${addr.lat},${addr.lon}`
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([addr?.doorNo, addr?.street, addr?.area, addr?.city].join(', '))}`;
              const totalItems = order.orderItems?.reduce((sum, item) => sum + item.quantity, 0) || order.orderItems?.length || 0;

              // Workflow Timeline Steps
              const steps = ['Assigned', 'Accepted', 'Picked Up', 'Out For Delivery', 'Delivered'];
              let currentStepIdx = 0;
              if (order.status === 'Delivered') currentStepIdx = 4;
              else if (order.status === 'Out For Delivery') currentStepIdx = 3;
              else if (order.pickedUpAt) currentStepIdx = 2;
              else if (order.deliveryPartnerId && order.status !== 'Pending') currentStepIdx = 1;
              
              return (
                <div key={order.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden transition-colors relative mb-4">
                  {/* Status Banner */}
                  <div className={`px-5 py-2.5 flex justify-between items-center border-b border-gray-50 dark:border-gray-700 ${activeTab === 'Completed' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Order #{order.invoiceNumber || order.id?.slice(-6).toUpperCase()}</span>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      activeTab === 'Assigned' ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400' :
                      activeTab === 'Completed' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' :
                      'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400'
                    }`}>
                      {order.status}
                    </span>
                  </div>

                  <div className="p-5 border-b border-gray-50 dark:border-gray-700 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-black text-gray-900 dark:text-white leading-tight">{customerName}</h3>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> +91 {phone || 'N/A'}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="block font-black text-xl text-gray-900 dark:text-white">₹{order.totalPrice}</span>
                        <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded font-bold ${order.paymentMethod === 'COD' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'}`}>
                          {order.paymentMethod}
                        </span>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4 flex gap-3 items-start mb-4">
                      <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center shrink-0 mt-1">
                        <MapPin className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Delivery Address</p>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-snug">
                          {addr?.doorNo ? `${addr.doorNo}, ` : ''}{addr?.street}, {addr?.area}
                        </p>
                        <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-2 flex items-center gap-1">
                          <Navigation className="w-3 h-3" /> {addr?.distanceFromStore || 'N/A'} km from store
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-sm font-semibold text-gray-600 dark:text-gray-300">
                      <span>Total Items: {totalItems}</span>
                    </div>
                  </div>

                  {/* Workflow Timeline Indicator */}
                  {activeTab !== 'Completed' && (
                    <div className="px-5 py-4 border-b border-gray-50 dark:border-gray-700 bg-white dark:bg-gray-800">
                      <div className="relative flex justify-between items-center">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-100 dark:bg-gray-700 -z-10 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500 transition-all duration-500 ease-out" 
                            style={{ width: `${(currentStepIdx / (steps.length - 1)) * 100}%` }}
                          />
                        </div>
                        {steps.map((step, idx) => (
                          <div key={step} className="flex flex-col items-center gap-1 bg-white dark:bg-gray-800 px-1">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center z-10 transition-colors ${
                              idx < currentStepIdx ? 'bg-green-500 border-green-500 text-white' :
                              idx === currentStepIdx ? 'bg-white dark:bg-gray-800 border-green-500' :
                              'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                            }`}>
                              {idx < currentStepIdx && <Check className="w-2 h-2" strokeWidth={4} />}
                              {idx === currentStepIdx && <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />}
                            </div>
                            {/* Hide text on very small screens to avoid overlap, show on active */}
                            <span className={`text-[9px] font-bold ${idx === currentStepIdx ? 'text-green-600 dark:text-green-400 opacity-100' : 'text-gray-400 dark:text-gray-500 opacity-0 sm:opacity-100'}`}>
                              {step}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="p-3 bg-gray-50 dark:bg-gray-800/50 transition-colors">
                    {/* Actions */}
                    {activeTab === 'Assigned' && (
                      <div className="flex w-full gap-3 px-2">
                        <button
                          disabled={actionLoading === order.id}
                          onClick={() => handleReject(order.id)}
                          className="flex-1 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 py-3.5 rounded-2xl font-bold text-sm active:scale-95 transition-all duration-200"
                        >
                          Reject
                        </button>
                        <button
                          disabled={actionLoading === order.id}
                          onClick={() => handleAction(order.id, 'Accept Order')}
                          className="flex-[2] bg-green-600 hover:bg-green-700 text-white py-3.5 rounded-2xl font-bold text-sm shadow-md shadow-green-600/20 active:scale-95 transition-all duration-200 flex justify-center items-center gap-2"
                        >
                          <Check className="w-4 h-4" /> Accept Order
                        </button>
                      </div>
                    )}
                    
                    {activeTab === 'Active' && !order.pickedUpAt && (
                      <div className="w-full px-2">
                         <button
                          disabled={actionLoading === order.id}
                          onClick={() => handleAction(order.id, 'Pick Up Order')}
                          className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-2xl font-bold text-sm shadow-md shadow-orange-500/20 active:scale-95 transition-all duration-200"
                        >
                          Confirm Pick Up at Store
                        </button>
                      </div>
                    )}

                    {activeTab === 'Active' && order.pickedUpAt && (
                      <div className="w-full px-2 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="col-span-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50 rounded-2xl py-3.5 flex flex-col items-center justify-center gap-1 active:scale-95 transition-all duration-200 shadow-sm">
                            <Navigation className="w-5 h-5" />
                            <span className="text-[11px] font-extrabold uppercase tracking-wide mt-1">Navigate</span>
                          </a>
                          <a href={`tel:+91${phone}`} className="col-span-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 rounded-2xl py-3.5 flex flex-col items-center justify-center gap-1 active:scale-95 transition-all duration-200 shadow-sm">
                            <Phone className="w-5 h-5" />
                            <span className="text-[11px] font-extrabold uppercase tracking-wide mt-1">Call Customer</span>
                          </a>
                        </div>
                        
                        {order.status !== 'Out For Delivery' ? (
                          <button
                            disabled={actionLoading === order.id}
                            onClick={() => handleAction(order.id, 'Out For Delivery')}
                            className="w-full bg-gray-900 hover:bg-black dark:bg-gray-100 dark:hover:bg-white dark:text-gray-900 text-white py-4 rounded-2xl font-bold text-sm shadow-md active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
                          >
                            <Truck className="w-4 h-4" /> Mark Out For Delivery
                          </button>
                        ) : (
                          <button
                            onClick={() => setOtpModalData({ isOpen: true, orderId: order.id, otp: '' })}
                            className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl font-extrabold text-sm shadow-lg shadow-green-600/30 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 uppercase tracking-wide"
                          >
                            <ShieldCheck className="w-5 h-5" /> Enter Delivery OTP
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Incoming Order Popup (Full Screen Modal) */}
      {incomingOrder && (
        <div className="fixed inset-0 z-[200] bg-gray-900/60 backdrop-blur-sm flex justify-center items-end sm:items-center p-4 animate-in fade-in transition-colors">
          <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative animate-in slide-in-from-bottom-10 transition-colors">
            <div className="w-16 h-1 rounded-full bg-gray-200 dark:bg-gray-700 mx-auto mb-6 sm:hidden transition-colors"></div>
            
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse transition-colors">
                <Package className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white">New Order!</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Accept within {timer}s</p>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4 mb-6 border border-gray-100 dark:border-gray-700 transition-colors">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Est. Earning</span>
                <span className="text-xl font-black text-green-600 dark:text-green-400">₹40</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Distance</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{incomingOrder.shippingAddress?.distanceFromStore || '3.2'} km</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleReject(incomingOrder.id || incomingOrder._id)}
                className="flex-1 py-4 rounded-2xl font-bold text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 transition-colors"
              >
                Reject
              </button>
              <button
                onClick={() => handleAction(incomingOrder.id || incomingOrder._id, 'Accept Order')}
                className="flex-[2] py-4 rounded-2xl font-bold text-sm text-white bg-green-600 active:bg-green-700 shadow-lg shadow-green-600/30 transition-colors"
              >
                Accept Order
              </button>
            </div>
            
            <div className="absolute top-0 left-0 right-0 h-1 bg-gray-100 dark:bg-gray-700 rounded-t-full overflow-hidden transition-colors">
              <div className="h-full bg-green-500 transition-all ease-linear" style={{ width: `${(timer / 30) * 100}%` }}></div>
            </div>
          </div>
        </div>
      )}

      {/* OTP Modal */}
      {otpModalData.isOpen && (
        <div className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in transition-colors">
          <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative animate-in zoom-in-95 transition-colors">
            <button onClick={() => setOtpModalData({ ...otpModalData, isOpen: false })} className="absolute top-4 right-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">Verify OTP</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">Ask the customer for the 4-digit PIN to complete the delivery.</p>
            
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="flex justify-center">
                <input
                  autoFocus
                  type="number"
                  pattern="\d*"
                  maxLength="4"
                  value={otpModalData.otp}
                  onChange={(e) => {
                    const val = e.target.value.slice(0, 4);
                    setOtpModalData({ ...otpModalData, otp: val });
                  }}
                  className="w-48 text-center text-4xl font-black tracking-[0.5em] py-3 border-b-2 border-gray-300 dark:border-gray-600 focus:border-green-600 dark:focus:border-green-500 outline-none bg-transparent text-gray-900 dark:text-white transition-colors"
                  placeholder="0000"
                />
              </div>
              <button
                type="submit"
                disabled={otpLoading || otpModalData.otp.length !== 4}
                className="w-full py-4 rounded-2xl font-bold text-sm text-white bg-green-600 disabled:bg-gray-300 disabled:shadow-none active:bg-green-700 shadow-lg shadow-green-600/30 transition-all"
              >
                {otpLoading ? 'Verifying...' : 'Complete Delivery'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryOrders;
