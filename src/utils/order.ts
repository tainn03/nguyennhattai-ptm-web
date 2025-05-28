import { OrderStatusType, OrderTripStatusType } from "@prisma/client";

import {
  CUSTOMER_CODE_PREFIX_MIN_LENGTH,
  ORDER_CODE_MIN_LENGTH,
  ROUTE_CODE_PREFIX_MIN_LENGTH,
} from "@/constants/organizationSetting";
import { OrderInfo, OrderStatusInfo, OrderTripInfo, OrderTripStatusInfo } from "@/types/strapi";

import { ensureString, joinNonEmptyStrings, randomString, trim } from "./string";

/**
 * Get the general dispatch vehicle information from an order.
 *
 * @param {Partial<OrderInfo>} order - The order object.
 * @returns {{
 *    unitCode: string,
 *    unitType: string | null,
 *    weight: number,
 *    totalTripWeight: number,
 *    remainingWeight: number,
 * }} An object containing general dispatch vehicle information:
 * - `unitCode`: The unit code of the order.
 * - `unitType`: The unit type of the order.
 * - `weight`: The weight of the order.
 * - `totalTripWeight`: The total weight of the order.
 * - `remainingWeight`: The remaining weight of the order.
 */
export const getGeneralDispatchVehicleInfo = (order?: Partial<OrderInfo>) => {
  const unitCode = ensureString(order?.unit?.code);
  const unitType = order?.unit?.type || null;
  const weight = order?.weight || 0;
  const totalTripWeight = (order?.trips || []).reduce((acc, trip) => acc + (trip?.weight || 0), 0) || 0;
  const remainingWeight = weight - totalTripWeight;

  return {
    unitCode,
    unitType,
    weight,
    totalTripWeight,
    remainingWeight,
  };
};

/**
 * Generate an order code based on the customer code.
 * The order code consists of the first 5 characters of the customer code,
 * followed by a random alphanumeric string. The total length of the order code is 10 characters.
 *
 * @param {string} customerCode - The customer's code.
 * @returns {string} - The generated order code.
 */
export const generateCustomerSpecificOrderCode = (
  orderCodeMaxLength: number | null,
  customerCodePrefixMaxLength: number | null,
  customerCode?: string | null
) => {
  const base = ensureString(trim(customerCode)).substring(
    0,
    customerCodePrefixMaxLength || CUSTOMER_CODE_PREFIX_MIN_LENGTH
  );
  const randomPart = randomString((orderCodeMaxLength || ORDER_CODE_MIN_LENGTH) - base.length, true);

  return joinNonEmptyStrings([base, randomPart], "").toUpperCase();
};

/**
 * Generate an order code based on the route code.
 * The order code consists of the first 5 characters of the route code,
 * followed by a random alphanumeric string. The total length of the order code is 10 characters.
 *
 * @param {string} routeCode - The route's code.
 * @returns {string} - The generated order code.
 */
export const generateRouteSpecificOrderCode = (
  orderCodeMaxLength: number | null,
  routeCodePrefixMaxLength: number | null,
  routeCode?: string | null
) => {
  const base = ensureString(trim(routeCode)).substring(0, routeCodePrefixMaxLength || ROUTE_CODE_PREFIX_MIN_LENGTH);
  const randomPart = randomString((orderCodeMaxLength || ORDER_CODE_MIN_LENGTH) - base.length, true);

  return joinNonEmptyStrings([base, randomPart], "").toUpperCase();
};

/**
 * Generate an order trip code based on the provided order code and an optional sequence number.
 * @param orderCode - The order code.
 * @param sequence - The sequence (optional). If not provided, defaults to "001".
 * @returns {string} - The generated order trip code
 *
 */
export const generateOrderTripCode = (orderCode: string, sequence?: number | null) => {
  const orderNumber = sequence ? ensureString(sequence).padStart(3, "0") : "001";
  return joinNonEmptyStrings([orderCode, orderNumber], "-");
};

/**
 * Get the status flags of an order.
 * This function is called with a Partial<OrderInfo> object to get the status flags of an order.
 * @param {Partial<OrderInfo>} order - The order to get the status flags of.
 * @returns {Object} An object with flags indicating whether the order is a draft, new, received, in progress, completed, or canceled.
 */
export const getOrderStatusFlags = (order?: Partial<OrderInfo>) => {
  let currentStatus: Partial<OrderStatusInfo> | null = null;
  const isDraft = order?.isDraft || order?.statuses?.length === 0;
  let isNew = false;
  let isReceived = false;
  let isInProcessing = false;
  let isCompleted = false;
  let isCanceled = false;

  if (order?.statuses && order.statuses.length > 0) {
    currentStatus = order.statuses.reduce((prev, current) => {
      return (prev as OrderStatusInfo).createdAt > (current as OrderStatusInfo).createdAt ? prev : current;
    });

    isNew = currentStatus.type === OrderStatusType.NEW;
    isReceived = currentStatus.type === OrderStatusType.RECEIVED;
    isInProcessing = currentStatus.type === OrderStatusType.IN_PROGRESS;
    isCompleted = currentStatus.type === OrderStatusType.COMPLETED;
    isCanceled = currentStatus.type === OrderStatusType.CANCELED;
  }

  return {
    currentStatus,
    isDraft,
    isNew,
    isReceived,
    isInProcessing,
    isCompleted,
    isCanceled,
  };
};

/**
 * Get the status flags of an order trip.
 * This function is called with a Partial<OrderTripInfo> object to get the status flags of an order trip.
 * @param {Partial<OrderTripInfo>} orderTrip - The order trip to get the status flags of.
 * @returns {Object} An object with flags indicating the current status of the order trip and whether it is new, pending confirmation, confirmed, waiting for pickup, waiting for delivery, delivered, completed, or canceled.
 */
export const getOrderTripStatusFlags = (orderTrip?: Partial<OrderTripInfo>, excludeCanceled = false) => {
  let currentStatus: Partial<OrderTripStatusInfo> | null = null;
  let isNew = false;
  let isPendingConfirmation = false;
  let isConfirmed = false;
  let isWaitingForPickup = false;
  let isWaitingForDelivery = false;
  let isDelivered = false;
  let isCompleted = false;
  let isCanceled = false;

  if (orderTrip?.statuses && orderTrip.statuses.length > 0) {
    const filteredStatuses = excludeCanceled
      ? orderTrip.statuses.filter((status) => status.type !== OrderTripStatusType.CANCELED)
      : orderTrip.statuses;

    currentStatus = filteredStatuses.reduce((prev, current) => {
      return (prev as OrderTripInfo).createdAt > (current as OrderTripInfo).createdAt ? prev : current;
    });

    isNew = currentStatus.type === OrderTripStatusType.NEW;
    isPendingConfirmation = currentStatus.type === OrderTripStatusType.PENDING_CONFIRMATION;
    isConfirmed = currentStatus.type === OrderTripStatusType.CONFIRMED;
    isWaitingForPickup = currentStatus.type === OrderTripStatusType.WAITING_FOR_PICKUP;
    isWaitingForDelivery = currentStatus.type === OrderTripStatusType.WAITING_FOR_DELIVERY;
    isDelivered = currentStatus.type === OrderTripStatusType.DELIVERED;
    isCompleted = currentStatus.type === OrderTripStatusType.COMPLETED;
    isCanceled = currentStatus.type === OrderTripStatusType.CANCELED;
  }

  return {
    currentStatus,
    isNew,
    isPendingConfirmation,
    isConfirmed,
    isWaitingForPickup,
    isWaitingForDelivery,
    isDelivered,
    isCompleted,
    isCanceled,
  };
};
