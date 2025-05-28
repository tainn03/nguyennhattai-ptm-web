"use server";

import {
  CustomerType,
  NotificationType,
  OrderGroupStatusType,
  OrderParticipantRole,
  OrderStatusType,
  OrderTripMessageType,
  OrderTripStatusType,
  OrderType,
  OrganizationRoleType,
  RouteType,
} from "@prisma/client";
import { gql } from "graphql-request";

import { getDriverUserIdByDriverId } from "@/actions/drivers";
import { createOrderGroupStatus } from "@/actions/orderGroupStatus";
import { getNotificationDataByOrderTrip, getTripIdsByOrderId } from "@/actions/orderTrip";
import { createOrderTripStatus } from "@/actions/orderTripStatus";
import { sendInboundOrdersToWarehouse } from "@/actions/tms-tap-warehouse";
import { STRAPI_TOKEN_KEY } from "@/configs/environment";
import { prisma } from "@/configs/prisma";
import { INTERNAL_CUSTOMER_CODE } from "@/constants/customer";
import { ORDER_GROUP_CODE_MIN_LENGTH } from "@/constants/order";
import { ORDER_CODE_MIN_LENGTH } from "@/constants/organizationSetting";
import { DEFAULT_ROUTE_CODE_LENGTH, DEFAULT_ROUTE_POINT_CODE_LENGTH } from "@/constants/route";
import { SYSTEM_ADMIN_ID } from "@/constants/strapi";
import {
  AddScheduleToOrderGroupInputForm,
  InboundOrderGroupInputForm,
  OrderScheduleInputForm,
  RemoveOrderFromOrderGroupInputForm,
  SendOrderGroupNotificationInputForm,
  UpdateOrderGroupStatusInputForm,
} from "@/forms/orderGroup";
import { getDriverReportByType } from "@/services/server/driverReport";
import { checkOrderCodeExists } from "@/services/server/order";
import { createOrderStatusByGraphQL } from "@/services/server/orderStatus";
import { createOrderTrip } from "@/services/server/orderTrip";
import { getRouteDriverExpense } from "@/services/server/route";
import { AnyObject } from "@/types";
import { HttpStatusCode } from "@/types/api";
import { FilterRequest } from "@/types/filter";
import {
  InProgressOrderGroupNotification,
  NotificationData,
  TripConfirmedNotification,
  TripDeliveryStepNotification,
  TripPendingConfirmationNotification,
} from "@/types/notification";
import { DriverInfo, OrderGroupInfo, OrderInfo, OrderParticipantInfo, OrderTripInfo } from "@/types/strapi";
import { WarehouseNotifyRequest, WarehouseOrderRequest } from "@/types/tms-tap-warehouse";
import { getFullName } from "@/utils/auth";
import { fetcher } from "@/utils/graphql";
import { pushNotification } from "@/utils/notification";
import { generateOrderTripCode } from "@/utils/order";
import { exportOrderGroupsPlan } from "@/utils/orderGroup";
import { getServerToken, withActionExceptionHandler } from "@/utils/server";
import { ensureString, getDetailRoutePointAddress, randomString } from "@/utils/string";
/**
 * Checks if an order group code exists within an organization.
 *
 * @param orderGroupCode - The code of the order group to check.
 * @returns True if the order group code exists, false otherwise.
 */
export const checkOrderGroupCodeExists = async (orderGroupCode: string) => {
  const { jwt, user } = await getServerToken();

  const query = gql`
    query ($organizationId: Int!, $code: String!) {
      orderGroups(filters: { organizationId: { eq: $organizationId }, code: { eq: $code } }) {
        meta {
          pagination {
            total
          }
        }
      }
    }
  `;

  const { meta } = await fetcher<AnyObject>(jwt, query, {
    organizationId: user.orgId,
    code: orderGroupCode,
  });

  return (meta?.pagination?.total ?? 0) > 0;
};

/**
 * Creates a new order scheduler with the provided trips and driver information.
 *
 * @param token - The authentication token.
 * @param params - The parameters for creating the order group.
 * @returns The created order group.
 */
export const createOrderScheduler = withActionExceptionHandler<OrderScheduleInputForm, OrderGroupInfo>(
  async (token, params) => {
    const { organizationId, driverId, vehicleId, driverExpenseRate, trips } = params;
    // Initialize array to store order IDs that will be linked to the group
    const orderIds: number[] = [];

    // Verify driver report exists - required for tracking trip status
    const newTripDriverReport = await getDriverReportByType(token.jwt, organizationId, OrderTripStatusType.NEW);

    // Return error if no driver report found
    if (!newTripDriverReport) {
      return {
        status: HttpStatusCode.BadRequest,
        message: "No driver report found with the type 'NEW'.",
      };
    }

    // Process each trip in the schedule
    for (const trip of trips) {
      // Fetch route configuration including driver expenses
      const route = await getRouteDriverExpense(token.jwt, organizationId, trip.routeId);

      // Create order trip record with driver, vehicle and expense details
      await createOrderTrip(
        prisma,
        {
          pickupDate: trip.pickupDate as Date,
          deliveryDate: trip.deliveryDate as Date,
          pickupTimeNotes: trip.pickupTimeNotes || null,
          deliveryTimeNotes: trip.deliveryTimeNotes || null,
          organizationId,
          order: { id: trip.orderId, code: trip.orderCode },
          vehicle: { id: vehicleId },
          driver: { id: driverId },
          weight: trip.weight,
          driverReportId: newTripDriverReport.id,
          driverExpenseRate,
          isUseRouteDriverExpenses: true, // Use route's predefined expense configuration
          createdById: token.user.id,
        },
        token.jwt,
        route,
        { isPushOrderInProgressNotification: false } // Disable notifications during bulk creation
      );

      // Create order status records for the order
      const updateOrderStatusRequest = {
        organizationId,
        order: { id: trip.orderId },
        createdById: token.user.id,
      };

      // Create received status for the order
      await createOrderStatusByGraphQL(token.jwt, { ...updateOrderStatusRequest, type: OrderStatusType.RECEIVED });

      // Create in progress status for the order
      await createOrderStatusByGraphQL(token.jwt, { ...updateOrderStatusRequest, type: OrderStatusType.IN_PROGRESS });

      // Store order ID for group linking
      orderIds.push(trip.orderId);
    }

    // Generate unique order group code
    let orderGroupCode: string;
    let isCodeExists: boolean;
    do {
      // Create random code of specified length
      orderGroupCode = randomString(ORDER_GROUP_CODE_MIN_LENGTH, true);
      // Check if code already exists to avoid duplicates
      isCodeExists = await checkOrderGroupCodeExists(orderGroupCode);
    } while (isCodeExists);

    // GraphQL mutation to create order group
    const query = gql`
      mutation ($data: OrderGroupInput!) {
        createOrderGroup(data: $data) {
          data {
            id
          }
        }
      }
    `;

    // Create order group linking all orders together
    const { data } = await fetcher<OrderGroupInfo>(token.jwt, query, {
      data: {
        code: orderGroupCode,
        organizationId,
        orders: orderIds,
        lastStatusType: OrderGroupStatusType.PLAN, // Set initial status as PLAN
        publishedAt: new Date().toISOString(),
      },
    });

    // Create initial status record for order group
    await createOrderGroupStatus({
      organizationId,
      group: data.createOrderGroup,
      type: OrderGroupStatusType.PLAN,
    });

    // Return success response with created group
    return {
      status: HttpStatusCode.Ok,
      data: data.createOrderGroup,
    };
  }
);

/**
 * Updates an order scheduler.
 *
 * @param token - The authentication token.
 * @param params - The parameters for updating the order scheduler.
 * @returns The updated order group.
 */
export const updateOrderScheduler = withActionExceptionHandler<OrderScheduleInputForm, OrderGroupInfo>(
  async (token, params) => {
    const { driverId, vehicleId, trips } = params;
    // Initialize array to store order IDs that will be linked to the group
    const orderIds: number[] = [];

    // Process each trip in the schedule
    for (const trip of trips) {
      // GraphQL mutation to update order trip
      const query = gql`
        mutation (
          $id: ID!
          $pickupDate: DateTime
          $deliveryDate: DateTime
          $pickupTimeNotes: String
          $deliveryTimeNotes: String
          $vehicleId: ID
          $driverId: ID
          $updatedByUser: ID
        ) {
          updateOrderTrip(
            id: $id
            data: {
              pickupDate: $pickupDate
              deliveryDate: $deliveryDate
              pickupTimeNotes: $pickupTimeNotes
              deliveryTimeNotes: $deliveryTimeNotes
              vehicle: $vehicleId
              driver: $driverId
              updatedByUser: $updatedByUser
            }
          ) {
            data {
              id
            }
          }
        }
      `;

      // Call GraphQL mutation to update order trip
      await fetcher<OrderTripInfo>(token.jwt, query, {
        id: trip.tripId,
        pickupDate: trip.pickupDate,
        deliveryDate: trip.deliveryDate,
        pickupTimeNotes: trip.pickupTimeNotes,
        deliveryTimeNotes: trip.deliveryTimeNotes,
        vehicleId,
        driverId,
        updatedByUser: token.user.id,
      });

      // Update order trip record with driver, vehicle and expense details
      orderIds.push(trip.orderId);
    }

    for (const orderId of orderIds) {
      // GraphQL mutation to update order
      const query = gql`
        mutation ($id: ID!, $data: OrderInput!) {
          updateOrder(id: $id, data: $data) {
            data {
              id
            }
          }
        }
      `;

      // Call GraphQL mutation to update order
      await fetcher<OrderInfo>(token.jwt, query, { id: orderId, data: { updatedByUser: token.user.id } });
    }

    // Return success response with updated order group
    return {
      status: HttpStatusCode.Ok,
    };
  }
);

/**
 * Adds more orders to an order group.
 *
 * @param token - The authentication token.
 * @param params - The parameters for adding more orders to the order group.
 * @returns The updated order group.
 */
export const addMoreOrderToOrderGroup = withActionExceptionHandler<AddScheduleToOrderGroupInputForm, OrderGroupInfo>(
  async (token, params) => {
    const { orderGroup, currentOrderIds, schedule } = params;
    const { organizationId, driverId, vehicleId, driverExpenseRate, trips } = schedule;

    // Initialize array to store order IDs that will be linked to the group
    const orderIds: number[] = currentOrderIds;

    // Verify driver report exists - required for tracking trip status
    const newTripDriverReport = await getDriverReportByType(token.jwt, organizationId, OrderTripStatusType.NEW);

    // Return error if no driver report found
    if (!newTripDriverReport) {
      return {
        status: HttpStatusCode.BadRequest,
        message: "No driver report found with the type 'NEW'.",
      };
    }

    // Process each trip in the schedule
    for (const trip of trips) {
      // Fetch route configuration including driver expenses
      const route = await getRouteDriverExpense(token.jwt, organizationId, trip.routeId);

      // Create order trip record with driver, vehicle and expense details
      await createOrderTrip(
        prisma,
        {
          pickupDate: trip.pickupDate as Date,
          deliveryDate: trip.deliveryDate as Date,
          organizationId,
          order: { id: trip.orderId, code: trip.orderCode },
          vehicle: { id: vehicleId },
          driver: { id: driverId },
          weight: trip.weight,
          driverReportId: newTripDriverReport.id,
          driverExpenseRate,
          isUseRouteDriverExpenses: true, // Use route's predefined expense configuration
          createdById: token.user.id,
        },
        token.jwt,
        route,
        { isPushOrderInProgressNotification: false } // Disable notifications during bulk creation
      );

      // Create order status records for the order
      const updateOrderStatusRequest = {
        organizationId,
        order: { id: trip.orderId },
        createdById: token.user.id,
      };

      // Create received status for the order
      await createOrderStatusByGraphQL(token.jwt, { ...updateOrderStatusRequest, type: OrderStatusType.RECEIVED });

      // Create in progress status for the order
      await createOrderStatusByGraphQL(token.jwt, { ...updateOrderStatusRequest, type: OrderStatusType.IN_PROGRESS });

      // Store order ID for group linking
      orderIds.push(trip.orderId);
    }

    // Update order group with new orders
    const query = gql`
      mutation ($id: ID!, $data: OrderGroupInput!) {
        updateOrderGroup(id: $id, data: $data) {
          data {
            id
          }
        }
      }
    `;

    // Update order group with new orders
    const { data } = await fetcher<OrderGroupInfo>(token.jwt, query, {
      id: orderGroup.id,
      data: { orders: orderIds },
    });

    // Return success response with updated order group
    return {
      status: HttpStatusCode.Ok,
      data: data.updateOrderGroup,
    };
  }
);

/**
 * Removes an order from an order group.
 *
 * @param token - The authentication token.
 * @param params - The parameters for removing an order from the order group.
 * @returns The updated order group.
 */
export const orderGroupCountByStatusFetcher = async ([_, param]: [string, Pick<OrderGroupInfo, "organizationId">]) => {
  const { jwt } = await getServerToken();
  const { organizationId } = param;
  const baseQuery = gql`
    query ($lastStatusType: String, $organizationId: Int) {
      orders(
        pagination: { limit: -1 }
        filters: {
          publishedAt: { ne: null }
          organizationId: { eq: $organizationId }
          lastStatusType: { eq: $lastStatusType }
        }
      ) {
        meta {
          pagination {
            total
          }
        }
      }
    }
  `;

  const { meta: baseMeta } = await fetcher<AnyObject>(jwt, baseQuery, {
    lastStatusType: OrderStatusType.NEW,
    organizationId: Number(organizationId),
  });

  const planQuery = gql`
    query ($lastStatusType: String, $organizationId: Int) {
      orderGroups(
        pagination: { limit: -1 }
        filters: {
          publishedAt: { ne: null }
          organizationId: { eq: $organizationId }
          lastStatusType: { eq: $lastStatusType }
        }
      ) {
        meta {
          pagination {
            total
          }
        }
      }
    }
  `;

  const { meta: planMeta } = await fetcher<AnyObject>(jwt, planQuery, {
    lastStatusType: OrderGroupStatusType.PLAN,
    organizationId: Number(organizationId),
  });

  const processedQuery = gql`
    query ($lastStatusType: String, $organizationId: Int) {
      orderGroups(
        pagination: { limit: -1 }
        filters: {
          publishedAt: { ne: null }
          organizationId: { eq: $organizationId }
          lastStatusType: { ne: $lastStatusType }
        }
      ) {
        meta {
          pagination {
            total
          }
        }
      }
    }
  `;

  const { meta: processedMeta } = await fetcher<AnyObject>(jwt, processedQuery, {
    lastStatusType: OrderGroupStatusType.PLAN,
    organizationId: Number(organizationId),
  });

  return { baseMeta, planMeta, processedMeta };
};

/**
 * Cancels an order group.
 *
 * @param token - The authentication token.
 * @param params - The parameters for canceling the order group.
 * @returns The updated order group.
 */
export const removeOrderFromOrderGroup = withActionExceptionHandler<RemoveOrderFromOrderGroupInputForm, number[]>(
  async (token, params) => {
    // Extract order group and current order IDs from params
    const { removedOrderIds, remainingOrderCount, currentDate: today } = params;
    const currentDate = today || new Date();

    const result = await prisma.$transaction(async (prisma) => {
      const orderIds: number[] = [];

      // Iterate through each order ID and remove from group
      for (const orderId of removedOrderIds) {
        const response = await prisma.order.update({
          where: { id: Number(orderId) },
          data: {
            lastStatusType: OrderStatusType.NEW,
            updatedAt: currentDate,
            OrdersUpdatedByUserLinks: {
              upsert: {
                where: {
                  orderId: Number(orderId),
                  userId: token.user.id,
                },
                update: {
                  userId: token.user.id,
                },
                create: {
                  userId: token.user.id,
                },
              },
            },
            OrderTripsOrderLinks: {
              update: [
                {
                  where: {
                    orderId: Number(orderId),
                  },
                  data: {
                    orderTrip: {
                      update: {
                        publishedAt: null,
                      },
                    },
                  },
                },
              ],
            },
            ...(remainingOrderCount === 0
              ? {
                  OrdersGroupLinks: {
                    update: {
                      orderGroup: {
                        update: {
                          publishedAt: null,
                        },
                      },
                    },
                  },
                }
              : {
                  OrdersGroupLinks: {
                    delete: true,
                  },
                }),
            OrderStatusesOrderLinks: {
              update: {
                where: {
                  orderId: Number(orderId),
                },
                data: {
                  orderStatus: {
                    update: {
                      where: {
                        type: { not: OrderStatusType.NEW },
                      },
                      data: {
                        publishedAt: null,
                      },
                    },
                  },
                },
              },
            },
          },
        });

        orderIds.push(response.id);
      }
      return orderIds;
    });

    // Return success response with final updated group
    return {
      status: HttpStatusCode.Ok,
      data: result,
    };
  }
);

/**
 * Sends a notification to the order group.
 *
 * @param token - The authentication token.
 * @param params - The parameters for sending the notification to the order group.
 * @returns The updated order group.
 */
export const sendNotificationToOrderGroup = withActionExceptionHandler<
  SendOrderGroupNotificationInputForm,
  OrderGroupInfo
>(async (token, params) => {
  const {
    orderGroup,
    currentOrderIds,
    organizationId,
    fullName,
    vehicleNumber,
    driverId,
    driverFullName,
    weight,
    unitOfMeasure,
  } = params;

  // Verify driver report exists - required for tracking trip status
  const pendingConfirmationTripDriverReport = await getDriverReportByType(
    token.jwt,
    organizationId,
    OrderTripStatusType.PENDING_CONFIRMATION
  );

  // Return error if no driver report found
  if (!pendingConfirmationTripDriverReport) {
    return {
      status: HttpStatusCode.BadRequest,
      message: "No driver report found with the type 'PENDING_CONFIRMATION'.",
    };
  }
  // Iterate through each order ID and remove from group
  for (const orderId of currentOrderIds) {
    // Get trips by order ID
    const trips = await getTripIdsByOrderId(orderId);
    if (trips.length > 0) {
      for (const trip of trips) {
        // Create pending confirmation status for each trip
        await createOrderTripStatus({
          organizationId,
          trip,
          type: OrderTripStatusType.PENDING_CONFIRMATION,
          driverReport: pendingConfirmationTripDriverReport,
        });
      }
    }
  }

  // Update order group with new orders
  const query = gql`
    mutation ($id: ID!, $data: OrderGroupInput!) {
      updateOrderGroup(id: $id, data: $data) {
        data {
          id
        }
      }
    }
  `;

  // Update order group with new orders
  const { data } = await fetcher<OrderGroupInfo>(token.jwt, query, {
    id: orderGroup.id,
    data: { lastStatusType: OrderGroupStatusType.IN_PROGRESS },
  });

  // Create initial status record for order group
  await createOrderGroupStatus({
    organizationId,
    group: data.updateOrderGroup,
    type: OrderGroupStatusType.IN_PROGRESS,
  });

  if (driverId) {
    // Get driver user ID
    const { data: driverUserId } = await getDriverUserIdByDriverId(driverId);

    // Check if driver user ID exists
    if (driverUserId) {
      // Data to handle notification
      const notificationData: InProgressOrderGroupNotification = {
        groupCode: orderGroup.code,
        orderGroupStatus: OrderGroupStatusType.IN_PROGRESS,
        fullName,
        vehicleNumber,
        driverFullName,
        weight,
        unitOfMeasure,
      };

      // Push notifications
      pushNotification({
        entity: {
          type: NotificationType.ORDER_GROUP_STATUS_CHANGED,
          organizationId,
          createdById: token.user.id,
          targetId: Number(orderGroup.id),
        },
        data: notificationData,
        jwt: token.jwt,
        receivers: [{ user: { id: driverUserId } }],
        isSendToParticipants: false,
      });
    }
  }

  // Return success response with final updated group
  return {
    status: HttpStatusCode.Ok,
    data: data.updateOrderGroup,
  };
});

/**
 * Fetches order group notification data.
 *
 * @param token - The authentication token.
 * @param params - The parameters for fetching the order group notification data.
 * @returns The order group notification data.
 */
export const getOrderGroupNotificationData = withActionExceptionHandler<Pick<OrderGroupInfo, "id">, OrderGroupInfo>(
  async (token, params) => {
    const { id } = params;
    const query = gql`
      query ($id: ID) {
        orderGroup(id: $id) {
          data {
            id
            attributes {
              code
              orders(pagination: { limit: -1 }) {
                data {
                  id
                  attributes {
                    trips(pagination: { limit: -1 }) {
                      data {
                        id
                        attributes {
                          lastStatusType
                          code
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const { data } = await fetcher<OrderGroupInfo>(token.jwt, query, {
      id: id,
    });

    return {
      status: HttpStatusCode.Ok,
      data: data?.orderGroup,
    };
  }
);

/**
 * Sends a notification to the order group status changed.
 *
 * @param token - The authentication token.
 * @param params - The parameters for sending the notification to the order group status changed.
 * - only support status: CONFIRMED, WAITING_FOR_PICKUP
 * @returns The updated order group.
 */
export const updateOrderTripStatusAndSendNotificationByOrderGroupId = withActionExceptionHandler<
  UpdateOrderGroupStatusInputForm,
  number
>(async (token, params) => {
  const { orderGroupId, organizationId, status, longitude, latitude } = params;

  // Verify driver report exists - required for tracking trip status
  const driverReport = await getDriverReportByType(token.jwt, organizationId, status);

  // Get current date
  const currentDate = new Date();

  // Return error if no driver report found
  if (!driverReport) {
    return {
      status: HttpStatusCode.BadRequest,
      message: `No driver report found with the type '${status}'.`,
    };
  }

  // Get order group data
  const { data: orderGroup } = await getOrderGroupNotificationData({ id: orderGroupId });

  // Return error if order group not found
  if (!orderGroup) {
    return {
      status: HttpStatusCode.BadRequest,
      message: "Order group not found.",
    };
  }

  // Get all trips from the order group
  const trips = orderGroup.orders.flatMap((order) => order.trips);

  // Return error if no trips found in the order group
  if (!trips || !trips.length) {
    return {
      status: HttpStatusCode.BadRequest,
      message: "No trips found in the order group.",
    };
  }

  await prisma.$transaction(async (prisma) => {
    for (const trip of trips) {
      await prisma.orderTrip.update({
        where: {
          id: Number(trip?.id),
        },
        data: {
          lastStatusType: status,
          OrderTripStatusesTripLinks: {
            create: [
              {
                orderTripStatus: {
                  create: {
                    organizationId,
                    type: status,
                    createdAt: currentDate,
                    OrderTripStatusesDriverReportLinks: {
                      create: {
                        driverReportId: driverReport?.id ? Number(driverReport.id) : -1,
                      },
                    },
                    OrderTripStatusesCreatedByUserLinks: {
                      create: {
                        userId: token.user.id,
                      },
                    },
                    updatedAt: currentDate,
                    OrderTripStatusesUpdatedByUserLinks: {
                      create: {
                        userId: token.user.id,
                      },
                    },
                    publishedAt: currentDate,
                  },
                },
              },
            ],
          },
          ...(longitude &&
            latitude && {
              OrderTripMessageTripLinks: {
                create: [
                  {
                    orderTripMessage: {
                      create: {
                        organizationId,
                        type: status as OrderTripMessageType,
                        longitude: parseFloat(ensureString(longitude)),
                        latitude: parseFloat(ensureString(latitude)),
                        createdAt: currentDate,
                        OrderTripMessageCreatedByUserLinks: {
                          create: {
                            userId: token.user.id,
                          },
                        },
                        updatedAt: currentDate,
                        OrderTripMessageUpdatedByUserLinks: {
                          create: {
                            userId: token.user.id,
                          },
                        },
                        publishedAt: currentDate,
                      },
                    },
                  },
                ],
              },
            }),
          updatedAt: currentDate,
          OrderTripsUpdatedByUserLinks: {
            upsert: {
              where: {
                userId: token.user.id,
              },
              update: {
                userId: token.user.id,
              },
              create: {
                userId: token.user.id,
              },
            },
          },
        },
      });
    }
  });

  if (trips?.[0]?.id) {
    const { driver, order, vehicle } = await getNotificationDataByOrderTrip(trips?.[0]?.id, organizationId);

    // Get the order consolidation enabled setting.
    let isSendToParticipants = true;

    // Send notifications based on the status, updating relevant parties.
    const driverFullName = getFullName(driver?.firstName, driver?.lastName);

    // Get the participant full name
    const participantFullName = getFullName(
      order?.participants?.[0]?.user?.detail?.firstName,
      order?.participants?.[0]?.user?.detail?.lastName
    );

    // Determine the notification data and receivers based on the status.
    const receivers: Partial<DriverInfo | OrderParticipantInfo>[] = [];

    // Notification data and organization member roles
    let notificationData: NotificationData | undefined;
    let orgMemberRoles: OrganizationRoleType[] = [];

    if (status) {
      // Determine the notification data and receivers based on the status.
      switch (status) {
        case OrderTripStatusType.PENDING_CONFIRMATION: {
          isSendToParticipants = false;
          if (driver?.user?.id) {
            receivers.push({ user: { id: Number(driver.user.id) } });
          }
          const tripPendingConfirmationNotificationData: TripPendingConfirmationNotification = {
            driverFullName,
            orderCode: ensureString(order?.code),
            orderId: Number(order?.id),
            tripCode: ensureString(trips?.[0]?.code),
            tripId: Number(trips?.[0]?.id),
            orderGroupCode: ensureString(orderGroup?.code),
            tripStatus: status,
            unitOfMeasure: ensureString(order?.unit?.code),
            vehicleNumber: ensureString(vehicle?.vehicleNumber),
            fullName: ensureString(participantFullName),
            weight: Number(order?.weight),
            driverReportId: driverReport.id,
          };
          notificationData = tripPendingConfirmationNotificationData;
          break;
        }
        case OrderTripStatusType.CONFIRMED: {
          const tripConfirmedNotificationData: TripConfirmedNotification = {
            driverFullName,
            orderCode: ensureString(order?.code),
            tripCode: ensureString(trips?.[0]?.code),
            tripId: Number(trips?.[0]?.id),
            orderGroupCode: ensureString(orderGroup?.code),
            tripStatus: status,
            driverReportId: driverReport.id,
          };

          notificationData = tripConfirmedNotificationData;
          break;
        }
        case OrderTripStatusType.WAITING_FOR_PICKUP: {
          const dataTmp: TripDeliveryStepNotification = {
            driverFullName,
            driverReportName: driverReport.name,
            driverReportId: driverReport.id,
            orderCode: ensureString(order?.code),
            orderGroupCode: ensureString(orderGroup?.code),
            tripCode: ensureString(trips?.[0]?.code),
            tripId: Number(trips?.[0]?.id),
            tripStatus: status,
            vehicleNumber: ensureString(vehicle?.vehicleNumber),
          };

          notificationData = dataTmp;
          orgMemberRoles = [OrganizationRoleType.ACCOUNTANT];
          break;
        }
      }
    }

    // Send the notification.
    if (notificationData) {
      pushNotification({
        entity: {
          type: NotificationType.TRIP_STATUS_CHANGED,
          organizationId,
          createdById: token.user.id,
          targetId: Number(trips?.[0]?.id),
        },
        data: notificationData,
        jwt: token.jwt,
        orgMemberRoles,
        receivers,
        isSendToParticipants,
      });
    }
  }

  return {
    status: HttpStatusCode.Ok,
    data: trips.length,
  };
});

/**
 * Gets the order group by order ID.
 *
 * @param order - The order.
 * @returns The order group.
 */
export const getOrderGroupByOrderId = withActionExceptionHandler<Pick<OrderInfo, "id">, Partial<OrderGroupInfo>>(
  async (token, params) => {
    const { id } = params;

    const query = gql`
      query ($id: ID) {
        order(id: $id) {
          data {
            id
            attributes {
              group {
                data {
                  id
                  attributes {
                    code
                  }
                }
              }
            }
          }
        }
      }
    `;

    const { data } = await fetcher<OrderInfo>(token.jwt, query, {
      id,
    });

    return {
      status: HttpStatusCode.Ok,
      data: data?.order?.group,
    };
  }
);

/**
 * Updates the order group status if all trips are delivered.
 *
 * @param token - The authentication token.
 * @param params - The parameters for updating the order group status.
 * @returns The updated order group.
 */
export const updateOrderGroupStatusIfAllTripsDelivered = withActionExceptionHandler<
  Pick<OrderGroupInfo, "id" | "organizationId">,
  boolean
>(async (token, params) => {
  const { id, organizationId } = params;

  const { data: orderGroup } = await getOrderGroupNotificationData({ id });

  // Get all trips from the order group and check if all trips are delivered
  const trips = orderGroup?.orders.flatMap((order) => order.trips);
  const allTripsDelivered = trips?.every((trip) => trip?.lastStatusType === OrderTripStatusType.DELIVERED);

  // If all trips are delivered, update the order group status to delivered
  if (allTripsDelivered) {
    await createOrderGroupStatus({
      organizationId: token.user?.orgId ?? organizationId,
      group: { id },
      type: OrderGroupStatusType.DELIVERED,
    });
  }

  return {
    status: HttpStatusCode.Ok,
    data: allTripsDelivered,
  };
});

/**
 * Updates the order group status if all trips are completed.
 *
 * @param token - The authentication token.
 * @param params - The parameters for updating the order group status.
 * @returns The updated order group.
 */
export const updateOrderGroupStatusIfAllTripsCompleted = withActionExceptionHandler<
  Pick<Partial<OrderGroupInfo>, "id" | "organizationId"> & { orderId?: number },
  Partial<Pick<OrderGroupInfo, "id" | "code">>
>(async (token, params) => {
  const { id, organizationId, orderId } = params;

  let orderGroupId = id;
  let orderGroupCode = null;

  // Get order group ID from order ID
  if (!orderGroupId && orderId) {
    const { data: orderGroup } = await getOrderGroupByOrderId({ id: orderId });
    if (orderGroup?.id) {
      orderGroupId = orderGroup.id;
      orderGroupCode = orderGroup.code;
    }
  }

  // Return error if order group ID is not found
  if (!orderGroupId) {
    return {
      status: HttpStatusCode.BadRequest,
      message: "Order group ID or order ID is required",
    };
  }

  // Get order group data
  const { data: orderGroup } = await getOrderGroupNotificationData({ id: orderGroupId });

  // Get all trips from the order group and check if all trips are completed
  const trips = orderGroup?.orders.flatMap((order) => order.trips);
  const allTripsCompleted = trips?.every((trip) => trip?.lastStatusType === OrderTripStatusType.COMPLETED);

  // If all trips are completed, update the order group status to completed
  if (allTripsCompleted) {
    await createOrderGroupStatus({
      organizationId: token.user?.orgId ?? organizationId,
      group: { id },
      type: OrderGroupStatusType.COMPLETED,
    });
  }

  return {
    status: HttpStatusCode.Ok,
    data: { id: orderGroupId, code: orderGroupCode ?? undefined },
  };
});

/**
 * Gets inbound orders by order group ID.
 *
 * @param orderGroupId - The ID of the order group.
 * @returns The inbound orders.
 */
export const getInboundOrdersToSendToWarehouse = withActionExceptionHandler<number, OrderGroupInfo>(
  async (token, param) => {
    const query = gql`
      query ($id: ID!) {
        orderGroup(id: $id) {
          data {
            id
            attributes {
              code
              orders(pagination: { limit: -1 }) {
                data {
                  id
                  attributes {
                    code
                    orderDate
                    deliveryDate
                    weight
                    cbm
                    unit {
                      data {
                        attributes {
                          name
                        }
                      }
                    }
                    customer {
                      data {
                        attributes {
                          code
                          name
                          phoneNumber
                          email
                        }
                      }
                    }
                    items(pagination: { limit: -1 }) {
                      data {
                        attributes {
                          name
                          merchandiseType {
                            data {
                              attributes {
                                name
                              }
                            }
                          }
                          packageWeight
                          packageLength
                          packageWidth
                          packageHeight
                          quantity
                          notes
                        }
                      }
                    }
                    route {
                      data {
                        attributes {
                          pickupPoints(pagination: { limit: -1 }) {
                            data {
                              attributes {
                                code
                                name
                                address {
                                  data {
                                    attributes {
                                      addressLine1
                                      city {
                                        data {
                                          attributes {
                                            name
                                          }
                                        }
                                      }
                                      district {
                                        data {
                                          attributes {
                                            name
                                          }
                                        }
                                      }
                                      ward {
                                        data {
                                          attributes {
                                            name
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                          deliveryPoints(pagination: { limit: -1 }) {
                            data {
                              attributes {
                                code
                                name
                                address {
                                  data {
                                    attributes {
                                      addressLine1
                                      city {
                                        data {
                                          attributes {
                                            name
                                          }
                                        }
                                      }
                                      district {
                                        data {
                                          attributes {
                                            name
                                          }
                                        }
                                      }
                                      ward {
                                        data {
                                          attributes {
                                            name
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const { data } = await fetcher<OrderGroupInfo>(token.jwt, query, { id: param });

    return {
      status: HttpStatusCode.Ok,
      data: data?.orderGroup,
    };
  }
);

/**
 * Handles inbound order group processing.
 *
 * This function creates a new inbound order group with associated orders, trips, statuses and relationships.
 * @param token - Authentication token containing user info
 * @param params - Input parameters including
 *
 * @returns Object containing status code and created order group ID
 */
export const inboundOrderGroup = withActionExceptionHandler<InboundOrderGroupInputForm, number>(
  async (token, params) => {
    // Extract parameters
    const {
      organizationId,
      organizationName,
      sendNotification,
      clientTimezone,
      currentDate: today,
      pickupDate,
      deliveryDate,
      driver,
      vehicle,
      orderGroup,
      unitOfMeasure,
      weight,
      cbm,
      warehouse,
    } = params;

    // Convert current date to client timezone
    const currentDate = today || new Date();
    const randomRouteCode = randomString(DEFAULT_ROUTE_CODE_LENGTH, true);

    // Get inbound orders data from warehouse for the order group
    const { data: inboundOrderGroup } = await getInboundOrdersToSendToWarehouse(orderGroup.id);

    // Construct warehouse order request object with order group details
    const warehouseOrderRequest: WarehouseOrderRequest = {
      code: inboundOrderGroup?.code ?? null, // Order group code
      weight: weight ?? null, // Weight of the order group
      cbm: cbm ?? null, // Cubic meter of the order group
      unitOfMeasure: unitOfMeasure?.code ?? null, // Unit of measurement
      orderDate: (pickupDate as Date) ?? null, // Original order date
      deliveryDate: (deliveryDate as Date) ?? null, // Expected delivery date

      // Use the first order's customer details
      customerCode: inboundOrderGroup?.orders?.[0]?.customer?.code ?? null, // Customer identifier
      customerName: inboundOrderGroup?.orders?.[0]?.customer?.name ?? null, // Customer name
      customerPhone: inboundOrderGroup?.orders?.[0]?.customer?.phoneNumber ?? null, // Customer phone
      customerEmail: inboundOrderGroup?.orders?.[0]?.customer?.email ?? null, // Customer email

      // Get driver name from either user details or driver details
      driverName: getFullName(driver?.firstName, driver?.lastName) || null,
      driverPhone: driver?.phoneNumber ?? null, // Driver phone
      driverEmail: driver?.email ?? null, // Driver email

      // Get vehicle details from the first order's trip
      vehicleNumber: vehicle?.vehicleNumber ?? null, // Vehicle plate number
      vehicleType: vehicle?.type?.name ?? null, // Vehicle type

      // Get inventories from the orders
      inventories: (inboundOrderGroup?.orders || []).map((order) => ({
        code: order.code ?? null,
        orderDate: order.orderDate ?? null,
        deliveryDate: order.deliveryDate ?? null,
        weight: order.weight ?? null,
        unitOfMeasure: order.unit?.name ?? null,
        cbm: order.cbm ?? null,
        pickupPoint: getDetailRoutePointAddress(order.route?.pickupPoints?.[0]),
        deliveryPoint: getDetailRoutePointAddress(order.route?.deliveryPoints?.[0]),
        pickupTimeNotes: order.trips?.[0]?.pickupTimeNotes ?? null,
        deliveryTimeNotes: order.trips?.[0]?.deliveryTimeNotes ?? null,
        customerCode: order.customer?.code ?? null,
        customerName: order.customer?.name ?? null,
        customerPhone: order.customer?.phoneNumber ?? null,
        customerEmail: order.customer?.email ?? null,

        // Get consignments from the order items
        consignments: (order.items || [])?.map((item) => ({
          name: item.name ?? null,
          merchandiseType: item.merchandiseType?.name ?? null,
          weight: item.packageWeight ?? null,
          length: item.packageLength ?? null,
          width: item.packageWidth ?? null,
          height: item.packageHeight ?? null,
          quantity: item.quantity ?? null,
          notes: item.notes ?? null,
          unit: null,
        })),
      })),
    };

    // Send inbound order request to warehouse system
    const { status, data: warehouseData } = await sendInboundOrdersToWarehouse({
      orders: [warehouseOrderRequest], // Array containing single warehouse order
      clientTimeZone: clientTimezone, // Client timezone for date handling
      createdAt: today, // Creation timestamp
    });

    if (status !== HttpStatusCode.Ok || !warehouseData) {
      return {
        status: HttpStatusCode.BadRequest,
        message: "Failed to send inbound order request to warehouse",
      };
    }

    // Get driver report for NEW status - required for tracking
    const newDriverReport = await getDriverReportByType(token.jwt, organizationId, OrderTripStatusType.NEW);

    // Generate unique order group code
    let orderGroupCode: string;
    let isGroupCodeExists: boolean;
    do {
      orderGroupCode = randomString(ORDER_GROUP_CODE_MIN_LENGTH, true);
      isGroupCodeExists = await checkOrderGroupCodeExists(orderGroupCode);
    } while (isGroupCodeExists);

    // Generate unique order code
    let orderCode: string;
    let isCodeExists: boolean;
    do {
      orderCode = randomString(ORDER_CODE_MIN_LENGTH, true);
      isCodeExists = await checkOrderCodeExists(prisma, Number(organizationId), orderCode);
    } while (isCodeExists);

    // Generate order trip code based on order group code
    const orderTripCode = generateOrderTripCode(ensureString(orderGroupCode), 1);

    // Start database transaction
    const internalOrderGroupId = await prisma.$transaction(async (prisma) => {
      // Find or create internal customer
      let customer = await prisma.customer.findFirst({ where: { organizationId, code: INTERNAL_CUSTOMER_CODE } });

      if (!customer?.id) {
        customer = await prisma.customer.create({
          data: {
            organizationId,
            code: INTERNAL_CUSTOMER_CODE,
            name: organizationName,
            type: CustomerType.CASUAL,
            createdAt: currentDate,
            CustomersCreatedByUserLinks: {
              create: {
                userId: token.user.id,
              },
            },
            updatedAt: currentDate,
            CustomersUpdatedByUserLinks: {
              create: {
                userId: token.user.id,
              },
            },
            publishedAt: currentDate,
          },
        });
      }

      // Create new order group with initial statuses
      const internalOrderGroup = await prisma.orderGroup.create({
        data: {
          organizationId,
          code: orderGroupCode,
          lastStatusType: OrderGroupStatusType.IN_PROGRESS,
          publishedAt: currentDate,
          OrderGroupStatusesGroupLinks: {
            create: [
              {
                orderGroupStatus: {
                  create: {
                    type: OrderGroupStatusType.PLAN,
                    organizationId,
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
              {
                orderGroupStatus: {
                  create: {
                    type: OrderGroupStatusType.APPROVED,
                    organizationId,
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
              {
                orderGroupStatus: {
                  create: {
                    type: OrderGroupStatusType.IN_PROGRESS,
                    organizationId,
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
            ],
          },
        },
      });

      // Update order group to INBOUND status and create relationships
      await prisma.orderGroup.update({
        where: { id: Number(orderGroup.id) },
        data: {
          lastStatusType: OrderGroupStatusType.INBOUND,
          updatedAt: currentDate,
          OrderGroupsWarehouseLinks: {
            create: {
              wareHouseId: Number(warehouse.id),
            },
          },
          OrderGroupStatusesGroupLinks: {
            create: [
              {
                orderGroupStatus: {
                  create: {
                    type: OrderGroupStatusType.INBOUND,
                    organizationId,
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
            ],
          },
          OrderGroupProcessByOrderLinks: {
            create: {
              order: {
                create: {
                  organizationId,
                  code: orderCode,
                  // orderDate: fromZonedTime(pickupDate, clientTimezone),
                  orderDate: pickupDate as Date,
                  // deliveryDate: fromZonedTime(deliveryDate, clientTimezone),
                  deliveryDate: deliveryDate || null,
                  lastStatusType: OrderStatusType.IN_PROGRESS,
                  isDraft: false,
                  weight: weight || 0,
                  cbm: cbm || 0,
                  type: OrderType.IMPORT,
                  OrdersCustomerLinks: {
                    create: {
                      customerId: Number(customer.id),
                    },
                  },
                  OrdersUnitOfMeasureLinks: {
                    create: {
                      unitOfMeasureId: unitOfMeasure?.id ? Number(unitOfMeasure.id) : -1,
                    },
                  },
                  OrdersRouteLinks: {
                    create: {
                      route: {
                        create: {
                          organizationId,
                          customerId: Number(customer.id),
                          type: RouteType.NON_FIXED,
                          isActive: true,
                          code: randomRouteCode,
                          name: randomRouteCode,
                          createdAt: currentDate,
                          RoutesCreatedByUserLinks: {
                            create: {
                              userId: token.user.id,
                            },
                          },
                          updatedAt: currentDate,
                          RoutesUpdatedByUserLinks: {
                            create: {
                              userId: token.user.id,
                            },
                          },
                          publishedAt: currentDate,
                          RoutesDeliveryPointsLinks: {
                            create: warehouse.address?.id
                              ? [
                                  {
                                    routePointId: Number(warehouse.address.id),
                                  },
                                ]
                              : {
                                  routePoint: {
                                    create: {
                                      organizationId,
                                      code: randomString(DEFAULT_ROUTE_POINT_CODE_LENGTH, true),
                                      name: organizationName,
                                      contactName: "",
                                      contactEmail: "",
                                      contactPhoneNumber: "",
                                      notes: "",
                                      isActive: true,
                                      createdAt: currentDate,
                                      RoutePointsCreatedByUserLinks: {
                                        create: {
                                          userId: token.user.id,
                                        },
                                      },
                                      updatedAt: currentDate,
                                      RoutePointsUpdatedByUserLinks: {
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
                      },
                    },
                  },
                  OrdersParticipantsLinks: {
                    create: {
                      orderParticipant: {
                        create: {
                          organizationId,
                          role: OrderParticipantRole.OWNER,
                          createdAt: currentDate,
                          OrderParticipantsUserLinks: {
                            create: {
                              userId: token.user.id,
                            },
                          },
                          OrderParticipantsCreatedByUserLinks: {
                            create: {
                              userId: token.user.id,
                            },
                          },
                          updatedAt: currentDate,
                          OrderParticipantsUpdatedByUserLinks: {
                            create: {
                              userId: token.user.id,
                            },
                          },
                          publishedAt: currentDate,
                        },
                      },
                    },
                  },
                  OrderStatusesOrderLinks: {
                    create: [
                      {
                        orderStatusOrder: 1,
                        orderStatus: {
                          create: {
                            organizationId,
                            type: OrderStatusType.NEW,
                            createdAt: currentDate,
                            OrderStatusesCreatedByUserLinks: {
                              create: {
                                userId: token.user.id,
                              },
                            },
                            updatedAt: currentDate,
                            OrderStatusesUpdatedByUserLinks: {
                              create: {
                                userId: token.user.id,
                              },
                            },
                            publishedAt: currentDate,
                          },
                        },
                      },
                      {
                        orderStatusOrder: 2,
                        orderStatus: {
                          create: {
                            organizationId,
                            type: OrderStatusType.RECEIVED,
                            createdAt: currentDate,
                            OrderStatusesCreatedByUserLinks: {
                              create: {
                                userId: token.user.id,
                              },
                            },
                            updatedAt: currentDate,
                            OrderStatusesUpdatedByUserLinks: {
                              create: {
                                userId: token.user.id,
                              },
                            },
                            publishedAt: currentDate,
                          },
                        },
                      },
                      {
                        orderStatusOrder: 3,
                        orderStatus: {
                          create: {
                            organizationId,
                            type: OrderStatusType.IN_PROGRESS,
                            createdAt: currentDate,
                            OrderStatusesCreatedByUserLinks: {
                              create: {
                                userId: token.user.id,
                              },
                            },
                            updatedAt: currentDate,
                            OrderStatusesUpdatedByUserLinks: {
                              create: {
                                userId: token.user.id,
                              },
                            },
                            publishedAt: currentDate,
                          },
                        },
                      },
                    ],
                  },
                  OrderTripsOrderLinks: {
                    create: [
                      {
                        orderTrip: {
                          create: {
                            organizationId,
                            code: orderTripCode,
                            // pickupDate: fromZonedTime(pickupDate, clientTimezone),
                            pickupDate: pickupDate as Date,
                            // deliveryDate: fromZonedTime(deliveryDate, clientTimezone),
                            deliveryDate: deliveryDate || null,
                            lastStatusType: OrderTripStatusType.NEW,
                            weight: weight || 0,
                            OrderTripsDriverLinks: {
                              create: {
                                driverId: driver?.id ? Number(driver.id) : -1,
                              },
                            },
                            OrderTripsVehicleLinks: {
                              create: {
                                vehicleId: vehicle?.id ? Number(vehicle.id) : -1,
                              },
                            },
                            OrderTripStatusesTripLinks: {
                              create: [
                                {
                                  orderTripStatus: {
                                    create: {
                                      organizationId,
                                      type: OrderTripStatusType.NEW,
                                      createdAt: currentDate,
                                      OrderTripStatusesDriverReportLinks: {
                                        create: {
                                          driverReportId: newDriverReport?.id ? Number(newDriverReport.id) : -1,
                                        },
                                      },
                                      OrderTripStatusesCreatedByUserLinks: {
                                        create: {
                                          userId: token.user.id,
                                        },
                                      },
                                      updatedAt: currentDate,
                                      OrderTripStatusesUpdatedByUserLinks: {
                                        create: {
                                          userId: token.user.id,
                                        },
                                      },
                                      publishedAt: currentDate,
                                    },
                                  },
                                },
                              ],
                            },
                            createdAt: currentDate,
                            OrderTripsCreatedByUserLinks: {
                              create: {
                                userId: token.user.id,
                              },
                            },
                            updatedAt: currentDate,
                            OrderTripsUpdatedByUserLinks: {
                              create: {
                                userId: token.user.id,
                              },
                            },
                            publishedAt: currentDate,
                          },
                        },
                      },
                    ],
                  },
                  OrdersGroupLinks: {
                    create: {
                      orderGroupId: Number(internalOrderGroup.id),
                    },
                  },
                  createdAt: currentDate,
                  OrdersCreatedByUserLinks: {
                    create: {
                      userId: token.user.id,
                    },
                  },
                  updatedAt: currentDate,
                  OrdersUpdatedByUserLinks: {
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

      return internalOrderGroup.id;
    });

    // Send notification if requested
    if (sendNotification) {
      await updateOrderTripStatusAndSendNotificationByOrderGroupId({
        orderGroupId: internalOrderGroupId,
        organizationId,
        status: OrderTripStatusType.PENDING_CONFIRMATION,
      });
    }

    return {
      status: HttpStatusCode.Ok,
      data: internalOrderGroupId,
    };
  }
);

/**
 * Exports the order groups plan based on the provided filter request.
 *
 * This function is wrapped with an action exception handler to manage any exceptions
 * that may occur during the export process.
 *
 * @param token - The authentication token required for the export operation.
 * @param params - The filter request parameters used to filter the order groups.
 * @returns An object containing the status code and the exported order groups plan data.
 */
export const exportOrderGroupsPlanAcion = withActionExceptionHandler<FilterRequest<OrderGroupInfo>>(
  async (token, params) => {
    const result = await exportOrderGroupsPlan(token, params);
    return {
      status: HttpStatusCode.Ok,
      data: result?.url,
    };
  }
);

/**
 * Notifies TMS web about in-stock orders and updates their status
 *
 * This function performs the following steps:
 * 1. Starts a database transaction
 * 2. Iterates through the list of orders
 * 3. Updates the order group status to IN_STOCK
 * 4. Returns the result of the transaction
 *
 * @param requestData - The request data containing the organization ID, client timezone, current date, and list of orders
 * @returns The result of the transaction
 */
export const notifyAndUpdateStatusInStock = async (requestData: WarehouseNotifyRequest): Promise<number[]> => {
  const { organizationId, orders: orderGroupCodes, currentDate: today = new Date() } = requestData;
  const currentDate = today || new Date();

  // Get driver report for COMPLETED status - required for tracking - use `STRAPI_TOKEN_KEY` for the token
  const driverReport = await getDriverReportByType(STRAPI_TOKEN_KEY, organizationId, OrderTripStatusType.COMPLETED);
  if (!driverReport) {
    throw new Error("Driver report not found");
  }

  // Get the order groups
  const orderGroups = await prisma.orderGroup.findMany({
    where: {
      organizationId,
      code: { in: orderGroupCodes.map((group) => ensureString(group.code)) },
    },
    select: {
      id: true,
      code: true,
      OrderGroupProcessByOrderLinks: {
        select: { order: { select: { id: true, code: true } } },
      },
    },
  });

  // Start a database transaction
  const result = await prisma.$transaction(async (tx) => {
    // List of order group IDs
    const orderGroupIds: number[] = [];
    // Iterate through the list of orders
    for (const group of orderGroupCodes) {
      // Get the order ID from the order group
      const orderGroup = orderGroups.find((item) => item.code === ensureString(group.code));
      const orderId = orderGroup?.OrderGroupProcessByOrderLinks?.order?.id;
      const orderCode = orderGroup?.OrderGroupProcessByOrderLinks?.order?.code;

      // Update the order group status to IN_STOCK
      const updatedOrderGroup = await tx.orderGroup.update({
        where: { id: orderGroup?.id },
        data: {
          lastStatusType: OrderGroupStatusType.IN_STOCK,
          updatedAt: currentDate,
          OrderGroupStatusesGroupLinks: {
            create: [
              {
                orderGroupStatusOrder: 5,
                orderGroupStatus: {
                  create: {
                    organizationId,
                    type: OrderGroupStatusType.IN_STOCK,
                    createdAt: currentDate,
                    OrderGroupStatusesCreatedByUserLinks: {
                      create: {
                        userId: SYSTEM_ADMIN_ID,
                      },
                    },
                    updatedAt: currentDate,
                    OrderGroupStatusesUpdatedByUserLinks: {
                      create: {
                        userId: SYSTEM_ADMIN_ID,
                      },
                    },
                    publishedAt: currentDate,
                  },
                },
              },
            ],
          },
          OrderGroupProcessByOrderLinks: {
            update: {
              where: { orderId },
              data: {
                order: {
                  update: {
                    lastStatusType: OrderStatusType.COMPLETED,
                    // Update the order updated by user link
                    updatedAt: currentDate,
                    OrdersUpdatedByUserLinks: {
                      upsert: {
                        where: { userId: SYSTEM_ADMIN_ID },
                        update: { userId: SYSTEM_ADMIN_ID },
                        create: { userId: SYSTEM_ADMIN_ID },
                      },
                    },

                    // Update the order status to COMPLETED
                    OrderStatusesOrderLinks: {
                      create: {
                        orderStatusOrder: 4,
                        orderStatus: {
                          create: {
                            organizationId,
                            type: OrderStatusType.COMPLETED,
                            createdAt: currentDate,
                            OrderStatusesCreatedByUserLinks: {
                              create: {
                                userId: SYSTEM_ADMIN_ID,
                              },
                            },
                            updatedAt: currentDate,
                            OrderStatusesUpdatedByUserLinks: {
                              create: {
                                userId: SYSTEM_ADMIN_ID,
                              },
                            },
                            publishedAt: currentDate,
                          },
                        },
                      },
                    },

                    // Update the order trip status to COMPLETED
                    OrderTripsOrderLinks: {
                      update: {
                        where: { orderId },
                        data: {
                          orderTrip: {
                            update: {
                              lastStatusType: OrderTripStatusType.COMPLETED,
                              updatedAt: currentDate,
                              OrderTripStatusesTripLinks: {
                                create: {
                                  orderTripStatus: {
                                    create: {
                                      organizationId,
                                      type: OrderTripStatusType.COMPLETED,
                                      createdAt: currentDate,
                                      OrderTripStatusesDriverReportLinks: {
                                        create: {
                                          driverReportId: Number(driverReport.id),
                                        },
                                      },
                                      OrderTripStatusesCreatedByUserLinks: {
                                        create: {
                                          userId: SYSTEM_ADMIN_ID,
                                        },
                                      },
                                      updatedAt: currentDate,
                                      OrderTripStatusesUpdatedByUserLinks: {
                                        create: {
                                          userId: SYSTEM_ADMIN_ID,
                                        },
                                      },
                                      publishedAt: currentDate,
                                    },
                                  },
                                },
                              },
                              OrderTripsUpdatedByUserLinks: {
                                upsert: {
                                  where: { userId: SYSTEM_ADMIN_ID },
                                  update: { userId: SYSTEM_ADMIN_ID },
                                  create: { userId: SYSTEM_ADMIN_ID },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        select: { id: true },
      });

      // Send notification order completed
      pushNotification({
        entity: {
          type: NotificationType.ORDER_STATUS_CHANGED,
          organizationId,
          createdById: SYSTEM_ADMIN_ID,
          targetId: Number(orderId),
        },
        data: {
          orderCode: orderCode,
          orderGroupCode: orderGroup?.code,
          orderStatus: OrderStatusType.COMPLETED,
        },
        orgMemberRoles: [OrganizationRoleType.MANAGER, OrganizationRoleType.ACCOUNTANT],
        isSendToParticipants: true,
        jwt: STRAPI_TOKEN_KEY,
      });

      // Send notification order group in stock
      pushNotification({
        entity: {
          type: NotificationType.ORDER_GROUP_STATUS_CHANGED,
          organizationId,
          createdById: SYSTEM_ADMIN_ID,
          targetId: Number(orderGroup?.id),
        },
        data: {
          groupCode: orderGroup?.code,
          orderCode,
          orderGroupStatus: OrderGroupStatusType.IN_STOCK,
        },
        orgMemberRoles: [OrganizationRoleType.DISPATCH_MANAGER, OrganizationRoleType.MANAGER],
        isSendToParticipants: true,
        jwt: STRAPI_TOKEN_KEY,
      });

      orderGroupIds.push(updatedOrderGroup.id);
    }

    return orderGroupIds;
  });

  return result;
};

/**
 * Notifies TMS web about in-progress orders and updates their status
 *
 * This function performs the following steps:
 * 1. Starts a database transaction
 * 2. Iterates through the list of orders
 * 3. Updates the order group status to IN_PROGRESS
 * 4. Returns the result of the transaction
 *
 * @param requestData - The request data containing the organization ID, client timezone, current date, and list of orders
 * @returns The result of the transaction
 */
export const notifyAndUpdateStatusInProgress = async (requestData: WarehouseNotifyRequest): Promise<number[]> => {
  const { organizationId, orders: orderGroupCodes, currentDate: today } = requestData;
  const currentDate = today || new Date();

  // Start a database transaction
  const result = await prisma.$transaction(async (tx) => {
    // List of order group IDs
    const orderGroupIds: number[] = [];
    // Iterate through the list of orders
    for (const group of orderGroupCodes) {
      // Update the order group status to IN_PROGRESS
      const updatedOrderGroup = await tx.orderGroup.update({
        where: {
          organizationId,
          code: ensureString(group.code),
        },
        data: {
          lastStatusType: OrderGroupStatusType.IN_PROGRESS,
          updatedAt: currentDate,
          OrderGroupStatusesGroupLinks: {
            create: [
              {
                orderGroupStatusOrder: 6,
                orderGroupStatus: {
                  create: {
                    organizationId,
                    type: OrderGroupStatusType.IN_PROGRESS,
                    createdAt: currentDate,
                    OrderGroupStatusesCreatedByUserLinks: {
                      create: {
                        userId: SYSTEM_ADMIN_ID,
                      },
                    },
                    updatedAt: currentDate,
                    OrderGroupStatusesUpdatedByUserLinks: {
                      create: {
                        userId: SYSTEM_ADMIN_ID,
                      },
                    },
                    publishedAt: currentDate,
                  },
                },
              },
            ],
          },
        },
        select: { id: true },
      });

      // Send notification order group in stock
      pushNotification({
        entity: {
          type: NotificationType.ORDER_GROUP_STATUS_CHANGED,
          organizationId,
          createdById: SYSTEM_ADMIN_ID,
          targetId: Number(updatedOrderGroup?.id),
        },
        data: {
          groupCode: group?.code,
          orderGroupStatus: "EXPORTED", // Đơn hàng xuất kho thành công thì tạo status tạm này. Trạng thái này không được quản lý trong hệ thống
        },
        orgMemberRoles: [OrganizationRoleType.DISPATCH_MANAGER, OrganizationRoleType.MANAGER],
        isSendToParticipants: false,
        jwt: STRAPI_TOKEN_KEY,
      });

      orderGroupIds.push(updatedOrderGroup.id);
    }

    return orderGroupIds;
  });

  return result;
};

/**
 * Notifies TMS web about close-to-expiry orders and updates their status
 *
 * This function performs the following steps:
 * 1. Starts a database transaction
 * 2. Iterates through the list of orders
 * 3. Updates the order group status to CLOSE_TO_EXPIRE
 * 4. Returns the result of the transaction
 *
 * @param requestData - The request data containing the organization ID, client timezone, current date, and list of orders
 * @returns The result of the transaction
 */
export const notifyAndUpdateStatusCloseToExpiry = async (requestData: WarehouseNotifyRequest): Promise<number[]> => {
  const { organizationId, orders: orderGroupCodes } = requestData;

  // Start a database transaction
  const result = await prisma.$transaction(async (tx) => {
    // List of order group IDs
    const orderGroupIds: number[] = [];

    for (const group of orderGroupCodes) {
      const orderGroup = await tx.orderGroup.findUnique({
        where: {
          organizationId,
          code: ensureString(group.code),
        },
        select: { id: true },
      });

      // Send notification if the order group exists
      if (orderGroup?.id) {
        pushNotification({
          entity: {
            type: NotificationType.ORDER_GROUP_CLOSE_TO_EXPIRE,
            organizationId,
            createdById: SYSTEM_ADMIN_ID,
            targetId: Number(orderGroup.id),
          },
          data: {
            groupCode: ensureString(group.code),
          },
          jwt: STRAPI_TOKEN_KEY,
          orgMemberRoles: [
            OrganizationRoleType.DISPATCH_MANAGER,
            OrganizationRoleType.DISPATCHER,
            OrganizationRoleType.MANAGER,
          ],
          receivers: [],
          isSendToParticipants: false,
        });
        orderGroupIds.push(orderGroup?.id);
      }
    }

    return orderGroupIds;
  });

  return result;
};

/**
 * Get order group by trip ID
 *
 * This function performs the following steps:
 * 1. Starts a database transaction
 * 2. Iterates through the list of orders
 * 3. Updates the order group status to CLOSE_TO_EXPIRE
 * 4. Returns the result of the transaction
 */
export const getOrderGroupByTripId = withActionExceptionHandler<{ tripId: number }, OrderTripInfo>(
  async (token, params) => {
    const { tripId } = params;

    const query = gql`
      query ($id: ID!) {
        orderTrip(id: $id) {
          data {
            id
            attributes {
              order {
                data {
                  id
                  attributes {
                    group {
                      data {
                        id
                        attributes {
                          code
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const { data } = await fetcher<OrderTripInfo>(token.jwt, query, {
      id: tripId,
    });

    return {
      status: HttpStatusCode.Ok,
      data: data?.orderTrip,
    };
  }
);
