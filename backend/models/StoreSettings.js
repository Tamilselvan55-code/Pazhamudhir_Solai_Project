import mongoose from 'mongoose';

const storeSettingsSchema = new mongoose.Schema({
  // 1. General Settings
  storeName: { type: String, default: 'Tiruchendur Murugan Pazhamudhir Solai' },
  storeLogo: { type: String, default: '' },
  storeAddress: { type: String, default: 'Sriperumbudur, Tamil Nadu - 602105' },
  phone: { type: String, default: '+91 94443 62453' },
  email: { type: String, default: 'thiruchendurmurugan192@gmail.com' },
  supportWhatsApp: { type: String, default: '+91 94443 62453' },
  workingHours: { type: String, default: '06:00 AM - 09:00 PM' },
  deliveryRadiusKm: { type: Number, default: 5 },
  currency: { type: String, default: '₹' },
  gstPercentage: { type: Number, default: 0 },
  invoicePrefix: { type: String, default: 'INV-' },
  invoiceFooter: { type: String, default: 'Thank you for shopping with us! Visit again.' },
  storeDescription: { type: String, default: 'Fresh fruits, vegetables, groceries and daily essentials.' },

  // Location coordinates centroid
  location: {
    lat: { type: Number, default: 13.0606941 },
    lon: { type: Number, default: 80.2270751 },
  },

  // 2. Platform Settings
  websiteName: { type: String, default: 'Tiruchendur Murugan Pazhamudhir Solai' },
  websiteLogo: { type: String, default: '' },
  browserTitle: { type: String, default: 'Tiruchendur Murugan Pazhamudhir Solai - Online Grocery Store' },
  favicon: { type: String, default: '' },
  primaryThemeColor: { type: String, default: '#16a34a' },
  secondaryThemeColor: { type: String, default: '#81c784' },
  homepageBanner: { type: String, default: '' },
  announcementBanner: { type: String, default: 'Welcome to Tiruchendur Murugan Pazhamudhir Solai! Fresh fruits and vegetables.' },
  footerContent: { type: String, default: '© 2026 Tiruchendur Murugan Pazhamudhir Solai. All rights reserved.' },

  // 3. User Preferences
  defaultLanguage: { type: String, default: 'en' }, // 'en' | 'ta'
  defaultCurrency: { type: String, default: '₹' },
  defaultTheme: { type: String, default: 'light' }, // 'light' | 'dark'
  enableProductReviews: { type: Boolean, default: true },
  enableWishlist: { type: Boolean, default: true },
  enableSearchSuggestions: { type: Boolean, default: true },
  enableNotifications: { type: Boolean, default: true },

  // 4. Maintenance Mode
  maintenanceMode: { type: Boolean, default: false },

  // 5. Temporary Login Disable
  disableCustomerLogin: { type: Boolean, default: false },
  disableRegistration: { type: Boolean, default: false },
  disableCheckout: { type: Boolean, default: false },
  disableForgotPassword: { type: Boolean, default: false },
  disableOrderPlacement: { type: Boolean, default: false },

  // 6. Delivery Settings
  minOrderValue: { type: Number, default: 0 },
  maxOrderValue: { type: Number, default: 100000 },
  freeDeliveryThreshold: { type: Number, default: 500 },
  deliveryCharges: { type: Number, default: 40 },
  deliveryTiming: { type: String, default: 'Same Day Delivery' },

  // 10. Order Settings
  orderPrefix: { type: String, default: 'ORD-' },
  autoAcceptOrders: { type: Boolean, default: false },
  autoGenerateInvoice: { type: Boolean, default: true },
  orderStatusColors: {
    type: Map,
    of: String,
    default: {
      'Pending': '#F59E0B',
      'Accepted': '#3B82F6',
      'Out for Delivery': '#06B6D4',
      'Delivered': '#10B981',
      'Cancelled': '#EF4444'
    }
  },
  cancellationTimeLimit: { type: Number, default: 30 }, // in minutes

  // 11. Notification Settings
  enableOrderNotifications: { type: Boolean, default: true },
  enableRegistrationNotifications: { type: Boolean, default: true },
  enableLowStockAlerts: { type: Boolean, default: true },
  enableOfferNotifications: { type: Boolean, default: true },
  enableEmailNotifications: { type: Boolean, default: true },
  enableBrowserNotifications: { type: Boolean, default: true },

  // 12. Security Settings
  sessionTimeout: { type: Number, default: 15 }, // in minutes
  maxLoginAttempts: { type: Number, default: 5 },
  passwordPolicy: { type: String, default: 'Medium' }, // Low | Medium | High
  admin2FA: { type: Boolean, default: false },

  // 13. Email Settings
  smtpHost: { type: String, default: '' },
  smtpPort: { type: Number, default: 587 },
  smtpUsername: { type: String, default: '' },
  smtpPassword: { type: String, default: '' },
  senderName: { type: String, default: 'Tiruchendur Murugan Pazhamudhir Solai' },
  senderEmail: { type: String, default: '' },

  // 14. Analytics Settings
  dashboardRefreshInterval: { type: Number, default: 30 }, // in seconds
  enableSalesCharts: { type: Boolean, default: true },
  enableRevenueReports: { type: Boolean, default: true },
  enableTopProducts: { type: Boolean, default: true },
  enableCustomerStats: { type: Boolean, default: true },

  // 16. Website Content
  offersBanner: { type: String, default: '' },
  aboutUs: { type: String, default: 'We are a dedicated local grocery store providing fresh organic goods.' },
  contactUs: { type: String, default: 'Contact us via phone or email.' },
  privacyPolicy: { type: String, default: 'Your privacy is our priority.' },
  termsAndConditions: { type: String, default: 'Standard terms and conditions apply.' }
}, { timestamps: true });

const StoreSettings = mongoose.model('StoreSettings', storeSettingsSchema);
export default StoreSettings;
