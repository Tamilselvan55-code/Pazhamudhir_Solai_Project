import mongoose from 'mongoose';

const adminNotificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['New Order', 'Low Stock', 'Out of Stock', 'Customer Registered'],
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  read: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

const AdminNotification = mongoose.model('AdminNotification', adminNotificationSchema);
export default AdminNotification;
