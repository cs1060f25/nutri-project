const nodemailer = require('nodemailer');

/**
 * Create a reusable transporter for sending emails
 * Uses SMTP configuration from environment variables
 */
const createTransporter = () => {
  // For development, you can use Gmail or other SMTP services
  // For production, use a service like SendGrid, AWS SES, etc.
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  return transporter;
};

/**
 * Send password reset email
 * @param {string} to - Recipient email address
 * @param {string} resetToken - Password reset token
 * @param {string} frontendUrl - Frontend URL for the reset link
 */
const sendPasswordResetEmail = async (to, resetToken, frontendUrl) => {
  try {
    // If SMTP is not configured, log the email instead of sending
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      const resetLink = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(to)}`;
      console.log('\n📧 Email not configured. Password reset link:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(resetLink);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return { success: true, sent: false };
    }

    const transporter = createTransporter();

    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(to)}`;

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: to,
      subject: 'Reset Your Password - Harvard Eats',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background: #ffffff;
              border-radius: 8px;
              padding: 30px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #1a5f3f;
              margin-bottom: 10px;
            }
            .button {
              display: inline-block;
              padding: 14px 28px;
              background-color: #1a5f3f;
              color: #ffffff;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 20px 0;
            }
            .button:hover {
              background-color: #2d6a4f;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
              font-size: 12px;
              color: #718096;
              text-align: center;
            }
            .link {
              color: #1a5f3f;
              word-break: break-all;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">Harvard Eats</div>
            </div>
            <h2>Reset Your Password</h2>
            <p>You requested to reset your password for your Harvard Eats account.</p>
            <p>Click the button below to reset your password. This link will expire in 15 minutes.</p>
            <div style="text-align: center;">
              <a href="${resetLink}" class="button" style="color: #ffffff !important; text-decoration: none;">Reset Password</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p><a href="${resetLink}" class="link">${resetLink}</a></p>
            <p>If you didn't request a password reset, you can safely ignore this email.</p>
            <div class="footer">
              <p>This email was sent by Harvard Eats</p>
              <p>If you have any questions, please contact support.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Reset Your Password - Harvard Eats
        
        You requested to reset your password for your Harvard Eats account.
        
        Click the link below to reset your password (expires in 15 minutes):
        ${resetLink}
        
        If you didn't request a password reset, you can safely ignore this email.
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent:', info.messageId);
    return { success: true, sent: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    // Don't throw - we don't want email failures to break the password reset flow
    // In production, you might want to queue emails for retry
    return { success: false, sent: false, error: error.message };
  }
};

module.exports = {
  sendPasswordResetEmail,
};

