import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prismaClient.js';
import { formatMongoCompat } from '../utils/formatMongoCompat.js';
import { protect } from '../middleware/auth.js';
import { createAndEmitNotification } from '../utils/notificationHelper.js';
import { sendEmail, getOtpEmailContent, sendRegistrationOTP, getGmailTransporter } from '../utils/emailService.js';
import { checkMaintenanceAndFeature } from '../middleware/maintenanceAndFeature.js';
import { validatePasswordPolicy, handleFailedLogin, resetFailedLogin } from '../utils/securityHelper.js';

const router = express.Router();

// ─── Registration Email Verification Routes ──────────────────────────────────
router.post('/send-verification-otp', checkMaintenanceAndFeature('disableRegistration'), async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email address is required.' });
  try {
    const pendingUserRaw = await prisma.pendingUser.findFirst({ where: { email: email.toLowerCase().trim() } });
    if (!pendingUserRaw) return res.status(404).json({ message: 'No registration session found for this email.' });
    const pendingUser = formatMongoCompat(pendingUserRaw);

    const otpVal = String(crypto.randomInt(100000, 1000000));
    console.log('OTP generated');
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    console.log('Sending OTP...');
    const mailOptions = {
      from: `"Tiruchendur Murugan Pazhamudhir Solai" <${process.env.EMAIL_USER}>`,
      to: pendingUser.email,
      subject: 'Verify Your Email - Tiruchendur Murugan Pazhamudhir Solai',
      text: `Welcome to Tiruchendur Murugan Pazhamudhir Solai.\n\nUse the verification code below to activate your account.\n\n${otpVal}\n\nThis code expires in 10 minutes.\n\nIf you didn't register, ignore this email.\n\nRegards,\nTiruchendur Murugan Pazhamudhir Solai`,
      html: getVerificationHtmlTemplate(pendingUser.fullName, otpVal)
    };

    const transporter = getGmailTransporter();
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully');

    await prisma.pendingUser.update({
      where: { id: pendingUser.id },
      data: {
        emailVerificationOTP: otpVal,
        emailVerificationOTPExpiry: otpExpires
      }
    });
    console.log('OTP stored');

    res.json({ success: true, message: 'Verification OTP sent successfully to your email.' });
  } catch (error) {
    console.error('Send verification OTP error:', error.message);
    res.status(500).json({ message: 'Failed to send verification email. Please try again.' });
  }
});

router.post('/verify-registration-otp', checkMaintenanceAndFeature('disableRegistration'), async (req, res) => {
  console.log("========== VERIFY REGISTRATION OTP REQUEST ==========");
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ success: false, message: 'Email and OTP are required' });
  }

  try {
    const pendingUserRaw = await prisma.pendingUser.findFirst({ where: { email: email.toLowerCase().trim() } });
    if (!pendingUserRaw) {
      return res.status(400).json({ success: false, message: 'No verification session found. Please register again.' });
    }
    const pendingUser = formatMongoCompat(pendingUserRaw);

    // Check OTP matches
    if (pendingUser.emailVerificationOTP !== String(otp).trim()) {
      return res.status(400).json({ success: false, message: 'Invalid Verification Code' });
    }

    // Check OTP not expired
    if (new Date(pendingUser.emailVerificationOTPExpiry) < new Date()) {
      return res.status(400).json({ success: false, message: 'Verification code expired. Please resend.' });
    }

    console.log("Creating user account in transaction...");
    // Create user account & delete pendingUser inside atomic transaction with rollback
    const [userRaw] = await prisma.$transaction([
      prisma.user.create({
        data: {
          fullName: pendingUser.fullName,
          phoneNumber: pendingUser.phoneNumber,
          email: pendingUser.email,
          password: pendingUser.password, // pre-hashed
          emailVerified: true,
          isVerified: true,
          isEmailVerified: true
        }
      }),
      prisma.pendingUser.delete({ where: { id: pendingUser.id } })
    ]);
    const user = formatMongoCompat(userRaw);

    // Initialize notification settings and trigger welcome notification
    try {
      await prisma.notificationSettings.create({ data: { userId: user.id } });
      const io = req.app.get('io');
      await createAndEmitNotification(io, {
        userId: user.id,
        title: 'Welcome to Tiruchendur Murugan Pazhamudhir Solai!',
        message: 'Thank you for registering. You can now browse products and place orders!',
        type: 'account',
        role: 'customer',
        actionUrl: '/'
      });
    } catch (nsErr) {
      console.error('Failed to initialize user notifications/settings:', nsErr);
    }

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

    return res.status(200).json({
      success: true,
      message: 'Registration Successful. Your account has been verified. Please login.'
    });

  } catch (error) {
    console.error("=================== VERIFY OTP FATAL ERROR ===================");
    console.error("File: authRoutes.js");
    console.error("Function: verify-registration-otp");
    console.error("Line number: ~139");
    console.error("Original Error:", error.message);
    console.error("Code:", error.code);
    console.error("Meta:", error.meta);
    console.error("Stack Trace:", error.stack);
    console.error("==============================================================");

    return res.status(500).json({
      success: false,
      message: error.message || 'Something went wrong during verification. Please try again.',
      code: error.code || 'INTERNAL_ERROR'
    });
  }
});

router.post('/resend-verification-otp', async (req, res) => {
  console.log("========== RESEND VERIFICATION OTP REQUEST ==========");
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email address is required.' });
  }

  try {
    const pendingUserRaw = await prisma.pendingUser.findFirst({ where: { email: email.toLowerCase().trim() } });
    if (!pendingUserRaw) {
      return res.status(400).json({ success: false, message: 'No registration record found. Please register again.' });
    }
    const pendingUser = formatMongoCompat(pendingUserRaw);

    // Generate new OTP
    const otpVal = String(crypto.randomInt(100000, 1000000));
    console.log('OTP generated:', otpVal);

    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    // Update database first so OTP is ready right away
    await prisma.pendingUser.update({
      where: { id: pendingUser.id },
      data: {
        emailVerificationOTP: otpVal,
        emailVerificationOTPExpiry: otpExpires,
        resendAttempts: { increment: 1 }
      }
    });
    console.log('OTP updated in PendingUser');

    const mailOptions = {
      from: `"Tiruchendur Murugan Pazhamudhir Solai" <${process.env.EMAIL_USER || 'thiruchendurmurugan192@gmail.com'}>`,
      to: pendingUser.email,
      subject: 'Verify Your Email - Tiruchendur Murugan Pazhamudhir Solai',
      text: `Welcome to Tiruchendur Murugan Pazhamudhir Solai.\n\nUse the verification code below to activate your account.\n\n${otpVal}\n\nThis code expires in 10 minutes.\n\nIf you didn't register, ignore this email.\n\nRegards,\nTiruchendur Murugan Pazhamudhir Solai`,
      html: getVerificationHtmlTemplate(pendingUser.fullName, otpVal)
    };

    // Attempt sending email without crashing if SMTP fails
    let emailSent = false;
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS && process.env.EMAIL_USER !== 'your_email@gmail.com') {
      try {
        console.log('Sending OTP email...');
        const transporter = getGmailTransporter();
        await transporter.sendMail(mailOptions);
        emailSent = true;
        console.log('Email sent successfully');
      } catch (emailErr) {
        console.error("=================== RESEND EMAIL EXCEPTION ===================");
        console.error("File: authRoutes.js");
        console.error("Function: resend-verification-otp");
        console.error("Line number: ~175");
        console.error("Original Error:", emailErr.message);
        console.error("Stack Trace:", emailErr.stack);
        console.error("==============================================================");
      }
    } else {
      console.warn("[WARNING] Gmail SMTP credentials not configured. Skipping resend email.");
    }

    if (!emailSent) {
      return res.status(202).json({
        success: true,
        message: 'Verification OTP generated and stored, but email sending failed.'
      });
    }

    return res.status(200).json({ success: true, message: 'Verification OTP has been resent.' });

  } catch (error) {
    console.error("=================== RESEND OTP FATAL ERROR ===================");
    console.error("File: authRoutes.js");
    console.error("Function: resend-verification-otp");
    console.error("Line number: ~190");
    console.error("Original Error:", error.message);
    console.error("Code:", error.code);
    console.error("Meta:", error.meta);
    console.error("Stack Trace:", error.stack);
    console.error("==============================================================");

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to resend code. Please try again.',
      code: error.code || 'INTERNAL_ERROR'
    });
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

const sendResponse = (res, user, statusCode = 200) => {
  res.status(statusCode).json({
    _id: user._id || user.id,
    id: user.id || user._id,
    name: user.fullName,
    fullName: user.fullName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    isAdmin: user.isAdmin,
    token: generateToken(user._id || user.id),
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
    <div style="background-color: #16a34a; padding: 30px 20px; text-align: center;">
      <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">Tiruchendur Murugan</h1>
      <p style="font-size: 13px; color: #dcfce7; margin: 6px 0 0 0; font-weight: 600;">Pazhamudhir Solai &bull; Fresh Supermarket</p>
    </div>
    <div style="padding: 40px 30px;">
      <p style="font-size: 16px; margin: 0 0 16px 0;">Hello <strong>${name}</strong>,</p>
      <p style="font-size: 15px; color: #475569; margin: 0 0 24px 0; line-height: 1.6;">
        Welcome to <strong>Tiruchendur Murugan Pazhamudhir Solai</strong>. Use the verification code below to activate your account and complete your registration.
      </p>
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
  console.log("STEP 1: Register request received");
  try {
    console.log("STEP 2: Validate body");
    const { fullName, phoneNumber, email, password } = req.body;

    if (!fullName && !phoneNumber && !email && !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ success: false, message: 'Please enter your full name' });
    }
    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required' });
    }
    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required' });
    }

    const nameTrimmed = fullName.trim();
    if (nameTrimmed.length < 3 || nameTrimmed.length > 50 || !/^[a-zA-Z\s]+$/.test(nameTrimmed)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid full name.' });
    }
    if (!isValidPhone(phoneNumber)) {
      return res.status(400).json({ success: false, message: 'Enter a valid 10-digit Indian phone number (starting with 6-9)' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format. Please enter a valid email address' });
    }

    const settingsRaw = await prisma.storeSettings.findFirst();
    const settings = formatMongoCompat(settingsRaw);
    const policy = settings?.passwordPolicy || 'Medium';
    if (!validatePasswordPolicy(password, policy)) {
      let policyMsg = 'Password does not meet the safety requirements.';
      if (policy === 'Low') policyMsg = 'Password must be at least 6 characters.';
      if (policy === 'Medium') policyMsg = 'Password must be at least 8 characters and contain at least one letter and one number.';
      if (policy === 'High') policyMsg = 'Password must be at least 10 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character.';
      return res.status(400).json({ success: false, message: policyMsg });
    }
    if (password.length > 50) {
      return res.status(400).json({ success: false, message: 'Password must be at most 50 characters long.' });
    }

    console.log("STEP 3: Check duplicate email");
    const emailExists = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (emailExists) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    console.log("STEP 4: Check duplicate phone");
    const phoneExists = await prisma.user.findUnique({ where: { phoneNumber: phoneNumber.trim() } });
    if (phoneExists) {
      return res.status(409).json({ success: false, message: 'Phone number already registered.' });
    }

    // Clean up any incomplete registration attempts for this email/phone
    await prisma.pendingUser.deleteMany({
      where: {
        OR: [
          { email: email.toLowerCase().trim() },
          { phoneNumber: phoneNumber.trim() }
        ]
      }
    });

    console.log("STEP 5: Hash password");
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    console.log("STEP 6: Generate OTP");
    const otpVal = String(crypto.randomInt(100000, 1000000));
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    console.log("STEP 7: Create User (PendingUser record)");
    const pendingUser = await prisma.pendingUser.create({
      data: {
        fullName: nameTrimmed,
        phoneNumber: phoneNumber.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        emailVerificationOTP: otpVal,
        emailVerificationOTPExpiry: otpExpires
      }
    });
    console.log("Created PendingUser ID:", pendingUser.id);

    console.log("STEP 8: Create Verification Token & Mail Options");
    const mailOptions = {
      from: `"Tiruchendur Murugan Pazhamudhir Solai" <${process.env.EMAIL_USER || 'thiruchendurmurugan192@gmail.com'}>`,
      to: pendingUser.email,
      subject: 'Verify Your Email - Tiruchendur Murugan Pazhamudhir Solai',
      text: `Welcome to Tiruchendur Murugan Pazhamudhir Solai.\n\nUse the verification code below to activate your account.\n\n${otpVal}\n\nThis code expires in 10 minutes.\n\nIf you didn't register, ignore this email.\n\nRegards,\nTiruchendur Murugan Pazhamudhir Solai`,
      html: getVerificationHtmlTemplate(nameTrimmed, otpVal)
    };

    console.log("STEP 9: Send Email");
    let emailSent = false;
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS && process.env.EMAIL_USER !== 'your_email@gmail.com' && process.env.EMAIL_PASS !== 'your_app_password') {
      try {
        const transporter = getGmailTransporter();
        await transporter.sendMail(mailOptions);
        emailSent = true;
        console.log("Email sent successfully");
      } catch (emailErr) {
        console.error("=================== EMAIL SENDING EXCEPTION ===================");
        console.error("File: authRoutes.js");
        console.error("Function: register");
        console.error("Line number: ~348");
        console.error("Original Error:", emailErr.message);
        console.error("Stack Trace:", emailErr.stack);
        console.error("===============================================================");
      }
    } else {
      console.warn("[WARNING] Gmail SMTP credentials not configured. Skipping email send.");
    }

    console.log("STEP 10: Return Success");
    if (!emailSent) {
      return res.status(202).json({
        success: true,
        email: pendingUser.email,
        message: 'Account created but verification email could not be sent.',
        redirect: "/verify-email"
      });
    }

    return res.status(200).json({
      success: true,
      email: pendingUser.email,
      message: 'Registration Successful. Please check your email for the verification OTP.',
      redirect: "/verify-email"
    });

  } catch (error) {
    console.error("=================== REGISTRATION FATAL ERROR ===================");
    console.error("File: authRoutes.js");
    console.error("Function: register");
    console.error("Line number: ~370");
    console.error("Original Error:", error.message);
    console.error("Code:", error.code);
    console.error("Meta:", error.meta);
    console.error("Stack Trace:", error.stack);
    console.error("================================================================");

    return res.status(500).json({
      success: false,
      message: error.message || 'Server error occurred during registration.',
      code: error.code || 'INTERNAL_ERROR'
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
    const userRaw = await prisma.user.findUnique({ where: { phoneNumber: phoneNumber.trim() } });
    if (!userRaw) {
      return res.status(401).json({ message: 'No account found with this phone number. Please register first.' });
    }
    let user = formatMongoCompat(userRaw);

    if (user.suspendedUntil && new Date(user.suspendedUntil) > new Date()) {
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

    if (user.lockUntil && new Date(user.lockUntil) > new Date()) {
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

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const settingsRaw = await prisma.storeSettings.findFirst();
      const settings = formatMongoCompat(settingsRaw);
      const maxAttempts = settings?.maxLoginAttempts || 5;

      const newAttempts = (user.loginAttempts || 0) + 1;
      if (newAttempts >= maxAttempts) {
        const lockTime = new Date(Date.now() + 15 * 60 * 1000);
        user = formatMongoCompat(await prisma.user.update({
          where: { id: user.id },
          data: { loginAttempts: newAttempts, lockUntil: lockTime }
        }));

        await prisma.auditLog.create({
          data: {
            adminName: 'System',
            action: 'Customer Account Lockout',
            targetType: 'User',
            targetId: String(user.id),
            targetName: user.fullName,
            oldValue: { attempts: user.loginAttempts },
            newValue: `Locked until ${lockTime.toISOString()}`
          }
        });

        return res.status(403).json({ message: `Incorrect password. Too many failed attempts. Account locked for 15 minutes.` });
      } else {
        user = formatMongoCompat(await prisma.user.update({
          where: { id: user.id },
          data: { loginAttempts: newAttempts }
        }));
        return res.status(401).json({ message: `Incorrect password. Please try again. (${maxAttempts - user.loginAttempts} attempts remaining)` });
      }
    }

    // Success - reset attempts
    user = formatMongoCompat(await prisma.user.update({
      where: { id: user.id },
      data: { loginAttempts: 0, lockUntil: null }
    }));

    await prisma.auditLog.create({
      data: {
        adminName: 'System',
        action: 'Customer Login',
        targetType: 'User',
        targetId: String(user.id),
        targetName: user.fullName
      }
    });

    try {
      const io = req.app.get('io');
      await createAndEmitNotification(io, {
        userId: user.id,
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
    const userRaw = await prisma.user.findUnique({
      where: { id: req.user._id || req.user.id }
    });
    if (!userRaw) return res.status(404).json({ message: 'User not found' });
    const { password, ...userWithoutPassword } = userRaw;
    res.json(formatMongoCompat(userWithoutPassword));
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
  console.log('[OTP] Email received');

  try {
    const user = await prisma.user.findUnique({ where: { email: trimmedEmail } });
    if (!user) {
      console.log('[OTP] User Found: NO');
      return res.status(404).json({ message: 'No account found with this email address' });
    }
    console.log('[OTP] User found');

    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const lastRequest = await prisma.passwordReset.findFirst({
      where: { email: trimmedEmail },
      orderBy: { createdAt: 'desc' }
    });

    if (lastRequest && new Date(lastRequest.createdAt) > oneMinuteAgo) {
      console.warn(`[OTP SECURITY] Rate limited (60s cooldown) for ${trimmedEmail}`);
      return res.status(429).json({ message: 'Please wait 60 seconds before requesting another OTP.' });
    }

    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const requestCount = await prisma.passwordReset.count({
      where: {
        email: trimmedEmail,
        createdAt: { gte: fifteenMinutesAgo }
      }
    });

    if (requestCount >= 5) {
      console.warn(`[OTP SECURITY] Rate limited (max 5 reqs / 15m) for ${trimmedEmail}`);
      return res.status(429).json({ message: 'Too many OTP requests. Maximum 5 requests in 15 minutes.' });
    }

    const otpVal = String(crypto.randomInt(1000, 10000));
    console.log('[OTP] OTP generated');

    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otpVal, salt);

    const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 10;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    let resetRecord;
    try {
      resetRecord = await prisma.passwordReset.create({
        data: {
          email: trimmedEmail,
          otp: hashedOtp,
          expiresAt,
          verified: false
        }
      });
      console.log('[OTP] OTP Saved: SUCCESS');
    } catch (dbError) {
      console.log('[OTP] OTP Saved: FAILED');
      console.error(`[OTP ERROR] ${dbError.message || dbError}`);
      throw dbError;
    }

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || process.env.EMAIL_USER === 'your_email@gmail.com' || process.env.EMAIL_PASS === 'your_app_password') {
      return res.status(400).json({ success: false, message: 'Gmail SMTP credentials are not configured.' });
    }

    console.log('[OTP] Email sending started');

    try {
      const { subject, text, html } = getOtpEmailContent({ userName: user.fullName, otpVal });
      const info = await sendEmail({ to: user.email, subject, text, html });

      console.log('[OTP] Email sent successfully');
      res.json({ success: true, message: 'OTP sent successfully to your email' });
    } catch (emailError) {
      if (resetRecord && resetRecord.id) {
        await prisma.passwordReset.delete({ where: { id: resetRecord.id } });
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
    const resetRecordRaw = await prisma.passwordReset.findFirst({
      where: {
        email: trimmedEmail,
        verified: false,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!resetRecordRaw) {
      const expiredRecord = await prisma.passwordReset.findFirst({
        where: {
          email: trimmedEmail,
          verified: false
        },
        orderBy: { createdAt: 'desc' }
      });

      if (expiredRecord && new Date(expiredRecord.expiresAt) <= new Date()) {
        console.warn(`[OTP SECURITY] Verification failed: Expired OTP for ${maskEmail(trimmedEmail)}`);
        return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
      }

      console.warn(`[OTP SECURITY] Verification failed: No active OTP request found for ${maskEmail(trimmedEmail)}`);
      return res.status(400).json({ message: 'Invalid OTP request or expired. Please request a new one.' });
    }
    const resetRecord = formatMongoCompat(resetRecordRaw);

    const isMatch = await bcrypt.compare(otp, resetRecord.otp);
    if (!isMatch) {
      console.warn(`[OTP SECURITY] Verification failed: OTP mismatch for ${maskEmail(trimmedEmail)}`);
      return res.status(400).json({ message: 'Invalid OTP. Please check and try again.' });
    }

    await prisma.passwordReset.deleteMany({
      where: {
        email: trimmedEmail,
        id: { not: resetRecord.id }
      }
    });

    const plaintextToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(plaintextToken).digest('hex');

    await prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data: {
        verified: true,
        resetToken: hashedToken,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      }
    });

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
  const settingsRaw = await prisma.storeSettings.findFirst();
  const settings = formatMongoCompat(settingsRaw);
  const policy = settings?.passwordPolicy || 'Medium';
  if (!validatePasswordPolicy(password, policy)) {
    let policyMsg = 'Password does not meet the safety requirements.';
    if (policy === 'Low') policyMsg = 'Password must be at least 6 characters.';
    if (policy === 'Medium') policyMsg = 'Password must be at least 8 characters and contain at least one letter and one number.';
    if (policy === 'High') policyMsg = 'Password must be at least 10 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character.';
    return res.status(400).json({ message: policyMsg });
  }

  try {
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    const resetRecordRaw = await prisma.passwordReset.findFirst({
      where: {
        resetToken: hashedToken,
        verified: true,
        expiresAt: { gt: new Date() }
      }
    });

    if (!resetRecordRaw) {
      console.warn('[OTP SECURITY] Password reset failed: Session expired or invalid reset token.');
      return res.status(400).json({ message: 'Session expired. Please restart the password reset process.' });
    }
    const resetRecord = formatMongoCompat(resetRecordRaw);

    const userRaw = await prisma.user.findUnique({ where: { email: resetRecord.email } });
    if (!userRaw) {
      console.error(`[OTP AUDIT ERROR] User not found during password reset for email: ${resetRecord.email}`);
      return res.status(404).json({ message: 'User not found' });
    }
    const user = formatMongoCompat(userRaw);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    try {
      const io = req.app.get('io');
      await createAndEmitNotification(io, {
        userId: user.id,
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

    await prisma.passwordReset.delete({ where: { id: resetRecord.id } });
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

  try {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
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

    try {
      const salt = await bcrypt.genSalt(10);
      const hashedOtp = await bcrypt.hash(otpVal, salt);

      await prisma.passwordReset.create({
        data: {
          email: email.toLowerCase().trim(),
          otp: hashedOtp,
          expiresAt,
          verified: false
        }
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

    try {
      addLog('[OTP] Email Sending Started');
      const { subject, text, html } = getOtpEmailContent({ userName: user ? user.fullName : 'Valued Customer', otpVal });
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
router.put('/delivery-address', protect, async (req, res) => {
  try {
    const { lat, lon, fullAddress, city, state, pincode, distanceFromStore, deliveryAvailable } = req.body;

    if (lat === undefined || lon === undefined) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const userId = req.user._id || req.user.id;
    const userRaw = await prisma.user.update({
      where: { id: userId },
      data: {
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
    });

    const user = formatMongoCompat(userRaw);

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
    const userId = req.user._id || req.user.id;
    const userRaw = await prisma.user.findUnique({ where: { id: userId } });
    if (!userRaw) return res.status(404).json({ message: 'User not found' });

    const dataToUpdate = {};
    let isPhoneModified = false;
    let isEmailModified = false;
    let isNameModified = false;

    if (phoneNumber && phoneNumber !== userRaw.phoneNumber) {
      if (!isValidPhone(phoneNumber)) {
        return res.status(400).json({ message: 'Enter a valid 10-digit Indian phone number' });
      }
      const phoneExists = await prisma.user.findUnique({ where: { phoneNumber: phoneNumber.trim() } });
      if (phoneExists) return res.status(409).json({ message: 'Phone number already in use' });
      dataToUpdate.phoneNumber = phoneNumber.trim();
      isPhoneModified = true;
    }

    if (email && email.toLowerCase().trim() !== userRaw.email) {
      if (!isValidEmail(email)) {
        return res.status(400).json({ message: 'Enter a valid email address' });
      }
      const emailExists = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
      if (emailExists) return res.status(409).json({ message: 'Email already in use' });
      dataToUpdate.email = email.toLowerCase().trim();
      isEmailModified = true;
    }

    if (fullName && fullName.trim() !== userRaw.fullName) {
      const nameTrimmed = fullName.trim();
      if (nameTrimmed.length < 3 || nameTrimmed.length > 50) {
        return res.status(400).json({ message: 'Full name must be between 3 and 50 characters' });
      }
      dataToUpdate.fullName = nameTrimmed;
      isNameModified = true;
    }

    const updatedUserRaw = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate
    });
    const updatedUser = formatMongoCompat(updatedUserRaw);

    try {
      const io = req.app.get('io');
      if (isPhoneModified) {
        await createAndEmitNotification(io, {
          userId: updatedUser.id,
          title: 'Phone Number Changed',
          message: `Your account phone number was successfully updated to ${updatedUser.phoneNumber}.`,
          type: 'security',
          role: 'customer',
          actionUrl: '/profile'
        });
      }
      if (isEmailModified) {
        await createAndEmitNotification(io, {
          userId: updatedUser.id,
          title: 'Email Address Changed',
          message: `Your account email was successfully updated to ${updatedUser.email}.`,
          type: 'security',
          role: 'customer',
          actionUrl: '/profile'
        });
      }
      if (isNameModified) {
        await createAndEmitNotification(io, {
          userId: updatedUser.id,
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

    const userId = req.user._id || req.user.id;
    const userRaw = await prisma.user.findUnique({ where: { id: userId } });
    if (!userRaw) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, userRaw.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect current password' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── DELETE /api/auth/account ────────────────────────────────────────────────
router.delete('/account', protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    await prisma.user.delete({ where: { id: userId } });
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── GET /api/auth/addresses ─────────────────────────────────────────────────
router.get('/addresses', protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const addressesRaw = await prisma.userAddress.findMany({ where: { userId } });
    res.json(formatMongoCompat(addressesRaw) || []);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── POST /api/auth/addresses ────────────────────────────────────────────────
router.post('/addresses', protect, async (req, res) => {
  try {
    const { label, fullAddress, street, city, state, pincode, isDefault, lat, lon } = req.body;
    const userId = req.user._id || req.user.id;

    if (isDefault) {
      await prisma.userAddress.updateMany({
        where: { userId },
        data: { isDefault: false }
      });
    }

    await prisma.userAddress.create({
      data: {
        userId,
        label: label || 'Home',
        fullAddress: fullAddress || '',
        street: street || '',
        city: city || '',
        state: state || '',
        pincode: pincode || '',
        lat: lat !== undefined ? parseFloat(lat) : null,
        lon: lon !== undefined ? parseFloat(lon) : null,
        isDefault: !!isDefault
      }
    });

    const addressesRaw = await prisma.userAddress.findMany({ where: { userId } });
    res.status(201).json(formatMongoCompat(addressesRaw));
  } catch (error) {
    console.error('Add address error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── PUT /api/auth/addresses/:id ─────────────────────────────────────────────
router.put('/addresses/:id', protect, async (req, res) => {
  try {
    const { label, fullAddress, street, city, state, pincode, isDefault, lat, lon } = req.body;
    const userId = req.user._id || req.user.id;
    const addressId = req.params.id;

    if (isDefault) {
      await prisma.userAddress.updateMany({
        where: { userId },
        data: { isDefault: false }
      });
    }

    const dataToUpdate = {};
    if (label !== undefined) dataToUpdate.label = label;
    if (fullAddress !== undefined) dataToUpdate.fullAddress = fullAddress;
    if (street !== undefined) dataToUpdate.street = street;
    if (city !== undefined) dataToUpdate.city = city;
    if (state !== undefined) dataToUpdate.state = state;
    if (pincode !== undefined) dataToUpdate.pincode = pincode;
    if (lat !== undefined) dataToUpdate.lat = parseFloat(lat);
    if (lon !== undefined) dataToUpdate.lon = parseFloat(lon);
    if (isDefault !== undefined) dataToUpdate.isDefault = isDefault;

    await prisma.userAddress.update({
      where: { id: addressId },
      data: dataToUpdate
    });

    const addressesRaw = await prisma.userAddress.findMany({ where: { userId } });
    res.json(formatMongoCompat(addressesRaw));
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── DELETE /api/auth/addresses/:id ──────────────────────────────────────────
router.delete('/addresses/:id', protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const addressId = req.params.id;

    await prisma.userAddress.delete({ where: { id: addressId } });
    const addressesRaw = await prisma.userAddress.findMany({ where: { userId } });
    res.json(formatMongoCompat(addressesRaw));
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── GET /api/auth/wishlist ──────────────────────────────────────────────────
router.get('/wishlist', protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const wishlistItems = await prisma.wishlistItem.findMany({
      where: { userId },
      include: { product: true }
    });
    const products = wishlistItems.map(item => item.product).filter(Boolean);
    res.json(formatMongoCompat(products) || []);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── POST /api/auth/wishlist/:productId ──────────────────────────────────────
router.post('/wishlist/:productId', protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const prodId = req.params.productId;

    await prisma.wishlistItem.upsert({
      where: { userId_productId: { userId, productId: prodId } },
      create: { userId, productId: prodId },
      update: {}
    });

    const wishlistItems = await prisma.wishlistItem.findMany({
      where: { userId },
      include: { product: true }
    });
    const products = wishlistItems.map(item => item.product).filter(Boolean);
    res.json(formatMongoCompat(products));
  } catch (error) {
    console.error('Add wishlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── DELETE /api/auth/wishlist/:productId ────────────────────────────────────
router.delete('/wishlist/:productId', protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const prodId = req.params.productId;

    await prisma.wishlistItem.deleteMany({
      where: { userId, productId: prodId }
    });

    const wishlistItems = await prisma.wishlistItem.findMany({
      where: { userId },
      include: { product: true }
    });
    const products = wishlistItems.map(item => item.product).filter(Boolean);
    res.json(formatMongoCompat(products));
  } catch (error) {
    console.error('Remove wishlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── GET /api/auth/notifications ────────────────────────────────────
router.get('/notifications', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, isRead } = req.query;
    const userId = req.user._id || req.user.id;
    const filter = { userId, role: 'customer' };
    
    if (type) filter.type = type;
    if (isRead !== undefined) filter.isRead = isRead === 'true';

    const notificationsRaw = await prisma.notification.findMany({
      where: filter,
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    });

    const total = await prisma.notification.count({ where: filter });
    const unreadCount = await prisma.notification.count({ where: { userId, role: 'customer', isRead: false } });

    res.json({
      notifications: formatMongoCompat(notificationsRaw),
      unreadCount,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Fetch customer notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── PATCH /api/auth/notifications/read/:id ────────────────────────────────────
router.patch('/notifications/read/:id', protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const notifId = req.params.id;

    // Check ownership
    const existing = await prisma.notification.findFirst({
      where: { id: notifId, userId, role: 'customer' }
    });
    if (!existing) return res.status(404).json({ message: 'Notification not found' });

    const notifRaw = await prisma.notification.update({
      where: { id: notifId },
      data: { isRead: true }
    });

    const io = req.app.get('io');
    if (io) {
      const roomName = `user:${userId.toString()}`;
      const count = await prisma.notification.count({ where: { userId, role: 'customer', isRead: false } });
      io.to(roomName).emit('customer:notification:unreadCount', { count });
    }

    res.json({ success: true, notification: formatMongoCompat(notifRaw) });
  } catch (error) {
    console.error('Mark customer notification read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── PATCH /api/auth/notifications/read-all ────────────────────────────────────
router.patch('/notifications/read-all', protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    await prisma.notification.updateMany({
      where: { userId, role: 'customer', isRead: false },
      data: { isRead: true }
    });

    const io = req.app.get('io');
    if (io) {
      const roomName = `user:${userId.toString()}`;
      io.to(roomName).emit('customer:notification:unreadCount', { count: 0 });
    }

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all customer notifications read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
