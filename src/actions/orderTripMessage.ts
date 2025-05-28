"use server";

import { gql } from "graphql-request";

import { HttpStatusCode } from "@/types/api";
import { OrderTripMessageInfo } from "@/types/strapi";
import { fetcher } from "@/utils/graphql";
import { transformToGraphqlPayload } from "@/utils/object";
import { withActionExceptionHandler } from "@/utils/server";

/**
 * Creates a new order trip message.
 *
 * @param token - The authentication token.
 * @param params - The parameters for creating the order trip message.
 * @returns The created order trip message.
 */
export const createOrderTripMessage = withActionExceptionHandler<Partial<OrderTripMessageInfo>, OrderTripMessageInfo>(
  async (token, params) => {
    const { trip } = params;

    if (!trip?.id) {
      return {
        status: HttpStatusCode.BadRequest,
        error: "Order trip ID is required",
      };
    }

    const query = gql`
      mutation ($data: OrderTripMessageInput!) {
        createOrderTripMessage(data: $data) {
          data {
            id
          }
        }
      }
    `;

    const { data } = await fetcher<OrderTripMessageInfo>(token.jwt, query, {
      data: {
        ...transformToGraphqlPayload(params),
        createdByUser: token.user?.id,
        updatedByUser: token.user?.id,
        publishedAt: new Date().toISOString(),
      },
    });

    return {
      status: HttpStatusCode.Ok,
      data: data.createOrderTripMessage,
    };
  }
);
