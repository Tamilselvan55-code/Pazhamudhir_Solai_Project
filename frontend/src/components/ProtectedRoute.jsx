import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';

const ProtectedRoute = ({ children, role = 'customer', adminModule }) => {
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
    
    // Check specific module permission if provided
    if (adminModule && adminInfo.role !== 'Super Admin' && adminInfo.role !== 'SuperAdmin') {
      const perms = adminInfo.permissions || {};
      const modPerms = perms[adminModule];
      
      let hasAccess = false;
      if (typeof modPerms === 'boolean' && modPerms === true) {
        hasAccess = true;
      } else if (typeof modPerms === 'object' && modPerms.view === true) {
        hasAccess = true;
      }
      
      if (!hasAccess) {
        return <Navigate to="/admin/access-denied" replace />;
      }
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
