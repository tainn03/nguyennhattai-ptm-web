import { gql } from "graphql-request";

import { ErrorType } from "@/types";
import { HttpStatusCode } from "@/types/api";
import { FilterRequest } from "@/types/filter";
import { MutationResult } from "@/types/graphql";
import { RoutePointInfo } from "@/types/strapi";
import { graphQLPost } from "@/utils/api";

export const checkOrderRoutePointExclusives = async (
  id: number,
  organizationId: number,
  lastUpdatedAt: Date | string
): Promise<boolean> => {
  const { data } = await graphQLPost<RoutePointInfo[]>({
    query: gql`
      query ($id: ID!, $organizationId: Int!) {
        routePoints(filters: { id: { eq: $id }, organizationId: { eq: $organizationId }, publishedAt: { ne: null } }) {
          data {
            id
            attributes {
              updatedAt
            }
          }
        }
      }
    `,
    params: {
      id,
      organizationId,
    },
  });
  return data?.routePoints[0].updatedAt !== lastUpdatedAt;
};

export const deleteOrderRoutePoint = async (
  entity: Pick<RoutePointInfo, "id" | "organizationId">,
  lastUpdatedAt?: Date | string
): Promise<MutationResult<RoutePointInfo>> => {
  const { id, organizationId } = entity;

  // Check for exclusivity if lastUpdatedAt is provided
  if (lastUpdatedAt) {
    const isErrorExclusives = await checkOrderRoutePointExclusives(id, organizationId, lastUpdatedAt);
    if (isErrorExclusives) {
      return { error: ErrorType.EXCLUSIVE };
    }
  }

  const { status, data } = await graphQLPost<RoutePointInfo>({
    query: gql`
      mutation ($id: ID!) {
        updateRoutePoint(id: $id, data: { publishedAt: null }) {
          data {
            id
          }
        }
      }
    `,
    params: {
      id,
    },
  });

  if (status === HttpStatusCode.Ok && data) {
    return { data: data.updateRoutePoint };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * Fetches route points based on the provided parameters.
 *
 * @param params - The parameters for filtering and sorting the route points.
 * @returns An object containing the fetched route points and pagination metadata.
 */
export const routePointsFetcher = async ([_, params]: [string, FilterRequest<RoutePointInfo>]) => {
  const { page, pageSize, sort, keywords, code, name, zone, adjacentPoints, vehicleTypes, organizationId } = params;
  const { data, meta } = await graphQLPost<RoutePointInfo[]>({
    query: gql`
      query (
        $page: Int
        $pageSize: Int
        $sort: [String]
        $organizationId: Int!
        $keywords: String
        $code: String
        $name: String
        $zone: String
        $adjacentPoints: String
        $vehicleTypes: String
      ) {
        routePoints(
          pagination: { page: $page, pageSize: $pageSize }
          sort: $sort
          filters: {
            or: [
              { code: { containsi: $keywords } }
              { code: { containsi: $code } }
              { name: { containsi: $keywords } }
              { name: { containsi: $name } }
              { name: { containsi: $name } }
              { zone: { name: { containsi: $zone } } }
              { adjacentPoints: { name: { containsi: $adjacentPoints } } }
              { vehicleTypes: { name: { containsi: $vehicleTypes } } }
            ]
            organizationId: { eq: $organizationId }
            publishedAt: { ne: null }
            isActive: { eq: true }
          }
        ) {
          data {
            id
            attributes {
              code
              name
              contactName
              contactEmail
              contactPhoneNumber
              notes
              displayOrder
              pickupTimes
              deliveryTimes
              vehicleTypes(pagination: { limit: -1 }) {
                data {
                  id
                  attributes {
                    name
                  }
                }
              }
              zone {
                data {
                  id
                  attributes {
                    name
                  }
                }
              }
              adjacentPoints(pagination: { limit: -1 }) {
                data {
                  id
                  attributes {
                    name
                  }
                }
              }
              address {
                data {
                  id
                  attributes {
                    country {
                      data {
                        id
                        attributes {
                          code
                          name
                        }
                      }
                    }
                    city {
                      data {
                        id
                        attributes {
                          code
                          name
                        }
                      }
                    }
                    district {
                      data {
                        id
                        attributes {
                          code
                          name
                        }
                      }
                    }
                    ward {
                      data {
                        id
                        attributes {
                          code
                          name
                        }
                      }
                    }
                    addressLine1
                  }
                }
              }
            }
          }
          meta {
            pagination {
              page
              pageSize
              total
              pageCount
            }
          }
        }
      }
    `,
    params: {
      page,
      pageSize,
      sort: Array.isArray(sort) ? sort : [sort],
      organizationId,
      ...(keywords && { keywords }),
      ...(code && { code }),
      ...(name && { name }),
      ...(zone && { zone }),
      ...(adjacentPoints && { adjacentPoints }),
      ...(vehicleTypes && { vehicleTypes }),
    },
  });

  return { data: data?.routePoints ?? [], meta };
};
