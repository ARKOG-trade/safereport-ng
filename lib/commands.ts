/**
 * Command Layer
 * 
 * Lightweight command pattern implementation for report operations.
 * Commands perform validation before calling the domain layer.
 * Ensures consistent error handling and business rule enforcement.
 */

import { DomainEventPublisher, EventType, createDomainEvent } from '@/lib/domainEvents';
import { assignReport } from '@/lib/assignmentEngine';
import { recordOwnershipTransfer } from '@/lib/caseOwnershipService';

/**
 * Base Command interface
 */
export interface Command<T = void> {
  execute(): Promise<T>;
  validate(): Promise<boolean>;
}

/**
 * Assign Report Command
 */
export class AssignReportCommand implements Command<boolean> {
  constructor(
    private reportId: string,
    private unitId: string,
    private organizationId: string,
    private branchId: string,
    private dispatcherUid: string,
    private priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ) {}

  async validate(): Promise<boolean> {
    // Validate required fields
    if (!this.reportId || !this.unitId || !this.organizationId || !this.dispatcherUid) {
      console.error('AssignReportCommand: Missing required fields');
      return false;
    }

    // Validate priority
    if (!['low', 'medium', 'high', 'critical'].includes(this.priority)) {
      console.error('AssignReportCommand: Invalid priority');
      return false;
    }

    return true;
  }

  async execute(): Promise<boolean> {
    if (!(await this.validate())) {
      throw new Error('AssignReportCommand validation failed');
    }

    return assignReport(
      this.reportId,
      this.unitId,
      this.organizationId,
      this.branchId,
      this.dispatcherUid,
      this.priority
    );
  }
}

/**
 * Resolve Report Command
 */
export class ResolveReportCommand implements Command<boolean> {
  constructor(
    private reportId: string,
    private resolution: string,
    private organizationId: string,
    private branchId: string,
    private unitId: string,
    private dispatcherUid: string
  ) {}

  async validate(): Promise<boolean> {
    // Validate required fields
    if (!this.reportId || !this.resolution || !this.organizationId || !this.dispatcherUid) {
      console.error('ResolveReportCommand: Missing required fields');
      return false;
    }

    // Validate resolution length
    if (this.resolution.length < 10 || this.resolution.length > 1000) {
      console.error('ResolveReportCommand: Resolution must be between 10 and 1000 characters');
      return false;
    }

    return true;
  }

  async execute(): Promise<boolean> {
    if (!(await this.validate())) {
      throw new Error('ResolveReportCommand validation failed');
    }

    // Publish resolution event
    const eventPublisher = DomainEventPublisher.getInstance();
    const event = createDomainEvent(
      EventType.REPORT_RESOLVED,
      this.dispatcherUid,
      this.reportId,
      this.organizationId,
      {
        resolution: this.resolution,
        resolvedBy: this.dispatcherUid,
      },
      this.branchId,
      this.unitId
    );

    await eventPublisher.publish(event);
    return true;
  }
}

/**
 * Escalate Report Command
 */
export class EscalateReportCommand implements Command<boolean> {
  constructor(
    private reportId: string,
    private fromUnitId: string,
    private toUnitId: string,
    private organizationId: string,
    private branchId: string,
    private reason: string,
    private dispatcherUid: string,
    private escalationLevel: number = 1
  ) {}

  async validate(): Promise<boolean> {
    // Validate required fields
    if (!this.reportId || !this.fromUnitId || !this.toUnitId || !this.organizationId || !this.reason || !this.dispatcherUid) {
      console.error('EscalateReportCommand: Missing required fields');
      return false;
    }

    // Validate that units are different
    if (this.fromUnitId === this.toUnitId) {
      console.error('EscalateReportCommand: Cannot escalate to the same unit');
      return false;
    }

    // Validate reason length
    if (this.reason.length < 5 || this.reason.length > 500) {
      console.error('EscalateReportCommand: Reason must be between 5 and 500 characters');
      return false;
    }

    // Validate escalation level
    if (this.escalationLevel < 1 || this.escalationLevel > 10) {
      console.error('EscalateReportCommand: Escalation level must be between 1 and 10');
      return false;
    }

    return true;
  }

  async execute(): Promise<boolean> {
    if (!(await this.validate())) {
      throw new Error('EscalateReportCommand validation failed');
    }

    // Publish escalation event
    const eventPublisher = DomainEventPublisher.getInstance();
    const event = createDomainEvent(
      EventType.REPORT_ESCALATED,
      this.dispatcherUid,
      this.reportId,
      this.organizationId,
      {
        fromUnitId: this.fromUnitId,
        toUnitId: this.toUnitId,
        reason: this.reason,
        escalationLevel: this.escalationLevel,
      },
      this.branchId
    );

    await eventPublisher.publish(event);
    return true;
  }
}

/**
 * Transfer Ownership Command
 */
export class TransferOwnershipCommand implements Command<string | null> {
  constructor(
    private reportId: string,
    private previousOwnerId: string | undefined,
    private previousOwnerName: string | undefined,
    private newOwnerId: string,
    private newOwnerName: string,
    private reason: string,
    private organizationId: string,
    private branchId: string,
    private unitId: string,
    private dispatcherUid: string
  ) {}

  async validate(): Promise<boolean> {
    // Validate required fields
    if (!this.reportId || !this.newOwnerId || !this.newOwnerName || !this.reason || !this.organizationId || !this.dispatcherUid) {
      console.error('TransferOwnershipCommand: Missing required fields');
      return false;
    }

    // Validate that new owner is different from previous owner
    if (this.previousOwnerId && this.previousOwnerId === this.newOwnerId) {
      console.error('TransferOwnershipCommand: New owner cannot be the same as previous owner');
      return false;
    }

    // Validate reason length
    if (this.reason.length < 5 || this.reason.length > 500) {
      console.error('TransferOwnershipCommand: Reason must be between 5 and 500 characters');
      return false;
    }

    return true;
  }

  async execute(): Promise<string | null> {
    if (!(await this.validate())) {
      throw new Error('TransferOwnershipCommand validation failed');
    }

    // Record ownership transfer
    const transferId = await recordOwnershipTransfer(
      this.reportId,
      this.previousOwnerId,
      this.previousOwnerName,
      this.newOwnerId,
      this.newOwnerName,
      this.reason
    );

    if (!transferId) {
      return null;
    }

    // Publish ownership transfer event
    const eventPublisher = DomainEventPublisher.getInstance();
    const event = createDomainEvent(
      EventType.REPORT_REASSIGNED,
      this.dispatcherUid,
      this.reportId,
      this.organizationId,
      {
        fromOwnerId: this.previousOwnerId,
        fromOwnerName: this.previousOwnerName,
        toOwnerId: this.newOwnerId,
        toOwnerName: this.newOwnerName,
        reason: this.reason,
      },
      this.branchId,
      this.unitId
    );

    await eventPublisher.publish(event);
    return transferId;
  }
}

/**
 * Close Report Command
 */
export class CloseReportCommand implements Command<boolean> {
  constructor(
    private reportId: string,
    private closureReason: string,
    private organizationId: string,
    private branchId: string,
    private unitId: string,
    private dispatcherUid: string
  ) {}

  async validate(): Promise<boolean> {
    // Validate required fields
    if (!this.reportId || !this.closureReason || !this.organizationId || !this.dispatcherUid) {
      console.error('CloseReportCommand: Missing required fields');
      return false;
    }

    // Validate closure reason length
    if (this.closureReason.length < 10 || this.closureReason.length > 1000) {
      console.error('CloseReportCommand: Closure reason must be between 10 and 1000 characters');
      return false;
    }

    return true;
  }

  async execute(): Promise<boolean> {
    if (!(await this.validate())) {
      throw new Error('CloseReportCommand validation failed');
    }

    // Publish report closed event
    const eventPublisher = DomainEventPublisher.getInstance();
    const event = createDomainEvent(
      EventType.REPORT_RESOLVED,
      this.dispatcherUid,
      this.reportId,
      this.organizationId,
      {
        resolution: `Closed: ${this.closureReason}`,
        closedBy: this.dispatcherUid,
      },
      this.branchId,
      this.unitId
    );

    await eventPublisher.publish(event);
    return true;
  }
}

/**
 * Command Executor
 * 
 * Executes commands with error handling and logging
 */
export class CommandExecutor {
  async execute<T>(command: Command<T>): Promise<{ success: boolean; result?: T; error?: string }> {
    try {
      const result = await command.execute();
      return { success: true, result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('CommandExecutor error:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }
}
