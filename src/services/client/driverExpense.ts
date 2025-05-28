import { HttpStatusCode } from "axios";
import { gql } from "graphql-request";

import { ErrorType } from "@/types";
import { FilterRequest } from "@/types/filter";
import { MutationResult } from "@/types/graphql";
import { DriverExpenseInfo } from "@/types/strapi";
import { graphQLPost } from "@/utils/api";
import { ensureString, trim } from "@/utils/string";

/**
 * Fetches a list of driver expenses based on the provided filters.
 *
 * @param {Partial<DriverExpenseInfo>} params - Additional parameters to filter the driver expenses.
 * @returns {Promise<DriverExpenseInfo[]>} A promise that resolves to an array of driver expense information.
 */
export const getDriverExpenses = async (params: Partial<DriverExpenseInfo>): Promise<DriverExpenseInfo[]> => {
  const { data } = await graphQLPost<DriverExpenseInfo[]>({
    query: gql`
      query ($organizationId: Int!) {
        driverExpenses(
          pagination: { limit: -1 }
          sort: "displayOrder:asc"
          filters: { organizationId: { eq: $organizationId }, isActive: { eq: true }, publishedAt: { ne: null } }
        ) {
          data {
            id
            attributes {
              name
              key
              type
              isSystem
            }
          }
        }
      }
    `,
    params,
  });

  return data?.driverExpenses ?? [];
};

/**
 * A function to fetch a list of driver expenses from a GraphQL endpoint.
 * @param [_, params] - A tuple containing a string (not used) and params for the query.
 * @returns A Promise that resolves to a list of driver expense data.
 */
export const driverExpensesFetcher = async ([_, params]: [string, FilterRequest<DriverExpenseInfo>]): Promise<
  DriverExpenseInfo[] | undefined
> => {
  const { organizationId, keywords } = trim(params);

  let searchCondition = "";
  let graphQLParams = "";
  let searchParams;

  if (keywords) {
    // Search by name
    graphQLParams = "$keywords: String";
    searchCondition = `or: [
        { name: { containsi: $keywords } }
        { key: {  containsi: $keywords } }
      ]`;
    searchParams = { keywords };
  }

  const { data } = await graphQLPost<DriverExpenseInfo[]>({
    query: gql`
        query (
          $organizationId: Int!
          ${graphQLParams}
        ) {
          driverExpenses(
            pagination: { limit: -1 }
            sort: "displayOrder"
            filters: {
              publishedAt: { ne: null }
              organizationId: { eq: $organizationId }
              ${searchCondition}
            }
          ) {
            data {
              id
              attributes {
                type
                name
                key
                isActive
                displayOrder
                isSystem
                createdAt
                createdByUser {
                  data {
                    id
                    attributes {
                      username
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
    params: {
      organizationId,
      ...(searchParams && { ...searchParams }),
    },
  });

  return data?.driverExpenses ?? [];
};

/**
 * A function to fetch driver expense data from a GraphQL endpoint.
 * @param [_, params] - A tuple containing a string (not used) and params for the query.
 * @returns A Promise that resolves to the driver expense data.
 */
export const driverExpenseFetcher = async ([_, params]: [string, Partial<DriverExpenseInfo>]) => {
  const processedParams = trim(params);

  const { data } = await graphQLPost<DriverExpenseInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        driverExpenses(
          filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }
        ) {
          data {
            id
            attributes {
              type
              name
              key
              displayOrder
              isSystem
              isActive
              description
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
        }
      }
    `,
    params: processedParams,
  });

  return data?.driverExpenses[0];
};

/**
 * A function to fetch a single driver expense by organizationId and id from a GraphQL endpoint.
 * @param organizationId - The ID of the organization.
 * @param id - The ID of the driver expense to fetch.
 * @returns A Promise that resolves to the driver expense data.
 */
export const getDriverExpense = async (organizationId: number, id: number): Promise<DriverExpenseInfo | undefined> => {
  const { data } = await graphQLPost<DriverExpenseInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        driverExpenses(
          filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }
        ) {
          data {
            id
            attributes {
              name
              key
              description
              displayOrder
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

  return data?.driverExpenses[0];
};

/**
 * Checks if a driver expense has been updated since a specified date.
 *
 * @param {number} organizationId - The ID of the organization to which the driver expense belongs.
 * @param {number} id - The ID of the driver expense to check.
 * @param {Date | string} lastUpdatedAt - The date to compare against the driver expense's last updated timestamp.
 * @returns {Promise<boolean>} A promise that resolves to true if the driver expense has been updated, otherwise false.
 */
export const checkDriverExpenseExclusives = async (
  organizationId: number,
  id: number,
  lastUpdatedAt: Date | string
): Promise<boolean> => {
  const { data } = await graphQLPost<DriverExpenseInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        driverExpenses(
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

  return data?.driverExpenses[0]?.updatedAt !== lastUpdatedAt;
};

/**
 * Checks if a driver expense name exists within an organization, optionally excluding a specific driver expense ID.
 *
 * @param {number} organizationId - The ID of the organization to search within.
 * @param {string} name - The driver expense name to check for.
 * @param {number | undefined} excludeId - (Optional) The ID of a driver expense to exclude from the check.
 * @returns {Promise<boolean>} A promise that resolves to true if the driver expense name exists, otherwise false.
 */
export const checkDriverExpenseNameExists = async (
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
      driverExpenses(
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
  const { data } = await graphQLPost<DriverExpenseInfo[]>({
    query,
    params: {
      ...(excludeId && { excludeId }),
      name,
      organizationId,
    },
  });

  return (data?.driverExpenses.length ?? 0) > 0;
};

/**
 * Checks if a driver expense key right format, not duplicate within an organization, optionally excluding a specific driver expense ID.
 *
 * @param {number} organizationId - The ID of the organization to search within.
 * @param {string} key - The driver expense key to check for.
 * @param {number | undefined} excludeId - (Optional) The ID of a driver expense to exclude from the check.
 * @returns {Promise<boolean>} A promise that resolves to true if the driver expense name exists, otherwise false.
 */
export const checkDriverExpenseKeyExist = async (
  organizationId: number,
  key: string,
  excludeId?: number
): Promise<boolean> => {
  // Check exist in db
  const query = gql`
    query (
      $organizationId: Int!
      $key: String!
      ${excludeId ? "$excludeId: ID" : ""}
    ) {
      driverExpenses(
        filters: {
          publishedAt: { ne: null }
          organizationId: { eq: $organizationId }
          key: { eq: $key }
          ${excludeId ? "id: { ne: $excludeId }" : ""}
        }
      ) {
        data {
          id
        }
      }
    }
  `;
  const { data } = await graphQLPost<DriverExpenseInfo[]>({
    query,
    params: {
      ...(excludeId && { excludeId }),
      key,
      organizationId,
    },
  });

  return (data?.driverExpenses.length ?? 0) > 0;
};

/**
 * Get the maximum display order of driver expenses for a specific organization.
 * @param organizationId - The ID of the organization.
 * @returns A Promise that resolves to the maximum display order of driver expenses or 0 if none exist.
 */
export const getMaxDisplayOrderOfDriverExpense = async (organizationId: number): Promise<number> => {
  const query = gql`
    query ($organizationId: Int!) {
      driverExpenses(
        pagination: { start: 0, limit: 1 }
        sort: "displayOrder:desc"
        filters: { organizationId: { eq: $organizationId }, publishedAt: { ne: null } }
      ) {
        data {
          id
          attributes {
            displayOrder
          }
        }
      }
    }
  `;
  const { data } = await graphQLPost<DriverExpenseInfo[]>({
    query,
    params: {
      organizationId,
    },
  });

  return data?.driverExpenses[0]?.displayOrder || 0;
};

/**
 * Creates a new driver expense.
 *
 * @param entity - The driver expense to create.
 * @returns The ID of the newly created driver expense.
 */
export const createDriverExpense = async (
  entity: Partial<DriverExpenseInfo>
): Promise<MutationResult<Partial<DriverExpenseInfo>>> => {
  const { key, name, ...otherEntityProps } = trim(entity);
  const organizationId = Number(entity.organizationId);

  // Check key existed
  const isExistKey = await checkDriverExpenseKeyExist(organizationId, ensureString(key));
  if (isExistKey) {
    return { error: ErrorType.EXISTED, data: { key: "duplicate" } };
  }

  // Check name existed
  const isNameExist = await checkDriverExpenseNameExists(organizationId, ensureString(name));
  if (isNameExist) {
    return { error: ErrorType.EXISTED, data: { name: "duplicate" } };
  }

  const currentDisplayOrder = await getMaxDisplayOrderDriverExpense(organizationId);
  const { status, data } = await graphQLPost<DriverExpenseInfo>({
    query: gql`
      mutation (
        $organizationId: Int!
        $name: String!
        $key: String
        $displayOrder: Int
        $description: String
        $isActive: Boolean!
        $publishedAt: DateTime
        $createdById: ID
      ) {
        createDriverExpense(
          data: {
            organizationId: $organizationId
            name: $name
            description: $description
            isActive: $isActive
            key: $key
            displayOrder: $displayOrder
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
      organizationId,
      name,
      key,
      displayOrder: currentDisplayOrder + 1,
      publishedAt: new Date(),
    },
  });
  if (status === HttpStatusCode.Ok && data) {
    return { data: data.createDriverExpense };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * Delete a driver expense based on the provided entity data.
 *
 * @param entity - The entity containing organizationId, id, and updatedById.
 * @param lastUpdatedAt - An optional parameter to check for exclusivity based on the last updated timestamp.
 * @returns A Promise that resolves to a MutationResult containing the result of the deletion operation.
 */
export const deleteDriverExpense = async (
  entity: Pick<DriverExpenseInfo, "organizationId" | "id" | "updatedById">,
  lastUpdatedAt?: Date | string
): Promise<MutationResult<Partial<DriverExpenseInfo>>> => {
  const { organizationId, id, updatedById } = entity;

  // Check for exclusivity if lastUpdatedAt is provided
  if (lastUpdatedAt) {
    const isErrorExclusives = await checkDriverExpenseExclusives(organizationId, id, lastUpdatedAt);
    if (isErrorExclusives) {
      return { error: ErrorType.EXCLUSIVE };
    }
  }

  const { status, data } = await graphQLPost<DriverExpenseInfo>({
    query: gql`
      mutation ($id: ID!, $updatedById: ID!) {
        updateDriverExpense(id: $id, data: { publishedAt: null, updatedByUser: $updatedById }) {
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
    return { data: data.updateDriverExpense };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * This function updates a driver expense info entity.
 *
 * @param entity - The driver expense entity to update (contains id, name, description, isActive, updatedById, etc.).
 * @param - The last updated timestamp for checking exclusivity (optional).
 * @returns - A promise that resolves to the result of the update operation.
 */
export const updateDriverExpense = async (
  entity: Partial<DriverExpenseInfo>,
  lastUpdatedAt?: Date | string
): Promise<MutationResult<Partial<DriverExpenseInfo>>> => {
  const { id, key, name, description, isActive, updatedById } = trim(entity);
  const organizationId = Number(entity.organizationId);
  // Check for exclusivity if lastUpdatedAt is provided
  if (lastUpdatedAt) {
    const isErrorExclusives = await checkDriverExpenseExclusives(organizationId, Number(id), lastUpdatedAt);
    if (isErrorExclusives) {
      return { error: ErrorType.EXCLUSIVE };
    }
  }

  // Check key existed
  const isExistKey = await checkDriverExpenseKeyExist(organizationId, ensureString(key), id);
  if (isExistKey) {
    return { error: ErrorType.EXISTED, data: { key: "duplicate" } };
  }

  // Check name existed
  const isNameExist = await checkDriverExpenseNameExists(organizationId, ensureString(name), id);
  if (isNameExist) {
    return { error: ErrorType.EXISTED, data: { name: "duplicate" } };
  }

  const { status, data } = await graphQLPost<DriverExpenseInfo>({
    query: gql`
      mutation ($id: ID!, $name: String!, $key: String, $description: String, $isActive: Boolean, $updatedById: ID) {
        updateDriverExpense(
          id: $id
          data: { name: $name, key: $key, description: $description, isActive: $isActive, updatedByUser: $updatedById }
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
      key,
      description,
      isActive,
      updatedById,
    },
  });

  if (status === HttpStatusCode.Ok && data) {
    return { data: data.updateDriverExpense };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * Fetches the maximum display order value of driver expenses for a given organization.
 * The function then returns the displayOrder of the first driver expense, or 0 if no driver expenses are found.
 * @param organizationId - The ID of the organization.
 * @returns A promise that resolves to the maximum displayOrder value, or 0 if no driver expenses are found.
 */
export const getMaxDisplayOrderDriverExpense = async (organizationId: number): Promise<number> => {
  const { data } = await graphQLPost<DriverExpenseInfo[]>({
    query: gql`
      query ($organizationId: Int!) {
        driverExpenses(
          filters: { organizationId: { eq: $organizationId }, publishedAt: { ne: null } }
          sort: "displayOrder:desc"
          pagination: { limit: 1 }
        ) {
          data {
            id
            attributes {
              displayOrder
            }
          }
        }
      }
    `,
    params: {
      organizationId,
    },
  });
  return data?.driverExpenses[0]?.displayOrder || 0;
};
