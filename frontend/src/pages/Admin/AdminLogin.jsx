import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Mail, Lock, Eye, EyeOff, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import useAuthStore from '../../store/useAuthStore';

const AdminLogin = () => {
  const navigate = useNavigate();
  const { adminLogin, loading } = useAuthStore();

  useEffect(() => {
    document.title = 'Tiruchendur Murugan Pazhamudhir Solai - Admin Panel';

    let meta = document.querySelector('meta[name="robots"]');
    let created = false;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'robots';
      document.head.appendChild(meta);
      created = true;
    }
    const prevContent = meta.content;
    meta.content = 'noindex, nofollow';

    return () => {
      if (meta) {
        if (created) {
          meta.remove();
        } else {
          meta.content = prevContent || 'index, follow';
        }
      }
    };
  }, []);

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState('');

  const validateField = (name, value) => {
    if (name === 'email') {
      if (!value) return 'Email is required';
      if (!/^\S+@\S+\.\S+$/.test(value)) return 'Enter a valid email address';
    }
    if (name === 'password') {
      if (!value) return 'Password is required';
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
    form.email && !validateField('email', form.email) &&
    form.password && !validateField('password', form.password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    const eErr = validateField('email', form.email);
    const passErr = validateField('password', form.password);
    if (eErr || passErr) {
      setErrors({ email: eErr, password: passErr });
      return;
    }
    const result = await adminLogin(form);
    if (result.success) {
      navigate('/admin/dashboard');
    } else {
      setApiError(result.message);
    }
  };

  const getFieldStyle = (name) => {
    const isInvalid = touched[name] && errors[name];
    const isValid = form[name] && !validateField(name, form[name]);
    if (isInvalid) return 'border-red-400 bg-red-50';
    if (isValid) return 'border-green-500 bg-green-50';
    return 'border-gray-200 bg-gray-50 focus-within:border-green-500 focus-within:bg-white';
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 py-12 bg-slate-50">
      
      {/* Back to Customer Login Button - Top Left */}
      <div className="absolute top-6 left-6">
        <Link 
          to="/login" 
          className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 font-semibold rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 transition-all hover:shadow text-sm"
        >
          <ArrowLeft className="w-4 h-4 text-gray-500" />
          <span>Customer Login</span>
        </Link>
      </div>

      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900 shadow-lg mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">Tiruchendur Murugan Pazhamudhir Solai</h1>
          <p className="text-gray-500 mt-1 text-sm">Admin Panel Login</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">

          {/* API Error */}
          {apiError && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-6 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{apiError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Admin Email</label>
              <div className={`flex items-center border-2 rounded-xl px-4 gap-3 transition-colors ${getFieldStyle('email')}`}>
                <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="admin@example.com"
                  className="flex-1 bg-transparent py-3.5 text-sm focus:outline-none text-gray-900 placeholder-gray-400"
                />
              </div>
              {touched.email && errors.email && <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
              <div className={`flex items-center border-2 rounded-xl px-4 gap-3 transition-colors ${getFieldStyle('password')}`}>
                <Lock className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Enter your password"
                  className="flex-1 bg-transparent py-3.5 text-sm focus:outline-none text-gray-900 placeholder-gray-400"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {touched.password && errors.password && <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.password}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !isFormValid}
              className="w-full bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold py-4 rounded-xl shadow-md transition-all disabled:opacity-70 flex items-center justify-center gap-2 text-base mt-2"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Authenticating...</>
              ) : 'Login to Admin Panel'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
