import React from 'react';
import { ShoppingCart, User, LogIn, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import useCartStore from '../../store/useCartStore';
import useAuthStore from '../../store/useAuthStore';
import { showGuestToast } from '../../hooks/useGuestGuard';
import Logo from './Logo';
import useSettingsStore from '../../store/useSettingsStore';
import NotificationBell from './NotificationBell';

const Navbar = ({ toggleCart }) => {
  const totalItems = useCartStore((state) => state.getTotalItems());
  const { userInfo, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Guard cart for guests
  const handleCartClick = () => {
    if (!userInfo) {
      showGuestToast('Please log in to access your shopping cart.');
      navigate('/login?redirect=%2F');
      return;
    }
    toggleCart();
  };

  const settings = useSettingsStore((s) => s.settings);

  return (
    <>
      {settings?.announcementBanner && (
        <div 
          className="text-white text-center py-2 px-4 text-xs font-bold tracking-wide select-none"
          style={{
            background: 'linear-gradient(135deg, var(--color-primary, #16a34a), var(--color-secondary, #15803d))',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}
        >
          {settings.announcementBanner}
        </div>
      )}
      <header className="sticky top-0 z-50" style={{
      background: 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(22,163,74,0.12)',
      boxShadow: '0 2px 20px rgba(0,0,0,0.06)',
    }}>
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link to="/" className="shrink-0" style={{ textDecoration: 'none' }}>
          <Logo size="sm" variant="full" theme="dark" />
        </Link>

        {/* Navigation Links (Home, Categories, Wishlist) */}
        <div className="hidden md:flex items-center gap-6">
          <Link to="/" className="text-gray-700 hover:text-green-600 font-bold text-sm transition-colors">Home</Link>
          <Link to="/categories" className="text-gray-700 hover:text-green-600 font-bold text-sm transition-colors">Categories</Link>
          {userInfo && (
            <Link to="/profile?tab=wishlist" className="text-gray-700 hover:text-green-600 font-bold text-sm transition-colors">Wishlist</Link>
          )}
        </div>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-5">
          {/* Cart Button */}
          <button
            id="navbar-cart-btn"
            onClick={handleCartClick}
            className="relative flex items-center gap-1.5 text-gray-700 hover:text-green-600 transition-colors"
            style={{ padding: '6px 10px', borderRadius: 10, background: 'rgba(22,163,74,0.06)' }}
          >
            <ShoppingCart size={22} />
            <span className="text-sm font-medium">Cart</span>
            {userInfo && totalItems > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                color: '#fff', fontSize: 10, fontWeight: 700,
                borderRadius: '50%', width: 19, height: 19,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid #fff',
                boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
              }}>
                {totalItems}
              </span>
            )}
          </button>

          {/* Notification Bell */}
          {userInfo && <NotificationBell />}

          {/* Profile / Logout */}
          {userInfo ? (
            <div className="flex items-center gap-4">
              <Link
                to="/profile"
                className="flex items-center gap-2 text-gray-700 hover:text-green-600 transition-colors text-sm font-medium"
              >
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #bbf7d0, #86efac)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 1px 6px rgba(22,163,74,0.25)',
                }}>
                  <User size={15} style={{ color: '#15803d' }} />
                </div>
                <span>{userInfo.fullName || userInfo.name || userInfo.phoneNumber}</span>
              </Link>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-gray-400 hover:text-red-500 transition-colors text-sm"
              >
                <LogOut size={15} />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1.5 font-semibold text-sm transition-all"
              style={{
                background: 'linear-gradient(135deg, #16a34a, #15803d)',
                color: '#fff',
                padding: '8px 18px',
                borderRadius: 12,
                boxShadow: '0 3px 12px rgba(22,163,74,0.35)',
                textDecoration: 'none',
              }}
            >
              <LogIn size={15} />
              Login
            </Link>
          )}
        </div>

        {/* Mobile Actions: Bell + Profile + Cart */}
        <div className="flex md:hidden items-center gap-2">
          {userInfo && <NotificationBell />}

          {userInfo ? (
            <div className="flex items-center gap-2">
              <Link to="/profile">
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #bbf7d0, #86efac)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <User size={14} style={{ color: '#15803d' }} />
                </div>
              </Link>
              <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition-colors">
                <LogOut size={17} />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1 font-semibold text-xs"
              style={{
                background: 'linear-gradient(135deg, #16a34a, #15803d)',
                color: '#fff',
                padding: '6px 12px',
                borderRadius: 10,
                boxShadow: '0 2px 8px rgba(22,163,74,0.3)',
                textDecoration: 'none',
              }}
            >
              <LogIn size={13} /> Login
            </Link>
          )}

          {/* Mobile cart */}
          <button
            id="mobile-cart-btn"
            onClick={handleCartClick}
            className="relative p-2 text-gray-700 hover:text-green-600 transition-colors"
            style={{ borderRadius: 10, background: 'rgba(22,163,74,0.06)' }}
          >
            <ShoppingCart size={22} />
            {userInfo && totalItems > 0 && (
              <span style={{
                position: 'absolute', top: 0, right: 0,
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                color: '#fff', fontSize: 9, fontWeight: 700,
                borderRadius: '50%', width: 17, height: 17,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid #fff',
              }}>
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
    </>
  );
};

export default Navbar;
