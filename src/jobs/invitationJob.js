// src/jobs/invitationJob.js
const cron = require('node-cron');
const Invitation = require('../models/Invitation');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');

class InvitationJob {
  constructor() {
    this.scheduleJobs();
  }

  scheduleJobs() {
    // Jalankan setiap jam
    cron.schedule('0 * * * *', async () => {
      await this.processExpiredInvitations();
      await this.sendReminders();
    });

    logger.info('📅 Invitation jobs scheduled');
  }

  // Proses invitation yang expired
  async processExpiredInvitations() {
    try {
      const invitations = await Invitation.findAll({
        expired: true,
        status: ['pending', 'sent']
      });

      for (const invitation of invitations) {
        await invitation.expire();
        logger.info(`Invitation expired: ${invitation.email}`);
      }

      if (invitations.length > 0) {
        logger.info(`Processed ${invitations.length} expired invitations`);
      }
    } catch (error) {
      logger.error('Process expired invitations error:', error);
    }
  }

  // Kirim reminder
  async sendReminders() {
    try {
      // Cari invitation yang akan expired dalam 3 hari
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      const oneDayFromNow = new Date();
      oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);

      const invitations = await Invitation.findAll({
        status: ['pending', 'sent']
      });

      const frontendUrl = process.env.FRONTEND_URL || 'https://your-app.com';

      for (const invitation of invitations) {
        const daysRemaining = invitation.getDaysRemaining();

        // Kirim reminder 3 hari sebelum expired
        if (daysRemaining === 3 && !invitation.reminderSent.includes(3)) {
          await emailService.sendInvitationReminderEmail(invitation, frontendUrl, daysRemaining);
          await invitation.addReminder(3);
          logger.info(`Reminder sent (3 days) to: ${invitation.email}`);
        }

        // Kirim reminder 1 hari sebelum expired
        if (daysRemaining === 1 && !invitation.reminderSent.includes(1)) {
          await emailService.sendInvitationReminderEmail(invitation, frontendUrl, daysRemaining);
          await invitation.addReminder(1);
          logger.info(`Reminder sent (1 day) to: ${invitation.email}`);
        }
      }
    } catch (error) {
      logger.error('Send reminders error:', error);
    }
  }
}

module.exports = new InvitationJob();
