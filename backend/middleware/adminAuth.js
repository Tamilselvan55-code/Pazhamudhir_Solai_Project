import jwt from 'jsonwebtoken';
import prisma from '../utils/prismaClient.js';
import { formatMongoCompat } from '../utils/formatMongoCompat.js';

export const protectAdmin = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const admin = await prisma.admin.findUnique({ where: { id: decoded.id } });
      if (!admin) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }
      const { password, ...adminWithoutPassword } = admin;
      req.admin = formatMongoCompat(adminWithoutPassword);
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

export const requirePermission = (moduleName, action = 'view') => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    const role = req.admin.role;
    if (role === 'Super Admin' || role === 'SuperAdmin') {
      return next();
    }
    
    // Check if the permissions object exists and has the module
    if (req.admin.permissions && req.admin.permissions[moduleName]) {
      const modulePerms = req.admin.permissions[moduleName];
      
      // If it's a legacy boolean permission (e.g. products: true)
      if (typeof modulePerms === 'boolean' && modulePerms === true) {
        return next();
      }
      
      // If it's a granular object (e.g. products: { view: true, edit: false })
      if (typeof modulePerms === 'object' && modulePerms[action] === true) {
        return next();
      }
    }
    
    return res.status(403).json({ message: `Access Denied: Requires ${action} permission on ${moduleName}` });
  };
};
