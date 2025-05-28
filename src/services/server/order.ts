import {
  CustomerType,
  OrderStatusType,
  OrderTripStatusType,
  OrganizationSettingOrderCodeGenerationType,
  Prisma,
  RouteType,
  UnitOfMeasureType,
} from "@prisma/client";
import { gql } from "graphql-request";
import { camelCase } from "lodash";

import { getOrderRouteStatusByOrderId } from "@/actions/order-route-status";
import { getOrganizationSettingExtended } from "@/actions/organizationSettingExtended";
import { AUTO_DISPATCH_URL, STRAPI_TOKEN_KEY } from "@/configs/environment";
import { prisma, PrismaClientTransaction } from "@/configs/prisma";
import { ORDER_CODE_MIN_LENGTH } from "@/constants/organizationSetting";
import { DateTimeDisplayType, OrganizationSettingExtendedKey } from "@/constants/organizationSettingExtended";
import { CustomerInputForm } from "@/forms/customer";
import { OrderInputForm } from "@/forms/order";
import { OrderRouteStatusInputForm } from "@/forms/orderRouteStatus";
import { RouteInputForm } from "@/forms/route";
import { RoutePointInputForm } from "@/forms/routePoint";
import { upsertAddressInformationByGraphQL } from "@/services/server/addressInformation";
import { createBankAccount } from "@/services/server/bankAccount";
import { createCustomerByGraphQL, updateCustomerByGraphQL } from "@/services/server/customer";
import { createOrderItemByGraphQL, upsertOrderItemByGraphQL } from "@/services/server/orderItem";
import {
  createOrderParticipantByGraphQL,
  getOrderParticipantByOrderId,
  updateOrderParticipantByGraphQL,
} from "@/services/server/orderParticipant";
import { createOrderRouteStatusByGraphQL, upsertOrderRouteStatusByGraphQL } from "@/services/server/orderRouteStatus";
import { createOrderStatusByGraphQL } from "@/services/server/orderStatus";
import { getOrganizationMemberByMemberId } from "@/services/server/organizationMember";
import { getAutoDispatchSetting } from "@/services/server/organizationSetting";
import { createRouteByGraphQL, updateRouteByGraphQL } from "@/services/server/route";
import { upsertRoutePointByGraphQL } from "@/services/server/routePoint";
import { AnyObject } from "@/types";
import { AutoDispatch } from "@/types/auto-dispatch";
import { OrderInfo, OrganizationSettingInfo, VehicleInfo } from "@/types/strapi";
import { post } from "@/utils/api";
import { formatDate, minusDays, minusMonths, minusWeeks } from "@/utils/date";
import { fetcher } from "@/utils/graphql";
import { createTranslator } from "@/utils/locale";
import logger from "@/utils/logger";
import { equalId } from "@/utils/number";
import { generateCustomerSpecificOrderCode, generateRouteSpecificOrderCode } from "@/utils/order";
import { ensureString, joinNonEmptyStrings, randomString } from "@/utils/string";

/**
 * Checks if an order with a specific code exists in a given organization.
 *
 * @param {string} jwt - JSON Web Token for authentication.
 * @param {number} organizationId - The ID of the organization to check within.
 * @param {string} code - The code of the order to check for existence.
 * @returns {Promise<boolean>} - Returns `true` if an order with the specified code exists, otherwise `false`.
 */
export const checkOrderCodeModalExists = async (
  jwt: string,
  organizationId: number,
  code: string
): Promise<boolean> => {
  const query = gql`
    query ($organizationId: Int!, $code: String!) {
      orders(filters: { organizationId: { eq: $organizationId }, code: { eq: $code }, publishedAt: { ne: null } }) {
        data {
          id
        }
      }
    }
  `;
  const { data } = await fetcher<OrderInfo[]>(jwt, query, {
    code,
    organizationId,
  });

  return data.orders.length > 0;
};

/**
 * Checks if a order code exists within an organization, optionally excluding a specific order ID.
 *
 * @param {PrismaClientTransaction} prisma - The Prisma client for database access.
 * @param {number} organizationId - The ID of the organization to search within.
 * @param {string} code - The order code to check for.
 * @param {number | undefined} excludeId - (Optional) The ID of a order to exclude from the check.
 * @returns {Promise<boolean>} A promise that resolves to true if the order code exists, otherwise false.
 */
export const checkOrderCodeExists = async (
  prisma: PrismaClientTransaction,
  organizationId: number,
  code: string,
  excludeId?: number
): Promise<boolean> => {
  const result = await prisma.order.findFirst({
    where: {
      organizationId,
      code,
      ...(excludeId && { id: { not: excludeId } }),
    },
    select: { id: true },
  });

  return !!result?.id;
};

/**
 * Processes route points and statuses by inserting or updating records in GraphQL,
 * then returns the IDs of the created or updated route points and statuses.
 *
 * @param {string} jwt - JSON Web Token for authentication in GraphQL requests.
 * @param {number} organizationId - The ID of the organization to which the route points and statuses belong.
 * @param {RoutePointInputForm[]} routePoints - Array of route points to be processed.
 * @param {OrderRouteStatusInputForm[]} routeStatuses - Array of route statuses associated with the route points.
 * @param {number | null} userId - ID of the user making the request; used as the creator/updater of the records.
 * @returns {Promise<{ routePointIds: RoutePointInputForm[]; routeStatusIds: number[] }>} - Promise resolving with IDs of processed route points and statuses.
 */
const processRoutePoints = async (
  jwt: string,
  organizationId: number,
  routePoints: RoutePointInputForm[],
  routeStatuses: OrderRouteStatusInputForm[],
  userId: number | null
): Promise<{ routePointIds: RoutePointInputForm[]; routeStatusIds: number[] }> => {
  // Arrays to collect IDs of the processed route points and statuses
  const routePointIds: RoutePointInputForm[] = [];
  const routeStatusIds: number[] = [];

  // Loop through each route point
  for (const point of routePoints || []) {
    let addressId: number | null = null;

    // Step 1: Process the address if it exists
    if (point.address) {
      const addressInformation = await upsertAddressInformationByGraphQL(jwt, {
        ...point.address,
        createdById: userId,
        updatedById: userId,
      });
      addressId = addressInformation?.id ? Number(addressInformation.id) : null;
    }

    // Step 2: Insert or update route point
    const routePoint = await upsertRoutePointByGraphQL(jwt, {
      ...point,
      organizationId,
      address: { id: addressId ?? undefined },
    });
    routePoint?.id && routePointIds.push({ id: routePoint.id });

    // Step 3: Process corresponding route status if the route point ID is present
    if (point.id) {
      const routeStatus = routeStatuses?.find((status) => equalId(status.routePoint?.id, point?.id));
      const orderRouteStatusResult = await upsertOrderRouteStatusByGraphQL(jwt, {
        ...routeStatus,
        organizationId,
        createdById: userId,
        updatedById: userId,
        routePoint: { id: routePoint.id },
      });
      orderRouteStatusResult?.id && routeStatusIds.push(Number(orderRouteStatusResult.id));
    }

    // Step 4: Handle temporary IDs if `tempId` exists
    else if ("tempId" in point) {
      const routeStatus = routeStatuses?.find(
        (status) => status.routePoint && "tempId" in status.routePoint && status.routePoint?.tempId === point?.tempId
      );
      const orderRouteStatusResult = await upsertOrderRouteStatusByGraphQL(jwt, {
        ...routeStatus,
        organizationId,
        createdById: userId,
        updatedById: userId,
        routePoint: { id: routePoint.id },
      });
      orderRouteStatusResult?.id && routeStatusIds.push(Number(orderRouteStatusResult.id));
    }
  }

  // Return processed route point and status IDs
  return { routePointIds, routeStatusIds };
};

/**
 * Creates a new order with specified details, including customer and route information.
 *
 * @param {string} jwt - JSON Web Token for authentication.
 * @param {OrderInputForm} orderData - The order data, including customer, route, and other order-related fields.
 * @param {OrganizationSettingInfo} organizationSetting - The organization settings that dictate order generation rules.
 * @returns {Promise<OrderInfo>} - A promise that resolves with the created order information.
 */
export const createOrder = async (
  jwt: string,
  orderData: OrderInputForm,
  organizationSetting: OrganizationSettingInfo
): Promise<OrderInfo> => {
  // Destructure relevant fields from orderData
  const { organizationId, customer, route, isDraft, participants, items, routeStatuses, createdById, ...rest } =
    orderData;

  let customerId: number | null = null;

  // Create a new customer if the type is CASUAL
  if (customer?.type === CustomerType.CASUAL) {
    const bankAccount = await createBankAccount(jwt, { ...customer.bankAccount, createdById });
    const result = await createCustomerByGraphQL(jwt, { ...customer, organizationId, createdById, bankAccount });
    customerId = result?.id ? Number(result.id) : null;
  }
  // Use existing customer ID if the type is FIXED
  else if (customer?.type === CustomerType.FIXED && customer?.id) {
    customerId = Number(customer?.id);
  }

  let routeId: number | null = null;
  const routeStatusIds: number[] = [];

  // Process route points if the route is NON_FIXED
  if (route?.type === RouteType.NON_FIXED && customerId) {
    const { routePointIds: pickupPointIds, routeStatusIds: pickupStatusIds } = await processRoutePoints(
      jwt,
      organizationId as number,
      route?.pickupPoints || [],
      routeStatuses || [],
      createdById as number
    );
    routeStatusIds.push(...pickupStatusIds);

    const { routePointIds: deliveryPointIds, routeStatusIds: deliveryStatusIds } = await processRoutePoints(
      jwt,
      organizationId as number,
      route?.deliveryPoints || [],
      routeStatuses || [],
      createdById as number
    );
    routeStatusIds.push(...deliveryStatusIds);

    // Create a new route
    const createdResult = await createRouteByGraphQL(jwt, {
      ...route,
      pickupPoints: pickupPointIds,
      deliveryPoints: deliveryPointIds,
      organizationId,
      customerId,
      createdById,
    });
    routeId = createdResult?.id ? Number(createdResult.id) : null;
  }
  // Use existing route ID if the route is FIXED
  else if (route?.type === RouteType.FIXED && route?.id) {
    routeId = Number(route?.id);
    // Create route statuses for existing route
    for (const routeStatus of routeStatuses || []) {
      const result = await createOrderRouteStatusByGraphQL(jwt, { ...routeStatus, organizationId, createdById });
      result?.id && routeStatusIds.push(Number(result.id));
    }
  }

  // Generate a unique order code based on organization settings
  const { orderCodeGenerationType, orderCodeMaxLength, customerCodePrefixMaxLength, routeCodePrefixMaxLength } =
    organizationSetting;

  let orderCode: string;
  let isCodeExists: boolean;

  do {
    switch (orderCodeGenerationType) {
      case OrganizationSettingOrderCodeGenerationType.CUSTOMER_SPECIFIC:
        orderCode = generateCustomerSpecificOrderCode(orderCodeMaxLength, customerCodePrefixMaxLength, customer?.code);
        break;
      case OrganizationSettingOrderCodeGenerationType.ROUTE_SPECIFIC:
        orderCode = generateRouteSpecificOrderCode(orderCodeMaxLength, routeCodePrefixMaxLength, route?.code);
        break;
      default:
        orderCode = randomString(orderCodeMaxLength || ORDER_CODE_MIN_LENGTH, true);
        break;
    }
    isCodeExists = await checkOrderCodeExists(prisma, Number(organizationId), orderCode);
  } while (isCodeExists);

  // Define GraphQL mutation for creating the order
  const mutationQuery = gql`
    mutation (
      $organizationId: Int!
      $code: String!
      $customer: ID
      $route: ID
      $routeStatuses: [ID]
      $orderDate: DateTime!
      $deliveryDate: DateTime
      $unit: ID
      $weight: Float
      $cbm: Float
      $totalAmount: Float
      $paymentDueDate: Date
      $notes: String
      $merchandiseTypes: [ID]
      $items: [ID]
      $merchandiseNote: String
      $participants: [ID]
      $paymentDate: Date
      $isDraft: Boolean
      $statuses: [ID]
      $lastStatusType: ENUM_ORDER_LASTSTATUSTYPE
      $meta: JSON
      $createdByUser: ID
      $updatedByUser: ID
      $publishedAt: DateTime
    ) {
      createOrder(
        data: {
          organizationId: $organizationId
          code: $code
          customer: $customer
          route: $route
          routeStatuses: $routeStatuses
          orderDate: $orderDate
          deliveryDate: $deliveryDate
          unit: $unit
          weight: $weight
          cbm: $cbm
          totalAmount: $totalAmount
          paymentDueDate: $paymentDueDate
          notes: $notes
          merchandiseTypes: $merchandiseTypes
          items: $items
          merchandiseNote: $merchandiseNote
          participants: $participants
          paymentDate: $paymentDate
          isDraft: $isDraft
          statuses: $statuses
          lastStatusType: $lastStatusType
          meta: $meta
          createdByUser: $createdByUser
          updatedByUser: $updatedByUser
          publishedAt: $publishedAt
        }
      ) {
        data {
          id
          attributes {
            code
          }
        }
      }
    }
  `;

  // Execute the GraphQL mutation to create the order
  const { data } = await fetcher<OrderInfo>(jwt, mutationQuery, {
    organizationId: Number(organizationId),
    code: orderCode,
    orderDate: rest.orderDate ? rest.orderDate : new Date().toISOString(),
    ...(customerId && { customer: customerId }),
    ...(routeId && { route: routeId }),
    ...(routeStatusIds && { routeStatuses: routeStatusIds }),
    ...(rest.deliveryDate && { deliveryDate: rest.deliveryDate }),
    ...(rest.unit?.id && { unit: Number(rest.unit.id) }),
    ...(rest.weight && { weight: rest.weight }),
    ...(rest.cbm && { cbm: rest.cbm }),
    ...(rest.totalAmount && { totalAmount: rest.totalAmount }),
    ...(rest.paymentDueDate && { paymentDueDate: rest.paymentDueDate }),
    ...(rest.notes && { notes: rest.notes }),
    ...(rest.merchandiseTypes && { merchandiseTypes: rest.merchandiseTypes.map((item) => item.id) }),
    ...(rest.merchandiseNote && { merchandiseNote: rest.merchandiseNote }),
    ...(rest.paymentDate && { paymentDate: rest.paymentDate }),
    ...(rest.meta && { meta: JSON.stringify(rest.meta) }),
    isDraft,
    createdByUser: createdById,
    updatedByUser: createdById,
    publishedAt: new Date().toISOString(),
  });

  const orderId = data.createOrder?.id ? Number(data.createOrder.id) : null;
  const participantIds: number[] = [];

  // If order was created successfully, create order items and participants
  if (orderId) {
    for (const item of items || []) {
      await createOrderItemByGraphQL(jwt, { ...item, order: { id: orderId }, organizationId });
    }

    for (const participant of participants || []) {
      const result = await createOrderParticipantByGraphQL(jwt, {
        ...participant,
        orderId,
        organizationId,
        createdById,
      });
      participantIds.push(result.id);
    }

    // Update the order with participant IDs if any were added
    if (participantIds.length > 0) {
      await updateOrderPartial(jwt, { id: orderId, participantIds, updatedById: createdById });
    }

    // If the order is not a draft, create a new order status
    if (!isDraft) {
      await createOrderStatusByGraphQL(jwt, {
        organizationId,
        type: OrderStatusType.NEW,
        order: { id: orderId },
        createdById,
      });
    }
  }

  // Return the created order information
  return data.createOrder;
};

/**
 * Updates an order with the provided details.
 *
 * @param {string} jwt - The JSON Web Token for authentication.
 * @param {OrderInputForm} entity - The order entity containing the updated details.
 * @param {CustomerInputForm} lastCustomer - The last customer associated with the order.
 * @param {RouteInputForm} lastRoute - The last route associated with the order.
 * @param {OrganizationSettingInfo} organizationSetting - The organization settings.
 * @returns {Promise<OrderInfo>} - A promise that resolves to the updated order information.
 */
export const updateOrder = async (
  jwt: string,
  entity: OrderInputForm,
  lastCustomer: CustomerInputForm,
  lastRoute: RouteInputForm,
  organizationSetting: OrganizationSettingInfo
): Promise<OrderInfo> => {
  const { organizationId, code, customer, route, isDraft, participants, items, routeStatuses, updatedById, ...rest } =
    entity;
  const { orderCodeGenerationType, orderCodeMaxLength, customerCodePrefixMaxLength } = organizationSetting;
  const isSameCustomer = equalId(lastCustomer.id, customer?.id);
  const isSameRoute = equalId(lastRoute.id, route?.id);
  let changedCode = code;
  let isCodeExists: boolean;
  let customerId: number | null = null;

  if (isSameCustomer) {
    if (customer?.id) {
      customerId = customer.id;
      if (customer?.type === CustomerType.CASUAL) {
        await updateCustomerByGraphQL(jwt, { ...customer, organizationId, updatedById });
      }
    } else {
      if (customer?.type === CustomerType.CASUAL) {
        const bankAccount = await createBankAccount(jwt, { ...customer.bankAccount, createdById: updatedById });
        const result = await createCustomerByGraphQL(jwt, {
          ...customer,
          organizationId,
          createdById: updatedById,
          bankAccount,
        });
        customerId = result?.id ?? null;
      }
    }
  } else {
    if (customer?.type === CustomerType.CASUAL) {
      const bankAccount = await createBankAccount(jwt, { ...customer.bankAccount, createdById: updatedById });
      const result = await createCustomerByGraphQL(jwt, {
        ...customer,
        organizationId,
        createdById: updatedById,
        bankAccount,
      });
      customerId = result?.id ?? null;
    } else if (customer?.type === CustomerType.FIXED && customer?.id) {
      customerId = customer.id ?? null;
    }

    if (orderCodeGenerationType === OrganizationSettingOrderCodeGenerationType.CUSTOMER_SPECIFIC && customer?.code) {
      do {
        changedCode = generateCustomerSpecificOrderCode(orderCodeMaxLength, customerCodePrefixMaxLength, customer.code);
        isCodeExists = await checkOrderCodeExists(prisma, Number(organizationId), changedCode);
      } while (isCodeExists);
    }
  }

  let routeId: number | null = null;
  const routeStatusIds: number[] = [];
  if (isSameRoute) {
    if (route?.id) {
      if (route?.type === RouteType.NON_FIXED && customerId) {
        routeId = route.id;
        const { routePointIds: pickupPointIds, routeStatusIds: pickupStatusIds } = await processRoutePoints(
          jwt,
          organizationId as number,
          route?.pickupPoints || [],
          routeStatuses || [],
          updatedById as number
        );
        routeStatusIds.push(...pickupStatusIds);

        const { routePointIds: deliveryPointIds, routeStatusIds: deliveryStatusIds } = await processRoutePoints(
          jwt,
          organizationId as number,
          route?.deliveryPoints || [],
          routeStatuses || [],
          updatedById as number
        );
        routeStatusIds.push(...deliveryStatusIds);

        await updateRouteByGraphQL(jwt, {
          ...route,
          pickupPoints: pickupPointIds,
          deliveryPoints: deliveryPointIds,
          organizationId,
          customerId,
          updatedById,
        });
      } else if (route?.type === RouteType.FIXED) {
        routeId = route.id;
        const currentRouteStatuses = await getOrderRouteStatusByOrderId(jwt, rest.id);
        for (const routeStatus of routeStatuses || []) {
          const result = await upsertOrderRouteStatusByGraphQL(
            jwt,
            {
              ...routeStatus,
              organizationId,
              createdById: updatedById,
              updatedById,
            },
            currentRouteStatuses.find((status) => equalId(status.routePoint?.id, routeStatus.routePoint?.id))
          );
          result?.id && routeStatusIds.push(Number(result.id));
        }
      }
    } else {
      if (route?.type === RouteType.NON_FIXED && customerId) {
        const { routePointIds: pickupPointIds, routeStatusIds: pickupStatusIds } = await processRoutePoints(
          jwt,
          organizationId as number,
          route?.pickupPoints || [],
          routeStatuses || [],
          updatedById as number
        );
        routeStatusIds.push(...pickupStatusIds);

        const { routePointIds: deliveryPointIds, routeStatusIds: deliveryStatusIds } = await processRoutePoints(
          jwt,
          organizationId as number,
          route?.deliveryPoints || [],
          routeStatuses || [],
          updatedById as number
        );
        routeStatusIds.push(...deliveryStatusIds);

        const createdResult = await createRouteByGraphQL(jwt, {
          ...route,
          pickupPoints: pickupPointIds,
          deliveryPoints: deliveryPointIds,
          organizationId,
          customerId,
          updatedById,
        });
        routeId = createdResult?.id ? Number(createdResult.id) : null;
      }
    }
  } else {
    if (route?.id) {
      if (route?.type === RouteType.NON_FIXED && customerId) {
        const { routePointIds: pickupPointIds, routeStatusIds: pickupStatusIds } = await processRoutePoints(
          jwt,
          organizationId as number,
          route?.pickupPoints || [],
          routeStatuses || [],
          updatedById as number
        );
        routeStatusIds.push(...pickupStatusIds);

        const { routePointIds: deliveryPointIds, routeStatusIds: deliveryStatusIds } = await processRoutePoints(
          jwt,
          organizationId as number,
          route?.deliveryPoints || [],
          routeStatuses || [],
          updatedById as number
        );
        routeStatusIds.push(...deliveryStatusIds);

        const result = await updateRouteByGraphQL(jwt, {
          ...route,
          pickupPoints: pickupPointIds,
          deliveryPoints: deliveryPointIds,
          organizationId,
          customerId,
          updatedById,
        });
        routeId = result?.id ?? null;
      } else if (route?.type === RouteType.FIXED) {
        routeId = route.id;
        const currentRouteStatuses = await getOrderRouteStatusByOrderId(jwt, rest.id);
        for (const routeStatus of routeStatuses || []) {
          const result = await upsertOrderRouteStatusByGraphQL(
            jwt,
            {
              ...routeStatus,
              organizationId,
              createdById: updatedById,
              updatedById,
            },
            currentRouteStatuses.find((status) => equalId(status.routePoint?.id, routeStatus.routePoint?.id))
          );
          result?.id && routeStatusIds.push(Number(result.id));
        }
      }
    } else {
      if (route?.type === RouteType.NON_FIXED && customerId) {
        const { routePointIds: pickupPointIds, routeStatusIds: pickupStatusIds } = await processRoutePoints(
          jwt,
          organizationId as number,
          route?.pickupPoints || [],
          routeStatuses || [],
          updatedById as number
        );
        routeStatusIds.push(...pickupStatusIds);

        const { routePointIds: deliveryPointIds, routeStatusIds: deliveryStatusIds } = await processRoutePoints(
          jwt,
          organizationId as number,
          route?.deliveryPoints || [],
          routeStatuses || [],
          updatedById as number
        );
        routeStatusIds.push(...deliveryStatusIds);

        const createdResult = await createRouteByGraphQL(jwt, {
          ...route,
          pickupPoints: pickupPointIds,
          deliveryPoints: deliveryPointIds,
          organizationId,
          customerId,
          updatedById,
        });
        routeId = createdResult?.id ? Number(createdResult.id) : null;
      } else if (route?.type === RouteType.FIXED) {
        for (const routeStatus of routeStatuses || []) {
          const currentRouteStatuses = await getOrderRouteStatusByOrderId(jwt, rest.id);
          const result = await upsertOrderRouteStatusByGraphQL(
            jwt,
            {
              ...routeStatus,
              organizationId,
              createdById: updatedById,
              updatedById,
            },
            currentRouteStatuses.find((status) => equalId(status.routePoint?.id, routeStatus.routePoint?.id))
          );
          result?.id && routeStatusIds.push(Number(result.id));
        }
      }
    }
  }

  const currentParticipants = await getOrderParticipantByOrderId(jwt, { organizationId, orderId: entity.id });
  const participantIds: number[] = [];
  for (const participant of participants || []) {
    const currentParticipant = currentParticipants.find((p) => equalId(p.user?.id, participant.user?.id));
    if (currentParticipant) {
      const result = await updateOrderParticipantByGraphQL(jwt, {
        ...participant,
        id: currentParticipant.id,
        organizationId,
        orderId: entity.id,
        updatedById,
      });
      participantIds.push(result.id);
    } else {
      const result = await createOrderParticipantByGraphQL(jwt, {
        ...participant,
        organizationId,
        orderId: entity.id,
        createdById: updatedById,
      });
      participantIds.push(result.id);
    }
  }

  const query = gql`
    mutation (
      $id: ID!
      $code: String!
      $customer: ID
      $route: ID
      $orderDate: DateTime
      $deliveryDate: DateTime
      $unit: ID
      $weight: Float
      $cbm: Float
      $totalAmount: Float
      $paymentDueDate: Date
      $notes: String
      $merchandiseTypes: [ID]
      $merchandiseNote: String
      $items: [ID]
      $participants: [ID]
      $isDraft: Boolean
      $paymentDate: Date
      $statuses: [ID]
      $routeStatuses: [ID]
      $lastStatusType: ENUM_ORDER_LASTSTATUSTYPE
      $meta: JSON
      $updatedByUser: ID
    ) {
      updateOrder(
        id: $id
        data: {
          code: $code
          customer: $customer
          route: $route
          orderDate: $orderDate
          deliveryDate: $deliveryDate
          unit: $unit
          weight: $weight
          cbm: $cbm
          totalAmount: $totalAmount
          paymentDueDate: $paymentDueDate
          notes: $notes
          merchandiseTypes: $merchandiseTypes
          merchandiseNote: $merchandiseNote
          items: $items
          participants: $participants
          isDraft: $isDraft
          paymentDate: $paymentDate
          statuses: $statuses
          routeStatuses: $routeStatuses
          lastStatusType: $lastStatusType
          meta: $meta
          updatedByUser: $updatedByUser
        }
      ) {
        data {
          id
          attributes {
            code
          }
        }
      }
    }
  `;

  const { data } = await fetcher<OrderInfo>(jwt, query, {
    id: rest.id,
    code: changedCode,
    route: routeId,
    customer: customerId,
    orderDate: rest.orderDate ? rest.orderDate : new Date().toISOString(),
    deliveryDate: rest.deliveryDate ? rest.deliveryDate : null,
    unit: rest.unit?.id || null,
    weight: rest.weight ?? null,
    cbm: rest.cbm ?? null,
    totalAmount: rest.totalAmount ?? null,
    paymentDueDate: rest.paymentDueDate ?? null,
    notes: rest.notes ?? null,
    merchandiseTypes: (rest.merchandiseTypes || []).map((item) => item.id),
    merchandiseNote: rest.merchandiseNote ?? null,
    isDraft: rest.isDraft,
    participants: participantIds,
    ...(rest.paymentDate && { paymentDate: rest.paymentDate.toISOString() }),
    routeStatuses: routeStatusIds,
    lastStatusType: rest.lastStatusType ?? null,
    meta: rest.meta ? JSON.stringify(rest.meta) : null,
    updatedByUser: rest.updatedById,
  });

  const orderId = data.updateOrder?.id ? Number(data.updateOrder.id) : null;

  if (orderId) {
    for (const item of items || []) {
      await upsertOrderItemByGraphQL(jwt, { ...item, organizationId, order: { id: orderId } });
    }

    if (!isDraft) {
      await createOrderStatusByGraphQL(jwt, {
        organizationId,
        type: OrderStatusType.NEW,
        order: { id: orderId },
        createdById: updatedById,
      });
    }
  }

  return data.updateOrder;
};

/**
 * Partially updates an order with specified fields using GraphQL mutation.
 *
 * @param {string} jwt - JSON Web Token for authentication.
 * @param {OrderInputForm} orderData - The data for the order update, including only fields that need to be updated.
 * @returns {Promise<OrderInfo>} - A promise resolving with the updated order information.
 */
export const updateOrderPartial = async (jwt: string, orderData: OrderInputForm): Promise<OrderInfo> => {
  // Define GraphQL mutation query for partial order update
  const mutationQuery = gql`
    mutation (
      $id: ID!
      $customer: ID
      $route: ID
      $deliveryDate: DateTime
      $unit: ID
      $weight: Float
      $totalAmount: Float
      $paymentDueDate: Date
      $notes: String
      $merchandiseTypeIds: [ID]
      $merchandiseNote: String
      $itemIds: [ID]
      $participantIds: [ID]
      $isDraft: Boolean
      $paymentDate: Date
      $statusIds: [ID]
      $routeStatusIds: [ID]
      $lastStatusType: ENUM_ORDER_LASTSTATUSTYPE
      $meta: JSON
      $updatedById: ID
    ) {
      updateOrder(
        id: $id
        data: {
          customer: $customer
          route: $route
          deliveryDate: $deliveryDate
          unit: $unit
          weight: $weight
          totalAmount: $totalAmount
          paymentDueDate: $paymentDueDate
          notes: $notes
          merchandiseTypes: $merchandiseTypeIds
          merchandiseNote: $merchandiseNote
          items: $itemIds
          participants: $participantIds
          isDraft: $isDraft
          paymentDate: $paymentDate
          statuses: $statusIds
          routeStatuses: $routeStatusIds
          lastStatusType: $lastStatusType
          meta: $meta
          updatedByUser: $updatedById
        }
      ) {
        data {
          id
          attributes {
            code
          }
        }
      }
    }
  `;

  // Filter out undefined fields from orderData to avoid sending unnecessary data
  const filteredOrderData = Object.fromEntries(Object.entries(orderData).filter(([_, value]) => value !== undefined));

  const { data } = await fetcher<OrderInfo>(jwt, mutationQuery, { ...filteredOrderData });

  return data.updateOrder;
};

/**
 * Fetches the auto dispatch order data for a specific organization.
 *
 * @param jwt - The JSON Web Token for authentication.
 * @param entity - The data for creating a new Order record, excluding the ID.
 * @returns A promise that resolves to the auto dispatch order data if it exists, otherwise null.
 */
export const autoDispatchVehicle = async (jwt: string, entity: Partial<OrderInputForm>) => {
  const defaultPeriodDay = 7;
  const defaultPeriodType = "day";
  const { organizationId, id, code } = entity;
  const order = await getAutoDispatchOrderData(jwt, Number(organizationId), ensureString(code));
  const result = { numberOfDispatchedVehicle: 0, message: "", color: "warning" };
  const t = await createTranslator();

  const organizationSetting = await getAutoDispatchSetting(jwt, { organizationId });

  // Returns if auto dispatch setting not found
  if (!organizationSetting?.autoDispatch) {
    result.message = t("auto_dispatch.message.auto_dispatch_setting_not_found");
    logger.info(`#autoDispatchVehicle Analysis: result: ${JSON.stringify(result, null, 2)}`);
    return result;
  }

  const { orderDate, deliveryDate, unit, weight, customer, route } = order;
  // Set key to get capacity type base on unit
  let capacityKey: keyof VehicleInfo = "tonPayloadCapacity";
  switch (unit?.type) {
    case UnitOfMeasureType.CUBIC_METER:
      capacityKey = "cubicMeterCapacity";
      break;
    case UnitOfMeasureType.PALLET:
      capacityKey = "palletCapacity";
      break;
    case UnitOfMeasureType.TON:
    case UnitOfMeasureType.KILOGRAM:
      capacityKey = "tonPayloadCapacity";
      break;
    default:
      break;
  }

  const formatOrderDate = formatDate(orderDate, "YYYY-MM-DD 00:00:00");
  const formatDeliveryDate = formatDate(deliveryDate, "YYYY-MM-DD 23:59:59");

  const currentDate = new Date();
  let prevCurrentDate;
  let periodType = defaultPeriodType;
  let periodValue = defaultPeriodDay;

  const priorityItem: AutoDispatch = JSON.parse(JSON.stringify(organizationSetting.autoDispatch));

  if (priorityItem?.priority_trip_in_period?.period) {
    const period = priorityItem?.priority_trip_in_period.period;
    periodValue = period.value;
    periodType = period.type;

    if (periodValue < 0) {
      periodValue = 0;
    }

    if (!["day", "week", "month"].includes(periodType)) {
      periodType = defaultPeriodType;
    }
  }

  switch (periodType) {
    case "day":
      prevCurrentDate = minusDays(currentDate, periodValue);
      break;
    case "week":
      prevCurrentDate = minusWeeks(currentDate, periodValue);
      break;
    case "month":
      prevCurrentDate = minusMonths(currentDate, periodValue);
      break;
    default:
      prevCurrentDate = minusDays(currentDate, periodValue);
      break;
  }

  const startDeliveryDate = formatDate(prevCurrentDate, "YYYY-MM-DD 00:00:00");
  const endDeliveryDate = formatDate(currentDate, "YYYY-MM-DD 23:59:59");
  const remainingWeight = entity?.weight;

  logger.info(`#autoDispatchVehicle Analysis:
    orderDate ${orderDate},
    deliveryDate ${deliveryDate},
    formatOrderDate ${formatOrderDate},
    formatDeliveryDate ${formatDeliveryDate},
    startDeliveryDate ${startDeliveryDate},
    endDeliveryDate ${endDeliveryDate}`);

  const orderData = {
    order_id: Number(id),
    order_code: code,
    receiving_time: formatOrderDate,
    delivery_time: formatDeliveryDate,
    commodity_type: unit?.type,
    commodity_name: unit?.name,
    commodity_weight: remainingWeight ?? weight,
    receiving_location: route.pickupPoints
      ? joinNonEmptyStrings(
          [
            ensureString(route.pickupPoints[0].address?.latitude),
            ensureString(route.pickupPoints[0].address?.longitude),
          ],
          ","
        )
      : "",
    delivery_location: route.deliveryPoints
      ? joinNonEmptyStrings(
          [
            ensureString(route.deliveryPoints[0].address?.latitude),
            ensureString(route.deliveryPoints[0].address?.longitude),
          ],
          ","
        )
      : "",
    customer_id: Number(customer?.id),
    route_id: null,
    area_id: null,
  };

  const query = Prisma.sql`
  -- 1. Lấy danh sách xe trống (trước đó đã được phân bổ)
SELECT
  	rs.vehicle_number,
  	rs.ton_payload_capacity,
  	rs.pallet_capacity,
  	rs.cubic_meter_capacity,
  	ifnull(w1.latitude,0) latitude,
  	ifnull(w1.longitude,0) longitude,
  	ifnull(sub2.total_cost, 0) total_cost,
  	ifnull(sub2.total_trip, 0) total_trip
FROM
(
	SELECT
		v.id,
		v.vehicle_number,
		v.ton_payload_capacity,
		v.pallet_capacity,
		v.cubic_meter_capacity
	FROM
  		vehicles v
    INNER JOIN vehicles_driver_links vdl ON
      	vdl.vehicle_id  = v.id
      	AND vdl.driver_id IS NOT NULL
    INNER JOIN order_trips_vehicle_links otvl ON
 	 	otvl.vehicle_id = v.id
    INNER JOIN order_trips_order_links otol ON
    	otol.order_trip_id = otvl.order_trip_id
    INNER JOIN orders o ON
      	o.id = otol.order_id
      	AND o.published_at IS NOT NULL
    WHERE
      	v.organization_id = ${Number(organizationId)}
     	AND v.published_at IS NOT NULL
        AND v.is_active = TRUE
        -- Loại bỏ những xe đã có chuyến trong thời gian nhận - giao của đơn hàng mới
        AND v.vehicle_number NOT IN
    	(
            -- Lấy danh sách xe đã có chuyến trùng với thời gian nhận - giao của đơn hàng mới
        	SELECT
        		v2.vehicle_number
        	FROM order_trips ot2
        	INNER JOIN order_trips_order_links otol2 ON
          		ot2.id = otol2.order_trip_id
          		AND ot2.published_at IS NOT NULL
    		INNER JOIN orders o2 ON
          		o2.id = otol2.order_id
          		AND o2.published_at IS NOT null
        	LEFT JOIN order_trips_vehicle_links otvl on
          		otvl.order_trip_id  = ot2.id
        	LEFT JOIN vehicles v2 ON
          		v2.id = otvl.vehicle_id
        	LEFT JOIN order_trip_statuses_trip_links sotstl ON
        		sotstl.order_trip_id = ot2.id
        	LEFT JOIN order_trip_statuses sots ON
        		sots.id = sotstl.order_trip_status_id
          		AND sots.\`type\` = 'DELIVERED'
       		WHERE
            	ot2.organization_id = ${Number(organizationId)}
            	AND
            	(
              		-- Thời gian đặt hàng nằm trong khoảng thời gian nhận - giao của đơn hàng mới
              		(ot2.pickup_date BETWEEN ${formatOrderDate} AND ${formatDeliveryDate})
              		OR
              		-- Thời gian đặt hàng < thời gian đặt hàng của đơn hàng mới và thời gian giao hàng > thời gian đặt hàng của đơn hàng mới
              		(
              			ot2.pickup_date < ${formatOrderDate}
              			AND ifnull(sots.created_at, ot2.delivery_date) >= ${formatOrderDate}
              		)
           		)
            	-- Trạng thái của chuyến đó tài xế chưa xác nhận hoặc chưa hoàn thành
            	AND ot2.last_status_type NOT IN ('NEW', 'PENDING_CONFIRMATION', 'DELIVERED', 'COMPLETED')
            	AND
            	(
            		-- Đơn hàng chưa bị hủy
            		o2.last_status_type != 'CANCELED'
            		-- Xe chưa được xếp cho đơn hàng khác
            		OR o2.code <> ${code}
           		)
		)
	GROUP BY
		v.id,
		v.vehicle_number,
		v.ton_payload_capacity,
		v.pallet_capacity,
		v.cubic_meter_capacity
) AS rs
INNER JOIN order_trips_vehicle_links motvl ON
	motvl.vehicle_id = rs.id
INNER JOIN order_trips mot ON
	mot.id = motvl.order_trip_id
INNER JOIN order_trips_order_links motol ON
    motol.order_trip_id = mot.id
INNER JOIN orders mo ON
	mo.id = motol.order_id AND mo.published_at IS NOT NULL
INNER JOIN order_statuses_order_links mosol ON
    mosol.order_id = mo.id
INNER JOIN order_statuses mos ON
	mos.id = mosol.order_status_id
INNER JOIN
(
	-- Lấy vị trí hiện tại của xe
	-- Trường hợp đơn hàng đã giao thành công thì lấy vị trí báo cáo hoàn thành đơn hàng
	-- Trường hợp chưa giao hàng xong thì lấy vị trí theo tuyến của đơn hàng
	WITH with_numbered_vehicles AS
	(
    	SELECT
	        s1_v.id,
	        max(ifnull(s1_ots.created_at, s1_ot.delivery_date)) delivery_date,
	        ifnull(s1_otm.latitude, s1_aid.latitude) latitude,
	        ifnull(s1_otm.longitude, s1_aid.longitude) longitude,
	        ROW_NUMBER() OVER (
	            PARTITION BY s1_v.id
	            ORDER BY max(ifnull(s1_ots.created_at, s1_ot.delivery_date)) DESC
	        ) AS row_num
    	FROM
	        vehicles s1_v
	    LEFT JOIN order_trips_vehicle_links s1_otvl ON
	        s1_otvl.vehicle_id = s1_v.id
	    LEFT JOIN order_trips s1_ot ON
	        s1_ot.id = s1_otvl.order_trip_id
	    LEFT JOIN order_trips_order_links s1_otol ON
	        s1_otol.order_trip_id = s1_ot.id
	    LEFT JOIN orders s1_o ON
	        s1_o.id = s1_otol.order_id
	        AND s1_o.published_at IS NOT NULL
	        AND s1_o.last_status_type <> 'CANCELED'
	    LEFT JOIN orders_route_links s1_orl ON
	        s1_orl.order_id = s1_o.id
	    LEFT JOIN routes_delivery_points_links s1_rdpl ON
	        s1_rdpl.route_id = s1_orl.route_id
	    LEFT JOIN route_points_address_links s1_rpal ON
	        s1_rpal.route_point_id = s1_rdpl.route_point_id
	    LEFT JOIN address_informations s1_aid ON
	        s1_aid.id = s1_rpal.address_information_id
	    LEFT JOIN order_trip_messages_trip_links s1_otmtl ON
	        s1_otmtl.order_trip_id = s1_ot.id
	    LEFT JOIN order_trip_messages s1_otm ON
	        s1_otm.id = s1_otmtl.order_trip_message_id
	        AND s1_otm.\`type\` = 'DELIVERED'
	  	LEFT JOIN order_trip_statuses_trip_links s1_otstl ON
	  		s1_otstl.order_trip_id = s1_ot.id
	  	LEFT JOIN order_trip_statuses s1_ots ON
	  		s1_ots.id = s1_otstl.order_trip_status_id
    		AND s1_ots.\`type\` = 'DELIVERED'
    	WHERE
	        s1_v.organization_id = ${Number(organizationId)}
	        AND s1_v.published_at IS NOT NULL
	        AND s1_v.is_active = TRUE
	        AND
	          (
	            CASE WHEN ifnull(s1_ots.created_at, s1_ot.delivery_date) IS NULL
	            THEN
	            	1
	            ELSE
	              	ifnull(s1_ots.created_at, s1_ot.delivery_date) < ${formatOrderDate}
	            END
	        )
	    GROUP BY
	        s1_v.id,
	        latitude,
	        longitude
	)
	SELECT
		id, latitude, longitude
	FROM with_numbered_vehicles
	WHERE
		row_num = 1
) w1 ON w1.id = rs.id
LEFT JOIN
(
	-- Tính tổng chi phí + tổng số chuyến trong khoảng thời gian quy định
	-- Thông tin được chỉ định tại màn hình cấu hình điều xe tự động
	SELECT
    	s2_v.id,
    	sum(driver_cost) total_cost,
    	count(s2_v.vehicle_number) total_trip
  	FROM
    	vehicles s2_v
  	INNER JOIN order_trips_vehicle_links s2_otvl on
    	s2_otvl.vehicle_id = s2_v.id
  	INNER JOIN order_trips s2_ot on
    	s2_ot.id = s2_otvl.order_trip_id
  	INNER JOIN order_trips_order_links s2_otol on
      	s2_otol.order_trip_id = s2_ot.id
  	INNER JOIN orders s2_o on
    	s2_o.id = s2_otol.order_id
    	AND s2_o.published_at is not null
    	AND s2_o.last_status_type <> 'CANCELED'
  	INNER JOIN order_trip_statuses_trip_links s2_otstl on
    	s2_otstl.order_trip_id = s2_ot.id
  	INNER JOIN order_trip_statuses s2_ots on
    	s2_ots.id = s2_otstl.order_trip_status_id
    	AND s2_ots.\`type\` = 'DELIVERED'
  	WHERE
	    s2_v.organization_id = ${Number(organizationId)}
	    AND s2_v.published_at IS NOT NULL
	    AND s2_v.is_active = TRUE
	    AND ifnull(s2_ots.created_at, s2_ot.delivery_date) BETWEEN ${startDeliveryDate} AND ${endDeliveryDate}
  	GROUP BY
    	s2_v.id
) sub2 ON sub2.id = rs.id
WHERE
    mos.\`type\` <> 'CANCELED'
    AND (
        EXISTS (
          	SELECT
          		sot.id, sotvl.vehicle_id
          	FROM
            	orders subo
          	INNER JOIN order_trips_order_links sotol ON
            	sotol.order_id = subo.id
          	INNER JOIN order_trips sot ON
            	sot.id = sotol.order_trip_id
          	INNER JOIN order_trips_vehicle_links sotvl ON
            	sotvl.order_trip_id = sot.id
          	INNER JOIN orders smo ON
            	smo.id = sotol.order_id
			LEFT JOIN order_trip_statuses_trip_links sotstl ON
				sotstl.order_trip_id = sot.id
    		LEFT JOIN order_trip_statuses sots ON
    			sots.id = sotstl.order_trip_status_id
      			AND sots.\`type\` = 'DELIVERED'
          	WHERE
            	sotvl.vehicle_id = rs.id
            	OR
            	(
              		smo.id !=  mo.id
              		AND
              		(
              			ifnull(sots.created_at, sot.delivery_date) < ${formatOrderDate}
              			OR sot.pickup_date > ${formatDeliveryDate}
          			)
            	)
          	ORDER BY
            	sot.delivery_date DESC
          	LIMIT 1
      	)
  	)
GROUP BY
	rs.vehicle_number,
	rs.ton_payload_capacity,
	rs.pallet_capacity,
	rs.cubic_meter_capacity,
	w1.latitude,
	w1.longitude,
	sub2.total_cost,
	sub2.total_trip

UNION
-- 2. Lấy danh sách xe trống (chưa từng được phân bổ chuyến nào hết)
SELECT
	v.vehicle_number,
	v.ton_payload_capacity,
	v.pallet_capacity,
	v.cubic_meter_capacity,
	0 as latitude,
	0 as longitude,
	0 as total_cost,
	0 as total_trip
FROM vehicles v
LEFT JOIN order_trips_vehicle_links otvl ON
	otvl.vehicle_id = v.id
LEFT JOIN order_trips ot ON
	ot.id = otvl.order_trip_id
INNER JOIN vehicles_driver_links vdl ON
	vdl.vehicle_id =v.id
WHERE
	v.organization_id = ${Number(organizationId)}
  	AND v.published_at IS NOT NULL
    AND
    (
      	otvl.vehicle_id IS NULL
        OR
      	(
          	ot.id NOT IN
          	(
            	SELECT
                	otol.order_trip_id
            	FROM order_trips_order_links otol
            	INNER JOIN orders o ON
              		o.id = otol.order_id
            	WHERE
                	o.published_at IS NOT NULL
      		)
       		AND v.vehicle_number NOT IN
       		(
            	SELECT
                	v.vehicle_number
            	FROM vehicles v
            	LEFT JOIN order_trips_vehicle_links otvl ON
              		otvl.vehicle_id = v.id
            	LEFT JOIN order_trips ot ON
          			ot.id = otvl.order_trip_id
            	INNER JOIN vehicles_driver_links vdl ON
              		vdl.vehicle_id =v.id
            	WHERE
                	v.organization_id = ${Number(organizationId)}
                	AND v.published_at IS NOT NULL
	              	AND
	                (
	                  	otvl.vehicle_id IS NULL
	                  	OR
	                  	(
							ot.id NOT IN
							(
		                        SELECT
		                          	otol.order_trip_id
		                        FROM order_trips_order_links otol
		                        INNER JOIN orders o ON
		                          	o.id = otol.order_id
		                        WHERE
		                            o.published_at IS NULL
	                      	)
	                	)
	               	)
	        	GROUP BY
	        	v.vehicle_number,
				v.ton_payload_capacity,
				v.pallet_capacity,
				v.cubic_meter_capacity
			)
    	)
	)
GROUP BY
	v.vehicle_number,
	v.ton_payload_capacity,
	v.pallet_capacity,
	v.cubic_meter_capacity,
	latitude,
	longitude,
	total_cost,
	total_trip
  `;
  let vehicleData: AnyObject[] = [];
  const vehicles: VehicleInfo[] = await prisma.$queryRaw(query);

  // Returns if no vehicle is available
  if (!vehicles || vehicles.length === 0) {
    result.message = t("auto_dispatch.message.no_matching_vehicle_found");
    logger.info(`#autoDispatchVehicle Analysis: result: ${JSON.stringify(result, null, 2)}`);
    return result;
  }

  vehicleData = vehicles.map((item) => {
    const data = {
      ...Object.fromEntries(Object.entries(item).map(([key, value]) => [camelCase(key), value])),
    } as VehicleInfo & { latitude: number; longitude: number; totalTrip: number };

    return {
      license_plate: data.vehicleNumber,
      capacity:
        unit?.type === UnitOfMeasureType.KILOGRAM
          ? (Number(data[capacityKey]) || 0) * 1000
          : Number(data[capacityKey]) || 0,
      current_location:
        data.latitude && data.longitude
          ? joinNonEmptyStrings([ensureString(Number(data.latitude)), ensureString(Number(data.longitude))], ",")
          : "",
      activity_area: [],
      activity_route: [],
      assigned_customer: [],
      trips_in_period: Number(data.totalTrip),
    };
  });

  try {
    const response = await post<AnyObject>(AUTO_DISPATCH_URL, {
      commodity: orderData,
      vehicle_list: vehicleData,
      priority_item: priorityItem,
    });

    logger.info(`${AUTO_DISPATCH_URL}: ${response?.data?.data}`);
  } catch (error) {
    logger.error(`#autoDispatchVehicle:Error: ${JSON.stringify(error, null, 2)}`);
  } finally {
    logger.info(`#autoDispatchVehicle Analysis: result: ${JSON.stringify(result, null, 2)}`);
    // eslint-disable-next-line no-unsafe-finally
    return result;
  }
};

/**
 * Checks if a order has been updated since a specified date.
 *
 * @param jwt - The JWT of the user making the request.
 * @param organizationId - The ID of the organization to which the order belongs.
 * @param id - The ID of the order to check.
 * @param lastUpdatedAt - The date to compare against the order's last updated timestamp.
 * @returns A promise that resolves to true if the order has been updated, otherwise false.
 */
export const checkOrderExclusives = async (
  jwt: string,
  organizationId: number,
  id: number,
  lastUpdatedAt?: Date | string
): Promise<boolean> => {
  const query = gql`
    query ($organizationId: Int!, $id: ID!) {
      orders(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
        data {
          id
          attributes {
            updatedAt
          }
        }
      }
    }
  `;

  const { data } = await fetcher<OrderInfo[]>(jwt, query, {
    id,
    organizationId,
  });

  return data.orders[0].updatedAt !== lastUpdatedAt;
};

/**
 * Checks order is completed or not
 *
 * @param {string} jwt - JSON Web Token for authentication.
 * @param {number} organizationId - The ID of the organization to check within.
 * @param {string} code - The code of the order to check.
 * @param {number} totalTrip - The total trip of the order.
 * @returns {Promise<boolean>} - Returns `true` if the order has been published, otherwise `false`.
 */
export const checkOrderCompleted = async (
  jwt: string,
  organizationId: number,
  code: string,
  totalTrip: number,
  remainingWeightCapacity: number
): Promise<boolean> => {
  const query = gql`
    query ($organizationId: Int!, $code: String!, $type: String) {
      orders(filters: { organizationId: { eq: $organizationId }, code: { eq: $code }, publishedAt: { ne: null } }) {
        data {
          id
          attributes {
            trips(filters: { billOfLading: { ne: null }, statuses: { type: { eq: $type } } }) {
              data {
                id
              }
            }
          }
        }
      }
    }
  `;

  const { data } = await fetcher<OrderInfo[]>(jwt, query, {
    code,
    organizationId,
    type: OrderTripStatusType.COMPLETED,
  });

  return data.orders[0]?.trips?.length === totalTrip && remainingWeightCapacity === 0;
};

/**
 * Deletes an existing order.
 *
 * @param {Pick<OrderInfo, "id" | "updatedById">} entity - The order entity to delete.
 * @returns {Promise<OrderInfo | ErrorType>} A promise that resolves to the deleted order or an error type.
 */
export const deleteOrder = async (
  jwt: string,
  entity: Pick<Partial<OrderInfo>, "id" | "updatedById">
): Promise<OrderInfo> => {
  const { id, updatedById } = entity;
  const query = gql`
    mutation ($id: ID!, $updatedById: ID!) {
      updateOrder(id: $id, data: { publishedAt: null, updatedByUser: $updatedById }) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<OrderInfo>(jwt, query, {
    id,
    updatedById,
  });

  return data?.updateOrder;
};

/**
 * Fetch order information from the server based on the provided organization and order ID.
 *
 * @param {number} organizationId - The ID of the organization to which the order belongs.
 * @param {number} id - The ID of the order to fetch.
 * @returns {Promise<RouteInfo | undefined>} A promise that resolves to the order information or null if not found.
 */
export const getOrderTripPendingNotificationData = async (
  jwt: string,
  organizationId: number,
  id: number
): Promise<OrderInfo | undefined> => {
  const query = gql`
    query ($organizationId: Int!, $id: ID!) {
      orders(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
        data {
          attributes {
            customer {
              data {
                attributes {
                  code
                  name
                }
              }
            }
            route {
              data {
                attributes {
                  type
                  code
                  name
                }
              }
            }
          }
        }
      }
    }
  `;
  const { data } = await fetcher<OrderInfo[]>(jwt, query, { organizationId, id });

  return data?.orders[0];
};

/**
 * Fetch order participant information from the server based on the provided organization and order code.
 *
 * @param {number} organizationId - The ID of the organization to which the order belongs.
 * @param {number} id - The code of the order to fetch.
 * @returns {Promise<Partial<OrderParticipantInfo>[]>} A promise that resolves to the order participant information or null if not found.
 */
export const getOrderParticipantNotificationData = async (jwt: string, organizationId: number, code: string) => {
  const query = gql`
    query ($organizationId: Int!, $code: String) {
      orders(filters: { organizationId: { eq: $organizationId }, code: { eq: $code }, publishedAt: { ne: null } }) {
        data {
          attributes {
            participants(pagination: { limit: -1 }) {
              data {
                attributes {
                  user {
                    data {
                      id
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
  const { data } = await fetcher<OrderInfo[]>(jwt, query, { organizationId, code });

  return data?.orders[0]?.participants;
};

/**
 * Asynchronously retrieves detailed information for the first order matching the specified criteria from a GraphQL API.
 * This function constructs a GraphQL query to fetch the ID of the order and the ID of the user who created it,
 * filtered by the organization ID and an optional code. It uses the provided JWT for authentication.
 *
 * @param jwt The JSON Web Token used for authenticating the request.
 * @param organizationId The unique identifier for the organization within which the order is searched.
 * @param code An optional code that may further specify the order search within the organization.
 * @returns A promise that resolves to the first found order's information, or undefined if no order matches the criteria.
 */
export const getAutoDispatchOrderData = async (jwt: string, organizationId: number, code: string) => {
  const query = gql`
    query ($organizationId: Int!, $code: String) {
      orders(filters: { organizationId: { eq: $organizationId }, code: { eq: $code }, publishedAt: { ne: null } }) {
        data {
          id
          attributes {
            orderDate
            deliveryDate
            weight
            route {
              data {
                attributes {
                  pickupPoints {
                    data {
                      attributes {
                        address {
                          data {
                            attributes {
                              latitude
                              longitude
                            }
                          }
                        }
                      }
                    }
                  }
                  deliveryPoints {
                    data {
                      attributes {
                        address {
                          data {
                            attributes {
                              latitude
                              longitude
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
            unit {
              data {
                id
                attributes {
                  type
                  code
                  name
                }
              }
            }
            customer {
              data {
                id
              }
            }
            createdByUser {
              data {
                id
              }
            }
          }
        }
      }
    }
  `;
  const { data } = await fetcher<OrderInfo[]>(jwt, query, { organizationId, code });

  return data?.orders[0];
};

/**
 * Asynchronously retrieves detailed order data for a specified organization and order code.
 *
 * @param {number} organizationId - The unique identifier of the organization to which the order belongs.
 * @param {string} orderCode - The unique code identifying the specific order to be retrieved.
 * @returns {Promise<OrderInfo | undefined>} A promise that resolves to the first order data matching the criteria,
 * or undefined if no such order exists.
 **/
export const getOrderData = async (organizationId: number, orderCode: string, isShareMap: boolean) => {
  const query = gql`
    query ($organizationId: Int!, $code: String!, $cancelType: String, $isShareMap: Boolean!) {
      orders(
        filters: {
          lastStatusType: { ne: $cancelType }
          isDraft: { ne: true }
          code: { eq: $code }
          organizationId: { eq: $organizationId }
          publishedAt: { ne: null }
        }
      ) {
        data {
          id
          attributes {
            customer {
              data {
                attributes {
                  name
                }
              }
            }
            code
            participants(filters: { role: { eq: "OWNER" } }) {
              data {
                attributes {
                  user {
                    data {
                      id
                      attributes {
                        detail {
                          data {
                            attributes {
                              firstName
                              lastName
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
            trips {
              data {
                attributes {
                  code
                  weight
                  driver {
                    data {
                      attributes {
                        firstName
                        lastName
                        phoneNumber
                      }
                    }
                  }
                  vehicle {
                    data {
                      attributes {
                        vehicleNumber
                        vehicleTracking @include(if: $isShareMap) {
                          data {
                            attributes {
                              longitude
                              latitude
                              updatedAt
                            }
                          }
                        }
                      }
                    }
                  }
                  statuses(sort: "createdAt:asc", pagination: { limit: -1 }, filters: { type: { ne: null } }) {
                    data {
                      attributes {
                        type
                        createdAt
                      }
                    }
                  }
                  messages(
                    sort: "createdAt:desc"
                    pagination: { limit: 1 }
                    filters: { latitude: { ne: null }, longitude: { ne: null } }
                  ) @include(if: $isShareMap) {
                    data {
                      attributes {
                        latitude
                        longitude
                        createdAt
                      }
                    }
                  }
                }
              }
            }
            route {
              data {
                attributes {
                  name
                  code
                  type
                  pickupPoints(sort: "displayOrder:asc", pagination: { limit: -1 }) {
                    data {
                      attributes {
                        name
                        code
                        contactName
                        contactPhoneNumber
                        displayOrder
                        address {
                          data {
                            attributes {
                              country {
                                data {
                                  attributes {
                                    name
                                    code
                                  }
                                }
                              }
                              city {
                                data {
                                  attributes {
                                    name
                                    code
                                  }
                                }
                              }
                              district {
                                data {
                                  attributes {
                                    name
                                    code
                                  }
                                }
                              }
                              ward {
                                data {
                                  attributes {
                                    name
                                    code
                                  }
                                }
                              }
                              addressLine1
                            }
                          }
                        }
                      }
                    }
                  }
                  deliveryPoints(sort: "displayOrder:asc", pagination: { limit: -1 }) {
                    data {
                      attributes {
                        name
                        code
                        contactName
                        contactPhoneNumber
                        displayOrder
                        address {
                          data {
                            attributes {
                              country {
                                data {
                                  attributes {
                                    name
                                    code
                                  }
                                }
                              }
                              city {
                                data {
                                  attributes {
                                    name
                                    code
                                  }
                                }
                              }
                              district {
                                data {
                                  attributes {
                                    name
                                    code
                                  }
                                }
                              }
                              ward {
                                data {
                                  attributes {
                                    name
                                    code
                                  }
                                }
                              }
                              addressLine1
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
            orderDate
            deliveryDate
            unit {
              data {
                attributes {
                  code
                  name
                }
              }
            }
            weight
            notes
            merchandiseTypes(pagination: { limit: -1 }) {
              data {
                attributes {
                  name
                }
              }
            }
            merchandiseNote
            statuses(pagination: { limit: -1 }) {
              data {
                attributes {
                  type
                  createdAt
                }
              }
            }
          }
        }
      }
    }
  `;
  const { data } = await fetcher<OrderInfo[]>(STRAPI_TOKEN_KEY, query, {
    organizationId,
    code: orderCode,
    cancelType: OrderStatusType.CANCELED,
    isShareMap,
  });

  // Get organization email
  const orderData = data?.orders[0] || null;

  // Check if participants (only have 1 record is order owner) is exist
  const member = orderData.participants[0].user || null;
  if (orderData && member?.id) {
    const orgMember = await getOrganizationMemberByMemberId(organizationId, member.id);
    if (orgMember) {
      member.phoneNumber = orgMember.phoneNumber;
      member.email = orgMember.email;
      const { id: _, ...otherProps } = member;
      orderData.participants[0].user = otherProps;
    }
  }

  // date time format
  const orgSettingExtended = await getOrganizationSettingExtended<string>({
    organizationId,
    key: OrganizationSettingExtendedKey.ORGANIZATION_ORDER_RELATED_DATE_FORMAT,
  });
  const organizationOrderRelatedDateFormat = orgSettingExtended || DateTimeDisplayType.DATE;
  return {
    ...orderData,
    organizationOrderRelatedDateFormat,
  };
};
