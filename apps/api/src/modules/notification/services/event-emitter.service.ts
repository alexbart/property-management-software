import { EventEmitter } from "events";

export type PaymentReceivedEvent = {
  type: "PaymentReceivedEvent";
  leaseId: string;
  propertyId: string;
  amount: string;
  method: string;
  reference: string;
  receivedAt: Date;
};

export type PaymentOverdueEvent = {
  type: "PaymentOverdueEvent";
  leaseId: string;
  propertyId: string;
  tenantId: string;
  amount: string;
  daysOverdue: number;
};

export type MaintenanceCreatedEvent = {
  type: "MaintenanceCreatedEvent";
  ticketId: string;
  propertyId: string;
  unitId: string;
  title: string;
  priority: string;
  initiatedBy: string;
  initiatorId: string;
};

export type MaintenanceUpdatedEvent = {
  type: "MaintenanceUpdatedEvent";
  ticketId: string;
  propertyId: string;
  oldStatus: string;
  newStatus: string;
  resolutionNotes?: string;
};

export type LeaseExpiringSoonEvent = {
  type: "LeaseExpiringSoonEvent";
  leaseId: string;
  propertyId: string;
  tenantId: string;
  daysUntilExpiry: number;
};

export type NoticeReceivedEvent = {
  type: "NoticeReceivedEvent";
  noticeId: string;
  leaseId: string;
  propertyId: string;
  tenantId: string;
  intendedMoveOutDate: Date;
};

export type DomainEvent =
  | PaymentReceivedEvent
  | PaymentOverdueEvent
  | MaintenanceCreatedEvent
  | MaintenanceUpdatedEvent
  | LeaseExpiringSoonEvent
  | NoticeReceivedEvent;

type EventHandler = (event: DomainEvent) => void | Promise<void>;

class NotificationEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
  }

  emitEvent<T extends DomainEvent>(event: T): boolean {
    return super.emit(event.type, event);
  }

  on<T extends DomainEvent>(
    eventType: T["type"],
    handler: (event: T) => void | Promise<void>
  ): this {
    return super.on(eventType, handler as EventHandler);
  }

  once<T extends DomainEvent>(
    eventType: T["type"],
    handler: (event: T) => void | Promise<void>
  ): this {
    return super.once(eventType, handler as EventHandler);
  }
}

export const eventEmitter = new NotificationEventEmitter();