import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { sendEmail } from './emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const generateVerificationOtp = () => {
  return String(crypto.randomInt(100000, 1000000));
};

export const sendVerificationEmail = async ({ to, userName, otpVal }) => {
  const templatePath = path.join(__dirname, 'registrationVerificationEmail.html');
  let htmlContent = fs.readFileSync(templatePath, 'utf8');
  
  const name = userName || 'Valued Customer';
  htmlContent = htmlContent.replace(/{{NAME}}/g, name).replace(/{{OTP}}/g, otpVal);
  
  const textContent = `Hello ${name},\n\nWelcome to Tiruchendur Murugan Pazhamudhir Solai. Use the verification code below to activate your account:\n\n${otpVal}\n\nThis code is valid for 10 minutes.\n\nIf you didn't request this account, please ignore this email.`;

  return await sendEmail({
    to,
    subject: 'Verify Your Email | Tiruchendur Murugan Pazhamudhir Solai',
    text: textContent,
    html: htmlContent
  });
};
