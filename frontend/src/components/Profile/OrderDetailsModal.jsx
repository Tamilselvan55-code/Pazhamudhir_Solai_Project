import React from 'react';
import { X, Package, Calendar, CreditCard, MapPin, CheckCircle, Clock, Truck, AlertCircle, FileText } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import ProductImage from '../Product/ProductImage';

const getStatusBadge = (status) => {
  const colors = {
    Pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    Accepted: 'bg-blue-100 text-blue-800 border-blue-200',
    Confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
    Packed: 'bg-purple-100 text-purple-800 border-purple-200',
    Packing: 'bg-purple-100 text-purple-800 border-purple-200',
    'Out for Delivery': 'bg-orange-100 text-orange-800 border-orange-200',
    Delivered: 'bg-green-100 text-green-800 border-green-200',
    Cancelled: 'bg-red-100 text-red-800 border-red-200',
    Rejected: 'bg-red-100 text-red-800 border-red-200',
  };
  return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
};

const OrderDetailsModal = ({ order, onClose, onDownloadInvoice }) => {
  if (!order) return null;

  const orderDate = new Date(order.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Dynamic steps based on current status (Requirement: Timeline UI)
  const getTimelineSteps = () => {
    const status = order.status;
    if (status === 'Cancelled' || status === 'Rejected') {
      return [
        { label: 'Order Placed', status: 'completed' },
        { label: 'Cancelled', status: 'cancelled' }
      ];
    }

    const isAccepted = ['Accepted', 'Out for Delivery', 'Delivered'].includes(status);
    const isOutForDelivery = ['Out for Delivery', 'Delivered'].includes(status);
    const isDelivered = status === 'Delivered';

    return [
      { label: 'Order Placed', status: 'completed' },
      { label: 'Accepted', status: isAccepted ? 'completed' : 'upcoming' },
      { label: 'Out for Delivery', status: isOutForDelivery ? 'completed' : 'upcoming' },
      { label: 'Delivered', status: isDelivered ? 'completed' : 'upcoming' }
    ];
  };

  const timelineSteps = getTimelineSteps();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-5 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-50 rounded-2xl text-green-600">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Order {order.invoiceNumber || `#${order._id.slice(-6).toUpperCase()}`}</h3>
              <p className="text-xs text-gray-500">Placed on {orderDate}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onDownloadInvoice(order)}
              className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <FileText className="w-4 h-4" /> Invoice
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Badge & Summary */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <div>
              <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Current Status</p>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border mt-1 ${getStatusBadge(order.status)}`}>
                {order.status}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Payment Method</p>
              <p className="text-sm font-bold text-gray-800 mt-1">{order.paymentMethod === 'COD' ? 'Cash on Delivery' : order.paymentMethod}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Total Amount</p>
              <p className="text-base font-extrabold text-green-600 mt-0.5">{formatCurrency(order.totalPrice)}</p>
            </div>
          </div>

          {/* Timeline Tracker */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Truck className="w-4 h-4 text-green-600" /> Order Timeline
            </h4>
            <div className="relative flex items-center justify-between w-full max-w-sm mx-auto px-4 mt-4 mb-2">
              {timelineSteps.map((step, idx) => {
                let circleClass = "";
                let textClass = "";
                let iconSymbol = "";

                if (step.status === 'completed') {
                  circleClass = "bg-green-500 border-green-500 text-white shadow-md shadow-green-500/20";
                  textClass = "text-green-600 font-bold";
                  iconSymbol = "✔";
                } else if (step.status === 'cancelled') {
                  circleClass = "bg-red-500 border-red-500 text-white shadow-md shadow-red-500/20";
                  textClass = "text-red-600 font-bold";
                  iconSymbol = "✖";
                } else if (step.status === 'active') {
                  circleClass = "bg-yellow-500 border-yellow-500 text-white shadow-md shadow-yellow-500/20";
                  textClass = "text-yellow-600 font-bold animate-pulse";
                  iconSymbol = "●";
                } else {
                  // upcoming
                  circleClass = "bg-white border-gray-300 text-gray-300";
                  textClass = "text-gray-400 font-medium";
                  iconSymbol = "○";
                }

                return (
                  <React.Fragment key={step.label}>
                    <div className="flex flex-col items-center relative z-10">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 font-bold text-sm ${circleClass}`}>
                        {iconSymbol}
                      </div>
                      <span className={`text-xs mt-2.5 text-center font-bold tracking-wide ${textClass}`}>
                        {step.label}
                      </span>
                    </div>
                    {idx < timelineSteps.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-2 rounded transition-colors duration-300 -mt-6 ${
                        step.status === 'completed' ? 'bg-green-500' : 'bg-gray-200'
                      }`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Products List */}
          <div>
            <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-green-600" /> Products Ordered ({order.orderItems?.length || 0})
            </h4>
            <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden bg-white">
              {order.orderItems?.map((item, index) => {
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
          {order.shippingAddress && (
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-green-600" /> Delivery Address
              </h4>
              <p className="text-sm font-semibold text-gray-800 leading-relaxed">
                {order.shippingAddress.fullAddress || order.shippingAddress.street}
              </p>
              {(order.shippingAddress.city || order.shippingAddress.state || order.shippingAddress.pincode) && (
                <p className="text-xs text-gray-600 mt-1">
                  {[order.shippingAddress.city, order.shippingAddress.state, order.shippingAddress.pincode].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;
