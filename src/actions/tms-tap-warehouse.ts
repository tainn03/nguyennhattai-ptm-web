"use server";

import { OrderGroupStatusType, OrderTripStatusType } from "@prisma/client";

import { updateOrderTripStatusAndSendNotificationByOrderGroupId } from "@/actions/orderGroup";
import { WAREHOUSE_API_KEY, WAREHOUSE_HEADER_NAME, WAREHOUSE_URL } from "@/configs/environment";
import { prisma } from "@/configs/prisma";
import { ApiResult, HttpStatusCode } from "@/types/api";
import { OutboundOrderRequest, WarehouseOrdersRequest } from "@/types/tms-tap-warehouse";
import { post } from "@/utils/api";
import { withActionExceptionHandler } from "@/utils/server";

/**
 * Sends inbound orders to the warehouse system
 * This function handles sending order data to an external warehouse API
 *
 * @param _token - Authentication token (unused)
 * @param params - Order request parameters containing:
 *                - orders: Array of warehouse order details
 *                - clientTimeZone: Timezone of the client system
 *                - createdAt: Timestamp when orders were created
 * @returns Response with status and array of order IDs from warehouse
 */
export const sendInboundOrdersToWarehouse = withActionExceptionHandler<WarehouseOrdersRequest, number[]>(
  async (_token, params) => {
    // Extract order parameters
    const { orders, clientTimeZone, createdAt } = params;

    // Make POST request to warehouse API endpoint for inbound orders
    const result = await post<ApiResult<number[]>>(
      `${WAREHOUSE_URL}/api/v1/orders/inbound`,
      {
        orders,
        clientTimeZone,
        createdAt,
      },
      {
        headers: {
          // Add warehouse API authentication header
          [WAREHOUSE_HEADER_NAME]: WAREHOUSE_API_KEY,
        },
      }
    );

    // Return response with status and order IDs from warehouse
    return {
      status: result.status,
      data: result.data,
    };
  }
);

/**
 * Sends outbound orders to the warehouse system
 * This function handles sending outbound order data to an external warehouse API
 *
 * @param _token - Authentication token (unused)
 * @param params - Outbound order request parameters containing:
 *                - orders: Array of order details to be sent out
 *                - notes: Additional notes for the outbound order
 *                - tripCode: Code identifying the delivery trip
 *                - driverName: Name of the delivery driver
 *                - driverPhone: Contact phone number of the driver
 *                - driverEmail: Email address of the driver
 *                - vehicleNumber: License plate/ID of the delivery vehicle
 *                - vehicleType: Type/model of the delivery vehicle
 *                - clientTimeZone: Timezone of the client system
 *                - createdAt: Timestamp when outbound request was created
 * @returns Response with status and array of processed order IDs from warehouse
 */
export const sendOutboundOrdersToWarehouse = withActionExceptionHandler<OutboundOrderRequest, number[]>(
  async (token, params) => {
    // Extract all required parameters from the outbound request
    const {
      orders, // This is the array of order GROUP codes
      notes,
      status,
      exportDate,
      tripCode,
      driverName,
      driverPhone,
      driverEmail,
      vehicleNumber,
      vehicleType,
      clientTimeZone,
      createdAt,
      sendNotification,
    } = params;

    // Extract order IDs from the orders array
    const orderIds = orders.map((order) => order.id);

    // Extract order codes from the orders array
    const orderCodes = orders.map((order) => ({ code: order.code }));

    // Send POST request to warehouse API endpoint for outbound processing
    // This will register the orders as being sent out for delivery
    const {
      status: resultStatus,
      data,
      message,
    } = await post<ApiResult<number[]>>(
      `${WAREHOUSE_URL}/api/v1/orders/outbound`,
      {
        orders: orderCodes, // Use order GROUP codes to send outbound orders
        notes,
        status,
        exportDate,
        tripCode,
        driverName,
        driverPhone,
        driverEmail,
        vehicleNumber,
        vehicleType,
        clientTimeZone,
        createdAt,
      },
      {
        headers: {
          // Include warehouse API key for authentication
          [WAREHOUSE_HEADER_NAME]: WAREHOUSE_API_KEY,
        },
      }
    );

    // If the request is not successful, return the error message
    if (resultStatus !== HttpStatusCode.Ok) {
      return {
        status: resultStatus,
        data,
        message,
      };
    }

    const currentDate = createdAt || new Date();

    // Update the status of the orders to OUTBOUND
    const result = await prisma.$transaction(async (tx) => {
      for (const orderId of orderIds) {
        await tx.orderGroup.update({
          where: { id: Number(orderId) },
          data: {
            lastStatusType: OrderGroupStatusType.OUTBOUND,
            updatedAt: currentDate,
            OrderGroupStatusesGroupLinks: {
              create: {
                orderGroupStatus: {
                  create: {
                    organizationId: Number(token.user.orgId),
                    type: OrderGroupStatusType.OUTBOUND,
                    ...(notes && { notes }),
                    createdAt: currentDate,
                    OrderGroupStatusesCreatedByUserLinks: {
                      create: {
                        userId: token.user.id,
                      },
                    },
                    updatedAt: currentDate,
                    OrderGroupStatusesUpdatedByUserLinks: {
                      create: {
                        userId: token.user.id,
                      },
                    },
                    publishedAt: currentDate,
                  },
                },
              },
            },
          },
        });
      }
      return orderIds;
    });

    // Send notification if requested
    if (sendNotification) {
      // Send notification for each order
      for (const orderId of orderIds || []) {
        await updateOrderTripStatusAndSendNotificationByOrderGroupId({
          orderGroupId: orderId,
          organizationId: Number(token.user.orgId),
          status: OrderTripStatusType.PENDING_CONFIRMATION,
        });
      }
    }

    // Return API response containing status and processed order IDs
    return {
      status: HttpStatusCode.Ok,
      data: result,
    };
  }
);
