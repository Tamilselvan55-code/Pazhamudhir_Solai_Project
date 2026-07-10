import { API_BASE as config_API_BASE, API_URL as config_API_URL } from '../../config/api';
import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { 
  Database, Download, Upload, RefreshCw, CheckCircle, AlertTriangle, 
  FileText, Users, ShoppingBag, Folder, Bell, Activity, Zap, Loader2
} from 'lucide-react';
import AdminLayout from '../../components/Admin/AdminLayout';
import useAuthStore from '../../store/useAuthStore';
import axios from 'axios';
import useModal from '../../hooks/useModal';

const DatabaseController = () => {
  const { adminInfo } = useAuthStore();
  const { adminAlert, adminConfirm } = useModal();

  const [dbStatus, setDbStatus] = useState(null);
  const [backups, setBackups] = useState([]);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingBackups, setLoadingBackups] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [uploadFile, setUploadFile] = useState(null);
  const [importFile, setImportFile] = useState(null);

  const fetchStatus = async () => {
    try {
      setLoadingStatus(true);
      const { data } = await axios.get(`${config_API_BASE}/admin/database/status`, {
        headers: { Authorization: `Bearer ${adminInfo.token}` }
      });
      setDbStatus(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStatus(false);
    }
  };

  const fetchBackups = async () => {
    try {
      setLoadingBackups(true);
      const { data } = await axios.get(`${config_API_BASE}/admin/database/backups`, {
        headers: { Authorization: `Bearer ${adminInfo.token}` }
      });
      setBackups(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBackups(false);
    }
  };

  useEffect(() => {
    if (adminInfo) {
      fetchStatus();
      fetchBackups();
    }
  }, [adminInfo]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreateBackup = async () => {
    setActionLoading(true);
    try {
      const { data } = await axios.post(`${config_API_BASE}/admin/database/backup`, {}, {
        headers: { Authorization: `Bearer ${adminInfo.token}` }
      });
      adminAlert('success', 'Backup Created', data.message || 'Backup file successfully created!');
      fetchBackups();
      fetchStatus();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create database backup.';
      adminAlert('error', 'Backup Failed', msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadBackup = async (filename) => {
    try {
      const response = await axios.get(`${config_API_BASE}/admin/database/backups/download/${filename}`, {
        headers: { Authorization: `Bearer ${adminInfo.token}` },
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      adminAlert('error', 'Download Failed', 'Could not download the backup file.');
    }
  };

  const handleRestoreBackup = async (filename) => {
    adminConfirm({
      title: 'Restore Database?',
      message: `Are you sure you want to restore database from backup: ${filename}? This will overwrite all current users, products, categories, and settings. This action is irreversible.`,
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const { data } = await axios.post(`${config_API_BASE}/admin/database/backups/restore/${filename}`, {}, {
            headers: { Authorization: `Bearer ${adminInfo.token}` }
          });
          adminAlert('success', 'Restore Successful', data.message || 'Database restored successfully!');
          fetchStatus();
        } catch (err) {
          const msg = err.response?.data?.message || 'Failed to restore database backup.';
          adminAlert('error', 'Restore Failed', msg);
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  const handleOptimizeDb = async () => {
    setOptimizing(true);
    try {
      const { data } = await axios.post(`${config_API_BASE}/admin/database/optimize`, {}, {
        headers: { Authorization: `Bearer ${adminInfo.token}` }
      });
      adminAlert(
        'success', 
        'Optimization Completed', 
        `Database optimized successfully!\n\nDetails:\n${data.details?.join('\n') || 'All collections indexed.'}`
      );
      fetchStatus();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to optimize database.';
      adminAlert('error', 'Optimization Failed', msg);
    } finally {
      setOptimizing(false);
    }
  };

  const handleUploadRestore = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      adminAlert('warning', 'No File Selected', 'Please choose a backup JSON file to upload.');
      return;
    }

    adminConfirm({
      title: 'Upload and Restore Database?',
      message: 'Are you sure you want to upload this file and restore? This will reset all current database collections.',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const formData = new FormData();
          formData.append('file', uploadFile);

          const { data } = await axios.post(`${config_API_BASE}/admin/database/backups/upload-restore`, formData, {
            headers: { 
              Authorization: `Bearer ${adminInfo.token}`,
              'Content-Type': 'multipart/form-data'
            }
          });
          adminAlert('success', 'Upload Restore Successful', data.message || 'Database successfully restored from uploaded file!');
          setUploadFile(null);
          fetchStatus();
          fetchBackups();
        } catch (err) {
          const msg = err.response?.data?.message || 'Upload restore failed.';
          adminAlert('error', 'Upload Restore Failed', msg);
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  const handleDatabaseImport = async (e) => {
    e.preventDefault();
    if (!importFile) {
      adminAlert('warning', 'No File Selected', 'Please select a database import JSON file.');
      return;
    }

    setActionLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const { data } = await axios.post(`${config_API_BASE}/admin/database/database-import`, formData, {
        headers: { 
          Authorization: `Bearer ${adminInfo.token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      adminAlert('success', 'Import Merged', data.message || 'Database records successfully merged and imported!');
      setImportFile(null);
      fetchStatus();
    } catch (err) {
      const msg = err.response?.data?.message || 'Database import merge failed.';
      adminAlert('error', 'Import Failed', msg);
    } finally {
      setActionLoading(false);
    }
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
                <Database className="w-6 h-6 text-[#22C55E]" />
              </div>
              Database controller
            </h1>
            <p className="text-sm text-[#94A3B8] mt-1">Manage Mongo database status, perform system optimization, download backups, and import records.</p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleOptimizeDb}
              disabled={optimizing || actionLoading}
              className="admin-btn-secondary h-[48px] px-5 flex items-center gap-2"
            >
              {optimizing ? <Loader2 className="w-4 h-4 animate-spin text-[#22C55E]" /> : <Zap className="w-4 h-4 text-[#F59E0B]" />}
              Optimize DB
            </button>
            <button
              onClick={handleCreateBackup}
              disabled={actionLoading || optimizing}
              className="admin-btn-primary h-[48px] px-6 flex items-center gap-2"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Create Backup
            </button>
          </div>
        </div>

        {/* ─── Database Status Counts Grid ───────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
          {loadingStatus ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="admin-card animate-pulse py-8 flex flex-col items-center">
                <div className="w-8 h-8 bg-white/10 rounded-full mb-3"></div>
                <div className="h-4 bg-white/10 rounded w-16 mb-2"></div>
                <div className="h-3 bg-white/10 rounded w-10"></div>
              </div>
            ))
          ) : (
            dbStatus && [
              { label: 'Customers', count: dbStatus.counts?.users ?? 0, icon: Users, color: '#3B82F6' },
              { label: 'Products', count: dbStatus.counts?.products ?? 0, icon: ShoppingBag, color: '#10B981' },
              { label: 'Orders Placed', count: dbStatus.counts?.orders ?? 0, icon: FileText, color: '#F59E0B' },
              { label: 'Categories', count: dbStatus.counts?.categories ?? 0, icon: Folder, color: '#8B5CF6' },
              { label: 'System Logs', count: dbStatus.counts?.auditLogs ?? 0, icon: Activity, color: '#EF4444' }
            ].map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div key={idx} className="admin-card flex flex-col items-center justify-center text-center py-6">
                  <div className="p-3 rounded-full mb-3" style={{ backgroundColor: `${stat.color}15`, border: `1px solid ${stat.color}30` }}>
                    <Icon className="w-6 h-6" style={{ color: stat.color }} />
                  </div>
                  <h3 className="text-2xl font-black text-white">{stat.count}</h3>
                  <p className="text-xs text-[#94A3B8] font-bold uppercase tracking-wider mt-1">{stat.label}</p>
                </div>
              );
            })
          )}
        </div>

        {/* Database Status Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Backups List Table */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-[#22C55E]" /> Backups Archive
              </h2>
              <button onClick={fetchBackups} className="p-2 bg-white/4 hover:bg-white/8 border border-white/8 rounded-lg text-white">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="admin-table-container">
              {loadingBackups ? (
                <div className="flex flex-col items-center justify-center py-20 text-[#94A3B8]">
                  <Loader2 className="w-8 h-8 animate-spin text-[#22C55E] mb-2" />
                  <p className="text-xs font-semibold">Retrieving system backups...</p>
                </div>
              ) : backups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-[#94A3B8]">
                  <AlertTriangle className="w-8 h-8 text-[#F59E0B] mb-2" />
                  <p className="text-xs font-semibold">No system backups found. Click 'Create Backup' to start.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="admin-table-header text-xs text-[#94A3B8] font-bold uppercase tracking-wider">
                      <th className="py-4 px-5">Backup Filename</th>
                      <th className="py-4 px-5">Created At</th>
                      <th className="py-4 px-5">File Size</th>
                      <th className="py-4 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backups.map((bk, idx) => (
                      <tr key={idx} className="admin-table-row text-sm text-white">
                        <td className="py-3.5 px-5 font-semibold max-w-[200px] truncate">{bk.filename}</td>
                        <td className="py-3.5 px-5 text-[#94A3B8] text-xs font-medium">
                          {new Date(bk.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-5 font-mono text-xs text-[#22C55E]">{bk.size}</td>
                        <td className="py-3.5 px-5 text-right space-x-2">
                          <button
                            onClick={() => handleDownloadBackup(bk.filename)}
                            className="p-2 bg-white/4 hover:bg-white/8 rounded-lg text-white transition-colors"
                            title="Download JSON File"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRestoreBackup(bk.filename)}
                            disabled={actionLoading}
                            className="px-3 py-1.5 bg-[#22C55E]/10 hover:bg-[#22C55E]/20 text-[#22C55E] rounded-lg text-xs font-bold transition-colors"
                          >
                            Restore
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Import / Upload Restore Side Column */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-[#22C55E]" /> Import & Upload
            </h2>

            {/* Upload & Overwrite Restore */}
            <div className="admin-card space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Upload & Restore Overwrite</h3>
              <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                Choose a locally saved database JSON backup to upload. This will completely wipe all current collections and replace them.
              </p>
              <form onSubmit={handleUploadRestore} className="space-y-3">
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  className="w-full text-xs text-[#94A3B8] border border-white/8 bg-white/2 rounded-xl p-3 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#22C55E]/10 file:text-[#22C55E] hover:file:bg-[#22C55E]/20 file:cursor-pointer"
                />
                <button
                  type="submit"
                  disabled={actionLoading || !uploadFile}
                  className="w-full h-[44px] bg-[#EF4444]/10 hover:bg-[#EF4444]/20 border border-[#EF4444]/20 text-[#EF4444] rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" /> Upload & Restore
                </button>
              </form>
            </div>

            {/* Import & Merge */}
            <div className="admin-card space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Merge Import JSON Records</h3>
              <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                Import products or categories from a JSON backup. This does not erase other collections, but merges records by unique identifiers (e.g. SKU/name).
              </p>
              <form onSubmit={handleDatabaseImport} className="space-y-3">
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => setImportFile(e.target.files[0])}
                  className="w-full text-xs text-[#94A3B8] border border-white/8 bg-white/2 rounded-xl p-3 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#22C55E]/10 file:text-[#22C55E] hover:file:bg-[#22C55E]/20 file:cursor-pointer"
                />
                <button
                  type="submit"
                  disabled={actionLoading || !importFile}
                  className="w-full h-[44px] bg-[#22C55E]/10 hover:bg-[#22C55E]/20 border border-[#22C55E]/20 text-[#22C55E] rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <Database className="w-4 h-4" /> Merge Import Records
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default DatabaseController;
