import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import PasswordReset from '../models/PasswordReset.js';
import PendingUser from '../models/PendingUser.js';
import { protect } from '../middleware/auth.js';
import { createAndEmitNotification } from '../utils/notificationHelper.js';
import Notification from '../models/Notification.js';
import Product from '../models/Product.js';
import { sendEmail, getOtpEmailContent, sendRegistrationOTP, getGmailTransporter } from '../utils/emailService.js';
import { checkMaintenanceAndFeature } from '../middleware/maintenanceAndFeature.js';
import { validatePasswordPolicy, handleFailedLogin, resetFailedLogin } from '../utils/securityHelper.js';
import StoreSettings from '../models/StoreSettings.js';
import AuditLog from '../models/AuditLog.js';
import NotificationSettings from '../models/NotificationSettings.js';

const router = express.Router();

// ─── Registration Email Verification Routes ──────────────────────────────────
router.post('/send-verification-otp', checkMaintenanceAndFeature('disableRegistration'), async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email address is required.' });
  try {
    const pendingUser = await PendingUser.findOne({ email: email.toLowerCase().trim() });
    if (!pendingUser) return res.status(404).json({ message: 'No registration session found for this email.' });

    const otpVal = String(crypto.randomInt(100000, 1000000));
    console.log('OTP generated');
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    console.log('Sending OTP...');
    const mailOptions = {
      from: `"Tiruchendur Murugan Pazhamudhir Solai" <${process.env.EMAIL_USER}>`,
      to: pendingUser.email,
      subject: 'Verify Your Email - Tiruchendur Murugan Pazhamudhir Solai',
      text: `Welcome to Tiruchendur Murugan Pazhamudhir Solai.

Use the verification code below to activate your account.

${otpVal}

This code expires in 10 minutes.

If you didn't register, ignore this email.

Regards,
Tiruchendur Murugan Pazhamudhir Solai`,
      html: getVerificationHtmlTemplate(pendingUser.fullName, otpVal)
    };

    const transporter = getGmailTransporter();
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully');

    pendingUser.emailVerificationOTP = otpVal;
    pendingUser.emailVerificationOTPExpiry = otpExpires;
    await pendingUser.save();
    console.log('OTP stored');

    res.json({ success: true, message: 'Verification OTP sent successfully to your email.' });
  } catch (error) {
    console.error('Send verification OTP error:', error.message);
    res.status(500).json({ message: 'Failed to send verification email. Please try again.' });
  }
});

router.post('/verify-registration-otp', checkMaintenanceAndFeature('disableRegistration'), async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required' });
  }

  try {
    const pendingUser = await PendingUser.findOne({ email: email.toLowerCase().trim() });
    if (!pendingUser) {
      return res.status(400).json({ message: 'No verification session found. Please register again.' });
    }

    // Check OTP matches
    if (pendingUser.emailVerificationOTP !== String(otp).trim()) {
      return res.status(400).json({ message: 'Invalid Verification Code' });
    }

    // Check OTP not expired
    if (pendingUser.emailVerificationOTPExpiry < Date.now()) {
      return res.status(400).json({ message: 'Verification code expired. Please resend.' });
    }

    // Create user account
    const user = new User({
      fullName: pendingUser.fullName,
      phoneNumber: pendingUser.phoneNumber,
      email: pendingUser.email,
      password: pendingUser.password, // pre-hashed
      emailVerified: true,
      isVerified: true,
      isEmailVerified: true
    });
    await user.save();

    // Initialize notification settings and trigger welcome notification
    try {
      await NotificationSettings.create({ userId: user._id });
      const io = req.app.get('io');
      await createAndEmitNotification(io, {
        userId: user._id,
        title: 'Welcome to Tiruchendur Murugan Pazhamudhir Solai!',
        message: 'Thank you for registering. You can now browse products and place orders!',
        type: 'account',
        role: 'customer',
        actionUrl: '/'
      });
    } catch (nsErr) {
      console.error('Failed to initialize user notifications/settings:', nsErr);
    }

    // Delete OTP (PendingUser record)
    await PendingUser.deleteOne({ _id: pendingUser._id });

    console.log('Verification successful');

    // Create and Emit Admin Notification
    try {
      const io = req.app.get('io');
      if (io) {
        await createAndEmitNotification(io, {
          title: 'New Customer Registered',
          message: `New customer registered: ${user.fullName} (${user.phoneNumber}).`,
          type: 'user',
          role: 'admin',
          link: '/admin/users',
          customerName: user.fullName,
          phone: user.phoneNumber || ''
        });
      }
    } catch (err) {
      console.error('Failed to create registration notification:', err);
    }

    res.status(200).json({
      success: true,
      message: 'Registration Successful. Your account has been verified. Please login.'
    });

  } catch (error) {
    console.error('Verify registration OTP error:', error.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

router.post('/resend-verification-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email address is required.' });
  }

  try {
    const pendingUser = await PendingUser.findOne({ email: email.toLowerCase().trim() });
    if (!pendingUser) {
      return res.status(400).json({ message: 'No registration record found. Please register again.' });
    }

    // Generate new OTP
    const otpVal = String(crypto.randomInt(100000, 1000000));
    console.log('OTP generated');

    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const mailOptions = {
      from: `"Tiruchendur Murugan Pazhamudhir Solai" <${process.env.EMAIL_USER}>`,
      to: pendingUser.email,
      subject: 'Verify Your Email - Tiruchendur Murugan Pazhamudhir Solai',
      text: `Welcome to Tiruchendur Murugan Pazhamudhir Solai.

Use the verification code below to activate your account.

${otpVal}

This code expires in 10 minutes.

If you didn't register, ignore this email.

Regards,
Tiruchendur Murugan Pazhamudhir Solai`,
      html: getVerificationHtmlTemplate(pendingUser.fullName, otpVal)
    };

    // Send again
    console.log('Sending OTP...');
    const transporter = getGmailTransporter();
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully');

    // Update database
    pendingUser.emailVerificationOTP = otpVal;
    pendingUser.emailVerificationOTPExpiry = otpExpires;
    await pendingUser.save();
    console.log('OTP stored');

    res.json({ success: true, message: 'Verification OTP has been resent.' });

  } catch (error) {
    console.error('Resend verification OTP error:', error.message);
    res.status(500).json({ message: 'Failed to resend code. Please try again.' });
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

const sendResponse = (res, user, statusCode = 200) => {
  res.status(statusCode).json({
    _id: user._id,
    name: user.fullName,
    fullName: user.fullName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    isAdmin: user.isAdmin,
    token: generateToken(user._id),
  });
};

// ─── Validation Helpers ───────────────────────────────────────────────────────
const isValidPhone = (p) => /^[6-9]\d{9}$/.test(p);
const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

// HTML Template Helper Function
const getVerificationHtmlTemplate = (name, otpVal) => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Verify Your Email - Tiruchendur Murugan Pazhamudhir Solai</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; padding: 40px 20px; margin: 0;">
  <div style="max-width: 550px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);">
    <!-- Brand Header -->
    <div style="background-color: #16a34a; padding: 30px 20px; text-align: center;">
      <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">Tiruchendur Murugan</h1>
      <p style="font-size: 13px; color: #dcfce7; margin: 6px 0 0 0; font-weight: 600;">Pazhamudhir Solai &bull; Fresh Supermarket</p>
    </div>
    
    <!-- Content Body -->
    <div style="padding: 40px 30px;">
      <p style="font-size: 16px; margin: 0 0 16px 0;">Hello <strong>${name}</strong>,</p>
      <p style="font-size: 15px; color: #475569; margin: 0 0 24px 0; line-height: 1.6;">
        Welcome to <strong>Tiruchendur Murugan Pazhamudhir Solai</strong>. Use the verification code below to activate your account and complete your registration.
      </p>
      
      <!-- OTP Box -->
      <div style="background-color: #f0fdf4; border: 1.5px dashed #bbf7d0; border-radius: 12px; padding: 25px; margin: 0 auto 28px auto; text-align: center; max-width: 260px;">
        <span style="font-size: 38px; font-weight: 800; color: #16a34a; letter-spacing: 6px; display: inline-block;">${otpVal}</span>
      </div>
      
      <p style="font-size: 14px; color: #475569; margin: 0 0 30px 0; text-align: center; font-weight: 500;">
        This code expires in <strong style="color: #16a34a;">10 minutes</strong>.
      </p>
      
      <p style="color: #94a3b8; font-size: 12px; margin: 30px 0 0 0; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 20px;">
        If you didn't register, ignore this email.
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #f1f5f9;">
      <p style="font-size: 12px; color: #64748b; margin: 0; font-weight: 600;">
        &copy; ${new Date().getFullYear()} Tiruchendur Murugan Pazhamudhir Solai. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>`;


// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', checkMaintenanceAndFeature('disableRegistration'), async (req, res) => {
  console.log("========== REGISTER REQUEST ==========");
  console.log(req.body);
  try {
    const { fullName, phoneNumber, email, password } = req.body;

    // ── Empty field checks ────────────────────────────────────────────────────
    if (!fullName && !phoneNumber && !email && !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ message: 'Please enter your full name' });
    }
    if (!phoneNumber) {
      return res.status(400).json({ message: 'Phone number is required' });
    }
    if (!email) {
      return res.status(400).json({ message: 'Email address is required' });
    }
    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    // ── Format validation ─────────────────────────────────────────────────────
    const nameTrimmed = fullName.trim();
    if (nameTrimmed.length < 3 || nameTrimmed.length > 50 || !/^[a-zA-Z\s]+$/.test(nameTrimmed)) {
      return res.status(400).json({ message: 'Please enter a valid full name.' });
    }
    if (!isValidPhone(phoneNumber)) {
      return res.status(400).json({ message: 'Enter a valid 10-digit Indian phone number (starting with 6-9)' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format. Please enter a valid email address' });
    }
    const settings = await StoreSettings.findOne();
    const policy = settings?.passwordPolicy || 'Medium';
    if (!validatePasswordPolicy(password, policy)) {
      let policyMsg = 'Password does not meet the safety requirements.';
      if (policy === 'Low') policyMsg = 'Password must be at least 6 characters.';
      if (policy === 'Medium') policyMsg = 'Password must be at least 8 characters and contain at least one letter and one number.';
      if (policy === 'High') policyMsg = 'Password must be at least 10 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character.';
      return res.status(400).json({ message: policyMsg });
    }
    if (password.length > 50) {
      return res.status(400).json({ message: 'Password must be at most 50 characters long.' });
    }

    // ── Check SMTP Credentials ────────────────────────────────────────────────
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || process.env.EMAIL_USER === 'your_email@gmail.com' || process.env.EMAIL_PASS === 'your_app_password') {
      return res.status(400).json({ success: false, message: 'Gmail SMTP credentials are not configured.' });
    }

    // ── Duplicate checks ──────────────────────────────────────────────────────
    console.log("Checking duplicate phone...");
    const phoneExists = await User.findOne({ phoneNumber: phoneNumber.trim() });
    if (phoneExists) {
      return res.status(409).json({ message: 'Phone number already registered.' });
    }

    console.log("Checking duplicate email...");
    const emailExists = await User.findOne({ email: email.toLowerCase().trim() });
    if (emailExists) {
      return res.status(409).json({ message: 'Email already registered.' });
    }

    // Clean up any legacy pending registrations in PendingUsers collection with matching email/phone to prevent conflicts
    await PendingUser.deleteMany({
      $or: [
        { email: email.toLowerCase().trim() },
        { phoneNumber: phoneNumber.trim() }
      ]
    });

    // ── Generate secure 6-digit OTP ──────────────────────────────────────────
    console.log("Generating OTP...");
    const otpVal = String(crypto.randomInt(100000, 1000000));
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create and hash password
    console.log("Creating user object...");
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Format mail options for SMTP send
    const mailOptions = {
      from: `"Tiruchendur Murugan Pazhamudhir Solai" <${process.env.EMAIL_USER}>`,
      to: email.toLowerCase().trim(),
      subject: 'Verify Your Email - Tiruchendur Murugan Pazhamudhir Solai',
      text: `Welcome to Tiruchendur Murugan Pazhamudhir Solai.

Use the verification code below to activate your account.

${otpVal}

This code expires in 10 minutes.

If you didn't register, ignore this email.

Regards,
Tiruchendur Murugan Pazhamudhir Solai`,
      html: getVerificationHtmlTemplate(nameTrimmed, otpVal)
    };

    // Send verification email using the cached transporter
    console.log("Sending verification email...");
    try {
      const transporter = getGmailTransporter();
      await transporter.sendMail(mailOptions);
      console.log("Email sent successfully");
    } catch (emailErr) {
      console.error("EMAIL SENDING FAILED:", emailErr);
      return res.status(500).json({ success: false, message: 'Unable to send verification email.' });
    }

    // Save registration data temporarily to PendingUser collection only AFTER email succeeds
    const pendingUser = new PendingUser({
      fullName: nameTrimmed,
      phoneNumber: phoneNumber.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      emailVerificationOTP: otpVal,
      emailVerificationOTPExpiry: otpExpires
    });
    await pendingUser.save();
    console.log("OTP stored");

    console.log("Registration completed.");

    res.status(200).json({
      success: true,
      email: pendingUser.email,
      redirect: "/verify-email"
    });

  } catch (error) {
    console.error("REGISTER ERROR:");
    console.error(error);
    console.error(error.stack);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: error.stack
    });
  }
});


// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', checkMaintenanceAndFeature('disableCustomerLogin'), async (req, res) => {
  const { phoneNumber, password } = req.body;

  if (!phoneNumber || !password) {
    return res.status(400).json({ message: 'Phone number and password are required' });
  }

  try {
    const user = await User.findOne({ phoneNumber: phoneNumber.trim() });
    if (!user) {
      return res.status(401).json({ message: 'No account found with this phone number. Please register first.' });
    }

    // Suspension check
    if (user.suspendedUntil && user.suspendedUntil > new Date()) {
      return res.status(403).json({
        message: `Your account is suspended until ${new Date(user.suspendedUntil).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}.`
      });
    }

    // Lockout check
    if (user.lockUntil && user.lockUntil > new Date()) {
      const remainingTime = Math.ceil((new Date(user.lockUntil).getTime() - Date.now()) / 60000);
      return res.status(403).json({ message: `Account locked due to multiple failed login attempts. Try again in ${remainingTime} min.` });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: `Your account has been blocked: ${user.blockedReason || 'No reason specified.'}` });
    }

    if (user.emailVerified === false) {
      return res.status(403).json({
        message: 'Please verify your email first.',
        needsVerification: true,
        email: user.email,
        phoneNumber: user.phoneNumber
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      const settings = await StoreSettings.findOne();
      const maxAttempts = settings?.maxLoginAttempts || 5;

      user.loginAttempts = (user.loginAttempts || 0) + 1;
      if (user.loginAttempts >= maxAttempts) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        await user.save();

        // Audit Log
        await AuditLog.create({
          adminName: 'System',
          action: 'Customer Account Lockout',
          targetType: 'User',
          targetId: String(user._id),
          targetName: user.fullName,
          oldValue: { attempts: user.loginAttempts },
          newValue: `Locked until ${user.lockUntil.toISOString()}`
        });

        return res.status(403).json({ message: `Incorrect password. Too many failed attempts. Account locked for 15 minutes.` });
      } else {
        await user.save();
        return res.status(401).json({ message: `Incorrect password. Please try again. (${maxAttempts - user.loginAttempts} attempts remaining)` });
      }
    }

    // Success - reset attempts
    user.loginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    // Audit Log Customer Login
    await AuditLog.create({
      adminName: 'System',
      action: 'Customer Login',
      targetType: 'User',
      targetId: String(user._id),
      targetName: user.fullName
    });

    // Trigger security login notification
    try {
      const io = req.app.get('io');
      await createAndEmitNotification(io, {
        userId: user._id,
        title: 'New Login Detected',
        message: `Your account was logged into on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}.`,
        type: 'security',
        role: 'customer',
        actionUrl: '/profile'
      });
    } catch (notifErr) {
      console.error('Failed to create login notification:', notifErr);
    }

    sendResponse(res, user);
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// ─── GET /api/auth/profile ────────────────────────────────────────────────────
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -resetPasswordToken -resetPasswordExpire');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error('Profile error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── POST /api/auth/send-otp ─────────────────────────────────────────────────
router.post('/send-otp', checkMaintenanceAndFeature('disableCustomerLogin'), async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });
  if (!isValidEmail(email)) return res.status(400).json({ message: 'Enter a valid email address' });

  const trimmedEmail = email.toLowerCase().trim();

  // Print 1: Email received from frontend
  console.log('[OTP] Email received');

  try {
    const user = await User.findOne({ email: trimmedEmail });
    
    // Print 2: User found in database
    if (!user) {
      console.log('[OTP] User Found: NO');
      return res.status(404).json({ message: 'No account found with this email address' });
    }
    console.log('[OTP] User found');

    // ── Rate Limit 1: 60 seconds resend cooldown ──────────────────────
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const lastRequest = await PasswordReset.findOne({ email: trimmedEmail }).sort({ createdAt: -1 });

    if (lastRequest && lastRequest.createdAt > oneMinuteAgo) {
      console.warn(`[OTP SECURITY] Rate limited (60s cooldown) for ${trimmedEmail}`);
      return res.status(429).json({ message: 'Please wait 60 seconds before requesting another OTP.' });
    }

    // ── Rate Limit 2: max 5 OTP requests in 15 minutes ──────────────
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const requestCount = await PasswordReset.countDocuments({
      email: trimmedEmail,
      createdAt: { $gte: fifteenMinutesAgo }
    });

    if (requestCount >= 5) {
      console.warn(`[OTP SECURITY] Rate limited (max 5 reqs / 15m) for ${trimmedEmail}`);
      return res.status(429).json({ message: 'Too many OTP requests. Maximum 5 requests in 15 minutes.' });
    }

    // ── Generate Secure 4-digit OTP ─────────────────────────────────
    const otpVal = String(crypto.randomInt(1000, 10000));
    
    // Print 3: OTP generated
    console.log('[OTP] OTP generated');

    // Hash the OTP with bcrypt for HIPAA-grade database protection
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otpVal, salt);

    const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 10;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    let resetRecord;
    try {
      resetRecord = await PasswordReset.create({
        email: trimmedEmail,
        otp: hashedOtp,
        expiresAt,
        verified: false
      });
      console.log('[OTP] OTP Saved: SUCCESS');
    } catch (dbError) {
      console.log('[OTP] OTP Saved: FAILED');
      console.error(`[OTP ERROR] ${dbError.message || dbError}`);
      throw dbError;
    }

    // ── Check Credentials Before Sending Email ───────────────────────
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || process.env.EMAIL_USER === 'your_email@gmail.com' || process.env.EMAIL_PASS === 'your_app_password') {
      return res.status(400).json({ success: false, message: 'Gmail SMTP credentials are not configured.' });
    }

    console.log('[OTP] Email sending started');

    try {
      const { subject, text, html } = getOtpEmailContent({ userName: user.name, otpVal });
      const info = await sendEmail({ to: user.email, subject, text, html });

      console.log('[OTP] Email sent successfully');
      res.json({ success: true, message: 'OTP sent successfully to your email' });
    } catch (emailError) {
      // Cleanup the database record immediately if mail delivery fails
      if (resetRecord && resetRecord._id) {
        await PasswordReset.deleteOne({ _id: resetRecord._id });
      }
      
      const fullErrorMsg = emailError.message || String(emailError);
      console.error(`[OTP ERROR] ${fullErrorMsg}`);

      res.status(500).json({ success: false, message: fullErrorMsg });
    }
  } catch (error) {
    const fullErrorMsg = error.message || String(error);
    console.error(`[OTP ERROR] ${fullErrorMsg}`);
    res.status(500).json({ success: false, message: fullErrorMsg });
  }
});

// ─── POST /api/auth/verify-otp ──────────────────────────────────────────────
router.post('/verify-otp', checkMaintenanceAndFeature('disableCustomerLogin'), async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required' });
  if (!/^\d{4}$/.test(String(otp))) {
    return res.status(400).json({ message: 'OTP must be exactly 4 numeric digits.' });
  }

  const trimmedEmail = email.toLowerCase().trim();
  const maskEmail = (e) => {
    const [name, domain] = e.split('@');
    if (!name || !domain) return e;
    const maskedName = name.length > 2 ? `${name.substring(0, 2)}***${name.substring(name.length - 2)}` : name;
    return `${maskedName}@${domain}`;
  };

  try {
    // Find the latest active verification record that is not yet verified or expired
    const resetRecord = await PasswordReset.findOne({
      email: trimmedEmail,
      verified: false,
      expiresAt: { $gt: Date.now() }
    }).sort({ createdAt: -1 });

    if (!resetRecord) {
      // Check if the record exists but expired
      const expiredRecord = await PasswordReset.findOne({
        email: trimmedEmail,
        verified: false
      }).sort({ createdAt: -1 });

      if (expiredRecord && expiredRecord.expiresAt <= Date.now()) {
        console.warn(`[OTP SECURITY] Verification failed: Expired OTP for ${maskEmail(trimmedEmail)}`);
        return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
      }

      console.warn(`[OTP SECURITY] Verification failed: No active OTP request found for ${maskEmail(trimmedEmail)}`);
      return res.status(400).json({ message: 'Invalid OTP request or expired. Please request a new one.' });
    }

    // Verify OTP using bcrypt.compare
    const isMatch = await bcrypt.compare(otp, resetRecord.otp);
    if (!isMatch) {
      console.warn(`[OTP SECURITY] Verification failed: OTP mismatch for ${maskEmail(trimmedEmail)}`);
      return res.status(400).json({ message: 'Invalid OTP. Please check and try again.' });
    }

    // Clean up all other previous reset records for this email
    await PasswordReset.deleteMany({ email: trimmedEmail, _id: { $ne: resetRecord._id } });

    // Generate a secure transient session token for the password update step
    const plaintextToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(plaintextToken).digest('hex');

    resetRecord.verified = true;
    resetRecord.resetToken = hashedToken;
    resetRecord.expiresAt = new Date(Date.now() + 10 * 60 * 1000); // Token valid for 10 minutes
    await resetRecord.save();

    console.log(`[OTP AUDIT] OTP verified successfully for ${maskEmail(trimmedEmail)}. Session token generated.`);
    res.json({ message: 'OTP verified successfully', resetToken: plaintextToken });
  } catch (error) {
    console.error(`[OTP AUDIT ERROR] Verify OTP server error for ${maskEmail(trimmedEmail)}:`, error.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// ─── POST /api/auth/reset-password-otp ──────────────────────────────────────
router.post('/reset-password-otp', checkMaintenanceAndFeature('disableForgotPassword'), async (req, res) => {
  const { resetToken, password } = req.body;
  if (!resetToken) return res.status(400).json({ message: 'Reset token is required' });
  const settings = await StoreSettings.findOne();
  const policy = settings?.passwordPolicy || 'Medium';
  if (!validatePasswordPolicy(password, policy)) {
    let policyMsg = 'Password does not meet the safety requirements.';
    if (policy === 'Low') policyMsg = 'Password must be at least 6 characters.';
    if (policy === 'Medium') policyMsg = 'Password must be at least 8 characters and contain at least one letter and one number.';
    if (policy === 'High') policyMsg = 'Password must be at least 10 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character.';
    return res.status(400).json({ message: policyMsg });
  }

  try {
    // Hash the token sent by the client to find the matching SHA-256 stored hash
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    const resetRecord = await PasswordReset.findOne({
      resetToken: hashedToken,
      verified: true,
      expiresAt: { $gt: Date.now() }
    });

    if (!resetRecord) {
      console.warn('[OTP SECURITY] Password reset failed: Session expired or invalid reset token.');
      return res.status(400).json({ message: 'Session expired. Please restart the password reset process.' });
    }

    const user = await User.findOne({ email: resetRecord.email });
    if (!user) {
      console.error(`[OTP AUDIT ERROR] User not found during password reset for email: ${resetRecord.email}`);
      return res.status(404).json({ message: 'User not found' });
    }

    // Update password (will be automatically bcrypt-hashed by pre-save hook in User.js)
    user.password = password;
    await user.save();

    // Trigger security notification for password change
    try {
      const io = req.app.get('io');
      await createAndEmitNotification(io, {
        userId: user._id,
        title: 'Password Changed Successfully',
        message: 'Your account password was recently changed. If you did not do this, please contact support immediately.',
        type: 'security',
        role: 'customer',
        actionUrl: '/profile'
      });
    } catch (passNotifErr) {
      console.error('Failed to create password change notification:', passNotifErr);
    }

    const maskEmail = (e) => {
      const [name, domain] = e.split('@');
      if (!name || !domain) return e;
      const maskedName = name.length > 2 ? `${name.substring(0, 2)}***${name.substring(name.length - 2)}` : name;
      return `${maskedName}@${domain}`;
    };
    console.log(`[OTP AUDIT] Password successfully reset for ${maskEmail(resetRecord.email)}`);

    // Immediately delete the verified reset record to prevent replay attacks
    await PasswordReset.deleteOne({ _id: resetRecord._id });
    console.log(`[OTP AUDIT] Deleted OTP session document for ${maskEmail(resetRecord.email)}`);

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('[OTP AUDIT ERROR] Reset password server error:', error.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// ─── POST /api/auth/test-email ────────────────────────────────────────────────
router.post('/test-email', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  const diagnostics = {};
  const logs = [];

  const addLog = (msg) => {
    logs.push(msg);
    console.log(msg);
  };

  addLog(`[OTP] Started diagnostic checks for ${email}`);

  // CHECK 1: Environment Variables
  const envUser = process.env.EMAIL_USER;
  const envPass = process.env.EMAIL_PASS;
  const envExpiry = process.env.OTP_EXPIRY_MINUTES;

  diagnostics.envVariables = {
    EMAIL_USER: envUser ? 'Present' : 'MISSING',
    EMAIL_PASS: envPass ? 'Present' : 'MISSING',
    OTP_EXPIRY_MINUTES: envExpiry ? 'Present' : 'MISSING',
  };

  const missingVars = [];
  if (!envUser) missingVars.push('EMAIL_USER');
  if (!envPass) missingVars.push('EMAIL_PASS');
  if (!envExpiry) missingVars.push('OTP_EXPIRY_MINUTES');

  if (missingVars.length > 0) {
    addLog(`[OTP ERROR] Missing env variables: ${missingVars.join(', ')}`);
    return res.status(400).json({
      success: false,
      message: `Missing environment variable(s): ${missingVars.join(', ')}`,
      diagnostics,
      logs
    });
  }

  // CHECK 2: Email Service & CHECK 3: Gmail Authentication
  let transporter;
  try {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: envUser, pass: envPass },
    });

    await transporter.verify();
    addLog('✅ SMTP Connected');
    diagnostics.smtp = '✅ SMTP Connected';
  } catch (error) {
    addLog(`❌ SMTP Failed`);
    addLog(error.message);
    diagnostics.smtp = '❌ SMTP Failed';
    diagnostics.smtpError = error.message;

    // Detect normal Gmail password usage vs App Password
    if (error.message.includes('535') || error.message.toLowerCase().includes('username and password not accepted')) {
      addLog('[OTP ERROR] Gmail authentication failed. Normal Gmail password or invalid App Password used.');
      diagnostics.authReason = 'Gmail authentication failed.';
    }

    return res.status(500).json({
      success: false,
      message: 'SMTP connection or authentication failed.',
      diagnostics,
      logs
    });
  }

  // CHECK 4: User Email Existence
  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      addLog('[OTP ERROR] No account found with this email.');
      diagnostics.userExists = false;
      return res.status(404).json({
        success: false,
        message: 'No account found with this email.',
        diagnostics,
        logs
      });
    }
    addLog('[OTP] User Found');
    diagnostics.userExists = true;

    // CHECK 5: OTP Generation
    const otpVal = String(crypto.randomInt(1000, 10000));
    const expiryMinutes = parseInt(envExpiry, 10) || 10;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
    addLog(`[OTP] Generated`);
    addLog(`Generated OTP: ${otpVal}`);
    addLog(`Expiry Time: ${expiryMinutes} minutes`);

    diagnostics.otpDetails = {
      otp: otpVal,
      expiryMinutes,
      expiresAt
    };

    // CHECK 6: Database Save
    try {
      const salt = await bcrypt.genSalt(10);
      const hashedOtp = await bcrypt.hash(otpVal, salt);

      await PasswordReset.create({
        email: email.toLowerCase().trim(),
        otp: hashedOtp,
        expiresAt,
        verified: false
      });
      addLog('[OTP] Saved');
      addLog('✅ OTP saved');
      diagnostics.dbSave = '✅ OTP saved';
    } catch (dbError) {
      addLog(`❌ Database save failed: ${dbError.message}`);
      addLog(`[OTP ERROR] Database save failed: ${dbError.message}`);
      diagnostics.dbSave = '❌ Database save failed';
      diagnostics.dbError = dbError.message;
      return res.status(500).json({
        success: false,
        message: 'Failed to save OTP to database.',
        diagnostics,
        logs
      });
    }

    // CHECK 7: Email Delivery
    try {
      addLog('[OTP] Email Sending Started');
      const { subject, text, html } = getOtpEmailContent({ userName: user ? user.name : 'Valued Customer', otpVal });
      const info = await sendEmail({ to: email, subject, text, html });
      addLog('[OTP] Email Sent Successfully');
      addLog(`Recipient Email: ${email}`);
      addLog(`Subject: Test / Password Reset OTP`);
      addLog(`Delivery Result: Success (MessageID: ${info.messageId})`);

      diagnostics.delivery = {
        success: true,
        messageId: info.messageId,
        recipient: email,
      };

      return res.json({
        success: true,
        message: 'Diagnostic check passed. Test email sent successfully.',
        diagnostics,
        logs
      });
    } catch (emailError) {
      addLog(`[OTP ERROR] Email delivery failed: ${emailError.message}`);
      diagnostics.delivery = {
        success: false,
        error: emailError.message
      };
      return res.status(500).json({
        success: false,
        message: 'Email delivery failed.',
        diagnostics,
        logs
      });
    }
  } catch (err) {
    addLog(`[OTP ERROR] Unexpected system error: ${err.message}`);
    return res.status(500).json({
      success: false,
      message: 'Unexpected system error.',
      error: err.message,
      logs
    });
  }
});


// ─── PUT /api/auth/delivery-address ─────────────────────────────────────────
// Save the user's selected delivery address to their profile
router.put('/delivery-address', protect, async (req, res) => {
  try {
    const { lat, lon, fullAddress, city, state, pincode, distanceFromStore, deliveryAvailable } = req.body;

    if (lat === undefined || lon === undefined) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          deliveryAddress: {
            fullAddress:       fullAddress || '',
            lat:               parseFloat(lat),
            lon:               parseFloat(lon),
            pincode:           pincode || '',
            city:              city || '',
            state:             state || '',
            distanceFromStore: distanceFromStore ? parseFloat(distanceFromStore) : null,
            deliveryAvailable: !!deliveryAvailable,
            updatedAt:         new Date(),
          }
        }
      },
      { new: true }
    ).select('-password');

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      message: 'Delivery address saved successfully',
      deliveryAddress: user.deliveryAddress,
    });
  } catch (error) {
    console.error('Save delivery address error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── PUT /api/auth/profile ───────────────────────────────────────────────────
router.put('/profile', protect, async (req, res) => {
  try {
    const { fullName, phoneNumber, email } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (phoneNumber && phoneNumber !== user.phoneNumber) {
      if (!isValidPhone(phoneNumber)) {
        return res.status(400).json({ message: 'Enter a valid 10-digit Indian phone number' });
      }
      const phoneExists = await User.findOne({ phoneNumber: phoneNumber.trim() });
      if (phoneExists) return res.status(409).json({ message: 'Phone number already in use' });
      user.phoneNumber = phoneNumber.trim();
    }

    if (email && email.toLowerCase().trim() !== user.email) {
      if (!isValidEmail(email)) {
        return res.status(400).json({ message: 'Enter a valid email address' });
      }
      const emailExists = await User.findOne({ email: email.toLowerCase().trim() });
      if (emailExists) return res.status(409).json({ message: 'Email already in use' });
      user.email = email.toLowerCase().trim();
    }

    if (fullName) {
      const nameTrimmed = fullName.trim();
      if (nameTrimmed.length < 3 || nameTrimmed.length > 50) {
        return res.status(400).json({ message: 'Full name must be between 3 and 50 characters' });
      }
      user.fullName = nameTrimmed;
    }

    const isPhoneModified = user.isModified('phoneNumber');
    const isEmailModified = user.isModified('email');
    const isNameModified = user.isModified('fullName');

    const updatedUser = await user.save();

    // Trigger profile update notifications
    try {
      const io = req.app.get('io');
      if (isPhoneModified) {
        await createAndEmitNotification(io, {
          userId: user._id,
          title: 'Phone Number Changed',
          message: `Your account phone number was successfully updated to ${updatedUser.phoneNumber}.`,
          type: 'security',
          role: 'customer',
          actionUrl: '/profile'
        });
      }
      if (isEmailModified) {
        await createAndEmitNotification(io, {
          userId: user._id,
          title: 'Email Address Changed',
          message: `Your account email was successfully updated to ${updatedUser.email}.`,
          type: 'security',
          role: 'customer',
          actionUrl: '/profile'
        });
      }
      if (isNameModified) {
        await createAndEmitNotification(io, {
          userId: user._id,
          title: 'Profile Updated',
          message: 'Your profile details were updated successfully.',
          type: 'account',
          role: 'customer',
          actionUrl: '/profile'
        });
      }
    } catch (profileNotifErr) {
      console.error('Failed to create profile update notification:', profileNotifErr);
    }

    sendResponse(res, updatedUser);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── PUT /api/auth/password ──────────────────────────────────────────────────
router.put('/password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Please provide both current and new password' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must contain at least 6 characters.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect current password' });
    }

    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── DELETE /api/auth/account ────────────────────────────────────────────────
router.delete('/account', protect, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user._id);
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── GET /api/auth/addresses ─────────────────────────────────────────────────
router.get('/addresses', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json(user?.addresses || []);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── POST /api/auth/addresses ────────────────────────────────────────────────
router.post('/addresses', protect, async (req, res) => {
  try {
    const { label, fullAddress, street, city, state, pincode, isDefault } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (isDefault) {
      user.addresses.forEach(addr => { addr.isDefault = false; });
    }

    user.addresses.push({ label: label || 'Home', fullAddress, street, city, state, pincode, isDefault: !!isDefault });
    await user.save();
    res.status(201).json(user.addresses);
  } catch (error) {
    console.error('Add address error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── PUT /api/auth/addresses/:id ─────────────────────────────────────────────
router.put('/addresses/:id', protect, async (req, res) => {
  try {
    const { label, fullAddress, street, city, state, pincode, isDefault } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const addr = user.addresses.id(req.params.id);
    if (!addr) return res.status(404).json({ message: 'Address not found' });

    if (isDefault) {
      user.addresses.forEach(a => { a.isDefault = false; });
    }

    if (label !== undefined) addr.label = label;
    if (fullAddress !== undefined) addr.fullAddress = fullAddress;
    if (street !== undefined) addr.street = street;
    if (city !== undefined) addr.city = city;
    if (state !== undefined) addr.state = state;
    if (pincode !== undefined) addr.pincode = pincode;
    if (isDefault !== undefined) addr.isDefault = isDefault;

    await user.save();
    res.json(user.addresses);
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── DELETE /api/auth/addresses/:id ──────────────────────────────────────────
router.delete('/addresses/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.addresses = user.addresses.filter(a => a._id.toString() !== req.params.id);
    await user.save();
    res.json(user.addresses);
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── GET /api/auth/wishlist ──────────────────────────────────────────────────
router.get('/wishlist', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('wishlist');
    res.json(user?.wishlist || []);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── POST /api/auth/wishlist/:productId ──────────────────────────────────────
router.post('/wishlist/:productId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const prodId = req.params.productId;
    if (!user.wishlist.some(id => id.toString() === prodId)) {
      user.wishlist.push(prodId);
      await user.save();
    }
    await user.populate('wishlist');
    res.json(user.wishlist);
  } catch (error) {
    console.error('Add wishlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── DELETE /api/auth/wishlist/:productId ────────────────────────────────────
router.delete('/wishlist/:productId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.wishlist = user.wishlist.filter(id => id.toString() !== req.params.productId);
    await user.save();
    await user.populate('wishlist');
    res.json(user.wishlist);
  } catch (error) {
    console.error('Remove wishlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── GET /api/auth/notifications ────────────────────────────────────
router.get('/notifications', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, isRead } = req.query;
    const filter = { userId: req.user._id, role: 'customer' };
    
    if (type) filter.type = type;
    if (isRead !== undefined) filter.isRead = isRead === 'true';

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({ userId: req.user._id, role: 'customer', isRead: false });

    res.json({
      notifications,
      unreadCount,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Fetch customer notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── PATCH /api/auth/notifications/read/:id ────────────────────────────────────
router.patch('/notifications/read/:id', protect, async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id, role: 'customer' },
      { isRead: true },
      { new: true }
    );
    if (!notif) return res.status(404).json({ message: 'Notification not found' });

    // Emit updated unread count to customer
    const io = req.app.get('io');
    if (io) {
      const roomName = `user:${req.user._id.toString()}`;
      const count = await Notification.countDocuments({ userId: req.user._id, role: 'customer', isRead: false });
      io.to(roomName).emit('customer:notification:unreadCount', { count });
    }

    res.json({ success: true, notification: notif });
  } catch (error) {
    console.error('Mark customer notification read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── PATCH /api/auth/notifications/read-all ────────────────────────────────────
router.patch('/notifications/read-all', protect, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, role: 'customer', isRead: false },
      { isRead: true }
    );

    // Emit updated unread count to customer
    const io = req.app.get('io');
    if (io) {
      const roomName = `user:${req.user._id.toString()}`;
      io.to(roomName).emit('customer:notification:unreadCount', { count: 0 });
    }

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all customer notifications read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

