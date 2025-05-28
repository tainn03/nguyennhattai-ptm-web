import { RouteType } from "@prisma/client";
import { gql } from "graphql-request";
import isArray from "lodash/isArray";

import { RouteInputForm, UpdateRouteInputForm } from "@/forms/route";
import { ErrorType } from "@/types";
import { ApiResult, HttpStatusCode } from "@/types/api";
import { FilterRequest } from "@/types/filter";
import { MutationResult } from "@/types/graphql";
import { RouteInfo } from "@/types/strapi";
import { graphQLPost, post, put } from "@/utils/api";
import { endOfDay, startOfDay } from "@/utils/date";
import { trim } from "@/utils/string";

/**
 * Fetches route information based on specified parameters from the GraphQL API.
 *
 * @param {Partial<RouteInfo>} params - Parameters for filtering routes.
 * @returns {Promise<RouteInfo | null>} A promise that resolves to the fetched route or null if not found.
 */
export const routeFetcher = async ([_, params]: [string, Partial<RouteInfo>]): Promise<RouteInfo | undefined> => {
  const { data } = await graphQLPost<RouteInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!, $customerId: Int) {
        routes(
          filters: {
            organizationId: { eq: $organizationId }
            customerId: { eq: $customerId }
            id: { eq: $id }
            publishedAt: { ne: null }
          }
        ) {
          data {
            id
            attributes {
              code
              name
              isActive
              distance
              price
              type
              description
              subcontractorCost
              driverCost
              bridgeToll
              otherCost
              customerId
              minBOLSubmitDays
              createdByUser {
                data {
                  id
                }
              }
              deliveryPoints(pagination: { limit: -1 }, filters: { publishedAt: { ne: null } }) {
                data {
                  id
                  attributes {
                    address {
                      data {
                        attributes {
                          ward {
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
                          city {
                            data {
                              id
                              attributes {
                                name
                                code
                              }
                            }
                          }
                          country {
                            data {
                              id
                              attributes {
                                name
                                code
                              }
                            }
                          }
                          postalCode
                          addressLine1
                          addressLine2
                        }
                      }
                    }
                    code
                    name
                    notes
                    contactPhoneNumber
                    contactEmail
                    contactName
                    displayOrder
                  }
                }
              }
              pickupPoints(pagination: { limit: -1 }, filters: { publishedAt: { ne: null } }) {
                data {
                  id
                  attributes {
                    address {
                      data {
                        attributes {
                          ward {
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
                          city {
                            data {
                              id
                              attributes {
                                name
                                code
                              }
                            }
                          }
                          country {
                            data {
                              id
                              attributes {
                                name
                                code
                              }
                            }
                          }
                          postalCode
                          addressLine1
                          addressLine2
                        }
                      }
                    }
                    code
                    name
                    notes
                    contactPhoneNumber
                    contactEmail
                    contactName
                    displayOrder
                  }
                }
              }
              createdAt
              createdByUser {
                data {
                  id
                  attributes {
                    username
                    email
                    detail {
                      data {
                        attributes {
                          lastName
                          firstName
                        }
                      }
                    }
                  }
                }
              }
              updatedAt
              updatedByUser {
                data {
                  id
                  attributes {
                    username
                    email
                    detail {
                      data {
                        attributes {
                          lastName
                          firstName
                        }
                      }
                    }
                  }
                }
              }
              driverExpenses(pagination: { limit: -1 }) {
                data {
                  id
                  attributes {
                    amount
                    driverExpense {
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
            }
          }
        }
      }
    `,
    params,
  });

  return data?.routes[0];
};

/**
 * Fetch routes from the server based on the provided filter parameters.
 *
 * @param params - An object containing filter parameters for the query.
 * @returns An object containing the fetched routes and pagination meta information.
 */
export const routesFetcher = async ([_, params]: [string, FilterRequest<RouteInfo>]) => {
  const {
    page,
    pageSize,
    sort,
    keywords,
    organizationId,
    customerId,
    name,
    code,
    isActiveOptions,
    createdByUser,
    createdAtFrom,
    createdAtTo,
    updatedByUser,
    updatedAtFrom,
    updatedAtTo,
    priceFrom,
    priceTo,
  } = params;

  let priceCondition = "";
  if (priceFrom || priceTo) {
    priceCondition = `distance: {
                            ${priceFrom ? "gte: $priceFrom" : ""}
                            ${priceTo ? "lte: $priceTo" : ""}
                          }`;
  }
  let createdAtCondition = "";
  if (createdAtFrom || createdAtTo) {
    createdAtCondition = `createdAt: {
                            ${createdAtFrom ? "gte: $createdAtFrom" : ""}
                            ${createdAtTo ? "lte: $createdAtTo" : ""}
                          }`;
  }

  let updatedAtCondition = "";
  if (updatedAtFrom || updatedAtTo) {
    updatedAtCondition = `updatedAt: {
                            ${updatedAtFrom ? "gte: $updatedAtFrom" : ""}
                            ${updatedAtTo ? "lte: $updatedAtTo" : ""}
                          }`;
  }

  let searchCondition = "";
  let keywordsParam = "";
  if (keywords && code) {
    keywordsParam = "$keywords: String";
    searchCondition = `or: [
                            { code: { containsi: $keywords } }
                            { code: { containsi: $code } }
                          ]`;
  } else if (keywords) {
    keywordsParam = "$keywords: String";
    searchCondition = "code: { containsi: $keywords }";
  } else if (code) {
    searchCondition = "code: { containsi: $code }";
  } else if (name) {
    searchCondition = "name: { containsi: $name }";
  }

  const { data, meta } = await graphQLPost<RouteInfo[]>({
    query: gql`
        query (
          $page: Int
          $pageSize: Int
          $organizationId: Int!
          $customerId: Int!
          $sort: [String]
          $type: String
          ${keywordsParam}
          ${code ? " $code: String" : ""}
          ${name ? " $name: String" : ""}
          ${isArray(isActiveOptions) && isActiveOptions.length > 0 ? "$isActive: [Boolean]" : ""}
          ${createdByUser ? "$createdByUser: String" : ""}
          ${createdAtFrom ? "$createdAtFrom: DateTime" : ""}
          ${createdAtTo ? "$createdAtTo: DateTime" : ""}
          ${updatedByUser ? "$updatedByUser: String" : ""}
          ${updatedAtFrom ? "$updatedAtFrom: DateTime" : ""}
          ${updatedAtTo ? "$updatedAtTo: DateTime" : ""}
          ${priceFrom ? "$priceFrom: Float" : ""}
          ${priceTo ? "$priceTo: Float" : ""}

        ) {
          routes(
            pagination: { page: $page, pageSize: $pageSize }
            sort: $sort
            filters: {
              type: { eq: $type }
              organizationId: { eq: $organizationId }
              customerId: { eq: $customerId }
              ${searchCondition}
              ${priceCondition}
              ${createdAtCondition}
              ${isArray(isActiveOptions) && isActiveOptions.length > 0 ? "isActive: { in: $isActive }" : ""}
              ${createdByUser ? "createdByUser: { username: { containsi: $createdByUser } }" : ""}
              ${updatedAtCondition}
              ${updatedByUser ? "updatedByUser: { username: { containsi: $updatedByUser } }" : ""}
              publishedAt: { ne: null }
            }
          ) {
            data {
              id
              attributes {
                code
                name
                isActive
                price
                createdAt
                pickupPoints(pagination: { limit: -1 }, filters: { publishedAt: { ne: null } }) {
                  data {
                    id
                    attributes {
                      code
                      address {
                        data {
                          id
                          attributes {
                            ward {
                              data {
                                id
                                attributes {
                                  name
                                }
                              }
                            }
                            district {
                              data {
                                id
                                attributes {
                                  name
                                }
                              }
                            }
                            city {
                              data {
                                id
                                attributes {
                                  name
                                }
                              }
                            }
                            country {
                              data {
                                id
                                attributes {
                                  name
                                }
                              }
                            }
                            postalCode
                            addressLine1
                          }
                        }
                      }
                    }
                  }
                }
                deliveryPoints(pagination: { limit: -1 }, filters: { publishedAt: { ne: null } }) {
                  data {
                    id
                    attributes {
                      code
                      address {
                        data {
                          id
                          attributes {
                            ward {
                              data {
                                id
                                attributes {
                                  name
                                }
                              }
                            }
                            district {
                              data {
                                id
                                attributes {
                                  name
                                }
                              }
                            }
                            city {
                              data {
                                id
                                attributes {
                                  name
                                }
                              }
                            }
                            country {
                              data {
                                id
                                attributes {
                                  name
                                }
                              }
                            }
                            postalCode
                            addressLine1
                          }
                        }
                      }
                    }
                  }
                }
                driverExpenses {
                  data {
                    id
                    attributes {
                      amount
                      driverExpense {
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
                createdByUser {
                  data {
                    id
                    attributes {
                      username
                      detail {
                        data {
                          attributes {
                            avatar {
                              data {
                                attributes {
                                  url
                                  previewUrl
                                }
                              }
                            }
                            lastName
                            firstName
                          }
                        }
                      }
                    }
                  }
                }
                updatedAt
                updatedByUser {
                  data {
                    id
                    attributes {
                      username
                      detail {
                        data {
                          attributes {
                            avatar {
                              data {
                                attributes {
                                  url
                                  previewUrl
                                }
                              }
                            }
                            lastName
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
      `,
    params: {
      organizationId,
      customerId,
      page,
      pageSize,
      sort: isArray(sort) ? sort : [sort],
      type: RouteType.FIXED,
      ...(keywords && { keywords }),
      ...(code && { code }),
      ...(name && { name }),
      ...(isArray(isActiveOptions) &&
        isActiveOptions.length > 0 && { isActive: isActiveOptions.map((item) => item === "true") }),
      ...(createdByUser && { createdByUser }),
      ...(createdAtFrom && { createdAtFrom: startOfDay(createdAtFrom) }),
      ...(createdAtTo && { createdAtTo: endOfDay(createdAtTo) }),
      ...(updatedByUser && { updatedByUser }),
      ...(updatedAtFrom && { updatedAtFrom: startOfDay(updatedAtFrom) }),
      ...(updatedAtTo && { updatedAtTo: endOfDay(updatedAtTo) }),
      ...(priceFrom && { priceFrom: Number(priceFrom) }),
      ...(priceTo && { priceTo: Number(priceTo) }),
    },
  });

  return { data: data?.routes ?? [], meta };
};

/**
 * Retrieves a route from the server.
 *
 * @param organizationId - The ID of the organization associated with the route.
 * @param customerId - The ID of the
 * @param id - The ID of the route to retrieve.
 * @returns A promise that resolves to the requested route if found, or null if not found.
 */
export const getRoute = async (
  organizationId: number,
  customerId: number,
  id: number
): Promise<RouteInfo | undefined> => {
  const { data } = await graphQLPost<RouteInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        routes(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
          data {
            id
            attributes {
              code
              name
              isActive
              distance
              price
              type
              description
              subcontractorCost
              driverCost
              bridgeToll
              otherCost
              minBOLSubmitDays
              updatedAt
              createdByUser {
                data {
                  id
                }
              }
              deliveryPoints(pagination: { limit: -1 }, filters: { publishedAt: { ne: null } }) {
                data {
                  id
                  attributes {
                    code
                    name
                    notes
                    contactName
                    contactEmail
                    contactPhoneNumber
                    displayOrder
                    address {
                      data {
                        id
                        attributes {
                          ward {
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
                          city {
                            data {
                              id
                              attributes {
                                name
                                code
                              }
                            }
                          }
                          country {
                            data {
                              id
                              attributes {
                                name
                                code
                              }
                            }
                          }
                          postalCode
                          addressLine1
                          addressLine2
                        }
                      }
                    }
                  }
                }
              }
              pickupPoints(pagination: { limit: -1 }, filters: { publishedAt: { ne: null } }) {
                data {
                  id
                  attributes {
                    code
                    name
                    notes
                    contactName
                    contactEmail
                    contactPhoneNumber
                    displayOrder
                    address {
                      data {
                        id
                        attributes {
                          ward {
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
                          city {
                            data {
                              id
                              attributes {
                                name
                                code
                              }
                            }
                          }
                          country {
                            data {
                              id
                              attributes {
                                name
                                code
                              }
                            }
                          }
                          postalCode
                          addressLine1
                          addressLine2
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
    `,
    params: {
      organizationId,
      customerId,
      id,
    },
  });

  return data?.routes[0];
};

/**
 * Deletes an existing route.
 *
 * @param {Pick<RouteInfo, "organizationId" | "id" | "updatedById">} entity - The route entity to delete.
 * @param {Date | string | undefined} lastUpdatedAt - (Optional) The last updated timestamp of the entity.
 * @returns {Promise<RouteInfo | ErrorType>} A promise that resolves to the deleted route or an error type.
 */
export const deleteRoute = async (
  entity: Pick<RouteInfo, "organizationId" | "id" | "updatedById">,
  lastUpdatedAt?: Date | string
): Promise<MutationResult<RouteInfo>> => {
  const { organizationId, id, updatedById } = entity;

  // Check for exclusivity if lastUpdatedAt is provided
  if (lastUpdatedAt) {
    const isErrorExclusives = await checkRouteExclusives(organizationId, id, lastUpdatedAt);
    if (isErrorExclusives) {
      return { error: ErrorType.EXCLUSIVE };
    }
  }

  const { status, data } = await graphQLPost<RouteInfo>({
    query: gql`
      mutation ($id: ID!, $updatedById: ID!) {
        updateRoute(id: $id, data: { publishedAt: null, updatedByUser: $updatedById }) {
          data {
            id
          }
        }
      }
    `,
    params: {
      id,
      updatedById,
    },
  });

  if (status === HttpStatusCode.Ok && data) {
    return { data: data.updateRoute };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * Fetches a list of routes by customer ID and filter parameters.
 *
 * @param {string} _ - Placeholder parameter, not used.
 * @param {FilterRequest<RouteInfo>} params - An object containing the filter parameters for the route list.
 * @returns {Promise<RouteInfo[]>} A promise that resolves to an array of RouteInfo objects matching the specified criteria.
 */
export const routeListByCustomerIdFetcher = async ([_, params]: [string, FilterRequest<RouteInfo>]) => {
  const { page, pageSize, organizationId, customerId } = trim(params);

  const { data, meta } = await graphQLPost<RouteInfo[]>({
    query: gql`
      query ($page: Int, $pageSize: Int, $organizationId: Int!, $customerId: Int, $type: String) {
        routes(
          pagination: { page: $page, pageSize: $pageSize }
          filters: {
            type: { eq: $type }
            organizationId: { eq: $organizationId }
            customerId: { eq: $customerId }
            publishedAt: { ne: null }
          }
        ) {
          data {
            id
            attributes {
              type
              code
              name
              description
              isActive
              distance
              price
              subcontractorCost
              driverCost
              bridgeToll
              otherCost
              createdByUser {
                data {
                  id
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
    `,
    params: {
      page,
      pageSize,
      organizationId,
      type: RouteType.FIXED,
      customerId,
    },
  });

  return { data: data?.routes ?? [], meta };
};

/**
 * Checks if a route has been updated since a specified date.
 *
 * @param {number} organizationId - The ID of the organization to which the route belongs.
 * @param {number} id - The ID of the route to check.
 * @param {Date | string} lastUpdatedAt - The date to compare against the route's last updated timestamp.
 * @returns {Promise<boolean>} A promise that resolves to true if the route has been updated, otherwise false.
 */
export const checkRouteExclusives = async (
  organizationId: number,
  id: number,
  lastUpdatedAt: Date | string
): Promise<boolean> => {
  const { data } = await graphQLPost<RouteInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        routes(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
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
      organizationId,
      id,
    },
  });

  return data?.routes[0]?.updatedAt !== lastUpdatedAt;
};

/**
 * Creates a new route.
 * @param {Object} params - Parameters for creating the route.
 * @param {RouteInputForm} route - Partial information of the route.
 * @returns {Promise<ApiResult<number>>} A promise resolving to the result of the route creation operation.
 */
export const createRoute = async (
  params: { organizationCode: string; encryptedCustomerId: string },
  route: RouteInputForm
) => {
  const { organizationCode, encryptedCustomerId } = params;
  const result = await post<ApiResult<number>>(
    `/api/orgs/${organizationCode}/customers/${encryptedCustomerId}/routes/new`,
    {
      ...route,
    }
  );
  return result;
};

/**
 * Updates an existing route.
 * @param {Object} params - Parameters for updating the route.
 * @param {UpdateRouteInputForm} route - Partial information of the route.
 * @returns {Promise<ApiResult<number>>} A promise resolving to the result of the route update operation.
 */
export const updateRoute = async (
  params: { organizationCode: string; encryptedId: string; encryptedCustomerId: string },
  route: UpdateRouteInputForm
) => {
  const { organizationCode, encryptedId, encryptedCustomerId } = params;
  const result = await put<ApiResult<number>>(
    `/api/orgs/${organizationCode}/customers/${encryptedCustomerId}/routes/${encryptedId}/edit`,
    {
      ...route,
    }
  );
  return result;
};

/**
 * Fetches route information based on specified parameters from the GraphQL API.
 * @param params - Parameters for filtering routes.
 * @returns {Promise<RouteInfo | null>} A promise that resolves to the fetched route or null if not found.
 */
export const routeOptionsFetcher = async ([_, params]: [string, Partial<RouteInfo>]) => {
  const { data } = await graphQLPost<RouteInfo[]>({
    query: gql`
      query ($organizationId: Int!, $customerId: Int, $type: String) {
        routes(
          filters: {
            organizationId: { eq: $organizationId }
            type: { eq: $type }
            customerId: { eq: $customerId }
            isActive: { eq: true }
            publishedAt: { ne: null }
          }
          pagination: { limit: -1 }
        ) {
          data {
            id
            attributes {
              name
              code
              type
              pickupPoints {
                data {
                  id
                  attributes {
                    name
                    code
                    contactName
                    contactPhoneNumber
                    displayOrder
                    address {
                      data {
                        id
                        attributes {
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
                          addressLine1
                          postalCode
                        }
                      }
                    }
                  }
                }
              }
              deliveryPoints {
                data {
                  id
                  attributes {
                    name
                    code
                    contactName
                    contactPhoneNumber
                    displayOrder
                    address {
                      data {
                        id
                        attributes {
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
                          addressLine1
                          postalCode
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
    `,
    params,
  });

  return data?.routes || [];
};

/**
 * Update an existing route name.
 *
 * @param {Pick<RouteInfo, "organizationId" | "id" | "name" | "updatedById">} entity - The route entity to delete.
 * @param {Date | string | undefined} lastUpdatedAt - (Optional) The last updated timestamp of the entity.
 * @returns {Promise<MutationResult<RouteInfo>>} A promise that resolves to the deleted route or an error type.
 */
export const updateRouteName = async (
  entity: Pick<RouteInfo, "organizationId" | "id" | "name" | "updatedById">,
  lastUpdatedAt?: Date | string
) => {
  const { organizationId, id, name, updatedById } = trim(entity);

  // Check for exclusivity if lastUpdatedAt is provided
  if (lastUpdatedAt) {
    const isErrorExclusives = await checkRouteExclusives(organizationId, id, lastUpdatedAt);
    if (isErrorExclusives) {
      return { error: ErrorType.EXCLUSIVE };
    }
  }

  const { status, data } = await graphQLPost<RouteInfo>({
    query: gql`
      mutation ($id: ID!, $name: String!, $updatedById: ID) {
        updateRoute(id: $id, data: { name: $name, updatedByUser: $updatedById }) {
          data {
            id
          }
        }
      }
    `,
    params: {
      id,
      name,
      updatedById,
    },
  });

  if (status === HttpStatusCode.Ok && data) {
    return { data: data.updateRoute, status };
  }

  return { error: ErrorType.UNKNOWN, status };
};
