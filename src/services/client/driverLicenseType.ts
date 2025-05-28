import { gql } from "graphql-request";
import isArray from "lodash/isArray";

import { ErrorType } from "@/types";
import { HttpStatusCode } from "@/types/api";
import { FilterRequest } from "@/types/filter";
import { MutationResult } from "@/types/graphql";
import { DriverLicenseTypeInfo } from "@/types/strapi";
import { graphQLPost } from "@/utils/api";
import { endOfDay, startOfDay } from "@/utils/date";
import { trim } from "@/utils/string";

/**
 * Fetches driver license type information based on specified parameters from the GraphQL API.
 *
 * @param {Partial<DriverLicenseTypeInfo>} params - Parameters for filtering driver license types.
 * @returns {Promise<DriverLicenseTypeInfo | undefined>} A promise that resolves to the fetched driver license type or null if not found.
 */
export const driverLicenseTypeFetcher = async ([_, params]: [string, Partial<DriverLicenseTypeInfo>]): Promise<
  DriverLicenseTypeInfo | undefined
> => {
  const { data } = await graphQLPost<DriverLicenseTypeInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        driverLicenseTypes(
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

  return data?.driverLicenseTypes[0];
};

/**
 * Fetch driver License types from the server based on the provided filter parameters.
 *
 * @param params - An object containing filter parameters for the query.
 * @returns An object containing the fetched driver License types and pagination meta information.
 */
export const driverLicenseTypesFetcher = async ([_, params]: [string, FilterRequest<DriverLicenseTypeInfo>]) => {
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
      searchParams = { keywordId: Number(keywords), keywordName: keywords };
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

  const { data, meta } = await graphQLPost<DriverLicenseTypeInfo[]>({
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
          driverLicenseTypes(
            pagination: { page: $page, pageSize: $pageSize }
            sort: $sort
            filters: {
              publishedAt: { ne: null }
              organizationId: { eq: $organizationId }
              ${searchCondition}
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

  return { data: data?.driverLicenseTypes ?? [], meta };
};

/**
 * Retrieves a driver License type from the server.
 *
 * @param organizationId - The ID of the organization associated with the driver License type.
 * @param id - The ID of the driver License type to retrieve.
 * @returns A promise that resolves to the requested driver License type if found, or null if not found.
 */
export const getDriverLicenseType = async (
  organizationId: number,
  id: number
): Promise<DriverLicenseTypeInfo | undefined> => {
  const { data } = await graphQLPost<DriverLicenseTypeInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        driverLicenseTypes(
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

  return data?.driverLicenseTypes[0];
};

/**
 * Checks if a driver License type has been updated since a specified date.
 *
 * @param {number} organizationId - The ID of the organization to which the driver License type belongs.
 * @param {number} id - The ID of the driver License type to check.
 * @param {Date | string} lastUpdatedAt - The date to compare against the driver License type's last updated timestamp.
 * @returns {Promise<boolean>} A promise that resolves to true if the driver License type has been updated, otherwise false.
 */
export const checkDriverLicenseTypeExclusives = async (
  organizationId: number,
  id: number,
  lastUpdatedAt: Date | string
): Promise<boolean> => {
  const { data } = await graphQLPost<DriverLicenseTypeInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        driverLicenseTypes(
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

  return data?.driverLicenseTypes[0]?.updatedAt !== lastUpdatedAt;
};

/**
 * Checks if a driver license type name exists within an organization, optionally excluding a specific driver license type ID.
 *
 * @param {number} organizationId - The ID of the organization to search within.
 * @param {string} name - The driver license type name to check for.
 * @param {number | undefined} excludeId - (Optional) The ID of a driver license type to exclude from the check.
 * @returns {Promise<boolean>} A promise that resolves to true if the driver license type name exists, otherwise false.
 */
export const checkDriverLicenseTypeNameExists = async (
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
      driverLicenseTypes(
        filters: {
          publishedAt: { ne: null }
          organizationId: { eq: $organizationId }
          name: { eq: $name }
          ${excludeId ? "id: { ne: $excludeId }" : ""}
        }
      ) {
        data {
          id
        }
      }
    }
  `;
  const { data } = await graphQLPost<DriverLicenseTypeInfo[]>({
    query,
    params: {
      ...(excludeId && { excludeId }),
      name,
      organizationId,
    },
  });

  return (data?.driverLicenseTypes.length ?? 0) > 0;
};

/**
 * Creates a new driver license type.
 *
 * @param entity - The driver license type to create.
 * @returns The ID of the newly created driver license type.
 */
export const createDriverLicenseType = async (
  entity: Omit<DriverLicenseTypeInfo, "id">
): Promise<MutationResult<DriverLicenseTypeInfo>> => {
  const processedEntity = trim(entity);

  const isNameExists = await checkDriverLicenseTypeNameExists(processedEntity.organizationId, processedEntity.name);
  if (isNameExists) {
    return { error: ErrorType.EXISTED };
  }

  const { createdById, ...otherEntityProps } = processedEntity;
  const { status, data } = await graphQLPost<DriverLicenseTypeInfo>({
    query: gql`
      mutation (
        $organizationId: Int!
        $name: String!
        $description: String
        $isActive: Boolean!
        $publishedAt: DateTime
        $createdById: ID
      ) {
        createDriverLicenseType(
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
    return { data: data.createDriverLicenseType };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * Updates a driver license type's attributes within the organization.
 *
 * @param {DriverLicenseTypeInfo} entity - The driver license type entity to update.
 * @param {Date | string | undefined} lastUpdatedAt - (Optional) The last updated timestamp of the entity.
 * @returns {Promise<DriverLicenseTypeInfo | ErrorType>} A promise that resolves to the updated driver license type or an error type.
 */
export const updateDriverLicenseType = async (
  entity: DriverLicenseTypeInfo,
  lastUpdatedAt?: Date | string
): Promise<MutationResult<DriverLicenseTypeInfo>> => {
  const { organizationId, id, name, description, isActive, updatedById } = trim(entity);

  // Check for exclusivity if lastUpdatedAt is provided
  if (lastUpdatedAt) {
    const isErrorExclusives = await checkDriverLicenseTypeExclusives(organizationId, id, lastUpdatedAt);
    if (isErrorExclusives) {
      return { error: ErrorType.EXCLUSIVE };
    }
  }

  // Check if the driver license type name already exists in the organization
  const isNameExists = await checkDriverLicenseTypeNameExists(organizationId, name, id);
  if (isNameExists) {
    return { error: ErrorType.EXISTED };
  }

  const { status, data } = await graphQLPost<DriverLicenseTypeInfo>({
    query: gql`
      mutation ($id: ID!, $name: String!, $description: String, $isActive: Boolean, $updatedById: ID) {
        updateDriverLicenseType(
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
    return { data: data.updateDriverLicenseType };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * Deletes an existing driver license type.
 *
 * @param {Pick<DriverLicenseTypeInfo, "organizationId" | "id" | "updatedById">} entity - The driver license type entity to delete.
 * @param {Date | string | undefined} lastUpdatedAt - (Optional) The last updated timestamp of the entity.
 * @returns {Promise<DriverLicenseTypeInfo | ErrorType>} A promise that resolves to the deleted driver license type or an error type.
 */
export const deleteDriverLicenseType = async (
  entity: Pick<DriverLicenseTypeInfo, "organizationId" | "id" | "updatedById">,
  lastUpdatedAt?: Date | string
): Promise<MutationResult<DriverLicenseTypeInfo>> => {
  const { organizationId, id, updatedById } = entity;

  // Check for exclusivity if lastUpdatedAt is provided
  if (lastUpdatedAt) {
    const isErrorExclusives = await checkDriverLicenseTypeExclusives(organizationId, id, lastUpdatedAt);
    if (isErrorExclusives) {
      return { error: ErrorType.EXCLUSIVE };
    }
  }

  const { status, data } = await graphQLPost<DriverLicenseTypeInfo>({
    query: gql`
      mutation ($id: ID!, $updatedById: ID!) {
        updateDriverLicenseType(id: $id, data: { publishedAt: null, updatedByUser: $updatedById }) {
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
    return { data: data.updateDriverLicenseType };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * Fetches driver license type options from the GraphQL API.
 *
 * @param {Partial<DriverLicenseTypeInfo>} params - Parameters for filtering driver license types.
 * @returns {Promise<DriverLicenseTypeInfo[]>} A promise that resolves to the fetched driver license types or undefined if not found.
 */
export const driverLicenseTypeOptionsFetcher = async ([_, params]: [string, Partial<DriverLicenseTypeInfo>]): Promise<
  DriverLicenseTypeInfo[]
> => {
  const { data } = await graphQLPost<DriverLicenseTypeInfo[]>({
    query: gql`
      query ($organizationId: Int!) {
        driverLicenseTypes(
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

  return data?.driverLicenseTypes || [];
};
