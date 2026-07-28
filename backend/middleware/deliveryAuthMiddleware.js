import jwt from 'jsonwebtoken';
import prisma from '../utils/prismaClient.js';
import { formatMongoCompat } from '../utils/formatMongoCompat.js';

export const protectDelivery = async (req, res, next) => {
  if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer')) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const partner = await prisma.deliveryPartner.findUnique({ where: { id: decoded.id } });
    
    if (!partner) {
      return res.status(401).json({ message: 'Not authorized, partner not found' });
    }
    
    if (!partner.isActive) {
      return res.status(403).json({ message: 'Your account has been deactivated.' });
    }

    const { password, ...partnerWithoutPassword } = partner;
    req.partner = formatMongoCompat(partnerWithoutPassword);
    
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};
