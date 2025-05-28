import { gql } from "graphql-request";
import { isArray } from "lodash";

import { ErrorType } from "@/types";
import { HttpStatusCode } from "@/types/api";
import { FilterRequest } from "@/types/filter";
import { MutationResult } from "@/types/graphql";
import { VehicleTypeInfo } from "@/types/strapi";
import { graphQLPost } from "@/utils/api";
import { endOfDay, startOfDay } from "@/utils/date";
import { trim } from "@/utils/string";
import { ensureString } from "@/utils/string";

/**
 * This function fetches a vehicle type based on provided parameters.
 *
 * @param args - An array containing a string and parameters for the query.
 * @returns A promise that resolves to a VehicleTypeInfo object or undefined.
 */
export const vehicleTypeFetcher = async ([_, params]: [string, Partial<VehicleTypeInfo>]): Promise<
  VehicleTypeInfo | undefined
> => {
  const { data } = await graphQLPost<VehicleTypeInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        vehicleTypes(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
          data {
            id
            attributes {
              name
              description
              driverExpenseRate
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

  return data?.vehicleTypes[0];
};

/**
 * This function fetches a list of vehicle types based on the provided parameters.
 *
 * @param args - An array containing a string and parameters for the query.
 * @returns An object with the retrieved data and metadata.
 */
export const vehicleTypesFetcher = async ([_, params]: [string, FilterRequest<VehicleTypeInfo>]) => {
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
  } = params;

  let createdAtCondition = "";
  let updatedAtCondition = "";
  if (createdAtFrom || createdAtTo) {
    createdAtCondition = `createdAt: {
                            ${createdAtFrom ? "gte: $createdAtFrom" : ""}
                            ${createdAtTo ? "lte: $createdAtTo" : ""}
                          }`;
  }
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

  const { data, meta } = await graphQLPost<VehicleTypeInfo[]>({
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
          vehicleTypes(
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

  return { data: data?.vehicleTypes ?? [], meta: meta };
};

/**
 * This function fetches a single vehicle type based on organization ID and type ID.
 *
 * @param organizationId - The ID of the organization.
 * @param id - The ID of the vehicle type to retrieve.
 * @returns A promise that resolves to a VehicleTypeInfo object or undefined.
 */
export const getVehicleType = async (organizationId: number, id: number): Promise<VehicleTypeInfo | undefined> => {
  const { data } = await graphQLPost<VehicleTypeInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        vehicleTypes(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
          data {
            id
            attributes {
              name
              description
              driverExpenseRate
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

  return data?.vehicleTypes[0];
};

/**
 * Checks if a specific vehicle type has been updated the user last updater.
 *
 * @param organizationId - The ID of the organization.
 * @param id - The ID of the vehicle type to check.
 * @param lastUpdatedAt - The user last updater.
 * @returns - A promise that resolves to true if the vehicle type info has been updated, otherwise false.
 */
export const checkVehicleTypeExclusives = async (
  organizationId: number,
  id: number,
  lastUpdatedAt: Date | string
): Promise<boolean> => {
  const { data } = await graphQLPost<VehicleTypeInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        vehicleTypes(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
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

  return data?.vehicleTypes[0]?.updatedAt !== lastUpdatedAt;
};

/**
 * Checks if a specific vehicle type has been updated the user last updater.
 *
 * @param organizationId - The ID of the organization.
 * @param id - The ID of the vehicle type to check.
 * @param lastUpdatedAt - The user last updater.
 * @returns - A promise that resolves to true if the vehicle type has been updated, otherwise false.
 */
export const checkVehicleTypeNameExists = async (
  organizationId: number,
  name: string,
  excludeId?: number
): Promise<boolean> => {
  const query = excludeId
    ? gql`
        query ($organizationId: Int!, $name: String!, $excludeId: ID) {
          vehicleTypes(
            filters: {
              organizationId: { eq: $organizationId }
              name: { eq: $name }
              id: { ne: $excludeId }
              publishedAt: { ne: null }
            }
          ) {
            data {
              id
            }
          }
        }
      `
    : gql`
        query ($organizationId: Int!, $name: String!) {
          vehicleTypes(
            filters: { organizationId: { eq: $organizationId }, name: { eq: $name }, publishedAt: { ne: null } }
          ) {
            data {
              id
            }
          }
        }
      `;
  const { data } = await graphQLPost<VehicleTypeInfo[]>({
    query,
    params: {
      ...(excludeId && { excludeId }),
      name,
      organizationId,
    },
  });

  return (data?.vehicleTypes.length ?? 0) > 0;
};

/**
 * Creates a new vehicle type entity in the system.
 *
 * @param entity - The vehicle type info entity to be created, omitting the ID field.
 * @returns - A promise that resolves to a `MutationResult` containing the created vehicle type if successful,
 * or an error type if the creation fails.
 */
export const createVehicleType = async (
  entity: Omit<VehicleTypeInfo, "id">
): Promise<MutationResult<VehicleTypeInfo>> => {
  const processedEntity = trim(entity);

  const isNameExists = await checkVehicleTypeNameExists(processedEntity.organizationId, processedEntity.name);
  if (isNameExists) {
    return { error: ErrorType.EXISTED };
  }

  const { createdById, ...otherEntityProps } = processedEntity;
  const { status, data } = await graphQLPost<VehicleTypeInfo>({
    query: gql`
      mutation (
        $organizationId: Int!
        $name: String!
        $description: String
        $driverExpenseRate: Float
        $isActive: Boolean!
        $publishedAt: DateTime
        $createdById: ID
      ) {
        createVehicleType(
          data: {
            organizationId: $organizationId
            name: $name
            description: $description
            driverExpenseRate: $driverExpenseRate
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
    return { data: data.createVehicleType };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * Updates an existing vehicle type entity in the system.
 *
 * @param entity - The vehicle type entity to be updated.
 * @param lastUpdatedAt - The last updated timestamp of the entity, used for exclusivity checking.
 * @returns - A promise that resolves to a `MutationResult` containing the updated vehicle type if successful,
 * or an error type if the update fails.
 */
export const updateVehicleType = async (
  entity: VehicleTypeInfo,
  lastUpdatedAt?: Date | string
): Promise<MutationResult<VehicleTypeInfo>> => {
  const { organizationId, id, name, description, driverExpenseRate, isActive, updatedById } = trim(entity);

  // Check for exclusivity if lastUpdatedAt is provided
  if (lastUpdatedAt) {
    const isErrorExclusives = await checkVehicleTypeExclusives(organizationId, id, lastUpdatedAt);
    if (isErrorExclusives) {
      return { error: ErrorType.EXCLUSIVE };
    }
  }

  // Check if the merchandise type name already exists in the organization
  const isNameExists = await checkVehicleTypeNameExists(Number(organizationId), ensureString(entity.name), id);
  if (isNameExists) {
    return { error: ErrorType.EXISTED };
  }

  const { status, data } = await graphQLPost<VehicleTypeInfo>({
    query: gql`
      mutation (
        $id: ID!
        $name: String!
        $description: String
        $driverExpenseRate: Float
        $isActive: Boolean
        $updatedById: ID
      ) {
        updateVehicleType(
          id: $id
          data: {
            name: $name
            description: $description
            driverExpenseRate: $driverExpenseRate
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
      driverExpenseRate,
      isActive,
      updatedById,
    },
  });

  if (status === HttpStatusCode.Ok && data) {
    return { data: data.updateVehicleType };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * Deletes a vehicle type entity from the system.
 *
 * @param entity - The vehicle type entity to be deleted, containing organizationId, id, and updatedById.
 * @param lastUpdatedAt - The last updated timestamp of the entity, used for exclusivity checking.
 * @returns - A promise that resolves to a `MutationResult` indicating the result of the deletion operation.
 */
export const deleteVehicleType = async (
  entity: Pick<VehicleTypeInfo, "organizationId" | "id" | "updatedById">,
  lastUpdatedAt?: Date | string
): Promise<MutationResult<VehicleTypeInfo>> => {
  const { organizationId, id, updatedById } = entity;

  // Check for exclusivity if lastUpdatedAt is provided
  if (lastUpdatedAt) {
    const isErrorExclusives = await checkVehicleTypeExclusives(organizationId, id, lastUpdatedAt);
    if (isErrorExclusives) {
      return { error: ErrorType.EXCLUSIVE };
    }
  }

  const { status, data } = await graphQLPost<VehicleTypeInfo>({
    query: gql`
      mutation ($id: ID!, $updatedById: ID!) {
        updateVehicleType(id: $id, data: { publishedAt: null, updatedByUser: $updatedById }) {
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
    return { data: data.updateVehicleType };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * Fetches a list of active vehicle types for a specific organization.
 *
 * @param params - An object containing the organization ID.
 * @returns An array of active vehicle types with their names, descriptions, and activity status.
 */
export const vehicleOptionsFetcher = async ([_, params]: [
  string,
  Partial<VehicleTypeInfo> & { excludeIds?: number[] },
]) => {
  const { data } = await graphQLPost<VehicleTypeInfo[]>({
    query: gql`
      query ($organizationId: Int!, $excludeIds: [ID]) {
        vehicleTypes(
          filters: {
            organizationId: { eq: $organizationId }
            isActive: { eq: true }
            id: { notIn: $excludeIds }
            publishedAt: { ne: null }
          }
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
    params: {
      organizationId: params.organizationId,
      ...(params.excludeIds && { excludeIds: params.excludeIds }),
    },
  });

  return data?.vehicleTypes ?? [];
};
