import React, { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import {
  BarChart3, FileSpreadsheet, Download, Calendar,
  TrendingUp, ShoppingBag, Users, Loader2, ShieldAlert,
  FileText, IndianRupee, Clock, CheckCircle, Package,
  Filter, RefreshCw, AlertTriangle, XCircle, Truck, Star,
  ShoppingCart, UserCheck, UserPlus, CreditCard, Layers,
  AlertCircle, Eye, ChevronUp, ChevronDown, Minus
} from 'lucide-react';
import AdminLayout from '../../components/Admin/AdminLayout';
import useAuthStore from '../../store/useAuthStore';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { formatCurrency } from '../../utils/currency';
import { generateReportPDF } from '../../utils/pdfGenerator';

// ─── Status color helpers ───────────────────────────────────────────────────
const STATUS_STYLES = {
  Pending:           { bg: 'bg-amber-500/15',    border: 'border-amber-500/30',    text: 'text-amber-400'    },
  Accepted:          { bg: 'bg-blue-500/15',      border: 'border-blue-500/30',     text: 'text-blue-400'     },
  'Out for Delivery':{ bg: 'bg-violet-500/15',    border: 'border-violet-500/30',   text: 'text-violet-400'   },
  Delivered:         { bg: 'bg-[#22C55E]/15',     border: 'border-[#22C55E]/30',    text: 'text-[#22C55E]'    },
  Cancelled:         { bg: 'bg-[#EF4444]/15',     border: 'border-[#EF4444]/30',    text: 'text-[#EF4444]'    },
  Paid:              { bg: 'bg-[#22C55E]/15',     border: 'border-[#22C55E]/30',    text: 'text-[#22C55E]'    },
  Refunded:          { bg: 'bg-slate-500/15',     border: 'border-slate-500/30',    text: 'text-slate-400'    },
  Low:               { bg: 'bg-amber-500/15',     border: 'border-amber-500/30',    text: 'text-amber-400'    },
  Critical:          { bg: 'bg-[#EF4444]/15',     border: 'border-[#EF4444]/30',    text: 'text-[#EF4444]'    },
  'In Stock':        { bg: 'bg-[#22C55E]/15',     border: 'border-[#22C55E]/30',    text: 'text-[#22C55E]'    },
  'Low Stock':       { bg: 'bg-amber-500/15',     border: 'border-amber-500/30',    text: 'text-amber-400'    },
  'Out of Stock':    { bg: 'bg-[#EF4444]/15',     border: 'border-[#EF4444]/30',    text: 'text-[#EF4444]'    },
  Active:            { bg: 'bg-[#22C55E]/15',     border: 'border-[#22C55E]/30',    text: 'text-[#22C55E]'    },
  Blocked:           { bg: 'bg-[#EF4444]/15',     border: 'border-[#EF4444]/30',    text: 'text-[#EF4444]'    },
};
const getStatusStyle = (s) =>
  STATUS_STYLES[s] || { bg: 'bg-white/8', border: 'border-white/10', text: 'text-gray-300' };

// ─── Growth badge ──────────────────────────────────────────────────────────
const GrowthBadge = ({ pct }) => {
  if (!pct || pct === 0) return (
    <span className="text-[10px] text-[#94A3B8] font-bold flex items-center gap-0.5">
      <Minus className="w-3 h-3" />0%
    </span>
  );
  if (pct > 0) return (
    <span className="text-[10px] text-[#22C55E] font-bold flex items-center gap-0.5">
      <ChevronUp className="w-3 h-3" />+{pct}%
    </span>
  );
  return (
    <span className="text-[10px] text-[#EF4444] font-bold flex items-center gap-0.5">
      <ChevronDown className="w-3 h-3" />{pct}%
    </span>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────
const Reports = () => {
  const { adminInfo } = useAuthStore();

  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [dateFilter, setDateFilter]   = useState('This Month');
  const [startDate, setStartDate]     = useState('');
  const [endDate, setEndDate]         = useState('');
  const [reportType, setReportType]   = useState('Sales Report');
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const [summary, setSummary]               = useState({ totalRevenue: 0, totalOrders: 0, totalCustomers: 0, totalProducts: 0, monthlyRevenue: 0, pendingPayments: 0, avgOrderValue: 0 });
  const [orderStatusCounts, setOrderStatusCounts] = useState({ Pending: 0, Accepted: 0, 'Out for Delivery': 0, Delivered: 0, Cancelled: 0 });
  const [customerAnalytics, setCustomerAnalytics] = useState({ total: 0, newToday: 0, newThisMonth: 0, returning: 0 });
  const [paymentAnalytics, setPaymentAnalytics]   = useState({ codTotal: 0, codPending: 0, codDelivered: 0, codCancelled: 0, codRevenue: 0 });
  const [charts, setCharts]     = useState({ dailySales: [], monthlySales: [], topSellingProducts: [], categoryPerformance: [], lowStock: [], outOfStock: [], recentOrders: [] });
  const [tableData, setTableData] = useState([]);

  // ── Fetch analytics ───────────────────────────────────────────────────────
  const fetchAnalytics = useCallback(async () => {
    if (!adminInfo) return;
    try {
      setLoading(true);
      setError('');
      const { data } = await axios.get('http://localhost:5000/api/admin/reports/analytics', {
        headers: { Authorization: `Bearer ${adminInfo.token}` },
        params: {
          filter:    dateFilter,
          startDate: dateFilter === 'Custom Date Range' ? startDate : undefined,
          endDate:   dateFilter === 'Custom Date Range' ? endDate   : undefined,
          reportType,
        },
      });
      setSummary(data.summary         || {});
      setOrderStatusCounts(data.orderStatusCounts || {});
      setCustomerAnalytics(data.customerAnalytics || {});
      setPaymentAnalytics(data.paymentAnalytics   || {});
      setCharts(data.charts           || {});
      setTableData(data.tableData     || []);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Fetch analytics error:', err);
      setError(err.response?.data?.message || 'Failed to fetch analytics data. Please retry.');
    } finally {
      setLoading(false);
    }
  }, [adminInfo, dateFilter, startDate, endDate, reportType]);

  useEffect(() => {
    if (dateFilter === 'Custom Date Range' && (!startDate || !endDate)) return;
    fetchAnalytics();
  }, [fetchAnalytics]);

  // ── Socket real-time refresh ──────────────────────────────────────────────
  useEffect(() => {
    const socket = window._socket;
    if (!socket) return;
    const refresh = () => setTimeout(fetchAnalytics, 800);
    const events  = ['order_update', 'product_update', 'user_deleted', 'dashboard_stats_update', 'user_updated', 'payment_update'];
    events.forEach(ev => socket.on(ev, refresh));
    return () => events.forEach(ev => socket.off(ev, refresh));
  }, [fetchAnalytics]);

  if (!adminInfo?.token) return <Navigate to="/admin/login" replace />;

  // ── Exports ───────────────────────────────────────────────────────────────
  const exportExcel = () => {
    if (!tableData.length) return;
    const headings = Object.keys(tableData[0]);
    const formatted = tableData.map(row => {
      const nr = {};
      Object.entries(row).forEach(([k, v]) => {
        const lk = k.toLowerCase();
        const isAmt = typeof v === 'number' && (lk.includes('amount') || lk.includes('price') || lk.includes('total') || lk.includes('revenue'));
        nr[k] = isAmt ? `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : v;
      });
      return nr;
    });
    const titleRows = [
      { [headings[0]]: 'TIRUCHENDUR MURUGAN PAZHAMUDHIR SOLAI' },
      { [headings[0]]: `${reportType} | Filter: ${dateFilter}` },
      { [headings[0]]: `Exported: ${new Date().toLocaleString('en-IN')} | Records: ${tableData.length}` },
      {},
    ];
    const ws = XLSX.utils.json_to_sheet([...titleRows, ...formatted], { skipHeader: true });
    XLSX.utils.sheet_add_aoa(ws, [headings], { origin: 'A5' });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, reportType.slice(0, 31));
    XLSX.writeFile(wb, `${reportType.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportCSV = () => {
    if (!tableData.length) return;
    const headings = Object.keys(tableData[0]);
    let csv = '\uFEFF' + headings.join(',') + '\r\n';
    tableData.forEach(row => {
      const line = Object.entries(row).map(([k, v]) => {
        const lk = k.toLowerCase();
        const isAmt = typeof v === 'number' && (lk.includes('amount') || lk.includes('price') || lk.includes('total') || lk.includes('revenue'));
        let val = isAmt ? `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : String(v ?? '');
        if (val.includes(',') || val.includes('"') || val.includes('\n')) val = `"${val.replace(/"/g, '""')}"`;
        return val;
      });
      csv += line.join(',') + '\r\n';
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${reportType.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const exportPDF = () => generateReportPDF(reportType, summary, dateFilter, tableData, adminInfo);

  // ── Computed maximums for bar charts ──────────────────────────────────────
  const maxDailyRev   = Math.max(...(charts.dailySales  || []).map(d => d.revenue  || 0), 1);
  const maxMonthlyRev = Math.max(...(charts.monthlySales || []).map(m => m.revenue || 0), 1);
  const maxCatRev     = Math.max(...(charts.categoryPerformance || []).map(c => c.revenue || 0), 1);

  const CATEGORY_COLORS = [
    '#22C55E','#8B5CF6','#06B6D4','#F59E0B','#EC4899','#F97316','#3B82F6','#EF4444','#10B981','#6366F1'
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">

        {/* ─── Page Header ────────────────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
              <div className="p-2.5 rounded-[16px] bg-white/4 border border-white/8 shadow-sm">
                <BarChart3 className="w-6 h-6 text-[#22C55E]" />
              </div>
              Reports Dashboard
            </h1>
            <p className="text-sm text-[#94A3B8] mt-1">
              Enterprise analytics — every value computed live from MongoDB. No hardcoded numbers.
            </p>
            {lastRefreshed && (
              <p className="text-[11px] text-[#64748B] mt-0.5">
                Last updated: {lastRefreshed.toLocaleTimeString('en-IN')}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={fetchAnalytics}
              className="h-[40px] px-4 bg-white/6 hover:bg-white/10 border border-white/8 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            <button onClick={exportPDF} className="admin-btn-primary h-[40px] px-4 text-xs font-bold flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
            <button onClick={exportExcel} className="h-[40px] px-4 bg-[#22C55E]/15 hover:bg-[#22C55E]/25 text-[#22C55E] font-bold text-xs rounded-xl border border-[#22C55E]/30 flex items-center gap-1.5 transition-all">
              <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
            </button>
            <button onClick={exportCSV} className="h-[40px] px-4 bg-white/6 hover:bg-white/10 text-white font-bold text-xs rounded-xl border border-white/8 flex items-center gap-1.5 transition-all">
              <FileText className="w-3.5 h-3.5" /> CSV
            </button>
          </div>
        </div>

        {/* ─── Filter Toolbar ─────────────────────────────────────────────── */}
        <div className="admin-card space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5 mr-1">
                <Filter className="w-3.5 h-3.5 text-[#22C55E]" /> Period:
              </span>
              {['Today', 'Yesterday', 'This Week', 'Last Week', 'This Month', 'Last Month', 'This Year', 'Custom Date Range'].map(f => (
                <button
                  key={f}
                  onClick={() => setDateFilter(f)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    dateFilter === f
                      ? 'bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white shadow-sm'
                      : 'bg-white/4 text-gray-300 hover:bg-white/8 border border-white/6'
                  }`}
                >{f}</button>
              ))}
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Report:</span>
              <select
                value={reportType}
                onChange={e => setReportType(e.target.value)}
                className="admin-form-input text-xs h-[40px] w-48 px-3 font-bold"
              >
                {['Sales Report', 'Orders Report', 'Inventory Report', 'Customer Report', 'Payment Report', 'Revenue Report'].map(t => (
                  <option key={t} value={t} className="bg-[#081A38] text-white">{t}</option>
                ))}
              </select>
            </div>
          </div>

          {dateFilter === 'Custom Date Range' && (
            <div className="pt-4 border-t border-white/8 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-gray-300">Start:</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="admin-form-input text-xs h-[38px] w-36 px-2" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-gray-300">End:</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="admin-form-input text-xs h-[38px] w-36 px-2" />
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] px-4 py-3 rounded-xl text-sm flex items-center gap-2 font-semibold">
            <ShieldAlert className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 admin-card">
            <Loader2 className="w-10 h-10 text-[#22C55E] animate-spin mb-4" />
            <p className="text-sm font-semibold text-[#94A3B8]">Computing analytics from MongoDB...</p>
            <p className="text-xs text-[#64748B] mt-1">Running 20 parallel aggregation pipelines</p>
          </div>
        ) : (
          <>
            {/* ─── 1. Summary Cards ────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
              {[
                { label: 'Total Revenue',    value: formatCurrency(summary.totalRevenue    || 0), icon: IndianRupee, color: 'text-[#22C55E]',  sub: 'Paid + COD Delivered'   },
                { label: 'Total Orders',     value: summary.totalOrders     || 0,                  icon: ShoppingBag, color: 'text-violet-400', sub: 'Excl. Cancelled'         },
                { label: 'Avg Order Value',  value: formatCurrency(summary.avgOrderValue   || 0), icon: TrendingUp,  color: 'text-cyan-400',   sub: 'Revenue ÷ Orders'        },
                { label: 'Monthly Revenue',  value: formatCurrency(summary.monthlyRevenue  || 0), icon: Calendar,    color: 'text-emerald-400',sub: 'Current month'           },
                { label: 'Pending Payments', value: summary.pendingPayments || 0,                  icon: Clock,       color: 'text-amber-400',  sub: 'Unpaid orders'           },
                { label: 'Total Customers',  value: summary.totalCustomers  || 0,                  icon: Users,       color: 'text-pink-400',   sub: 'Registered users'        },
              ].map((card, i) => {
                const Icon = card.icon;
                return (
                  <div key={i} className="admin-card relative overflow-hidden group cursor-default">
                    <div className={`p-2.5 rounded-[14px] bg-white/4 border border-white/8 ${card.color} w-fit mb-3 group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-black text-white leading-tight">{card.value}</h3>
                    <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wide mt-1">{card.label}</p>
                    <p className="text-[10px] text-[#64748B] mt-0.5">{card.sub}</p>
                  </div>
                );
              })}
            </div>

            {/* ─── 2. Order Status Breakdown ──────────────────────────────── */}
            <div className="admin-card">
              <div className="flex items-center gap-2 mb-5">
                <ShoppingBag className="w-4 h-4 text-[#22C55E]" />
                <h3 className="text-sm font-bold text-white">Order Status Overview</h3>
                <span className="text-[11px] text-[#94A3B8] ml-auto">All-time global counts</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
                {[
                  { key: 'Pending',           icon: Clock,         label: 'Pending'          },
                  { key: 'Accepted',          icon: CheckCircle,   label: 'Accepted'         },
                  { key: 'Out for Delivery',  icon: Truck,         label: 'Out for Delivery' },
                  { key: 'Delivered',         icon: Star,          label: 'Delivered'        },
                  { key: 'Cancelled',         icon: XCircle,       label: 'Cancelled'        },
                ].map(({ key, icon: Icon, label }) => {
                  const cfg   = getStatusStyle(key);
                  const count = orderStatusCounts[key] || 0;
                  const total = Object.values(orderStatusCounts).reduce((a, b) => a + b, 0) || 1;
                  const pct   = Math.round((count / total) * 100);
                  return (
                    <div key={key} className={`p-4 rounded-xl ${cfg.bg} border ${cfg.border}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className={`p-1.5 rounded-lg ${cfg.bg} border ${cfg.border}`}>
                          <Icon className={`w-3.5 h-3.5 ${cfg.text}`} />
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text} border ${cfg.border}`}>{pct}%</span>
                      </div>
                      <p className="text-2xl font-black text-white">{count.toLocaleString()}</p>
                      <p className={`text-[11px] font-bold ${cfg.text} mt-0.5`}>{label}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ─── 3. Daily Sales Chart + Monthly Timeline ─────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Daily Sales — Last 7 Days */}
              <div className="admin-card">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="w-4 h-4 text-[#22C55E]" />
                  <h3 className="text-sm font-bold text-white">Daily Sales — Last 7 Days</h3>
                </div>
                <p className="text-[11px] text-[#94A3B8] mb-5">Revenue, orders & average order value per day</p>

                {/* Bar chart visual */}
                <div className="flex items-end gap-1 h-24 mb-3">
                  {(charts.dailySales || []).map((d, i) => {
                    const pct = Math.max(4, Math.round(((d.revenue || 0) / maxDailyRev) * 100));
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:flex flex-col items-center bg-[#0A1628] border border-white/10 text-[10px] text-white font-bold px-2 py-1 rounded-lg whitespace-nowrap z-10 shadow-xl gap-0.5">
                          <span className="text-[#22C55E]">{formatCurrency(d.revenue)}</span>
                          <span className="text-[#94A3B8]">{d.orders} orders</span>
                          {d.orders > 0 && <span className="text-cyan-400">AOV: {formatCurrency(d.avgOrderValue)}</span>}
                        </div>
                        <div
                          className="w-full rounded-t-[5px] transition-all duration-700"
                          style={{
                            height: `${pct}%`,
                            minHeight: 3,
                            background: d.revenue > 0 ? 'linear-gradient(to top, #16A34A, #22C55E)' : '#1e293b',
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-1 mb-5">
                  {(charts.dailySales || []).map((d, i) => (
                    <div key={i} className="flex-1 text-center">
                      <p className="text-[9px] text-[#64748B] font-bold truncate">
                        {d.name?.split(' ')[0]}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Detailed rows */}
                <div className="space-y-2.5">
                  {(charts.dailySales || []).map((d, i) => {
                    const pct = Math.max(4, Math.round(((d.revenue || 0) / maxDailyRev) * 100));
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-gray-300 truncate">
                            {d.name} <span className="text-[#64748B]">({d.orders} orders)</span>
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            {d.orders > 0 && <span className="text-[10px] text-[#94A3B8]">AOV {formatCurrency(d.avgOrderValue)}</span>}
                            <span className="font-bold text-[#22C55E]">{formatCurrency(d.revenue)}</span>
                          </div>
                        </div>
                        <div className="w-full bg-white/6 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-gradient-to-r from-[#22C55E] to-[#16A34A] h-full rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Monthly Timeline — Last 12 Months */}
              <div className="admin-card">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-[#22C55E]" />
                  <h3 className="text-sm font-bold text-white">Monthly Timeline — Last 12 Months</h3>
                </div>
                <p className="text-[11px] text-[#94A3B8] mb-4">Revenue trend with month-over-month growth %</p>

                {/* Bar chart */}
                <div className="flex items-end gap-0.5 h-20 mb-2">
                  {(charts.monthlySales || []).map((m, i) => {
                    const pct = Math.max(4, Math.round(((m.revenue || 0) / maxMonthlyRev) * 100));
                    const barColor = m.growthPct > 0 ? 'linear-gradient(to top, #16A34A, #22C55E)' : m.growthPct < 0 ? 'linear-gradient(to top, #991B1B, #EF4444)' : '#1e293b';
                    return (
                      <div key={i} className="flex-1 group relative flex flex-col items-center">
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:flex flex-col items-center bg-[#0A1628] border border-white/10 text-[10px] text-white font-bold px-2 py-1 rounded-lg whitespace-nowrap z-10 shadow-xl gap-0.5">
                          <span>{m.name}</span>
                          <span className="text-[#22C55E]">{formatCurrency(m.revenue)}</span>
                          <span className="text-[#94A3B8]">{m.orders} orders</span>
                          <GrowthBadge pct={m.growthPct} />
                        </div>
                        <div
                          className="w-full rounded-t-[3px] transition-all duration-500"
                          style={{ height: `${pct}%`, minHeight: 3, background: barColor }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-0.5 mb-4">
                  {(charts.monthlySales || []).map((m, i) => (
                    <div key={i} className="flex-1 text-center">
                      <p className="text-[8px] text-[#64748B] font-bold">{m.short}</p>
                    </div>
                  ))}
                </div>

                {/* Last 4 months summary cards */}
                <div className="grid grid-cols-2 gap-2">
                  {(charts.monthlySales || []).slice(-4).map((m, i) => (
                    <div key={i} className="p-3 rounded-xl bg-white/4 border border-white/8">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-bold text-[#94A3B8]">{m.name}</p>
                        <GrowthBadge pct={m.growthPct} />
                      </div>
                      <p className="text-sm font-black text-white">{formatCurrency(m.revenue)}</p>
                      <p className="text-[10px] text-[#22C55E] font-semibold mt-0.5">{m.orders} orders</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ─── 4. Top 10 Selling Products ───────────────────────────────── */}
            <div className="admin-card">
              <div className="flex items-center gap-2 mb-5">
                <Star className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Top 10 Selling Products</h3>
                <span className="text-[11px] text-[#94A3B8] ml-auto">Sorted by quantity sold</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/8 text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">
                      <th className="pb-3 pr-4">#</th>
                      <th className="pb-3 pr-4">Product</th>
                      <th className="pb-3 pr-4">Category</th>
                      <th className="pb-3 pr-4 text-right">Qty Sold</th>
                      <th className="pb-3 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {!(charts.topSellingProducts || []).length ? (
                      <tr><td colSpan={5} className="py-10 text-center text-[#94A3B8] font-semibold">No sales data available.</td></tr>
                    ) : (charts.topSellingProducts || []).map((p, i) => (
                      <tr key={i} className="hover:bg-white/4 transition-colors group">
                        <td className="py-3 pr-4">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${i === 0 ? 'bg-amber-400/20 text-amber-400' : i === 1 ? 'bg-slate-400/20 text-slate-300' : i === 2 ? 'bg-orange-400/20 text-orange-400' : 'bg-white/6 text-[#94A3B8]'}`}>
                            {i + 1}
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2.5">
                            {p.image ? (
                              <img
                                src={`http://localhost:5000${p.image}`}
                                alt={p.name}
                                className="w-8 h-8 rounded-lg object-cover border border-white/8 shrink-0"
                                onError={e => { e.target.style.display = 'none'; }}
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-white/6 border border-white/8 flex items-center justify-center shrink-0">
                                <Package className="w-4 h-4 text-[#64748B]" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-bold text-white truncate max-w-[160px]">{p.name}</p>
                              {p.tamilName && <p className="text-[10px] text-[#64748B] truncate">{p.tamilName}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="px-2 py-0.5 bg-white/6 border border-white/8 rounded-md text-[10px] text-[#94A3B8] font-bold capitalize">{p.category || '–'}</span>
                        </td>
                        <td className="py-3 pr-4 text-right font-black text-white">
                          {(p.sold || 0).toLocaleString()}
                        </td>
                        <td className="py-3 text-right font-black text-[#22C55E]">
                          {formatCurrency(p.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ─── 5. Top Categories ────────────────────────────────────────── */}
            <div className="admin-card">
              <div className="flex items-center gap-2 mb-5">
                <Layers className="w-4 h-4 text-violet-400" />
                <h3 className="text-sm font-bold text-white">Category Performance</h3>
                <span className="text-[11px] text-[#94A3B8] ml-auto">Revenue & units sold per category</span>
              </div>
              {!(charts.categoryPerformance || []).length ? (
                <p className="text-center text-[#94A3B8] py-8 text-sm font-semibold">No category data.</p>
              ) : (
                <div className="space-y-3.5">
                  {(charts.categoryPerformance || []).map((c, i) => {
                    const pct   = Math.max(4, Math.round(((c.revenue || 0) / maxCatRev) * 100));
                    const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
                    return (
                      <div key={i} className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-bold capitalize" style={{ color }}>{c.category}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-[#94A3B8]">{(c.sold || 0).toLocaleString()} units</span>
                            <span className="font-black text-white">{formatCurrency(c.revenue)}</span>
                          </div>
                        </div>
                        <div className="w-full bg-white/6 h-2 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ─── 6. Customer Analytics + Payment Analytics ───────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Customer Analytics */}
              <div className="admin-card">
                <div className="flex items-center gap-2 mb-5">
                  <Users className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white">Customer Analytics</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Total Customers',  value: customerAnalytics.total        || 0, icon: Users,     color: 'text-cyan-400',   bg: 'bg-cyan-500/10',   border: 'border-cyan-500/20'   },
                    { label: 'Returning',         value: customerAnalytics.returning    || 0, icon: UserCheck, color: 'text-[#22C55E]',  bg: 'bg-[#22C55E]/10', border: 'border-[#22C55E]/20'  },
                    { label: 'New This Month',    value: customerAnalytics.newThisMonth || 0, icon: UserPlus,  color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
                    { label: 'Registered Today',  value: customerAnalytics.newToday    || 0, icon: Calendar,  color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20'  },
                  ].map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <div key={i} className={`p-4 rounded-xl ${item.bg} border ${item.border}`}>
                        <Icon className={`w-4 h-4 ${item.color} mb-2`} />
                        <p className="text-2xl font-black text-white">{item.value.toLocaleString()}</p>
                        <p className={`text-[11px] font-bold ${item.color} mt-0.5`}>{item.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Payment Analytics — COD */}
              <div className="admin-card">
                <div className="flex items-center gap-2 mb-5">
                  <CreditCard className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">Payment Analytics — Cash on Delivery</h3>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {[
                    { label: 'Total COD',     value: paymentAnalytics.codTotal     || 0, icon: ShoppingCart, color: 'text-white',        bg: 'bg-white/6',        border: 'border-white/10'         },
                    { label: 'Pending COD',   value: paymentAnalytics.codPending   || 0, icon: Clock,        color: 'text-amber-400',    bg: 'bg-amber-500/10',   border: 'border-amber-500/20'     },
                    { label: 'Delivered COD', value: paymentAnalytics.codDelivered || 0, icon: CheckCircle,  color: 'text-[#22C55E]',    bg: 'bg-[#22C55E]/10',  border: 'border-[#22C55E]/20'     },
                    { label: 'Cancelled COD', value: paymentAnalytics.codCancelled || 0, icon: XCircle,      color: 'text-[#EF4444]',    bg: 'bg-[#EF4444]/10',  border: 'border-[#EF4444]/20'     },
                  ].map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <div key={i} className={`p-4 rounded-xl ${item.bg} border ${item.border}`}>
                        <Icon className={`w-4 h-4 ${item.color} mb-2`} />
                        <p className="text-2xl font-black text-white">{item.value.toLocaleString()}</p>
                        <p className={`text-[11px] font-bold ${item.color} mt-0.5`}>{item.label}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="p-3 rounded-xl bg-[#22C55E]/8 border border-[#22C55E]/20 flex items-center justify-between">
                  <span className="text-xs font-bold text-[#94A3B8]">COD Revenue Collected (Delivered orders)</span>
                  <span className="text-sm font-black text-[#22C55E]">{formatCurrency(paymentAnalytics.codRevenue || 0)}</span>
                </div>
              </div>
            </div>

            {/* ─── 7. Low Stock + Out of Stock ─────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Low Stock (stock ≤ 5) */}
              <div className="admin-card">
                <div className="flex items-center gap-2 mb-5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">Low Stock Alert</h3>
                  <span className="ml-auto text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                    {(charts.lowStock || []).length} products
                  </span>
                </div>
                {!(charts.lowStock || []).length ? (
                  <div className="py-8 text-center">
                    <CheckCircle className="w-8 h-8 text-[#22C55E] mx-auto mb-2" />
                    <p className="text-sm font-semibold text-[#94A3B8]">All products have sufficient stock.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto admin-scroll pr-1">
                    {(charts.lowStock || []).map((p, i) => {
                      const cfg = getStatusStyle(p.status || 'Low');
                      return (
                        <div key={i} className={`flex items-center justify-between p-3 rounded-xl ${cfg.bg} border ${cfg.border}`}>
                          <div className="min-w-0">
                            <p className="font-bold text-white text-xs truncate">{p.name}</p>
                            {p.tamilName && <p className="text-[10px] text-[#64748B] truncate">{p.tamilName}</p>}
                            <p className="text-[10px] text-[#94A3B8] capitalize">{p.category}</p>
                          </div>
                          <div className="text-right shrink-0 ml-3">
                            <p className={`text-sm font-black ${cfg.text}`}>{p.stock} {p.unit}</p>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
                              {p.status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Out of Stock (stock = 0) */}
              <div className="admin-card">
                <div className="flex items-center gap-2 mb-5">
                  <AlertCircle className="w-4 h-4 text-[#EF4444]" />
                  <h3 className="text-sm font-bold text-white">Out of Stock</h3>
                  <span className="ml-auto text-[11px] font-bold text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/20 px-2 py-0.5 rounded-full">
                    {(charts.outOfStock || []).length} products
                  </span>
                </div>
                {!(charts.outOfStock || []).length ? (
                  <div className="py-8 text-center">
                    <CheckCircle className="w-8 h-8 text-[#22C55E] mx-auto mb-2" />
                    <p className="text-sm font-semibold text-[#94A3B8]">No products are out of stock.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto admin-scroll pr-1">
                    {(charts.outOfStock || []).map((p, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-[#EF4444]/8 border border-[#EF4444]/20">
                        <div className="min-w-0">
                          <p className="font-bold text-white text-xs truncate">{p.name}</p>
                          {p.tamilName && <p className="text-[10px] text-[#64748B] truncate">{p.tamilName}</p>}
                          <p className="text-[10px] text-[#94A3B8] capitalize">{p.category}</p>
                        </div>
                        <span className="text-[10px] font-black text-[#EF4444] bg-[#EF4444]/15 border border-[#EF4444]/30 px-2 py-0.5 rounded-md shrink-0 ml-3">
                          OUT
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ─── 8. Recent Orders ─────────────────────────────────────────── */}
            <div className="admin-table-container">
              <div className="flex items-center justify-between px-6 py-5 admin-table-header">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Eye className="w-4 h-4 text-[#22C55E]" /> Recent Orders
                  </h3>
                  <p className="text-[11px] text-[#94A3B8] mt-0.5">Latest 10 orders across all statuses</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#081A38]">
                    <tr className="border-b border-white/8 text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">
                      {['Invoice', 'Customer', 'Amount', 'Payment Status', 'Order Status', 'Date'].map(h => (
                        <th key={h} className="px-6 py-4">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {!(charts.recentOrders || []).length ? (
                      <tr><td colSpan={6} className="px-6 py-10 text-center text-[#94A3B8] font-semibold">No recent orders.</td></tr>
                    ) : (charts.recentOrders || []).map((o, i) => {
                      const sCfg = getStatusStyle(o.status);
                      const pCfg = getStatusStyle(o.paymentStatus);
                      return (
                        <tr key={i} className="hover:bg-white/4 transition-colors">
                          <td className="px-6 py-3.5 font-mono font-bold text-[#22C55E] text-[11px]">{o.invoiceNumber}</td>
                          <td className="px-6 py-3.5">
                            <p className="font-bold text-white truncate max-w-[120px]">{o.customer}</p>
                            <p className="text-[10px] text-[#64748B]">{o.phone}</p>
                          </td>
                          <td className="px-6 py-3.5 font-black text-white">{formatCurrency(o.amount)}</td>
                          <td className="px-6 py-3.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${pCfg.bg} ${pCfg.text} border ${pCfg.border}`}>{o.paymentStatus}</span>
                          </td>
                          <td className="px-6 py-3.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${sCfg.bg} ${sCfg.text} border ${sCfg.border}`}>{o.status}</span>
                          </td>
                          <td className="px-6 py-3.5 text-[#94A3B8]">{o.date}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ─── 9. Export Table Preview ──────────────────────────────────── */}
            <div className="admin-table-container">
              <div className="flex items-center justify-between px-6 py-5 admin-table-header">
                <div>
                  <h3 className="text-sm font-bold text-white">{reportType} — Export Preview</h3>
                  <p className="text-[11px] text-[#94A3B8] mt-0.5">
                    Showing records for: <strong className="text-white">{dateFilter}</strong> · Exact same data in PDF/Excel/CSV exports
                  </p>
                </div>
                <span className="text-xs font-bold text-[#22C55E] bg-white/6 border border-white/8 px-3.5 py-1.5 rounded-full">
                  {tableData.length} records
                </span>
              </div>
              <div className="overflow-x-auto max-h-[55vh] admin-scroll">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10 bg-[#081A38]">
                    <tr className="border-b border-white/8 text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">
                      {tableData.length > 0 && Object.keys(tableData[0]).map(k => (
                        <th key={k} className="px-6 py-4 whitespace-nowrap">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs">
                    {!tableData.length ? (
                      <tr>
                        <td colSpan={10} className="px-6 py-12 text-center text-sm font-semibold text-[#94A3B8]">
                          No data available for the selected filter and report type.
                        </td>
                      </tr>
                    ) : tableData.map((row, ri) => (
                      <tr key={ri} className="hover:bg-white/4 transition-colors">
                        {Object.entries(row).map(([k, v], vi) => {
                          const lk = k.toLowerCase();
                          const isAmount = typeof v === 'number' && (lk.includes('amount') || lk.includes('price') || lk.includes('total') || lk.includes('revenue'));
                          const isStatus = lk.includes('status');
                          const cfg = isStatus ? getStatusStyle(String(v)) : null;
                          return (
                            <td key={vi} className="px-6 py-3.5 font-medium whitespace-nowrap">
                              {isAmount ? (
                                <span className="font-black text-[#22C55E]">{formatCurrency(v)}</span>
                              ) : isStatus && cfg ? (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
                                  {String(v)}
                                </span>
                              ) : (
                                <span className="text-white">{String(v ?? '')}</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default Reports;
