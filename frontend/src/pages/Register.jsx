import { API_BASE as config_API_BASE, API_URL as config_API_URL } from '../config/api';
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  User, Phone, Mail, Lock, Eye, EyeOff,
  ShoppingBag, AlertCircle, CheckCircle, Loader2,
  ChevronRight, ArrowLeft, ShieldCheck, Check, Sparkles, Truck, CreditCard, Award
} from 'lucide-react';
import axios from 'axios';

// Password criteria checks
const checkPasswordCriteria = (pwd) => {
  return {
    hasMinLen: pwd.length >= 8,
    hasUpper: /[A-Z]/.test(pwd),
    hasLower: /[a-z]/.test(pwd),
    hasNumber: /[0-9]/.test(pwd),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
  };
};

const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.title = 'Create Account | Tiruchendur Murugan Pazhamudhir Solai';
  }, []);

  // Steps: 'register' or 'otp'
  const [step, setStep] = useState(location.state?.step || 'register');
  const [form, setForm] = useState({
    fullName: '',
    phoneNumber: '',
    email: location.state?.email || '',
    password: '',
    confirmPassword: '',
    agree: false
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [apiError, setApiError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  // OTP Verification States
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpTimer, setOtpTimer] = useState(60);
  const [resendDisabled, setResendDisabled] = useState(true);
  const [otpError, setOtpError] = useState('');
  const [otpAttempts, setOtpAttempts] = useState(0);
  const otpInputsRef = useRef([]);

  const passwordCriteria = checkPasswordCriteria(form.password);
  const isPasswordValid = 
    passwordCriteria.hasMinLen &&
    passwordCriteria.hasUpper &&
    passwordCriteria.hasLower &&
    passwordCriteria.hasNumber &&
    passwordCriteria.hasSpecial;

  // Validation function for a single field
  const validateField = (name, value) => {
    let error = '';
    if (name === 'fullName') {
      if (!value.trim()) {
        error = 'Full name is required';
      } else if (value.trim().length < 3 || value.trim().length > 50 || !/^[a-zA-Z\s]+$/.test(value.trim())) {
        error = 'Full name must contain only letters (minimum 3 characters)';
      }
    } else if (name === 'phoneNumber') {
      if (!value.trim()) {
        error = 'Phone number is required';
      } else if (!/^[6-9]\d{9}$/.test(value.trim())) {
        error = 'Enter a valid 10-digit phone number (starting with 6-9)';
      }
    } else if (name === 'email') {
      if (!value.trim()) {
        error = 'Email address is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
        error = 'Enter a valid email address';
      }
    } else if (name === 'password') {
      if (!value) {
        error = 'Password is required';
      } else if (value.length < 8) {
        error = 'Password must contain at least 8 characters';
      } else {
        const hasUpper = /[A-Z]/.test(value);
        const hasLower = /[a-z]/.test(value);
        const hasNumber = /[0-9]/.test(value);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(value);
        if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
          error = 'Password must satisfy all complexity criteria below';
        }
      }
    } else if (name === 'confirmPassword') {
      if (!value) {
        error = 'Please confirm your password';
      } else if (value !== form.password) {
        error = 'Passwords do not match';
      }
    } else if (name === 'agree') {
      if (!value) {
        error = 'You must agree to the Terms & Privacy Policy';
      }
    }
    return error;
  };

  const handleBlur = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setTouched(prev => ({ ...prev, [name]: true }));
    setErrors(prev => {
      const err = validateField(name, val);
      const newErrors = { ...prev };
      if (err) newErrors[name] = err;
      else delete newErrors[name];
      return newErrors;
    });
    if (name === 'password') {
      setIsPasswordFocused(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setForm(prev => ({ ...prev, [name]: val }));
    if (apiError) setApiError('');
    
    // Clear validation error when user begins/continues typing
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[name];
      return newErrors;
    });
  };

  const validateAll = () => {
    const errs = {};
    Object.keys(form).forEach(key => {
      const err = validateField(key, form[key]);
      if (err) errs[key] = err;
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    setTouched({
      fullName: true,
      phoneNumber: true,
      email: true,
      password: true,
      confirmPassword: true,
      agree: true
    });

    if (!validateAll()) return;

    setIsLoading(true);
    setApiError('');
    try {
      const { data } = await axios.post(`${config_API_BASE}/auth/register`, {
        fullName: form.fullName.trim(),
        phoneNumber: form.phoneNumber.trim(),
        email: form.email.trim(),
        password: form.password
      });

      if (data.success) {
        navigate('/verify-email', { state: { email: form.email.trim() } });
      }
    } catch (err) {
      setApiError(err.response?.data?.message || 'Registration failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // OTP Timer countdown
  useEffect(() => {
    let interval = null;
    if (step === 'otp' && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    } else if (otpTimer === 0) {
      setResendDisabled(false);
    }
    return () => clearInterval(interval);
  }, [step, otpTimer]);

  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Auto-focus next input
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

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) {
      setOtpError('Please enter all 6 digits of the code.');
      return;
    }

    setIsLoading(true);
    setOtpError('');
    try {
      const { data } = await axios.post(`${config_API_BASE}/auth/verify-registration-otp`, {
        email: form.email.trim(),
        otp: code
      });

      if (data.success) {
        navigate('/login', {
          state: {
            successMsg: '✅ Registration Successful! Your account has been verified successfully. Please login.'
          }
        });
      }
    } catch (err) {
      setOtpAttempts((prev) => prev + 1);
      setOtpError(err.response?.data?.message || 'Verification failed. Incorrect OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    setOtpError('');
    try {
      const { data } = await axios.post(`${config_API_BASE}/auth/resend-verification-otp`, {
        email: form.email.trim()
      });
      if (data.success) {
        setOtpTimer(60);
        setResendDisabled(true);
        setOtp(['', '', '', '', '', '']);
        setOtpError('');
        if (otpInputsRef.current[0]) otpInputsRef.current[0].focus();
      }
    } catch (err) {
      setOtpError(err.response?.data?.message || 'Failed to resend code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };


  // Check if field is fully validated (touched & no error & non-empty)
  const isFieldValid = (name) => {
    return touched[name] && !errors[name] && form[name];
  };

  // Helper styles for inputs
  const getInputWrapperClass = (name) => {
    const isTouched = touched[name];
    const isInvalid = isTouched && errors[name];
    const isValid = isFieldValid(name);

    if (isInvalid) return 'border-red-400 bg-red-50/20 focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-500/20';
    if (isValid) return 'border-green-500 bg-green-50/10 focus-within:border-green-600 focus-within:ring-1 focus-within:ring-green-500/20';
    return 'border-gray-200 bg-gray-50/30 focus-within:border-green-600 focus-within:ring-1 focus-within:ring-green-500/20';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] w-full">
      <div className="w-full max-w-[1500px] min-h-screen lg:h-screen flex flex-col lg:flex-row overflow-hidden shadow-2xl bg-white">
        
        {/* ─── LEFT HERO SECTION (45% Width on Desktop) ────────────────── */}
        <div
          className="hidden lg:flex lg:w-[45%] flex-col justify-between p-10 text-white relative overflow-hidden h-full select-none"
          style={{
            background: 'linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)'
          }}
        >
          {/* Background blurred elements */}
          <div className="absolute top-[-10%] right-[-10%] w-72 h-72 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 rounded-full bg-green-400/20 blur-2xl" />

          {/* Logo & Store Header */}
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center shadow-lg text-2xl">
                🥭
              </div>
              <div>
                <span className="font-black tracking-wider text-base block text-white">Tiruchendur Murugan</span>
                <span className="text-[10px] uppercase font-extrabold tracking-widest text-green-100 block">Pazhamudhir Solai</span>
              </div>
            </div>
          </div>

          {/* Copy and Feature Cards */}
          <div className="relative z-10 my-auto space-y-6">
            <div className="space-y-2">
              <h2 className="text-3xl xl:text-4xl font-extrabold leading-tight tracking-tight text-white">
                Freshness Delivered<br />Right To Your Doorstep
              </h2>
              <p className="text-green-100 text-xs xl:text-sm font-semibold tracking-wide">
                Fresh Vegetables • Fruits • Groceries
              </p>
            </div>

            {/* Feature Cards Grid (2x2 layout, glassmorphic styling) */}
            <div className="grid grid-cols-2 gap-4 pt-4">
              {[
                { label: 'Fresh Farm Vegetables', icon: Sparkles },
                { label: 'Same Day Delivery', icon: Truck },
                { label: 'Cash on Delivery', icon: CreditCard },
                { label: 'Trusted Local Store', icon: Award }
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 flex flex-col justify-between h-28 shadow-sm hover:bg-white/15 transition-all duration-200"
                >
                  <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                    <item.icon className="w-4.5 h-4.5 text-white" />
                  </div>
                  <span className="text-xs font-bold text-white leading-snug">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Graphic Illustration Area */}
          <div className="absolute bottom-0 left-0 right-0 w-full h-[32%] z-0 pointer-events-none opacity-90 overflow-hidden">
            <svg
              className="absolute bottom-0 w-full h-full text-green-400/25"
              viewBox="0 0 1440 320"
              preserveAspectRatio="none"
            >
              <path
                fill="currentColor"
                d="M0,224L48,229.3C96,235,192,245,288,224C384,203,480,149,576,149.3C672,149,768,203,864,229.3C960,256,1056,256,1152,240C1248,224,1344,192,1392,176L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
              />
            </svg>
            <div className="absolute bottom-0 right-10 w-44 h-44 rounded-full bg-white/5 blur-2xl" />
          </div>

          {/* Footer branding */}
          <div className="relative z-10 text-[10px] text-green-200/60 font-semibold tracking-wide">
            &copy; {new Date().getFullYear()} Tiruchendur Murugan Pazhamudhir Solai. All rights reserved.
          </div>
        </div>

        {/* ─── RIGHT REGISTRATION SECTION (55% Width on Desktop) ────────── */}
        <div className="w-full lg:w-[55%] flex items-center justify-center p-6 sm:p-10 md:p-12 h-full overflow-y-auto">
          <div className="w-full max-w-[700px] py-6">
            
            {/* REGISTER STEP */}
            {step === 'register' && (
              <div className="bg-white rounded-[24px] shadow-[0_8px_40px_rgba(0,0,0,0.06)] border border-gray-100 p-8 sm:p-12 transition-all duration-300 w-full">
                
                {/* Header */}
                <div className="text-center mb-8">
                  <div className="lg:hidden inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-green-600 shadow-md mb-3 text-white text-2xl font-bold">
                    🥭
                  </div>
                  <h2 className="text-3xl font-black text-gray-900 tracking-tight">Create Your Account</h2>
                  <p className="text-gray-500 mt-2 text-sm font-medium">
                    Create your grocery shopping account in less than a minute.
                  </p>
                </div>

                {/* API error alert */}
                {apiError && (
                  <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 mb-6 text-sm font-semibold">
                    <AlertCircle className="w-5 h-5 shrink-0 text-red-500 animate-shake" />
                    <span>{apiError}</span>
                  </div>
                )}

                <form onSubmit={handleRegisterSubmit} noValidate className="space-y-6">
                  
                  {/* Full Name */}
                  <div className="relative group w-full">
                    <div className={`flex items-center border rounded-[16px] px-4 transition-all duration-200 h-[60px] ${getInputWrapperClass('fullName')}`}>
                      <User className="w-5 h-5 text-gray-400 shrink-0 group-focus-within:text-green-600" />
                      <input
                        type="text"
                        name="fullName"
                        value={form.fullName}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Full Name"
                        className="flex-1 bg-transparent py-3 pl-3.5 text-sm focus:outline-none text-gray-900 placeholder-gray-400 font-bold"
                      />
                      {isFieldValid('fullName') && <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />}
                    </div>
                    {touched.fullName && errors.fullName && (
                      <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1 font-bold pl-2">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.fullName}
                      </p>
                    )}
                  </div>

                  {/* Phone Number */}
                  <div className="relative group w-full">
                    <div className={`flex items-center border rounded-[16px] px-4 transition-all duration-200 h-[60px] ${getInputWrapperClass('phoneNumber')}`}>
                      <Phone className="w-5 h-5 text-gray-400 shrink-0" />
                      <span className="text-gray-400 text-sm font-black border-r border-gray-200 pr-3.5 pl-2 select-none">+91</span>
                      <input
                        type="tel"
                        name="phoneNumber"
                        value={form.phoneNumber}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        maxLength={10}
                        inputMode="numeric"
                        placeholder="Phone Number"
                        className="flex-1 bg-transparent py-3 pl-3.5 text-sm focus:outline-none text-gray-900 placeholder-gray-400 font-bold"
                      />
                      {isFieldValid('phoneNumber') && <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />}
                    </div>
                    {touched.phoneNumber && errors.phoneNumber && (
                      <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1 font-bold pl-2">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.phoneNumber}
                      </p>
                    )}
                  </div>

                  {/* Email Address */}
                  <div className="relative group w-full">
                    <div className={`flex items-center border rounded-[16px] px-4 transition-all duration-200 h-[60px] ${getInputWrapperClass('email')}`}>
                      <Mail className="w-5 h-5 text-gray-400 shrink-0" />
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Email Address"
                        className="flex-1 bg-transparent py-3 pl-3.5 text-sm focus:outline-none text-gray-900 placeholder-gray-400 font-bold"
                      />
                      {isFieldValid('email') && <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />}
                    </div>
                    {touched.email && errors.email && (
                      <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1 font-bold pl-2">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.email}
                      </p>
                    )}
                  </div>

                  {/* Password */}
                  <div className="relative group w-full">
                    <div className={`flex items-center border rounded-[16px] px-4 transition-all duration-200 h-[60px] ${getInputWrapperClass('password')}`}>
                      <Lock className="w-5 h-5 text-gray-400 shrink-0" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        onFocus={() => setIsPasswordFocused(true)}
                        placeholder="Password"
                        className="flex-1 bg-transparent py-3 pl-3.5 pr-2 text-sm focus:outline-none text-gray-900 placeholder-gray-400 font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>

                    {/* Password complexity checklist: display only while typing and hide once valid */}
                    {form.password && (isPasswordFocused || !isPasswordValid) && (
                      <div className="mt-3 bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-2.5 animate-slideDown">
                        <div className="text-[11px] font-black text-gray-500 uppercase tracking-wider mb-1">
                          Password Requirements:
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {[
                            { label: 'Lowercase letter', met: passwordCriteria.hasLower },
                            { label: 'Uppercase letter', met: passwordCriteria.hasUpper },
                            { label: 'One numeric digit', met: passwordCriteria.hasNumber },
                            { label: 'Special character', met: passwordCriteria.hasSpecial },
                            { label: 'Minimum 8 characters', met: passwordCriteria.hasMinLen }
                          ].map((item, idx) => (
                            <div
                              key={idx}
                              className={`flex items-center gap-2 font-bold ${
                                item.met ? 'text-green-600' : 'text-gray-400'
                              }`}
                            >
                              <div
                                className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border ${
                                  item.met
                                    ? 'bg-green-100 border-green-300'
                                    : 'bg-white border-gray-200'
                                }`}
                              >
                                {item.met && <Check className="w-2.5 h-2.5 text-green-600 stroke-[4px]" />}
                              </div>
                              <span className="text-[11px]">{item.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {touched.password && errors.password && (
                      <p className="text-red-500 text-xs mt-1.5 flex items-start gap-1 font-bold pl-2">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {errors.password}
                      </p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="relative group w-full">
                    <div className={`flex items-center border rounded-[16px] px-4 transition-all duration-200 h-[60px] ${getInputWrapperClass('confirmPassword')}`}>
                      <Lock className="w-5 h-5 text-gray-400 shrink-0" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={form.confirmPassword}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Confirm Password"
                        className="flex-1 bg-transparent py-3 pl-3.5 pr-2 text-sm focus:outline-none text-gray-900 placeholder-gray-400 font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {touched.confirmPassword && errors.confirmPassword && (
                      <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1 font-bold pl-2">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.confirmPassword}
                      </p>
                    )}
                  </div>

                  {/* Consent Checkbox */}
                  <div className="pt-2 pl-1">
                    <label className="flex items-start gap-3.5 cursor-pointer">
                      <input
                        type="checkbox"
                        name="agree"
                        checked={form.agree}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className="mt-1 w-5 h-5 rounded text-green-600 focus:ring-green-500 cursor-pointer border-gray-300 bg-gray-50 focus:ring-offset-0"
                      />
                      <span className="text-xs sm:text-sm text-gray-600 font-bold leading-relaxed select-none">
                        I agree to the <a href="/legal?tab=terms" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">Terms of Service</a> & <a href="/legal?tab=privacy" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">Privacy Policy</a>.
                      </span>
                    </label>
                    {touched.agree && errors.agree && (
                      <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1 font-bold pl-2">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.agree}
                      </p>
                    )}
                  </div>

                  {/* Register Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-green-600 to-[#15803d] hover:brightness-105 hover:shadow-lg hover:shadow-green-600/10 text-white font-black text-base tracking-wide rounded-2xl h-[58px] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:shadow-none"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Registering...</span>
                      </>
                    ) : (
                      <>
                        <span>Register & Verify Email</span>
                        <ChevronRight className="w-5 h-5" />
                      </>
                    )}
                  </button>

                  {/* Redirect Login */}
                  <div className="text-center pt-5 border-t border-gray-100 mt-6">
                    <span className="text-sm text-gray-500 font-bold">Already have an account? </span>
                    <Link to="/login" className="text-sm font-extrabold text-green-600 hover:underline hover:text-green-700 transition-colors pl-1">
                      Login
                    </Link>
                  </div>

                </form>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};

export default Register;
