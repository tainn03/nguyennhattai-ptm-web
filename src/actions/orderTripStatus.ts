"use server";

import { gql } from "graphql-request";

import { HttpStatusCode } from "@/types/api";
import { OrderTripInfo, OrderTripStatusInfo } from "@/types/strapi";
import { fetcher } from "@/utils/graphql";
import { transformToGraphqlPayload } from "@/utils/object";
import { withActionExceptionHandler } from "@/utils/server";

/**
 * Creates a new order trip status.
 *
 * @param token - The authentication token.
 * @param params - The parameters for creating the order trip status.
 * @returns The created order trip status.
 */
export const createOrderTripStatus = withActionExceptionHandler<
  Pick<OrderTripStatusInfo, "organizationId" | "trip" | "type" | "driverReport"> & { notes?: string },
  OrderTripStatusInfo
>(async (token, params) => {
  const { trip, type } = params;

  if (!trip?.id) {
    return {
      status: HttpStatusCode.BadRequest,
      error: "Order trip ID is required",
    };
  }

  const query = gql`
    mutation ($data: OrderTripStatusInput!, $orderTripId: ID!, $orderTripData: OrderTripInput!) {
      createOrderTripStatus(data: $data) {
        data {
          id
        }
      }
      updateOrderTrip(id: $orderTripId, data: $orderTripData) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<OrderTripStatusInfo>(token.jwt, query, {
    data: {
      ...transformToGraphqlPayload(params),
      createdByUser: token.user?.id,
      updatedByUser: token.user?.id,
      publishedAt: new Date().toISOString(),
    },
    orderTripId: trip.id,
    orderTripData: {
      lastStatusType: type,
      updatedByUser: token.user?.id,
    },
  });

  return {
    status: HttpStatusCode.Ok,
    data: data.createOrderTripStatus,
  };
});

/**
 * Fetches order trip data for quick update functionality
 *
 * @param token - Authentication token containing JWT and user info
 * @param orderTripId - ID of the order trip to fetch
 * @returns Promise resolving to order trip data with HTTP status
 */
export const getOrderTripDataToQuickUpdate = withActionExceptionHandler<
  Pick<OrderTripInfo, "id" | "organizationId">,
  OrderTripInfo
>(async (token, params) => {
  const { id, organizationId } = params;

  const query = gql`
    query ($id: ID!, $organizationId: Int!) {
      orderTrips(filters: { id: { eq: $id }, organizationId: { eq: $organizationId } }) {
        data {
          id
          attributes {
            code
            createdAt
            updatedAt
            weight
            order {
              data {
                id
                attributes {
                  code
                  weight
                  createdAt
                  trips(pagination: { limit: -1 }) {
                    data {
                      attributes {
                        weight
                      }
                    }
                  }
                  unit {
                    data {
                      id
                      attributes {
                        code
                        type
                      }
                    }
                  }
                }
              }
            }
            statuses(pagination: { limit: -1 }) {
              data {
                id
                attributes {
                  type
                  createdAt
                  driverReport {
                    data {
                      id
                      attributes {
                        type
                      }
                    }
                  }
                }
              }
            }
            driver {
              data {
                id
                attributes {
                  firstName
                  lastName
                  user {
                    data {
                      id
                    }
                  }
                }
              }
            }
            vehicle {
              data {
                id
                attributes {
                  vehicleNumber
                }
              }
            }
          }
        }
      }
    }
  `;

  const { data } = await fetcher<OrderTripInfo[]>(token.jwt, query, { id, organizationId });

  return {
    status: HttpStatusCode.Ok,
    data: data.orderTrips?.[0],
  };
});
