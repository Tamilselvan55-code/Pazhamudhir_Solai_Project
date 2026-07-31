import React from 'react';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AccessDenied = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-2xl p-8 text-center backdrop-blur-xl">
        <div className="w-20 h-20 mx-auto bg-[#EF4444]/10 rounded-full flex items-center justify-center mb-6">
          <ShieldAlert className="w-10 h-10 text-[#EF4444]" />
        </div>
        
        <h1 className="text-2xl font-black text-white mb-2">Access Denied</h1>
        <p className="text-[#94A3B8] text-sm mb-8">
          You don't have permission to view this page or perform this action. Please contact your system administrator if you believe this is a mistake.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => navigate(-1)}
            className="w-full h-12 bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors border border-white/5"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </button>
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="w-full h-12 bg-transparent hover:bg-white/5 text-[#94A3B8] hover:text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <Home className="w-5 h-5" />
            Admin Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;
