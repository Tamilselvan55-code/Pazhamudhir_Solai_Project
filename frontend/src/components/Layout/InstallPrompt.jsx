import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show prompt if not previously dismissed
      if (!localStorage.getItem('install_prompt_dismissed')) {
        setShowPrompt(true);
      }
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('install_prompt_dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-16 left-4 right-4 md:left-auto md:right-6 md:bottom-6 z-50 bg-gray-900 text-white p-4 rounded-2xl shadow-2xl border border-gray-800 flex items-center justify-between gap-4 animate-bounce-in max-w-sm">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center shrink-0 text-xl shadow-md">
          🛒
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold truncate">Tiruchendur Murugan Pazhamudhir Solai</p>
          <p className="text-xs text-gray-400 truncate">Install app for fast mobile ordering</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleInstall}
          className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1 shadow-sm"
        >
          <Download className="w-3.5 h-3.5" /> Install
        </button>
        <button
          onClick={handleDismiss}
          className="p-1.5 text-gray-400 hover:text-white rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default InstallPrompt;
