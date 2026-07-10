import { API_BASE as config_API_BASE, API_URL as config_API_URL } from '../../config/api';
import React, { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import {
  ShoppingCart, Search, Loader2, RefreshCw, Banknote,
  CheckCircle, Clock, Package, MapPin, Phone, User,
  ChevronDown, ChevronUp, AlertTriangle, Filter, IndianRupee, Printer, Calendar, XCircle, Truck, FileText
} from 'lucide-react';
import AdminLayout from '../../components/Admin/AdminLayout';
import useAuthStore from '../../store/useAuthStore';
import axios from 'axios';
import useModal from '../../hooks/useModal';
import { formatCurrency } from '../../utils/currency';
import { generateInvoicePDF } from '../../utils/pdfGenerator';

const API_BASE = `${config_API_BASE}/admin`;

/* ── Status & Payment badge helper styling (Spec 8) ───────────────────────── */
const getOrderStatusBadgeStyle = (status) => {
  const base = "inline-flex items-center justify-center px-3.5 rounded-full font-semibold text-xs whitespace-nowrap transition-all border";
  const style = { height: '32px' };
  switch (status) {
    case 'Pending':
      return { className: `${base} bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30`, style };
    case 'Accepted':
      return { className: `${base} bg-purple-500/15 text-purple-400 border-purple-500/30`, style };
    case 'Out for Delivery':
    case 'Out For Delivery':
      return { className: `${base} bg-[#3B82F6]/15 text-[#3B82F6] border-[#3B82F6]/30`, style };
    case 'Delivered':
      return { className: `${base} bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30`, style };
    case 'Cancelled':
      return { className: `${base} bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30`, style };
    default:
      return { className: `${base} bg-white/10 text-gray-300 border-white/20`, style };
  }
};

const getPaymentBadgeStyle = (status) => {
  const base = "inline-flex items-center justify-center px-3.5 rounded-full font-semibold text-xs whitespace-nowrap transition-all border";
  const style = { height: '32px' };
  if (status === 'Paid') return { className: `${base} bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30`, style, label: '🟢 Paid' };
  if (status === 'Failed') return { className: `${base} bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30`, style, label: '🔴 Failed' };
  if (status === 'Refunded') return { className: `${base} bg-[#3B82F6]/15 text-[#3B82F6] border-[#3B82F6]/30`, style, label: '🔵 Refunded' };
  return { className: `${base} bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30`, style, label: '🟡 Pending' };
};

const ORDER_STATUSES = ['Pending', 'Accepted', 'Out for Delivery', 'Delivered', 'Cancelled'];

/* ── Order Row ────────────────────────────────────────────────────────────── */
const OrderRow = ({ order, token, onUpdated }) => {
  const { adminAlert, toast } = useModal();
  const [expanded,       setExpanded]       = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [error,          setError]          = useState('');

  const recipient = order.recipient?.isForAnotherPerson
    ? order.recipient
    : null;

  const changeStatus = async (status) => {
    setStatusUpdating(true); setError('');
    try {
      await axios.patch(
        `${API_BASE}/orders/${order._id}/status`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      let toastMsg = `Order status updated to ${status}.`;
      if (status === 'Accepted') toastMsg = "Order Accepted Successfully";
      else if (status === 'Out for Delivery') toastMsg = "Order Marked Out for Delivery";
      else if (status === 'Delivered') toastMsg = "Order Delivered Successfully";
      else if (status === 'Cancelled') toastMsg = "Order Cancelled Successfully";
      
      toast('Success', toastMsg);
      onUpdated();
    } catch (e) {
      const msg = e.response?.data?.message || 'Failed to update status.';
      setError(msg);
      adminAlert('error', 'Status Update Failed', msg);
    } finally {
      setStatusUpdating(false);
    }
  };

  // Thermal/Standard invoice printing utility
  const printInvoice = () => {
    const printWindow = window.open('', '_blank');
    const itemsHtml = order.orderItems.map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: left;">${item.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.price)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.price * item.quantity)}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Tiruchendur Murugan Pazhamudhir Solai Invoice - ${order.invoiceNumber}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; }
            .header { text-align: center; border-bottom: 2px dashed #16a34a; padding-bottom: 15px; margin-bottom: 15px; }
            .details { margin-bottom: 20px; font-size: 13px; }
            .details td { padding: 4px 0; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
            .total { font-weight: bold; text-align: right; font-size: 14px; border-top: 2px solid #eee; pt-3; }
            @media print {
              body { padding: 0; border: none; }
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            <h2 style="margin: 0; color: #16a34a;">Tiruchendur Murugan Pazhamudhir Solai</h2>
            <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">Hyperlocal Groceries Delivery Portal</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 12px 0;" />
            <p style="margin: 0; font-size: 12px; font-weight: bold;">Invoice No: ${order.invoiceNumber}</p>
            <p style="margin: 2px 0 0 0; font-size: 11px; color: #888;">Placed At: ${new Date(order.createdAt).toLocaleString('en-IN')}</p>
          </div>
          <div class="details">
            <table style="width: 100%;">
              <tr>
                <td><strong>Customer:</strong> ${order.user?.fullName || order.recipient?.name || 'Walk-in Customer'}</td>
                <td style="text-align: right;"><strong>Phone:</strong> +91 ${order.user?.phoneNumber || order.recipient?.phone || '—'}</td>
              </tr>
              <tr>
                <td colspan="2"><strong>Delivery Location:</strong> ${order.shippingAddress?.fullAddress || '—'}</td>
              </tr>
              <tr>
                <td colspan="2"><strong>Distance from Store:</strong> ${order.shippingAddress?.distanceFromStore || '—'} km</td>
              </tr>
            </table>
          </div>
          <table class="table">
            <thead>
              <tr style="border-bottom: 1px solid #ddd; background: #f9f9f9;">
                <th style="text-align: left; padding: 8px;">Item</th>
                <th style="text-align: center; padding: 8px;">Quantity</th>
                <th style="text-align: right; padding: 8px;">Price</th>
                <th style="text-align: right; padding: 8px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="total">
            <p style="margin: 4px 0;">Total Amount: ${formatCurrency(order.totalPrice)}</p>
            <p style="font-size: 11px; font-weight: normal; margin: 2px 0;">Payment Mode: CASH ON DELIVERY (COD)</p>
            <p style="font-size: 11px; font-weight: bold; margin: 2px 0; color: #16a34a;">Payment Status: ${order.paymentStatus === 'Paid' ? 'PAID' : 'PENDING'}</p>
            <p style="font-size: 11px; font-weight: bold; margin: 2px 0; color: #16a34a;">Current Status: ${order.status}</p>
            <p style="font-size: 11px; margin: 15px 0 0 0; text-align: center; color: #666;">Thanks, Tiruchendur Murugan Pazhamudhir Solai Team</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div
      style={{
        background: '#111827',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '18px',
        padding: '20px',
      }}
      className="transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0_10px_30px_rgba(0,0,0,0.25)] animate-fadeIn"
    >
      {/* ── Main Row (Grid aligned on xl, cards on md/sm) ── */}
      <div className="flex flex-col md:grid md:grid-cols-2 xl:grid xl:grid-cols-12 gap-6 xl:gap-[24px] items-start md:items-center">
        
        {/* 1. Invoice */}
        <div className="xl:col-span-2 flex items-center justify-between w-full xl:w-auto">
          <div>
            <span className="xl:hidden text-[11px] font-bold text-[#94A3B8] uppercase block mb-1">Invoice</span>
            <p className="text-sm font-black text-white tracking-wide">
              {order.invoiceNumber || `#${order._id.slice(-8).toUpperCase()}`}
            </p>
          </div>
        </div>

        {/* 2. Customer Details */}
        <div className="xl:col-span-2 min-w-0 w-full">
          <span className="xl:hidden text-[11px] font-bold text-[#94A3B8] uppercase block mb-1">Customer</span>
          <p className="font-bold text-white truncate" style={{ fontSize: '14px', lineHeight: '1.6' }}>
            {order.user?.fullName || order.recipient?.name || 'Walk-in Customer'}
          </p>
          <p className="text-[#94A3B8] truncate font-medium" style={{ fontSize: '14px', lineHeight: '1.6' }}>
            {order.user?.phoneNumber || order.recipient?.phone ? `+91 ${order.user?.phoneNumber || order.recipient?.phone}` : '—'}
          </p>
        </div>

        {/* 3. Amount Column */}
        <div className="xl:col-span-1 text-left xl:text-center w-full">
          <span className="xl:hidden text-[11px] font-bold text-[#94A3B8] uppercase block mb-1">Amount</span>
          <p className="font-extrabold text-white text-base leading-tight">{formatCurrency(order.totalPrice)}</p>
          <p className="text-xs text-[#94A3B8] font-semibold mt-0.5">{order.orderItems?.length || 0} {order.orderItems?.length === 1 ? 'Item' : 'Items'}</p>
        </div>

        {/* 4. Method */}
        <div className="xl:col-span-1 text-left xl:text-center w-full flex xl:justify-center items-center">
          <span className="xl:hidden text-[11px] font-bold text-[#94A3B8] uppercase mr-2">Method:</span>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#22C55E] bg-[#22C55E]/15 border border-[#22C55E]/30 px-3 py-1 rounded-full">
            <Banknote className="w-3.5 h-3.5" /> COD
          </span>
        </div>

        {/* 5. Payment */}
        <div className="xl:col-span-2 text-left xl:text-center w-full flex xl:justify-center items-center">
          <span className="xl:hidden text-[11px] font-bold text-[#94A3B8] uppercase mr-2">Payment:</span>
          {(() => {
            const badge = getPaymentBadgeStyle(order.paymentStatus);
            return <span className={badge.className} style={badge.style}>{badge.label}</span>;
          })()}
        </div>

        {/* 6. Status */}
        <div className="xl:col-span-2 text-left xl:text-center w-full flex xl:justify-center items-center gap-2">
          <span className="xl:hidden text-[11px] font-bold text-[#94A3B8] uppercase mr-2">Status:</span>
          {(() => {
            if (order.status === 'Pending') {
              return (
                <div className="flex items-center gap-2">
                  <button
                    disabled={statusUpdating}
                    onClick={(e) => { e.stopPropagation(); changeStatus('Accepted'); }}
                    title="Accept Order"
                    className="p-1.5 text-[#22C55E] hover:bg-[#22C55E]/15 rounded-full transition-all duration-200 border border-[#22C55E]/30 hover:scale-105"
                  >
                    <CheckCircle className="w-5 h-5" />
                  </button>
                  <button
                    disabled={statusUpdating}
                    onClick={(e) => { e.stopPropagation(); changeStatus('Cancelled'); }}
                    title="Cancel Order"
                    className="p-1.5 text-[#EF4444] hover:bg-[#EF4444]/15 rounded-full transition-all duration-200 border border-[#EF4444]/30 hover:scale-105"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              );
            }
            if (order.status === 'Accepted') {
              return (
                <button
                  disabled={statusUpdating}
                  onClick={(e) => { e.stopPropagation(); changeStatus('Out for Delivery'); }}
                  title="Mark as Out for Delivery"
                  className="p-1.5 text-[#3B82F6] hover:bg-[#3B82F6]/15 rounded-full transition-all duration-200 border border-[#3B82F6]/30 hover:scale-105"
                >
                  <Truck className="w-5 h-5" />
                </button>
              );
            }
            if (order.status === 'Out for Delivery' || order.status === 'Out For Delivery') {
              return (
                <button
                  disabled={statusUpdating}
                  onClick={(e) => { e.stopPropagation(); changeStatus('Delivered'); }}
                  title="Mark as Delivered"
                  className="p-1.5 text-[#22C55E] hover:bg-[#22C55E]/15 rounded-full transition-all duration-200 border border-[#22C55E]/30 hover:scale-105"
                >
                  <Package className="w-5 h-5" />
                </button>
              );
            }
            // Delivered or Cancelled
            const badge = getOrderStatusBadgeStyle(order.status);
            return <span className={badge.className} style={badge.style}>{order.status}</span>;
          })()}
        </div>

        {/* 7. Date */}
        <div className="xl:col-span-1 text-left xl:text-center w-full">
          <span className="xl:hidden text-[11px] font-bold text-[#94A3B8] uppercase block mb-1">Date</span>
          <p className="text-xs font-semibold text-[#94A3B8]">
            {new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>

        {/* 8. Action Icons */}
        <div className="xl:col-span-1 flex items-center justify-end gap-2 w-full pt-3 xl:pt-0 border-t xl:border-0 border-white/8 mt-1 xl:mt-0 md:col-span-2 xl:col-span-1">
          <button
            onClick={printInvoice}
            title="Print Invoice"
            style={{ borderRadius: '10px' }}
            className="p-2.5 text-[#94A3B8] hover:text-white hover:bg-[rgba(255,255,255,0.08)] transition-all duration-300"
          >
            <Printer className="w-4 h-4" />
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            title="Expand Details"
            style={{ borderRadius: '10px' }}
            className="p-2.5 text-[#22C55E] hover:bg-[rgba(255,255,255,0.08)] transition-all duration-300"
          >
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* ── Expanded Detail ────────────────────────────────────────────────── */}
      {expanded && (
        <div className="mt-5 pt-5 bg-transparent space-y-4 border-t border-white/8 animate-fadeIn">
          {error && (
            <div className="flex items-center gap-2 text-xs text-[#EF4444] bg-[#EF4444]/15 border border-[#EF4444]/30 rounded-xl p-3 font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Address */}
            <div className="bg-white/4 rounded-xl border border-white/8 p-4 space-y-1.5">
              <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wide flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#22C55E]" /> Delivery Address
              </p>
              <p className="text-xs text-white leading-relaxed font-medium">
                {order.shippingAddress?.fullAddress || '—'}
              </p>
              {order.shippingAddress?.city && (
                <p className="text-[11px] text-[#94A3B8]">
                  {[order.shippingAddress.city, order.shippingAddress.state, order.shippingAddress.pincode].filter(Boolean).join(', ')}
                </p>
              )}
              {order.shippingAddress?.distanceFromStore != null && (
                <p className="text-[11px] font-semibold text-cyan-400">
                  📍 {order.shippingAddress.distanceFromStore} km from store
                </p>
              )}
            </div>

            {/* Recipient */}
            <div className="bg-white/4 rounded-xl border border-white/8 p-4 space-y-1.5">
              <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wide flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#22C55E]" /> {recipient ? 'Recipient' : 'Customer'}
              </p>
              <p className="text-xs font-bold text-white">
                {recipient ? recipient.name : (order.user?.fullName || '—')}
              </p>
              <p className="text-xs text-gray-300 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#94A3B8]" />
                {recipient ? recipient.phone : (order.user?.phoneNumber ? `+91 ${order.user.phoneNumber}` : '—')}
              </p>
              {order.notes && (
                <p className="text-[11px] text-[#F59E0B] italic mt-1">Note: {order.notes}</p>
              )}
            </div>

            {/* Items */}
            <div className="bg-white/4 rounded-xl border border-white/8 p-4 space-y-1.5">
              <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wide flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-[#22C55E]" /> Items Ordered
              </p>
              <div className="space-y-1.5 max-h-32 overflow-y-auto admin-scroll">
                {order.orderItems?.map((item, i) => (
                  <div key={i} className="flex justify-between text-xs text-gray-200">
                    <span className="truncate mr-2 font-medium">{item.name} × {item.quantity}</span>
                    <span className="font-bold text-white shrink-0">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/8 pt-2 flex justify-between text-xs font-black text-white mt-2">
                <span>Total</span><span className="text-[#22C55E]">{formatCurrency(order.totalPrice)}</span>
              </div>
            </div>
          </div>

          {/* ── Action Buttons ──────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-3 pt-2">

            {/* Actions for order states */}
            {(() => {
              if (order.status === 'Pending') {
                return (
                  <div className="flex items-center gap-3">
                    <button
                      disabled={statusUpdating}
                      onClick={() => changeStatus('Accepted')}
                      className="flex items-center gap-1.5 h-[40px] px-4 bg-[#22C55E]/10 hover:bg-[#22C55E]/20 border border-[#22C55E]/30 rounded-xl text-xs font-bold text-[#22C55E] transition-colors shadow-sm disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" /> Accept Order
                    </button>
                    <button
                      disabled={statusUpdating}
                      onClick={() => changeStatus('Cancelled')}
                      className="flex items-center gap-1.5 h-[40px] px-4 bg-[#EF4444]/10 hover:bg-[#EF4444]/20 border border-[#EF4444]/30 rounded-xl text-xs font-bold text-[#EF4444] transition-colors shadow-sm disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" /> Cancel Order
                    </button>
                  </div>
                );
              }
              if (order.status === 'Accepted') {
                return (
                  <button
                    disabled={statusUpdating}
                    onClick={() => changeStatus('Out for Delivery')}
                    className="flex items-center gap-1.5 h-[40px] px-4 bg-[#3B82F6]/10 hover:bg-[#3B82F6]/20 border border-[#3B82F6]/30 rounded-xl text-xs font-bold text-[#3B82F6] transition-colors shadow-sm disabled:opacity-50"
                  >
                    <Truck className="w-4 h-4" /> Mark Out for Delivery
                  </button>
                );
              }
              if (order.status === 'Out for Delivery' || order.status === 'Out For Delivery') {
                return (
                  <button
                    disabled={statusUpdating}
                    onClick={() => changeStatus('Delivered')}
                    className="flex items-center gap-1.5 h-[40px] px-4 bg-[#22C55E]/10 hover:bg-[#22C55E]/20 border border-[#22C55E]/30 rounded-xl text-xs font-bold text-[#22C55E] transition-colors shadow-sm disabled:opacity-50"
                  >
                    <Package className="w-4 h-4" /> Mark Delivered
                  </button>
                );
              }
              // Delivered or Cancelled
              const badge = getOrderStatusBadgeStyle(order.status);
              return <span className={badge.className} style={badge.style}>{order.status}</span>;
            })()}

            <button
              onClick={printInvoice}
              className="flex items-center gap-1.5 h-[40px] px-4 bg-white/6 hover:bg-white/10 border border-white/8 rounded-xl text-xs font-bold text-white transition-colors shadow-sm"
            >
              <Printer className="w-3.5 h-3.5 text-[#22C55E]" /> Print Invoice
            </button>
            <button
              onClick={() => generateInvoicePDF(order)}
              className="flex items-center gap-1.5 h-[40px] px-4 bg-white/6 hover:bg-white/10 border border-white/8 rounded-xl text-xs font-bold text-white transition-colors shadow-sm"
              title="Download PDF Invoice"
            >
              <FileText className="w-3.5 h-3.5 text-[#22C55E]" /> Download PDF Bill
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════ */
const Orders = () => {
  const { adminInfo } = useAuthStore();

  const [orders,        setOrders]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [searchQuery,   setSearchQuery]   = useState('');
  const [statusFilter,  setStatusFilter]  = useState('');
  const [payFilter,     setPayFilter]     = useState('');
  
  // Date Filters
  const [startDate,     setStartDate]     = useState('');
  const [endDate,       setEndDate]       = useState('');

  const [total,         setTotal]         = useState(0);

  if (!adminInfo) return <Navigate to="/admin/login" replace />;

  const fetchOrders = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ limit: 100 });
      if (statusFilter) params.set('status', statusFilter);
      if (payFilter)    params.set('paymentStatus', payFilter);
      if (searchQuery)  params.set('search', searchQuery);
      if (startDate)    params.set('startDate', startDate);
      if (endDate)      params.set('endDate', endDate);

      const { data } = await axios.get(`${API_BASE}/orders?${params}`, {
        headers: { Authorization: `Bearer ${adminInfo.token}` },
      });
      setOrders(data.orders || []);
      setTotal(data.total || 0);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load orders.');
    } finally {
      setLoading(false);
    }
  }, [adminInfo, statusFilter, payFilter, searchQuery, startDate, endDate]);

  useEffect(() => {
    fetchOrders();
    const handlePaymentUpdate = () => fetchOrders();
    window.addEventListener('socket_payment_update', handlePaymentUpdate);
    return () => window.removeEventListener('socket_payment_update', handlePaymentUpdate);
  }, [fetchOrders]);

  /* ── Summary stats ──────────────────────────────────────────────────────── */
  const pendingPay  = orders.filter(o => o.paymentStatus === 'Paid').length;
  const totalRevPaid = orders.filter(o => o.paymentStatus === 'Paid').reduce((s, o) => s + o.totalPrice, 0);

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* ─── Page Header ──────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
              <div className="p-2.5 rounded-[16px] bg-white/4 border border-white/8 shadow-sm">
                <ShoppingCart className="w-6 h-6 text-[#22C55E]" />
              </div>
              COD Orders
            </h1>
            <p className="text-sm text-[#94A3B8] mt-1">
              Manage Cash on Delivery orders — change status and manage invoice print-outs
            </p>
          </div>
          <button
            onClick={fetchOrders}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/6 rounded-xl border border-white/8 text-xs font-bold text-white hover:bg-white/10 transition-colors shadow-sm w-fit"
          >
            <RefreshCw className={`w-4 h-4 text-[#22C55E] ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* ─── Stats Bar ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Orders', value: total, icon: ShoppingCart, color: 'text-blue-400' },
            { label: 'Pending Payment', value: orders.length - pendingPay, icon: Clock, color: 'text-orange-400' },
            { label: 'Payment Received', value: pendingPay, icon: CheckCircle, color: 'text-[#22C55E]' },
            { label: 'Cash Collected', value: formatCurrency(totalRevPaid), icon: IndianRupee, color: 'text-emerald-400' },
          ].map(s => (
            <div key={s.label} className="admin-card flex items-center gap-4">
              <div className="p-3 rounded-[16px] bg-white/4 border border-white/8 shrink-0">
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-black text-white truncate">{s.value}</p>
                <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wide mt-0.5 truncate">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ─── Filters & Search (Spec 1-5) ────────────────────────────────── */}
        <div 
          style={{
            background: '#0F172A',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.35)'
          }}
          className="transition-all duration-300"
        >
          <div className="flex flex-col md:grid md:grid-cols-2 xl:flex xl:flex-row xl:items-center gap-4">
            {/* Search Bar */}
            <div className="relative xl:flex-1 min-w-[240px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search invoice, customer or phone number"
                style={{
                  height: '52px',
                  borderRadius: '14px',
                  background: '#111827',
                  border: '1px solid #1E293B',
                }}
                className="w-full pl-12 pr-4 text-sm text-white placeholder-[#94A3B8] font-medium outline-none transition-all duration-300 focus:border-[#22C55E] focus:shadow-[0_0_0_4px_rgba(34,197,94,0.15)]"
              />
            </div>

            {/* Status Dropdown */}
            <div className="w-full xl:w-44">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  height: '52px',
                  borderRadius: '14px',
                  background: '#111827',
                  border: '1px solid #1E293B',
                }}
                className="w-full px-4 text-xs font-bold text-white outline-none cursor-pointer transition-all duration-300 focus:border-[#22C55E] focus:shadow-[0_0_0_4px_rgba(34,197,94,0.15)]"
              >
                <option value="" className="bg-[#111827]">All Statuses</option>
                {ORDER_STATUSES.map(s => <option key={s} value={s} className="bg-[#111827]">{s}</option>)}
              </select>
            </div>

            {/* Payment Dropdown */}
            <div className="w-full xl:w-44">
              <select
                value={payFilter}
                onChange={(e) => setPayFilter(e.target.value)}
                style={{
                  height: '52px',
                  borderRadius: '14px',
                  background: '#111827',
                  border: '1px solid #1E293B',
                }}
                className="w-full px-4 text-xs font-bold text-white outline-none cursor-pointer transition-all duration-300 focus:border-[#22C55E] focus:shadow-[0_0_0_4px_rgba(34,197,94,0.15)]"
              >
                <option value="" className="bg-[#111827]">All Payments</option>
                <option value="Pending" className="bg-[#111827]">⏳ Pending</option>
                <option value="Paid" className="bg-[#111827]">✓ Paid</option>
              </select>
            </div>

            {/* Date Pickers */}
            <div className="flex items-center gap-2 md:col-span-2 xl:col-span-1 xl:w-auto">
              <div 
                style={{ height: '52px', borderRadius: '14px', background: '#111827', border: '1px solid #1E293B' }}
                className="flex items-center gap-1.5 px-3.5 w-1/2 xl:w-40 focus-within:border-[#22C55E] focus-within:shadow-[0_0_0_4px_rgba(34,197,94,0.15)] transition-all duration-300"
              >
                <span className="text-[11px] font-bold text-[#94A3B8] shrink-0">From</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent text-xs font-bold text-white outline-none w-full cursor-pointer"
                />
              </div>
              <div 
                style={{ height: '52px', borderRadius: '14px', background: '#111827', border: '1px solid #1E293B' }}
                className="flex items-center gap-1.5 px-3.5 w-1/2 xl:w-40 focus-within:border-[#22C55E] focus-within:shadow-[0_0_0_4px_rgba(34,197,94,0.15)] transition-all duration-300"
              >
                <span className="text-[11px] font-bold text-[#94A3B8] shrink-0">To</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent text-xs font-bold text-white outline-none w-full cursor-pointer"
                />
              </div>
            </div>

            {/* Matching Orders Badge */}
            <div className="md:col-span-2 xl:col-span-1 flex items-center justify-end xl:ml-auto">
              <div
                style={{
                  background: 'rgba(34,197,94,0.12)',
                  color: '#22C55E',
                  borderRadius: '999px',
                  padding: '10px 18px',
                }}
                className="text-xs font-bold whitespace-nowrap inline-flex items-center gap-1.5 shadow-sm"
              >
                Found {orders.length} matching orders
              </div>
            </div>
          </div>
          {(startDate || endDate) && (
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="text-xs font-bold text-[#EF4444] hover:text-white bg-[#EF4444]/15 border border-[#EF4444]/30 px-3 py-1.5 rounded-xl transition-colors"
              >
                Clear Date Filters
              </button>
            </div>
          )}
        </div>

        {/* ─── Error ────────────────────────────────────────────────────────── */}
        {error && (
          <div className="bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] px-4 py-3 rounded-xl font-semibold text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}

        {/* ─── Orders Table (Spec 6 & 7) ────────────────────────────────────── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 admin-card">
            <Loader2 className="w-10 h-10 text-[#22C55E] animate-spin mb-4" />
            <p className="text-sm font-semibold text-[#94A3B8]">Loading orders list…</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 admin-card text-center">
            <div className="w-16 h-16 rounded-[20px] bg-white/4 border border-white/8 flex items-center justify-center mb-4 shadow-sm">
              <ShoppingCart className="w-8 h-8 text-[#94A3B8]" />
            </div>
            <p className="text-base font-bold text-white">No matching orders found</p>
            <p className="text-xs text-[#94A3B8] mt-1">Try relaxing filters or search queries</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Sticky Table Header (Desktop xl only) */}
            <div 
              style={{ background: '#16213E' }}
              className="hidden xl:grid grid-cols-12 gap-[24px] px-[20px] py-4 rounded-[16px] border border-white/10 text-xs font-bold text-[#94A3B8] uppercase tracking-wider sticky top-4 z-20 shadow-md items-center"
            >
              <div className="col-span-2">Invoice</div>
              <div className="col-span-2">Customer</div>
              <div className="col-span-1 text-center">Amount</div>
              <div className="col-span-1 text-center">Method</div>
              <div className="col-span-2 text-center">Payment</div>
              <div className="col-span-2 text-center">Status</div>
              <div className="col-span-1 text-center">Date</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>

            {/* Rows Container */}
            <div className="space-y-4">
              {orders.map(order => (
                <OrderRow
                  key={order._id}
                  order={order}
                  token={adminInfo.token}
                  onUpdated={fetchOrders}
                />
              ))}
            </div>
          </div>
        )}

        {/* ─── COD Info Banner ──────────────────────────────────────────────── */}
        <div className="flex items-start gap-3.5 p-5 rounded-2xl bg-[#22C55E]/10 border border-[#22C55E]/30 text-white">
          <Banknote className="w-5 h-5 text-[#22C55E] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-white">Hyperlocal Hyper-efficient Order Dispatch</p>
            <p className="text-xs text-gray-300 mt-1 leading-relaxed">
              Orders progress through the state machine: <strong className="text-[#22C55E]">Pending &rarr; Accepted &rarr; Packed &rarr; Out for Delivery &rarr; Delivered / Cancelled</strong>.
              Click the print icon next to any order to print thermal/standard receipt slips immediately.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Orders;
