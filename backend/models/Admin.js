import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const adminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['SuperAdmin', 'Super Admin', 'Admin', 'Manager', 'Staff'],
    default: 'Admin',
  },
  permissions: {
    products: { type: Boolean, default: true },
    orders: { type: Boolean, default: true },
    reports: { type: Boolean, default: true },
    settings: { type: Boolean, default: true },
    users: { type: Boolean, default: true },
    notifications: { type: Boolean, default: true }
  },
  loginAttempts: { type: Number, required: true, default: 0 },
  lockUntil: { type: Date }
}, { timestamps: true });

adminSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

adminSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const Admin = mongoose.model('Admin', adminSchema);
export default Admin;
