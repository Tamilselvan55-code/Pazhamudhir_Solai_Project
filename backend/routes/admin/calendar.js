import express from 'express';
import prisma from '../../utils/prismaClient.js';
import { formatMongoCompat, formatMongoCompatArray } from '../../utils/formatMongoCompat.js';

const router = express.Router();

const logAuditAndEmit = async (req, action, targetType, targetId, targetName, oldValue, newValue, eventName, eventData) => {
  try {
    const adminName = req.admin ? req.admin.name : 'System Admin';
    await prisma.auditLog.create({
      data: {
        adminName,
        action,
        targetType,
        targetId: String(targetId || ''),
        targetName: String(targetName || ''),
        oldValue: oldValue ? String(oldValue) : null,
        newValue: newValue ? String(newValue) : null
      }
    });
    const io = req.app.get('io');
    if (io && eventName) {
      io.emit(eventName, eventData);
    }
  } catch (err) {
    console.error('AuditLog helper error:', err);
  }
};

router.get('/calendar-events', async (req, res) => {
  try {
    const eventsRaw = await prisma.calendarEvent.findMany({
      orderBy: { date: 'asc' }
    });
    res.json(formatMongoCompatArray(eventsRaw));
  } catch (error) {
    console.error('Fetch calendar events error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/calendar-events', async (req, res) => {
  try {
    const { title, eventType, date, description } = req.body;
    if (!title || !date) {
      return res.status(400).json({ message: 'Title and date are required' });
    }
    const newEventRaw = await prisma.calendarEvent.create({
      data: {
        title,
        eventType: eventType || 'Holiday',
        date: new Date(date),
        description: description || '',
        createdBy: req.admin?.name || 'Admin'
      }
    });

    await logAuditAndEmit(
      req,
      'create',
      'CalendarEvent',
      newEventRaw.id,
      title,
      null,
      JSON.stringify(newEventRaw),
      null,
      null
    );

    res.status(201).json(formatMongoCompat(newEventRaw));
  } catch (error) {
    console.error('Create calendar event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/calendar-events/:id', async (req, res) => {
  try {
    const event = await prisma.calendarEvent.findUnique({ where: { id: req.params.id } });
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    await prisma.calendarEvent.delete({ where: { id: req.params.id } });

    await logAuditAndEmit(
      req,
      'delete',
      'CalendarEvent',
      event.id,
      event.title,
      JSON.stringify(event),
      null,
      null,
      null
    );

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete calendar event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
