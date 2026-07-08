import React from 'react';
import { LayoutDashboard, Package, MapPin, Heart, User, Settings, LogOut } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';

const DashboardSidebar = ({ userInfo, totalOrders, totalSpent, activeTab, setActiveTab, onLogout }) => {
  const memberSince = userInfo?.createdAt
    ? new Date(userInfo.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
    : 'June 2026';

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'My Orders', icon: Package },
    { id: 'addresses', label: 'Saved Addresses', icon: MapPin },
    { id: 'wishlist', label: 'Wishlist', icon: Heart },
    { id: 'profile', label: 'Profile Details', icon: User },
    { id: 'settings', label: 'Account Settings', icon: Settings },
  ];

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden sticky top-6">
      {/* User Header */}
      <div className="bg-gradient-to-br from-green-600 to-emerald-700 px-6 py-8 text-white text-center relative">
        <div className="w-20 h-20 rounded-full bg-white/20 border-2 border-white mx-auto mb-3 flex items-center justify-center text-3xl font-bold shadow-md">
          {(userInfo?.fullName || userInfo?.name || 'U').charAt(0).toUpperCase()}
        </div>
        <h3 className="text-lg font-bold truncate">{userInfo?.fullName || userInfo?.name || 'Valued Customer'}</h3>
        <p className="text-xs text-green-100 mt-0.5 truncate">{userInfo?.email}</p>
        <p className="text-xs text-green-100 mt-0.5">+91 {userInfo?.phoneNumber}</p>
        <div className="mt-3 inline-block bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium">
          Member since {memberSince}
        </div>
      </div>

      {/* Quick Stats Banner */}
      <div className="grid grid-cols-2 divide-x divide-gray-100 bg-gray-50/80 border-b border-gray-100 py-3.5 text-center">
        <div>
          <p className="text-xs text-gray-500 font-medium">Total Orders</p>
          <p className="text-lg font-bold text-gray-800 mt-0.5">{totalOrders}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 font-medium">Total Spent</p>
          <p className="text-lg font-bold text-green-600 mt-0.5">{formatCurrency(totalSpent)}</p>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-green-500 text-white shadow-md shadow-green-500/20 translate-x-1'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-green-600'
              }`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}

        <div className="pt-3 border-t border-gray-100 my-2">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl font-semibold text-sm text-red-600 hover:bg-red-50 transition-all duration-200"
          >
            <LogOut className="w-5 h-5 shrink-0 text-red-500" />
            <span>Logout</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default DashboardSidebar;
