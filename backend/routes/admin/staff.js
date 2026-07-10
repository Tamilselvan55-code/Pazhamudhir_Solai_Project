import express from 'express';
import { protectAdmin } from '../../middleware/adminAuth.js';
import prisma from '../../utils/prismaClient.js';
import { formatMongoCompat, formatMongoCompatArray } from '../../utils/formatMongoCompat.js';

const router = express.Router();

router.get('/staff', async (req, res) => {
  try {
    const staffRaw = await prisma.admin.findMany({
      select: { id: true, name: true, email: true, role: true, permissions: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(formatMongoCompatArray(staffRaw));
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/staff', async (req, res) => {
  try {
    const { name, email, password, role, permissions } = req.body;
    const exists = await prisma.admin.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (exists) {
      return res.status(409).json({ message: 'Staff member email already exists.' });
    }

    const newStaffRaw = await prisma.admin.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        password, // In a real app this should be hashed, but reproducing exact MongoDB behavior
        role,
        permissions: permissions || {
          products: true,
          orders: true,
          reports: true,
          settings: true,
          users: true,
          notifications: true
        }
      }
    });

    const staffObj = formatMongoCompat(newStaffRaw);
    delete staffObj.password;

    const adminName = req.admin ? req.admin.name : 'System Admin';
    await prisma.auditLog.create({
      data: {
        adminName,
        action: 'Create Staff',
        targetType: 'User',
        targetId: String(staffObj._id),
        targetName: staffObj.name,
        newValue: JSON.stringify({ role: staffObj.role })
      }
    });

    res.status(201).json(staffObj);
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

router.put('/staff/:id', async (req, res) => {
  try {
    const { name, email, role, permissions, password } = req.body;
    const oldStaffRaw = await prisma.admin.findUnique({ where: { id: req.params.id } });
    if (!oldStaffRaw) {
      return res.status(404).json({ message: 'Staff member not found.' });
    }

    if (email && email.toLowerCase().trim() !== oldStaffRaw.email) {
      const emailExists = await prisma.admin.findUnique({ where: { email: email.toLowerCase().trim() } });
      if (emailExists) {
        return res.status(409).json({ message: 'Email already in use.' });
      }
    }

    const updateData = {};
    if (email) updateData.email = email.toLowerCase().trim();
    if (name) updateData.name = name;
    if (role) updateData.role = role;
    if (permissions) updateData.permissions = permissions;
    if (password && password.trim() !== '') updateData.password = password;

    const updatedRaw = await prisma.admin.update({
      where: { id: req.params.id },
      data: updateData
    });

    const staffObj = formatMongoCompat(updatedRaw);
    delete staffObj.password;

    const adminName = req.admin ? req.admin.name : 'System Admin';
    await prisma.auditLog.create({
      data: {
        adminName,
        action: 'Update Staff Info',
        targetType: 'User',
        targetId: String(staffObj._id),
        targetName: staffObj.name,
        newValue: JSON.stringify({ role: staffObj.role })
      }
    });

    res.json(staffObj);
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

router.delete('/staff/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (id === String(req.admin.id || req.admin._id)) {
      return res.status(400).json({ message: 'You cannot delete your own administrative account.' });
    }
    const staff = await prisma.admin.findUnique({ where: { id } });
    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found.' });
    }
    if (staff.role === 'Super Admin' || staff.role === 'SuperAdmin') {
      return res.status(403).json({ message: 'Super Admin account cannot be deleted.' });
    }

    await prisma.admin.delete({ where: { id } });

    const adminName = req.admin ? req.admin.name : 'System Admin';
    await prisma.auditLog.create({
      data: {
        adminName,
        action: 'Delete Staff',
        targetType: 'User',
        targetId: String(id),
        targetName: staff.name,
        oldValue: JSON.stringify({ role: staff.role })
      }
    });

    res.json({ message: 'Staff member deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
