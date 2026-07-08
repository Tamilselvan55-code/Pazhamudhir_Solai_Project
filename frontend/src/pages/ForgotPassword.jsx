import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ShoppingBag, AlertCircle, CheckCircle, Loader2, ArrowLeft, Lock, Eye, EyeOff, RefreshCw } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';

const RESEND_COOLDOWN = 60; // seconds

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { sendOtp, verifyOtp, resetPasswordOtp, loading } = useAuthStore();

  useEffect(() => {
    document.title = 'Forgot Password | Tiruchendur Murugan Pazhamudhir Solai';
  }, []);

  // ── Shared state ──────────────────────────────────────────────────
  const [step, setStep] = useState(1); // 1=email, 2=otp, 3=password
  const [email, setEmail] = useState('');
  const [apiError, setApiError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ── Step 1: Email ─────────────────────────────────────────────────
  const [emailTouched, setEmailTouched] = useState(false);
  const [emailError, setEmailError] = useState('');

  // ── Step 2: OTP ───────────────────────────────────────────────────
  const [otp, setOtp] = useState(['', '', '', '']);
  const otpRefs = useRef([]);
  const [resendTimer, setResendTimer] = useState(RESEND_COOLDOWN);
  const [canResend, setCanResend] = useState(false);

  // ── Step 3: Password ──────────────────────────────────────────────
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [pwdTouched, setPwdTouched] = useState({});
  const [pwdErrors, setPwdErrors] = useState({});

  // ── Resend timer ──────────────────────────────────────────────────
  useEffect(() => {
    if (step !== 2) return;
    if (resendTimer <= 0) {
      setCanResend(true);
      return;
    }
    const interval = setInterval(() => {
      setResendTimer(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  // ── Validation helpers ────────────────────────────────────────────
  const validateEmail = (val) => {
    if (!val) return 'Email address is required';
    if (!/^\S+@\S+\.\S+$/.test(val)) return 'Enter a valid email address';
    return '';
  };

  const validatePwdField = (name, value) => {
    if (name === 'password') {
      if (!value) return 'Password is required';
      if (value.length < 6) return 'Password must contain at least 6 characters.';
    }
    if (name === 'confirm') {
      if (!value) return 'Please confirm your password';
      if (value !== password) return 'Passwords do not match';
    }
    return '';
  };

  // ── Step 1 handlers ───────────────────────────────────────────────
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setEmailTouched(true);
    const err = validateEmail(email);
    if (err) { setEmailError(err); return; }
    setApiError('');
    const result = await sendOtp({ email });
    if (result.success) {
      setStep(2);
      setResendTimer(RESEND_COOLDOWN);
      setCanResend(false);
      setSuccessMsg(result.message);
      setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      setApiError(result.message);
    }
  };

  // ── Step 2 handlers ───────────────────────────────────────────────
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // digits only
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // single digit
    setOtp(newOtp);
    setApiError('');
    // Auto focus next
    if (value && index < 3) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted.length === 4) {
      setOtp(pasted.split(''));
      otpRefs.current[3]?.focus();
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length !== 4) { setApiError('Please enter the complete 4-digit OTP'); return; }
    setApiError('');
    const result = await verifyOtp({ email, otp: otpString });
    if (result.success) {
      setResetToken(result.resetToken);
      setStep(3);
      setSuccessMsg(result.message);
      setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      setApiError(result.message);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setCanResend(false);
    setResendTimer(RESEND_COOLDOWN);
    setApiError('');
    setOtp(['', '', '', '']);
    const result = await sendOtp({ email });
    if (result.success) {
      setSuccessMsg('New OTP sent successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      setApiError(result.message);
    }
  };

  // ── Step 3 handlers ───────────────────────────────────────────────
  const handlePwdBlur = (e) => {
    const { name, value } = e.target;
    setPwdTouched(prev => ({ ...prev, [name]: true }));
    setPwdErrors(prev => ({ ...prev, [name]: validatePwdField(name, value) }));
  };

  const handlePwdChange = (e) => {
    const { name, value } = e.target;
    if (name === 'password') setPassword(value);
    if (name === 'confirm') setConfirm(value);
    setApiError('');
    if (pwdTouched[name]) {
      setPwdErrors(prev => ({ ...prev, [name]: validatePwdField(name, value) }));
    }
  };

  const isPwdFormValid =
    password && !validatePwdField('password', password) &&
    confirm && !validatePwdField('confirm', confirm);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwdTouched({ password: true, confirm: true });
    const pErr = validatePwdField('password', password);
    const cErr = validatePwdField('confirm', confirm);
    if (pErr || cErr) { setPwdErrors({ password: pErr, confirm: cErr }); return; }
    setApiError('');
    const result = await resetPasswordOtp({ resetToken, password });
    if (result.success) {
      setStep(4); // success screen
    } else {
      setApiError(result.message);
    }
  };

  const getPwdFieldStyle = (name) => {
    const val = name === 'password' ? password : confirm;
    const isInvalid = pwdTouched[name] && pwdErrors[name];
    const isValid = val && !validatePwdField(name, val);
    if (isInvalid) return 'border-red-400 bg-red-50';
    if (isValid) return 'border-green-500 bg-green-50';
    return 'border-gray-200 bg-gray-50 focus-within:border-green-500 focus-within:bg-white';
  };

  // ── Styling helpers ───────────────────────────────────────────────
  const getEmailFieldStyle = () => {
    const isInvalid = emailTouched && emailError;
    const isValid = email && !validateEmail(email);
    if (isInvalid) return 'border-red-400 bg-red-50';
    if (isValid) return 'border-green-500 bg-green-50';
    return 'border-gray-200 bg-gray-50 focus-within:border-green-500 focus-within:bg-white';
  };

  // ── Step indicator ────────────────────────────────────────────────
  const steps = ['Email', 'Verify OTP', 'New Password'];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: '#f7fdf7' }}>
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-600 shadow-lg mb-4">
            <ShoppingBag className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">
            {step === 4 ? 'Password Updated!' : 'Forgot Password?'}
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            {step === 1 && 'Enter your email to receive an OTP for Tiruchendur Murugan Pazhamudhir Solai'}
            {step === 2 && 'Enter the 4-digit OTP sent to your email'}
            {step === 3 && 'Create a new password for your account'}
            {step === 4 && 'You can now login with your new password'}
          </p>
        </div>

        {/* Progress Steps (visible on steps 1-3) */}
        {step < 4 && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {steps.map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  i + 1 < step ? 'bg-green-500 text-white' :
                  i + 1 === step ? 'bg-green-600 text-white ring-4 ring-green-100' :
                  'bg-gray-200 text-gray-500'
                }`}>
                  {i + 1 < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
                </div>
                {i < 2 && <div className={`w-8 h-0.5 ${i + 1 < step ? 'bg-green-500' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
        )}

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">

          {/* Success Message */}
          {successMsg && (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 mb-5 text-sm">
              <CheckCircle className="w-4 h-4 shrink-0" /><span>{successMsg}</span>
            </div>
          )}

          {/* API Error */}
          {apiError && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-5 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /><span>{apiError}</span>
            </div>
          )}

          {/* ═══════════ STEP 1: EMAIL ═══════════ */}
          {step === 1 && (
            <form onSubmit={handleEmailSubmit} noValidate className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Registered Email</label>
                <div className={`flex items-center border-2 rounded-xl px-4 gap-3 transition-colors ${getEmailFieldStyle()}`}>
                  <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                  <input type="email" value={email}
                    onChange={(e) => { setEmail(e.target.value); setApiError(''); if (emailTouched) setEmailError(validateEmail(e.target.value)); }}
                    onBlur={() => { setEmailTouched(true); setEmailError(validateEmail(email)); }}
                    placeholder="your@email.com"
                    className="flex-1 bg-transparent py-3.5 text-sm focus:outline-none text-gray-900 placeholder-gray-400" />
                </div>
                {emailTouched && emailError && <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{emailError}</p>}
              </div>
              <button type="submit" disabled={loading || !email || !!validateEmail(email)}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-md transition-all disabled:opacity-70 flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Sending OTP...</> : 'Send OTP'}
              </button>
            </form>
          )}

          {/* ═══════════ STEP 2: OTP ═══════════ */}
          {step === 2 && (
            <form onSubmit={handleOtpSubmit} noValidate className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3 text-center">Enter 4-digit OTP</label>
                <div className="flex justify-center gap-2.5" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => otpRefs.current[i] = el}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 focus:outline-none transition-all duration-200 ${
                        digit
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 bg-gray-50 text-gray-900 focus:border-green-500 focus:bg-white'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-400 text-center mt-3">
                  OTP sent to <span className="font-semibold text-gray-600">{email}</span>
                </p>
              </div>

              <button type="submit" disabled={loading || otp.join('').length !== 4}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-md transition-all disabled:opacity-70 flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Verifying...</> : 'Verify OTP'}
              </button>

              {/* Resend */}
              <div className="text-center">
                {canResend ? (
                  <button type="button" onClick={handleResend} disabled={loading}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-green-600 hover:text-green-700 transition-colors">
                    <RefreshCw className="w-4 h-4" /> Resend OTP
                  </button>
                ) : (
                  <p className="text-xs text-gray-400">
                    Resend OTP in <span className="font-bold text-gray-600">{resendTimer}s</span>
                  </p>
                )}
              </div>
            </form>
          )}

          {/* ═══════════ STEP 3: NEW PASSWORD ═══════════ */}
          {step === 3 && (
            <form onSubmit={handlePasswordSubmit} noValidate className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">New Password</label>
                <div className={`flex items-center border-2 rounded-xl px-4 gap-3 transition-colors ${getPwdFieldStyle('password')}`}>
                  <Lock className="w-4 h-4 text-gray-400 shrink-0" />
                  <input type={showPwd ? 'text' : 'password'} name="password" value={password}
                    onChange={handlePwdChange} onBlur={handlePwdBlur}
                    placeholder="At least 6 characters"
                    className="flex-1 bg-transparent py-3.5 text-sm focus:outline-none text-gray-900 placeholder-gray-400" />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="text-gray-400 hover:text-gray-600">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {pwdTouched.password && pwdErrors.password && <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{pwdErrors.password}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm Password</label>
                <div className={`flex items-center border-2 rounded-xl px-4 gap-3 transition-colors ${getPwdFieldStyle('confirm')}`}>
                  <Lock className="w-4 h-4 text-gray-400 shrink-0" />
                  <input type="password" name="confirm" value={confirm}
                    onChange={handlePwdChange} onBlur={handlePwdBlur}
                    placeholder="Re-enter password"
                    className="flex-1 bg-transparent py-3.5 text-sm focus:outline-none text-gray-900 placeholder-gray-400" />
                </div>
                {pwdTouched.confirm && pwdErrors.confirm && <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{pwdErrors.confirm}</p>}
              </div>

              <button type="submit" disabled={loading || !isPwdFormValid}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-md transition-all disabled:opacity-70 flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Updating...</> : 'Update Password'}
              </button>
            </form>
          )}

          {/* ═══════════ STEP 4: SUCCESS ═══════════ */}
          {step === 4 && (
            <div className="text-center py-4">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-2">Password Updated Successfully!</h3>
              <p className="text-sm text-gray-600 mb-6">You can now login with your new password.</p>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                Go to Login
              </button>
            </div>
          )}
        </div>

        {/* Back to Login */}
        {step < 4 && (
          <div className="text-center mt-6">
            <Link to="/login" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-green-600 font-medium">
              <ArrowLeft className="w-4 h-4" /> Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
