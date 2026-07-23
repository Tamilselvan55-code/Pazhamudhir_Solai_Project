import { API_BASE as config_API_BASE, API_URL as config_API_URL } from '../config/api';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Phone, Lock, Eye, EyeOff, ShoppingBag, AlertCircle, 
  CheckCircle, Loader2, Sparkles, Truck, CircleDollarSign 
} from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import axios from 'axios';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading } = useAuthStore();
  const successMsg = location.state?.successMsg || '';

  useEffect(() => {
    document.title = 'Login | Tiruchendur Murugan Pazhamudhir Solai';
  }, []);

  const [form, setForm] = useState({ phoneNumber: '', password: '' });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState(
    new URLSearchParams(location.search).get('error') === 'access_denied' ? 'Access Denied' : ''
  );
  const [showVerifyActions, setShowVerifyActions] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');

  const validateField = (name, value) => {
    if (name === 'phoneNumber') {
      if (!value) return 'Phone number is required';
      if (!/^[6-9]\d{9}$/.test(value)) return 'Enter a valid 10-digit phone number';
    }
    if (name === 'password') {
      if (!value) return 'Password is required';
      if (value.length < 6) return 'Password must contain at least 6 characters.';
    }
    return '';
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (apiError) setApiError('');
    if (touched[name]) {
      setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
    }
  };

  const isFormValid = 
    form.phoneNumber && !validateField('phoneNumber', form.phoneNumber) &&
    form.password && !validateField('password', form.password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ phoneNumber: true, password: true });
    const pErr = validateField('phoneNumber', form.phoneNumber);
    const passErr = validateField('password', form.password);
    if (pErr || passErr) {
      setErrors({ phoneNumber: pErr, password: passErr });
      return;
    }
    const result = await login(form);
    if (result.success) {
      const params = new URLSearchParams(location.search);
      const redirectTo = params.get('redirect');
      navigate(redirectTo ? decodeURIComponent(redirectTo) : '/');
    } else {
      if (result.needsVerification) {
        setApiError(result.message || 'Please verify your email first.');
        setShowVerifyActions(true);
        setUnverifiedEmail(result.email);
      } else {
        setApiError(result.message);
        setShowVerifyActions(false);
        setUnverifiedEmail('');
      }
    }
  };

  const handleVerifyNow = () => {
    navigate('/verify-email', { state: { email: unverifiedEmail } });
  };

  const handleResendRegisterOtp = async () => {
    try {
      await axios.post(`${config_API_BASE}/auth/resend-verification-otp`, {
        email: unverifiedEmail
      });
      setApiError('Verification OTP resent successfully to your email. Click "Verify Email" to verify.');
    } catch (err) {
      setApiError(err.response?.data?.message || 'Failed to resend OTP.');
    }
  };

  const getFieldStyle = (name) => {
    const isInvalid = touched[name] && errors[name];
    const isValid = form[name] && !validateField(name, form[name]);
    if (isInvalid) return 'border-red-300 bg-red-50/30';
    if (isValid) return 'border-green-400 bg-green-50/10 focus-within:ring-4 focus-within:ring-green-100 focus-within:border-green-600';
    return 'border-gray-150 bg-gray-50/50 focus-within:border-green-600 focus-within:ring-4 focus-within:ring-green-100 focus-within:bg-white';
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col lg:flex-row bg-[#F3FAF5] animate-fadeIn">
      {/* LEFT COLUMN: HERO (45%) */}
      <div className="hidden lg:flex lg:w-[42%] bg-gradient-to-br from-[#16A34A] to-[#15803D] text-white p-12 flex-col justify-between relative overflow-hidden select-none">
        
        {/* Subtle Decorative Circle */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />
        
        {/* Top: Branding */}
        <div className="space-y-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg">
              <ShoppingBag className="w-6 h-6 text-[#16A34A]" />
            </div>
            <span className="text-lg font-black tracking-wider uppercase text-green-100">Pazhamudhir Solai</span>
          </div>
          
          <div className="pt-8">
            <h2 className="text-4xl font-extrabold leading-tight tracking-tight">
              Tiruchendur Murugan <br/>
              <span className="text-green-200">Pazhamudhir Solai</span>
            </h2>
            <p className="text-green-100 text-sm mt-3 font-medium">
              Fresh Vegetables • Fruits • Grocery
            </p>
          </div>
        </div>

        {/* Middle: Feature Highlights */}
        <div className="space-y-6 relative z-10 my-auto">
          {/* Card 1 */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 flex items-start gap-4 hover:bg-white/15 transition-all">
            <div className="p-2.5 bg-white/20 rounded-xl">
              <Sparkles className="w-5 h-5 text-green-200" />
            </div>
            <div>
              <h4 className="font-bold text-base text-white">Farm Fresh Products</h4>
              <p className="text-xs text-green-100 mt-1">Sourced daily from premium local farms to guarantee absolute freshness and taste.</p>
            </div>
          </div>
          
          {/* Card 2 */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 flex items-start gap-4 hover:bg-white/15 transition-all">
            <div className="p-2.5 bg-white/20 rounded-xl">
              <Truck className="w-5 h-5 text-green-200" />
            </div>
            <div>
              <h4 className="font-bold text-base text-white">Fast Delivery</h4>
              <p className="text-xs text-green-100 mt-1">Express home delivery matching Zepto & Blinkit timings inside our service zones.</p>
            </div>
          </div>
          
          {/* Card 3 */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 flex items-start gap-4 hover:bg-white/15 transition-all">
            <div className="p-2.5 bg-white/20 rounded-xl">
              <CircleDollarSign className="w-5 h-5 text-green-200" />
            </div>
            <div>
              <h4 className="font-bold text-base text-white">Cash on Delivery</h4>
              <p className="text-xs text-green-100 mt-1">Pay comfortably upon arrival using Cash, Card, or UPI with zero hassle.</p>
            </div>
          </div>
        </div>

        {/* Bottom footer text */}
        <div className="relative z-10 text-xs text-green-100/60 font-medium">
          © {new Date().getFullYear()} Tiruchendur Murugan Pazhamudhir Solai
        </div>
      </div>

      {/* RIGHT COLUMN: LOGIN CARD */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-16">
        <div className="max-w-[480px] w-full bg-white rounded-[24px] shadow-[0_12px_40px_rgba(22,163,74,0.06)] border border-green-50/50 p-6 sm:p-8 lg:p-10 transition-all duration-300">
          
          {/* Heading */}
          <div className="text-left mb-8">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Welcome Back</h1>
            <p className="text-gray-500 mt-1.5 text-sm font-semibold">
              Login to continue shopping fresh groceries.
            </p>
          </div>

          {/* Success message from registration */}
          {successMsg && (
            <div className="flex items-start gap-3 bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3.5 mb-6 text-sm">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-green-600" />
              <span className="font-semibold">{successMsg}</span>
            </div>
          )}

          {/* API Error */}
          {apiError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6 text-sm">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span className="font-semibold">{apiError}</span>
              </div>
              {showVerifyActions && (
                <div className="flex gap-4 pl-7 pt-2.5 text-xs font-bold">
                  <button
                    type="button"
                    onClick={handleVerifyNow}
                    className="text-[#16A34A] hover:text-green-700 underline cursor-pointer"
                  >
                    Verify Email
                  </button>
                  <button
                    type="button"
                    onClick={handleResendRegisterOtp}
                    className="text-[#16A34A] hover:text-green-700 underline cursor-pointer"
                  >
                    Resend OTP
                  </button>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            
            {/* Phone Number */}
            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider">Phone Number</label>
              <div className={`flex items-center border-2 rounded-[16px] px-4 gap-3 transition-all duration-200 ${getFieldStyle('phoneNumber')}`}>
                <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="text-gray-400 text-sm font-bold border-r border-gray-200 pr-3">+91</span>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={form.phoneNumber}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  className="flex-1 bg-transparent py-4 text-sm font-semibold focus:outline-none text-gray-900 placeholder-gray-400"
                />
              </div>
              {touched.phoneNumber && errors.phoneNumber && (
                <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1 font-semibold">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.phoneNumber}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider">Password</label>
              <div className={`flex items-center border-2 rounded-[16px] px-4 gap-3 transition-all duration-200 ${getFieldStyle('password')}`}>
                <Lock className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Enter your password"
                  className="flex-1 bg-transparent py-4 text-sm font-semibold focus:outline-none text-gray-900 placeholder-gray-400"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {touched.password && errors.password && (
                <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1 font-semibold">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.password}
                </p>
              )}
            </div>

            {/* Forgot Password */}
            <div className="text-right">
              <Link to="/forgot-password" className="text-xs text-[#16A34A] font-extrabold hover:text-green-700 hover:underline">
                Forgot Password?
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !isFormValid}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-extrabold py-4 rounded-[16px] shadow-[0_4px_15px_rgba(22,163,74,0.3)] hover:shadow-[0_6px_20px_rgba(22,163,74,0.4)] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Logging in...</>
              ) : 'Login'}
            </button>
          </form>

          {/* Register Link */}
          <p className="text-center text-sm text-gray-500 mt-8 font-semibold">
            Don't have an account?{' '}
            <Link to="/register" className="text-[#16A34A] font-bold hover:underline">
              Register here
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
};

export default Login;
