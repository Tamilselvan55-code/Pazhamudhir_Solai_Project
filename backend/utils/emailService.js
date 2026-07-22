import nodemailer from 'nodemailer';

/**
 * Enterprise Email Service supporting multiple providers
 * Supports: Gmail SMTP, Resend, Brevo, SendGrid
 */
import dns from 'dns';

let gmailTransporter = null;

export const getGmailTransporter = async () => {
  if (!gmailTransporter) {
    console.log("SMTP HOST:", "smtp.gmail.com");
    console.log("SMTP FAMILY:", 4);
    
    gmailTransporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // true for 465, false for other ports
      family: 4, // force IPv4
      lookup: (hostname, options, callback) => {
        // Enforce IPv4 lookup to bypass Render IPv6 routing issues
        dns.lookup(hostname, { family: 4 }, (err, address, family) => {
          console.log("Custom DNS Lookup Resolved:", address, "Family:", family);
          callback(err, address, family);
        });
      },
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }
  return gmailTransporter;
};

export const sendEmail = async ({ to, subject, text, html }) => {
  const provider = (process.env.EMAIL_PROVIDER || 'gmail').toLowerCase();
  const senderEmail = process.env.EMAIL_USER || 'thiruchendurmurugan192@gmail.com';
  const senderName = 'Tiruchendur Murugan Pazhamudhir Solai';

  const fromHeader = `"${senderName}" <${senderEmail}>`;
  const replyToHeader = senderEmail;

  // 1. Gmail SMTP (Default)
  if (provider === 'gmail' || provider === 'smtp') {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || process.env.EMAIL_USER === 'your_email@gmail.com' || process.env.EMAIL_PASS === 'your_app_password') {
      const err = new Error('Gmail SMTP credentials are not configured.');
      err.code = 'MISSING_CREDENTIALS';
      throw err;
    }

    console.log('[OTP] SMTP configuration loaded');

    const transporter = await getGmailTransporter();

    try {
      await transporter.verify();
      console.log('[SMTP] Connection successful');
    } catch (verifyErr) {
      console.error(`[SMTP ERROR] ${verifyErr.message || verifyErr}`);
      throw verifyErr;
    }

    return await transporter.sendMail({
      from: fromHeader,
      replyTo: replyToHeader,
      to,
      subject,
      text,
      html
    });
  }

  // 2. Resend SMTP Bridge / API Migration Support
  if (provider === 'resend') {
    const transporter = nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: { user: 'resend', pass: process.env.RESEND_API_KEY }
    });
    return await transporter.sendMail({
      from: fromHeader,
      replyTo: replyToHeader,
      to,
      subject,
      text,
      html
    });
  }

  // 3. Brevo (formerly Sendinblue) Migration Support
  if (provider === 'brevo') {
    const transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      auth: { user: process.env.BREVO_USER, pass: process.env.BREVO_API_KEY }
    });
    return await transporter.sendMail({
      from: fromHeader,
      replyTo: replyToHeader,
      to,
      subject,
      text,
      html
    });
  }

  // 4. SendGrid Migration Support
  if (provider === 'sendgrid') {
    const transporter = nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: { user: 'apikey', pass: process.env.SENDGRID_API_KEY }
    });
    return await transporter.sendMail({
      from: fromHeader,
      replyTo: replyToHeader,
      to,
      subject,
      text,
      html
    });
  }

  throw new Error(`Unsupported email provider configured: ${provider}`);
};

/**
 * Modern Professional Email Template for Forgot Password OTP
 */
export const getOtpEmailContent = ({ userName, otpVal }) => {
  const name = userName || 'Valued Customer';
  const subject = 'Password Reset OTP | Tiruchendur Murugan Pazhamudhir Solai';

  const text = `Hello ${name},\n\nWe received a request to reset your password.\n\nYour One-Time Password (OTP) is:\n\n${otpVal}\n\nThis OTP is valid for 10 minutes.\n\nIf you did not request this password reset, please ignore this email.\n\nThank you,\nTiruchendur Murugan Pazhamudhir Solai Team\n\n---\n📧 Support: support@tmpazhamudhirsolai.com`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f0fdf4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f0fdf4; padding: 40px 15px;">
    <tr>
      <td align="center">
        <!-- Centered Card -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 20px; box-shadow: 0 10px 25px -5px rgba(22, 163, 74, 0.1), 0 8px 10px -6px rgba(22, 163, 74, 0.1); overflow: hidden; border: 1px solid #dcfce7;">
          
          <!-- Header with Logo and Store Name -->
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 35px 20px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <div style="background-color: #ffffff; width: 64px; height: 64px; border-radius: 50%; line-height: 64px; font-size: 32px; box-shadow: 0 4px 6px rgba(0,0,0,0.15); margin: 0 auto 14px auto; text-align: center;">🥭</div>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">Tiruchendur Murugan Pazhamudhir Solai</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 40px 35px; color: #334155; font-size: 16px; line-height: 1.6;">
              <p style="margin: 0 0 18px 0; font-weight: 600; color: #1e293b; font-size: 17px;">Hello ${name},</p>
              
              <p style="margin: 0 0 24px 0; color: #475569;">We received a request to reset your password.</p>
              
              <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 1px; text-align: center;">Your One-Time Password (OTP) is:</p>
              
              <!-- Large OTP Box -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 24px 0;">
                <tr>
                  <td align="center">
                    <div style="background-color: #f8fafc; border: 2px solid #22c55e; color: #15803d; font-size: 38px; font-weight: 800; letter-spacing: 14px; padding: 22px 30px; border-radius: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(34, 197, 94, 0.08);">
                      ${otpVal}
                    </div>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 24px 0; font-size: 15px; color: #475569; text-align: center;">This OTP is valid for <strong style="color: #15803d;">10 minutes</strong>.</p>
              
              <div style="border-top: 1px solid #f1f5f9; margin: 28px 0;"></div>
              
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #64748b;">If you did not request this password reset, please ignore this email.</p>
              
              <p style="margin: 0 0 4px 0; font-size: 16px; color: #334155;">Thank you,</p>
              <p style="margin: 0; font-size: 16px; font-weight: 700; color: #16a34a;">Tiruchendur Murugan Pazhamudhir Solai Team</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background-color: #f8fafc; padding: 24px 30px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">
              <p style="margin: 0 0 8px 0;">📧 Support: <a href="mailto:support@tmpazhamudhirsolai.com" style="color: #16a34a; text-decoration: none; font-weight: 600;">support@tmpazhamudhirsolai.com</a></p>
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">&copy; ${new Date().getFullYear()} Tiruchendur Murugan Pazhamudhir Solai. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
};

/**
 * Modern Professional Email Template for Registration Verification OTP
 */
export const getRegisterOtpEmailContent = ({ userName, otpVal }) => {
  const name = userName || 'Valued Customer';
  const subject = 'Verify Your Email Address | Tiruchendur Murugan Pazhamudhir Solai';

  const text = `Hello ${name},\n\nThank you for choosing Tiruchendur Murugan Pazhamudhir Solai! To complete your registration, please verify your email address.\n\nYour One-Time Verification OTP is:\n\n${otpVal}\n\nThis OTP is valid for 10 minutes.\n\nThank you,\nTiruchendur Murugan Pazhamudhir Solai Team\n\n---\n📧 Support: support@tmpazhamudhirsolai.com`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f0fdf4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f0fdf4; padding: 40px 15px;">
    <tr>
      <td align="center">
        <!-- Centered Card -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 20px; box-shadow: 0 10px 25px -5px rgba(22, 163, 74, 0.1), 0 8px 10px -6px rgba(22, 163, 74, 0.1); overflow: hidden; border: 1px solid #dcfce7;">
          
          <!-- Header with Logo and Store Name -->
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 35px 20px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <div style="background-color: #ffffff; width: 64px; height: 64px; border-radius: 50%; line-height: 64px; font-size: 32px; box-shadow: 0 4px 6px rgba(0,0,0,0.15); margin: 0 auto 14px auto; text-align: center;">🥭</div>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">Tiruchendur Murugan Pazhamudhir Solai</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 40px 35px; color: #334155; font-size: 16px; line-height: 1.6;">
              <p style="margin: 0 0 18px 0; font-weight: 600; color: #1e293b; font-size: 17px;">Hello ${name},</p>
              
              <p style="margin: 0 0 24px 0; color: #475569;">Thank you for registering. To complete your account creation, please verify your email address.</p>
              
              <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 1px; text-align: center;">Your Verification Code (OTP) is:</p>
              
              <!-- Large OTP Box -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 24px 0;">
                <tr>
                  <td align="center">
                    <div style="background-color: #f8fafc; border: 2px solid #22c55e; color: #15803d; font-size: 38px; font-weight: 800; letter-spacing: 14px; padding: 22px 30px; border-radius: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(34, 197, 94, 0.08);">
                      ${otpVal}
                    </div>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 24px 0; font-size: 15px; color: #475569; text-align: center;">This verification code is valid for <strong style="color: #15803d;">10 minutes</strong>.</p>
              
              <div style="border-top: 1px solid #f1f5f9; margin: 28px 0;"></div>
              
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #64748b;">If you did not initiate this registration request, you can safely ignore this email.</p>
              
              <p style="margin: 0 0 4px 0; font-size: 16px; color: #334155;">Thank you,</p>
              <p style="margin: 0; font-size: 16px; font-weight: 700; color: #16a34a;">Tiruchendur Murugan Pazhamudhir Solai Team</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background-color: #f8fafc; padding: 24px 30px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">
              <p style="margin: 0 0 8px 0;">📧 Support: <a href="mailto:support@tmpazhamudhirsolai.com" style="color: #16a34a; text-decoration: none; font-weight: 600;">support@tmpazhamudhirsolai.com</a></p>
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">&copy; ${new Date().getFullYear()} Tiruchendur Murugan Pazhamudhir Solai. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
};

export const sendRegistrationOTP = async ({ to, userName, otpVal }) => {
  const subject = 'Verify your Email - Tiruchendur Murugan Pazhamudhir Solai';
  
  const text = `Hello ${userName}

Welcome to Tiruchendur Murugan Pazhamudhir Solai.

Your verification code is

${otpVal}

This OTP expires in 10 minutes.

If you did not create this account, ignore this email.

Thank you,
TM Pazhamudhir Solai`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
    <p>Hello ${userName}</p>
    <p>Welcome to Tiruchendur Murugan Pazhamudhir Solai.</p>
    <p>Your verification code is</p>
    <h2 style="font-size: 32px; font-weight: bold; color: #16a34a; letter-spacing: 2px; text-align: center; margin: 20px 0;">${otpVal}</h2>
    <p>This OTP expires in 10 minutes.</p>
    <p style="color: #777; font-size: 13px; margin-top: 30px;">If you did not create this account, ignore this email.</p>
    <p>Thank you,<br>TM Pazhamudhir Solai</p>
  </div>
</body>
</html>`;

  return await sendEmail({ to, subject, text, html });
};
