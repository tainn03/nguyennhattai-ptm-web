import { gql } from "graphql-request";
import { isArray } from "lodash";

import { ErrorType } from "@/types";
import { HttpStatusCode } from "@/types/api";
import { FilterRequest } from "@/types/filter";
import { MutationResult } from "@/types/graphql";
import { TrailerTypeInfo } from "@/types/strapi";
import { graphQLPost } from "@/utils/api";
import { endOfDay, startOfDay } from "@/utils/date";
import { ensureString, trim } from "@/utils/string";

/**
 * This function fetches a trailer type based on provided parameters.
 *
 * @param args - An array containing a string and parameters for the query.
 * @returns A promise that resolves to a TrailerTypeInfo object or undefined.
 */
export const trailerTypeFetcher = async ([_, params]: [string, Partial<TrailerTypeInfo>]): Promise<
  TrailerTypeInfo | undefined
> => {
  const { data } = await graphQLPost<TrailerTypeInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        trailerTypes(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
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

  return data?.trailerTypes[0];
};

/**
 * This function fetches a list of trailer types based on provided filter parameters.
 *
 * @param args - An array containing a string and parameters for the query.
 * @returns A promise that resolves to an object containing data and meta information for trailer types.
 */
export const trailerTypesFetcher = async ([_, params]: [string, FilterRequest<TrailerTypeInfo>]) => {
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

  const { data, meta } = await graphQLPost<TrailerTypeInfo[]>({
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
          trailerTypes(
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

  return { data: data?.trailerTypes ?? [], meta };
};

/**
 * This function retrieves a specific trailer type based on organization ID and trailer type ID.
 *
 * @param organizationId - The ID of the organization.
 * @param id - The ID of the trailer type to retrieve.
 * @returns - A promise that resolves to the retrieved trailer type info or undefined if not found.
 */
export const getTrailerType = async (organizationId: number, id: number): Promise<TrailerTypeInfo | undefined> => {
  const { data } = await graphQLPost<TrailerTypeInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        trailerTypes(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
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

  return data?.trailerTypes[0];
};

/**
 * This function checks if a trailer type has been updated since a given timestamp.
 *
 * @param organizationId - The ID of the organization.
 * @param id - The ID of the trailer type to check.
 * @param lastUpdatedAt - The timestamp to compare against the trailer type's last update time.
 * @returns - A promise that resolves to true if the trailer type info has been updated, false otherwise.
 */
export const checkTrailerTypeExclusives = async (
  organizationId: number,
  id: number,
  lastUpdatedAt: Date | string
): Promise<boolean> => {
  const { data } = await graphQLPost<TrailerTypeInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        trailerTypes(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
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

  return data?.trailerTypes[0]?.updatedAt !== lastUpdatedAt;
};

/**
 * This function checks if a trailer type with a given name exists within an organization, optionally excluding a specific ID.
 *
 * @param organizationId - The ID of the organization.
 * @param name - The name of the trailer type to check.
 * @param excludeId - (Optional) The ID to exclude from the check (useful when editing an existing trailer type).
 * @returns - A promise that resolves to true if a trailer type info with the same name exists (excluding the specified ID if provided), false otherwise.
 */
export const checkTrailerTypeNameExists = async (
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
      trailerTypes(
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

  const { data } = await graphQLPost<TrailerTypeInfo[]>({
    query,
    params: {
      ...(excludeId && { excludeId }),
      name,
      organizationId,
    },
  });

  return (data?.trailerTypes.length ?? 0) > 0;
};

/**
 * This function creates a new trailer type info.
 *
 * @param - The trailer type entity to create, excluding the ID (typically contains organizationId, name, description, isActive, etc.).
 * @returns - A promise that resolves to the result of the create operation.
 */
export const createTrailerType = async (
  entity: Omit<TrailerTypeInfo, "id">
): Promise<MutationResult<TrailerTypeInfo>> => {
  const processedEntity = trim(entity);

  const isNameExists = await checkTrailerTypeNameExists(processedEntity.organizationId, processedEntity.name);
  if (isNameExists) {
    return { error: ErrorType.EXISTED };
  }

  const { createdById, ...otherEntityProps } = processedEntity;
  const { status, data } = await graphQLPost<TrailerTypeInfo>({
    query: gql`
      mutation (
        $organizationId: Int!
        $name: String!
        $description: String
        $isActive: Boolean!
        $publishedAt: DateTime
        $createdById: ID
      ) {
        createTrailerType(
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
    return { data: data.createTrailerType };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * This function updates a trailer type info entity.
 *
 * @param entity - The trailer type entity to update (contains id, name, description, isActive, updatedById, etc.).
 * @param - The last updated timestamp for checking exclusivity (optional).
 * @returns - A promise that resolves to the result of the update operation.
 */
export const updateTrailerType = async (
  entity: TrailerTypeInfo,
  lastUpdatedAt?: Date | string
): Promise<MutationResult<TrailerTypeInfo>> => {
  const { organizationId, id, name, description, isActive, updatedById } = trim(entity);

  // Check for exclusivity if lastUpdatedAt is provided
  if (lastUpdatedAt) {
    const isErrorExclusives = await checkTrailerTypeExclusives(organizationId, id, lastUpdatedAt);
    if (isErrorExclusives) {
      return { error: ErrorType.EXCLUSIVE };
    }
  }

  // Check if the trailer type type name already exists in the organization
  const isNameExists = await checkTrailerTypeNameExists(Number(organizationId), ensureString(entity.name), id);
  if (isNameExists) {
    return { error: ErrorType.EXISTED };
  }

  const { status, data } = await graphQLPost<TrailerTypeInfo>({
    query: gql`
      mutation ($id: ID!, $name: String!, $description: String, $isActive: Boolean, $updatedById: ID) {
        updateTrailerType(
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
    return { data: data.updateTrailerType };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * This function soft-deletes a trailer type entity by setting its 'publishedAt' to null.
 *
 * @param - The entity to delete (contains organizationId, id, updatedById).
 * @param - The last updated timestamp for checking exclusivity (optional).
 * @returns - A promise that resolves to the result of the soft-delete operation.
 */
export const deleteTrailerType = async (
  entity: Pick<TrailerTypeInfo, "organizationId" | "id" | "updatedById">,
  lastUpdatedAt?: Date | string
): Promise<MutationResult<TrailerTypeInfo>> => {
  const { organizationId, id, updatedById } = entity;

  // Check for exclusivity if lastUpdatedAt is provided
  if (lastUpdatedAt) {
    const isErrorExclusives = await checkTrailerTypeExclusives(organizationId, id, lastUpdatedAt);
    if (isErrorExclusives) {
      return { error: ErrorType.EXCLUSIVE };
    }
  }

  const { status, data } = await graphQLPost<TrailerTypeInfo>({
    query: gql`
      mutation ($id: ID!, $updatedById: ID!) {
        updateTrailerType(id: $id, data: { publishedAt: null, updatedByUser: $updatedById }) {
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
    return { data: data.updateTrailerType };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * Fetch a list of active trailer type options for a specific organization.
 *
 * @param {object} params - An object containing organizationId.
 * @returns {Promise<TrailerTypeInfo[]>} - An array of active trailer type options.
 */
export const trailerTypeOptions = async ([_, params]: [string, Partial<TrailerTypeInfo>]) => {
  const { data } = await graphQLPost<TrailerTypeInfo[]>({
    query: gql`
      query ($organizationId: Int!) {
        trailerTypes(
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
    params: {
      organizationId: params.organizationId,
    },
  });

  return data?.trailerTypes ?? [];
};
