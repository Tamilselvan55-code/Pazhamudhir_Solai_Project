import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    // NOTE: minlength is NOT set here — validation is done in the route
    // before hashing so we don't conflict with the hashed length
  },
  isAdmin: { type: Boolean, default: false },
  role: { type: String, enum: ['SuperAdmin', 'Admin', 'User'], default: 'User' },

  // ── Delivery Address (saved from map picker) ────────────────────────────
  deliveryAddress: {
    fullAddress:       { type: String, default: '' },
    lat:               { type: Number },
    lon:               { type: Number },
    pincode:           { type: String, default: '' },
    city:              { type: String, default: '' },
    state:             { type: String, default: '' },
    distanceFromStore: { type: Number },
    deliveryAvailable: { type: Boolean },
    updatedAt:         { type: Date },
  },

  // ── Wishlist ─────────────────────────────────────────────────────────────
  wishlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
  }],

  // ── Saved Addresses array ───────────────────────────────────────────────
  addresses: [{
    label:       { type: String, default: 'Home' }, // e.g. Home, Work, Other
    fullAddress: { type: String, default: '' },
    street:      { type: String, default: '' },
    city:        { type: String, default: '' },
    state:       { type: String, default: '' },
    pincode:     { type: String, default: '' },
    lat:         { type: Number },
    lon:         { type: Number },
    isDefault:   { type: Boolean, default: false },
  }],

  // ── Block / Unblock ──────────────────────────────────────────────────────
  isBlocked:     { type: Boolean, default: false },
  blockedAt:     { type: Date },
  blockedReason: { type: String },

  // ── Email Verification ────────────────────────────────────────────────────
  isVerified:                 { type: Boolean, default: false },
  verifiedAt:                 { type: Date, default: null },
  emailOtp:                   { type: String },
  emailOtpExpires:            { type: Date },
  verificationAttempts:       { type: Number, default: 0 },

  // ── Separate Registration Verification Module ──────────────────────────────
  isEmailVerified:            { type: Boolean, default: false },
  emailVerificationOTP:       { type: String },
  emailVerificationOTPExpiry:  { type: Date },
  emailVerificationAttempts:  { type: Number, default: 0 },

  // New OTP fields for New User Registration verification
  otp:                        { type: String },
  otpExpires:                 { type: Date },
  emailVerified:              { type: Boolean, default: false },
  verificationOTP:            { type: String },
  verificationOTPExpires:     { type: Date },

  // Suspended & lock settings
  suspendedUntil:             { type: Date },
  loginAttempts:              { type: Number, required: true, default: 0 },
  lockUntil:                  { type: Date },

}, { timestamps: true });

// Mongoose 9: async pre-hooks must NOT call next() — just return/resolve
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  // If password is already a bcrypt hash, do not hash it again
  if (this.password.startsWith('$2a$') || this.password.startsWith('$2b$')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});


userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
