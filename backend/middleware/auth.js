import jwt from 'jsonwebtoken';
import prisma from '../utils/prismaClient.js';
import { formatMongoCompat } from '../utils/formatMongoCompat.js';

export const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({ where: { id: decoded.id } });
      if (!user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }
      const { password, ...userWithoutPassword } = user;
      req.user = formatMongoCompat(userWithoutPassword);
      if (req.user.isBlocked) {
        return res.status(403).json({ message: 'Your account has been blocked.' });
      }
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

export const isAdmin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(403).json({ message: 'Admin access required' });
  }
};
