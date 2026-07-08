import mongoose from 'mongoose';

const calendarEventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  eventType: {
    type: String,
    required: true,
    enum: ['Stock Arrival', 'Offer Starts', 'Offer Ends', 'Delivery Schedule', 'Business Reminder', 'Other'],
    default: 'Business Reminder'
  },
  date: {
    type: String, // YYYY-MM-DD
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  createdBy: {
    type: String,
    default: 'Admin'
  }
}, { timestamps: true });

const CalendarEvent = mongoose.model('CalendarEvent', calendarEventSchema);
export default CalendarEvent;
