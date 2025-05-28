import { OrderTripStatusType } from "@prisma/client";
import isBefore from "date-fns/isBefore";
import isEqual from "date-fns/isEqual";
import * as yup from "yup";

import { YubObjectSchema } from "@/types";
import { MetaObject } from "@/types/customField";
import { LocaleType } from "@/types/locale";
import { DriverInfo, OrderInfo, OrderTripInfo, OrderTripStatusInfo, VehicleInfo } from "@/types/strapi";
import { errorMax, errorMaxLength, errorMin, errorRequired, errorType, formatErrorMessage } from "@/utils/yup";

export type OrderTripInputForm = MetaObject<OrderTripInfo> & {
  orderTripCount?: number;
  remainingWeight?: number | null;
  fullName?: string;
  driverReportId?: number;
  isUseRouteDriverExpenses?: boolean;
  numberTripDelivery?: number;
  driverExpenseRate?: number;
};

export type UpdateOrderTripInputForm = OrderTripInputForm & {
  lastUpdatedAt?: Date | string;
};

export type UpdateStatusInputForm = Partial<OrderTripInfo> & {
  status?: OrderTripStatusType | null;
  notes?: string | null;
  attachments?: string[];
  driverReportId: number | null;
  orderDate?: Date | string;
  longitude?: number | null;
  latitude?: number | null;
  fullName?: string;
  driverReportName?: string;
  unitOfMeasure?: string;
  orderId?: number;
  orderCode?: string;
  orderGroupId?: number;
  orderGroupCode?: string;
  pushNotification?: boolean;
};

export type SendNotificationItem = {
  id: number;
  code: string;
  weight: number;
  driverFullName: string;
  driverUserId: number;
  vehicleNumber: string;
  phoneNumber?: string;
  pickupDate?: Date | null;
  driverNotificationScheduledAt?: Date | null;
  lastStatusType?: OrderTripStatusType | null;
};

export type SendNotificationType = "immediate" | "scheduled";

export type SendNotificationForm = {
  orderId: number;
  orderCode: string;
  fullName: string;
  trips: SendNotificationItem[];
  unitOfMeasure: string;
  notificationType?: SendNotificationType;
};

export type UpdateBillOfLadingForm = Pick<
  OrderTripInputForm,
  | "id"
  | "organizationId"
  | "code"
  | "billOfLading"
  | "billOfLadingImages"
  | "updatedById"
  | "billOfLadingReceived"
  | "driver"
> & {
  status?: Partial<OrderTripStatusInfo>;
  orderTripStatusOrder?: number;
  order?: Partial<OrderInfo>;
  billOfLadingImageIds?: number[];
  totalTrips?: number;
  remainingWeightCapacity?: number;
  lastUpdatedAt?: Date | string;
  deleteImage?: number[] | null;
  fullName?: string;
  locale?: LocaleType;
  ignoreCheckExclusives?: boolean;
};

export const updateOrderTripInputFormSchema = yup.object<YubObjectSchema<UpdateStatusInputForm>>({
  driverReportId: yup
    .number()
    .typeError(errorType("number"))
    .required(errorRequired("order.trip.edit_status.trip_status")),
  notes: yup.string().trim().nullable().max(255, errorMaxLength(255)),
});

export const orderTripFormSchema = yup.object<YubObjectSchema<OrderTripInputForm>>({
  vehicle: yup.object<YubObjectSchema<VehicleInfo>>({
    id: yup.number().required(errorRequired("order.vehicle_dispatch.vehicle_dispatch_vehicle")),
  }),
  driver: yup.object<YubObjectSchema<DriverInfo>>().shape({
    id: yup.number().required(errorRequired("order.vehicle_dispatch.vehicle_dispatch_driver")),
  }),
  pickupDate: yup
    .date()
    .typeError(errorType("type"))
    .required(errorRequired("order.vehicle_dispatch_modal.pickup_date")),
  deliveryDate: yup
    .date()
    .typeError(errorType("type"))
    .required(errorRequired("order.vehicle_dispatch_modal.delivery_date"))
    .when("pickupDate", (data, schema) => {
      if (data && data[0] !== null) {
        return schema.test(
          "deliveryDate",
          formatErrorMessage("order.vehicle_dispatch_modal.error_invalid_date", {
            date: "order.vehicle_dispatch_modal.pickup_date",
          }),
          (deliveryDate) => {
            return isBefore(data[0], deliveryDate) || isEqual(data[0], deliveryDate);
          }
        );
      }
      return schema;
    }),
  remainingWeight: yup.number().nullable(),
  weight: yup
    .number()
    .required(errorRequired("order.vehicle_dispatch_modal.weight"))
    .typeError(errorType("number"))
    .moreThan(0, errorMin(0))
    .when("remainingWeight", (data, schema) => {
      if (data && data[0] !== null) {
        return schema.test(
          "weight",
          formatErrorMessage("order.vehicle_dispatch_modal.error_invalid_weight"),
          (weight) => {
            return weight ? weight <= data[0] : true;
          }
        );
      }
      return schema;
    })
    .max(999999.99, errorMax(999999.99)),
  numberTripDelivery: yup
    .number()
    .required(errorRequired("order.vehicle_dispatch_modal.number_trip_delivery"))
    .typeError(errorType("number"))
    .moreThan(0, errorMin(0))
    .when(["remainingWeight", "weight"], (data, schema) => {
      if (data && data[0] !== null && data[1] !== null) {
        let maxNumberTripDelivery = Math.ceil(data[0] / data[1]);
        // Set max number trip delivery is 999. For issue: in trip number is 1000 then trip code too long for the column's type.
        maxNumberTripDelivery = maxNumberTripDelivery > 999 ? 999 : maxNumberTripDelivery;
        return schema.test(
          "numberTripDelivery",
          formatErrorMessage("order.vehicle_dispatch_modal.error_invalid_number_trip_delivery", {
            maxNumberTripDelivery,
          }),
          (numberTripDelivery) => {
            return numberTripDelivery ? numberTripDelivery <= maxNumberTripDelivery : true;
          }
        );
      }
      return schema;
    })
    .max(999999.99, errorMax(999999.99)),
  driverCost: yup
    .number()
    .nullable()
    .typeError(errorType("number"))
    .min(0, errorMin(0))
    .max(99999999.99, errorMax(99999999.99)),
  subcontractorCost: yup
    .number()
    .nullable()
    .typeError(errorType("number"))
    .min(0, errorMin(0))
    .max(99999999.99, errorMax(99999999.99)),
  bridgeToll: yup
    .number()
    .nullable()
    .typeError(errorType("number"))
    .min(0, errorMin(0))
    .max(99999999.99, errorMax(99999999.99)),
  otherCost: yup
    .number()
    .nullable()
    .typeError(errorType("number"))
    .min(0, errorMin(0))
    .max(99999999.99, errorMax(99999999.99)),
  notes: yup.string().trim().nullable().max(255, errorMaxLength(255)),
});

export const updateBillOfLadingFormSchema = yup.object<YubObjectSchema<UpdateStatusInputForm>>({
  billOfLading: yup
    .string()
    .required(errorRequired("order.trip.update_bill_of_lading_modal.bill_of_lading_number"))
    .max(20, errorMaxLength(20)),
  status: yup.object<YubObjectSchema<OrderTripStatusInfo>>({
    notes: yup.string().trim().nullable().max(255, errorMaxLength(255)),
  }),
});
