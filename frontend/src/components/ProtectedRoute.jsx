import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';

const ProtectedRoute = ({ children, role = 'customer' }) => {
  const { userInfo, adminInfo } = useAuthStore();
  const location = useLocation();

  if (role === 'customer') {
    if (!userInfo) {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
  } else if (role === 'admin') {
    if (!adminInfo || !adminInfo.token) {
      return <Navigate to="/admin/login" state={{ from: location, reason: 'access_denied' }} replace />;
    }
  } else if (role === 'delivery') {
    const partnerInfo = localStorage.getItem('deliveryPartnerInfo');
    if (!partnerInfo) {
      return <Navigate to="/delivery/login" state={{ from: location, reason: 'access_denied' }} replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
