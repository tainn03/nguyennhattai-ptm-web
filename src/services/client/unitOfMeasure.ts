import { gql } from "graphql-request";
import isArray from "lodash/isArray";

import { ErrorType } from "@/types";
import { HttpStatusCode } from "@/types/api";
import { FilterRequest } from "@/types/filter";
import { MutationResult } from "@/types/graphql";
import { UnitOfMeasureInfo } from "@/types/strapi";
import { graphQLPost } from "@/utils/api";
import { endOfDay, startOfDay } from "@/utils/date";
import { trim } from "@/utils/string";

/**
 * Fetches unit of measure information based on specified parameters from the GraphQL API.
 *
 * @param {Partial<UnitOfMeasureInfo>} params - Parameters for filtering unit of measures.
 * @returns {Promise<UnitOfMeasureInfo | null>} A promise that resolves to the fetched unit of measure or null if not found.
 */
export const unitOfMeasureFetcher = async ([_, params]: [string, Partial<UnitOfMeasureInfo>]): Promise<
  UnitOfMeasureInfo | undefined
> => {
  const { data } = await graphQLPost<UnitOfMeasureInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        unitOfMeasures(
          filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }
        ) {
          data {
            id
            attributes {
              code
              name
              description
              isActive
              isSystem
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

  return data?.unitOfMeasures[0];
};

/**
 * Fetch unit of measures from the server based on the provided filter parameters.
 *
 * @param params - An object containing filter parameters for the query.
 * @returns An object containing the fetched unit of measures and pagination meta information.
 */
export const unitOfMeasuresFetcher = async ([_, params]: [string, FilterRequest<UnitOfMeasureInfo>]) => {
  const {
    page,
    pageSize,
    sort,
    keywords,
    organizationId,
    code,
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

  const { data, meta } = await graphQLPost<UnitOfMeasureInfo[]>({
    query: gql`
        query (
          $page: Int
          $pageSize: Int
          $organizationId: Int!
          $sort: [String]
          ${graphQLParams}
          ${code ? " $code: String" : ""}
          ${name ? " $name: String" : ""}
          ${isArray(isActiveOptions) && isActiveOptions.length > 0 ? "$isActive: [Boolean]" : ""}
          ${createdByUser ? "$createdByUser: String" : ""}
          ${createdAtFrom ? "$createdAtFrom: DateTime" : ""}
          ${createdAtTo ? "$createdAtTo: DateTime" : ""}
          ${updatedByUser ? "$updatedByUser: String" : ""}
          ${updatedAtFrom ? "$updatedAtFrom: DateTime" : ""}
          ${updatedAtTo ? "$updatedAtTo: DateTime" : ""}
        ) {
          unitOfMeasures(
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
                code
                name
                isSystem
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

  return { data: data?.unitOfMeasures ?? [], meta };
};

/**
 * Retrieves a unit of measure from the server.
 *
 * @param organizationId - The ID of the organization associated with the unit of measure.
 * @param id - The ID of the unit of measure to retrieve.
 * @returns A promise that resolves to the requested unit of measure if found, or undefined if not found.
 */
export const getUnitOfMeasure = async (organizationId: number, id: number): Promise<UnitOfMeasureInfo | undefined> => {
  const { data } = await graphQLPost<UnitOfMeasureInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        unitOfMeasures(
          filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }
        ) {
          data {
            id
            attributes {
              code
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

  return data?.unitOfMeasures[0];
};

/**
 * Checks if a unit of measure has been updated since a specified date.
 *
 * @param {number} organizationId - The ID of the organization to which the unit of measure belongs.
 * @param {number} id - The ID of the unit of measure to check.
 * @param {Date | string} lastUpdatedAt - The date to compare against the unit of measure's last updated timestamp.
 * @returns {Promise<boolean>} A promise that resolves to true if the unit of measure has been updated, otherwise false.
 */
export const checkUnitOfMeasureExclusives = async (
  organizationId: number,
  id: number,
  lastUpdatedAt: Date | string
): Promise<boolean> => {
  const { data } = await graphQLPost<UnitOfMeasureInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        unitOfMeasures(
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

  return data?.unitOfMeasures[0]?.updatedAt !== lastUpdatedAt;
};

/**
 * Checks if a unit of measure name exists within an organization, optionally excluding a specific unit of measure ID.
 *
 * @param {number} organizationId - The ID of the organization to search within.
 * @param {string} code - The unit of measure code to check for.
 * @param {string} name - The unit of measure name to check for.
 * @param {number | undefined} excludeId - (Optional) The ID of a unit of measure to exclude from the check.
 * @returns {Promise<boolean>} A promise that resolves to true if the unit of measure name exists, otherwise false.
 */
export const checkUnitOfMeasureNameExists = async (
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
      unitOfMeasures(
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
  const { data } = await graphQLPost<UnitOfMeasureInfo[]>({
    query,
    params: {
      ...(excludeId && { excludeId }),
      name,
      organizationId,
    },
  });

  return (data?.unitOfMeasures.length ?? 0) > 0;
};

/**
 * Creates a new unit of measure.
 *
 * @param entity - The unit of measure to create.
 * @returns The ID of the newly created unit of measure.
 */
export const createUnitOfMeasure = async (
  entity: Omit<UnitOfMeasureInfo, "id">
): Promise<MutationResult<UnitOfMeasureInfo>> => {
  const processedEntity = trim(entity);

  const isNameExists = await checkUnitOfMeasureNameExists(processedEntity.organizationId, processedEntity.name);
  if (isNameExists) {
    return { error: ErrorType.EXISTED };
  }

  const { createdById, ...otherEntityProps } = processedEntity;
  const { status, data } = await graphQLPost<UnitOfMeasureInfo>({
    query: gql`
      mutation (
        $organizationId: Int!
        $code: String!
        $name: String!
        $description: String
        $isActive: Boolean!
        $publishedAt: DateTime
        $createdById: ID
      ) {
        createUnitOfMeasure(
          data: {
            organizationId: $organizationId
            code: $code
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
    return { data: data.createUnitOfMeasure };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * Updates a unit of measure's attributes within the organization.
 *
 * @param {UnitOfMeasureInfo} entity - The unit of measure entity to update.
 * @param {Date | string | undefined} lastUpdatedAt - (Optional) The last updated timestamp of the entity.
 * @returns {Promise<UnitOfMeasureInfo | ErrorType>} A promise that resolves to the updated unit of measure or an error type.
 */
export const updateUnitOfMeasure = async (
  entity: UnitOfMeasureInfo,
  lastUpdatedAt?: Date | string
): Promise<MutationResult<UnitOfMeasureInfo>> => {
  const { organizationId, id, code, name, description, isActive, updatedById } = trim(entity);

  // Check for exclusivity if lastUpdatedAt is provided
  if (lastUpdatedAt) {
    const isErrorExclusives = await checkUnitOfMeasureExclusives(organizationId, id, lastUpdatedAt);
    if (isErrorExclusives) {
      return { error: ErrorType.EXCLUSIVE };
    }
  }

  // Check if the unit of measure name already exists in the organization
  const isNameExists = await checkUnitOfMeasureNameExists(organizationId, name, id);
  if (isNameExists) {
    return { error: ErrorType.EXISTED };
  }

  const { status, data } = await graphQLPost<UnitOfMeasureInfo>({
    query: gql`
      mutation ($id: ID!, $code: String!, $name: String!, $description: String, $isActive: Boolean, $updatedById: ID) {
        updateUnitOfMeasure(
          id: $id
          data: {
            code: $code
            name: $name
            description: $description
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
      code,
      name,
      description,
      isActive,
      updatedById,
    },
  });

  if (status === HttpStatusCode.Ok && data) {
    return { data: data.updateUnitOfMeasure };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * Deletes an existing unit of measure.
 *
 * @param {Pick<UnitOfMeasureInfo, "organizationId" | "id" | "updatedById">} entity - The unit of measure entity to delete.
 * @param {Date | string | undefined} lastUpdatedAt - (Optional) The last updated timestamp of the entity.
 * @returns {Promise<UnitOfMeasureInfo | ErrorType>} A promise that resolves to the deleted unit of measure or an error type.
 */
export const deleteUnitOfMeasure = async (
  entity: Pick<UnitOfMeasureInfo, "organizationId" | "id" | "updatedById">,
  lastUpdatedAt?: Date | string
): Promise<MutationResult<UnitOfMeasureInfo>> => {
  const { organizationId, id, updatedById } = entity;

  // Check for exclusivity if lastUpdatedAt is provided
  if (lastUpdatedAt) {
    const isErrorExclusives = await checkUnitOfMeasureExclusives(organizationId, id, lastUpdatedAt);
    if (isErrorExclusives) {
      return { error: ErrorType.EXCLUSIVE };
    }
  }

  const { status, data } = await graphQLPost<UnitOfMeasureInfo>({
    query: gql`
      mutation ($id: ID!, $updatedById: ID!) {
        updateUnitOfMeasure(id: $id, data: { publishedAt: null, updatedByUser: $updatedById }) {
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
    return { data: data.updateUnitOfMeasure };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * Fetches unit of measure options from the GraphQL API.
 *
 * @param {Partial<UnitOfMeasureInfo>} params - Parameters for filtering unit of measures.
 * @returns {Promise<UnitOfMeasureInfo[] >} A promise that resolves to the fetched unit of measures or undefined if not found.
 */
export const unitOfMeasureOptionsFetcher = async ([_, params]: [string, Partial<UnitOfMeasureInfo>]): Promise<
  UnitOfMeasureInfo[]
> => {
  const { data } = await graphQLPost<UnitOfMeasureInfo[]>({
    query: gql`
      query ($organizationId: Int!) {
        unitOfMeasures(
          filters: { organizationId: { eq: $organizationId }, isActive: { eq: true }, publishedAt: { ne: null } }
          pagination: { limit: -1 }
        ) {
          data {
            id
            attributes {
              name
              code
            }
          }
        }
      }
    `,
    params,
  });

  return data?.unitOfMeasures ?? [];
};
