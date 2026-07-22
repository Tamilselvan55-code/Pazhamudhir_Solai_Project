import axios from 'axios';

/**
 * Brevo Transactional Email API Service (HTTPS)
 * Bypasses Render port blocking by using standard HTTP port 443
 */
export const sendEmail = async ({ to, subject, text, html }) => {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    const err = new Error('Brevo API key is not configured (BREVO_API_KEY missing).');
    err.code = 'MISSING_CREDENTIALS';
    throw err;
  }

  const senderEmail = process.env.EMAIL_USER || 'thiruchendurmurugan192@gmail.com';
  const senderName = 'Tiruchendur Murugan Pazhamudhir Solai';

  const payload = {
    sender: { name: senderName, email: senderEmail },
    to: [{ email: to }],
    subject: subject,
    htmlContent: html,
    textContent: text,
  };

  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`[EMAIL] Sending via Brevo API (Attempt ${attempt}/3) to ${to}`);
      const response = await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 10000 // 10 seconds timeout
      });
      console.log(`[EMAIL] Sent successfully via Brevo API. MessageId: ${response.data.messageId}`);
      return response.data;
    } catch (error) {
      lastError = error;
      const statusCode = error.response?.status;
      console.error(`[EMAIL ERROR] Brevo API Attempt ${attempt} Failed. Status: ${statusCode || 'Network/Timeout'} - ${error.response?.data?.message || error.message}`);
      
      // Don't retry on client errors (400, 401, 403)
      if (statusCode && statusCode >= 400 && statusCode < 500) {
        throw new Error(`Brevo API Error: ${error.response?.data?.message || error.message}`);
      }
      
      if (attempt < 3) {
        // Wait 1 second before retrying (Exponential backoff can be added if needed)
        await new Promise(res => setTimeout(res, 1000 * attempt));
      }
    }
  }

  throw new Error(`Failed to send email after 3 attempts: ${lastError.message}`);
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
