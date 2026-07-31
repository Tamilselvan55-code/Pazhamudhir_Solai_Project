import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../../config/api';
import { Phone, Lock, Eye, EyeOff, Loader2, Navigation, IndianRupee, Bell, Truck } from 'lucide-react';

const DeliveryLogin = () => {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data } = await axios.post(`${API_BASE}/delivery/login`, {
        mobile,
        password,
      });

      // Store in localStorage for simple independent auth
      localStorage.setItem('deliveryPartnerInfo', JSON.stringify(data));
      navigate('/delivery/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      
      {/* Left Section - Hidden on mobile, takes 50% on desktop */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-orange-500 to-orange-700 dark:from-orange-700 dark:to-gray-900 flex-col justify-between p-12 text-white relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-orange-400 opacity-20 rounded-full blur-3xl -ml-20 -mb-20"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <Truck className="w-6 h-6 text-orange-600" />
            </div>
            <h1 className="text-2xl font-black tracking-tight">Partner Hub</h1>
          </div>
          
          <h2 className="text-5xl font-black leading-tight mb-6">
            Deliver fresh. <br/>
            <span className="text-orange-200">Earn daily.</span>
          </h2>
          <p className="text-lg text-orange-50 max-w-md">
            Join our elite fleet of delivery partners. Enjoy flexible timings, instant payouts, and smart navigation.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-6 mt-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Navigation className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-orange-50">Smart Navigation</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <IndianRupee className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-orange-50">Daily Earnings</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-orange-50">Real-Time Orders</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-orange-50">Instant Alerts</span>
          </div>
        </div>
      </div>

      {/* Right Section - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative">
        <div className="w-full max-w-md">
          <div className="text-center lg:text-left mb-10">
            <div className="inline-flex lg:hidden w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-2xl items-center justify-center mb-6 shadow-sm">
              <Truck className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">Welcome back</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Please enter your credentials to access your dashboard.</p>
          </div>

          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-gray-100 dark:border-gray-700 p-8 transition-colors duration-300">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 flex items-start gap-3">
                <div className="text-red-500 mt-0.5">⚠️</div>
                <p className="text-sm text-red-700 dark:text-red-400 font-medium">{error}</p>
              </div>
            )}

            <form className="space-y-6" onSubmit={handleLogin}>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Mobile Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    placeholder="Enter 10-digit number"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-11 pr-12 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded cursor-pointer"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    Remember me
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent rounded-xl shadow-[0_4px_14px_0_rgba(234,88,12,0.39)] text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transform transition-all duration-200 ${
                  loading ? 'opacity-70 cursor-not-allowed scale-[0.98]' : 'hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98]'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In to Dashboard'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryLogin;
