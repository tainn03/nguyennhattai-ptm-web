import { gql } from "graphql-request";
import isArray from "lodash/isArray";

import { ErrorType } from "@/types";
import { HttpStatusCode } from "@/types/api";
import { FilterRequest } from "@/types/filter";
import { MutationResult } from "@/types/graphql";
import { MaintenanceTypeInfo } from "@/types/strapi";
import { graphQLPost } from "@/utils/api";
import { endOfDay, startOfDay } from "@/utils/date";
import { ensureString, trim } from "@/utils/string";

/**
 * Fetches maintenance type information based on specified parameters from the GraphQL API.
 *
 * @param {Partial<MaintenanceTypeInfo>} params - Parameters for filtering maintenance types.
 * @returns {Promise<MaintenanceTypeInfo | null>} A promise that resolves to the fetched maintenance type or null if not found.
 */
export const maintenanceTypeFetcher = async ([_, params]: [string, Partial<MaintenanceTypeInfo>]): Promise<
  MaintenanceTypeInfo | undefined
> => {
  const { data } = await graphQLPost<MaintenanceTypeInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        maintenanceTypes(
          filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }
        ) {
          data {
            id
            attributes {
              name
              description
              isActive
              type
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

  return data?.maintenanceTypes[0];
};

/**
 * Fetches maintenance types based on specified filters.
 *
 * @param params - Filter parameters for fetching maintenance types.
 * @returns An object containing maintenance type data and metadata.
 */
export const maintenanceTypesFetcher = async ([_, params]: [string, FilterRequest<MaintenanceTypeInfo>]) => {
  const {
    page,
    pageSize,
    sort,
    keywords,
    organizationId,
    name,
    typeOptions,
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
  let searchParams = {};

  if (keywords && name) {
    if (isNaN(keywords)) {
      // Search by name
      graphQLParams = "$keywords: String";
      searchCondition = `or: [
                            { name: { containsi: $keywords } }
                            { name: { containsi: $name } }
                          ]`;
      searchParams = { keywords, name };
    } else {
      // Search by ID
      graphQLParams = `$keywordId: ID
                       $keywordName: String`;
      searchCondition = `or: [
                            { name: { containsi: $keywordName } }
                            { name: { containsi: $name } }
                            { id: { eq: $keywordId } }
                          ]`;
      searchParams = { keywordId: Number(keywords), keywordName: keywords, name };
    }
  } else if (keywords) {
    if (isNaN(keywords)) {
      // Search by name
      graphQLParams = "$keywords: String";
      searchCondition = "name: { containsi: $keywords }";
      searchParams = { keywords };
    } else {
      // Search by ID
      graphQLParams = `$keywordId: ID
                       $keywordName: String`;
      searchCondition = `or: [
                            { name: { containsi: $keywordName } }
                            { id: { eq: $keywordId } }
                          ]`;
      searchParams = { keywordId: Number(keywords), keywordName: keywords };
    }
  } else if (name) {
    searchCondition = "name: { containsi: $name }";
    searchParams = { name };
  }

  const { data, meta } = await graphQLPost<MaintenanceTypeInfo[]>({
    query: gql`
        query (
          $page: Int
          $pageSize: Int
          $organizationId: Int!
          $sort: [String]
          ${graphQLParams}
          ${name ? " $name: String" : ""}
          ${isArray(typeOptions) && typeOptions.length > 0 ? "$type: [String]" : ""}
          ${isArray(isActiveOptions) && isActiveOptions.length > 0 ? "$isActive: [Boolean]" : ""}
          ${createdByUser ? "$createdByUser: String" : ""}
          ${createdAtFrom ? "$createdAtFrom: DateTime" : ""}
          ${createdAtTo ? "$createdAtTo: DateTime" : ""}
          ${updatedByUser ? "$updatedByUser: String" : ""}
          ${updatedAtFrom ? "$updatedAtFrom: DateTime" : ""}
          ${updatedAtTo ? "$updatedAtTo: DateTime" : ""}
        ) {
          maintenanceTypes(
            pagination: { page: $page, pageSize: $pageSize }
            sort: $sort
            filters: {
              publishedAt: { ne: null }
              organizationId: { eq: $organizationId }
              ${searchCondition}
              ${isArray(typeOptions) && typeOptions.length > 0 ? "type: { in: $type }" : ""}
              ${isArray(isActiveOptions) && isActiveOptions.length > 0 ? "isActive: { in: $isActive }" : ""}
              ${createdByUser ? "createdByUser: { username: { containsi: $createdByUser } }" : ""}
              ${createdAtCondition}
              ${updatedByUser ? "updatedByUser: { username: { containsi: $updatedByUser } }" : ""}
              ${updatedAtCondition}
            }
          ) {
            data {
              id
              attributes {
                name
                isActive
                type
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
      ...(isArray(typeOptions) && typeOptions.length > 0 && { type: typeOptions }),
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

  return { data: data?.maintenanceTypes ?? [], meta };
};

/**
 * Retrieves a maintenance type from the server.
 *
 * @param organizationId - The ID of the organization associated with the maintenance type.
 * @param id - The ID of the maintenance type to retrieve.
 * @returns A promise that resolves to the requested maintenance type if found, or null if not found.
 */
export const getMaintenanceType = async (
  organizationId: number,
  id: number
): Promise<MaintenanceTypeInfo | undefined> => {
  const { data } = await graphQLPost<MaintenanceTypeInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        maintenanceTypes(
          filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }
        ) {
          data {
            id
            attributes {
              name
              description
              isActive
              type
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

  return data?.maintenanceTypes[0];
};

/**
 * Checks if a maintenance type has been updated since a specified date.
 *
 * @param {number} organizationId - The ID of the organization to which the maintenance type belongs.
 * @param {number} id - The ID of the maintenance type to check.
 * @param {Date | string} lastUpdatedAt - The date to compare against the maintenance type's last updated timestamp.
 * @returns {Promise<boolean>} A promise that resolves to true if the maintenance type has been updated, otherwise false.
 */
export const checkMaintenanceTypeExclusives = async (
  organizationId: number,
  id: number,
  lastUpdatedAt: Date | string
): Promise<boolean> => {
  const { data } = await graphQLPost<MaintenanceTypeInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        maintenanceTypes(
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

  return data?.maintenanceTypes[0]?.updatedAt !== lastUpdatedAt;
};

/**
 * Checks if a maintenance type name exists within an organization, optionally excluding a specific maintenance type ID.
 *
 * @param {number} organizationId - The ID of the organization to search within.
 * @param {string} name - The maintenance type name to check for.
 * @param {number | undefined} excludeId - (Optional) The ID of a maintenance type to exclude from the check.
 * @returns {Promise<boolean>} A promise that resolves to true if the maintenance type name exists, otherwise false.
 */
export const checkMaintenanceTypeNameExists = async (
  organizationId: number,
  name: string,
  type: string,
  excludeId?: number
): Promise<boolean> => {
  const query = gql`
    query (
      $organizationId: Int!
      $name: String!
      $type: String
      ${excludeId ? "$excludeId: ID" : ""}
    ) {
      maintenanceTypes(
        filters: {
          publishedAt: { ne: null }
          organizationId: { eq: $organizationId }
          name: { eq: $name }
          type: {eq: $type}
          ${excludeId ? "id: { ne: $excludeId }" : ""}
        }
      ) {
        data {
          id
        }
      }
    }
  `;
  const { data } = await graphQLPost<MaintenanceTypeInfo[]>({
    query,
    params: {
      ...(excludeId && { excludeId }),
      name,
      type,
      organizationId,
    },
  });

  return (data?.maintenanceTypes.length ?? 0) > 0;
};

/**
 * Creates a new maintenance type.
 *
 * @param entity - The maintenance type to create.
 * @returns The ID of the newly created maintenance type.
 */
export const createMaintenanceType = async (
  entity: Omit<MaintenanceTypeInfo, "id">
): Promise<MutationResult<MaintenanceTypeInfo>> => {
  const { organizationId, name, type, ...otherEntityProps } = trim(entity);

  const isNameExists = await checkMaintenanceTypeNameExists(organizationId, name, type);
  if (isNameExists) {
    return { error: ErrorType.EXISTED };
  }

  const { status, data } = await graphQLPost<MaintenanceTypeInfo>({
    query: gql`
      mutation (
        $organizationId: Int!
        $name: String!
        $description: String
        $type: ENUM_MAINTENANCETYPE_TYPE
        $isActive: Boolean!
        $publishedAt: DateTime
        $createdById: ID
      ) {
        createMaintenanceType(
          data: {
            organizationId: $organizationId
            name: $name
            description: $description
            type: $type
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
    params: { ...otherEntityProps, organizationId, name, type, publishedAt: new Date() },
  });

  if (status === HttpStatusCode.Ok && data) {
    return { data: data.createMaintenanceType };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * Updates a maintenance type's attributes within the organization.
 *
 * @param {MaintenanceTypeInfo} entity - The maintenance type entity to update.
 * @param {Date | string | undefined} lastUpdatedAt - (Optional) The last updated timestamp of the entity.
 * @returns {Promise<MaintenanceTypeInfo | ErrorType>} A promise that resolves to the updated maintenance type or an error type.
 */
export const updateMaintenanceType = async (
  entity: MaintenanceTypeInfo,
  lastUpdatedAt?: Date | string
): Promise<MutationResult<MaintenanceTypeInfo>> => {
  const { organizationId, id, name, description, isActive, updatedById, type } = trim(entity);

  // Check for exclusivity if lastUpdatedAt is provided
  if (lastUpdatedAt) {
    const isErrorExclusives = await checkMaintenanceTypeExclusives(organizationId, id, lastUpdatedAt);
    if (isErrorExclusives) {
      return { error: ErrorType.EXCLUSIVE };
    }
  }

  // Check if the maintenance type name already exists in the organization
  const isNameExists = await checkMaintenanceTypeNameExists(
    Number(organizationId),
    ensureString(entity.name),
    type,
    id
  );
  if (isNameExists) {
    return { error: ErrorType.EXISTED };
  }

  const { status, data } = await graphQLPost<MaintenanceTypeInfo>({
    query: gql`
      mutation (
        $id: ID!
        $name: String!
        $description: String
        $type: ENUM_MAINTENANCETYPE_TYPE
        $isActive: Boolean
        $updatedById: ID
      ) {
        updateMaintenanceType(
          id: $id
          data: {
            name: $name
            description: $description
            type: $type
            isActive: $isActive
            updatedByUser: $updatedById
          }
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
      type,
      updatedById,
    },
  });

  if (status === HttpStatusCode.Ok && data) {
    return { data: data.updateMaintenanceType };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * Deletes an existing maintenance type.
 *
 * @param {Pick<MaintenanceTypeInfo, "organizationId" | "id" | "updatedById">} entity - The maintenance type entity to delete.
 * @param {Date | string | undefined} lastUpdatedAt - (Optional) The last updated timestamp of the entity.
 * @returns {Promise<MaintenanceTypeInfo | ErrorType>} A promise that resolves to the deleted maintenance type or an error type.
 */
export const deleteMaintenanceType = async (
  entity: Pick<MaintenanceTypeInfo, "organizationId" | "id" | "updatedById">,
  lastUpdatedAt?: Date | string
): Promise<MutationResult<MaintenanceTypeInfo>> => {
  const { organizationId, id, updatedById } = entity;

  // Check for exclusivity if lastUpdatedAt is provided
  if (lastUpdatedAt) {
    const isErrorExclusives = await checkMaintenanceTypeExclusives(organizationId, id, lastUpdatedAt);
    if (isErrorExclusives) {
      return { error: ErrorType.EXCLUSIVE };
    }
  }

  const { status, data } = await graphQLPost<MaintenanceTypeInfo>({
    query: gql`
      mutation ($id: ID!, $updatedById: ID!) {
        updateMaintenanceType(id: $id, data: { publishedAt: null, updatedByUser: $updatedById }) {
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
    return { data: data.updateMaintenanceType };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * Fetches maintenance type options from the GraphQL API.
 *
 * @param {Partial<MaintenanceTypeInfo>} params - Parameters for filtering maintenance types.
 * @returns {Promise<MaintenanceTypeInfo[] >} A promise that resolves to the fetched maintenance types or undefined if not found.
 */
export const maintenanceTypeOptionsFetcher = async ([_, params]: [string, Partial<MaintenanceTypeInfo>]): Promise<
  MaintenanceTypeInfo[]
> => {
  const { data } = await graphQLPost<MaintenanceTypeInfo[]>({
    query: gql`
      query ($organizationId: Int!) {
        maintenanceTypes(
          filters: { organizationId: { eq: $organizationId }, isActive: { eq: true }, publishedAt: { ne: null } }
          pagination: { limit: -1 }
        ) {
          data {
            id
            attributes {
              name
              type
            }
          }
        }
      }
    `,
    params,
  });

  return data?.maintenanceTypes ?? [];
};
