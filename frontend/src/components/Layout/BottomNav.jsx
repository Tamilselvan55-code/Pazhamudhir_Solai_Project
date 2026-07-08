import React from 'react';
import { Home, Grid, User, History, LogIn } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';

const BottomNav = () => {
  const location = useLocation();
  const { userInfo } = useAuthStore();

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Categories', path: '/categories', icon: Grid },
    { name: 'Orders', path: '/orders', icon: History },
    userInfo
      ? { name: 'Profile', path: '/profile', icon: User }
      : { name: 'Login', path: '/login', icon: LogIn },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 px-4 py-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <div className="flex justify-around items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex flex-col items-center p-2 transition-colors min-w-[60px] ${isActive ? 'text-green-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
