import React, { useEffect } from 'react';
import { 
  FileText, 
  User, 
  ShoppingBag, 
  Truck, 
  CreditCard, 
  XCircle, 
  RefreshCcw, 
  Shield, 
  Lock, 
  FileSignature, 
  AlertCircle, 
  Phone 
} from 'lucide-react';

const Terms = () => {
  useEffect(() => {
    document.title = "Terms & Conditions - Tiruchendur Murugan Pazhamudhir Solai";
    // Add meta description for SEO
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Terms and Conditions for Tiruchendur Murugan Pazhamudhir Solai. Please read these terms carefully before using our services.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Terms and Conditions for Tiruchendur Murugan Pazhamudhir Solai. Please read these terms carefully before using our services.';
      document.head.appendChild(meta);
    }
  }, []);

  const sections = [
    {
      id: 1,
      title: 'Acceptance of Terms',
      icon: <FileText className="w-5 h-5 text-green-600" />,
      content: 'By accessing and using this application, you accept and agree to be bound by the terms and provisions of this agreement.'
    },
    {
      id: 2,
      title: 'User Account',
      icon: <User className="w-5 h-5 text-green-600" />,
      content: (
        <ul className="list-disc pl-5 space-y-1">
          <li>You must provide a valid mobile number and email.</li>
          <li>Only one account is permitted per customer.</li>
        </ul>
      )
    },
    {
      id: 3,
      title: 'Product Information',
      icon: <ShoppingBag className="w-5 h-5 text-green-600" />,
      content: (
        <ul className="list-disc pl-5 space-y-1">
          <li>Images are for reference purposes only.</li>
          <li>Prices are subject to change without prior notice.</li>
          <li>Product availability depends strictly on stock.</li>
        </ul>
      )
    },
    {
      id: 4,
      title: 'Orders',
      icon: <FileSignature className="w-5 h-5 text-green-600" />,
      content: (
        <ul className="list-disc pl-5 space-y-1">
          <li>Orders are confirmed only after successful placement.</li>
          <li>The store reserves the right to cancel unavailable products.</li>
          <li>Customers will be notified in the event of any changes to their order.</li>
        </ul>
      )
    },
    {
      id: 5,
      title: 'Delivery',
      icon: <Truck className="w-5 h-5 text-green-600" />,
      content: (
        <ul className="list-disc pl-5 space-y-1">
          <li>Delivery is available only within our configured delivery radius.</li>
          <li>Delivery charges may apply depending on distance and order value.</li>
          <li>Delivery times are estimated and may vary due to unforeseen circumstances.</li>
        </ul>
      )
    },
    {
      id: 6,
      title: 'Payments',
      icon: <CreditCard className="w-5 h-5 text-green-600" />,
      content: (
        <ul className="list-disc pl-5 space-y-1">
          <li>Cash on Delivery (COD) is supported.</li>
          <li>Refunds follow the standard store policy.</li>
        </ul>
      )
    },
    {
      id: 7,
      title: 'Cancellation',
      icon: <XCircle className="w-5 h-5 text-green-600" />,
      content: (
        <ul className="list-disc pl-5 space-y-1">
          <li>Orders can be cancelled before they are dispatched.</li>
          <li>The store reserves the right to reject or cancel abusive orders at its sole discretion.</li>
        </ul>
      )
    },
    {
      id: 8,
      title: 'Returns & Refunds',
      icon: <RefreshCcw className="w-5 h-5 text-green-600" />,
      content: (
        <ul className="list-disc pl-5 space-y-1">
          <li>Damaged or incorrect items are eligible for returns or refunds.</li>
          <li>Fresh fruits and vegetables cannot be returned after delivery unless they are found to be damaged upon arrival.</li>
        </ul>
      )
    },
    {
      id: 9,
      title: 'User Responsibilities',
      icon: <Shield className="w-5 h-5 text-green-600" />,
      content: (
        <ul className="list-disc pl-5 space-y-1">
          <li>You must provide an accurate delivery address.</li>
          <li>You must provide a correct and reachable phone number.</li>
          <li>You are responsible for maintaining your account security.</li>
        </ul>
      )
    },
    {
      id: 10,
      title: 'Privacy',
      icon: <Lock className="w-5 h-5 text-green-600" />,
      content: (
        <ul className="list-disc pl-5 space-y-1">
          <li>Customer data is protected using industry-standard measures.</li>
          <li>Personal information is never sold to third parties.</li>
        </ul>
      )
    },
    {
      id: 11,
      title: 'Intellectual Property',
      icon: <AlertCircle className="w-5 h-5 text-green-600" />,
      content: 'All logos, images, website content, and store branding belong exclusively to Tiruchendur Murugan Pazhamudhir Solai.'
    },
    {
      id: 12,
      title: 'Limitation of Liability',
      icon: <AlertCircle className="w-5 h-5 text-green-600" />,
      content: 'Tiruchendur Murugan Pazhamudhir Solai shall not be liable for any indirect, incidental, special, consequential or punitive damages resulting from your use of or inability to use the service.'
    },
    {
      id: 13,
      title: 'Contact Information',
      icon: <Phone className="w-5 h-5 text-green-600" />,
      content: (
        <div className="space-y-1 mt-2 bg-gray-50 p-4 rounded-xl border border-gray-100 text-xs sm:text-sm">
          <p><strong>Store Name:</strong> Tiruchendur Murugan Pazhamudhir Solai</p>
          <p><strong>Support Email:</strong> <a href="mailto:support@tiruchendurmurugan.com" className="text-green-600 hover:underline">support@tiruchendurmurugan.com</a></p>
          <p><strong>Support Phone:</strong> +91 XXXXX XXXXX</p>
        </div>
      )
    }
  ];

  return (
    <div className="pb-28 max-w-4xl mx-auto px-4 sm:px-6 pt-6">
      
      {/* Header Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-6 text-center">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">
          Terms & Conditions
        </h1>
        <p className="text-sm sm:text-base text-gray-500 max-w-2xl mx-auto">
          Please read these terms carefully before using Tiruchendur Murugan Pazhamudhir Solai.
        </p>
      </div>

      {/* Content Sections */}
      <div className="space-y-4">
        {sections.map((section) => (
          <div 
            key={section.id} 
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 transition-all hover:shadow-md"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-green-50 p-2 rounded-lg">
                {section.icon}
              </div>
              <h2 className="text-lg font-bold text-gray-800">
                {section.id}. {section.title}
              </h2>
            </div>
            <div className="text-sm text-gray-600 leading-relaxed ml-11">
              {section.content}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default Terms;
