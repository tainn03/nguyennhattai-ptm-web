import {
  NotificationType,
  OrderGroupStatusType,
  OrderStatusType,
  OrderTripStatusType,
  OrganizationRoleType,
} from "@prisma/client";

import { AnyObject } from "@/types";
import {
  CustomerInfo,
  DriverInfo,
  NotificationInfo,
  OrderParticipantInfo,
  RouteInfo,
  UnitOfMeasureInfo,
} from "@/types/strapi";

export type NotificationData =
  | BillOfLadingReceivedNotification
  | TripCompletedNotification
  | NewOrderNotification
  | NewOrderParticipantNotification
  | OrderReceivedNotification
  | OrderInProgressNotification
  | OrderCompletedNotification
  | OrderCanceledNotification
  | TripPendingConfirmationNotification
  | TripConfirmedNotification
  | TripDeliveryStepNotification
  | TripCanceledNotification
  | TripMessageNotification
  | FuelLogNotification
  | OrderDeletedNotification
  | BillOfLadingDriverReminderNotification
  | BillOfLadingAccountantReminderNotification
  | VehicleDocumentDriverReminderNotification
  | VehicleDocumentOperatorReminderNotification
  | TripDriverExpenseChangedNotification
  | DriverExpenseReceivedNotification
  | InProgressOrderGroupNotification;

export type PushNotificationType = {
  entity: Partial<NotificationInfo>;
  data: NotificationData | AnyObject;
  jwt: string;
  orgMemberRoles?: OrganizationRoleType[];
  receivers?: Partial<DriverInfo | OrderParticipantInfo>[];
  isSendToParticipants?: boolean;
  orderConsolidationEnabled?: boolean;
};

export type MobileNotification = Pick<Partial<NotificationInfo>, "id" | "subject" | "message" | "meta" | "type"> & {
  receivers: Partial<DriverInfo | OrderParticipantInfo>[];
};

export type OrderRelated<T> = T & {
  orderCode: string;
  orderGroupCode?: string;
};

export type TripRelated<T> = T &
  OrderRelated<{
    tripCode: string;
    tripId?: number;
  }>;

export type JobsRelated<T> = T & {
  isSystemGenerated: boolean;
};

export type BillOfLadingReceivedNotification = TripRelated<{
  fullName: string;
}>;

export type TripCompletedNotification = TripRelated<{
  tripStatus: OrderTripStatusType;
  billOfLading: string;
  expense?: string;
}>;

export type NewOrderNotification = OrderRelated<{
  customer: Partial<CustomerInfo>;
  route: Partial<RouteInfo>;
  unit: Partial<UnitOfMeasureInfo>;
  weight: number;
}>;

export type NewOrderParticipantNotification = OrderRelated<{
  fullName: string;
}>;

export type OrderReceivedNotification = OrderRelated<{
  fullName: string;
  orderStatus: OrderStatusType;
}>;

export type OrderInProgressNotification = OrderRelated<{
  fullName: string;
  orderStatus: OrderStatusType;
}>;

export type OrderCompletedNotification = OrderRelated<{
  orderStatus: OrderStatusType;
}>;

export type OrderCanceledNotification = OrderRelated<{
  fullName: string;
  orderStatus: OrderStatusType;
}>;

export type OrderDeletedNotification = OrderRelated<{
  fullName: string;
}>;

export type TripPendingConfirmationNotification = TripRelated<{
  orderId: number;
  fullName: string;
  driverFullName: string;
  tripStatus: OrderTripStatusType;
  weight: number;
  unitOfMeasure: string;
  vehicleNumber: string;
  driverReportId: number;
}>;

export type TripConfirmedNotification = TripRelated<{
  driverFullName: string;
  tripStatus: OrderTripStatusType;
  driverReportId: number;
}>;

export type TripWarehouseGoingToPickupNotification = TripRelated<{
  driverFullName: string;
  tripStatus: OrderTripStatusType;
  driverReportId: number;
  pickupPoint: string;
}>;

export type TripDeliveryStepNotification = TripRelated<{
  driverFullName: string;
  vehicleNumber: string;
  driverReportName: string;
  driverReportId: number;
  tripStatus?: OrderTripStatusType;
}>;

export type TripCanceledNotification = TripRelated<{
  fullName: string;
  tripStatus: OrderTripStatusType;
}>;

export type TripMessageNotification = TripRelated<{
  fullName: string;
  driverUserId: number;
  numOfAttachment?: number;
  message?: string;
  orderGroupCode?: string | null;
}>;

export type InProgressOrderGroupNotification = {
  groupCode: string;
  orderGroupStatus: OrderGroupStatusType;
  fullName: string;
  vehicleNumber: string;
  driverFullName: string;
  weight: number;
  unitOfMeasure: string;
};

export type MobileNotificationData = {
  [key: string]: string;
};

export type MarkAsReadNotification = {
  notificationRecipientId?: number;
};

export type BrowserNotification = {
  title: string;
  body: string;
  onClick?: () => void;
};

export type FuelLogNotification = {
  vehicleNumber: string;
  driverFullName: string;
  liters: string;
  fuelName: string;
  odometerReading: string;
  gasStationName: string;
};

export type BillOfLadingReminderNotification = TripRelated<{
  driverName: string;
}>;

export type BillOfLadingDriverReminderNotification = BillOfLadingReminderNotification & {
  billOfLadingSubmitDate: string;
  isSystemGenerated: boolean;
};

export type BillOfLadingAccountantReminderNotification = JobsRelated<{
  orderTrips: BillOfLadingReminderNotification[];
  billOfLadingSubmitDate: string;
}>;

export type VehicleDocumentDriverReminderNotification = JobsRelated<{
  vehicleNumber: string;
  technicalSafetyExpirationDate?: string | null;
  liabilityInsuranceExpirationDate?: string | null;
}>;

export type VehicleDocumentDriverReminder = {
  vehicleId: number;
  vehicleNumber: string;
  driverName: string;
};

export type VehicleDocumentOperatorReminderNotification = JobsRelated<{
  vehicles: VehicleDocumentDriverReminder[];
  technicalSafetyExpirationDate?: string | null;
  liabilityInsuranceExpirationDate?: string | null;
  expirationDate?: string | null;
}>;

export type TripDriverExpenseChangedNotification = Omit<
  TripRelated<{
    oldExpense: string;
    newExpense: string;
  }>,
  "orderCode"
>;

export type DriverExpenseReceivedNotification = Omit<
  TripRelated<{
    expense: string;
  }>,
  "orderCode"
>;

export type NatsWebsocketConnectionInfo = {
  server: string;
  token: string;
};

export type NatsWebsocketType = NotificationType | "TEST_CONNECTION" | "UNKNOWN";

export type NatsWebsocketMessage = Omit<Partial<NotificationInfo>, "type"> & {
  type: NatsWebsocketType;
};

export type NotificationCallback = {
  onExisted?: () => void;
  onOk?: () => void;
};
