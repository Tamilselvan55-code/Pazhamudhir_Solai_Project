import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { 
  Users, UserPlus, Shield, Check, Loader2, Save, Trash2, 
  AlertTriangle, Key, Mail, Edit, X, Lock, CheckSquare
} from 'lucide-react';
import AdminLayout from '../../components/Admin/AdminLayout';
import useAuthStore from '../../store/useAuthStore';
import axios from 'axios';
import useModal from '../../hooks/useModal';

const StaffManagement = () => {
  const { adminInfo } = useAuthStore();
  const { adminAlert, adminConfirm } = useModal();

  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Staff',
    permissions: {
      products: true,
      orders: true,
      reports: false,
      settings: false,
      users: false,
      notifications: true
    }
  });

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('http://localhost:5000/api/admin/staff', {
        headers: { Authorization: `Bearer ${adminInfo.token}` }
      });
      setStaffList(data);
    } catch (err) {
      console.error(err);
      adminAlert('error', 'Error', 'Failed to fetch staff members.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminInfo) {
      fetchStaff();
    }
  }, [adminInfo]); // eslint-disable-line react-hooks/exhaustive-deps

  const openAddModal = () => {
    setEditingStaff(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'Staff',
      permissions: {
        products: true,
        orders: true,
        reports: false,
        settings: false,
        users: false,
        notifications: true
      }
    });
    setShowModal(true);
  };

  const openEditModal = (staff) => {
    setEditingStaff(staff);
    setFormData({
      name: staff.name || '',
      email: staff.email || '',
      password: '', // blank by default, only updated if filled
      role: staff.role || 'Staff',
      permissions: staff.permissions ? {
        products: !!staff.permissions.products,
        orders: !!staff.permissions.orders,
        reports: !!staff.permissions.reports,
        settings: !!staff.permissions.settings,
        users: !!staff.permissions.users,
        notifications: !!staff.permissions.notifications,
      } : {
        products: true,
        orders: true,
        reports: false,
        settings: false,
        users: false,
        notifications: true
      }
    });
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePermissionChange = (perm) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [perm]: !prev.permissions[perm]
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      adminAlert('warning', 'Validation', 'Name and Email are required.');
      return;
    }
    if (!editingStaff && !formData.password.trim()) {
      adminAlert('warning', 'Validation', 'Password is required for new staff accounts.');
      return;
    }

    setSaving(true);
    try {
      if (editingStaff) {
        // Edit staff member
        const updatePayload = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          permissions: formData.permissions
        };
        if (formData.password.trim() !== '') {
          updatePayload.password = formData.password;
        }

        await axios.put(`http://localhost:5000/api/admin/staff/${editingStaff._id}`, updatePayload, {
          headers: { Authorization: `Bearer ${adminInfo.token}` }
        });
        adminAlert('success', 'Staff Updated', 'Staff credentials and roles successfully updated.');
      } else {
        // Add staff member
        await axios.post('http://localhost:5000/api/admin/staff', formData, {
          headers: { Authorization: `Bearer ${adminInfo.token}` }
        });
        adminAlert('success', 'Staff Added', 'New staff account successfully created!');
      }
      setShowModal(false);
      fetchStaff();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save staff credentials.';
      adminAlert('error', 'Action Failed', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStaff = async (staffId, staffName) => {
    adminConfirm({
      title: 'Remove Staff Account?',
      message: `Are you sure you want to permanently delete administrative account for: ${staffName}? They will instantly lose all access to the system.`,
      onConfirm: async () => {
        try {
          await axios.delete(`http://localhost:5000/api/admin/staff/${staffId}`, {
            headers: { Authorization: `Bearer ${adminInfo.token}` }
          });
          adminAlert('success', 'Staff Deleted', 'Administrative account removed successfully.');
          fetchStaff();
        } catch (err) {
          const msg = err.response?.data?.message || 'Failed to remove staff account.';
          adminAlert('error', 'Action Failed', msg);
        }
      }
    });
  };

  if (!adminInfo) {
    return <Navigate to="/admin/login" replace />;
  }

  // Helper to check roles colors
  const getRoleBadgeStyle = (role) => {
    if (role === 'Super Admin' || role === 'SuperAdmin') {
      return 'bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20';
    }
    if (role === 'Admin') {
      return 'bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/20';
    }
    if (role === 'Manager') {
      return 'bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20';
    }
    return 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20';
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        
        {/* ─── Page Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
              <div className="p-2.5 rounded-[16px] bg-white/4 border border-white/8 shadow-sm">
                <Users className="w-6 h-6 text-[#22C55E]" />
              </div>
              Role & Staff Management
            </h1>
            <p className="text-sm text-[#94A3B8] mt-1">Assign administrative access levels, control feature permissions, and audit staff accounts.</p>
          </div>
          
          <button
            onClick={openAddModal}
            className="admin-btn-primary h-[48px] px-6 flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Add Staff Member
          </button>
        </div>

        {/* ─── Staff Cards / Table ─────────────────────────────────────── */}
        <div className="admin-table-container">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-[#94A3B8]">
              <Loader2 className="w-10 h-10 animate-spin text-[#22C55E] mb-4" />
              <p className="text-sm font-semibold">Loading staff credentials...</p>
            </div>
          ) : staffList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-[#94A3B8]">
              <Users className="w-12 h-12 text-white/10 mb-4" />
              <p className="text-sm font-semibold">No staff records found.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="admin-table-header text-xs text-[#94A3B8] font-bold uppercase tracking-wider">
                  <th className="py-4 px-5">Staff Member</th>
                  <th className="py-4 px-5">Access Level / Role</th>
                  <th className="py-4 px-5">Assigned Permissions</th>
                  <th className="py-4 px-5">Created Date</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map((st) => (
                  <tr key={st._id} className="admin-table-row text-sm text-white">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/20 flex items-center justify-center font-black text-xs text-[#22C55E] uppercase">
                          {st.name?.slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-bold text-white leading-none">{st.name}</p>
                          <p className="text-xs text-[#94A3B8] mt-1 flex items-center gap-1"><Mail className="w-3 h-3" /> {st.email}</p>
                        </div>
                      </div>
                    </td>
                    
                    <td className="py-4 px-5">
                      <span className={`px-2.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider ${getRoleBadgeStyle(st.role)}`}>
                        {st.role}
                      </span>
                    </td>

                    <td className="py-4 px-5">
                      <div className="flex flex-wrap gap-1.5 max-w-[300px]">
                        {st.role === 'Super Admin' || st.role === 'SuperAdmin' ? (
                          <span className="px-2 py-0.5 rounded bg-white/4 text-white text-[10px] font-bold uppercase border border-white/8">ALL ACCESS</span>
                        ) : st.permissions ? (
                          Object.entries(st.permissions)
                            .filter(([_, allowed]) => allowed)
                            .map(([name]) => (
                              <span key={name} className="px-2 py-0.5 rounded bg-white/4 text-[#22C55E] text-[10px] font-bold uppercase border border-white/8">
                                {name}
                              </span>
                            ))
                        ) : (
                          <span className="text-xs text-[#94A3B8]">None</span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-5 text-xs text-[#94A3B8] font-semibold">
                      {new Date(st.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-4 px-5 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(st)}
                        className="p-2 hover:bg-white/6 rounded-lg text-[#3B82F6] transition-colors"
                        title="Edit Staff Member"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      
                      {st._id !== adminInfo.id && st.role !== 'Super Admin' && st.role !== 'SuperAdmin' && (
                        <button
                          onClick={() => handleDeleteStaff(st._id, st.name)}
                          className="p-2 hover:bg-[#EF4444]/10 rounded-lg text-[#EF4444] transition-colors"
                          title="Delete Account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ─── ADD/EDIT STAFF MODAL ─────────────────────────────────────── */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="admin-modal-content w-full max-w-lg p-6 relative animate-in fade-in zoom-in-95 duration-200">
              
              <button 
                onClick={() => setShowModal(false)}
                className="absolute top-5 right-5 p-1 bg-white/4 hover:bg-white/8 border border-white/8 rounded-lg text-[#94A3B8] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="border-b border-white/8 pb-3.5 mb-5 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E]">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">{editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}</h2>
                  <p className="text-xs text-[#94A3B8] mt-0.5">{editingStaff ? 'Modify roles and permissions' : 'Create new administrative accounts'}</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                
                <div>
                  <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Display Name</label>
                  <input
                    type="text"
                    required
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="admin-form-input text-sm font-semibold"
                    placeholder="Enter full name..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Email Address</label>
                  <input
                    type="email"
                    required
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="admin-form-input text-sm font-semibold"
                    placeholder="Enter email address..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">
                    {editingStaff ? 'New Password (Leave blank to keep current)' : 'Password'}
                  </label>
                  <input
                    type="password"
                    required={!editingStaff}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="admin-form-input text-sm font-semibold font-mono"
                    placeholder="Enter password..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Access Level / Role</label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      className="admin-form-input text-sm font-semibold bg-[#081A38]"
                    >
                      <option value="Staff">Staff</option>
                      <option value="Manager">Manager</option>
                      <option value="Admin">Admin</option>
                      <option value="Super Admin">Super Admin</option>
                    </select>
                  </div>
                </div>

                {formData.role !== 'Super Admin' && (
                  <div className="p-4 bg-white/4 rounded-xl border border-white/8">
                    <label className="block text-xs font-black text-white uppercase tracking-wider mb-3">Feature Page Access</label>
                    
                    <div className="grid grid-cols-2 gap-3.5">
                      {[
                        { key: 'products', label: 'Products Management' },
                        { key: 'orders', label: 'Orders & Dispatch' },
                        { key: 'reports', label: 'Sales Reports & Analytics' },
                        { key: 'settings', label: 'System Settings' },
                        { key: 'users', label: 'Customer Management' },
                        { key: 'notifications', label: 'Notifications Alerts' }
                      ].map((item) => (
                        <div key={item.key} className="flex items-center gap-2 cursor-pointer" onClick={() => handlePermissionChange(item.key)}>
                          <input
                            type="checkbox"
                            checked={formData.permissions[item.key]}
                            onChange={() => {}} // handled by click of outer container
                            className="w-4 h-4 accent-[#22C55E]"
                          />
                          <span className="text-xs text-white select-none">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-white/8 pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="admin-btn-secondary h-[46px] text-xs font-bold px-5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="admin-btn-primary h-[46px] text-xs font-bold px-6 flex items-center gap-2"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Account
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default StaffManagement;
