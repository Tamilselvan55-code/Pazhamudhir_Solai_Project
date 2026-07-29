import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

const ConfirmationModal = ({
  isOpen,
  title,
  description,
  icon: Icon,
  confirmText = 'Remove',
  cancelText = 'Cancel',
  confirmColor = 'red', // 'red', 'green', 'blue'
  loading = false,
  onConfirm,
  onCancel,
}) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setShow(true), 10);
    } else {
      setShow(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && !loading) onCancel();
    };
    if (isOpen) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, loading, onCancel]);

  if (!isOpen) return null;

  const colorConfig = {
    red: 'bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white shadow-red-500/30',
    green: 'bg-green-600 hover:bg-green-700 focus:ring-green-500 text-white shadow-green-500/30',
    blue: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white shadow-blue-500/30',
  };

  const iconBgConfig = {
    red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0'}`} 
        onClick={() => !loading && onCancel()}
      ></div>

      {/* Modal Card */}
      <div 
        className={`relative w-full max-w-sm sm:max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 transform ${show ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'}`}
      >
        <div className="p-6 sm:p-8">
          {Icon && (
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-6 ${iconBgConfig[confirmColor] || iconBgConfig.red}`}>
              <Icon className="w-7 h-7" />
            </div>
          )}
          
          <h3 className="text-xl font-bold text-center text-gray-900 dark:text-white mb-3">
            {title}
          </h3>
          
          <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-8 leading-relaxed whitespace-pre-wrap">
            {description}
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 px-5 py-3 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-70 disabled:cursor-not-allowed ${colorConfig[confirmColor] || colorConfig.red}`}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Processing...' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
