import React from 'react';
import { Package, ShoppingBag, Clock, CheckCircle, MapPin, Heart, HeadphonesIcon, LogOut, ArrowRight, Eye, XCircle } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';

const DashboardOverviewTab = ({ userInfo, orders, onLogout, onViewAllOrders, onViewDetails, onViewTab }) => {
  // Stats calculations
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => ['Pending', 'Accepted', 'Confirmed', 'Packed', 'Packing', 'Out for Delivery'].includes(o.status)).length;
  const completedOrders = orders.filter(o => o.status === 'Delivered').length;
  const cancelledOrders = orders.filter(o => o.status === 'Cancelled').length;

  const recentOrders = orders.slice(0, 3);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      {/* 1. Statistics Cards (2x2 Grid) */}
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 px-1">Order Statistics</h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* Pending Orders */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-2xl bg-yellow-50 text-yellow-600 flex items-center justify-center mb-3">
              <Clock className="w-5 h-5" />
            </div>
            <p className="text-[11px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">Pending Orders</p>
            <p className="text-xl sm:text-2xl font-extrabold text-gray-900 mt-1">{pendingOrders}</p>
          </div>

          {/* Completed Orders */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <CheckCircle className="w-5 h-5" />
            </div>
            <p className="text-[11px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">Completed Orders</p>
            <p className="text-xl sm:text-2xl font-extrabold text-gray-900 mt-1">{completedOrders}</p>
          </div>

          {/* Cancelled Orders */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-3">
              <XCircle className="w-5 h-5" />
            </div>
            <p className="text-[11px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">Cancelled Orders</p>
            <p className="text-xl sm:text-2xl font-extrabold text-gray-900 mt-1">{cancelledOrders}</p>
          </div>

          {/* Total Orders */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <Package className="w-5 h-5" />
            </div>
            <p className="text-[11px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">Total Orders</p>
            <p className="text-xl sm:text-2xl font-extrabold text-gray-900 mt-1">{totalOrders}</p>
          </div>
        </div>
      </div>

      {/* 2. Recent Order History */}
      <div>
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900">Recent Orders</h3>
          <button
            onClick={onViewAllOrders}
            className="text-xs font-bold text-green-600 hover:text-green-700 flex items-center gap-1 transition-colors"
          >
            <span>View All</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {recentOrders.length === 0 ? (
          <div className="bg-white rounded-[2rem] p-8 text-center border border-gray-100 shadow-sm text-gray-500 text-xs">
            No recent orders found. Start shopping to fill your dashboard!
          </div>
        ) : (
          <div className="space-y-3">
            {recentOrders.map((order) => {
              const orderDate = new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
              return (
                <div
                  key={order._id}
                  className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm flex items-center justify-between hover:border-green-200 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 flex items-center justify-center bg-green-50 text-green-600 rounded-[14px]">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{order.invoiceNumber || `#${order._id.slice(-6).toUpperCase()}`}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{orderDate} • {order.orderItems?.length || 0} Item(s)</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-extrabold text-gray-900 hidden sm:block">{formatCurrency(order.totalPrice)}</span>
                    <button
                      onClick={() => onViewDetails(order)}
                      className="p-2 sm:px-3 sm:py-2 bg-gray-50 hover:bg-green-50 text-gray-700 hover:text-green-600 rounded-xl transition-colors flex items-center gap-2"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                      <span className="text-xs font-bold hidden sm:block">Details</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Quick Actions (Mobile Only) */}
      <div className="lg:hidden mt-2">
        <h3 className="text-lg font-bold text-gray-900 mb-4 px-1">Quick Actions</h3>
        <div className="grid grid-cols-4 gap-3 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
          <button onClick={() => onViewTab('addresses')} className="flex flex-col items-center gap-2 group">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm border border-blue-100 group-hover:scale-105 transition-transform">
              <MapPin className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-gray-600">Addresses</span>
          </button>
          <button onClick={() => onViewTab('wishlist')} className="flex flex-col items-center gap-2 group">
            <div className="w-12 h-12 rounded-full bg-pink-50 flex items-center justify-center text-pink-600 shadow-sm border border-pink-100 group-hover:scale-105 transition-transform">
              <Heart className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-gray-600">Wishlist</span>
          </button>
          <button onClick={() => window.location.href = 'mailto:support@example.com'} className="flex flex-col items-center gap-2 group">
            <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 shadow-sm border border-purple-100 group-hover:scale-105 transition-transform">
              <HeadphonesIcon className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-gray-600">Support</span>
          </button>
          <button onClick={onLogout} className="flex flex-col items-center gap-2 group">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600 shadow-sm border border-red-100 group-hover:scale-105 transition-transform">
              <LogOut className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-gray-600">Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverviewTab;
