import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { Home, Package, Wallet, User } from 'lucide-react';
import { API_BASE, API_URL } from '../../config/api';
import axios from 'axios';
import { io } from 'socket.io-client';

const DeliveryLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);

  // Authenticate and fetch profile on layout load
  useEffect(() => {
    const fetchProfile = async () => {
      const stored = localStorage.getItem('deliveryPartnerInfo');
      if (!stored) {
        navigate('/delivery/login');
        return;
      }

      const parsedInfo = JSON.parse(stored);
      try {
        const { data } = await axios.get(`${API_BASE}/delivery/profile`, {
          headers: { Authorization: `Bearer ${parsedInfo.token}` }
        });
        setPartner(data);
      } catch (error) {
        console.error('Failed to fetch profile', error);
        localStorage.removeItem('deliveryPartnerInfo');
        navigate('/delivery/login');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const navItems = [
    { path: '/delivery/home', icon: Home, label: 'Home' },
    { path: '/delivery/orders', icon: Package, label: 'Orders' },
    { path: '/delivery/earnings', icon: Wallet, label: 'Earnings' },
    { path: '/delivery/profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0 md:flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 h-screen sticky top-0 shrink-0 z-[100]">
        <div className="p-6 flex items-center gap-3 border-b border-gray-100">
          <div className="w-10 h-10 bg-green-600 text-white rounded-xl flex items-center justify-center font-bold text-xl">
            {partner?.name?.charAt(0) || 'D'}
          </div>
          <div>
            <h2 className="font-bold text-gray-900 leading-tight">Partner Hub</h2>
            <p className="text-xs text-gray-500">{partner?.status}</p>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-green-50 text-green-700 font-bold' 
                    : 'text-gray-600 hover:bg-gray-50 font-medium'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-[100vw] md:max-w-none overflow-x-hidden relative">
        <Outlet context={{ partner, setPartner }} />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-[100] pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path) || (location.pathname === '/delivery/documents' && item.path === '/delivery/profile');
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                  isActive ? 'text-green-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Icon className={`w-6 h-6 transition-transform ${isActive ? 'scale-110' : 'scale-100'}`} strokeWidth={isActive ? 2.5 : 2} />
                <span className={`text-[10px] font-medium ${isActive ? 'font-bold' : ''}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default DeliveryLayout;
