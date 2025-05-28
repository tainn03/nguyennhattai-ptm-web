import { gql } from "graphql-request";

import { OrderRouteStatusInputForm } from "@/forms/orderRouteStatus";
import { ErrorType } from "@/types";
import { HttpStatusCode } from "@/types/api";
import { MutationResult } from "@/types/graphql";
import { OrderRouteStatusInfo } from "@/types/strapi";
import { graphQLPost } from "@/utils/api";
import { trim } from "@/utils/string";

/**
 * Creates a new OrderRouteStatus record with the provided data.
 *
 * @param jwt - The JSON Web Token for authentication.
 * @param entity - Partial OrderRouteStatus entity data.
 * @returns A promise that resolves to the created OrderRouteStatus or undefined.
 */
export const createOrderRouteStatus = async (
  entity: OrderRouteStatusInputForm
): Promise<MutationResult<OrderRouteStatusInfo>> => {
  const processedEntity = trim(entity);
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

  const { data, status } = await graphQLPost<OrderRouteStatusInfo>({
    query,
    params: {
      organizationId: Number(processedEntity.organizationId),
      order: processedEntity.order?.id ? Number(processedEntity.order.id) : null,
      routePoint: processedEntity.routePoint?.id ? Number(processedEntity.routePoint.id) : null,
      ...(processedEntity.meta && { meta: processedEntity.meta }),
      createdByUser: Number(processedEntity.createdById),
      publishedAt: new Date().toISOString(),
    },
  });

  if (status === HttpStatusCode.Ok && data) {
    return { data: data.createOrderRouteStatus };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * Updates the status of an order route.
 *
 * @param {Pick<OrderRouteStatusInfo, "id" | "updatedById" | "meta">} entity - The entity containing the order route status information.
 * @returns {Promise<MutationResult<OrderRouteStatusInfo>>} - A promise that resolves to the mutation result of the order route status update.
 */
export const updateOrderRouteStatus = async (
  entity: OrderRouteStatusInputForm
): Promise<MutationResult<OrderRouteStatusInfo>> => {
  const { id, meta, updatedById } = entity;

  const { status, data } = await graphQLPost<OrderRouteStatusInfo>({
    query: gql`
      mutation ($id: ID!, $meta: JSON, $updatedById: ID!) {
        updateOrderRouteStatus(id: $id, data: { meta: $meta, updatedByUser: $updatedById }) {
          data {
            id
          }
        }
      }
    `,
    params: {
      id,
      updatedById,
      meta: meta ? JSON.stringify(meta) : null,
    },
  });

  if (status === HttpStatusCode.Ok && data) {
    return { data: data.updateOrderRouteStatus };
  }

  return { error: ErrorType.UNKNOWN };
};
