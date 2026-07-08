import React, { useState } from 'react';
import axios from 'axios';
import { Package, Search, Filter, RefreshCw, Eye, FileText, AlertCircle, ShoppingBag, Truck, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import useCartStore from '../../store/useCartStore';
import useModal from '../../hooks/useModal';
import { formatCurrency } from '../../utils/currency';

const API_BASE = 'http://localhost:5000/api';

const getStatusBadge = (status) => {
  const colors = {
    Pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    Accepted: 'bg-green-100 text-green-800 border-green-200',
    Cancelled: 'bg-red-100 text-red-800 border-red-200',
  };
  return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
};

const MyOrdersTab = ({ orders, loading, onRefresh, onViewDetails, onDownloadInvoice }) => {
  const { addToCart } = useCartStore();
  const { toast, userAlert, userConfirm } = useModal();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [cancellingId, setCancellingId] = useState(null);
  const itemsPerPage = 5;

  // Filter & Search
  const filteredOrders = orders.filter((order) => {
    const matchesStatus = statusFilter === 'All' || order.status === statusFilter;
    const searchLow = searchTerm.toLowerCase();
    const inv = (order.invoiceNumber || order._id || '').toLowerCase();
    const prodNames = (order.orderItems || []).map((i) => (i.name || '').toLowerCase()).join(' ');
    const matchesSearch = inv.includes(searchLow) || prodNames.includes(searchLow);
    return matchesStatus && matchesSearch;
  });

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage) || 1;
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleReorder = (order) => {
    let count = 0;
    (order.orderItems || []).forEach((item) => {
      const prod = item.product;
      if (prod && typeof prod === 'object') {
        addToCart(prod);
        count++;
      } else {
        addToCart({
          _id: item.product || Math.random().toString(),
          name: item.name,
          price: item.price,
          image: item.image,
          stock: 100,
          inStock: true,
        });
        count++;
      }
    });
    toast('Cart Updated', `Reordered ${count} item(s) to your cart!`);
  };

  const handleCancelOrder = async (orderId) => {
    const ok = await userConfirm('Cancel Order?', 'Are you sure you want to cancel this pending order?', { danger: true, confirmLabel: 'Cancel Order' });
    if (!ok) return;
    try {
      setCancellingId(orderId);
      await axios.patch(`${API_BASE}/orders/${orderId}/cancel`);
      userAlert('Order Cancelled', 'Your order has been cancelled successfully.');
      onRefresh();
    } catch (err) {
      userAlert('Cancel Failed', err.response?.data?.message || 'Failed to cancel order.');
    } finally {
      setCancellingId(null);
    }
  };

  const handleTrackOrder = (order) => {
    onViewDetails(order);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Controls */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">My Orders</h2>
            <p className="text-xs text-gray-500 mt-0.5">Track, reorder, or download invoices for your purchases</p>
          </div>
          <button
            onClick={onRefresh}
            className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title="Refresh Orders"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {/* Filters & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-gray-100">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Order ID or product name..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-green-500 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <Filter className="w-4 h-4 text-gray-400 shrink-0 ml-1" />
            {['All', 'Pending', 'Accepted', 'Packed', 'Out for Delivery', 'Delivered', 'Cancelled'].map((st) => (
              <button
                key={st}
                onClick={() => { setStatusFilter(st); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  statusFilter === st
                    ? 'bg-green-600 text-white shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders List */}
      {loading && orders.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 text-gray-500">
          Loading your order history...
        </div>
      ) : paginatedOrders.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 space-y-3">
          <div className="w-16 h-16 rounded-full bg-gray-50 text-gray-400 mx-auto flex items-center justify-center">
            <Package className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-gray-800">No Orders Found</h3>
          <p className="text-xs text-gray-500">No orders match your current filter or search query.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedOrders.map((order) => {
            const orderDate = new Date(order.createdAt).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });
            const isPending = order.status === 'Pending';
            const isOutForDelivery = order.status === 'Out for Delivery';

            return (
              <div key={order._id} className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
                {/* Order Top Banner */}
                <div className="bg-gray-50/80 px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-gray-400 font-bold uppercase">Order ID</span>
                      <p className="font-extrabold text-gray-900 mt-0.5">{order.invoiceNumber || `#${order._id.slice(-6).toUpperCase()}`}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 font-bold uppercase">Order Date</span>
                      <p className="font-semibold text-gray-800 mt-0.5">{orderDate}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 font-bold uppercase">Total Amount</span>
                      <p className="font-extrabold text-green-600 mt-0.5">{formatCurrency(order.totalPrice)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full font-bold border ${getStatusBadge(order.status)}`}>
                      {order.status}
                    </span>
                    <span className="px-2.5 py-1 bg-gray-200/60 text-gray-700 rounded-full font-semibold">
                      {order.paymentMethod || 'COD'} ({order.paymentStatus || 'Pending'})
                    </span>
                  </div>
                </div>

                {/* Order Items Snapshot */}
                <div className="p-6 grid md:grid-cols-3 gap-6 items-center">
                  <div className="md:col-span-2 space-y-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Products</p>
                    <div className="flex flex-wrap gap-2">
                      {(order.orderItems || []).slice(0, 3).map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 text-xs">
                          <img src={item.image || 'https://via.placeholder.com/40'} alt={item.name} className="w-6 h-6 rounded-md object-cover" />
                          <span className="font-bold text-gray-800">{item.name}</span>
                          <span className="text-gray-500 font-medium">x{item.quantity}</span>
                        </div>
                      ))}
                      {(order.orderItems?.length || 0) > 3 && (
                        <span className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold flex items-center">
                          +{order.orderItems.length - 3} more
                        </span>
                      )}
                    </div>
                    {order.shippingAddress && (
                      <p className="text-xs text-gray-500 mt-2 truncate">
                        📍 <span className="font-semibold text-gray-700">Delivery:</span> {order.shippingAddress.fullAddress || order.shippingAddress.street}
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap md:flex-col justify-end gap-2 border-t md:border-t-0 pt-4 md:pt-0 border-gray-100">
                    <button
                      onClick={() => onViewDetails(order)}
                      className="px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 w-full sm:w-auto"
                    >
                      <Eye className="w-4 h-4" /> View Details & Timeline
                    </button>

                    <div className="flex gap-2 w-full">
                      <button
                        onClick={() => onDownloadInvoice(order)}
                        className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1"
                        title="Download Invoice"
                      >
                        <FileText className="w-3.5 h-3.5" /> Invoice
                      </button>

                      <button
                        onClick={() => handleReorder(order)}
                        className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1 shadow-sm"
                        title="Reorder Items"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" /> Reorder
                      </button>
                    </div>

                    {isOutForDelivery && (
                      <button
                        onClick={() => handleTrackOrder(order)}
                        className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 w-full animate-pulse shadow-md shadow-orange-500/20"
                      >
                        <Truck className="w-4 h-4" /> Track Live Order
                      </button>
                    )}

                    {isPending && (
                      <button
                        disabled={cancellingId === order._id}
                        onClick={() => handleCancelOrder(order._id)}
                        className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 w-full"
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                        {cancellingId === order._id ? 'Cancelling...' : 'Cancel Order'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-2xl p-4 border border-gray-100">
          <span className="text-xs text-gray-500 font-medium">
            Page <span className="font-bold text-gray-900">{currentPage}</span> of <span className="font-bold text-gray-900">{totalPages}</span>
          </span>
          <div className="flex items-center gap-1.5">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyOrdersTab;
