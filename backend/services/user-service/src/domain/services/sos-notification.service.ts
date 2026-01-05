/**
 * SOS Notification Service
 * Handles all notifications for SOS alerts - SMS, Email, and Push
 * Critical safety feature for Flamoral dating platform
 */

import { v4 as uuidv4 } from 'uuid';

import { db } from '../../infrastructure/database';
import emailService from '../../infrastructure/email/email.service';
import twilioService from '../../infrastructure/sms/twilio.service';
import logger from '../../utils/logger';
import { SOSAlert, EmergencyContact, SafetyCheckin } from '../entities/SOS.entity';

// ==================== TYPES ====================

export enum SOSNotificationType {
  SOS_ALERT = 'sos_alert',
  SOS_CANCELLED = 'sos_cancelled',
  SOS_RESOLVED = 'sos_resolved',
  CHECKIN_MISSED = 'checkin_missed',
  CHECKIN_REMINDER = 'checkin_reminder',
  SOS_ESCALATED = 'sos_escalated',
}

export enum NotificationChannel {
  SMS = 'sms',
  EMAIL = 'email',
  PUSH = 'push',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  RETRYING = 'retrying',
}

export interface SOSNotificationLog {
  id: string;
  alert_id: string;
  contact_id: string;
  contact_name: string;
  contact_phone?: string;
  contact_email?: string;
  notification_type: SOSNotificationType;
  channel: NotificationChannel;
  status: NotificationStatus;
  external_id?: string; // Twilio message ID, etc.
  error_message?: string;
  retry_count: number;
  sent_at?: Date;
  delivered_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface UserInfo {
  id: string;
  first_name: string;
  last_name?: string;
  phone_number?: string;
  email?: string;
}

export interface NotificationResult {
  channel: NotificationChannel;
  success: boolean;
  externalId?: string;
  error?: string;
}

export interface ContactNotificationResult {
  contactId: string;
  contactName: string;
  results: NotificationResult[];
  allSucceeded: boolean;
  anySucceeded: boolean;
}

// ==================== SOS NOTIFICATION SERVICE ====================

export class SOSNotificationService {
  /**
   * Send SOS alert to all emergency contacts via all available channels
   */
  async sendSOSAlert(
    user: UserInfo,
    alert: SOSAlert,
    contacts: EmergencyContact[]
  ): Promise<ContactNotificationResult[]> {
    logger.info(`Sending SOS alert notifications for user ${user.id}`, {
      alertId: alert.id,
      contactCount: contacts.length,
    });

    const results: ContactNotificationResult[] = [];

    for (const contact of contacts) {
      const contactResult = await this.notifyContact(
        contact,
        user,
        alert,
        SOSNotificationType.SOS_ALERT
      );
      results.push(contactResult);
    }

    // Log summary
    const successCount = results.filter((r) => r.anySucceeded).length;
    logger.info(`SOS alert notifications sent`, {
      alertId: alert.id,
      totalContacts: contacts.length,
      successfullyNotified: successCount,
    });

    return results;
  }

  /**
   * Send SOS cancellation notification to all emergency contacts
   */
  async sendSOSCancelled(
    user: UserInfo,
    alert: SOSAlert,
    contacts: EmergencyContact[]
  ): Promise<ContactNotificationResult[]> {
    logger.info(`Sending SOS cancellation notifications for user ${user.id}`, {
      alertId: alert.id,
    });

    const results: ContactNotificationResult[] = [];

    for (const contact of contacts) {
      const contactResult = await this.notifyContact(
        contact,
        user,
        alert,
        SOSNotificationType.SOS_CANCELLED
      );
      results.push(contactResult);
    }

    return results;
  }

  /**
   * Send missed checkin alert to emergency contacts
   */
  async sendCheckinMissedAlert(
    user: UserInfo,
    checkin: SafetyCheckin,
    contacts: EmergencyContact[]
  ): Promise<ContactNotificationResult[]> {
    logger.info(`Sending missed checkin alert for user ${user.id}`, {
      checkinId: checkin.id,
    });

    // Create a pseudo-alert for the notification
    const pseudoAlert: SOSAlert = {
      id: checkin.id,
      user_id: user.id,
      status: 'active',
      alert_type: 'checkin_missed',
      location: checkin.meeting_details?.location ? undefined : undefined,
      reason: `Missed safety check-in scheduled for ${new Date(checkin.scheduled_at).toLocaleString()}`,
      emergency_contacts_notified: [],
      created_at: new Date(),
      updated_at: new Date(),
    };

    const results: ContactNotificationResult[] = [];

    for (const contact of contacts) {
      if (contact.notify_on_checkin_miss) {
        const contactResult = await this.notifyContact(
          contact,
          user,
          pseudoAlert,
          SOSNotificationType.CHECKIN_MISSED
        );
        results.push(contactResult);
      }
    }

    return results;
  }

  /**
   * Notify support team about escalated SOS alert
   */
  async notifySupportTeam(
    user: UserInfo,
    alert: SOSAlert,
    escalationReason: string
  ): Promise<boolean> {
    const supportEmail = process.env.SUPPORT_TEAM_EMAIL || 'safety@flamoral.com';
    const supportPhone = process.env.SUPPORT_TEAM_PHONE;

    const timestamp = new Date().toISOString();
    const locationStr = alert.location
      ? `https://maps.google.com/?q=${alert.location.latitude},${alert.location.longitude}`
      : 'Location not available';

    try {
      // Send email to support team
      await emailService.sendEmail({
        to: supportEmail,
        subject: `[URGENT] SOS Alert Escalated - User ${user.first_name} ${user.last_name || ''}`,
        html: this.buildSupportEscalationEmail(user, alert, escalationReason, locationStr),
        text: this.buildSupportEscalationText(user, alert, escalationReason, locationStr),
      });

      // Log the escalation
      logger.warn(`SOS ESCALATED TO SUPPORT TEAM`, {
        alertId: alert.id,
        userId: user.id,
        escalationReason,
        timestamp,
      });

      return true;
    } catch (error) {
      logger.error(`Failed to notify support team:`, error);
      return false;
    }
  }

  /**
   * Retry failed notifications
   */
  async retryFailedNotifications(alertId: string): Promise<number> {
    try {
      const failedLogs = await db('sos_notification_logs')
        .where({
          alert_id: alertId,
          status: NotificationStatus.FAILED,
        })
        .where('retry_count', '<', 3);

      let retryCount = 0;

      for (const log of failedLogs) {
        // Mark as retrying
        await db('sos_notification_logs')
          .where({ id: log.id })
          .update({
            status: NotificationStatus.RETRYING,
            retry_count: log.retry_count + 1,
            updated_at: new Date(),
          });

        // Attempt to resend based on channel
        let result: NotificationResult;

        if (log.channel === NotificationChannel.SMS && log.contact_phone) {
          result = await this.sendSMSNotification(
            log.contact_phone,
            log.notification_type,
            {} as any, // We'd need to reconstruct the message
            {} as any
          );
        } else if (log.channel === NotificationChannel.EMAIL && log.contact_email) {
          result = await this.sendEmailNotification(
            log.contact_email,
            log.contact_name,
            log.notification_type,
            {} as any,
            {} as any
          );
        } else {
          continue;
        }

        // Update status
        await db('sos_notification_logs')
          .where({ id: log.id })
          .update({
            status: result.success ? NotificationStatus.SENT : NotificationStatus.FAILED,
            external_id: result.externalId,
            error_message: result.error,
            sent_at: result.success ? new Date() : null,
            updated_at: new Date(),
          });

        if (result.success) {
          retryCount++;
        }
      }

      return retryCount;
    } catch (error) {
      logger.error(`Failed to retry notifications for alert ${alertId}:`, error);
      return 0;
    }
  }

  /**
   * Get notification status for an alert
   */
  async getNotificationStatus(alertId: string): Promise<SOSNotificationLog[]> {
    try {
      return await db('sos_notification_logs')
        .where({ alert_id: alertId })
        .orderBy('created_at', 'desc');
    } catch (error) {
      logger.error(`Failed to get notification status for alert ${alertId}:`, error);
      return [];
    }
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Notify a single contact via all available channels
   */
  private async notifyContact(
    contact: EmergencyContact,
    user: UserInfo,
    alert: SOSAlert,
    notificationType: SOSNotificationType
  ): Promise<ContactNotificationResult> {
    const results: NotificationResult[] = [];

    // Send SMS if phone available
    if (contact.phone) {
      const smsResult = await this.sendSMSNotification(
        contact.phone,
        notificationType,
        user,
        alert
      );
      results.push(smsResult);
      await this.logNotification(alert.id, contact, notificationType, smsResult);
    }

    // Send Email if available
    if (contact.email) {
      const emailResult = await this.sendEmailNotification(
        contact.email,
        contact.name,
        notificationType,
        user,
        alert
      );
      results.push(emailResult);
      await this.logNotification(alert.id, contact, notificationType, emailResult);
    }

    // Send Push notification (if contact has app and user ID)
    // Note: Emergency contacts may not have Flamoral accounts
    // This would be for future integration where contacts can create accounts

    return {
      contactId: contact.id,
      contactName: contact.name,
      results,
      allSucceeded: results.every((r) => r.success),
      anySucceeded: results.some((r) => r.success),
    };
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(
    phoneNumber: string,
    notificationType: SOSNotificationType,
    user: UserInfo,
    alert: SOSAlert
  ): Promise<NotificationResult> {
    try {
      const message = this.buildSMSMessage(notificationType, user, alert);

      // Format phone number
      const formattedPhone = twilioService.formatPhoneNumber(phoneNumber);

      const result = await twilioService.sendSMS(formattedPhone, message);

      return {
        channel: NotificationChannel.SMS,
        success: result.success,
        externalId: result.messageId,
        error: result.error,
      };
    } catch (error: any) {
      logger.error(`SMS notification failed:`, error);
      return {
        channel: NotificationChannel.SMS,
        success: false,
        error: error.message || 'Failed to send SMS',
      };
    }
  }

  /**
   * Send Email notification
   */
  private async sendEmailNotification(
    email: string,
    contactName: string,
    notificationType: SOSNotificationType,
    user: UserInfo,
    alert: SOSAlert
  ): Promise<NotificationResult> {
    try {
      const { subject, html, text } = this.buildEmailContent(
        notificationType,
        contactName,
        user,
        alert
      );

      await emailService.sendEmail({
        to: email,
        subject,
        html,
        text,
      });

      return {
        channel: NotificationChannel.EMAIL,
        success: true,
      };
    } catch (error: any) {
      logger.error(`Email notification failed:`, error);
      return {
        channel: NotificationChannel.EMAIL,
        success: false,
        error: error.message || 'Failed to send email',
      };
    }
  }

  /**
   * Build SMS message content
   */
  private buildSMSMessage(
    notificationType: SOSNotificationType,
    user: UserInfo,
    alert: SOSAlert
  ): string {
    const userName = `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`;
    const timestamp = new Date().toLocaleString();

    let locationStr = '';
    if (alert.location) {
      locationStr = `\nLocation: https://maps.google.com/?q=${alert.location.latitude},${alert.location.longitude}`;
    }

    switch (notificationType) {
      case SOSNotificationType.SOS_ALERT:
        return `EMERGENCY ALERT from Flamoral

${userName} has triggered an SOS alert and needs help!

Time: ${timestamp}${locationStr}
${alert.reason ? `\nReason: ${alert.reason}` : ''}

Please check on them immediately.

This is an automated emergency notification from Flamoral.`;

      case SOSNotificationType.SOS_CANCELLED:
        return `ALERT UPDATE from Flamoral

${userName} has cancelled their SOS alert.

They have indicated they are safe. No action needed.

Time: ${timestamp}`;

      case SOSNotificationType.CHECKIN_MISSED:
        return `SAFETY ALERT from Flamoral

${userName} missed their scheduled safety check-in.

Expected check-in time: ${timestamp}

Please reach out to confirm they are okay.

This is an automated safety notification from Flamoral.`;

      case SOSNotificationType.SOS_ESCALATED:
        return `URGENT: SOS Alert Escalated

${userName}'s SOS alert has been active for an extended period.${locationStr}

Please check on them immediately or contact emergency services if needed.`;

      default:
        return `Flamoral Safety Notification for ${userName}. Time: ${timestamp}`;
    }
  }

  /**
   * Build Email content
   */
  private buildEmailContent(
    notificationType: SOSNotificationType,
    contactName: string,
    user: UserInfo,
    alert: SOSAlert
  ): { subject: string; html: string; text: string } {
    const userName = `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`;
    const timestamp = new Date().toLocaleString();

    let locationHtml = '';
    let locationText = '';
    if (alert.location) {
      const mapUrl = `https://maps.google.com/?q=${alert.location.latitude},${alert.location.longitude}`;
      locationHtml = `
        <tr>
          <td style="padding: 10px 0;">
            <strong>Location:</strong><br>
            <a href="${mapUrl}" style="color: #dc3545;">View on Google Maps</a>
          </td>
        </tr>`;
      locationText = `\nLocation: ${mapUrl}`;
    }

    switch (notificationType) {
      case SOSNotificationType.SOS_ALERT:
        return {
          subject: `EMERGENCY: ${userName} needs help - SOS Alert from Flamoral`,
          html: this.buildEmergencyEmailHtml(
            contactName,
            userName,
            timestamp,
            locationHtml,
            alert.reason
          ),
          text: this.buildEmergencyEmailText(
            contactName,
            userName,
            timestamp,
            locationText,
            alert.reason
          ),
        };

      case SOSNotificationType.SOS_CANCELLED:
        return {
          subject: `Update: ${userName}'s SOS Alert has been cancelled`,
          html: this.buildCancelledEmailHtml(contactName, userName, timestamp),
          text: this.buildCancelledEmailText(contactName, userName, timestamp),
        };

      case SOSNotificationType.CHECKIN_MISSED:
        return {
          subject: `Safety Alert: ${userName} missed their check-in`,
          html: this.buildMissedCheckinEmailHtml(contactName, userName, timestamp, locationHtml),
          text: this.buildMissedCheckinEmailText(contactName, userName, timestamp, locationText),
        };

      default:
        return {
          subject: `Flamoral Safety Notification`,
          html: `<p>Safety notification for ${userName}</p>`,
          text: `Safety notification for ${userName}`,
        };
    }
  }

  private buildEmergencyEmailHtml(
    contactName: string,
    userName: string,
    timestamp: string,
    locationHtml: string,
    reason?: string
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Emergency SOS Alert</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Emergency Header -->
    <tr>
      <td style="background-color: #dc3545; padding: 30px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">EMERGENCY SOS ALERT</h1>
      </td>
    </tr>

    <!-- Content -->
    <tr>
      <td style="padding: 30px;">
        <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
          Dear ${contactName},
        </p>

        <div style="background-color: #fff3cd; border-left: 4px solid #dc3545; padding: 20px; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 18px; color: #856404;">
            <strong>${userName}</strong> has triggered an SOS alert on Flamoral and may need your help.
          </p>
        </div>

        <table style="width: 100%; margin-bottom: 20px;">
          <tr>
            <td style="padding: 10px 0;">
              <strong>Time:</strong> ${timestamp}
            </td>
          </tr>
          ${locationHtml}
          ${
            reason
              ? `
          <tr>
            <td style="padding: 10px 0;">
              <strong>Reason:</strong> ${reason}
            </td>
          </tr>`
              : ''
          }
        </table>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #dc3545;">Please take action:</h3>
          <ol style="margin: 0; padding-left: 20px;">
            <li style="margin-bottom: 10px;">Try to contact ${userName} immediately</li>
            <li style="margin-bottom: 10px;">If you cannot reach them, consider checking their location</li>
            <li style="margin-bottom: 10px;">If you believe they are in danger, contact emergency services (911)</li>
          </ol>
        </div>

        <p style="font-size: 14px; color: #666; margin-top: 30px;">
          This is an automated emergency notification from Flamoral. You are receiving this because you are listed as an emergency contact.
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #ddd;">
        <p style="margin: 0; font-size: 12px; color: #666;">
          &copy; ${new Date().getFullYear()} Flamoral. Safety is our priority.
        </p>
        <p style="margin: 10px 0 0 0; font-size: 11px; color: #999;">
          If you received this in error, please ignore this message.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private buildEmergencyEmailText(
    contactName: string,
    userName: string,
    timestamp: string,
    locationText: string,
    reason?: string
  ): string {
    return `
EMERGENCY SOS ALERT from Flamoral

Dear ${contactName},

${userName} has triggered an SOS alert on Flamoral and may need your help.

Time: ${timestamp}${locationText}${reason ? `\nReason: ${reason}` : ''}

PLEASE TAKE ACTION:
1. Try to contact ${userName} immediately
2. If you cannot reach them, consider checking their location
3. If you believe they are in danger, contact emergency services (911)

This is an automated emergency notification from Flamoral.
You are receiving this because you are listed as an emergency contact.

---
Flamoral - Safety is our priority
`;
  }

  private buildCancelledEmailHtml(
    contactName: string,
    userName: string,
    timestamp: string
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SOS Alert Cancelled</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="background-color: #28a745; padding: 30px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Alert Update: All Clear</h1>
      </td>
    </tr>

    <!-- Content -->
    <tr>
      <td style="padding: 30px;">
        <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
          Dear ${contactName},
        </p>

        <div style="background-color: #d4edda; border-left: 4px solid #28a745; padding: 20px; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 18px; color: #155724;">
            <strong>${userName}</strong> has cancelled their SOS alert and indicated they are safe.
          </p>
        </div>

        <p style="font-size: 16px; color: #333;">
          <strong>Cancelled at:</strong> ${timestamp}
        </p>

        <p style="font-size: 14px; color: #666; margin-top: 30px;">
          No further action is needed. Thank you for being a trusted emergency contact.
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #ddd;">
        <p style="margin: 0; font-size: 12px; color: #666;">
          &copy; ${new Date().getFullYear()} Flamoral. Safety is our priority.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private buildCancelledEmailText(
    contactName: string,
    userName: string,
    timestamp: string
  ): string {
    return `
Alert Update: All Clear

Dear ${contactName},

${userName} has cancelled their SOS alert and indicated they are safe.

Cancelled at: ${timestamp}

No further action is needed. Thank you for being a trusted emergency contact.

---
Flamoral - Safety is our priority
`;
  }

  private buildMissedCheckinEmailHtml(
    contactName: string,
    userName: string,
    timestamp: string,
    locationHtml: string
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Safety Check-in Missed</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="background-color: #ffc107; padding: 30px; text-align: center;">
        <h1 style="color: #333; margin: 0; font-size: 24px;">Safety Check-in Missed</h1>
      </td>
    </tr>

    <!-- Content -->
    <tr>
      <td style="padding: 30px;">
        <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
          Dear ${contactName},
        </p>

        <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 18px; color: #856404;">
            <strong>${userName}</strong> missed their scheduled safety check-in on Flamoral.
          </p>
        </div>

        <table style="width: 100%; margin-bottom: 20px;">
          <tr>
            <td style="padding: 10px 0;">
              <strong>Expected check-in time:</strong> ${timestamp}
            </td>
          </tr>
          ${locationHtml}
        </table>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #856404;">What you can do:</h3>
          <ul style="margin: 0; padding-left: 20px;">
            <li style="margin-bottom: 10px;">Reach out to ${userName} to confirm they are okay</li>
            <li style="margin-bottom: 10px;">This could simply be that they forgot to check in</li>
            <li style="margin-bottom: 10px;">If you have concerns, trust your instincts</li>
          </ul>
        </div>

        <p style="font-size: 14px; color: #666; margin-top: 30px;">
          This is an automated safety notification from Flamoral.
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #ddd;">
        <p style="margin: 0; font-size: 12px; color: #666;">
          &copy; ${new Date().getFullYear()} Flamoral. Safety is our priority.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private buildMissedCheckinEmailText(
    contactName: string,
    userName: string,
    timestamp: string,
    locationText: string
  ): string {
    return `
Safety Check-in Missed

Dear ${contactName},

${userName} missed their scheduled safety check-in on Flamoral.

Expected check-in time: ${timestamp}${locationText}

What you can do:
- Reach out to ${userName} to confirm they are okay
- This could simply be that they forgot to check in
- If you have concerns, trust your instincts

This is an automated safety notification from Flamoral.

---
Flamoral - Safety is our priority
`;
  }

  private buildSupportEscalationEmail(
    user: UserInfo,
    alert: SOSAlert,
    escalationReason: string,
    locationStr: string
  ): string {
    const userName = `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`;
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>SOS Escalation</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #fff; padding: 30px; border-left: 4px solid #dc3545;">
    <h1 style="color: #dc3545; margin-top: 0;">SOS ALERT ESCALATED</h1>

    <h2>User Information</h2>
    <ul>
      <li><strong>Name:</strong> ${userName}</li>
      <li><strong>User ID:</strong> ${user.id}</li>
      <li><strong>Email:</strong> ${user.email || 'N/A'}</li>
      <li><strong>Phone:</strong> ${user.phone_number || 'N/A'}</li>
    </ul>

    <h2>Alert Details</h2>
    <ul>
      <li><strong>Alert ID:</strong> ${alert.id}</li>
      <li><strong>Type:</strong> ${alert.alert_type}</li>
      <li><strong>Created:</strong> ${alert.created_at}</li>
      <li><strong>Location:</strong> ${locationStr}</li>
      <li><strong>Reason:</strong> ${alert.reason || 'Not specified'}</li>
    </ul>

    <h2>Escalation Reason</h2>
    <p style="background-color: #fff3cd; padding: 15px; border-radius: 4px;">
      ${escalationReason}
    </p>

    <h2>Recommended Actions</h2>
    <ol>
      <li>Attempt to contact the user</li>
      <li>Review the alert timeline</li>
      <li>Contact emergency services if necessary</li>
      <li>Document all actions taken</li>
    </ol>
  </div>
</body>
</html>`;
  }

  private buildSupportEscalationText(
    user: UserInfo,
    alert: SOSAlert,
    escalationReason: string,
    locationStr: string
  ): string {
    const userName = `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`;
    return `
SOS ALERT ESCALATED

USER INFORMATION:
- Name: ${userName}
- User ID: ${user.id}
- Email: ${user.email || 'N/A'}
- Phone: ${user.phone_number || 'N/A'}

ALERT DETAILS:
- Alert ID: ${alert.id}
- Type: ${alert.alert_type}
- Created: ${alert.created_at}
- Location: ${locationStr}
- Reason: ${alert.reason || 'Not specified'}

ESCALATION REASON:
${escalationReason}

RECOMMENDED ACTIONS:
1. Attempt to contact the user
2. Review the alert timeline
3. Contact emergency services if necessary
4. Document all actions taken
`;
  }

  /**
   * Log notification attempt to database
   */
  private async logNotification(
    alertId: string,
    contact: EmergencyContact,
    notificationType: SOSNotificationType,
    result: NotificationResult
  ): Promise<void> {
    try {
      await db('sos_notification_logs').insert({
        id: uuidv4(),
        alert_id: alertId,
        contact_id: contact.id,
        contact_name: contact.name,
        contact_phone: result.channel === NotificationChannel.SMS ? contact.phone : null,
        contact_email: result.channel === NotificationChannel.EMAIL ? contact.email : null,
        notification_type: notificationType,
        channel: result.channel,
        status: result.success ? NotificationStatus.SENT : NotificationStatus.FAILED,
        external_id: result.externalId,
        error_message: result.error,
        retry_count: 0,
        sent_at: result.success ? new Date() : null,
        created_at: new Date(),
        updated_at: new Date(),
      });
    } catch (error) {
      logger.error(`Failed to log notification:`, error);
    }
  }
}

export const sosNotificationService = new SOSNotificationService();
