import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import SEO from '../components/SEO/SEO';
import { 
  FileText, Lock, User, ShoppingBag, Truck, CreditCard, 
  XCircle, RefreshCcw, Shield, AlertCircle, Phone, Globe, Info, Mail
} from 'lucide-react';
import useSettingsStore from '../store/useSettingsStore';

const Legal = () => {
  const settings = useSettingsStore(s => s.settings);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('terms');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'privacy') {
      setActiveTab('privacy');
    } else if (tab === 'about') {
      setActiveTab('about');
    } else if (tab === 'contact') {
      setActiveTab('contact');
    } else {
      setActiveTab('terms');
    }
  }, [searchParams]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  useEffect(() => {
    document.title = `Legal Information - ${settings?.websiteName || 'Tiruchendur Murugan Pazhamudhir Solai'}`;
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', `Terms & Conditions and Privacy Policy for ${settings?.storeName || 'Tiruchendur Murugan Pazhamudhir Solai'}.`);
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = `Terms & Conditions and Privacy Policy for ${settings?.storeName || 'Tiruchendur Murugan Pazhamudhir Solai'}.`;
      document.head.appendChild(meta);
    }
  }, []);

  const termsSections = [
    {
      id: 1,
      title: 'Account',
      icon: <User className="w-5 h-5 text-green-600" />,
      content: 'One account per customer. Ensure your information is up to date.'
    },
    {
      id: 2,
      title: 'Orders',
      icon: <ShoppingBag className="w-5 h-5 text-green-600" />,
      content: 'Orders are confirmed only after successful placement.'
    },
    {
      id: 3,
      title: 'Pricing',
      icon: <AlertCircle className="w-5 h-5 text-green-600" />,
      content: 'Prices and stock availability may change without prior notice.'
    },
    {
      id: 4,
      title: 'Delivery',
      icon: <Truck className="w-5 h-5 text-green-600" />,
      content: 'Delivery is available only within our configured service area.'
    },
    {
      id: 5,
      title: 'Payments',
      icon: <CreditCard className="w-5 h-5 text-green-600" />,
      content: 'Cash on Delivery is supported.'
    },
    {
      id: 6,
      title: 'Returns',
      icon: <RefreshCcw className="w-5 h-5 text-green-600" />,
      content: 'Returns are accepted for damaged or incorrect items only.'
    },
    {
      id: 7,
      title: 'User Responsibility',
      icon: <Shield className="w-5 h-5 text-green-600" />,
      content: 'Please provide an accurate delivery address and phone number.'
    },
    {
      id: 8,
      title: 'Contact',
      icon: <Phone className="w-5 h-5 text-green-600" />,
      content: (
        <div className="mt-2 text-sm">
          <p><strong>Email:</strong> support@tiruchendurmurugan.com</p>
          <p><strong>Phone:</strong> +91 XXXXX XXXXX</p>
        </div>
      )
    }
  ];

  const privacySections = [
    {
      id: 1,
      title: 'Information We Collect',
      icon: <FileText className="w-5 h-5 text-green-600" />,
      content: (
        <ul className="list-disc pl-5 space-y-1">
          <li>Name</li>
          <li>Phone Number</li>
          <li>Email</li>
          <li>Delivery Address</li>
        </ul>
      )
    },
    {
      id: 2,
      title: 'How We Use Information',
      icon: <RefreshCcw className="w-5 h-5 text-green-600" />,
      content: (
        <ul className="list-disc pl-5 space-y-1">
          <li>Order processing</li>
          <li>Customer support</li>
          <li>Notifications regarding orders and offers</li>
        </ul>
      )
    },
    {
      id: 3,
      title: 'Data Protection',
      icon: <Shield className="w-5 h-5 text-green-600" />,
      content: 'Customer information is stored securely following standard security practices.'
    },
    {
      id: 4,
      title: 'Sharing',
      icon: <Lock className="w-5 h-5 text-green-600" />,
      content: 'We respect your privacy and never sell customer data to third parties.'
    },
    {
      id: 5,
      title: 'Cookies',
      icon: <Globe className="w-5 h-5 text-green-600" />,
      content: 'This website may use cookies to improve user experience.'
    },
    {
      id: 6,
      title: 'Contact',
      icon: <Phone className="w-5 h-5 text-green-600" />,
      content: (
        <div className="mt-2 text-sm">
          <p><strong>Support Email:</strong> {settings?.email || 'support@tiruchendurmurugan.com'}</p>
          <p><strong>Support Phone:</strong> {settings?.phone || '+91 XXXXX XXXXX'}</p>
        </div>
      )
    }
  ];

  const aboutSections = [
    {
      id: 1,
      title: 'About Us',
      icon: <Info className="w-5 h-5 text-green-600" />,
      content: settings?.aboutUs || 'We are a dedicated local grocery store providing fresh organic goods.'
    }
  ];

  const contactSections = [
    {
      id: 1,
      title: 'Contact Us',
      icon: <Mail className="w-5 h-5 text-green-600" />,
      content: (
        <div className="text-sm space-y-2">
          {settings?.contactUs && <p>{settings.contactUs}</p>}
          <p><strong>Address:</strong> {settings?.storeAddress || 'Sriperumbudur, Tamil Nadu - 602105'}</p>
          <p><strong>Phone:</strong> {settings?.phone || '+91 94443 62453'}</p>
          <p><strong>Email:</strong> {settings?.email || 'thiruchendurmurugan192@gmail.com'}</p>
          <p><strong>WhatsApp:</strong> {settings?.supportWhatsApp || '+91 94443 62453'}</p>
        </div>
      )
    }
  ];

  return (
    <>
      <SEO title="Legal Policies | Tiruchendur Murugan Pazhamudhir Solai" description="Privacy policy and terms of service." canonicalPath="/legal" />
      <div className="pb-28 max-w-4xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6">
      
      {/* Header Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-6 text-center">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">
          {activeTab === 'about' ? 'About Us' : activeTab === 'contact' ? 'Contact Us' : 'Legal Information'}
        </h1>
        <p className="text-sm sm:text-base text-gray-500 max-w-2xl mx-auto">
          {activeTab === 'about' ? `Learn more about ${settings?.storeName || 'our store'}` : activeTab === 'contact' ? 'Get in touch with us' : `Terms & Conditions and Privacy Policy for ${settings?.storeName || 'Tiruchendur Murugan Pazhamudhir Solai'}.`}
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex bg-white rounded-xl shadow-sm border border-gray-100 p-1 mb-6">
        <button
          onClick={() => handleTabChange('terms')}
          className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 rounded-lg transition-all ${
            activeTab === 'terms' ? 'bg-green-50 text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          📄 Terms
        </button>
        <button
          onClick={() => handleTabChange('privacy')}
          className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 rounded-lg transition-all ${
            activeTab === 'privacy' ? 'bg-green-50 text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          🔒 Privacy
        </button>
        <button
          onClick={() => handleTabChange('about')}
          className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 rounded-lg transition-all ${
            activeTab === 'about' ? 'bg-green-50 text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          ℹ️ About
        </button>
        <button
          onClick={() => handleTabChange('contact')}
          className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 rounded-lg transition-all ${
            activeTab === 'contact' ? 'bg-green-50 text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          📞 Contact
        </button>
      </div>

      {/* Content Sections */}
      <div className="space-y-4 animate-in fade-in duration-300 relative">
        {(activeTab === 'terms' ? termsSections : activeTab === 'privacy' ? privacySections : activeTab === 'about' ? aboutSections : contactSections).map((section) => (
          <div 
            key={section.id} 
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 transition-all hover:shadow-md"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-green-50 p-2 rounded-lg">
                {section.icon}
              </div>
              <h2 className="text-lg font-bold text-gray-800">
                {section.title}
              </h2>
            </div>
            <div className="text-sm text-gray-600 leading-relaxed ml-11">
              {section.content}
            </div>
          </div>
        ))}
      </div>

    </div>
    </>
  );
};

export default Legal;
