import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import PendingUser from '../models/PendingUser.js';
import { generateVerificationOtp, sendVerificationEmail } from '../utils/registrationVerificationService.js';
import { createAndEmitNotification } from '../utils/notificationHelper.js';

export const sendVerificationOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email address is required.' });
  }

  const trimmedEmail = email.toLowerCase().trim();

  try {
    const userExists = await User.findOne({ email: trimmedEmail });
    if (userExists) {
      return res.status(400).json({ message: 'This email is already registered.' });
    }

    const pendingUser = await PendingUser.findOne({ email: trimmedEmail });
    if (!pendingUser) {
      return res.status(404).json({ message: 'No pending registration found for this email. Please register first.' });
    }

    const otpVal = generateVerificationOtp();
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otpVal, salt);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    pendingUser.emailVerificationOTP = hashedOtp;
    pendingUser.emailVerificationOTPExpiry = expiresAt;
    pendingUser.emailVerificationAttempts = 0;
    await pendingUser.save();

    await sendVerificationEmail({
      to: pendingUser.email,
      userName: pendingUser.fullName,
      otpVal
    });

    res.json({ success: true, message: 'Verification OTP sent successfully to your email.' });
  } catch (error) {
    console.error('Send verification OTP error:', error.message);
    res.status(500).json({ message: 'Failed to send verification email. Please try again.' });
  }
};

export const verifyRegistrationOtp = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required' });
  }

  const trimmedEmail = email.toLowerCase().trim();
  if (!/^\d{6}$/.test(String(otp))) {
    return res.status(400).json({ message: 'OTP must be exactly 6 numeric digits.' });
  }

  try {
    // Check duplicate in User collection first to prevent race condition
    const userExists = await User.findOne({ email: trimmedEmail });
    if (userExists) {
      return res.status(400).json({ message: 'This email address is already registered. Please login.' });
    }

    const pendingUser = await PendingUser.findOne({ email: trimmedEmail });
    if (!pendingUser) {
      return res.status(400).json({ message: 'OTP expired. Please resend.' });
    }

    if (pendingUser.emailVerificationOTPExpiry <= Date.now()) {
      return res.status(400).json({ message: 'OTP expired. Please resend.' });
    }

    if (pendingUser.emailVerificationAttempts >= 5) {
      return res.status(400).json({ message: 'Maximum verification attempts exceeded. Please request a new OTP.' });
    }

    const isMatch = await bcrypt.compare(otp, pendingUser.emailVerificationOTP);
    if (!isMatch) {
      pendingUser.emailVerificationAttempts += 1;
      await pendingUser.save();
      const remaining = 5 - pendingUser.emailVerificationAttempts;
      return res.status(400).json({
        message: remaining > 0
          ? `Invalid OTP. ${remaining} attempts remaining.`
          : 'Maximum verification attempts exceeded. Please request a new OTP.'
      });
    }

    // OTP is correct! Create user record in the main User collection now.
    const newUser = await User.create({
      fullName: pendingUser.fullName,
      phoneNumber: pendingUser.phoneNumber,
      email: pendingUser.email,
      password: pendingUser.password, // Already bcrypt-hashed password from PendingUser
      isVerified: true,
      isEmailVerified: true,
      verifiedAt: new Date()
    });

    // Delete the temporary registration record immediately
    await PendingUser.deleteOne({ _id: pendingUser._id });

    // Create and Emit Admin Notification
    try {
      const io = req.app.get('io');
      if (io) {
        await createAndEmitNotification(io, {
          title: 'New Customer Registered',
          message: `New customer registered: ${newUser.fullName} (${newUser.phoneNumber}).`,
          type: 'user',
          role: 'admin',
          link: '/admin/users',
          customerName: newUser.fullName,
          phone: newUser.phoneNumber || ''
        });
      }
    } catch (err) {
      console.error('Failed to create registration notification:', err);
    }

    res.json({
      success: true,
      redirect: '/login'
    });
  } catch (error) {
    console.error('Verify registration OTP error:', error.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};

export const resendVerificationOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email address is required.' });
  }

  const trimmedEmail = email.toLowerCase().trim();

  try {
    const userExists = await User.findOne({ email: trimmedEmail });
    if (userExists) {
      return res.status(400).json({ message: 'This email is already registered.' });
    }

    const pendingUser = await PendingUser.findOne({ email: trimmedEmail });
    if (!pendingUser) {
      return res.status(400).json({ message: 'No pending registration found for this email address. Please register again.' });
    }

    if (pendingUser.resendAttempts >= 3) {
      return res.status(400).json({ message: 'Maximum resend attempts reached. Please register again.' });
    }

    const otpVal = generateVerificationOtp();
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otpVal, salt);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    pendingUser.emailVerificationOTP = hashedOtp;
    pendingUser.emailVerificationOTPExpiry = expiresAt;
    pendingUser.emailVerificationAttempts = 0;
    pendingUser.resendAttempts += 1;
    await pendingUser.save();

    await sendVerificationEmail({
      to: pendingUser.email,
      userName: pendingUser.fullName,
      otpVal
    });

    res.json({ success: true, message: 'OTP resent successfully to your email.' });
  } catch (error) {
    console.error('Resend verification OTP error:', error.message);
    res.status(500).json({ message: 'Failed to resend code. Please try again.' });
  }
};
