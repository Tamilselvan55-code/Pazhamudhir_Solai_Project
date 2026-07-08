import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  adminName: {
    type: String,
    required: true,
    default: 'System Admin'
  },
  action: {
    type: String,
    required: true // e.g., 'Update Price', 'Update Stock', 'Payment Status Update', 'Create Category'
  },
  targetType: {
    type: String,
    required: true,
    enum: ['Product', 'Price', 'Stock', 'Payment', 'Category', 'Offer', 'Order', 'User', 'System']
  },
  targetId: {
    type: String
  },
  targetName: {
    type: String
  },
  oldValue: {
    type: mongoose.Schema.Types.Mixed
  },
  newValue: {
    type: mongoose.Schema.Types.Mixed
  }
}, { timestamps: true });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
