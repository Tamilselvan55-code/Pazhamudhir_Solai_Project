import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../../config/api';

const DeliveryDashboard = () => {
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '' });
  const [passwordStatus, setPasswordStatus] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
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
                onClick={() => updateStatus(partner?.status === 'Available' ? 'Offline' : 'Available')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                  partner?.status === 'Available'
                    ? 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100'
                    : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${partner?.status === 'Available' ? 'bg-green-500' : 'bg-gray-400'}`} />
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
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Profile</h3>
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
            <AssignedOrders token={JSON.parse(localStorage.getItem('deliveryPartnerInfo'))?.token} />
          </div>
        </div>
      </main>
    </div>
  );
};

const AssignedOrders = ({ token }) => {
  const [orders, setOrders] = useState([]);
  const [historyOrders, setHistoryOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('Assigned');
  const [actionLoading, setActionLoading] = useState(null);

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
    fetchOrders();
  }, [token]);

  useEffect(() => {
    if (activeTab === 'History') fetchHistory();
  }, [activeTab]);

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

  const getCategorizedOrders = () => {
    const assigned = orders.filter(o => !o.pickedUpAt && !o.isDelivered);
    const active = orders.filter(o => o.pickedUpAt && !o.isDelivered);
    const completed = orders.filter(o => o.isDelivered);
    return { assigned, active, completed };
  };

  const categorized = getCategorizedOrders();
  const currentOrders = activeTab === 'Assigned' ? categorized.assigned : activeTab === 'Active Delivery' ? categorized.active : categorized.completed;

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading assignments...</div>;
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex border-b border-gray-100">
        <button
          className={`flex-1 py-4 text-sm font-medium text-center ${activeTab === 'Assigned' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('Assigned')}
        >
          Assigned ({categorized.assigned.length})
        </button>
        <button
          className={`flex-1 py-4 text-sm font-medium text-center ${activeTab === 'Active Delivery' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('Active Delivery')}
        >
          Active Delivery ({categorized.active.length})
        </button>
        <button
          className={`flex-1 py-4 text-sm font-medium text-center ${activeTab === 'Completed Today' ? 'border-b-2 border-green-500 text-green-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('Completed Today')}
        >
          Completed Today ({categorized.completed.length})
        </button>
        <button
          className={`flex-1 py-4 text-sm font-medium text-center ${activeTab === 'History' ? 'border-b-2 border-gray-500 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('History')}
        >
          History
        </button>
      </div>

      <div className="p-6">
        {activeTab === 'History' ? (
          historyLoading ? (
            <div className="text-center py-10 text-gray-500">Loading history...</div>
          ) : historyOrders.length === 0 ? (
            <div className="text-center py-10 text-gray-500">No delivery history yet.</div>
          ) : (
            <div className="space-y-3">
              {historyOrders.map(order => (
                <div key={order.id} className="border border-gray-100 rounded-xl p-3 bg-gray-50/50 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-bold text-gray-800">{order.invoiceNumber || `#${order.id.slice(-6).toUpperCase()}`}</p>
                    <p className="text-xs text-gray-500">{order.user?.fullName || 'Customer'} &middot; ₹{order.totalPrice}</p>
                    <p className="text-xs text-gray-400">{new Date(order.deliveredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-md text-xs font-semibold">Delivered</span>
                </div>
              ))}
            </div>
          )
        ) : currentOrders.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            No {activeTab.toLowerCase()} orders found.
          </div>
        ) : (
          <div className="space-y-4">
            {currentOrders.map(order => (
              <div key={order.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 flex flex-col sm:flex-row gap-4 justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">Order {order.invoiceNumber || `#${order.id.slice(-6).toUpperCase()}`}</span>
                    <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded-md text-xs font-semibold">{order.status}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{order.user?.fullName || order.recipient?.name || 'Customer'}</p>
                    <p className="text-sm text-gray-600">M: {order.user?.phoneNumber || order.recipient?.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 line-clamp-2 max-w-sm">
                      {order.shippingAddress?.street}, {order.shippingAddress?.city}, {order.shippingAddress?.state} - {order.shippingAddress?.postalCode}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Amount: ₹{order.totalPrice}</p>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                  {/* B4: Item count and notes */}
                  <div className="text-xs text-gray-500">
                    {order.orderItems?.length ? `${order.orderItems.length} item${order.orderItems.length > 1 ? 's' : ''}` : ''}
                    {order.notes ? ` · 📝 ${order.notes}` : ''}
                  </div>
                  {/* Sequence: Accept Order → Picked Up → Out For Delivery → Delivered */}
                  {!order.deliveryAcceptedAt && !order.pickedUpAt && !order.isDelivered && (
                    <button
                      disabled={actionLoading === order.id}
                      onClick={() => handleAction(order.id, 'Accept Order')}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors w-full disabled:opacity-50"
                    >
                      {actionLoading === order.id ? 'Processing...' : 'Accept Order'}
                    </button>
                  )}
                  {!order.deliveryAcceptedAt && !order.isDelivered && (
                    <button
                      disabled={actionLoading === order.id}
                      onClick={() => handleReject(order.id)}
                      className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-sm font-medium transition-colors w-full disabled:opacity-50"
                    >
                      Reject Assignment
                    </button>
                  )}
                  {order.deliveryAcceptedAt && !order.pickedUpAt && !order.isDelivered && (
                    <button
                      disabled={actionLoading === order.id}
                      onClick={() => handleAction(order.id, 'Picked Up')}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors w-full disabled:opacity-50"
                    >
                      {actionLoading === order.id ? 'Processing...' : 'Picked Up'}
                    </button>
                  )}
                  {order.pickedUpAt && !order.outForDeliveryAt && !order.isDelivered && (
                    <button
                      disabled={actionLoading === order.id}
                      onClick={() => handleAction(order.id, 'Out For Delivery')}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors w-full disabled:opacity-50"
                    >
                      {actionLoading === order.id ? 'Processing...' : 'Out For Delivery'}
                    </button>
                  )}
                  {order.outForDeliveryAt && !order.isDelivered && (
                    <button
                      disabled={actionLoading === order.id}
                      onClick={() => handleAction(order.id, 'Delivered')}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors w-full disabled:opacity-50"
                    >
                      {actionLoading === order.id ? 'Processing...' : 'Delivered'}
                    </button>
                  )}
                  {order.isDelivered && (
                    <div className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium text-center w-full">
                      Completed
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryDashboard;
