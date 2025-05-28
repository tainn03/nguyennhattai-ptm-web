"use server";

import { gql } from "graphql-request";

import { uploadAndDeleteCustomFieldFiles, uploadCustomFieldFiles } from "@/actions/customFields";
import { STRAPI_TOKEN_KEY } from "@/configs/environment";
import { OrderRouteStatusInputForm } from "@/forms/orderRouteStatus";
import { OrderInfo, OrderRouteStatusInfo } from "@/types/strapi";
import { fetcher } from "@/utils/graphql";
import { equalId } from "@/utils/number";
import { getServerToken } from "@/utils/server";

/**
 * Creates a new OrderRouteStatus record with the provided data.
 *
 * @param entity - Partial OrderRouteStatus entity data.
 * @returns A promise that resolves to the created OrderRouteStatus or undefined.
 */
export const createOrderRouteStatus = async (entity: OrderRouteStatusInputForm): Promise<OrderRouteStatusInfo> => {
  const processedEntity = await uploadCustomFieldFiles<OrderRouteStatusInputForm>(entity);
  const query = gql`
    mutation (
      $organizationId: Int
      $order: ID
      $routePoint: ID
      $meta: JSON
      $createdByUser: ID
      $publishedAt: DateTime
    ) {
      createOrderRouteStatus(
        data: {
          organizationId: $organizationId
          order: $order
          routePoint: $routePoint
          meta: $meta
          createdByUser: $createdByUser
          updatedByUser: $createdByUser
          publishedAt: $publishedAt
        }
      ) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<OrderRouteStatusInfo>(STRAPI_TOKEN_KEY, query, {
    organizationId: Number(processedEntity.organizationId),
    order: processedEntity.order?.id ? Number(processedEntity.order.id) : null,
    routePoint: processedEntity.routePoint?.id ? Number(processedEntity.routePoint.id) : null,
    ...(processedEntity.meta && { meta: processedEntity.meta }),
    createdByUser: Number(processedEntity.createdById),
    publishedAt: new Date().toISOString(),
  });

  return data.createOrderRouteStatus;
};

/**
 * Updates an existing OrderRouteStatus record based on the provided entity data.
 *
 * @param entity - The data for updating an existing OrderRouteStatus record, including the ID.
 * @returns A promise that resolves to the ID of the updated OrderRouteStatus record.
 */
export const updateOrderRouteStatus = async (entity: OrderRouteStatusInputForm): Promise<OrderRouteStatusInfo> => {
  const { jwt } = await getServerToken();
  const currentRouteStatuses = await getOrderRouteStatusByOrderId(jwt, entity.order?.id);
  const processedEntity = await uploadAndDeleteCustomFieldFiles<OrderRouteStatusInputForm>(
    jwt,
    entity,
    currentRouteStatuses.find((status) => equalId(status.routePoint?.id, entity.routePoint?.id))
  );

  const query = gql`
    mutation ($id: ID!, $organizationId: Int, $order: ID, $routePoint: ID, $meta: JSON, $updatedByUser: ID) {
      updateOrderRouteStatus(
        id: $id
        data: {
          organizationId: $organizationId
          order: $order
          routePoint: $routePoint
          meta: $meta
          updatedByUser: $updatedByUser
        }
      ) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<OrderRouteStatusInfo>(jwt, query, {
    id: Number(processedEntity.id),
    organizationId: Number(processedEntity.organizationId),
    order: processedEntity.order?.id ? Number(processedEntity.order.id) : null,
    routePoint: processedEntity.routePoint?.id ? Number(processedEntity.routePoint.id) : null,
    meta: processedEntity.meta ? processedEntity.meta : null,
    updatedByUser: Number(processedEntity.updatedById),
  });

  return data.updateOrderRouteStatus;
};

/**
 * Upsert an OrderRouteStatus record based on the provided entity data.
 *
 * @param entity - The data for creating or updating an OrderRouteStatus record.
 * @returns A promise that resolves to the ID of the created or updated OrderRouteStatus record.
 */
export const upsertOrderRouteStatus = async (entity: OrderRouteStatusInputForm): Promise<OrderRouteStatusInfo> => {
  if (entity.id) {
    return updateOrderRouteStatus(entity);
  }
  return createOrderRouteStatus(entity);
};

/**
 * Fetches the OrderRouteStatus record for the given ID.
 *
 * @param jwt - The JSON Web Token for authentication.
 * @param id - The ID of the OrderRouteStatus record to fetch.
 * @returns A promise that resolves to the OrderRouteStatus record.
 */
export const getOrderRouteStatusByOrderId = async (jwt: string, orderId?: number) => {
  const query = gql`
    query ($id: ID!) {
      order(id: $id) {
        data {
          id
          attributes {
            routeStatuses(pagination: { limit: -1 }) {
              data {
                attributes {
                  routePoint {
                    data {
                      id
                    }
                  }
                  meta
                }
              }
            }
          }
        }
      }
    }
  `;

  const { data } = await fetcher<OrderInfo>(jwt, query, {
    id: orderId,
  });

  return data.order?.routeStatuses ?? [];
};
