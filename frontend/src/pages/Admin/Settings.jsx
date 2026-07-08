import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { 
  Settings as SettingsIcon, Save, Loader2, Check, AlertTriangle, 
  MapPin, Shield, Mail, Bell, Globe, CheckSquare, Eye, Truck, 
  FileText, Activity, AlertCircle, Laptop, Sliders
} from 'lucide-react';
import AdminLayout from '../../components/Admin/AdminLayout';
import useAuthStore from '../../store/useAuthStore';
import axios from 'axios';
import useModal from '../../hooks/useModal';

const Settings = () => {
  const { adminInfo } = useAuthStore();
  const { adminAlert } = useModal();
  const [activeTab, setActiveTab] = useState('general');

  const [formData, setFormData] = useState({
    // General
    storeName: '',
    storeLogo: '',
    storeAddress: '',
    phone: '',
    email: '',
    supportWhatsApp: '',
    workingHours: '',
    deliveryRadiusKm: 5,
    currency: '₹',
    gstPercentage: 0,
    invoicePrefix: 'INV-',
    invoiceFooter: '',
    storeDescription: '',
    lat: 13.0606941,
    lon: 80.2270751,

    // Platform
    websiteName: '',
    websiteLogo: '',
    browserTitle: '',
    favicon: '',
    primaryThemeColor: '#16a34a',
    secondaryThemeColor: '#81c784',
    homepageBanner: '',
    announcementBanner: '',
    footerContent: '',

    // Preferences
    defaultLanguage: 'en',
    defaultCurrency: '₹',
    defaultTheme: 'light',
    enableProductReviews: true,
    enableWishlist: true,
    enableSearchSuggestions: true,
    enableNotifications: true,

    // Maintenance & Disables
    maintenanceMode: false,
    disableCustomerLogin: false,
    disableRegistration: false,
    disableCheckout: false,
    disableForgotPassword: false,
    disableOrderPlacement: false,

    // Delivery
    minOrderValue: 0,
    maxOrderValue: 100000,
    freeDeliveryThreshold: 500,
    deliveryCharges: 40,
    deliveryTiming: 'Same Day Delivery',

    // Order
    orderPrefix: 'ORD-',
    autoAcceptOrders: false,
    autoGenerateInvoice: true,
    cancellationTimeLimit: 30,
    orderStatusColors: {
      'Pending': '#F59E0B',
      'Accepted': '#3B82F6',
      'Out for Delivery': '#06B6D4',
      'Delivered': '#10B981',
      'Cancelled': '#EF4444'
    },

    // Notification
    enableOrderNotifications: true,
    enableRegistrationNotifications: true,
    enableLowStockAlerts: true,
    enableOfferNotifications: true,
    enableEmailNotifications: true,
    enableBrowserNotifications: true,

    // Security
    sessionTimeout: 15,
    maxLoginAttempts: 5,
    passwordPolicy: 'Medium',
    admin2FA: false,

    // SMTP
    smtpHost: '',
    smtpPort: 587,
    smtpUsername: '',
    smtpPassword: '',
    senderName: '',
    senderEmail: '',

    // Analytics
    dashboardRefreshInterval: 30,
    enableSalesCharts: true,
    enableRevenueReports: true,
    enableTopProducts: true,
    enableCustomerStats: true,

    // Content
    offersBanner: '',
    aboutUs: '',
    contactUs: '',
    privacyPolicy: '',
    termsAndConditions: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // SMTP Testing
  const [testEmail, setTestEmail] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);

  const fetchSettings = async () => {
    if (!adminInfo) return;
    try {
      setLoading(true);
      const { data } = await axios.get('http://localhost:5000/api/admin/settings', {
        headers: { Authorization: `Bearer ${adminInfo.token}` }
      });

      setFormData(prev => ({
        ...prev,
        ...data,
        lat: data.location?.lat ?? prev.lat,
        lon: data.location?.lon ?? prev.lon,
        orderStatusColors: data.orderStatusColors ? {
          ...prev.orderStatusColors,
          ...(data.orderStatusColors instanceof Map ? Object.fromEntries(data.orderStatusColors) : data.orderStatusColors)
        } : prev.orderStatusColors
      }));
      setError('');
    } catch (err) {
      setError('Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [adminInfo]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value
    }));
  };

  const handleNestedInputChange = (parent, key, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [key]: value
      }
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.storeName.trim()) return setError('Store Name is required');
    if (formData.lat < -90 || formData.lat > 90) return setError('Invalid latitude range');
    if (formData.lon < -180 || formData.lon > 180) return setError('Invalid longitude range');

    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      await axios.put('http://localhost:5000/api/admin/settings', formData, {
        headers: { Authorization: `Bearer ${adminInfo.token}` }
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save settings';
      setError(msg);
      adminAlert('error', 'Save Failed', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail.trim()) {
      adminAlert('warning', 'Missing Recipient', 'Please enter a test recipient email address.');
      return;
    }
    setTestingEmail(true);
    try {
      const { data } = await axios.post('http://localhost:5000/api/admin/settings/test-email', {
        smtpHost: formData.smtpHost,
        smtpPort: formData.smtpPort,
        smtpUsername: formData.smtpUsername,
        smtpPassword: formData.smtpPassword,
        senderName: formData.senderName,
        senderEmail: formData.senderEmail,
        recipientEmail: testEmail
      }, {
        headers: { Authorization: `Bearer ${adminInfo.token}` }
      });
      adminAlert('success', 'SMTP Test Success', data.message || 'Test email sent successfully! Please check your inbox.');
    } catch (err) {
      const msg = err.response?.data?.message || 'SMTP connection/send failed. Verify host, port, username, and password.';
      adminAlert('error', 'SMTP Test Failed', msg);
    } finally {
      setTestingEmail(false);
    }
  };

  if (!adminInfo) {
    return <Navigate to="/admin/login" replace />;
  }

  const tabs = [
    { id: 'general', label: 'General Settings', icon: SettingsIcon },
    { id: 'platform', label: 'Platform & Styling', icon: Globe },
    { id: 'preferences', label: 'User Preferences', icon: Sliders },
    { id: 'maintenance', label: 'Maintenance Mode', icon: TooltipIcon },
    { id: 'delivery', label: 'Delivery Config', icon: Truck },
    { id: 'order', label: 'Order & Invoice', icon: FileText },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'smtp', label: 'SMTP Config', icon: Mail },
    { id: 'website-content', label: 'Website Content', icon: Laptop },
  ];

  function TooltipIcon(props) {
    return <Sliders {...props} className={props.className + " rotate-90"} />;
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* ─── Page Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
              <div className="p-2.5 rounded-[16px] bg-white/4 border border-white/8 shadow-sm">
                <SettingsIcon className="w-6 h-6 text-[#22C55E]" />
              </div>
              System settings
            </h1>
            <p className="text-sm text-[#94A3B8] mt-1">Configure general preferences, platform parameters, email services, security logs, and storefront elements.</p>
          </div>
        </div>

        {error && (
          <div className="bg-[#EF4444]/20 border border-[#EF4444]/30 text-white px-5 py-3.5 rounded-xl text-sm font-bold flex items-center gap-2 max-w-5xl">
            <AlertTriangle className="w-5 h-5 text-[#EF4444] shrink-0" /> {error}
          </div>
        )}

        {success && (
          <div className="bg-[#22C55E]/20 border border-[#22C55E]/30 text-white px-5 py-3.5 rounded-xl text-sm font-bold flex items-center gap-2 max-w-5xl">
            <Check className="w-5 h-5 text-[#22C55E] shrink-0" /> Settings updated successfully!
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 admin-card max-w-5xl">
            <Loader2 className="w-10 h-10 text-[#22C55E] animate-spin mb-4" />
            <p className="text-sm font-semibold text-[#94A3B8]">Loading system settings...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 max-w-7xl items-start">
            
            {/* Sidebar Navigation */}
            <div className="lg:col-span-1 space-y-2 bg-[#081A38] p-4 rounded-2xl border border-white/8">
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left uppercase tracking-wider ${
                      isActive 
                        ? 'bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white shadow-md' 
                        : 'text-[#94A3B8] hover:bg-white/4 hover:text-white'
                    }`}
                  >
                    <IconComponent className="w-4 h-4 shrink-0" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Form Fields panel */}
            <form onSubmit={handleSave} className="lg:col-span-3 admin-card space-y-6">
              
              {/* Tab 1: General Settings */}
              {activeTab === 'general' && (
                <div className="space-y-6">
                  <div className="border-b border-white/8 pb-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <SettingsIcon className="w-5 h-5 text-[#22C55E]" /> General Configuration
                    </h2>
                    <p className="text-xs text-[#94A3B8] mt-0.5">Manage store details, contact info, working hours, and localization</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Store Outlet Name</label>
                      <input
                        type="text"
                        name="storeName"
                        required
                        value={formData.storeName}
                        onChange={handleInputChange}
                        className="admin-form-input text-sm font-semibold"
                        placeholder="e.g. Tiruchendur Murugan"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Store Logo URL</label>
                      <input
                        type="text"
                        name="storeLogo"
                        value={formData.storeLogo}
                        onChange={handleInputChange}
                        className="admin-form-input text-sm font-semibold"
                        placeholder="e.g. /uploads/logo.png"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Store Address</label>
                    <input
                      type="text"
                      name="storeAddress"
                      value={formData.storeAddress}
                      onChange={handleInputChange}
                      className="admin-form-input text-sm font-semibold"
                      placeholder="e.g. Sriperumbudur, Tamil Nadu - 602105"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Phone Number</label>
                      <input
                        type="text"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="admin-form-input text-sm font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Email Address</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="admin-form-input text-sm font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">WhatsApp Number</label>
                      <input
                        type="text"
                        name="supportWhatsApp"
                        value={formData.supportWhatsApp}
                        onChange={handleInputChange}
                        className="admin-form-input text-sm font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Working Hours</label>
                      <input
                        type="text"
                        name="workingHours"
                        value={formData.workingHours}
                        onChange={handleInputChange}
                        className="admin-form-input text-sm font-semibold"
                        placeholder="e.g. 06:00 AM - 09:00 PM"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">GST Percentage</label>
                      <input
                        type="number"
                        name="gstPercentage"
                        value={formData.gstPercentage}
                        onChange={handleInputChange}
                        className="admin-form-input text-sm font-semibold"
                        placeholder="e.g. 5"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Invoice Prefix</label>
                      <input
                        type="text"
                        name="invoicePrefix"
                        value={formData.invoicePrefix}
                        onChange={handleInputChange}
                        className="admin-form-input text-sm font-semibold"
                        placeholder="e.g. INV-"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Invoice Footer Notes</label>
                      <input
                        type="text"
                        name="invoiceFooter"
                        value={formData.invoiceFooter}
                        onChange={handleInputChange}
                        className="admin-form-input text-sm font-semibold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Store Description</label>
                    <textarea
                      name="storeDescription"
                      value={formData.storeDescription}
                      onChange={handleInputChange}
                      rows={3}
                      className="admin-form-input text-sm font-semibold h-[100px] py-3"
                      placeholder="About your store..."
                    />
                  </div>

                  <div className="border-t border-white/8 pt-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                      <MapPin className="w-4 h-4 text-[#22C55E]" /> Coordinate Centroid
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Latitude</label>
                        <input
                          type="number"
                          step="any"
                          value={formData.lat}
                          onChange={(e) => setFormData(prev => ({ ...prev, lat: Number(e.target.value) }))}
                          className="admin-form-input text-sm font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Longitude</label>
                        <input
                          type="number"
                          step="any"
                          value={formData.lon}
                          onChange={(e) => setFormData(prev => ({ ...prev, lon: Number(e.target.value) }))}
                          className="admin-form-input text-sm font-semibold"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Platform & Styling */}
              {activeTab === 'platform' && (
                <div className="space-y-6">
                  <div className="border-b border-white/8 pb-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Globe className="w-5 h-5 text-[#22C55E]" /> Platform Customization & Branding
                    </h2>
                    <p className="text-xs text-[#94A3B8] mt-0.5">Customize public website assets, theme colors, banners, and HTML meta tags</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Website Display Name</label>
                      <input
                        type="text"
                        name="websiteName"
                        value={formData.websiteName}
                        onChange={handleInputChange}
                        className="admin-form-input text-sm font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Browser Meta Title</label>
                      <input
                        type="text"
                        name="browserTitle"
                        value={formData.browserTitle}
                        onChange={handleInputChange}
                        className="admin-form-input text-sm font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Website Logo URL</label>
                      <input
                        type="text"
                        name="websiteLogo"
                        value={formData.websiteLogo}
                        onChange={handleInputChange}
                        className="admin-form-input text-sm font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Favicon URL (.ico / .png)</label>
                      <input
                        type="text"
                        name="favicon"
                        value={formData.favicon}
                        onChange={handleInputChange}
                        className="admin-form-input text-sm font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Primary Brand Color</label>
                      <div className="flex gap-3">
                        <input
                          type="color"
                          name="primaryThemeColor"
                          value={formData.primaryThemeColor}
                          onChange={handleInputChange}
                          className="w-14 h-[52px] rounded-xl border border-white/8 cursor-pointer bg-transparent"
                        />
                        <input
                          type="text"
                          name="primaryThemeColor"
                          value={formData.primaryThemeColor}
                          onChange={handleInputChange}
                          className="admin-form-input text-sm font-semibold uppercase font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Secondary Accent Color</label>
                      <div className="flex gap-3">
                        <input
                          type="color"
                          name="secondaryThemeColor"
                          value={formData.secondaryThemeColor}
                          onChange={handleInputChange}
                          className="w-14 h-[52px] rounded-xl border border-white/8 cursor-pointer bg-transparent"
                        />
                        <input
                          type="text"
                          name="secondaryThemeColor"
                          value={formData.secondaryThemeColor}
                          onChange={handleInputChange}
                          className="admin-form-input text-sm font-semibold uppercase font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Homepage Banner Image URL</label>
                    <input
                      type="text"
                      name="homepageBanner"
                      value={formData.homepageBanner}
                      onChange={handleInputChange}
                      className="admin-form-input text-sm font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Announcement Header Bar Text</label>
                    <input
                      type="text"
                      name="announcementBanner"
                      value={formData.announcementBanner}
                      onChange={handleInputChange}
                      className="admin-form-input text-sm font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Footer Copyright / Info Content</label>
                    <input
                      type="text"
                      name="footerContent"
                      value={formData.footerContent}
                      onChange={handleInputChange}
                      className="admin-form-input text-sm font-semibold"
                    />
                  </div>
                </div>
              )}

              {/* Tab 3: User Preferences */}
              {activeTab === 'preferences' && (
                <div className="space-y-6">
                  <div className="border-b border-white/8 pb-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Sliders className="w-5 h-5 text-[#22C55E]" /> Customer Side Preferences
                    </h2>
                    <p className="text-xs text-[#94A3B8] mt-0.5">Toggle interface elements, wishlist, reviews, and currency models</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Default Store Language</label>
                      <select
                        name="defaultLanguage"
                        value={formData.defaultLanguage}
                        onChange={handleInputChange}
                        className="admin-form-input text-sm font-semibold bg-[#081A38]"
                      >
                        <option value="en">English (default)</option>
                        <option value="ta">Tamil (தமிழ்)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Default Currency</label>
                      <input
                        type="text"
                        name="defaultCurrency"
                        value={formData.defaultCurrency}
                        onChange={handleInputChange}
                        className="admin-form-input text-sm font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Default Website Theme</label>
                      <select
                        name="defaultTheme"
                        value={formData.defaultTheme}
                        onChange={handleInputChange}
                        className="admin-form-input text-sm font-semibold bg-[#081A38]"
                      >
                        <option value="light">Light Theme</option>
                        <option value="dark">Dark Theme</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4 bg-white/4 p-5 rounded-2xl border border-white/8">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Feature Toggles</h3>
                    
                    <div className="flex items-center justify-between py-2 border-b border-white/4">
                      <div>
                        <p className="text-xs font-bold text-white">Enable Product Reviews</p>
                        <p className="text-[11px] text-[#94A3B8] mt-0.5">Allows verified purchasers to submit ratings and reviews</p>
                      </div>
                      <input
                        type="checkbox"
                        name="enableProductReviews"
                        checked={formData.enableProductReviews}
                        onChange={handleInputChange}
                        className="w-5 h-5 accent-[#22C55E] cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-white/4">
                      <div>
                        <p className="text-xs font-bold text-white">Enable Wishlists</p>
                        <p className="text-[11px] text-[#94A3B8] mt-0.5">Allows customers to bookmark products for later purchase</p>
                      </div>
                      <input
                        type="checkbox"
                        name="enableWishlist"
                        checked={formData.enableWishlist}
                        onChange={handleInputChange}
                        className="w-5 h-5 accent-[#22C55E] cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-white/4">
                      <div>
                        <p className="text-xs font-bold text-white">Enable Search Suggestions</p>
                        <p className="text-[11px] text-[#94A3B8] mt-0.5">Displays real-time hints as customer types in search bar</p>
                      </div>
                      <input
                        type="checkbox"
                        name="enableSearchSuggestions"
                        checked={formData.enableSearchSuggestions}
                        onChange={handleInputChange}
                        className="w-5 h-5 accent-[#22C55E] cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-xs font-bold text-white">Enable Browser Notification Prompts</p>
                        <p className="text-[11px] text-[#94A3B8] mt-0.5">Requests subscription to send push notification alerts</p>
                      </div>
                      <input
                        type="checkbox"
                        name="enableNotifications"
                        checked={formData.enableNotifications}
                        onChange={handleInputChange}
                        className="w-5 h-5 accent-[#22C55E] cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Maintenance Mode & Disables */}
              {activeTab === 'maintenance' && (
                <div className="space-y-6">
                  <div className="border-b border-white/8 pb-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-[#EF4444]" /> Maintenance & Feature Lockout
                    </h2>
                    <p className="text-xs text-[#94A3B8] mt-0.5">Enforce system-wide maintenance mode or toggle specific user features independently</p>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444]/25 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-black text-white flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-[#EF4444]" /> GLOBAL MAINTENANCE MODE
                      </p>
                      <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed">
                        When active, customer accounts cannot login, register, checkout, or make orders.
                        The website displays an "Under Maintenance" page. Admins can still log in and manage the store.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      name="maintenanceMode"
                      checked={formData.maintenanceMode}
                      onChange={handleInputChange}
                      className="w-6 h-6 bg-[#EF4444]/20 border border-[#EF4444] rounded cursor-pointer accent-[#EF4444]"
                    />
                  </div>

                  <div className="space-y-4 bg-white/4 p-5 rounded-2xl border border-white/8">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Temporary Feature Switches</h3>

                    <div className="flex items-center justify-between py-2 border-b border-white/4">
                      <div>
                        <p className="text-xs font-bold text-white">Disable Customer Login</p>
                        <p className="text-[11px] text-[#94A3B8] mt-0.5">Stops customers from accessing existing accounts</p>
                      </div>
                      <input
                        type="checkbox"
                        name="disableCustomerLogin"
                        checked={formData.disableCustomerLogin}
                        onChange={handleInputChange}
                        className="w-5 h-5 accent-[#EF4444] cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-white/4">
                      <div>
                        <p className="text-xs font-bold text-white">Disable Registration</p>
                        <p className="text-[11px] text-[#94A3B8] mt-0.5">Blocks new customer sign-ups</p>
                      </div>
                      <input
                        type="checkbox"
                        name="disableRegistration"
                        checked={formData.disableRegistration}
                        onChange={handleInputChange}
                        className="w-5 h-5 accent-[#EF4444] cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-white/4">
                      <div>
                        <p className="text-xs font-bold text-white">Disable Cart Checkout</p>
                        <p className="text-[11px] text-[#94A3B8] mt-0.5">Prevents opening the checkout page</p>
                      </div>
                      <input
                        type="checkbox"
                        name="disableCheckout"
                        checked={formData.disableCheckout}
                        onChange={handleInputChange}
                        className="w-5 h-5 accent-[#EF4444] cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-white/4">
                      <div>
                        <p className="text-xs font-bold text-white">Disable Password Recovery</p>
                        <p className="text-[11px] text-[#94A3B8] mt-0.5">Stops forgot password OTP emails</p>
                      </div>
                      <input
                        type="checkbox"
                        name="disableForgotPassword"
                        checked={formData.disableForgotPassword}
                        onChange={handleInputChange}
                        className="w-5 h-5 accent-[#EF4444] cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-xs font-bold text-white">Disable Order Placement</p>
                        <p className="text-[11px] text-[#94A3B8] mt-0.5">Customers can checkout but cannot submit COD/orders</p>
                      </div>
                      <input
                        type="checkbox"
                        name="disableOrderPlacement"
                        checked={formData.disableOrderPlacement}
                        onChange={handleInputChange}
                        className="w-5 h-5 accent-[#EF4444] cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 5: Delivery Settings */}
              {activeTab === 'delivery' && (
                <div className="space-y-6">
                  <div className="border-b border-white/8 pb-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Truck className="w-5 h-5 text-[#22C55E]" /> Hyperlocal Logistics & Delivery charges
                    </h2>
                    <p className="text-xs text-[#94A3B8] mt-0.5">Configure radius boundaries, pricing ranges, thresholds, and timelines</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Delivery Radius (KM)</label>
                      <input
                        type="number"
                        name="deliveryRadiusKm"
                        value={formData.deliveryRadiusKm}
                        onChange={handleInputChange}
                        className="admin-form-input text-sm font-bold"
                        min={1}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Delivery Speed / Timing Text</label>
                      <input
                        type="text"
                        name="deliveryTiming"
                        value={formData.deliveryTiming}
                        onChange={handleInputChange}
                        className="admin-form-input text-sm font-semibold"
                        placeholder="e.g. Same Day Delivery (3-4 Hours)"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Minimum Order Value (₹)</label>
                      <input
                        type="number"
                        name="minOrderValue"
                        value={formData.minOrderValue}
                        onChange={handleInputChange}
                        className="admin-form-input text-sm font-bold"
                        min={0}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Maximum Order Value (₹)</label>
                      <input
                        type="number"
                        name="maxOrderValue"
                        value={formData.maxOrderValue}
                        onChange={handleInputChange}
                        className="admin-form-input text-sm font-bold"
                        min={1}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Base Delivery Charge (₹)</label>
                      <input
                        type="number"
                        name="deliveryCharges"
                        value={formData.deliveryCharges}
                        onChange={handleInputChange}
                        className="admin-form-input text-sm font-bold"
                        min={0}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Free Delivery Threshold (₹)</label>
                      <input
                        type="number"
                        name="freeDeliveryThreshold"
                        value={formData.freeDeliveryThreshold}
                        onChange={handleInputChange}
                        className="admin-form-input text-sm font-bold"
                        min={0}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 6: Order & Invoice */}
              {activeTab === 'order' && (
                <div className="space-y-6">
                  <div className="border-b border-white/8 pb-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <FileText className="w-5 h-5 text-[#22C55E]" /> Order Pipeline & Status Colors
                    </h2>
                    <p className="text-xs text-[#94A3B8] mt-0.5">Control automatic processing, limits, and UI statuses</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Customer Order Prefix</label>
                      <input
                        type="text"
                        name="orderPrefix"
                        value={formData.orderPrefix}
                        onChange={handleInputChange}
                        className="admin-form-input text-sm font-semibold"
                        placeholder="e.g. ORD-"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Cancellation Time Limit (Minutes)</label>
                      <input
                        type="number"
                        name="cancellationTimeLimit"
                        value={formData.cancellationTimeLimit}
                        onChange={handleInputChange}
                        className="admin-form-input text-sm font-bold"
                        min={1}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="flex items-center justify-between p-4 bg-white/4 rounded-xl border border-white/8">
                      <div>
                        <p className="text-xs font-bold text-white">Auto-Accept New Orders</p>
                        <p className="text-[10px] text-[#94A3B8] mt-0.5">Skips manual approval; accepts immediately</p>
                      </div>
                      <input
                        type="checkbox"
                        name="autoAcceptOrders"
                        checked={formData.autoAcceptOrders}
                        onChange={handleInputChange}
                        className="w-5 h-5 accent-[#22C55E] cursor-pointer"
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white/4 rounded-xl border border-white/8">
                      <div>
                        <p className="text-xs font-bold text-white">Auto-Generate Invoice PDF</p>
                        <p className="text-[10px] text-[#94A3B8] mt-0.5">Creates invoice instantly when order saves</p>
                      </div>
                      <input
                        type="checkbox"
                        name="autoGenerateInvoice"
                        checked={formData.autoGenerateInvoice}
                        onChange={handleInputChange}
                        className="w-5 h-5 accent-[#22C55E] cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-white/4 border border-white/8 space-y-4">
                    <h3 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Order Status Colors (UI)</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {Object.keys(formData.orderStatusColors).map((status) => (
                        <div key={status} className="flex flex-col gap-1.5 p-3 rounded-xl bg-black/20 border border-white/4">
                          <label className="text-[11px] font-bold text-white capitalize">{status}</label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={formData.orderStatusColors[status] || '#FFFFFF'}
                              onChange={(e) => handleNestedInputChange('orderStatusColors', status, e.target.value)}
                              className="w-8 h-8 rounded border border-white/8 cursor-pointer bg-transparent"
                            />
                            <input
                              type="text"
                              value={formData.orderStatusColors[status] || ''}
                              onChange={(e) => handleNestedInputChange('orderStatusColors', status, e.target.value)}
                              className="w-full text-xs font-mono font-bold uppercase bg-transparent text-white border-0 p-0 focus:ring-0"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 7: Notifications Settings */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <div className="border-b border-white/8 pb-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Bell className="w-5 h-5 text-[#22C55E]" /> Alerts & Dispatch Channels
                    </h2>
                    <p className="text-xs text-[#94A3B8] mt-0.5">Toggle admin internal alerts and external messaging delivery systems</p>
                  </div>

                  <div className="space-y-4 bg-white/4 p-5 rounded-2xl border border-white/8">
                    <div className="flex items-center justify-between py-2 border-b border-white/4">
                      <div>
                        <p className="text-xs font-bold text-white">New Order Admin Notifications</p>
                        <p className="text-[11px] text-[#94A3B8] mt-0.5">Sounds alert bell when customers submit orders</p>
                      </div>
                      <input
                        type="checkbox"
                        name="enableOrderNotifications"
                        checked={formData.enableOrderNotifications}
                        onChange={handleInputChange}
                        className="w-5 h-5 accent-[#22C55E] cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-white/4">
                      <div>
                        <p className="text-xs font-bold text-white">User Registration Notification</p>
                        <p className="text-[11px] text-[#94A3B8] mt-0.5">Alerts when new customer accounts verify registration</p>
                      </div>
                      <input
                        type="checkbox"
                        name="enableRegistrationNotifications"
                        checked={formData.enableRegistrationNotifications}
                        onChange={handleInputChange}
                        className="w-5 h-5 accent-[#22C55E] cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-white/4">
                      <div>
                        <p className="text-xs font-bold text-white">Low Stock Alerts</p>
                        <p className="text-[11px] text-[#94A3B8] mt-0.5">Triggers warning when product stock is equal or below 5 items</p>
                      </div>
                      <input
                        type="checkbox"
                        name="enableLowStockAlerts"
                        checked={formData.enableLowStockAlerts}
                        onChange={handleInputChange}
                        className="w-5 h-5 accent-[#22C55E] cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-white/4">
                      <div>
                        <p className="text-xs font-bold text-white">Promotional / Offers Push Alerts</p>
                        <p className="text-[11px] text-[#94A3B8] mt-0.5">Broadcasts offer banners and coupons to customers</p>
                      </div>
                      <input
                        type="checkbox"
                        name="enableOfferNotifications"
                        checked={formData.enableOfferNotifications}
                        onChange={handleInputChange}
                        className="w-5 h-5 accent-[#22C55E] cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-white/4">
                      <div>
                        <p className="text-xs font-bold text-white">Email Delivery Channels</p>
                        <p className="text-[11px] text-[#94A3B8] mt-0.5">Enables automated registration SMTP emails to customers</p>
                      </div>
                      <input
                        type="checkbox"
                        name="enableEmailNotifications"
                        checked={formData.enableEmailNotifications}
                        onChange={handleInputChange}
                        className="w-5 h-5 accent-[#22C55E] cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-xs font-bold text-white">Local Browser Push System</p>
                        <p className="text-[11px] text-[#94A3B8] mt-0.5">Enables browser-level HTML5 notifications when tab is backgrounded</p>
                      </div>
                      <input
                        type="checkbox"
                        name="enableBrowserNotifications"
                        checked={formData.enableBrowserNotifications}
                        onChange={handleInputChange}
                        className="w-5 h-5 accent-[#22C55E] cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 8: Security Settings */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <div className="border-b border-white/8 pb-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Shield className="w-5 h-5 text-[#22C55E]" /> Lockout & Security Policies
                    </h2>
                    <p className="text-xs text-[#94A3B8] mt-0.5">Control inactivity triggers, customer password strengths, and panel lockouts</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Session Timeout (Minutes)</label>
                      <input
                        type="number"
                        name="sessionTimeout"
                        value={formData.sessionTimeout}
                        onChange={handleInputChange}
                        className="admin-form-input text-sm font-bold"
                        min={1}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Max Login Attempts (Lockout)</label>
                      <input
                        type="number"
                        name="maxLoginAttempts"
                        value={formData.maxLoginAttempts}
                        onChange={handleInputChange}
                        className="admin-form-input text-sm font-bold"
                        min={3}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Password Policy strength</label>
                      <select
                        name="passwordPolicy"
                        value={formData.passwordPolicy}
                        onChange={handleInputChange}
                        className="admin-form-input text-sm font-semibold bg-[#081A38]"
                      >
                        <option value="Low">Low (Any character, min 6)</option>
                        <option value="Medium">Medium (Letters & numbers, min 8)</option>
                        <option value="High">High (Uppercase, number, symbol, min 10)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white/4 rounded-xl border border-white/8">
                    <div>
                      <p className="text-xs font-bold text-white">Require Admin 2FA Verification (Optional)</p>
                      <p className="text-[10px] text-[#94A3B8] mt-0.5">Prompts for supplementary email authentication upon login</p>
                    </div>
                    <input
                      type="checkbox"
                      name="admin2FA"
                      checked={formData.admin2FA}
                      onChange={handleInputChange}
                      className="w-5 h-5 accent-[#22C55E] cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* Tab 9: SMTP Config */}
              {activeTab === 'smtp' && (
                <div className="space-y-6">
                  <div className="border-b border-white/8 pb-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Mail className="w-5 h-5 text-[#22C55E]" /> SMTP Mail Server Integration
                    </h2>
                    <p className="text-xs text-[#94A3B8] mt-0.5">Verify and save the configuration of outbound email SMTP connections</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">SMTP Host URL</label>
                      <input
                        type="text"
                        name="smtpHost"
                        value={formData.smtpHost}
                        onChange={handleInputChange}
                        className="admin-form-input text-sm font-semibold"
                        placeholder="e.g. smtp.gmail.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">SMTP Port</label>
                      <input
                        type="number"
                        name="smtpPort"
                        value={formData.smtpPort}
                        onChange={handleInputChange}
                        className="admin-form-input text-sm font-bold"
                        placeholder="e.g. 587"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">SMTP Username / Email</label>
                      <input
                        type="text"
                        name="smtpUsername"
                        value={formData.smtpUsername}
                        onChange={handleInputChange}
                        className="admin-form-input text-sm font-semibold"
                        placeholder="username@domain.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">SMTP Password / App Password</label>
                      <input
                        type="password"
                        name="smtpPassword"
                        value={formData.smtpPassword}
                        onChange={handleInputChange}
                        className="admin-form-input text-sm font-semibold font-mono"
                        placeholder="••••••••••••••••"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Sender Display Name</label>
                      <input
                        type="text"
                        name="senderName"
                        value={formData.senderName}
                        onChange={handleInputChange}
                        className="admin-form-input text-sm font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Sender Email Address</label>
                      <input
                        type="email"
                        name="senderEmail"
                        value={formData.senderEmail}
                        onChange={handleInputChange}
                        className="admin-form-input text-sm font-semibold"
                        placeholder="no-reply@domain.com"
                      />
                    </div>
                  </div>

                  {/* Test Connection Wrapper */}
                  <div className="p-5 rounded-2xl bg-white/4 border border-white/8 space-y-4">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Test Current Connection</h3>
                    <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                      Send a verification test email using the inputs filled above (without saving them first) to make sure Gmail/SMTP authentication passes.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 items-end">
                      <div className="w-full">
                        <label className="block text-[10px] font-bold text-[#94A3B8] uppercase mb-1.5">Recipient Test Email</label>
                        <input
                          type="email"
                          value={testEmail}
                          onChange={(e) => setTestEmail(e.target.value)}
                          className="admin-form-input text-sm font-semibold h-[48px]"
                          placeholder="recipient@example.com"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleTestEmail}
                        disabled={testingEmail}
                        className="admin-btn-secondary h-[48px] whitespace-nowrap shrink-0 text-xs font-bold"
                      >
                        {testingEmail ? <Loader2 className="w-4 h-4 animate-spin text-[#22C55E]" /> : 'Send Test Email'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 10: Website Content */}
              {activeTab === 'website-content' && (
                <div className="space-y-6">
                  <div className="border-b border-white/8 pb-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Laptop className="w-5 h-5 text-[#22C55E]" /> Storefront Information Pages
                    </h2>
                    <p className="text-xs text-[#94A3B8] mt-0.5">Customize static page documents and promotional banner values on the home page</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Offers Banner Image URL</label>
                    <input
                      type="text"
                      name="offersBanner"
                      value={formData.offersBanner}
                      onChange={handleInputChange}
                      className="admin-form-input text-sm font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">About Us Content</label>
                    <textarea
                      name="aboutUs"
                      value={formData.aboutUs}
                      onChange={handleInputChange}
                      rows={4}
                      className="admin-form-input text-sm font-semibold h-[120px] py-3"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Contact Details Content</label>
                    <textarea
                      name="contactUs"
                      value={formData.contactUs}
                      onChange={handleInputChange}
                      rows={3}
                      className="admin-form-input text-sm font-semibold h-[100px] py-3"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Privacy Policy</label>
                      <textarea
                        name="privacyPolicy"
                        value={formData.privacyPolicy}
                        onChange={handleInputChange}
                        rows={5}
                        className="admin-form-input text-sm font-semibold h-[150px] py-3"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Terms & Conditions</label>
                      <textarea
                        name="termsAndConditions"
                        value={formData.termsAndConditions}
                        onChange={handleInputChange}
                        rows={5}
                        className="admin-form-input text-sm font-semibold h-[150px] py-3"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/8">
                <button
                  type="submit"
                  disabled={saving}
                  className="admin-btn-primary h-[52px] px-8 text-sm font-bold flex items-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Settings;
