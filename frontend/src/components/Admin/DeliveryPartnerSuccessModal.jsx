import React, { useState } from 'react';
import { CheckCircle2, Eye, EyeOff, Copy, Check, Mail, MessageSquare, ArrowRight, ShieldCheck } from 'lucide-react';

const DeliveryPartnerSuccessModal = ({ isOpen, onClose, partnerData }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !partnerData) return null;

  const { name, mobile, email, tempPassword } = partnerData;

  const handleCopyPassword = () => {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSendEmail = () => {
    const subject = encodeURIComponent('Welcome to Pazhamudhir Solai - Delivery Partner Credentials');
    const body = encodeURIComponent(
      `Hi ${name},\n\n` +
      `Your Delivery Partner account has been successfully created.\n\n` +
      `Account Details:\n` +
      `• Mobile: ${mobile}\n` +
      `• Temporary Password: ${tempPassword}\n\n` +
      `Please log in using your mobile number and temporary password.\n\n` +
      `Best regards,\n` +
      `Pazhamudhir Solai Team`
    );
    window.open(`mailto:${email || ''}?subject=${subject}&body=${body}`, '_blank');
  };

  const handleSendWhatsApp = () => {
    // Format phone for WhatsApp link (strip non-digits)
    const cleanPhone = mobile ? mobile.replace(/\D/g, '') : '';
    const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    
    const message = encodeURIComponent(
      `*Welcome to Pazhamudhir Solai!* 🛵\n\n` +
      `Hi *${name}*, your Delivery Partner account has been created successfully.\n\n` +
      `*Login Credentials:*\n` +
      `📱 Mobile: ${mobile}\n` +
      `🔑 Temp Password: *${tempPassword}*\n\n` +
      `Please keep this password confidential and change it upon first login.`
    );

    window.open(`https://wa.me/${phoneWithCountry}?text=${message}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0F172A]/95 border border-slate-700/60 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl shadow-black/80 text-white relative overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Subtle background glow effect */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#22C55E]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Icon & Title Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-[#22C55E]/15 border border-[#22C55E]/30 flex items-center justify-center text-[#22C55E] mb-4 shadow-lg shadow-[#22C55E]/10 animate-bounce-short">
            <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Delivery Partner Created Successfully
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Account credentials generated. Please share them with the partner.
          </p>
        </div>

        {/* Partner Details Card */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 mb-5 space-y-3">
          <div className="flex justify-between items-center pb-2.5 border-b border-slate-700/40">
            <span className="text-xs font-semibold text-slate-400">Partner Name</span>
            <span className="text-sm font-bold text-white">{name}</span>
          </div>

          <div className="flex justify-between items-center pb-2.5 border-b border-slate-700/40">
            <span className="text-xs font-semibold text-slate-400">Mobile Number</span>
            <span className="text-sm font-bold font-mono text-emerald-400">{mobile}</span>
          </div>

          {/* Password Display Box */}
          <div className="pt-1">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Temporary Password
              </span>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition-colors"
              >
                {showPassword ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" /> Hide Password
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" /> Show Password
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between bg-slate-900/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5">
              <span className="font-mono text-sm font-bold tracking-wider text-white">
                {showPassword ? tempPassword : '••••••••••••'}
              </span>
              <button
                type="button"
                onClick={handleCopyPassword}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all flex items-center gap-1 text-xs font-medium"
                title="Copy Password"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 text-[11px]">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span className="text-[11px]">Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Quick Action Share Buttons */}
        <div className="grid grid-cols-2 gap-2.5 mb-6">
          <button
            type="button"
            onClick={handleSendWhatsApp}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/30 text-[#25D366] text-xs font-bold transition-all hover:scale-[1.02]"
          >
            <MessageSquare className="w-4 h-4" />
            Send by WhatsApp
          </button>

          <button
            type="button"
            onClick={handleSendEmail}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-400 text-xs font-bold transition-all hover:scale-[1.02]"
          >
            <Mail className="w-4 h-4" />
            Send by Email
          </button>
        </div>

        {/* Done Action Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3.5 px-4 bg-gradient-to-r from-[#22C55E] to-[#16A34A] hover:from-[#16A34A] hover:to-[#15803D] text-white font-bold text-sm rounded-xl shadow-lg shadow-[#22C55E]/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
        >
          <span>Done</span>
          <ArrowRight className="w-4 h-4" />
        </button>

      </div>
    </div>
  );
};

export default DeliveryPartnerSuccessModal;
