import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE, API_URL } from '../../config/api';
import { io } from 'socket.io-client';
import { Navigation, Phone, MapPin, Package, CheckCircle, Search, AlertCircle, Volume2, Shield, Calendar, ExternalLink, Loader2, KeyRound, Map } from 'lucide-react';
import DocumentVerification from '../../components/Delivery/DocumentVerification';

const DeliveryDashboard = () => {
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '' });
  const [passwordStatus, setPasswordStatus] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [optimizeRoute, setOptimizeRoute] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      const stored = localStorage.getItem('deliveryPartnerInfo');
      if (!stored) {
        navigate('/delivery/login');
        return;
      }

      const parsedInfo = JSON.parse(stored);
      try {
        const { data } = await axios.get(`${API_BASE}/delivery/profile`, {
          headers: {
            Authorization: `Bearer ${parsedInfo.token}`
          }
        });
        setPartner(data);
      } catch (error) {
        console.error('Failed to fetch profile', error);
        localStorage.removeItem('deliveryPartnerInfo');
        navigate('/delivery/login');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('deliveryPartnerInfo');
    navigate('/delivery/login');
  };

  const updateStatus = async (newStatus) => {
    const stored = localStorage.getItem('deliveryPartnerInfo');
    if (!stored) return;
    const parsedInfo = JSON.parse(stored);

    try {
      const { data } = await axios.put(`${API_BASE}/delivery/profile`, { status: newStatus }, {
        headers: {
          Authorization: `Bearer ${parsedInfo.token}`
        }
      });
      setPartner(data);
    } catch (error) {
      console.error('Failed to update status', error);
      alert('Failed to update status');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordStatus('');
    setPasswordLoading(true);
    const stored = localStorage.getItem('deliveryPartnerInfo');
    if (!stored) return;
    const parsedInfo = JSON.parse(stored);

    try {
      await axios.put(`${API_BASE}/delivery/profile/password`, passwordData, {
        headers: { Authorization: `Bearer ${parsedInfo.token}` }
      });
      setPasswordStatus('Password changed successfully');
      setPasswordData({ currentPassword: '', newPassword: '' });
    } catch (error) {
      setPasswordStatus(error.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex-shrink-0 flex items-center">
              <span className="font-bold text-xl text-orange-600">Delivery Partner Hub</span>
            </div>
            <div className="flex items-center space-x-4">
              {/* Available / Offline Toggle */}
              <button
                disabled={!partner?.isVerified}
                title={!partner?.isVerified ? 'You must be verified to go available' : ''}
                onClick={() => {
                  if (!partner?.isVerified) return;
                  updateStatus(partner?.status === 'Available' ? 'Offline' : 'Available');
                }}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                  !partner?.isVerified 
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : partner?.status === 'Available'
                    ? 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100'
                    : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${partner?.status === 'Available' && partner?.isVerified ? 'bg-green-500' : 'bg-gray-400'}`} />
                {partner?.status === 'Available' ? 'Go Offline' : 'Go Available'}
              </button>
              <button
                onClick={handleLogout}
                className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome, {partner?.name}</h1>
          <p className="mt-2 text-sm text-gray-500">Manage your delivery profile and status here.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Profile & Password Column */}
          <div className="space-y-8 col-span-1">
            {/* Profile Card */}
            <div className="bg-white overflow-hidden shadow-sm rounded-2xl border border-gray-100">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Profile</h3>
                    <button onClick={() => navigate('/delivery/profile')} className="text-xs font-semibold text-orange-600 hover:text-orange-700 bg-orange-50 px-2 py-1 rounded-md">Edit Profile</button>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${partner?.status === 'Available' ? 'bg-green-100 text-green-800' : partner?.status === 'On Delivery' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                    {partner?.status}
                  </span>
                </div>
                <div className="space-y-4">
                  <div>
                    <dt className="text-xs font-medium text-gray-500">Employee ID</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-semibold">{partner?.employeeId}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500">Full name</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-semibold">{partner?.name}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500">Mobile Number</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-semibold">{partner?.mobile}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500">Vehicle</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-semibold">{partner?.vehicleNumber || 'Not provided'}</dd>
                  </div>
                </div>
                
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <button
                    onClick={() => navigate('/delivery/earnings')}
                    className="w-full py-2.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    View Earnings Dashboard
                  </button>
                </div>
              </div>
            </div>

            {/* Change Password Card */}
            <div className="bg-white overflow-hidden shadow-sm rounded-2xl border border-gray-100">
              <div className="p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Change Password</h3>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Current Password</label>
                    <input
                      type="password"
                      required
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">New Password</label>
                    <input
                      type="password"
                      required
                      minLength="6"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm"
                    />
                  </div>
                  {passwordStatus && (
                    <div className={`text-xs ${passwordStatus.includes('successfully') ? 'text-green-600' : 'text-red-600'}`}>
                      {passwordStatus}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="w-full py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium disabled:opacity-70"
                  >
                    {passwordLoading ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Assigned Orders Column */}
          <div className="col-span-1 md:col-span-2 space-y-6">
            <DocumentVerification token={JSON.parse(localStorage.getItem('deliveryPartnerInfo'))?.token} isVerified={partner?.isVerified} />
            <AnalyticsOverview token={JSON.parse(localStorage.getItem('deliveryPartnerInfo'))?.token} />
            <AssignedOrders token={JSON.parse(localStorage.getItem('deliveryPartnerInfo'))?.token} partner={partner} />
          </div>
        </div>
      </main>
    </div>
  );
};

const AnalyticsOverview = ({ token }) => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/delivery/analytics`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMetrics(data);
      } catch (err) {
        console.error('Failed to fetch analytics', err);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchAnalytics();
  }, [token]);

  if (loading) return <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center min-h-[120px]"><div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Today</span>
        <span className="text-2xl font-black text-gray-900 mt-1">{metrics?.deliveriesToday || 0}</span>
      </div>
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Weekly</span>
        <span className="text-2xl font-black text-gray-900 mt-1">{metrics?.weeklyDeliveries || 0}</span>
      </div>
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Monthly</span>
        <span className="text-2xl font-black text-gray-900 mt-1">{metrics?.monthlyDeliveries || 0}</span>
      </div>
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Earnings</span>
        <span className="text-2xl font-black text-green-600 mt-1">₹{metrics?.totalEarnings || 0}</span>
      </div>
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center col-span-2 md:col-span-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Rating</span>
        <span className="text-2xl font-black text-yellow-500 mt-1">⭐ {metrics?.rating || '4.8'}</span>
      </div>
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center col-span-2 md:col-span-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Acceptance Rate</span>
        <span className="text-2xl font-black text-blue-600 mt-1">{metrics?.acceptanceRate || '95'}%</span>
      </div>
    </div>
  );
};

const AssignedOrders = ({ token, partner }) => {
  const [orders, setOrders] = useState([]);
  const [historyOrders, setHistoryOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('Assigned');
  const [actionLoading, setActionLoading] = useState(null);
  const [notificationBanner, setNotificationBanner] = useState(null);

  // Phase 14: OTP Modal State
  const [otpModalData, setOtpModalData] = useState({ isOpen: false, orderId: null, otp: '' });
  const [otpLoading, setOtpLoading] = useState(false);

  // History search & filter
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState('All');

  const fetchOrders = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/delivery/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(data);
    } catch (err) {
      console.error('Failed to fetch assigned orders', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}/delivery/orders?history=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistoryOrders(data);
    } catch (err) {
      console.error('Failed to fetch history', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'Assigned') fetchOrders();
    else fetchHistory();
  }, [activeTab, token]); // eslint-disable-line

  // Sound Chime Player (Web Audio API - No external assets required)
  const playAssignmentChime = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.log('Audio chime not available');
    }
  };

  // Socket setup for assignment events & live tracking
  useEffect(() => {
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
          playAssignmentChime();
          setNotificationBanner(data.message || 'New order assigned to you!');
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(data.title || 'New Order Assigned', { body: data.message });
          }
        }
      }
    });

    return () => socket.disconnect();
  }, [token]);

  // Geolocation streaming during active delivery (Phase 10 & 11)
  useEffect(() => {
    if (!token || !partner || partner.status !== 'On Delivery') return;
    if (!('geolocation' in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lon, heading, speed } = pos.coords;
        const activeOrder = orders.find(o => o.pickedUpAt && !o.isDelivered);
        
        axios.post(`${API_BASE}/delivery/location`, { 
          lat, 
          lon, 
          heading, 
          speed, 
          orderId: activeOrder?.id || activeOrder?._id 
        }, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => {});
      },
      (err) => console.log('Geolocation stream warning:', err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [token, partner?.status, orders]);

  const handleAction = async (orderId, action) => {
    setActionLoading(orderId);
    try {
      await axios.patch(`${API_BASE}/delivery/orders/${orderId}/status`, { action }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.message || `Failed to mark ${action}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (orderId) => {
    if (!window.confirm('Are you sure you want to reject this assignment? The order will return to unassigned.')) return;
    setActionLoading(orderId);
    try {
      await axios.post(`${API_BASE}/delivery/orders/${orderId}/reject`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject assignment');
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpModalData.otp || otpModalData.otp.length !== 4) {
      alert('Please enter a 4-digit OTP.');
      return;
    }
    setOtpLoading(true);
    try {
      await axios.post(`${API_BASE}/delivery/orders/${otpModalData.orderId}/verify-otp`, { otp: otpModalData.otp }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOtpModalData({ isOpen: false, orderId: null, otp: '' });
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to verify OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  const getGoogleMapsUrl = (order) => {
    const addr = order.shippingAddress;
    if (addr?.lat && addr?.lon) {
      return `https://www.google.com/maps/dir/?api=1&destination=${addr.lat},${addr.lon}`;
    }
    const formatted = [addr?.doorNo, addr?.street, addr?.area, addr?.city, addr?.pincode || addr?.postalCode].filter(Boolean).join(', ');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formatted || 'Sriperumbudur')}`;
  };

  const getCategorizedOrders = () => {
    const assigned = orders.filter(o => !o.pickedUpAt && !o.isDelivered);
    let active = orders.filter(o => o.pickedUpAt && !o.isDelivered);
    const completed = orders.filter(o => o.isDelivered && new Date(o.updatedAt).toDateString() === new Date().toDateString());
    const history = orders.filter(o => o.isDelivered);

    // Phase 19: Smart Route Optimization
    if (optimizeRoute && active.length > 1) {
      // Simple Nearest Neighbor TSP Heuristic based on distanceFromStore or coordinates
      // Since calculating exact haversine between pairs on client is complex without a library,
      // we'll approximate using distanceFromStore as a proxy if coords aren't perfect,
      // but if we have lat/lon we can do basic Euclidean distance for local optimization.
      
      const calcDist = (a, b) => {
        if (a.lat && a.lon && b.lat && b.lon) {
          const dx = parseFloat(a.lat) - parseFloat(b.lat);
          const dy = parseFloat(a.lon) - parseFloat(b.lon);
          return Math.sqrt(dx * dx + dy * dy);
        }
        return Math.abs((a.distanceFromStore || 0) - (b.distanceFromStore || 0));
      };

      const unvisited = [...active];
      const optimized = [];
      
      // Start with the closest to store
      unvisited.sort((a, b) => (a.shippingAddress?.distanceFromStore || 0) - (b.shippingAddress?.distanceFromStore || 0));
      let current = unvisited.shift();
      optimized.push(current);

      while (unvisited.length > 0) {
        let nearestIdx = 0;
        let minDist = Infinity;
        
        for (let i = 0; i < unvisited.length; i++) {
          const dist = calcDist(current.shippingAddress || {}, unvisited[i].shippingAddress || {});
          if (dist < minDist) {
            minDist = dist;
            nearestIdx = i;
          }
        }
        
        current = unvisited.splice(nearestIdx, 1)[0];
        optimized.push(current);
      }
      active = optimized;
    }

    return { assigned, active, completed, history };
  };

  const categorized = getCategorizedOrders();
  const currentOrders = activeTab === 'Assigned' ? categorized.assigned : activeTab === 'Active Delivery' ? categorized.active : categorized.completed;

  // Filter history orders
  const filteredHistory = historyOrders.filter(order => {
    const matchSearch = historySearch === '' ||
      (order.invoiceNumber && order.invoiceNumber.toLowerCase().includes(historySearch.toLowerCase())) ||
      (order.user?.fullName && order.user.fullName.toLowerCase().includes(historySearch.toLowerCase())) ||
      (order.id && order.id.toLowerCase().includes(historySearch.toLowerCase()));

    if (!matchSearch) return false;

    if (historyFilter === 'Today') {
      const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
      return new Date(order.deliveredAt) >= startOfToday;
    } else if (historyFilter === 'This Week') {
      const startOfWeek = new Date(); startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); startOfWeek.setHours(0, 0, 0, 0);
      return new Date(order.deliveredAt) >= startOfWeek;
    }
    return true;
  });

  const totalHistoryEarnings = filteredHistory.length * 40;

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500 flex flex-col items-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-2" />
        Loading assignments...
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {notificationBanner && (
        <div className="bg-orange-600 text-white px-4 py-3 text-sm font-semibold flex items-center justify-between animate-bounce">
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 shrink-0" />
            <span>{notificationBanner}</span>
          </div>
          <button onClick={() => setNotificationBanner(null)} className="text-white hover:opacity-80 font-bold ml-4">✕</button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-100 overflow-x-auto">
        <button
          className={`flex-1 min-w-[100px] py-4 text-xs sm:text-sm font-semibold text-center whitespace-nowrap px-2 transition-colors ${activeTab === 'Assigned' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('Assigned')}
        >
          Assigned ({categorized.assigned.length})
        </button>
        <button
          className={`flex-1 min-w-[100px] py-4 text-xs sm:text-sm font-semibold text-center whitespace-nowrap px-2 transition-colors ${activeTab === 'Active Delivery' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('Active Delivery')}
        >
          Active Delivery ({categorized.active.length})
        </button>
        <button
          className={`flex-1 min-w-[100px] py-4 text-xs sm:text-sm font-semibold text-center whitespace-nowrap px-2 transition-colors ${activeTab === 'Completed Today' ? 'border-b-2 border-green-500 text-green-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('Completed Today')}
        >
          Completed ({categorized.completed.length})
        </button>
        <button
          className={`flex-1 min-w-[100px] py-4 text-xs sm:text-sm font-semibold text-center whitespace-nowrap px-2 transition-colors ${activeTab === 'History' ? 'border-b-2 border-gray-700 text-gray-900 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('History')}
        >
          History
        </button>
      </div>

      <div className="p-4 sm:p-6">
        {activeTab === 'History' ? (
          <div className="space-y-4">
            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search invoice or customer..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {['All', 'Today', 'This Week'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setHistoryFilter(f)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${historyFilter === f ? 'bg-orange-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary Tag */}
            <div className="flex items-center justify-between text-xs font-bold text-gray-600 px-1">
              <span>{filteredHistory.length} Delivered Orders</span>
              <span className="text-green-600 font-extrabold">Est. Earnings: ₹{totalHistoryEarnings}</span>
            </div>

            {historyLoading ? (
              <div className="text-center py-10 text-gray-500 flex flex-col items-center">
                <Loader2 className="w-6 h-6 text-orange-500 animate-spin mb-2" />
                Loading delivery history...
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center justify-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mb-3">
                  <Package className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">No Deliveries Found</h3>
                <p className="text-xs text-gray-500 max-w-[200px]">We couldn't find any delivery history matching your criteria.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredHistory.map(order => (
                  <div key={order.id} className="border border-gray-100 rounded-xl p-3 bg-gray-50/50 flex justify-between items-center hover:bg-white transition-all shadow-2xs">
                    <div>
                      <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        {order.invoiceNumber || `#${order.id.slice(-6).toUpperCase()}`}
                        {order.customerRating && <span className="text-xs text-amber-500">⭐ {order.customerRating}.0</span>}
                      </p>
                      <p className="text-xs text-gray-600 font-medium">{order.user?.fullName || 'Customer'} &middot; ₹{order.totalPrice} ({order.paymentMethod || 'COD'})</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Delivered on {new Date(order.deliveredAt || order.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold shrink-0">₹40 Earned</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : currentOrders.length === 0 ? (
          <div className="text-center py-12 text-gray-500 font-medium">
            No {activeTab.toLowerCase()} orders right now.
          </div>
        ) : (
          <div className="space-y-4">
            {activeTab === 'Active Delivery' && currentOrders.length > 1 && (
              <div className="flex justify-between items-center bg-blue-50 border border-blue-100 p-3 rounded-xl">
                <div className="flex items-center gap-2 text-blue-800">
                  <Map className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-bold">Smart Route Optimization</p>
                    <p className="text-xs opacity-80">Reorder deliveries for the fastest route</p>
                  </div>
                </div>
                <button
                  onClick={() => setOptimizeRoute(!optimizeRoute)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${optimizeRoute ? 'bg-blue-600' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${optimizeRoute ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            )}
            {currentOrders.map((order, index) => {
              const mapsUrl = getGoogleMapsUrl(order);
              const customerPhone = order.user?.phoneNumber || order.recipient?.phone || '';
              const customerName = order.user?.fullName || order.recipient?.name || 'Customer';

              return (
                <div key={order.id} className="relative border border-gray-200 rounded-2xl p-4 sm:p-5 bg-white shadow-xs flex flex-col md:flex-row gap-4 justify-between items-start hover:border-orange-200 transition-all">
                  {optimizeRoute && activeTab === 'Active Delivery' && (
                    <div className="absolute -left-2 -top-2 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-black shadow-sm ring-2 ring-white">
                      {index + 1}
                    </div>
                  )}
                  <div className="space-y-3 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-base text-gray-900">{order.invoiceNumber || `#${order.id.slice(-6).toUpperCase()}`}</span>
                      <span className="px-2.5 py-0.5 bg-orange-100 text-orange-800 rounded-full text-xs font-bold">{order.status}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${order.paymentMethod === 'COD' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                        {order.paymentMethod === 'COD' ? '💵 COD' : '💳 Prepaid'}
                      </span>
                    </div>

                    <div>
                      <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                        {customerName}
                      </p>
                      {customerPhone && (
                        <p className="text-xs text-gray-500 font-medium mt-0.5">
                          📞 +91 {customerPhone}
                        </p>
                      )}
                    </div>

                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-xs text-gray-700 space-y-1">
                      <p className="font-semibold text-gray-800 flex items-start gap-1">
                        <MapPin className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                        <span>
                          {order.shippingAddress?.doorNo ? `${order.shippingAddress.doorNo}, ` : ''}
                          {order.shippingAddress?.street}, {order.shippingAddress?.city}, {order.shippingAddress?.state} - {order.shippingAddress?.pincode || order.shippingAddress?.postalCode}
                        </span>
                      </p>
                      {order.shippingAddress?.distanceFromStore != null && (
                        <p className="text-[11px] font-bold text-orange-600 pl-5">
                          📍 {order.shippingAddress.distanceFromStore} km from store
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                      <span className="font-medium text-gray-500">
                        Items: {order.orderItems?.length || 0} unit(s) {order.notes ? ` · 📝 ${order.notes}` : ''}
                      </span>
                      <span className="font-black text-sm text-gray-900">Total: ₹{order.totalPrice}</span>
                    </div>
                  </div>
                  
                  {/* Action Column */}
                  <div className="flex flex-col gap-2 w-full md:w-48 shrink-0 pt-3 md:pt-0 border-t md:border-0 border-gray-100">
                    {/* Navigation & Call Buttons (Phase 6) */}
                    <div className="grid grid-cols-2 gap-2 mb-1">
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors border border-blue-200"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        Navigate
                      </a>
                      {customerPhone ? (
                        <a
                          href={`tel:+91${customerPhone}`}
                          className="flex items-center justify-center gap-1.5 py-2 px-3 bg-green-50 text-green-700 hover:bg-green-100 rounded-xl text-xs font-bold transition-colors border border-green-200"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          Call
                        </a>
                      ) : (
                        <button disabled className="py-2 px-3 bg-gray-100 text-gray-400 rounded-xl text-xs font-semibold cursor-not-allowed">
                          No Call
                        </button>
                      )}
                    </div>

                    {/* Sequence: Accept Order → Picked Up → Out For Delivery → Delivered */}
                    {!order.deliveryAcceptedAt && !order.pickedUpAt && !order.isDelivered && (
                      <>
                        <button
                          disabled={actionLoading === order.id}
                          onClick={() => handleAction(order.id, 'Accept Order')}
                          className="py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors w-full disabled:opacity-50 flex items-center justify-center gap-1 shadow-xs"
                        >
                          {actionLoading === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Accept Order'}
                        </button>
                        <button
                          disabled={actionLoading === order.id}
                          onClick={() => handleReject(order.id)}
                          className="py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-bold transition-colors w-full disabled:opacity-50"
                        >
                          Reject Assignment
                        </button>
                      </>
                    )}
                    {order.deliveryAcceptedAt && !order.pickedUpAt && !order.isDelivered && (
                      <button
                        disabled={actionLoading === order.id}
                        onClick={() => handleAction(order.id, 'Picked Up')}
                        className="py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors w-full disabled:opacity-50 flex items-center justify-center gap-1 shadow-xs"
                      >
                        {actionLoading === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Mark Picked Up'}
                      </button>
                    )}
                    {order.pickedUpAt && !order.outForDeliveryAt && !order.isDelivered && (
                      <button
                        disabled={actionLoading === order.id}
                        onClick={() => handleAction(order.id, 'Out For Delivery')}
                        className="py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors w-full disabled:opacity-50 flex items-center justify-center gap-1 shadow-xs"
                      >
                        {actionLoading === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Out For Delivery'}
                      </button>
                    )}
                    {order.outForDeliveryAt && !order.isDelivered && (
                      <button
                        disabled={actionLoading === order.id}
                        onClick={() => setOtpModalData({ isOpen: true, orderId: order.id, otp: '' })}
                        className="py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-colors w-full disabled:opacity-50 flex items-center justify-center gap-1 shadow-xs"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        Complete Delivery
                      </button>
                    )}
                    {order.isDelivered && (
                      <div className="py-2.5 bg-green-100 text-green-800 rounded-xl text-xs font-bold text-center w-full flex items-center justify-center gap-1">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        Completed
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Phase 14: OTP Verification Modal */}
      {otpModalData.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative animate-fadeIn">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Verify Delivery OTP</h3>
              <p className="text-xs text-gray-500 mt-1">Ask the customer for the 4-digit OTP shown in their tracking screen to complete the delivery.</p>
            </div>
            
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <input
                  type="text"
                  maxLength={4}
                  autoFocus
                  required
                  value={otpModalData.otp}
                  onChange={(e) => setOtpModalData({ ...otpModalData, otp: e.target.value.replace(/\D/g, '') })}
                  className="w-full text-center text-3xl tracking-[1em] font-black px-4 py-3 border-2 border-green-200 rounded-xl focus:border-green-500 outline-none text-gray-900"
                  placeholder="••••"
                />
              </div>
              <div className="flex items-center gap-3 mt-6">
                <button
                  type="button"
                  disabled={otpLoading}
                  onClick={() => setOtpModalData({ isOpen: false, orderId: null, otp: '' })}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={otpLoading || otpModalData.otp.length !== 4}
                  className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {otpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify OTP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryDashboard;
