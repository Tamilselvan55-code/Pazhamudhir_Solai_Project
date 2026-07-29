import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { API_BASE, API_URL } from '../../config/api';
import { io } from 'socket.io-client';
import useModal from '../../hooks/useModal';
import { 
  Package, MapPin, Navigation, Phone, Search, 
  MessageCircle, Clock, AlertCircle, X, Check, ShieldCheck 
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
      socket.emit('join', { role: 'delivery' });
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
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
      {/* Header Tabs */}
      <div className="bg-white sticky top-0 z-30 shadow-sm">
        <div className="flex border-b border-gray-100 px-2 overflow-x-auto hide-scrollbar">
          {['Assigned', 'Active', 'Completed', 'History'].map(tab => {
            const counts = { Assigned: categorized.assigned.length, Active: categorized.active.length, Completed: categorized.completed.length };
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 min-w-[100px] py-4 px-3 text-sm font-bold text-center whitespace-nowrap transition-colors relative ${
                  activeTab === tab ? 'text-green-600' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {tab} {tab !== 'History' && `(${counts[tab]})`}
                {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-green-600 rounded-t-full" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 p-4 pb-24 overflow-y-auto">
        {loading || (activeTab === 'History' && historyLoading) ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-3 border-green-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : activeTab === 'History' ? (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 hide-scrollbar">
              {['Today', 'This Week', 'This Month', 'All Time'].map(f => (
                <button
                  key={f}
                  onClick={() => setHistoryFilter(f)}
                  className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                    historyFilter === f ? 'bg-green-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            {filteredHistory.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="font-semibold">No delivery history</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredHistory.map(order => (
                  <div key={order.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xs">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold text-gray-900">{order.invoiceNumber || `#${order.id.slice(-6).toUpperCase()}`}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">{order.user?.fullName}</p>
                      </div>
                      <span className="text-green-600 font-extrabold text-sm">₹40</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-400 border-t border-gray-50 pt-2 mt-2">
                      <span>{new Date(order.deliveredAt || order.updatedAt).toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-[10px] font-bold">Delivered</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : currentOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mb-4">
              <Package className="w-10 h-10 text-green-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">No Orders Here</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-xs">You don't have any {activeTab.toLowerCase()} orders right now. Stay online to receive pings.</p>
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

              return (
                <div key={order.id} className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-gray-50">
                    <div className="flex justify-between items-center mb-4">
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-extrabold uppercase tracking-wide">
                        {order.status}
                      </span>
                      <span className="font-black text-gray-900">₹{order.totalPrice} <span className={`text-[10px] px-1.5 py-0.5 rounded ${order.paymentMethod === 'COD' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>{order.paymentMethod}</span></span>
                    </div>
                    
                    <h3 className="text-lg font-black text-gray-900 mb-1">{customerName}</h3>
                    <p className="text-sm text-gray-600 flex items-start gap-2 leading-relaxed">
                      <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-1" />
                      <span>{addr?.doorNo ? `${addr.doorNo}, ` : ''}{addr?.street}, {addr?.area}</span>
                    </p>
                  </div>
                  
                  <div className="p-2 bg-gray-50 flex gap-2">
                    {/* Actions */}
                    {activeTab === 'Assigned' && (
                      <div className="flex w-full gap-2 px-2 pb-2 pt-1">
                        <button
                          disabled={actionLoading === order.id}
                          onClick={() => handleAction(order.id, 'Accept Order')}
                          className="flex-1 bg-green-600 active:bg-green-700 text-white py-3.5 rounded-xl font-bold text-sm shadow-sm transition-transform active:scale-95 flex justify-center items-center gap-2"
                        >
                          <Check className="w-4 h-4" /> Accept
                        </button>
                        <button
                          disabled={actionLoading === order.id}
                          onClick={() => handleReject(order.id)}
                          className="px-5 bg-white border border-gray-200 text-gray-600 py-3.5 rounded-xl font-bold text-sm active:bg-gray-100"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    
                    {activeTab === 'Active' && !order.pickedUpAt && (
                      <div className="w-full px-2 pb-2 pt-1">
                         <button
                          disabled={actionLoading === order.id}
                          onClick={() => handleAction(order.id, 'Pick Up Order')}
                          className="w-full bg-orange-500 active:bg-orange-600 text-white py-4 rounded-2xl font-bold text-sm shadow-md shadow-orange-500/20 transition-transform active:scale-95"
                        >
                          Confirm Pick Up at Store
                        </button>
                      </div>
                    )}

                    {activeTab === 'Active' && order.pickedUpAt && (
                      <div className="w-full px-2 pb-2 pt-1 space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="col-span-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl py-3 flex flex-col items-center justify-center gap-1 active:bg-blue-100 transition-colors">
                            <Navigation className="w-5 h-5" />
                            <span className="text-[10px] font-bold">Navigate</span>
                          </a>
                          <a href={`tel:+91${phone}`} className="col-span-1 bg-green-50 text-green-700 border border-green-200 rounded-xl py-3 flex flex-col items-center justify-center gap-1 active:bg-green-100 transition-colors">
                            <Phone className="w-5 h-5" />
                            <span className="text-[10px] font-bold">Call</span>
                          </a>
                          <a href={`sms:+91${phone}`} className="col-span-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl py-3 flex flex-col items-center justify-center gap-1 active:bg-purple-100 transition-colors">
                            <MessageCircle className="w-5 h-5" />
                            <span className="text-[10px] font-bold">Chat</span>
                          </a>
                        </div>
                        {order.status !== 'Out For Delivery' ? (
                          <button
                            disabled={actionLoading === order.id}
                            onClick={() => handleAction(order.id, 'Out For Delivery')}
                            className="w-full bg-gray-900 active:bg-black text-white py-4 rounded-2xl font-bold text-sm shadow-md transition-transform active:scale-95"
                          >
                            Mark Out For Delivery
                          </button>
                        ) : (
                          <button
                            onClick={() => setOtpModalData({ isOpen: true, orderId: order.id, otp: '' })}
                            className="w-full bg-green-600 active:bg-green-700 text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-green-600/30 transition-transform active:scale-95 flex items-center justify-center gap-2"
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
        <div className="fixed inset-0 z-[200] bg-gray-900/60 backdrop-blur-sm flex justify-center items-end sm:items-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative animate-in slide-in-from-bottom-10">
            <div className="w-16 h-1 rounded-full bg-gray-200 mx-auto mb-6 sm:hidden"></div>
            
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Package className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-black text-gray-900">New Order!</h2>
              <p className="text-sm text-gray-500 mt-1">Accept within {timer}s</p>
            </div>
            
            <div className="bg-gray-50 rounded-2xl p-4 mb-6 border border-gray-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Est. Earning</span>
                <span className="text-xl font-black text-green-600">₹40</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Distance</span>
                <span className="text-sm font-bold text-gray-900">{incomingOrder.shippingAddress?.distanceFromStore || '3.2'} km</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleReject(incomingOrder.id || incomingOrder._id)}
                className="flex-1 py-4 rounded-2xl font-bold text-sm text-gray-600 bg-gray-100 active:bg-gray-200"
              >
                Reject
              </button>
              <button
                onClick={() => handleAction(incomingOrder.id || incomingOrder._id, 'Accept Order')}
                className="flex-[2] py-4 rounded-2xl font-bold text-sm text-white bg-green-600 active:bg-green-700 shadow-lg shadow-green-600/30"
              >
                Accept Order
              </button>
            </div>
            
            <div className="absolute top-0 left-0 right-0 h-1 bg-gray-100 rounded-t-full overflow-hidden">
              <div className="h-full bg-green-500 transition-all ease-linear" style={{ width: `${(timer / 30) * 100}%` }}></div>
            </div>
          </div>
        </div>
      )}

      {/* OTP Modal */}
      {otpModalData.isOpen && (
        <div className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative animate-in zoom-in-95">
            <button onClick={() => setOtpModalData({ ...otpModalData, isOpen: false })} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-xl font-black text-gray-900 mb-2">Verify OTP</h3>
            <p className="text-xs text-gray-500 mb-6">Ask the customer for the 4-digit PIN to complete the delivery.</p>
            
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
                  className="w-48 text-center text-4xl font-black tracking-[0.5em] py-3 border-b-2 border-gray-300 focus:border-green-600 outline-none bg-transparent transition-colors"
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
