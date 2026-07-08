import mongoose from 'mongoose';

const pendingUserSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
  },
  emailVerificationOTP: {
    type: String,
    required: [true, 'OTP is required'],
  },
  emailVerificationOTPExpiry: {
    type: Date,
    required: [true, 'Expiration time is required'],
  },
  emailVerificationAttempts: {
    type: Number,
    default: 0,
  },
  resendAttempts: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

// TTL index: automatically drops document after the verification OTP expires
pendingUserSchema.index({ emailVerificationOTPExpiry: 1 }, { expireAfterSeconds: 0 });

// Compound index on email for fast lookups
pendingUserSchema.index({ email: 1 });

const PendingUser = mongoose.model('PendingUser', pendingUserSchema, 'PendingUsers');
export default PendingUser;
