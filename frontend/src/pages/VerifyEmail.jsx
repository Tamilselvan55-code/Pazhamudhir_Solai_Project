import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Mail, CheckCircle2, AlertCircle, Loader2, ArrowLeft, RefreshCw, Edit2 } from 'lucide-react';
import axios from 'axios';
import useAuthStore from '../store/useAuthStore';

const maskEmail = (emailStr) => {
  if (!emailStr) return 'your email';
  const [user, domain] = emailStr.split('@');
  if (!user || !domain) return emailStr;
  if (user.length <= 3) {
    return `${user.substring(0, 1)}***@${domain}`;
  }
  return `${user.substring(0, 3)}********@${domain}`;
};

const VerifyEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';

  // Redirect to register if no email is found in navigation state
  useEffect(() => {
    if (!email) {
      navigate('/register');
    }
  }, [email, navigate]);

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // OTP 10-minute expiry countdown (600 seconds)
  const [expiryTimer, setExpiryTimer] = useState(600);
  
  // Resend 60-second cooldown countdown
  const [resendCooldown, setResendCooldown] = useState(60);
  
  // Attempt locking state
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(null);
  const [lockTimeRemaining, setLockTimeRemaining] = useState(0);

  const otpInputsRef = useRef([]);

  // Check locking state on render
  useEffect(() => {
    const savedLock = localStorage.getItem(`verify_lock_${email}`);
    const savedAttempts = localStorage.getItem(`verify_attempts_${email}`);
    if (savedAttempts) {
      setAttempts(parseInt(savedAttempts, 10));
    }
    if (savedLock) {
      const lockTime = parseInt(savedLock, 10);
      if (lockTime > Date.now()) {
        setLockedUntil(lockTime);
        setLockTimeRemaining(Math.ceil((lockTime - Date.now()) / 1000));
      } else {
        localStorage.removeItem(`verify_lock_${email}`);
        localStorage.removeItem(`verify_attempts_${email}`);
        setAttempts(0);
      }
    }
  }, [email]);

  // Lock timer countdown
  useEffect(() => {
    let interval = null;
    if (lockedUntil && lockTimeRemaining > 0) {
      interval = setInterval(() => {
        const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
        if (remaining <= 0) {
          setLockedUntil(null);
          setAttempts(0);
          setLockTimeRemaining(0);
          localStorage.removeItem(`verify_lock_${email}`);
          localStorage.removeItem(`verify_attempts_${email}`);
          setErrorMsg('');
        } else {
          setLockTimeRemaining(remaining);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [lockedUntil, lockTimeRemaining, email]);

  // Expiry and resend timers
  useEffect(() => {
    const interval = setInterval(() => {
      setExpiryTimer((prev) => (prev > 0 ? prev - 1 : 0));
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatExpiryTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatLockTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);
    setErrorMsg('');

    // Move to next input
    if (value && index < 5) {
      otpInputsRef.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1].focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();
    if (!/^\d{6}$/.test(pasteData)) return;

    const digits = pasteData.split('');
    setOtp(digits);
    otpInputsRef.current[5].focus();
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (lockedUntil) return;

    const code = otp.join('');
    if (code.length !== 6) return;

    setLoading(true);
    setErrorMsg('');
    try {
      const { data } = await axios.post('http://localhost:5000/api/auth/verify-registration-otp', {
        email,
        otp: code
      });

      if (data.success) {
        setSuccess(true);
        localStorage.removeItem(`verify_lock_${email}`);
        localStorage.removeItem(`verify_attempts_${email}`);
        
        setTimeout(() => {
          navigate('/login', { state: { successMsg: 'Registration Successful. Your account has been verified. Please login.' } });
        }, 3000);
      }
    } catch (err) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      localStorage.setItem(`verify_attempts_${email}`, newAttempts);

      if (newAttempts >= 5) {
        const lockExpiration = Date.now() + 10 * 60 * 1000; // 10 minutes
        setLockedUntil(lockExpiration);
        setLockTimeRemaining(600);
        localStorage.setItem(`verify_lock_${email}`, lockExpiration);
        setErrorMsg('Too many failed attempts. Verification locked for 10 minutes.');
      } else {
        setErrorMsg(err.response?.data?.message || 'Invalid Verification Code');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const { data } = await axios.post('http://localhost:5000/api/auth/resend-verification-otp', { email });
      if (data.success) {
        setExpiryTimer(600); // Reset 10 minute expiry
        setResendCooldown(60); // Reset 60 second cooldown
        setOtp(['', '', '', '', '', '']);
        if (otpInputsRef.current[0]) otpInputsRef.current[0].focus();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isOtpComplete = otp.every((d) => d !== '');

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
      }}
    >
      {/* Decorative Grocery-Themed Grid Pattern Background */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none select-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cpath d='M10 10h10v10H10zm30 0h10v10H40zm30 0h10v10H70zM10 40h10v10H10zm30 0h10v10H40zm30 0h10v10H70zM10 70h10v10H10zm30 0h10v10H40zm30 0h10v10H70z' fill='%2315803d' fill-opacity='1'/%3E%3C/svg%3E")`
        }}
      />
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 rounded-full bg-green-200/50 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 rounded-full bg-green-200/50 blur-3xl pointer-events-none" />
 
      {/* Main glassmorphism card */}
      <div className="bg-white/80 backdrop-blur-md rounded-[24px] shadow-[0_8px_40px_rgba(0,0,0,0.08)] border border-white/20 p-8 sm:p-12 w-full max-w-[520px] transition-all duration-300 relative z-10">
        
        {/* SUCCESS INTERFACE */}
        {success ? (
          <div className="text-center py-8 space-y-6 animate-scaleUp">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 text-green-600 border border-green-200 shadow-md">
              <CheckCircle2 className="w-10 h-10 animate-bounce" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-gray-900">Email Verified Successfully</h2>
              <p className="text-gray-500 text-sm font-semibold">Your account has been verified.</p>
            </div>
            <div className="bg-green-50 text-green-800 text-xs font-bold py-3 px-6 rounded-2xl border border-green-100 inline-block">
              Registration Successful. Redirecting to Login...
            </div>
          </div>
        ) : (
          /* VERIFICATION INTERFACE */
          <div className="space-y-8">
            
            {/* Header / Logo */}
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white border border-gray-100 shadow-sm text-2xl font-bold">
                🥭
              </div>
              <div className="text-center">
                <span className="font-black text-xs uppercase tracking-widest text-green-700 block">Tiruchendur Murugan</span>
                <span className="font-extrabold text-[10px] text-gray-400 uppercase tracking-widest block mt-0.5">Pazhamudhir Solai</span>
              </div>
              <div className="text-5xl pt-2 select-none animate-pulse">📧</div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Verify Your Email</h2>
              <div className="space-y-1">
                <p className="text-gray-500 text-xs sm:text-sm font-semibold leading-relaxed">
                  We have sent a verification code to
                </p>
                <p className="text-green-700 font-extrabold text-xs sm:text-sm select-all">
                  {email}
                </p>
              </div>
            </div>
 
            {/* Error alerts */}
            {errorMsg && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-xs sm:text-sm font-semibold">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Locked screen overlay block */}
            {lockedUntil ? (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center space-y-3">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                <h3 className="text-sm font-black text-gray-900">Verification Locked</h3>
                <p className="text-xs font-semibold text-gray-500 leading-relaxed">
                  Too many failed verification codes. Please wait before trying again.
                </p>
                <div className="text-xs font-bold text-amber-700 bg-amber-100/60 px-4 py-2 rounded-full inline-block border border-amber-200">
                  Unlocking in: {formatLockTime(lockTimeRemaining)}
                </div>
              </div>
            ) : (
              /* OTP Code Input Boxes */
              <form onSubmit={handleVerify} className="space-y-6">
                
                <div className="flex justify-between gap-2.5 max-w-sm mx-auto">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpInputsRef.current[idx] = el)}
                      type="text"
                      maxLength={1}
                      pattern="[0-9]*"
                      inputMode="numeric"
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      onPaste={handleOtpPaste}
                      className="w-11 h-14 sm:w-12 sm:h-15 text-center text-xl font-extrabold text-gray-900 bg-gray-50/50 border border-gray-200 rounded-xl focus:border-green-600 focus:bg-white focus:ring-1 focus:ring-green-500/20 focus:outline-none transition-all"
                    />
                  ))}
                </div>

                {/* Expiry Countdown */}
                <div className="text-center">
                  {expiryTimer > 0 ? (
                    <p className="text-xs font-bold text-gray-500">
                      OTP expires in <span className="text-green-700 font-extrabold">{formatExpiryTime(expiryTimer)}</span>
                    </p>
                  ) : (
                    <p className="text-xs font-extrabold text-red-500">
                      OTP Expired
                    </p>
                  )}
                </div>

                {/* Primary & Action Buttons */}
                <div className="space-y-3.5 pt-2">
                  <button
                    type="submit"
                    disabled={loading || !isOtpComplete || lockedUntil || expiryTimer === 0}
                    className="w-full bg-gradient-to-r from-green-600 to-[#15803d] hover:brightness-105 hover:shadow-lg hover:shadow-green-600/10 text-white font-black text-sm tracking-wide rounded-2xl h-[58px] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:shadow-none"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <span>Verify</span>
                    )}
                  </button>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                    <button
                      type="button"
                      onClick={() => navigate('/register')}
                      className="text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors"
                    >
                      Change Email
                    </button>

                    <div className="hidden sm:block text-gray-300">|</div>

                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={loading || resendCooldown > 0}
                      className="text-xs font-extrabold text-green-600 hover:text-green-700 disabled:text-gray-400 transition-colors flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                      Resend OTP
                    </button>
                  </div>

                  {resendCooldown > 0 && (
                    <div className="text-center text-xs text-gray-500 font-semibold">
                      Countdown: {resendCooldown} Seconds
                    </div>
                  )}
                </div>

              </form>
            )}

          </div>
        )}

      </div>
    </div>
  );
};

export default VerifyEmail;
