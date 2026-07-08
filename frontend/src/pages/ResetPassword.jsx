import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, ShoppingBag, AlertCircle, Loader2 } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { resetPassword, loading } = useAuthStore();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [apiError, setApiError] = useState('');

  const validateField = (name, value, matchValue = '') => {
    if (name === 'password') {
      if (!value) return 'Password is required';
      if (value.length < 6) return 'Password must contain at least 6 characters.';
    }
    if (name === 'confirm') {
      if (!value) return 'Please confirm your password';
      if (value !== matchValue) return 'Passwords do not match';
    }
    return '';
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    setErrors(prev => ({
      ...prev,
      [name]: validateField(name, value, name === 'confirm' ? password : confirm)
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'password') setPassword(value);
    if (name === 'confirm') setConfirm(value);
    setApiError('');
    if (touched[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: validateField(name, value, name === 'confirm' ? password : (name === 'password' ? confirm : ''))
      }));
    }
  };

  const isFormValid = 
    password && !validateField('password', password) &&
    confirm && !validateField('confirm', confirm, password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ password: true, confirm: true });
    const pErr = validateField('password', password);
    const cErr = validateField('confirm', confirm, password);
    if (pErr || cErr) {
      setErrors({ password: pErr, confirm: cErr });
      return;
    }
    const result = await resetPassword({ token, password });
    if (result.success) navigate('/');
    else setApiError(result.message);
  };

  const getFieldStyle = (name) => {
    const val = name === 'password' ? password : confirm;
    const isInvalid = touched[name] && errors[name];
    const isValid = val && !validateField(name, val, name === 'confirm' ? password : '');
    if (isInvalid) return 'border-red-400 bg-red-50';
    if (isValid) return 'border-green-500 bg-green-50';
    return 'border-gray-200 bg-gray-50 focus-within:border-green-500 focus-within:bg-white';
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: '#f7fdf7' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-600 shadow-lg mb-4">
            <ShoppingBag className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">Set New Password</h1>
          <p className="text-gray-500 mt-1 text-sm">Enter your new password below</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
          {apiError && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-5 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /><span>{apiError}</span>
            </div>
          )}
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">New Password</label>
              <div className={`flex items-center border-2 rounded-xl px-4 gap-3 transition-colors ${getFieldStyle('password')}`}>
                <Lock className="w-4 h-4 text-gray-400 shrink-0" />
                <input type={showPwd ? 'text' : 'password'} name="password" value={password}
                  onChange={handleChange} onBlur={handleBlur}
                  placeholder="At least 6 characters"
                  className="flex-1 bg-transparent py-3.5 text-sm focus:outline-none text-gray-900 placeholder-gray-400" />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="text-gray-400 hover:text-gray-600">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {touched.password && errors.password && <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.password}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm Password</label>
              <div className={`flex items-center border-2 rounded-xl px-4 gap-3 transition-colors ${getFieldStyle('confirm')}`}>
                <Lock className="w-4 h-4 text-gray-400 shrink-0" />
                <input type="password" name="confirm" value={confirm}
                  onChange={handleChange} onBlur={handleBlur}
                  placeholder="Re-enter password"
                  className="flex-1 bg-transparent py-3.5 text-sm focus:outline-none text-gray-900 placeholder-gray-400" />
              </div>
              {touched.confirm && errors.confirm && <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.confirm}</p>}
            </div>

            <button type="submit" disabled={loading || !isFormValid}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-md transition-all disabled:opacity-70 flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Resetting...</> : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
