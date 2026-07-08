import mongoose from 'mongoose';

const notificationSettingsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  orderNotifications: { type: Boolean, default: true },
  offerNotifications: { type: Boolean, default: true },
  deliveryNotifications: { type: Boolean, default: true },
  securityNotifications: { type: Boolean, default: true },
  promotionalNotifications: { type: Boolean, default: true },
  generalNotifications: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('NotificationSettings', notificationSettingsSchema);
