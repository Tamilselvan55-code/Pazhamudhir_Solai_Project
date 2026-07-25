import prisma from './prismaClient.js';

/**
 * Shared audit log + Socket.IO emit helper.
 * Replaces the copy-pasted logAuditAndEmit in categories.js, offers.js,
 * payments.js, products.js, users.js, and calendar.js.
 */
export const logAuditAndEmit = async (req, action, targetType, targetId, targetName, oldValue, newValue, eventName, eventData) => {
  try {
    const adminName = req.admin ? req.admin.name : 'System Admin';
    await prisma.auditLog.create({
      data: {
        adminName: (req.admin && req.admin.name) ? req.admin.name : 'System Admin',
        action,
        targetType,
        targetId: targetId ? String(targetId) : null,
        targetName: targetName ? String(targetName) : null,
        oldValue: oldValue != null ? JSON.stringify(oldValue) : null,
        newValue: newValue != null ? JSON.stringify(newValue) : null
      }
    });
    const io = req.app.get('io');
    if (io && eventName) {
      io.emit(eventName, eventData);
    }
  } catch (err) {
    console.error('[AuditLog Error]:', err.message);
  }
};
