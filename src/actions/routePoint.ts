"use server";

import { gql } from "graphql-request";

import { upsertAddressInformation } from "@/actions/address-information";
import { prisma } from "@/configs/prisma";
import { RoutePointInputForm } from "@/forms/routePoint";
import { HttpStatusCode } from "@/types/api";
import { FilterRequest } from "@/types/filter";
import { Meta } from "@/types/graphql";
import { RoutePointInfo } from "@/types/strapi";
import { fetcher } from "@/utils/graphql";
import { equalId } from "@/utils/number";
import { transformToGraphqlPayload } from "@/utils/object";
import { withActionExceptionHandler } from "@/utils/server";
import { isTrue, trim } from "@/utils/string";

/**
 * Fetch route points with the given parameters
 * @param token - Authentication token containing JWT and user info
 * @param params - Object containing page, pageSize, sort, organizationId, keywords, name, parent, adjacentZones, status
 * @returns Object containing data and meta
 */
export const routePointsFetcher = withActionExceptionHandler<
  [string, FilterRequest<RoutePointInfo>],
  { data: RoutePointInfo[]; meta?: Meta }
>(async (token, params) => {
  const [_, filters] = params;
  const { isActiveOptions, ...rest } = filters;
  const query = gql`
    query (
      $page: Int
      $pageSize: Int
      $sort: [String]
      $organizationId: Int
      $keywords: String
      $code: String
      $name: String
      $zone: String
      $vehicleTypes: String
      $adjacentPoints: String
      $status: [Boolean]
      $updatedByUser: String
      $updatedAtFrom: DateTime
      $updatedAtTo: DateTime
    ) {
      routePoints(
        pagination: { page: $page, pageSize: $pageSize }
        sort: $sort
        filters: {
          organizationId: { eq: $organizationId }
          publishedAt: { ne: null }
          isActive: { ne: null, in: $status }
          or: [
            { code: { containsi: $keywords } }
            { code: { containsi: $code } }
            { name: { containsi: $keywords } }
            { name: { containsi: $name } }
            { zone: { name: { containsi: $keywords } } }
            { zone: { name: { containsi: $zone } } }
            { vehicleTypes: { name: { containsi: $vehicleTypes } } }
            { adjacentPoints: { name: { containsi: $adjacentPoints } } }
            { updatedByUser: { detail: { firstName: { containsi: $updatedByUser } } } }
            { updatedByUser: { detail: { lastName: { containsi: $updatedByUser } } } }
            { updatedAt: { gte: $updatedAtFrom, lte: $updatedAtTo } }
          ]
        }
      ) {
        data {
          id
          attributes {
            code
            name
            isActive
            pickupTimes
            deliveryTimes
            adjacentPoints(pagination: { limit: -1 }) {
              data {
                id
                attributes {
                  name
                }
              }
            }
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
            updatedAt
            updatedByUser {
              data {
                id
                attributes {
                  detail {
                    data {
                      id
                      attributes {
                        firstName
                      }
                    }
                  }
                }
              }
            }
          }
        }
        meta {
          pagination {
            page
            pageSize
            pageCount
            total
          }
        }
      }
    }
  `;

  const { data, meta } = await fetcher<RoutePointInfo[]>(token.jwt, query, {
    ...transformToGraphqlPayload(rest),
    ...(isActiveOptions && {
      status: isActiveOptions.map((option: string) => isTrue(option)),
    }),
  });

  return {
    status: HttpStatusCode.Ok,
    data: { data: data.routePoints, meta },
  };
});

/**
 * Fetch a route point by ID
 * @param token - Authentication token containing JWT and user info
 * @param params - Object containing route point id and organizationId
 * @returns Object containing data and status
 */
export const routePointFetcher = withActionExceptionHandler<
  [string, Pick<RoutePointInfo, "id" | "organizationId">],
  RoutePointInfo
>(async (token, params) => {
  const [_, filters] = params;
  const query = gql`
    query ($id: ID!, $organizationId: Int!) {
      routePoints(filters: { id: { eq: $id }, organizationId: { eq: $organizationId }, publishedAt: { ne: null } }) {
        data {
          id
          attributes {
            name
            code
            organizationId
            publishedAt
            isActive
            pickupTimes
            deliveryTimes
            notes
            createdAt
            updatedAt
            requestedNote
            contactName
            contactPhoneNumber
            contactEmail
            address {
              data {
                id
                attributes {
                  addressLine1
                  addressLine2
                  country {
                    data {
                      id
                      attributes {
                        name
                        code
                      }
                    }
                  }
                  city {
                    data {
                      id
                      attributes {
                        name
                        code
                      }
                    }
                  }
                  district {
                    data {
                      id
                      attributes {
                        name
                        code
                      }
                    }
                  }
                  ward {
                    data {
                      id
                      attributes {
                        name
                        code
                      }
                    }
                  }
                }
              }
            }
            adjacentPoints(pagination: { limit: -1 }) {
              data {
                id
                attributes {
                  name
                  code
                  notes
                  address {
                    data {
                      id
                      attributes {
                        addressLine1
                        addressLine2
                        country {
                          data {
                            id
                            attributes {
                              name
                              code
                            }
                          }
                        }
                        city {
                          data {
                            id
                            attributes {
                              name
                              code
                            }
                          }
                        }
                        district {
                          data {
                            id
                            attributes {
                              name
                              code
                            }
                          }
                        }
                        ward {
                          data {
                            id
                            attributes {
                              name
                              code
                            }
                          }
                        }
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
                }
              }
            }
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
            createdByUser {
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
            updatedByUser {
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
    }
  `;

  const { data } = await fetcher<RoutePointInfo[]>(token.jwt, query, transformToGraphqlPayload(filters));

  return {
    status: HttpStatusCode.Ok,
    data: data.routePoints?.[0],
  };
});

/**
 * Fetch route point options
 * @param token - Authentication token containing JWT and user info
 * @param params - Object containing organizationId
 * @returns Object containing data and status
 */
export const routePointOptionsFetcher = withActionExceptionHandler<
  [string, FilterRequest<RoutePointInfo>],
  RoutePointInfo[]
>(async (token, params) => {
  const [_, filters] = params;
  const query = gql`
    query ($organizationId: Int) {
      routePoints(
        pagination: { limit: -1 }
        filters: {
          organizationId: { eq: $organizationId }
          publishedAt: { ne: null }
          isActive: { eq: true }
          code: { ne: null }
        }
      ) {
        data {
          id
          attributes {
            code
            name
            deliveryTimes
            zone {
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
                  addressLine1
                  addressLine2
                  country {
                    data {
                      id
                      attributes {
                        name
                        code
                      }
                    }
                  }
                  city {
                    data {
                      id
                      attributes {
                        name
                        code
                      }
                    }
                  }
                  district {
                    data {
                      id
                      attributes {
                        name
                        code
                      }
                    }
                  }
                  ward {
                    data {
                      id
                      attributes {
                        name
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

  const { data } = await fetcher<RoutePointInfo[]>(token.jwt, query, {
    organizationId: token.user?.orgId ?? filters.organizationId,
  });

  return {
    status: HttpStatusCode.Ok,
    data: data.routePoints,
  };
});

/**
 * Fetch adjacent route points with the given parameters
 * @param token - Authentication token containing JWT and user info
 * @param params - Object containing page, pageSize, sort, organizationId, keywords, name, parent, adjacentZones, status
 * @returns Object containing data and meta
 */
export const adjacentRoutePointsFetcher = withActionExceptionHandler<
  [string, FilterRequest<RoutePointInfo>],
  { data: RoutePointInfo[]; meta?: Meta }
>(async (token, params) => {
  const [_, filters] = params;
  const query = gql`
    query (
      $excludeId: ID
      $page: Int
      $pageSize: Int
      $sort: [String]
      $organizationId: Int
      $keywords: String
      $code: String
      $name: String
      $zone: String
      $vehicleTypes: String
      $adjacentPoints: String
    ) {
      routePoints(
        pagination: { page: $page, pageSize: $pageSize }
        sort: $sort
        filters: {
          id: { ne: $excludeId }
          organizationId: { eq: $organizationId }
          publishedAt: { ne: null }
          isActive: { eq: true }
          or: [
            { code: { containsi: $keywords } }
            { code: { containsi: $code } }
            { name: { containsi: $keywords } }
            { name: { containsi: $name } }
            { zone: { name: { containsi: $keywords } } }
            { zone: { name: { containsi: $zone } } }
            { vehicleTypes: { name: { containsi: $vehicleTypes } } }
            { adjacentPoints: { name: { containsi: $adjacentPoints } } }
          ]
        }
      ) {
        data {
          id
          attributes {
            code
            name
            isActive
            pickupTimes
            deliveryTimes
            adjacentPoints(pagination: { limit: -1 }) {
              data {
                id
                attributes {
                  name
                }
              }
            }
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
          }
        }
        meta {
          pagination {
            page
            pageSize
            pageCount
            total
          }
        }
      }
    }
  `;

  const { data, meta } = await fetcher<RoutePointInfo[]>(token.jwt, query, transformToGraphqlPayload(filters));

  return {
    status: HttpStatusCode.Ok,
    data: { data: data.routePoints, meta },
  };
});

/**
 * Get a route point with the given parameters
 * @param token - Authentication token containing JWT and user info
 * @param params - Object containing route point id and organizationId
 * @returns Object containing data and status
 */
export const getRoutePoint = withActionExceptionHandler<Pick<RoutePointInfo, "id" | "organizationId">, RoutePointInfo>(
  async (token, params) => {
    const query = gql`
      query ($id: ID!, $organizationId: Int) {
        routePoints(filters: { id: { eq: $id }, organizationId: { eq: $organizationId }, publishedAt: { ne: null } }) {
          data {
            id
            attributes {
              organizationId
              code
              name
              isActive
              notes
              contactName
              contactPhoneNumber
              contactEmail
              pickupTimes
              deliveryTimes
              requestedNote
              address {
                data {
                  id
                  attributes {
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
              zone {
                data {
                  id
                  attributes {
                    name
                  }
                }
              }
              vehicleTypes(pagination: { limit: -1 }) {
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
                    code
                    name
                    address {
                      data {
                        id
                        attributes {
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
              }
              updatedAt
            }
          }
        }
      }
    `;

    const { data } = await fetcher<RoutePointInfo[]>(token.jwt, query, transformToGraphqlPayload(params));

    return {
      status: HttpStatusCode.Ok,
      data: data.routePoints?.[0],
    };
  }
);

/**
 * Check if a route point exists and matches the given criteria
 * @param token - Authentication token containing JWT and user info
 * @param params - Object containing route point id, organizationId and updatedAt timestamp
 * @returns Status indicating if route point exists and matches criteria
 */
export const checkRoutePointExclusives = withActionExceptionHandler<
  Pick<RoutePointInputForm, "id" | "organizationId" | "updatedAt">,
  boolean
>(async (token, params) => {
  const query = gql`
    query ($id: ID!, $organizationId: Int!, $updatedAt: DateTime!) {
      routePoints(
        filters: {
          id: { eq: $id }
          organizationId: { eq: $organizationId }
          publishedAt: { ne: null }
          updatedAt: { eq: $updatedAt }
        }
      ) {
        data {
          id
        }
      }
    }
  `;

  // Fetch matching route points from API
  const { data } = await fetcher<RoutePointInfo[]>(token.jwt, query, transformToGraphqlPayload(params));

  // Return OK if matching route point found, otherwise Exclusive error
  return {
    status: data.routePoints?.length > 0 ? HttpStatusCode.Ok : HttpStatusCode.Exclusive,
  };
});

/**
 * Check if a route point exists with the given parameters
 * @param token - Authentication token containing JWT and user info
 * @param params - Object containing route point id, organizationId and code
 * @returns Status indicating if route point exists
 */
export const checkRoutePointExistence = withActionExceptionHandler<
  Pick<RoutePointInputForm, "organizationId" | "code"> & { excludeId?: number },
  boolean
>(async (token, params) => {
  const query = gql`
    query ($excludeId: ID, $organizationId: Int!, $code: String!) {
      routePoints(
        filters: {
          organizationId: { eq: $organizationId }
          id: { ne: $excludeId }
          code: { eq: $code }
          publishedAt: { ne: null }
        }
      ) {
        data {
          id
        }
      }
    }
  `;

  // Fetch matching route points from API
  const { data } = await fetcher<RoutePointInfo[]>(token.jwt, query, transformToGraphqlPayload(params));

  // Return OK if matching route point found, otherwise Existed error
  return {
    status: data.routePoints?.length > 0 ? HttpStatusCode.Existed : HttpStatusCode.Ok,
  };
});

/**
 * Update a route point with the given parameters
 * @param token - Authentication token containing JWT and user info
 * @param params - Object containing route point id, updatedAt timestamp and other route point data
 * @returns Status indicating if route point was updated successfully
 */
export const updateRoutePoint = withActionExceptionHandler<RoutePointInputForm, RoutePointInfo>(
  async (token, params) => {
    const { id, updatedAt, pickupTimes, deliveryTimes, address: addressInput, ...rest } = trim(params);

    // Check if route point is exclusive
    const { status: exclusiveStatus } = await checkRoutePointExclusives({
      id,
      organizationId: token.user?.orgId,
      updatedAt,
    });
    if (exclusiveStatus !== HttpStatusCode.Ok) {
      return { status: exclusiveStatus };
    }

    // Check if route point is existed
    const { status: existedStatus } = await checkRoutePointExistence({
      organizationId: token.user?.orgId,
      code: rest.code,
      excludeId: id,
    });
    if (existedStatus !== HttpStatusCode.Ok) {
      return { status: existedStatus };
    }

    // Upsert address information
    let address: number | null = null;
    if (addressInput) {
      const addressInfo = await upsertAddressInformation({
        ...addressInput,
        createdById: token.user?.id,
        updatedById: token.user?.id,
      });
      address = addressInfo.id;
    }

    // Get list of updated adjacent point IDs from params
    const updatedAdjacentPoints = (params?.adjacentPoints ?? []).map((adjacentPoint) => Number(adjacentPoint.id));

    // Get current adjacent points from database
    const currentAdjacentPoints = await prisma.routePointsAdjacentPointsLinks.findMany({
      where: { routePointId: Number(id) },
    });

    // Find adjacent points that were removed by comparing current vs updated
    const removedAdjacentPointsIds = currentAdjacentPoints
      .filter((adjacentPoint) => !updatedAdjacentPoints.includes(adjacentPoint.adjacentPointId))
      .map((adjacentPoint) => adjacentPoint.adjacentPointId);

    // Delete removed adjacent point links from database
    if (removedAdjacentPointsIds.length > 0) {
      await prisma.routePointsAdjacentPointsLinks.deleteMany({
        where: {
          AND: [{ routePointId: { in: removedAdjacentPointsIds } }, { adjacentPointId: Number(id) }],
        },
      });
    }

    // Find new adjacent points by comparing updated vs current
    const newAdjacentPoints = updatedAdjacentPoints
      .filter(
        (adjacentPoint) =>
          !currentAdjacentPoints.some((currentAdjacentPoint) =>
            equalId(currentAdjacentPoint.adjacentPointId, adjacentPoint)
          )
      )
      .map((adjacentPoint) => ({
        routePointId: Number(adjacentPoint),
        adjacentPointId: Number(id),
      }));

    // Create new adjacent point links in database
    if (newAdjacentPoints.length > 0) {
      await prisma.routePointsAdjacentPointsLinks.createMany({ data: newAdjacentPoints });
    }

    const mutation = gql`
      mutation ($id: ID!, $data: RoutePointInput!) {
        updateRoutePoint(id: $id, data: $data) {
          data {
            id
          }
        }
      }
    `;

    // Call API to update route point
    const { data } = await fetcher<RoutePointInfo>(token.jwt, mutation, {
      id,
      data: {
        ...transformToGraphqlPayload(rest),
        address,
        pickupTimes,
        deliveryTimes,
        organizationId: token.user?.orgId,
        updatedByUser: token.user?.id,
      },
    });

    return {
      status: HttpStatusCode.Ok,
      data: data.updateRoutePoint,
    };
  }
);

/**
 * Create a route point with the given parameters
 * @param token - Authentication token containing JWT and user info
 * @param params - Object containing route point data
 * @returns Status indicating if route point was created successfully
 */
export const createRoutePoint = withActionExceptionHandler<RoutePointInputForm, RoutePointInfo>(
  async (token, params) => {
    const { pickupTimes, deliveryTimes, address: addressInput, ...otherProps } = trim(params);
    // Check if route point is existed
    const { status: existedStatus } = await checkRoutePointExistence({
      organizationId: token.user?.orgId,
      code: params.code,
    });
    if (existedStatus !== HttpStatusCode.Ok) {
      return { status: existedStatus };
    }

    // Upsert address information
    let address: number | null = null;
    if (addressInput) {
      const addressInfo = await upsertAddressInformation({
        ...addressInput,
        createdById: token.user?.id,
        updatedById: token.user?.id,
      });
      address = addressInfo.id;
    }

    const mutation = gql`
      mutation ($data: RoutePointInput!) {
        createRoutePoint(data: $data) {
          data {
            id
          }
        }
      }
    `;

    const { data } = await fetcher<RoutePointInfo>(token.jwt, mutation, {
      data: {
        ...transformToGraphqlPayload(otherProps),
        address,
        pickupTimes,
        deliveryTimes,
        organizationId: token.user?.orgId,
        createdByUser: token.user?.id,
        updatedByUser: token.user?.id,
        publishedAt: new Date().toISOString(),
      },
    });

    // Map adjacent points from params to create links between points
    const newAdjacentPoints = (params?.adjacentPoints ?? []).map((adjacentPoint) => ({
      routePointId: Number(adjacentPoint.id),
      adjacentPointId: Number(data.createRoutePoint?.id),
    }));

    // If there are adjacent points specified, create many-to-many relationships
    if (newAdjacentPoints.length > 0) {
      await prisma.routePointsAdjacentPointsLinks.createMany({ data: newAdjacentPoints });
    }

    return {
      status: HttpStatusCode.Ok,
      data: data.createRoutePoint,
    };
  }
);

/**
 * Delete a route point with the given parameters
 * @param token - Authentication token containing JWT and user info
 * @param params - Object containing route point id, organizationId and updatedAt timestamp
 * @returns Status indicating if route point was deleted successfully
 */
export const deleteRoutePoint = withActionExceptionHandler<
  Pick<RoutePointInputForm, "id" | "organizationId" | "updatedAt">,
  RoutePointInfo
>(async (token, params) => {
  const { id, organizationId, updatedAt } = trim(params);

  // Check if route point is exclusive
  const { status: exclusiveStatus } = await checkRoutePointExclusives({
    id,
    organizationId,
    updatedAt,
  });
  if (exclusiveStatus !== HttpStatusCode.Ok) {
    return { status: exclusiveStatus };
  }
  const mutation = gql`
    mutation ($id: ID!, $data: RoutePointInput!) {
      updateRoutePoint(id: $id, data: $data) {
        data {
          id
        }
      }
    }
  `;

  // Call API to update route point
  const { data } = await fetcher<RoutePointInfo>(token.jwt, mutation, {
    id,
    data: {
      publishedAt: null,
      updatedByUser: token.user?.id,
    },
  });

  return {
    status: HttpStatusCode.Ok,
    data: data.updateRoutePoint,
  };
});
