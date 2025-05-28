import { OrderStatusType } from "@prisma/client";

import { SelectItem } from "@/components/molecules/Select/Select";

/**
 * The tabs for an order
 */
export enum OrderTab {
  INFORMATION = "information",
  DISPATCH_VEHICLE = "dispatch-vehicle",
  EXPENSES = "expenses",
}

/**
 * The status types for an order
 */
export const ORDER_STATUS_TYPE: SelectItem[] = [
  {
    label: "order.status.draft",
    value: "isDraft",
  },
  {
    label: "order.status.new",
    value: OrderStatusType.NEW,
  },
  {
    label: "order.status.received",
    value: OrderStatusType.RECEIVED,
  },
  {
    label: "order.status.in_progress",
    value: OrderStatusType.IN_PROGRESS,
  },
  {
    label: "order.status.completed",
    value: OrderStatusType.COMPLETED,
  },
  {
    label: "order.status.canceled",
    value: OrderStatusType.CANCELED,
  },
];

/**
 * The default length for an order group code
 */
export const ORDER_GROUP_CODE_MIN_LENGTH = 10;
