import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  title:            { type: String, required: true },
  message:          { type: String, required: true },
  // notification type
  type:             { type: String, required: true },
  isRead:           { type: Boolean, default: false },
  link:             { type: String, default: '' },
  role:             { type: String, enum: ['admin', 'customer'], default: 'customer' },

  // New Notification Schema Fields
  icon:             { type: String, default: 'bell' },
  priority:         { type: String, default: 'normal' },
  actionUrl:        { type: String, default: '' },

  // Rich order / customer context
  customerName:     { type: String, default: '' },
  phone:            { type: String, default: '' },
  orderId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  invoiceNumber:    { type: String, default: '' },
  orderTotal:       { type: Number, default: 0 },
  totalItems:       { type: Number, default: 0 },
  paymentMethod:    { type: String, default: '' },
  orderStatus:      { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);
