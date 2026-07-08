import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';

export const protectAdmin = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      req.admin = await Admin.findById(decoded.id).select('-password');
      if (!req.admin) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }
      next();
    } catch (error) {
      console.error('Token verification error:', error.message);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

export const requireSuperAdmin = (req, res, next) => {
  if (req.admin && (req.admin.role === 'SuperAdmin' || req.admin.role === 'Super Admin')) {
    next();
  } else {
    res.status(403).json({ message: 'Access Denied' });
  }
};

export const requireManagerOrAbove = (req, res, next) => {
  if (req.admin && (req.admin.role === 'Super Admin' || req.admin.role === 'Manager' || req.admin.role === 'SuperAdmin')) {
    next();
  } else {
    res.status(403).json({ message: 'Access Denied' });
  }
};

export const requirePermission = (permissionName) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    const role = req.admin.role;
    if (role === 'Super Admin' || role === 'SuperAdmin') {
      return next();
    }
    if (req.admin.permissions && req.admin.permissions[permissionName]) {
      return next();
    }
    return res.status(403).json({ message: `Access Denied: Requires ${permissionName} permission` });
  };
};

