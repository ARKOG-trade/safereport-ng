/**
 * Notification Channels and Templates
 * 
 * Implements specific delivery mechanisms for Email, SMS, Push, and Webhooks.
 * Includes a template engine for consistent messaging.
 */

import { Notification, NotificationChannel } from '@/lib/communicationPlatform';

/**
 * Notification Template
 */
export interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  channels: NotificationChannel[];
}

const TEMPLATES: Record<string, NotificationTemplate> = {
  'report_assigned': {
    id: 'report_assigned',
    name: 'New Report Assigned',
    subject: 'New Report Assigned: {{caseNumber}}',
    body: 'Hello {{name}}, a new report has been assigned to your unit. Priority: {{priority}}.',
    channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP, NotificationChannel.PUSH]
  },
  'report_resolved': {
    id: 'report_resolved',
    name: 'Report Resolved',
    subject: 'Report Resolved: {{caseNumber}}',
    body: 'Hello, the report you submitted ({{caseNumber}}) has been resolved. Resolution: {{resolution}}.',
    channels: [NotificationChannel.EMAIL, NotificationChannel.SMS]
  }
};

/**
 * Base Channel Interface
 */
interface IChannel {
  send(notification: Notification): Promise<boolean>;
}

/**
 * Email Channel
 */
class EmailChannel implements IChannel {
  async send(notification: Notification): Promise<boolean> {
    console.log(`Sending Email to ${notification.recipientUid}: ${notification.title}`);
    // Integration with SendGrid/Postmark/AWS SES would go here
    return true;
  }
}

/**
 * SMS Channel
 */
class SMSChannel implements IChannel {
  async send(notification: Notification): Promise<boolean> {
    console.log(`Sending SMS to ${notification.recipientUid}: ${notification.message}`);
    // Integration with Twilio/Infobip would go here
    return true;
  }
}

/**
 * Push Notification Channel
 */
class PushChannel implements IChannel {
  async send(notification: Notification): Promise<boolean> {
    console.log(`Sending Push to ${notification.recipientUid}: ${notification.title}`);
    // Integration with FCM/OneSignal would go here
    return true;
  }
}

/**
 * Webhook Channel
 */
class WebhookChannel implements IChannel {
  async send(notification: Notification): Promise<boolean> {
    const url = notification.metadata.webhookUrl as string;
    if (!url) return false;
    
    console.log(`Sending Webhook to ${url}`);
    // Integration with axios/fetch would go here
    return true;
  }
}

/**
 * Notification Dispatcher
 */
export class NotificationDispatcher {
  private channels: Record<NotificationChannel, IChannel> = {
    [NotificationChannel.EMAIL]: new EmailChannel(),
    [NotificationChannel.SMS]: new SMSChannel(),
    [NotificationChannel.PUSH]: new PushChannel(),
    [NotificationChannel.WEBHOOK]: new WebhookChannel(),
    [NotificationChannel.IN_APP]: { send: async () => true } // Handled by Firestore listener
  };

  async dispatch(notification: Notification): Promise<boolean> {
    const channel = this.channels[notification.channel];
    if (!channel) {
      console.error(`No channel found for ${notification.channel}`);
      return false;
    }

    try {
      return await channel.send(notification);
    } catch (error) {
      console.error(`Error dispatching notification via ${notification.channel}:`, error);
      return false;
    }
  }

  /**
   * Render template with data
   */
  renderTemplate(templateId: string, data: Record<string, string>): { subject: string; body: string } {
    const template = TEMPLATES[templateId];
    if (!template) throw new Error(`Template ${templateId} not found`);

    let subject = template.subject;
    let body = template.body;

    Object.entries(data).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(placeholder, value);
      body = body.replace(placeholder, value);
    });

    return { subject, body };
  }
}
