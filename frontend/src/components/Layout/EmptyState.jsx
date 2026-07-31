import React from 'react';
import { ShoppingBag, ShoppingCart, Heart, Bell, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

const EmptyState = ({ type, message, description, buttonText, buttonLink, onButtonClick }) => {
  const getIllustration = () => {
    const iconClass = "w-16 h-16 sm:w-20 sm:h-20 text-green-500 drop-shadow-md";
    const bgClass = "w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-gradient-to-tr from-green-50 to-emerald-100 flex items-center justify-center mx-auto mb-6 shadow-inner relative";
    const bubbleClass1 = "absolute -top-2 -right-2 w-8 h-8 bg-green-200 rounded-full opacity-50 animate-pulse";
    const bubbleClass2 = "absolute bottom-4 -left-4 w-6 h-6 bg-emerald-200 rounded-full opacity-40 animate-pulse delay-150";

    const wrapIcon = (Icon) => (
      <div className={bgClass}>
        <div className={bubbleClass1} />
        <div className={bubbleClass2} />
        <Icon className={iconClass} strokeWidth={1.5} />
      </div>
    );

    switch (type) {
      case 'orders': return wrapIcon(ShoppingBag);
      case 'cart': return wrapIcon(ShoppingCart);
      case 'wishlist': return wrapIcon(Heart);
      case 'notifications': return wrapIcon(Bell);
      case 'search': return wrapIcon(Search);
      default: return wrapIcon(ShoppingBag);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fadeIn">
      {getIllustration()}
      
      <h3 className="text-xl sm:text-2xl font-extrabold text-gray-800 mb-2">
        {message}
      </h3>
      
      <p className="text-sm sm:text-base text-gray-500 max-w-md mx-auto mb-8 leading-relaxed">
        {description}
      </p>

      {buttonText && (
        buttonLink ? (
          <Link 
            to={buttonLink}
            className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-2xl shadow-lg shadow-green-600/30 transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            {buttonText}
          </Link>
        ) : (
          <button 
            onClick={onButtonClick}
            className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-2xl shadow-lg shadow-green-600/30 transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            {buttonText}
          </button>
        )
      )}
    </div>
  );
};

export default EmptyState;
