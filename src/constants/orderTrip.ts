import { OrderTripStatusType } from "@prisma/client";

import { SelectItem } from "@/components/molecules/Select/Select";

/**
 * The default length for an order trip code
 */
export const DEFAULT_ORDER_TRIP_CODE_LENGTH = 10;

export const ORDER_TRIP_STATUS_TYPE: SelectItem[] = [
  {
    label: "report.customers.order_trip_status_type.delivered",

    value: OrderTripStatusType.DELIVERED,
  },
  {
    label: "report.customers.order_trip_status_type.not_delivered",
    value: "UNDELIVERED",
  },
  {
    label: "report.customers.order_trip_status_type.canceled",
    value: OrderTripStatusType.CANCELED,
  },
];
