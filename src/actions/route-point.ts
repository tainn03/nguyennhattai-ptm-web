"use server";

import { gql } from "graphql-request";

import { createAddressInformation, upsertAddressInformation } from "@/actions/address-information";
import { createOrderRouteStatus, upsertOrderRouteStatus } from "@/actions/order-route-status";
import { STRAPI_TOKEN_KEY } from "@/configs/environment";
import { OrderInputForm } from "@/forms/order";
import { OrderRouteStatusInputForm } from "@/forms/orderRouteStatus";
import { RouteInputForm } from "@/forms/route";
import { RoutePointInputForm } from "@/forms/routePoint";
import { RouteInfo, RoutePointInfo } from "@/types/strapi";
import { fetcher } from "@/utils/graphql";
import { trim } from "@/utils/string";

/**
 * Create a new RoutePoint record by sending a GraphQL mutation with the provided data.
 *
 * @param jwt - The JSON Web Token for authentication.
 * @param entity - The data for creating a new RoutePoint record.
 * @returns A promise that resolves to the created RoutePoint or undefined.
 */
export const createRoutePoint = async (entity: RoutePointInputForm): Promise<RoutePointInfo> => {
  const processedEntity = trim(entity);
  const query = gql`
    mutation (
      $organizationId: Int
      $code: String
      $name: String
      $address: ID
      $contactName: String
      $contactEmail: String
      $contactPhoneNumber: String
      $notes: String
      $displayOrder: Int
      $publishedAt: DateTime
    ) {
      createRoutePoint(
        data: {
          organizationId: $organizationId
          code: $code
          name: $name
          address: $address
          contactName: $contactName
          contactEmail: $contactEmail
          contactPhoneNumber: $contactPhoneNumber
          notes: $notes
          displayOrder: $displayOrder
          publishedAt: $publishedAt
        }
      ) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<RoutePointInfo>(STRAPI_TOKEN_KEY, query, {
    ...(processedEntity.organizationId && { organizationId: Number(processedEntity.organizationId) }),
    ...(processedEntity.code && { code: processedEntity.code }),
    ...(processedEntity.name && { name: processedEntity.name }),
    ...(processedEntity.address?.id && { address: Number(processedEntity.address.id) }),
    ...(processedEntity.contactName && { contactName: processedEntity.contactName }),
    ...(processedEntity.contactEmail && { contactEmail: processedEntity.contactEmail }),
    ...(processedEntity.contactPhoneNumber && { contactPhoneNumber: processedEntity.contactPhoneNumber }),
    ...(processedEntity.notes && { notes: processedEntity.notes }),
    ...(processedEntity.displayOrder && { displayOrder: Number(processedEntity.displayOrder) }),
    publishedAt: new Date().toISOString(),
  });

  return data.createRoutePoint;
};

/**
 * Updates an existing RoutePoint record based on the provided entity data.
 *
 * @param jwt - The JSON Web Token for authentication.
 * @param entity - The data for updating an existing RoutePoint record, including the ID.
 * @returns A promise that resolves to the ID of the updated RoutePoint record.
 */
export const updateRoutePoint = async (entity: RoutePointInputForm): Promise<RoutePointInfo> => {
  const { id, organizationId, code, name, address, contactName, contactEmail, ...rest } = trim(entity);
  const query = gql`
    mutation (
      $id: ID!
      $organizationId: Int
      $code: String
      $name: String
      $address: ID
      $contactName: String
      $contactEmail: String
      $contactPhoneNumber: String
      $notes: String
      $displayOrder: Int
    ) {
      updateRoutePoint(
        id: $id
        data: {
          organizationId: $organizationId
          code: $code
          name: $name
          address: $address
          contactName: $contactName
          contactEmail: $contactEmail
          contactPhoneNumber: $contactPhoneNumber
          notes: $notes
          displayOrder: $displayOrder
        }
      ) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<RoutePointInfo>(STRAPI_TOKEN_KEY, query, {
    id,
    organizationId: organizationId ? Number(organizationId) : null,
    code: code ?? null,
    name: name ?? null,
    address: address?.id ? Number(address.id) : null,
    contactName: contactName ?? null,
    contactEmail: contactEmail ?? null,
    contactPhoneNumber: rest.contactPhoneNumber ?? null,
    notes: rest.notes ?? null,
    displayOrder: rest.displayOrder ?? null,
  });

  return data.updateRoutePoint;
};

/**
 * Upsert a RoutePoint record based on the provided entity data.
 *
 * @param entity - The data for creating or updating a RoutePoint record.
 * @returns A promise that resolves to the created or updated RoutePoint record.
 */
export const upsertRoutePointByGraphQL = async (entity: RoutePointInputForm): Promise<RoutePointInfo> => {
  if (entity.id) {
    return updateRoutePoint(entity);
  }
  return createRoutePoint(entity);
};

/**
 * Update a Route record by sending a GraphQL mutation with the provided data.
 *
 * @param entity - The data for updating an existing Route record.
 * @returns A promise that resolves to the updated Route record.
 */
export const updateRoutePointInRoute = async (entity: RouteInputForm, routePointId?: number): Promise<RouteInfo> => {
  const { id, name, pickupPoints, deliveryPoints, updatedById } = trim(entity);
  const query = gql`
    mutation ($id: ID!, $name: String, $pickupPoints: [ID], $deliveryPoints: [ID], $updatedByUser: ID) {
      updateRoute(
        id: $id
        data: {
          name: $name
          pickupPoints: $pickupPoints
          deliveryPoints: $deliveryPoints
          updatedByUser: $updatedByUser
        }
      ) {
        data {
          id
        }
      }
    }
  `;
  const pickupPointIds = (pickupPoints || []).map((point) => point.id);
  const deliveryPointIds = (deliveryPoints || []).map((point) => point.id);

  if (pickupPoints) {
    pickupPointIds.push(routePointId);
  } else if (deliveryPoints) {
    deliveryPointIds.push(routePointId);
  }

  const { data } = await fetcher<RouteInfo>(STRAPI_TOKEN_KEY, query, {
    id,
    ...(name && { name }),
    ...(pickupPoints && { pickupPoints: pickupPointIds }),
    ...(deliveryPoints && { deliveryPoints: deliveryPointIds }),
    updatedByUser: updatedById,
  });

  return data.updateRoute;
};

/**
 * Remove a RoutePoint record from a Route record and update the order status by sending GraphQL mutations with the provided data.
 *
 * @param route - The data for updating an existing Route record.
 * @param order - The data for updating an existing Order record.
 * @returns A promise that resolves to the updated Route record.
 */
export const removeRoutePointAndUpdateOrderStatus = async (
  route: RouteInputForm,
  order: OrderInputForm
): Promise<RouteInfo> => {
  const { id: routeId, pickupPoints, deliveryPoints, updatedById } = trim(route);
  const { id: orderId, routeStatuses } = trim(order);

  const query = gql`
    mutation (
      $routeId: ID!
      $orderId: ID!
      $pickupPoints: [ID]
      $deliveryPoints: [ID]
      $routeStatuses: [ID]
      $updatedByUser: ID
    ) {
      updateRoute(
        id: $routeId
        data: { pickupPoints: $pickupPoints, deliveryPoints: $deliveryPoints, updatedByUser: $updatedByUser }
      ) {
        data {
          id
        }
      }
      updateOrder(id: $orderId, data: { routeStatuses: $routeStatuses, updatedByUser: $updatedByUser }) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<RouteInfo>(STRAPI_TOKEN_KEY, query, {
    routeId,
    orderId,
    ...(pickupPoints && { pickupPoints: (pickupPoints || []).map((point) => point.id) }),
    ...(deliveryPoints && { deliveryPoints: (deliveryPoints || []).map((point) => point.id) }),
    ...(routeStatuses && { routeStatuses: (routeStatuses || []).map((status) => status.id) }),
    updatedByUser: updatedById,
  });

  return data.updateRoute;
};

/**
 * Create a new RoutePoint record and an OrderRouteStatus record by sending GraphQL mutations with the provided data.
 * @param routePoint - The data for creating a new RoutePoint record.
 * @param orderRouteStatus - The data for creating a new OrderRouteStatus record.
 * @returns A promise that resolves to the created RoutePoint record.
 */
export const createRoutePointAndOrderRouteStatus = async (
  route: RouteInputForm,
  routePoint: RoutePointInputForm,
  orderRouteStatus: OrderRouteStatusInputForm
): Promise<RoutePointInfo> => {
  const { address, createdById } = routePoint;
  const createResult = await createAddressInformation({ ...address, createdById });
  const result = await createRoutePoint({ ...routePoint, address: { id: createResult.id } });
  if (result.id) {
    await createOrderRouteStatus({ ...orderRouteStatus, routePoint: { id: result.id } });
    await updateRoutePointInRoute(route, result.id);
  }
  return result;
};

/**
 * Update an existing RoutePoint record and create an OrderRouteStatus record by sending GraphQL mutations with the provided data.
 * @param routePoint - The data for updating an existing RoutePoint record.
 * @param orderRouteStatus - The data for creating a new OrderRouteStatus record.
 * @returns A promise that resolves to the updated RoutePoint record.
 */
export const updateRoutePointAndOrderRouteStatus = async (
  route: RouteInputForm,
  routePoint: RoutePointInputForm,
  orderRouteStatus: OrderRouteStatusInputForm
): Promise<RoutePointInfo> => {
  const { address, updatedById } = routePoint;
  const upsertResult = await upsertAddressInformation({ ...address, createdById: updatedById, updatedById });
  const result = await updateRoutePoint({ ...routePoint, address: { id: upsertResult.id } });
  if (result.id) {
    await upsertOrderRouteStatus({ ...orderRouteStatus, routePoint: { id: result.id } });
    await updateRoutePointInRoute(route, result.id);
  }
  return result;
};
