import mongoose from 'mongoose';

const passwordResetSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
  },
  otp: {
    type: String,
    required: [true, 'OTP is required'], // bcrypt-hashed OTP
  },
  expiresAt: {
    type: Date,
    required: [true, 'Expiration time is required'],
  },
  verified: {
    type: Boolean,
    default: false,
  },
  resetToken: {
    type: String, // SHA-256 hash of the verification session token
  },
}, { timestamps: true });

// TTL index: MongoDB will automatically drop expired documents
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const PasswordReset = mongoose.model('PasswordReset', passwordResetSchema, 'PasswordResets');
export default PasswordReset;
