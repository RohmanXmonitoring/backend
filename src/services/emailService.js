// src/services/emailService.js
const logger = require('../utils/logger');

// Untuk production, gunakan service email seperti SendGrid, Mailgun, atau AWS SES
// Ini adalah contoh dengan SendGrid

class EmailService {
  constructor() {
    this.initialized = false;
    this.initialize();
  }

  initialize() {
    try {
      // Inisialisasi email service
      // Contoh dengan SendGrid
      /*
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      this.client = sgMail;
      */
      
      // Untuk development, gunakan console.log
      this.initialized = true;
      console.log('📧 Email service initialized (development mode)');
    } catch (error) {
      console.error('❌ Email service initialization error:', error);
      this.initialized = false;
    }
  }

  async sendInvitationEmail(invitation, frontendUrl) {
    try {
      const acceptUrl = `${frontendUrl}/accept-invitation?code=${invitation.inviteCode}`;
      const expireDate = new Date(invitation.expiredAt).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      const emailData = {
        to: invitation.email,
        from: process.env.EMAIL_FROM || 'noreply@yourapp.com',
        subject: `Undangan Bergabung - ${invitation.type.toUpperCase()}`,
        html: this.getInvitationEmailTemplate(invitation, acceptUrl, expireDate)
      };

      // Kirim email
      if (this.initialized) {
        // await this.client.send(emailData);
        console.log('📧 Email sent to:', invitation.email);
      } else {
        // Development mode - log email
        console.log('📧 ===== EMAIL CONTENT =====');
        console.log('To:', invitation.email);
        console.log('Subject:', emailData.subject);
        console.log('Accept URL:', acceptUrl);
        console.log('============================');
      }

      return true;
    } catch (error) {
      logger.error('Send invitation email error:', error);
      return false;
    }
  }

  async sendInvitationReminderEmail(invitation, frontendUrl, daysRemaining) {
    try {
      const acceptUrl = `${frontendUrl}/accept-invitation?code=${invitation.inviteCode}`;
      const expireDate = new Date(invitation.expiredAt).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      const emailData = {
        to: invitation.email,
        from: process.env.EMAIL_FROM || 'noreply@yourapp.com',
        subject: `Pengingat Undangan - Tersisa ${daysRemaining} hari`,
        html: this.getReminderEmailTemplate(invitation, acceptUrl, expireDate, daysRemaining)
      };

      if (this.initialized) {
        // await this.client.send(emailData);
        console.log('📧 Reminder email sent to:', invitation.email);
      } else {
        console.log('📧 ===== REMINDER EMAIL =====');
        console.log('To:', invitation.email);
        console.log('Days Remaining:', daysRemaining);
        console.log('Accept URL:', acceptUrl);
        console.log('============================');
      }

      return true;
    } catch (error) {
      logger.error('Send reminder email error:', error);
      return false;
    }
  }

  getInvitationEmailTemplate(invitation, acceptUrl, expireDate) {
    const roleNames = {
      user: 'Pengguna',
      reseller: 'Reseller',
      admin: 'Admin'
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background: #f9f9f9;
            border-radius: 10px;
          }
          .header {
            background: #4CAF50;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background: white;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .button {
            display: inline-block;
            padding: 12px 30px;
            background: #4CAF50;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
          }
          .button:hover {
            background: #45a049;
          }
          .info {
            background: #f0f0f0;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
          }
          .footer {
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 12px;
          }
          .code {
            font-size: 24px;
            font-weight: bold;
            color: #4CAF50;
            letter-spacing: 5px;
            text-align: center;
            padding: 10px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Undangan Bergabung</h1>
          </div>
          <div class="content">
            <h2>Halo!</h2>
            <p>
              Anda diundang untuk bergabung sebagai 
              <strong>${roleNames[invitation.type] || 'Pengguna'}</strong> 
              oleh <strong>${invitation.invitedByName}</strong>.
            </p>

            <div class="info">
              <p><strong>📋 Detail Undangan:</strong></p>
              <ul>
                <li><strong>Peran:</strong> ${roleNames[invitation.type] || 'Pengguna'}</li>
                <li><strong>Limit Perangkat:</strong> ${invitation.deviceLimit} perangkat</li>
                <li><strong>Jenis Lisensi:</strong> ${invitation.licenseType}</li>
                <li><strong>Berlaku Hingga:</strong> ${expireDate}</li>
              </ul>
            </div>

            <div class="code">
              Kode Undangan: ${invitation.inviteCode}
            </div>

            <p>Klik tombol di bawah untuk menerima undangan:</p>
            <div style="text-align: center;">
              <a href="${acceptUrl}" class="button">
                Terima Undangan
              </a>
            </div>

            <p style="margin-top: 20px; font-size: 14px;">
              Atau salin link berikut ke browser Anda:
              <br>
              <a href="${acceptUrl}" style="word-break: break-all; font-size: 12px;">
                ${acceptUrl}
              </a>
            </p>

            <div style="background: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; margin-top: 20px;">
              <p style="margin: 0; font-size: 14px;">
                ⚠️ <strong>Penting:</strong> Undangan ini akan kadaluarsa pada 
                <strong>${expireDate}</strong>. Jika Anda tidak menerima undangan ini, 
                abaikan email ini.
              </p>
            </div>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Admin App. All rights reserved.</p>
            <p>Email ini dikirim secara otomatis, harap tidak membalas.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getReminderEmailTemplate(invitation, acceptUrl, expireDate, daysRemaining) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 10px; }
          .header { background: #ff9800; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .warning { background: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Pengingat Undangan</h1>
          </div>
          <div class="content">
            <h2>Halo!</h2>
            <p>
              Kami mengingatkan bahwa undangan Anda untuk bergabung sebagai 
              <strong>${invitation.type}</strong> akan kadaluarsa dalam 
              <strong style="color: #ff5722;">${daysRemaining} hari</strong>.
            </p>

            <div class="warning">
              <p style="margin: 0;">
                ⚠️ Jika Anda tidak menerima undangan ini, undangan akan kadaluarsa pada 
                <strong>${expireDate}</strong>.
              </p>
            </div>

            <div style="text-align: center;">
              <a href="${acceptUrl}" class="button">
                Segera Terima Undangan
              </a>
            </div>

            <p style="margin-top: 20px; font-size: 14px;">
              Kode Undangan: <strong>${invitation.inviteCode}</strong>
            </p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Admin App. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new EmailService();
