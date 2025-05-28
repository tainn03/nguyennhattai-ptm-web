import { gql } from "graphql-request";
import isArray from "lodash/isArray";

import { ErrorType } from "@/types";
import { HttpStatusCode } from "@/types/api";
import { FilterRequest } from "@/types/filter";
import { MutationResult } from "@/types/graphql";
import { MerchandiseTypeInfo } from "@/types/strapi";
import { graphQLPost } from "@/utils/api";
import { endOfDay, startOfDay } from "@/utils/date";
import { trim } from "@/utils/string";

/**
 * Fetches merchandise type information based on specified parameters from the GraphQL API.
 *
 * @param {Partial<MerchandiseTypeInfo>} params - Parameters for filtering merchandise types.
 * @returns {Promise<MerchandiseTypeInfo | null>} A promise that resolves to the fetched merchandise type or null if not found.
 */
export const merchandiseTypeFetcher = async ([_, params]: [string, Partial<MerchandiseTypeInfo>]): Promise<
  MerchandiseTypeInfo | undefined
> => {
  const { data } = await graphQLPost<MerchandiseTypeInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        merchandiseTypes(
          filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }
        ) {
          data {
            id
            attributes {
              name
              description
              isActive
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
            }
          }
        }
      }
    `,
    params,
  });

  return data?.merchandiseTypes[0];
};

/**
 * Fetch merchandise types from the server based on the provided filter parameters.
 *
 * @param params - An object containing filter parameters for the query.
 * @returns An object containing the fetched merchandise types and pagination meta information.
 */
export const merchandiseTypesFetcher = async ([_, params]: [string, FilterRequest<MerchandiseTypeInfo>]) => {
  const {
    page,
    pageSize,
    sort,
    keywords,
    organizationId,
    name,
    isActiveOptions,
    createdByUser,
    createdAtFrom,
    createdAtTo,
    updatedByUser,
    updatedAtFrom,
    updatedAtTo,
  } = trim(params);
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
  let graphQLParams = "";
  let searchParams;

  if (keywords && name) {
    graphQLParams = "$keywords: String";
    searchCondition = `or: [
                            { name: { containsi: $keywords } }
                            { name: { containsi: $name } }
                          ]`;
    searchParams = { keywords, name };
  } else if (keywords) {
    graphQLParams = "$keywords: String";
    searchCondition = "name: { containsi: $keywords }";
    searchParams = { keywords };
  } else if (name) {
    searchCondition = "name: { containsi: $name }";
    searchParams = { name };
  }

  const { data, meta } = await graphQLPost<MerchandiseTypeInfo[]>({
    query: gql`
        query (
          $page: Int
          $pageSize: Int
          $organizationId: Int!
          $sort: [String]
          ${graphQLParams}
          ${name ? " $name: String" : ""}
          ${isArray(isActiveOptions) && isActiveOptions.length > 0 ? "$isActive: [Boolean]" : ""}
          ${createdByUser ? "$createdByUser: String" : ""}
          ${createdAtFrom ? "$createdAtFrom: DateTime" : ""}
          ${createdAtTo ? "$createdAtTo: DateTime" : ""}
          ${updatedByUser ? "$updatedByUser: String" : ""}
          ${updatedAtFrom ? "$updatedAtFrom: DateTime" : ""}
          ${updatedAtTo ? "$updatedAtTo: DateTime" : ""}
        ) {
          merchandiseTypes(
            pagination: { page: $page, pageSize: $pageSize }
            sort: $sort
            filters: {
              organizationId: { eq: $organizationId }
              ${searchCondition}
              ${isArray(isActiveOptions) && isActiveOptions.length > 0 ? "isActive: { in: $isActive }" : ""}
              ${createdByUser ? "createdByUser: { username: { containsi: $createdByUser } }" : ""}
              ${createdAtCondition}
              ${updatedByUser ? "updatedByUser: { username: { containsi: $updatedByUser } }" : ""}
              ${updatedAtCondition}
              publishedAt: { ne: null }
            }
          ) {
            data {
              id
              attributes {
                name
                isActive
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
                      email
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
      page,
      pageSize,
      sort: isArray(sort) ? sort : [sort],
      ...(searchParams && { ...searchParams }),
      ...(isArray(isActiveOptions) &&
        isActiveOptions.length > 0 && { isActive: isActiveOptions.map((item) => item === "true") }),
      ...(createdByUser && { createdByUser }),
      ...(createdAtFrom && { createdAtFrom: startOfDay(createdAtFrom) }),
      ...(createdAtTo && { createdAtTo: endOfDay(createdAtTo) }),
      ...(updatedByUser && { updatedByUser }),
      ...(updatedAtFrom && { updatedAtFrom: startOfDay(updatedAtFrom) }),
      ...(updatedAtTo && { updatedAtTo: endOfDay(updatedAtTo) }),
    },
  });

  return { data: data?.merchandiseTypes ?? [], meta };
};

/**
 * Retrieves a merchandise type from the server.
 *
 * @param organizationId - The ID of the organization associated with the merchandise type.
 * @param id - The ID of the merchandise type to retrieve.
 * @returns A promise that resolves to the requested merchandise type if found, or undefined if not found.
 */
export const getMerchandiseType = async (
  organizationId: number,
  id: number
): Promise<MerchandiseTypeInfo | undefined> => {
  const { data } = await graphQLPost<MerchandiseTypeInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        merchandiseTypes(
          filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }
        ) {
          data {
            id
            attributes {
              name
              description
              isActive
              createdAt
              createdByUser {
                data {
                  id
                }
              }
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

  return data?.merchandiseTypes[0];
};

/**
 * Checks if a merchandise type has been updated since a specified date.
 *
 * @param {number} organizationId - The ID of the organization to which the merchandise type belongs.
 * @param {number} id - The ID of the merchandise type to check.
 * @param {Date | string} lastUpdatedAt - The date to compare against the merchandise type's last updated timestamp.
 * @returns {Promise<boolean>} A promise that resolves to true if the merchandise type has been updated, otherwise false.
 */
export const checkMerchandiseTypeExclusives = async (
  organizationId: number,
  id: number,
  lastUpdatedAt: Date | string
): Promise<boolean> => {
  const { data } = await graphQLPost<MerchandiseTypeInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        merchandiseTypes(
          filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }
        ) {
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

  return data?.merchandiseTypes[0]?.updatedAt !== lastUpdatedAt;
};

/**
 * Checks if a merchandise type name exists within an organization, optionally excluding a specific merchandise type ID.
 *
 * @param {number} organizationId - The ID of the organization to search within.
 * @param {string} name - The merchandise type name to check for.
 * @param {number | undefined} excludeId - (Optional) The ID of a merchandise type to exclude from the check.
 * @returns {Promise<boolean>} A promise that resolves to true if the merchandise type name exists, otherwise false.
 */
export const checkMerchandiseTypeNameExists = async (
  organizationId: number,
  name: string,
  excludeId?: number
): Promise<boolean> => {
  const query = gql`
    query (
      $organizationId: Int!
      $name: String!
      ${excludeId ? "$excludeId: ID" : ""}
    ) {
      merchandiseTypes(
        filters: {
          organizationId: { eq: $organizationId }
          name: { eq: $name }
          ${excludeId ? "id: { ne: $excludeId }" : ""}
          publishedAt: { ne: null }
        }
      ) {
        data {
          id
        }
      }
    }
  `;
  const { data } = await graphQLPost<MerchandiseTypeInfo[]>({
    query,
    params: {
      ...(excludeId && { excludeId }),
      name,
      organizationId,
    },
  });

  return (data?.merchandiseTypes.length ?? 0) > 0;
};

/**
 * Creates a new merchandise type.
 *
 * @param entity - The merchandise type to create.
 * @returns The ID of the newly created merchandise type.
 */
export const createMerchandiseType = async (
  entity: Omit<MerchandiseTypeInfo, "id">
): Promise<MutationResult<MerchandiseTypeInfo>> => {
  const processedEntity = trim(entity);

  const isNameExists = await checkMerchandiseTypeNameExists(processedEntity.organizationId, processedEntity.name);
  if (isNameExists) {
    return { error: ErrorType.EXISTED };
  }

  const { createdById, ...otherEntityProps } = processedEntity;
  const { status, data } = await graphQLPost<MerchandiseTypeInfo>({
    query: gql`
      mutation (
        $organizationId: Int!
        $name: String!
        $description: String
        $isActive: Boolean!
        $publishedAt: DateTime
        $createdById: ID
      ) {
        createMerchandiseType(
          data: {
            organizationId: $organizationId
            name: $name
            description: $description
            isActive: $isActive
            publishedAt: $publishedAt
            createdByUser: $createdById
            updatedByUser: $createdById
          }
        ) {
          data {
            id
          }
        }
      }
    `,
    params: {
      ...otherEntityProps,
      createdById,
      publishedAt: new Date(),
    },
  });

  if (status === HttpStatusCode.Ok && data) {
    return { data: data.createMerchandiseType };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * Updates a merchandise type's attributes within the organization.
 *
 * @param {MerchandiseTypeInfo} entity - The merchandise type entity to update.
 * @param {Date | string | undefined} lastUpdatedAt - (Optional) The last updated timestamp of the entity.
 * @returns {Promise<MerchandiseTypeInfo | ErrorType>} A promise that resolves to the updated merchandise type or an error type.
 */
export const updateMerchandiseType = async (
  entity: MerchandiseTypeInfo,
  lastUpdatedAt?: Date | string
): Promise<MutationResult<MerchandiseTypeInfo>> => {
  const { organizationId, id, name, description, isActive, updatedById } = trim(entity);

  // Check for exclusivity if lastUpdatedAt is provided
  if (lastUpdatedAt) {
    const isErrorExclusives = await checkMerchandiseTypeExclusives(organizationId, id, lastUpdatedAt);
    if (isErrorExclusives) {
      return { error: ErrorType.EXCLUSIVE };
    }
  }

  // Check if the merchandise type name already exists in the organization
  const isNameExists = await checkMerchandiseTypeNameExists(organizationId, name, id);
  if (isNameExists) {
    return { error: ErrorType.EXISTED };
  }

  const { status, data } = await graphQLPost<MerchandiseTypeInfo>({
    query: gql`
      mutation ($id: ID!, $name: String!, $description: String, $isActive: Boolean, $updatedById: ID) {
        updateMerchandiseType(
          id: $id
          data: { name: $name, description: $description, isActive: $isActive, updatedByUser: $updatedById }
        ) {
          data {
            id
          }
        }
      }
    `,
    params: {
      id,
      name,
      description,
      isActive,
      updatedById,
    },
  });

  if (status === HttpStatusCode.Ok && data) {
    return { data: data.updateMerchandiseType };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * Deletes an existing merchandise type.
 *
 * @param {Pick<MerchandiseTypeInfo, "organizationId" | "id" | "updatedById">} entity - The merchandise type entity to delete.
 * @param {Date | string | undefined} lastUpdatedAt - (Optional) The last updated timestamp of the entity.
 * @returns {Promise<MerchandiseTypeInfo | ErrorType>} A promise that resolves to the deleted merchandise type or an error type.
 */
export const deleteMerchandiseType = async (
  entity: Pick<MerchandiseTypeInfo, "organizationId" | "id" | "updatedById">,
  lastUpdatedAt?: Date | string
): Promise<MutationResult<MerchandiseTypeInfo>> => {
  const { organizationId, id, updatedById } = entity;

  // Check for exclusivity if lastUpdatedAt is provided
  if (lastUpdatedAt) {
    const isErrorExclusives = await checkMerchandiseTypeExclusives(organizationId, id, lastUpdatedAt);
    if (isErrorExclusives) {
      return { error: ErrorType.EXCLUSIVE };
    }
  }

  const { status, data } = await graphQLPost<MerchandiseTypeInfo>({
    query: gql`
      mutation ($id: ID!, $updatedById: ID!) {
        updateMerchandiseType(id: $id, data: { publishedAt: null, updatedByUser: $updatedById }) {
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
    return { data: data.updateMerchandiseType };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * Fetches merchandise type options from the GraphQL API.
 *
 * @param {Partial<MerchandiseTypeInfo>} params - Parameters for filtering merchandise types.
 * @returns {Promise<MerchandiseTypeInfo[] >} A promise that resolves to the fetched merchandise types or undefined if not found.
 */
export const merchandiseTypeOptionsFetcher = async ([_, params]: [string, Partial<MerchandiseTypeInfo>]): Promise<
  MerchandiseTypeInfo[]
> => {
  const { data } = await graphQLPost<MerchandiseTypeInfo[]>({
    query: gql`
      query ($organizationId: Int!) {
        merchandiseTypes(
          filters: { organizationId: { eq: $organizationId }, isActive: { eq: true }, publishedAt: { ne: null } }
          pagination: { limit: -1 }
        ) {
          data {
            id
            attributes {
              name
            }
          }
        }
      }
    `,
    params,
  });

  return data?.merchandiseTypes ?? [];
};
