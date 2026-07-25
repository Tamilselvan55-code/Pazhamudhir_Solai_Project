import React from 'react';
import { LayoutDashboard, Package, MapPin, Heart, User, Settings, LogOut } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';

const DashboardSidebar = ({ userInfo, totalOrders, totalSpent, activeTab, setActiveTab, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'My Orders', icon: Package },
    { id: 'addresses', label: 'Saved Addresses', icon: MapPin },
    { id: 'wishlist', label: 'Wishlist', icon: Heart },
    { id: 'profile', label: 'Profile Details', icon: User },
    { id: 'settings', label: 'Account Settings', icon: Settings },
  ];

  return (
    <>
      {/* ── DESKTOP: Navigation sidebar ──────────────────────────────────────── */}
      <div className="hidden lg:block bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden sticky top-6">
        
        {/* Quick Stats Banner */}
        <div className="grid grid-cols-2 divide-x divide-gray-100 bg-gray-50/80 border-b border-gray-100 py-4 text-center">
          <div>
            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mb-1">Total Orders</p>
            <p className="text-xl font-extrabold text-gray-800">{totalOrders}</p>
          </div>
          <div>
            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mb-1">Total Spent</p>
            <p className="text-xl font-extrabold text-green-600">{formatCurrency(totalSpent)}</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 ${
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

          <div className="pt-2 border-t border-gray-100 mt-2">
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl font-bold text-sm text-red-600 hover:bg-red-50 transition-all duration-200"
            >
              <LogOut className="w-5 h-5 shrink-0 text-red-500" />
              <span>Logout</span>
            </button>
          </div>
        </nav>
      </div>
    </>
  );
};

export default DashboardSidebar;

