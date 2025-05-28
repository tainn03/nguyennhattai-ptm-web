"use server";

import { gql } from "graphql-request";

import { OrderGroupStatusInputForm } from "@/forms/orderGroupStatus";
import { HttpStatusCode } from "@/types/api";
import { OrderGroupStatusInfo } from "@/types/strapi";
import { fetcher } from "@/utils/graphql";
import { withActionExceptionHandler } from "@/utils/server";

/**
 * Creates a new order group status.
 *
 * @param token - The authentication token.
 * @param params - The parameters for creating the order group status.
 * @returns The created order group status.
 */
export const createOrderGroupStatus = withActionExceptionHandler<OrderGroupStatusInputForm, OrderGroupStatusInfo>(
  async (token, params) => {
    const { organizationId, group, type, notes } = params;

    if (!group?.id) {
      return {
        status: HttpStatusCode.BadRequest,
        error: "Order group ID is required",
      };
    }

    const query = gql`
      mutation ($data: OrderGroupStatusInput!, $orderGroupId: ID!, $orderGroupData: OrderGroupInput!) {
        createOrderGroupStatus(data: $data) {
          data {
            id
          }
        }
        updateOrderGroup(id: $orderGroupId, data: $orderGroupData) {
          data {
            id
          }
        }
      }
    `;

    const { data } = await fetcher<OrderGroupStatusInfo>(token.jwt, query, {
      data: {
        organizationId,
        type,
        group: group.id,
        ...(notes && { notes }),
        createdByUser: token.user.id,
        updatedByUser: token.user.id,
        publishedAt: new Date().toISOString(),
      },
      orderGroupId: group.id,
      orderGroupData: {
        lastStatusType: type,
      },
    });

    return {
      status: HttpStatusCode.Ok,
      data: data.createOrderGroupStatus,
    };
  }
);
