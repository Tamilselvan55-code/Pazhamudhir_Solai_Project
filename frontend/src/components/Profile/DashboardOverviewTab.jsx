import React from 'react';
import { Package, ShoppingBag, Banknote, Clock, CheckCircle, User, Phone, Mail, LogOut, ArrowRight, Eye } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';

const DashboardOverviewTab = ({ userInfo, orders, onLogout, onViewAllOrders, onViewDetails }) => {
  // Stats calculations
  const totalOrders = orders.length;
  const totalProductsOrdered = orders.reduce((acc, order) => {
    const itemsCount = (order.orderItems || []).reduce((sum, item) => sum + (item.quantity || 1), 0);
    return acc + itemsCount;
  }, 0);
  const totalSpent = orders.reduce((acc, order) => acc + (order.totalPrice || 0), 0);
  const pendingOrders = orders.filter(o => ['Pending', 'Accepted', 'Confirmed', 'Packed', 'Packing', 'Out for Delivery'].includes(o.status)).length;
  const deliveredOrders = orders.filter(o => o.status === 'Delivered').length;

  const recentOrders = orders.slice(0, 3);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Overview Stats Cards */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Dashboard Overview</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Card 1: Total Orders */}
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <Package className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Orders</p>
            <p className="text-2xl font-extrabold text-gray-900 mt-1">{totalOrders}</p>
          </div>

          {/* Card 2: Total Products Ordered */}
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Products Bought</p>
            <p className="text-2xl font-extrabold text-gray-900 mt-1">{totalProductsOrdered}</p>
          </div>

          {/* Card 3: Total Amount Spent */}
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center mb-3">
              <Banknote className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Amount Spent</p>
            <p className="text-2xl font-extrabold text-green-600 mt-1">{formatCurrency(totalSpent)}</p>
          </div>

          {/* Card 4: Pending Orders */}
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-2xl bg-yellow-50 text-yellow-600 flex items-center justify-center mb-3">
              <Clock className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pending Orders</p>
            <p className="text-2xl font-extrabold text-gray-900 mt-1">{pendingOrders}</p>
          </div>

          {/* Card 5: Delivered Orders */}
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all col-span-2 sm:col-span-1">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <CheckCircle className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Delivered Orders</p>
            <p className="text-2xl font-extrabold text-gray-900 mt-1">{deliveredOrders}</p>
          </div>
        </div>
      </div>



      {/* 3. Order History below the existing profile section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Recent Order History</h3>
          <button
            onClick={onViewAllOrders}
            className="text-xs font-bold text-green-600 hover:text-green-700 flex items-center gap-1 transition-colors"
          >
            <span>View All Orders</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {recentOrders.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-gray-100 text-gray-500 text-xs">
            No recent orders found. Start shopping to fill your dashboard!
          </div>
        ) : (
          <div className="space-y-3">
            {recentOrders.map((order) => {
              const orderDate = new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
              return (
                <div
                  key={order._id}
                  className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between hover:border-green-200 transition-all"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="p-2.5 bg-green-50 text-green-600 rounded-xl">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">{order.invoiceNumber || `#${order._id.slice(-6).toUpperCase()}`}</p>
                      <p className="text-[11px] text-gray-500">{orderDate} • {order.orderItems?.length || 0} Item(s)</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-extrabold text-gray-900">{formatCurrency(order.totalPrice)}</span>
                    <button
                      onClick={() => onViewDetails(order)}
                      className="p-2 bg-gray-50 hover:bg-green-50 text-gray-600 hover:text-green-600 rounded-xl transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardOverviewTab;
