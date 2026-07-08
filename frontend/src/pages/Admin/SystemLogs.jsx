import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { 
  Activity, Search, Filter, RefreshCw, Calendar, User, 
  Terminal, ShieldAlert, CheckCircle, ChevronLeft, ChevronRight, Loader2
} from 'lucide-react';
import AdminLayout from '../../components/Admin/AdminLayout';
import useAuthStore from '../../store/useAuthStore';
import axios from 'axios';
import useModal from '../../hooks/useModal';

const SystemLogs = () => {
  const { adminInfo } = useAuthStore();
  const { adminAlert } = useModal();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = async () => {
    if (!adminInfo) return;
    setLoading(true);
    try {
      const { data } = await axios.get('http://localhost:5000/api/admin/system-logs', {
        params: { type, search, page, limit },
        headers: { Authorization: `Bearer ${adminInfo.token}` }
      });
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error(err);
      adminAlert('error', 'Error', 'Failed to retrieve system logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [adminInfo, type, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const getActionStyle = (action) => {
    const act = action?.toLowerCase() || '';
    if (act.includes('login')) return 'text-[#10B981] bg-[#10B981]/10 border-[#10B981]/20';
    if (act.includes('error') || act.includes('fail')) return 'text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/20';
    if (act.includes('delete') || act.includes('remove')) return 'text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/20';
    if (act.includes('create') || act.includes('add')) return 'text-[#3B82F6] bg-[#3B82F6]/10 border-[#3B82F6]/20';
    if (act.includes('update') || act.includes('edit')) return 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/20';
    return 'text-white bg-white/5 border-white/10';
  };

  if (!adminInfo) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        
        {/* ─── Page Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
              <div className="p-2.5 rounded-[16px] bg-white/4 border border-white/8 shadow-sm">
                <Activity className="w-6 h-6 text-[#22C55E]" />
              </div>
              System Audit Logs
            </h1>
            <p className="text-sm text-[#94A3B8] mt-1">Audit administrative operations, customer authentication updates, catalogue modifications, and server-side logs.</p>
          </div>
          
          <button
            onClick={() => { setPage(1); fetchLogs(); }}
            className="admin-btn-secondary h-[48px] px-5 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Logs
          </button>
        </div>

        {/* ─── Filter & Search Form ────────────────────────────────────── */}
        <div className="admin-card">
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-4 items-end">
            
            {/* Type Filter */}
            <div className="w-full md:w-1/4">
              <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" /> Filter Log Type
              </label>
              <select
                value={type}
                onChange={(e) => { setType(e.target.value); setPage(1); }}
                className="admin-form-input text-xs font-bold bg-[#081A38]"
              >
                <option value="all">All Events</option>
                <option value="admin-login">Admin Logins</option>
                <option value="customer-login">Customer Logins</option>
                <option value="order">Order Management</option>
                <option value="product">Catalogue Changes</option>
                <option value="category">Category Changes</option>
                <option value="error">Database/System Errors</option>
              </select>
            </div>

            {/* Keyword Search */}
            <div className="w-full md:w-3/5">
              <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5" /> Fulltext Search
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="admin-form-input text-xs font-semibold pl-10"
                  placeholder="Search by Admin Name, action, or target element..."
                />
                <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Search Button */}
            <button
              type="submit"
              className="admin-btn-primary h-[52px] w-full md:w-auto px-6 text-xs font-bold"
            >
              Search
            </button>
          </form>
        </div>

        {/* ─── Logs Table View ─────────────────────────────────────────── */}
        <div className="admin-table-container">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-[#94A3B8]">
              <Loader2 className="w-10 h-10 animate-spin text-[#22C55E] mb-4" />
              <p className="text-sm font-semibold">Loading system audit records...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-[#94A3B8]">
              <Terminal className="w-12 h-12 text-white/10 mb-4" />
              <p className="text-sm font-semibold">No audit logs found matching criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="admin-table-header text-xs text-[#94A3B8] font-bold uppercase tracking-wider">
                    <th className="py-4 px-5">Timestamp</th>
                    <th className="py-4 px-5">Operator</th>
                    <th className="py-4 px-5">Action Performed</th>
                    <th className="py-4 px-5">Target Entity</th>
                    <th className="py-4 px-5">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log._id} className="admin-table-row text-sm text-white">
                      <td className="py-3.5 px-5 font-semibold font-mono text-xs text-[#94A3B8]">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(log.createdAt).toLocaleString()}
                        </div>
                      </td>

                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-white uppercase font-bold shrink-0">
                            {log.adminName?.slice(0, 1) || 'S'}
                          </div>
                          <span className="font-bold text-xs">{log.adminName || 'System'}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-5">
                        <span className={`px-2 py-1 rounded text-[11px] font-bold uppercase border ${getActionStyle(log.action)}`}>
                          {log.action}
                        </span>
                      </td>

                      <td className="py-3.5 px-5">
                        <div className="text-xs">
                          <p className="text-[#94A3B8] font-semibold">{log.targetType || 'N/A'}</p>
                          <p className="font-bold text-white mt-0.5 truncate max-w-[150px]">{log.targetName || '-'}</p>
                        </div>
                      </td>

                      <td className="py-3.5 px-5 max-w-[300px]">
                        {log.newValue ? (
                          <pre className="text-[11px] font-mono text-[#22C55E] bg-black/35 p-2 rounded-lg max-h-[80px] overflow-y-auto admin-scroll">
                            {typeof log.newValue === 'object' ? JSON.stringify(log.newValue, null, 2) : String(log.newValue)}
                          </pre>
                        ) : log.oldValue ? (
                          <pre className="text-[11px] font-mono text-[#94A3B8] bg-black/25 p-2 rounded-lg max-h-[80px] overflow-y-auto admin-scroll">
                            {typeof log.oldValue === 'object' ? JSON.stringify(log.oldValue, null, 2) : String(log.oldValue)}
                          </pre>
                        ) : (
                          <span className="text-xs text-[#94A3B8] font-medium">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ─── Pagination Footer ────────────────────────────────────────── */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between py-4 bg-white/2 border border-white/8 rounded-2xl px-5 text-sm">
            <span className="text-xs text-[#94A3B8] font-bold uppercase tracking-wider">
              Showing Page {page} of {totalPages} ({total} entries)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-2 border border-white/8 rounded-xl bg-white/4 hover:bg-white/8 text-white transition-colors disabled:opacity-30"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="p-2 border border-white/8 rounded-xl bg-white/4 hover:bg-white/8 text-white transition-colors disabled:opacity-30"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default SystemLogs;
