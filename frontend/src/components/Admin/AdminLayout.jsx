import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, ShoppingBag, ShoppingCart, 
  Settings, LogOut, Tags, TrendingUp, BarChart3, CreditCard,
  Menu, X, ChevronDown, Bell, Search, ChevronLeft, ChevronRight,
  Package, User as UserIcon, CreditCard as PayIcon,
  Layers, Gift, AlertCircle, Loader2, CheckCircle, XCircle, UserPlus,
  Database, Activity
} from 'lucide-react';
import { io as socketIO } from 'socket.io-client';
import useAuthStore from '../../store/useAuthStore';
import axios from 'axios';

const SOCKET_URL = 'http://localhost:5000';

const getNotifEmoji = (type) => {
  if (type === 'order') return '🛒';
  if (type === 'order_accepted') return '✅';
  if (type === 'order_cancelled') return '❌';
  if (type === 'user') return '👤';
  if (type === 'stock') return '⚠️';
  return '🔔';
};

const getNotifColor = (type) => {
  if (type === 'order') return '#22C55E';
  if (type === 'order_accepted') return '#3B82F6';
  if (type === 'order_cancelled') return '#EF4444';
  if (type === 'user') return '#A855F7';
  if (type === 'stock') return '#F59E0B';
  return '#94A3B8';
};

const formatRelativeTime = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

// ─── Quick Search Component ─────────────────────────────────────────────────
const QuickSearch = ({ adminInfo }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const debounceTimer = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false); setActiveIdx(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ⌘K / Ctrl+K global shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault(); inputRef.current?.focus(); setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false); setQuery(''); setResults(null); inputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Quick search loaded console log (Requirement 8)
  useEffect(() => {
    console.log('✓ Quick search loaded');
  }, []);

  const performSearch = useCallback(async (q) => {
    if (!q || !q.trim()) { setResults(null); setIsOpen(false); return; }
    setIsLoading(true); setError('');
    try {
      const { data } = await axios.get('http://localhost:5000/api/admin/search', {
        headers: { Authorization: `Bearer ${adminInfo.token}` },
        params: { q: q.trim() }
      });
      setResults(data); setIsOpen(true); setActiveIdx(-1);
    } catch (err) {
      // Set empty results list so 'No results found' renders instead of console errors (Requirement 5)
      setResults({
        products: [],
        users: [],
        orders: [],
        categories: [],
        offers: []
      });
      setIsOpen(true);
    } finally { setIsLoading(false); }
  }, [adminInfo]);

  const handleInputChange = (e) => {
    const val = e.target.value; setQuery(val);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (!val.trim()) { setResults(null); setIsOpen(false); return; }
    debounceTimer.current = setTimeout(() => performSearch(val), 300); // 300ms debounce (Requirement 4)
  };

  const getFlatItems = () => {
    if (!results) return [];
    const products = (results.products || []).map(p => ({ ...p, _type: 'product', path: `/admin/products?search=${encodeURIComponent(p.name)}` }));
    const users = (results.users || []).map(u => ({ ...u, _type: 'user', path: '/admin/users' }));
    const orders = (results.orders || []).map(o => ({ ...o, _type: 'order', path: '/admin/orders' }));
    const categories = (results.categories || []).map(c => ({ ...c, _type: 'category', path: '/admin/categories' }));
    const offers = (results.offers || []).map(f => ({ ...f, _type: 'offer', path: '/admin/offers' }));
    
    return [
      ...products,
      ...users,
      ...orders,
      ...categories,
      ...offers
    ];
  };

  const flatItems = getFlatItems();
  const totalCount = flatItems.length;

  const handleKeyDownInput = (e) => {
    if (!isOpen || flatItems.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => (i + 1) % flatItems.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => (i - 1 + flatItems.length) % flatItems.length); }
    else if (e.key === 'Enter' && activeIdx >= 0) {
      const item = flatItems[activeIdx];
      if (item) { navigate(item.path); setIsOpen(false); setQuery(''); setResults(null); }
    }
  };

  const handleResultClick = (path) => { navigate(path); setIsOpen(false); setQuery(''); setResults(null); };

  const typeColors = {
    product: 'text-emerald-400 bg-emerald-400/10',
    user: 'text-cyan-400 bg-cyan-400/10',
    order: 'text-violet-400 bg-violet-400/10',
    category: 'text-orange-400 bg-orange-400/10',
    offer: 'text-pink-400 bg-pink-400/10',
  };
  const getColor = (t) => typeColors[t] || 'text-gray-400 bg-gray-400/10';

  const TypeIcon = ({ type }) => {
    const cls = 'w-4 h-4 shrink-0';
    if (type === 'product')  return <Package className={cls} />;
    if (type === 'user')     return <UserIcon className={cls} />;
    if (type === 'order')    return <ShoppingCart className={cls} />;
    if (type === 'category') return <Layers className={cls} />;
    if (type === 'offer')    return <Gift className={cls} />;
    return <Search className={cls} />;
  };

  return (
    <div className="hidden md:flex items-center relative" ref={containerRef}>
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
        {isLoading && <Loader2 className="w-3.5 h-3.5 absolute right-10 top-1/2 -translate-y-1/2 text-[#22C55E] animate-spin pointer-events-none" />}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => { if (query.trim() && results) setIsOpen(true); }}
          onKeyDown={handleKeyDownInput}
          placeholder="Quick search..."
          autoComplete="off"
          spellCheck={false}
          className={`h-[42px] pl-10 pr-12 rounded-[14px] text-xs font-semibold bg-white/4 border text-white placeholder-[#94A3B8] transition-all duration-200 focus:outline-none focus:border-[#22C55E] ${isOpen ? 'w-80 border-[#22C55E]/60' : 'w-60 border-white/8'}`}
        />
        <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-[#94A3B8] pointer-events-none select-none">
          &#8984;K
        </kbd>
      </div>

      {isOpen && (
        <div className="absolute right-0 w-[400px] max-h-[520px] overflow-y-auto bg-[#081A38] border border-white/10 rounded-[20px] shadow-2xl shadow-black/60 z-[999] admin-scroll" style={{ top: 'calc(100% + 10px)' }}>
          {error && (
            <div className="flex items-center gap-3 px-5 py-4 text-xs text-red-400 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}
          {isLoading && !error && (
            <div className="flex items-center gap-3 px-5 py-5 text-xs text-[#94A3B8] font-semibold">
              <Loader2 className="w-4 h-4 animate-spin text-[#22C55E]" />Searching...
            </div>
          )}
          {!isLoading && !error && results && totalCount === 0 && (
            <div className="px-5 py-8 text-center">
              <Search className="w-8 h-8 text-[#94A3B8] mx-auto mb-2 opacity-50" />
              <p className="text-xs font-semibold text-[#94A3B8]">No matching records found.</p>
              <p className="text-[10px] text-[#4B5563] mt-1">Try a different keyword</p>
            </div>
          )}
          {!isLoading && !error && results && totalCount > 0 && (
            <>
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/6 bg-white/2">
                <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">
                  {totalCount} result{totalCount !== 1 ? 's' : ''} found
                </span>
                <span className="text-[9px] font-mono text-[#4B5563] hidden sm:inline">&uarr;&darr; nav &middot; Enter &middot; Esc</span>
              </div>
              <div className="divide-y divide-white/4">
                {flatItems.map((item, idx) => {
                  const displayName = item.productName || item.name || item.categoryName || item.offerTitle || item.invoiceNumber || 'Record';
                  const isHL = activeIdx === idx;
                  return (
                    <button
                      key={idx}
                      onMouseEnter={() => setActiveIdx(idx)}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleResultClick(item.path);
                      }}
                      className={`w-full flex items-center justify-between gap-4 px-5 py-3.5 text-left transition-all duration-200 ${
                        isHL ? 'bg-white/8' : 'hover:bg-white/4'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${getColor(item._type)}`}>
                          <TypeIcon type={item._type} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate max-w-[220px]">
                            {displayName}
                          </p>
                          <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block mt-0.5">
                            {item._type}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#94A3B8] opacity-60 shrink-0" />
                    </button>
                  );
                })}
              </div>
              <div className="px-5 py-3 border-t border-white/6 mt-1">
                <p className="text-[9px] text-[#4B5563] text-center">Esc to close &bull; Enter to select</p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const AdminLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { adminInfo, adminLogout, userInfo } = useAuthStore();
  
  // States
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // Permanent Dark Theme
  const darkMode = true;
  const [unreadCount, setUnreadCount] = useState(0);
  const [bellOpen, setBellOpen] = useState(false);
  const [latestNotifs, setLatestNotifs] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const bellRef = useRef(null);

  // Security Protection Redirect
  useEffect(() => {
    if (userInfo && (!adminInfo || !adminInfo.token)) {
      navigate('/login?error=access_denied');
      return;
    }
    if (!adminInfo || !adminInfo.token) {
      navigate('/admin/login');
    }
  }, [adminInfo, userInfo, navigate]);

  // Robots noindex, nofollow meta tag
  useEffect(() => {
    let meta = document.querySelector('meta[name="robots"]');
    let created = false;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'robots';
      document.head.appendChild(meta);
      created = true;
    }
    const prevContent = meta.content;
    meta.content = 'noindex, nofollow';

    return () => {
      if (meta) {
        if (created) {
          meta.remove();
        } else {
          meta.content = prevContent || 'index, follow';
        }
      }
    };
  }, []);

  // Permanent Dark Mode Effect
  useEffect(() => {
    document.title = 'Tiruchendur Murugan Pazhamudhir Solai - Admin Panel';
    document.documentElement.classList.add('dark');
    localStorage.removeItem('admin-theme');
    return () => {
      document.documentElement.classList.remove('dark');
    };
  }, []);

  // Notifications Count + Socket.io realtime
  useEffect(() => {
    if (!adminInfo) return;
    // Initial fetch
    axios.get('http://localhost:5000/api/admin/notifications', {
      headers: { Authorization: `Bearer ${adminInfo.token}` },
      params: { limit: 5 }
    })
    .then(res => {
      setUnreadCount(res.data.unreadCount || 0);
      setLatestNotifs(res.data.notifications || []);
    })
    .catch(() => {});

    // Socket.io
    const socket = socketIO(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socket.on('connect', () => { socket.emit('join', { role: 'admin' }); });
    socket.on('admin_notification', (notif) => {
      setLatestNotifs(prev => [notif, ...prev].slice(0, 5));
      setUnreadCount(prev => prev + 1);
    });
    socket.on('admin:notification:unreadCount', ({ count }) => {
      setUnreadCount(count);
    });
    return () => { socket.disconnect(); };
  }, [adminInfo]);

  // Close bell dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setBellOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch latest notifs for dropdown
  const fetchLatestNotifs = useCallback(async () => {
    if (!adminInfo?.token) return;
    setNotifLoading(true);
    try {
      const { data } = await axios.get('http://localhost:5000/api/admin/notifications', {
        headers: { Authorization: `Bearer ${adminInfo.token}` },
        params: { limit: 5 }
      });
      setLatestNotifs(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {}
    finally { setNotifLoading(false); }
  }, [adminInfo]);

  const [sessionTimeoutMs, setSessionTimeoutMs] = useState(15 * 60 * 1000);

  useEffect(() => {
    const fetchTimeout = async () => {
      try {
        const { data } = await axios.get('http://localhost:5000/api/store/settings');
        if (data && data.sessionTimeout) {
          setSessionTimeoutMs(data.sessionTimeout * 60 * 1000);
        }
      } catch (err) {
        console.error('Failed to fetch session timeout setting:', err);
      }
    };
    fetchTimeout();
  }, []);

  // Auto-logout after inactivity
  useEffect(() => {
    if (!adminInfo) return;
    let timeoutId;
    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        adminLogout();
        navigate('/admin/login?reason=timeout');
      }, sessionTimeoutMs);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, [adminInfo, navigate, adminLogout, sessionTimeoutMs]);

  const handleLogout = () => {
    adminLogout();
    navigate('/admin/login');
  };

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Reports', path: '/admin/reports', icon: BarChart3, permission: 'reports' },
    { name: 'Orders', path: '/admin/orders', icon: ShoppingCart, permission: 'orders' },
    { name: 'Products', path: '/admin/products', icon: ShoppingBag, permission: 'products' },
    { name: 'Categories', path: '/admin/categories', icon: Tags, permission: 'products' },
    { name: 'Offers', path: '/admin/offers', icon: TrendingUp, permission: 'products' },
    { name: 'Payments', path: '/admin/payments', icon: CreditCard, permission: 'orders' },
    { name: 'Users', path: '/admin/users', icon: Users, permission: 'users' },
    { name: 'Notifications', path: '/admin/notifications', icon: Bell, permission: 'notifications' },
    { name: 'Staff', path: '/admin/staff', icon: UserPlus, permission: 'users' },
    { name: 'Database', path: '/admin/database', icon: Database, permission: 'settings' },
    { name: 'System Logs', path: '/admin/system-logs', icon: Activity, permission: 'settings' },
    { name: 'Settings', path: '/admin/settings', icon: Settings, permission: 'settings' },
  ];

  const filteredNavItems = navItems.filter(item => {
    if (!item.permission) return true;
    if (adminInfo?.role === 'Super Admin' || adminInfo?.role === 'SuperAdmin') return true;
    if (adminInfo?.permissions && adminInfo.permissions[item.permission]) return true;
    return false;
  });

  const getRoleBadgeColor = (role) => {
    if (role === 'SuperAdmin' || role === 'Super Admin') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300';
    if (role === 'Admin' || role === 'Manager') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300';
    return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300';
  };

  if (!adminInfo || !adminInfo.token) return null;

  return (
    <div className="min-h-screen font-sans bg-[#020B24] text-[#FFFFFF] transition-colors duration-300">
      
      {/* ─── Desktop Fixed Left Sidebar (280px) ───────────────────────────── */}
      <aside 
        className={`hidden lg:flex flex-col fixed inset-y-0 left-0 z-50 transition-all duration-300 select-none shadow-2xl bg-[#081529] border-r border-white/8 ${
          collapsed ? 'w-20' : 'w-[280px]'
        }`}
      >
        {/* Sidebar Logo Header */}
        <div className="h-[70px] flex items-center justify-between px-6 border-b border-white/8 shrink-0">
          <Link to="/admin/dashboard" className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-[#22C55E] to-[#16A34A] flex items-center justify-center shrink-0 shadow-lg shadow-green-500/20">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <div className="flex flex-col truncate">
                <span className="text-sm font-black leading-tight tracking-tight text-white">
                  TM Pazhamudhir
                </span>
                <span className="text-[10px] font-bold text-[#22C55E] uppercase tracking-wider">
                  Enterprise Admin
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto admin-scroll">
          {filteredNavItems.map(item => {
            const isActive = location.pathname === item.path || 
              (item.path !== '/admin/dashboard' && location.pathname.startsWith(item.path));
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                title={collapsed ? item.name : undefined}
                style={isActive ? {
                  background: 'linear-gradient(90deg, rgba(34,197,94,0.18), transparent)',
                  borderLeft: '4px solid #22C55E'
                } : {}}
                className={`group relative flex items-center gap-3.5 py-[14px] px-[18px] rounded-[18px] text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'text-[#FFFFFF] shadow-sm'
                    : 'text-[#94A3B8] hover:text-[#FFFFFF] hover:bg-white/6'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-[#22C55E]' : 'text-[#94A3B8]'}`} />
                {!collapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer & Collapse Toggle */}
        <div className="p-4 border-t border-white/8 shrink-0 space-y-2">
          {!collapsed && (
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-[18px] text-sm font-semibold text-[#EF4444] hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-5 h-5 shrink-0" />
              <span>Logout</span>
            </button>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 p-2.5 rounded-[18px] text-xs font-bold bg-white/6 text-[#94A3B8] hover:text-white hover:bg-white/10 transition-colors"
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* ─── Mobile Off-Canvas Drawer ───────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative w-72 max-w-[80vw] flex flex-col h-full shadow-2xl bg-[#081529] text-white border-r border-white/8">
            <div className="h-[70px] flex items-center justify-between px-6 border-b border-white/8">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[12px] bg-gradient-to-br from-[#22C55E] to-[#16A34A] flex items-center justify-center text-white">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <span className="font-black text-sm">TM Pazhamudhir</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
              {filteredNavItems.map(item => {
                const isActive = location.pathname === item.path || (item.path !== '/admin/dashboard' && location.pathname.startsWith(item.path));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    style={isActive ? {
                      background: 'linear-gradient(90deg, rgba(34,197,94,0.18), transparent)',
                      borderLeft: '4px solid #22C55E'
                    } : {}}
                    className={`flex items-center gap-3.5 py-[14px] px-[18px] rounded-[18px] text-sm font-semibold transition-colors ${
                      isActive ? 'text-white' : 'text-[#94A3B8] hover:bg-white/6 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-[#22C55E]' : ''}`} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-white/8">
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-[18px] text-sm font-semibold text-[#EF4444] hover:bg-red-500/10">
                <LogOut className="w-5 h-5" /> Logout
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ─── Main Wrapper (Offset for Desktop Sidebar) ───────────────────── */}
      <div className={`flex flex-col min-h-screen transition-all duration-300 ${collapsed ? 'lg:pl-20' : 'lg:pl-[280px]'}`}>
        
        {/* Top Header (70px) */}
        <header className="sticky top-0 z-40 h-[70px] px-6 md:px-8 bg-[#081529] border-b border-white/8 flex items-center justify-between shadow-md">
          
          {/* Left: Mobile Trigger & Breadcrumb */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl hover:bg-white/10 text-gray-300 transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="hidden sm:flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
              <span className="text-[#22C55E]">Admin</span>
              <span className="text-[#94A3B8]">/</span>
              <span className="text-white font-extrabold">
                {filteredNavItems.find(i => location.pathname.startsWith(i.path))?.name || 'Dashboard'}
              </span>
            </div>
          </div>

          {/* Right: Search, Notifications, Profile */}
          <div className="flex items-center gap-4">
            {/* ── Quick Search ─────────────────────────────────────────── */}
            <QuickSearch adminInfo={adminInfo} />

            {/* ── Notification Bell with Dropdown ─────────────────── */}
            <div className="relative" ref={bellRef}>
              <button
                id="notif-bell-btn"
                onClick={() => { setBellOpen(o => !o); if (!bellOpen) fetchLatestNotifs(); }}
                className={`relative p-2.5 rounded-[14px] border transition-all duration-200 text-gray-300 ${
                  bellOpen ? 'bg-white/10 border-white/20' : 'bg-white/4 border-white/8 hover:bg-white/10'
                }`}
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#EF4444] ring-2 ring-[#081529] text-[9px] font-black text-white flex items-center justify-center animate-bounce">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {bellOpen && (
                <div className="absolute right-0 mt-2 w-[360px] rounded-[22px] bg-[#081A38] border border-white/10 shadow-2xl shadow-black/60 z-[999] overflow-hidden" style={{ top: 'calc(100% + 8px)' }}>
                  {/* Header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-[#22C55E]" />
                      <span className="text-sm font-black text-white">Latest Notifications</span>
                    </div>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30 animate-pulse">
                        {unreadCount} unread
                      </span>
                    )}
                  </div>

                  {/* Notif List */}
                  <div className="max-h-[340px] overflow-y-auto admin-scroll divide-y divide-white/5">
                    {notifLoading ? (
                      <div className="flex items-center justify-center py-10 gap-2 text-xs text-[#94A3B8]">
                        <Loader2 className="w-4 h-4 animate-spin text-[#22C55E]" /> Loading...
                      </div>
                    ) : latestNotifs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <Bell className="w-8 h-8 text-[#94A3B8]/30 mb-2" />
                        <p className="text-xs text-[#94A3B8]">No notifications yet</p>
                      </div>
                    ) : latestNotifs.map(n => (
                      <div
                        key={n._id}
                        className={`flex items-start gap-3 px-5 py-3.5 hover:bg-white/4 transition-colors cursor-pointer ${
                          !n.isRead ? 'bg-white/2' : ''
                        }`}
                        onClick={() => { setBellOpen(false); navigate('/admin/notifications'); }}
                      >
                        <div
                          className="w-8 h-8 rounded-[10px] flex items-center justify-center text-sm shrink-0 mt-0.5"
                          style={{ background: `${getNotifColor(n.type)}18` }}
                        >
                          {getNotifEmoji(n.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-xs font-bold truncate ${n.isRead ? 'text-[#94A3B8]' : 'text-white'}`}>
                              {n.title}
                            </p>
                            {!n.isRead && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] shrink-0 mt-1" />
                            )}
                          </div>
                          <p className="text-[11px] text-[#4B5563] mt-0.5 line-clamp-1">{n.message}</p>
                          <p className="text-[10px] text-[#4B5563] mt-1" style={{ color: getNotifColor(n.type) + '99' }}>
                            {formatRelativeTime(n.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="px-5 py-3.5 border-t border-white/8">
                    <Link
                      to="/admin/notifications"
                      onClick={() => setBellOpen(false)}
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-[12px] text-xs font-bold bg-[#22C55E]/15 text-[#22C55E] hover:bg-[#22C55E]/25 transition-colors border border-[#22C55E]/30"
                    >
                      <Bell className="w-3.5 h-3.5" /> View All Notifications
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className={`flex items-center gap-3 p-1.5 pr-3 rounded-[16px] border transition-all ${
                  profileOpen ? 'bg-white/10 border-white/20' : 'bg-white/4 border-white/8 hover:bg-white/8'
                }`}
              >
                <div className="w-8 h-8 rounded-[12px] bg-gradient-to-tr from-[#22C55E] to-[#16A34A] flex items-center justify-center text-white text-xs font-black shadow-sm">
                  {(adminInfo?.name || 'A').charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-extrabold leading-tight text-white">
                    {adminInfo?.name || 'Admin'}
                  </p>
                  <p className="text-[10px] font-bold text-[#22C55E] leading-tight">
                    {adminInfo?.role || 'Staff'}
                  </p>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-[#94A3B8] transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-[24px] bg-[#081A38] border border-white/10 shadow-2xl py-2 z-50 text-white">
                  <div className="px-5 py-3.5 border-b border-white/8">
                    <p className="text-sm font-bold truncate">{adminInfo?.name}</p>
                    <p className="text-xs text-[#94A3B8] truncate mt-0.5">{adminInfo?.email}</p>
                    <span className={`inline-block mt-2 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${getRoleBadgeColor(adminInfo?.role)}`}>
                      {adminInfo?.role}
                    </span>
                  </div>
                  <div className="py-1.5">
                    <Link
                      to="/admin/settings"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-5 py-2.5 text-xs font-semibold text-gray-300 hover:bg-white/6 hover:text-white transition-colors"
                    >
                      <Settings className="w-4 h-4 text-[#94A3B8]" /> Account Settings
                    </Link>
                  </div>
                  <div className="border-t border-white/8 pt-1.5">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-5 py-2.5 text-xs font-bold text-[#EF4444] hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ─── Main Body Content Area (30px padding) ──────────────────────── */}
        <main className="flex-1 p-[30px]">
          {children}
        </main>

        {/* ─── Footer ────────────────────────────────────────────────────── */}
        <footer className="px-8 py-6 border-t border-white/8 text-center text-xs font-medium text-[#94A3B8]">
          <p>© {new Date().getFullYear()} Tiruchendur Murugan Pazhamudhir Solai • Enterprise Grocery Management System</p>
        </footer>
      </div>
    </div>
  );
};

export default AdminLayout;
