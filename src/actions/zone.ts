"use server";

import { gql } from "graphql-request";

import { prisma } from "@/configs/prisma";
import { ZoneInputForm } from "@/forms/zone";
import { HttpStatusCode } from "@/types/api";
import { FilterRequest } from "@/types/filter";
import { Meta } from "@/types/graphql";
import { ZoneInfo } from "@/types/strapi";
import { fetcher } from "@/utils/graphql";
import { equalId } from "@/utils/number";
import { transformToGraphqlPayload } from "@/utils/object";
import { withActionExceptionHandler } from "@/utils/server";
import { isTrue, trim } from "@/utils/string";

/**
 * Fetch zones with the given parameters
 * @param token - Authentication token containing JWT and user info
 * @param params - Object containing page, pageSize, sort, organizationId, keywords, name, parent, adjacentZones, status
 * @returns Object containing data and meta
 */
export const zonesFetcher = withActionExceptionHandler<
  [string, FilterRequest<ZoneInfo>],
  { data: ZoneInfo[]; meta?: Meta }
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
      $name: String
      $parent: String
      $adjacentZones: String
      $status: [Boolean]
      $updatedByUser: String
      $updatedAtFrom: DateTime
      $updatedAtTo: DateTime
    ) {
      zones(
        pagination: { page: $page, pageSize: $pageSize }
        sort: $sort
        filters: {
          organizationId: { eq: $organizationId }
          publishedAt: { ne: null }
          isActive: { in: $status }
          or: [
            { name: { containsi: $keywords } }
            { name: { containsi: $name } }
            { parent: { name: { containsi: $parent } } }
            { adjacentZones: { name: { containsi: $adjacentZones } } }
            { updatedByUser: { detail: { firstName: { containsi: $updatedByUser } } } }
            { updatedByUser: { detail: { lastName: { containsi: $updatedByUser } } } }
            { updatedAt: { gte: $updatedAtFrom, lte: $updatedAtTo } }
          ]
        }
      ) {
        data {
          id
          attributes {
            name
            parent {
              data {
                id
                attributes {
                  name
                }
              }
            }
            adjacentZones {
              data {
                id
                attributes {
                  name
                }
              }
            }
            isActive
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
                        lastName
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

  const { data, meta } = await fetcher<ZoneInfo[]>(token.jwt, query, {
    ...transformToGraphqlPayload(rest),
    ...(isActiveOptions && {
      status: isActiveOptions.map((option: string) => isTrue(option)),
    }),
  });

  return {
    status: HttpStatusCode.Ok,
    data: { data: data.zones, meta },
  };
});

/**
 * Fetch a zone with the given parameters
 * @param token - Authentication token containing JWT and user info
 * @param params - Object containing zone id and organizationId
 * @returns Object containing data and status
 */
export const zoneFetcher = withActionExceptionHandler<[string, Pick<ZoneInfo, "id" | "organizationId">], ZoneInfo>(
  async (token, params) => {
    const [_, filters] = params;

    const query = gql`
      query ($id: ID!, $organizationId: Int) {
        zones(filters: { id: { eq: $id }, organizationId: { eq: $organizationId }, publishedAt: { ne: null } }) {
          data {
            id
            attributes {
              organizationId
              name
              isActive
              description
              parent {
                data {
                  id
                  attributes {
                    name
                  }
                }
              }
              children(pagination: { limit: -1 }) {
                data {
                  id
                  attributes {
                    name
                  }
                }
              }
              adjacentZones(pagination: { limit: -1 }) {
                data {
                  id
                  attributes {
                    name
                    parent {
                      data {
                        id
                        attributes {
                          name
                        }
                      }
                    }
                    adjacentZones(pagination: { limit: -1 }) {
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
              routePoints(pagination: { limit: -1 }) {
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
                          ward {
                            data {
                              id
                              attributes {
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
              createdAt
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
                          lastName
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
                    detail {
                      data {
                        id
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

    const { data } = await fetcher<ZoneInfo[]>(token.jwt, query, transformToGraphqlPayload(filters));

    return {
      status: HttpStatusCode.Ok,
      data: data.zones?.[0],
    };
  }
);

/**
 * Fetch adjacent zones with the given parameters
 * @param token - Authentication token containing JWT and user info
 * @param params - Object containing page, pageSize, sort, organizationId, keywords, name, parent, adjacentZones, status
 * @returns Object containing data and meta
 */
export const adjacentZonesFetcher = withActionExceptionHandler<
  [string, FilterRequest<ZoneInfo>],
  { data: ZoneInfo[]; meta?: Meta }
>(async (token, params) => {
  const [_, filters] = params;
  const query = gql`
    query (
      $page: Int
      $pageSize: Int
      $sort: [String]
      $organizationId: Int
      $keywords: String
      $name: String
      $parent: String
      $adjacentZones: String
      $excludeId: ID
    ) {
      zones(
        pagination: { page: $page, pageSize: $pageSize }
        sort: $sort
        filters: {
          organizationId: { eq: $organizationId }
          publishedAt: { ne: null }
          id: { ne: $excludeId }
          or: [
            { name: { containsi: $keywords } }
            { name: { containsi: $name } }
            { parent: { name: { containsi: $parent } } }
            { adjacentZones: { name: { containsi: $adjacentZones } } }
            { isActive: { eq: true } }
          ]
        }
      ) {
        data {
          id
          attributes {
            name
            parent {
              data {
                id
                attributes {
                  name
                }
              }
            }
            adjacentZones {
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

  const { data, meta } = await fetcher<ZoneInfo[]>(token.jwt, query, transformToGraphqlPayload(filters));

  return {
    status: HttpStatusCode.Ok,
    data: { data: data.zones, meta },
  };
});

/**
 * Get a zone with the given parameters
 * @param token - Authentication token containing JWT and user info
 * @param params - Object containing zone id and organizationId
 * @returns Object containing data and status
 */
export const getZone = withActionExceptionHandler<Pick<ZoneInfo, "id" | "organizationId">, ZoneInfo>(
  async (token, params) => {
    const query = gql`
      query ($id: ID!, $organizationId: Int) {
        zones(filters: { id: { eq: $id }, organizationId: { eq: $organizationId }, publishedAt: { ne: null } }) {
          data {
            id
            attributes {
              organizationId
              name
              isActive
              description
              parent {
                data {
                  id
                  attributes {
                    name
                  }
                }
              }
              children(pagination: { limit: -1 }) {
                data {
                  id
                  attributes {
                    name
                  }
                }
              }
              adjacentZones(pagination: { limit: -1 }) {
                data {
                  id
                  attributes {
                    name
                  }
                }
              }
              routePoints(pagination: { limit: -1 }) {
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

    const { data } = await fetcher<ZoneInfo[]>(token.jwt, query, transformToGraphqlPayload(params));

    return {
      status: HttpStatusCode.Ok,
      data: data.zones?.[0],
    };
  }
);

/**
 * Fetch zone options with the given parameters
 * @param token - Authentication token containing JWT and user info
 * @param params - Object containing sort and organizationId
 * @returns Object containing data and meta
 */
export const zoneOptionsFetcher = withActionExceptionHandler<[string, FilterRequest<ZoneInfo>], ZoneInfo[]>(
  async (token, params) => {
    const [_, filters] = params;
    const query = gql`
      query ($sort: [String], $organizationId: Int, $excludeId: ID) {
        zones(
          pagination: { limit: -1 }
          sort: $sort
          filters: {
            organizationId: { eq: $organizationId }
            publishedAt: { ne: null }
            isActive: { eq: true }
            id: { ne: $excludeId }
          }
        ) {
          data {
            id
            attributes {
              name
              parent {
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
    `;

    const { data } = await fetcher<ZoneInfo[]>(token.jwt, query, {
      sort: ["name:asc"],
      ...transformToGraphqlPayload(filters),
    });

    return {
      status: HttpStatusCode.Ok,
      data: data.zones,
    };
  }
);

/**
 * Check if a zone exists and matches the given criteria
 * @param token - Authentication token containing JWT and user info
 * @param params - Object containing zone id, organizationId and updatedAt timestamp
 * @returns Status indicating if zone exists and matches criteria
 */
export const checkZoneExclusives = withActionExceptionHandler<
  Pick<ZoneInputForm, "id" | "organizationId" | "updatedAt">,
  boolean
>(async (token, params) => {
  const query = gql`
    query ($id: ID!, $organizationId: Int!, $updatedAt: DateTime!) {
      zones(
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

  // Fetch matching zones from API
  const { data } = await fetcher<ZoneInfo[]>(token.jwt, query, transformToGraphqlPayload(params));

  // Return OK if matching zone found, otherwise Exclusive error
  return {
    status: data.zones.length > 0 ? HttpStatusCode.Ok : HttpStatusCode.Exclusive,
  };
});

/**
 * Check if a zone exists with the given parameters
 * @param token - Authentication token containing JWT and user info
 * @param params - Object containing zone id, organizationId and name
 * @returns Status indicating if zone exists
 */
export const checkZoneExistence = withActionExceptionHandler<
  Pick<ZoneInputForm, "organizationId" | "name"> & { excludeId?: number },
  boolean
>(async (token, params) => {
  const query = gql`
    query ($excludeId: ID, $organizationId: Int!, $name: String!) {
      zones(
        filters: {
          organizationId: { eq: $organizationId }
          id: { ne: $excludeId }
          name: { eq: $name }
          publishedAt: { ne: null }
        }
      ) {
        data {
          id
        }
      }
    }
  `;

  // Fetch matching zones from API
  const { data } = await fetcher<ZoneInfo[]>(token.jwt, query, transformToGraphqlPayload(params));

  // Return OK if matching zone found, otherwise Existed error
  return {
    status: data.zones?.length > 0 ? HttpStatusCode.Existed : HttpStatusCode.Ok,
  };
});

/**
 * Update a zone with the given parameters
 * @param token - Authentication token containing JWT and user info
 * @param params - Object containing zone id, updatedAt timestamp and other zone data
 * @returns Status indicating if zone was updated successfully
 */
export const updateZone = withActionExceptionHandler<ZoneInputForm, ZoneInfo>(async (token, params) => {
  const { id, updatedAt, ...rest } = trim(params);

  // Check if zone is exclusive
  const { status: exclusiveStatus } = await checkZoneExclusives({ id, organizationId: token.user?.orgId, updatedAt });
  if (exclusiveStatus !== HttpStatusCode.Ok) {
    return { status: exclusiveStatus };
  }

  // Check if zone is existed
  const { status: existedStatus } = await checkZoneExistence({
    organizationId: token.user?.orgId,
    name: rest.name,
    excludeId: id,
  });

  // If zone is not existed, return error
  if (existedStatus !== HttpStatusCode.Ok) {
    return { status: existedStatus };
  }

  // Get list of updated adjacent zone IDs from params
  const updatedAdjacentZones = (params?.adjacentZones ?? []).map((adjacentZone) => Number(adjacentZone.id));

  // Get current adjacent zones from database
  const currentAdjacentZones = await prisma.zonesAdjacentZonesLinks.findMany({ where: { zoneId: Number(id) } });

  // Find adjacent zones that were removed by comparing current vs updated
  const removedAdjacentZonesIds = currentAdjacentZones
    .filter((adjacentZone) => !updatedAdjacentZones.includes(adjacentZone.adjacentZoneId))
    .map((adjacentZone) => adjacentZone.adjacentZoneId);

  // Delete removed adjacent zone links from database
  if (removedAdjacentZonesIds.length > 0) {
    await prisma.zonesAdjacentZonesLinks.deleteMany({
      where: {
        AND: [{ zoneId: { in: removedAdjacentZonesIds } }, { adjacentZoneId: Number(id) }],
      },
    });
  }

  // Find new adjacent zones by comparing updated vs current
  const newAdjacentZones = updatedAdjacentZones
    .filter(
      (adjacentZone) =>
        !currentAdjacentZones.some((currentAdjacentZone) => equalId(currentAdjacentZone.adjacentZoneId, adjacentZone))
    )
    .map((adjacentZone) => ({
      zoneId: Number(adjacentZone),
      adjacentZoneId: Number(id),
    }));

  // Create new adjacent zone links in database
  if (newAdjacentZones.length > 0) {
    await prisma.zonesAdjacentZonesLinks.createMany({ data: newAdjacentZones });
  }

  const mutation = gql`
    mutation ($id: ID!, $data: ZoneInput!) {
      updateZone(id: $id, data: $data) {
        data {
          id
        }
      }
    }
  `;

  // Call API to update zone
  const { data } = await fetcher<ZoneInfo>(token.jwt, mutation, {
    id,
    data: {
      ...transformToGraphqlPayload(rest),
      organizationId: token.user?.orgId,
      updatedByUser: token.user?.id,
    },
  });

  return {
    status: HttpStatusCode.Ok,
    data: data.updateZone,
  };
});

/**
 * Create a zone with the given parameters
 * @param token - Authentication token containing JWT and user info
 * @param params - Object containing zone data
 * @returns Status indicating if zone was created successfully
 */
export const createZone = withActionExceptionHandler<ZoneInputForm, ZoneInfo>(async (token, params) => {
  // Check if zone is existed
  const { status: existedStatus } = await checkZoneExistence({ organizationId: token.user?.orgId, name: params.name });
  if (existedStatus !== HttpStatusCode.Ok) {
    return { status: existedStatus };
  }

  const mutation = gql`
    mutation ($data: ZoneInput!) {
      createZone(data: $data) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<ZoneInfo>(token.jwt, mutation, {
    data: {
      ...transformToGraphqlPayload(params),
      organizationId: token.user?.orgId,
      createdByUser: token.user?.id,
      updatedByUser: token.user?.id,
      publishedAt: new Date().toISOString(),
    },
  });

  // Map adjacent zones from params to create links between zones
  const newAdjacentZones = (params?.adjacentZones ?? []).map((adjacentZone) => ({
    zoneId: Number(adjacentZone.id),
    adjacentZoneId: Number(data.createZone?.id),
  }));

  // If there are adjacent zones specified, create many-to-many relationships
  if (newAdjacentZones.length > 0) {
    await prisma.zonesAdjacentZonesLinks.createMany({ data: newAdjacentZones });
  }

  return {
    status: HttpStatusCode.Ok,
    data: data.createZone,
  };
});

/**
 * Delete a zone with the given parameters
 * @param token - Authentication token containing JWT and user info
 * @param params - Object containing zone id, organizationId and updatedAt timestamp
 * @returns Status indicating if zone was deleted successfully
 */
export const deleteZone = withActionExceptionHandler<
  Pick<ZoneInputForm, "id" | "organizationId" | "updatedAt">,
  ZoneInfo
>(async (token, params) => {
  const { id, organizationId, updatedAt } = trim(params);

  // Check if zone is exclusive
  const { status: exclusiveStatus } = await checkZoneExclusives({ id, organizationId, updatedAt });
  if (exclusiveStatus !== HttpStatusCode.Ok) {
    return { status: exclusiveStatus };
  }

  const mutation = gql`
    mutation ($id: ID!, $data: ZoneInput!) {
      updateZone(id: $id, data: $data) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<ZoneInfo>(token.jwt, mutation, {
    id,
    data: {
      publishedAt: null,
      updatedByUser: token.user?.id,
    },
  });

  return {
    status: HttpStatusCode.Ok,
    data: data.updateZone,
  };
});
