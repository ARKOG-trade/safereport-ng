/**
 * Invitation Transport Layer
 * 
 * Abstract interface for different invitation delivery methods.
 * Supports Email, SMS, QR Code, and future transports without changing business logic.
 */

export interface InvitationTransportConfig {
  method: 'email' | 'sms' | 'qrcode';
  recipient: string; // email, phone number, or identifier for QR code
}

export interface InvitationDeliveryResult {
  success: boolean;
  transportMethod: string;
  deliveryId: string;
  timestamp: Date;
  error?: string;
}

/**
 * Base interface for all invitation transports
 */
export interface IInvitationTransport {
  /**
   * Send an invitation using this transport method
   */
  send(
    invitationId: string,
    recipient: string,
    invitationLink: string,
    organizationName: string,
    roleName: string
  ): Promise<InvitationDeliveryResult>;

  /**
   * Verify that the transport is properly configured
   */
  isConfigured(): boolean;

  /**
   * Get the transport method name
   */
  getMethod(): string;
}

/**
 * Email Transport Implementation
 */
export class EmailInvitationTransport implements IInvitationTransport {
  private configured: boolean;

  constructor() {
    // Check if email service is configured
    this.configured = !!process.env.NEXT_PUBLIC_EMAIL_SERVICE;
  }

  async send(
    invitationId: string,
    recipient: string,
    invitationLink: string,
    organizationName: string, // eslint-disable-line @typescript-eslint/no-unused-vars
    roleName: string // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<InvitationDeliveryResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        transportMethod: 'email',
        deliveryId: '',
        timestamp: new Date(),
        error: 'Email service not configured',
      };
    }

    try {
      // In a real implementation, this would call an email service API
      // For now, we'll simulate the delivery
      console.log(`Sending email invitation to ${recipient}`);
      console.log(`Invitation Link: ${invitationLink}`);

      // TODO: Integrate with email service (SendGrid, Mailgun, etc.)
      // const response = await emailService.send({
      //   to: recipient,
      //   subject: `You're invited to join ${organizationName}`,
      //   template: 'invitation',
      //   data: {
      //     organizationName,
      //     roleName,
      //     invitationLink,
      //   },
      // });

      return {
        success: true,
        transportMethod: 'email',
        deliveryId: `email_${invitationId}_${Date.now()}`,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Error sending email invitation:', error);
      return {
        success: false,
        transportMethod: 'email',
        deliveryId: '',
        timestamp: new Date(),
        error: `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  getMethod(): string {
    return 'email';
  }
}

/**
 * SMS Transport Implementation (Future)
 */
export class SMSInvitationTransport implements IInvitationTransport {
  private configured: boolean;

  constructor() {
    // Check if SMS service is configured
    this.configured = !!process.env.NEXT_PUBLIC_SMS_SERVICE;
  }

  async send(
    invitationId: string,
    recipient: string,
    invitationLink: string, // eslint-disable-line @typescript-eslint/no-unused-vars
    organizationName: string, // eslint-disable-line @typescript-eslint/no-unused-vars
    roleName: string // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<InvitationDeliveryResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        transportMethod: 'sms',
        deliveryId: '',
        timestamp: new Date(),
        error: 'SMS service not configured',
      };
    }

    try {
      // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
      // const response = await smsService.send({
      //   to: recipient,
      //   message: `You're invited to join ${organizationName} as ${roleName}. Accept: ${invitationLink}`,
      // });

      console.log(`Sending SMS invitation to ${recipient}`);

      return {
        success: true,
        transportMethod: 'sms',
        deliveryId: `sms_${invitationId}_${Date.now()}`,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Error sending SMS invitation:', error);
      return {
        success: false,
        transportMethod: 'sms',
        deliveryId: '',
        timestamp: new Date(),
        error: `Failed to send SMS: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  getMethod(): string {
    return 'sms';
  }
}

/**
 * QR Code Transport Implementation (Future)
 */
export class QRCodeInvitationTransport implements IInvitationTransport {
  private configured: boolean;

  constructor() {
    // QR codes are always "configured" as they're generated locally
    this.configured = true;
  }

  async send(
    invitationId: string,
    recipient: string, // eslint-disable-line @typescript-eslint/no-unused-vars
    invitationLink: string, // eslint-disable-line @typescript-eslint/no-unused-vars
    organizationName: string, // eslint-disable-line @typescript-eslint/no-unused-vars
    roleName: string // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<InvitationDeliveryResult> {
    try {
      // TODO: Generate QR code and return it
      // const qrCode = await generateQRCode(invitationLink);

      console.log(`Generated QR code for invitation ${invitationId}`);

      return {
        success: true,
        transportMethod: 'qrcode',
        deliveryId: `qrcode_${invitationId}_${Date.now()}`,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Error generating QR code:', error);
      return {
        success: false,
        transportMethod: 'qrcode',
        deliveryId: '',
        timestamp: new Date(),
        error: `Failed to generate QR code: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  getMethod(): string {
    return 'qrcode';
  }
}

/**
 * Invitation Transport Factory
 * Creates the appropriate transport based on configuration
 */
export class InvitationTransportFactory {
  private static transports: Map<string, IInvitationTransport> = new Map();

  static {
    // Register available transports
    InvitationTransportFactory.transports.set('email', new EmailInvitationTransport());
    InvitationTransportFactory.transports.set('sms', new SMSInvitationTransport());
    InvitationTransportFactory.transports.set('qrcode', new QRCodeInvitationTransport());
  }

  /**
   * Get a transport instance by method
   */
  static getTransport(method: 'email' | 'sms' | 'qrcode'): IInvitationTransport {
    const transport = InvitationTransportFactory.transports.get(method);
    if (!transport) {
      throw new Error(`Unknown invitation transport: ${method}`);
    }
    return transport;
  }

  /**
   * Get all available and configured transports
   */
  static getAvailableTransports(): IInvitationTransport[] {
    return Array.from(InvitationTransportFactory.transports.values()).filter(t => t.isConfigured());
  }

  /**
   * Register a custom transport
   */
  static registerTransport(method: string, transport: IInvitationTransport): void {
    InvitationTransportFactory.transports.set(method, transport);
  }
}
