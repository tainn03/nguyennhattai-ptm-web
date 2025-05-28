import { OrderTripStatusType } from "@prisma/client";
import * as yup from "yup";

import { DriverInputForm } from "@/forms/driver";
import { UnitOfMeasureInputForm } from "@/forms/unitOfMeasure";
import { VehicleInputForm } from "@/forms/vehicle";
import { OrderGroupInfo, WarehouseInfo } from "@/types/strapi";
import { errorMaxLength, errorRequired } from "@/utils/yup";

/**
 * Trip schedule use for create trip schedule in modal
 */
export type TripSchedule = {
  id: number;
  tripId?: number;
  pickupTimeNotes?: string;
  deliveryTimeNotes?: string;
};

/**
 * Order scheduler use for create order scheduler in modal
 */
export type OrderScheduler = {
  pickupDate: Date;
  deliveryDate: Date;
  driver: DriverInputForm;
  vehicle: VehicleInputForm;
  trips: TripSchedule[];
};

/**
 * Trip schedule input form use for create trip schedule in server action
 */
export type TripScheduleInputForm = {
  tripId?: number;
  orderId: number;
  orderCode: string;
  routeId: number;
  pickupDate: string | Date;
  deliveryDate: string | Date;
  pickupTimeNotes: string | null;
  deliveryTimeNotes: string | null;
  weight: number;
};

/**
 * Order schedule input form use for create order schedule in server action
 */
export type OrderScheduleInputForm = {
  organizationId: number;
  driverId: number;
  vehicleId: number;
  trips: TripScheduleInputForm[];
  driverExpenseRate?: number;
};

/**
 * Order schedule input form use for create order schedule in server action
 */
export type AddScheduleToOrderGroupInputForm = {
  orderGroup: Pick<OrderGroupInfo, "id">;
  currentOrderIds: number[];
  schedule: OrderScheduleInputForm;
};

/**
 * Order schedule input form use for remove order from order group in server action
 */
export type RemoveOrderFromOrderGroupInputForm = {
  removedOrderIds: number[];
  remainingOrderCount: number;
  currentDate: Date | string;
  clientTimezone: string;
};

export type InboundOrderGroupInputForm = {
  organizationId: number;
  organizationName: string;
  sendNotification: boolean;
  clientTimezone: string;
  currentDate: Date | string;
  pickupDate: string | Date;
  deliveryDate: string | Date;
  driver: DriverInputForm;
  vehicle: VehicleInputForm;
  orderGroup: Pick<Partial<OrderGroupInfo>, "id">;
  warehouse: Pick<Partial<WarehouseInfo>, "id" | "address">;
  unitOfMeasure: Pick<UnitOfMeasureInputForm, "id" | "code">;
  weight: number | null;
  cbm: number | null;
};

/**
 * Send order group notification input form use for send order group notification in server action
 */
export type SendOrderGroupNotificationInputForm = {
  orderGroup: Pick<OrderGroupInfo, "id" | "code">;
  currentOrderIds: number[];
  organizationId: number;
  /**
   * Used for push notification
   */
  fullName: string;
  vehicleNumber: string;
  driverId: number | null;
  driverFullName: string;
  weight: number;
  unitOfMeasure: string;
};

/**
 * Send order group status changed notification input form use for send order group status changed notification in server action
 */
export type UpdateOrderGroupStatusInputForm = {
  orderGroupId: number;
  organizationId: number;
  status: OrderTripStatusType;
  longitude?: number | null;
  latitude?: number | null;
  clientTimezone?: string | null;
};

/**
 * Outbound order group input form use for outbound order group in server action
 */
export type OutboundOrderGroupInputForm = {
  clientTimezone: string;
  currentDate: Date | string;
  exportDate: Date | string;
  notes: string | null;
  sendNotification: boolean;
};

/**
 * Order scheduler schema use for create order scheduler in server action
 */
export const orderSchedulerSchema = yup.object<OrderScheduler>().shape({
  pickupDate: yup.date().required(errorRequired("components.order_scheduler_modal.pickup_date")),
  deliveryDate: yup.date().required(errorRequired("components.order_scheduler_modal.delivery_date")),
  driver: yup
    .object()
    .nullable()
    .shape({
      id: yup.number().required(errorRequired("components.order_scheduler_modal.driver")),
    }),
  vehicle: yup
    .object()
    .nullable()
    .shape({
      id: yup.number().required(errorRequired("components.order_scheduler_modal.vehicle")),
    }),
});

/**
 * Order scheduler schema use for create order scheduler in server action
 */
export const inboundOrderGroupSchema = yup.object<InboundOrderGroupInputForm>().shape({
  pickupDate: yup.date().required(errorRequired("components.inbound_modal.pickup_date")),
  deliveryDate: yup.date().required(errorRequired("components.inbound_modal.delivery_date")),
  driver: yup
    .object()
    .nullable()
    .shape({
      id: yup.number().required(errorRequired("components.inbound_modal.driver")),
    }),
  vehicle: yup
    .object()
    .nullable()
    .shape({
      id: yup.number().required(errorRequired("components.inbound_modal.vehicle")),
    }),
  warehouse: yup
    .object()
    .nullable()
    .shape({
      id: yup.number().required(errorRequired("components.inbound_modal.warehouse")),
    }),
});

/**
 * Outbound order group schema use for outbound order group in server action
 */
export const outboundOrderGroupSchema = yup.object<OutboundOrderGroupInputForm>().shape({
  exportDate: yup.date().required(errorRequired("components.outbound_modal.export_date")),
  notes: yup.string().nullable().max(500, errorMaxLength(500)),
});
