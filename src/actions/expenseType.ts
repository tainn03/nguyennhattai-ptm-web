"use server";

import { gql } from "graphql-request";
import moment from "moment";

import { ExpenseTypeInputForm } from "@/forms/expenseType";
import { HttpStatusCode } from "@/types/api";
import { FilterRequest } from "@/types/filter";
import { GraphQLResult } from "@/types/graphql";
import { ExpenseTypeInfo } from "@/types/strapi";
import { endOfDay, startOfDay } from "@/utils/date";
import { fetcher } from "@/utils/graphql";
import { withActionExceptionHandler } from "@/utils/server";
import { ensureString, isTrue, trim } from "@/utils/string";

/**
 * Checks if a expense type exclusivity has changed by comparing its last updated timestamp.
 *
 * @param id - The unique identifier of the workflow.
 * @param lastUpdatedAt - The last known updated timestamp of the workflow, as a Date or string.
 * @returns A promise that resolves to `true` if the workflow's exclusivity has changed, or `false` otherwise.
 */
export const checkExpenseTypeExclusives = withActionExceptionHandler<
  { id: number; lastUpdatedAt: Date | string },
  GraphQLResult<boolean>
>(async (token, params) => {
  const { id, lastUpdatedAt } = params;

  const query = gql`
    query ($organizationId: Int!, $id: ID!) {
      expenseTypes(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
        data {
          id
          attributes {
            updatedAt
          }
        }
      }
    }
  `;
  const { data } = await fetcher<ExpenseTypeInfo[]>(token.jwt, query, {
    organizationId: Number(token.user.orgId),
    id,
  });

  if (data?.expenseTypes) {
    return {
      status: HttpStatusCode.Ok,
      data: {
        data: !moment(data.expenseTypes[0]?.updatedAt).isSame(lastUpdatedAt),
      },
    };
  }

  return {
    status: HttpStatusCode.Exclusive,
    data: {
      data: true,
    },
  };
});

/**
 * Checks if a expense type name already exists within a specific organization.
 * @param name - The name of the expense type to check for existence.
 * @param excludeId - (Optional) The ID of a expense type to exclude from the check.
 * @returns A promise that resolves to `true` if a expense type with the given name exists, otherwise `false`.
 */
export const checkExpenseTypeNameExists = withActionExceptionHandler<
  { name: string; excludeId?: number },
  GraphQLResult<boolean>
>(async (token, params) => {
  const { name, excludeId } = params;
  const query = gql`
    query (
      $organizationId: Int!
      $name: String!
      ${excludeId ? "$excludeId: ID" : ""}
    ) {
      expenseTypes(
        filters: {
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
  const { data } = await fetcher<ExpenseTypeInfo[]>(token.jwt, query, {
    ...(excludeId && { excludeId }),
    name,
    organizationId: Number(token.user.orgId),
  });

  return {
    status: HttpStatusCode.Ok,
    data: {
      data: data.expenseTypes.length > 0,
    },
  };
});

/**
 * Checks if a expense type key already exists within a specific organization.
 * @param key - The key of the expense type to check for existence.
 * @param excludeId - (Optional) The ID of a expense type to exclude from the check.
 * @returns A promise that resolves to `true` if a expense type with the given name exists, otherwise `false`.
 */
export const checkExpenseTypeKeyExists = withActionExceptionHandler<
  { key: string; excludeId?: number },
  GraphQLResult<boolean>
>(async (token, params) => {
  const { key, excludeId } = params;
  const query = gql`
    query (
      $organizationId: Int!
      $key: String!
      ${excludeId ? "$excludeId: ID" : ""}
    ) {
      expenseTypes(
        filters: {
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
  const { data } = await fetcher<ExpenseTypeInfo[]>(token.jwt, query, {
    ...(excludeId && { excludeId }),
    key,
    organizationId: Number(token.user.orgId),
  });

  return {
    status: HttpStatusCode.Ok,
    data: {
      data: data.expenseTypes.length > 0,
    },
  };
});

/**
 * Retrieves the maximum display order of expense types for a given organization.
 *
 * This function uses a GraphQL query to fetch the expense types sorted by `displayOrder` in descending order
 * and returns the highest `displayOrder` value. If no expense types are found, it defaults to 0.
 */
export const getMaxDisplayOrderOfExpenseType = withActionExceptionHandler<void, GraphQLResult<number>>(
  async (token, _params) => {
    const query = gql`
      query ($organizationId: Int!) {
        expenseTypes(
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
    const { data } = await fetcher<ExpenseTypeInfo[]>(token.jwt, query, {
      organizationId: token.user.orgId,
    });

    return {
      status: HttpStatusCode.Ok,
      data: {
        data: data?.expenseTypes[0]?.displayOrder || 0,
      },
    };
  }
);

/**
 * Fetches a list of expense types from the server using GraphQL.
 */
export const expenseTypesFetcher = withActionExceptionHandler<
  [string, FilterRequest<ExpenseTypeInfo>],
  GraphQLResult<ExpenseTypeInfo[]>
>(async (token, params) => {
  const [_, filters] = params;
  const {
    page,
    pageSize,
    sort,
    keywords,
    key,
    name,
    isActive,
    createdByUser,
    updatedByUser,
    createdAtFrom,
    createdAtTo,
    updatedAtFrom,
    updatedAtTo,
  } = trim(filters);

  const query = gql`
    query (
      $organizationId: Int!
      $page: Int
      $pageSize: Int
      $sort: [String]
      $keywords: String
      $name: String
      $key: String
      $status: [Boolean]
      $createdByUser: String
      $updatedByUser: String
      $createdAtFrom: DateTime
      $createdAtTo: DateTime
      $updatedAtFrom: DateTime
      $updatedAtTo: DateTime
    ) {
      expenseTypes(
        pagination: { page: $page, pageSize: $pageSize }
        sort: $sort
        filters: {
          or: [
            { key: { containsi: $keywords } }
            { key: { containsi: $key } }
            { name: { containsi: $keywords } }
            { name: { containsi: $name } }
            { createdByUser: { detail: { firstName: { containsi: $createdByUser } } } }
            { createdByUser: { detail: { lastName: { containsi: $createdByUser } } } }
            { updatedByUser: { detail: { firstName: { containsi: $updatedByUser } } } }
            { updatedByUser: { detail: { lastName: { containsi: $updatedByUser } } } }
            { createdAt: { gte: $createdAtFrom, lte: $createdAtTo } }
            { updatedAt: { gte: $updatedAtFrom, lte: $updatedAtTo } }
          ]
          organizationId: { eq: $organizationId }
          publishedAt: { ne: null }
          isActive: { in: $status }
        }
      ) {
        data {
          id
          attributes {
            name
            description
            isActive
            key
            publicToCustomer
            canDriverView
            canDriverEdit
            createdAt
            updatedAt
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

  const { data, meta } = await fetcher<ExpenseTypeInfo[]>(token.jwt, query, {
    organizationId: token.user.orgId,
    page,
    pageSize,
    sort: Array.isArray(sort) ? sort : [sort],
    ...(keywords && { keywords }),
    ...(key && { key }),
    ...(name && { name }),
    ...(isActive && {
      status: Array.isArray(isActive) ? isActive.map((option: string) => isTrue(option)) : [isTrue(isActive)],
    }),
    ...(createdByUser && { createdByUser }),
    ...(updatedByUser && { updatedByUser }),
    ...(createdAtFrom && { createdAtFrom: startOfDay(new Date(createdAtFrom)) }),
    ...(createdAtTo && { createdAtTo: endOfDay(new Date(createdAtTo)) }),
    ...(updatedAtFrom && { updatedAtFrom: startOfDay(new Date(updatedAtFrom)) }),
    ...(updatedAtTo && { updatedAtTo: endOfDay(new Date(updatedAtTo)) }),
  });

  return {
    status: HttpStatusCode.Ok,
    data: { data: data?.expenseTypes ?? [], meta },
  };
});

/**
 * Fetches a expense type from the server using GraphQL.
 */
export const expenseTypeFetcher = withActionExceptionHandler<
  [string, Partial<ExpenseTypeInfo>],
  GraphQLResult<ExpenseTypeInfo>
>(async (token, params) => {
  const [_, filters] = params;
  const { id } = filters;

  const query = gql`
    query ($organizationId: Int!, $id: ID!) {
      expenseTypes(
        filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }
        pagination: { limit: 1 }
      ) {
        data {
          id
          attributes {
            name
            description
            key
            type
            isActive
            publicToCustomer
            canDriverView
            canDriverEdit
            createdAt
            updatedAt
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
  `;

  const { data } = await fetcher<ExpenseTypeInfo[]>(token.jwt, query, {
    organizationId: Number(token.user.orgId),
    id,
  });

  return {
    status: HttpStatusCode.Ok,
    data: {
      data: data?.expenseTypes[0],
    },
  };
});

/**
 * Get expense type by id from the server using GraphQL.
 */
export const getExpenseType = withActionExceptionHandler<number, GraphQLResult<ExpenseTypeInfo>>(
  async (token, params) => {
    const query = gql`
      query ($organizationId: Int!, $id: ID!) {
        expenseTypes(
          filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }
          pagination: { limit: 1 }
        ) {
          data {
            id
            attributes {
              name
              description
              key
              type
              isActive
              publicToCustomer
              canDriverView
              canDriverEdit
              createdAt
              updatedAt
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
    `;

    const { data } = await fetcher<ExpenseTypeInfo[]>(token.jwt, query, {
      organizationId: token.user.orgId,
      id: params,
    });

    return {
      status: HttpStatusCode.Ok,
      data: {
        data: data?.expenseTypes[0],
      },
    };
  }
);

/**
 * Deletes a expenseType entity after performing necessary validations.
 *
 * @param entity - An object containing the expenseType's `organizationId`, `id`, and `updatedById`.
 * @param lastUpdatedAt - (Optional) A `Date` or `string` representing the last update timestamp for exclusivity checks.
 * @returns A promise that resolves to a `MutationResult<ExpenseTypeInfo>` object containing either the updated workflow data or an error.
 */
export const deleteExpenseType = withActionExceptionHandler<
  { entity: Pick<ExpenseTypeInfo, "id" | "updatedById">; lastUpdatedAt?: Date | string },
  ExpenseTypeInfo
>(async (token, params) => {
  const { entity, lastUpdatedAt } = params;
  const { id, updatedById } = entity;

  // Check for exclusivity if lastUpdatedAt is provided
  if (lastUpdatedAt) {
    const isErrorExclusives = await checkExpenseTypeExclusives({
      id,
      lastUpdatedAt,
    });
    if (isErrorExclusives.data?.data) {
      return { status: HttpStatusCode.Exclusive };
    }
  }

  const query = gql`
    mutation ($id: ID!, $updatedById: ID!) {
      updateExpenseType(id: $id, data: { publishedAt: null, updatedByUser: $updatedById }) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<ExpenseTypeInfo>(token.jwt, query, {
    id,
    updatedById,
  });

  return { status: HttpStatusCode.Ok, data: data.updateExpenseType };
});

/**
 * Creates a new expenseType for the organization.
 *
 * @param entity - The expenseType input form containing the details of the expenseType to be created.
 * @returns A promise that resolves to the result of the creation operation, including the created expenseType data.
 */
export const createExpenseType = withActionExceptionHandler<ExpenseTypeInputForm, ExpenseTypeInfo>(
  async (token, params) => {
    const processedEntity = trim(params);

    // Check name existed
    const isExpenseTypeNameExists = await checkExpenseTypeNameExists({
      name: ensureString(processedEntity.name),
    });
    if (isExpenseTypeNameExists.data?.data) {
      return { status: HttpStatusCode.Existed, message: "name" };
    }

    // Check key existed
    const isExpenseTypeKeyExists = await checkExpenseTypeKeyExists({
      key: ensureString(processedEntity.key),
    });
    if (isExpenseTypeKeyExists.data?.data) {
      return { status: HttpStatusCode.Existed, message: "key" };
    }

    const result = await getMaxDisplayOrderOfExpenseType();
    const currentDisplayOrder = result.data?.data;
    const query = gql`
      mutation (
        $organizationId: Int
        $name: String
        $key: String
        $description: String
        $isActive: Boolean
        $publicToCustomer: Boolean
        $canDriverView: Boolean
        $canDriverEdit: Boolean
        $displayOrder: Int
        $createdByUser: ID
        $publishedAt: DateTime
      ) {
        createExpenseType(
          data: {
            organizationId: $organizationId
            name: $name
            key: $key
            description: $description
            isActive: $isActive
            publicToCustomer: $publicToCustomer
            canDriverView: $canDriverView
            canDriverEdit: $canDriverEdit
            displayOrder: $displayOrder
            createdByUser: $createdByUser
            updatedByUser: $createdByUser
            publishedAt: $publishedAt
          }
        ) {
          data {
            id
          }
        }
      }
    `;

    const { data } = await fetcher<ExpenseTypeInfo>(token.jwt, query, {
      organizationId: Number(token.user.orgId),
      name: ensureString(processedEntity.name),
      key: ensureString(processedEntity.key),
      ...(processedEntity.description && { description: processedEntity.description }),
      isActive: processedEntity.isActive,
      publicToCustomer: processedEntity.publicToCustomer,
      canDriverView: processedEntity.canDriverView,
      canDriverEdit: processedEntity.canDriverEdit,
      displayOrder: Number(currentDisplayOrder) + 1,
      createdByUser: Number(token.user.id),
      publishedAt: new Date().toISOString(),
    });

    return { status: HttpStatusCode.Ok, data: data.createExpenseType };
  }
);

/**
 * Updates a expenseType entity in the database with the provided input data.
 *
 * @param entity - The expenseType input form containing the data to update the expenseType.
 * @returns A promise that resolves to an object containing the status code and either the updated expenseType data or an error code.
 */
export const updateExpenseType = withActionExceptionHandler<ExpenseTypeInputForm, ExpenseTypeInfo>(
  async (token, params) => {
    const processedEntity = trim(params);

    // Check Exclusives
    const isErrorExclusives = await checkExpenseTypeExclusives({
      id: Number(processedEntity.id),
      lastUpdatedAt: ensureString(processedEntity.updatedAt),
    });
    if (isErrorExclusives.data?.data) {
      return { status: HttpStatusCode.Exclusive };
    }

    // Check name existed
    const isExpenseTypeNameExists = await checkExpenseTypeNameExists({
      name: ensureString(processedEntity.name),
      excludeId: Number(processedEntity.id),
    });
    if (isExpenseTypeNameExists.data?.data) {
      return { status: HttpStatusCode.Existed, message: "name" };
    }

    // Check key existed
    const isExpenseTypeKeyExists = await checkExpenseTypeKeyExists({
      key: ensureString(processedEntity.key),
      excludeId: Number(processedEntity.id),
    });
    if (isExpenseTypeKeyExists.data?.data) {
      return { status: HttpStatusCode.Existed, message: "key" };
    }

    const query = gql`
      mutation (
        $id: ID!
        $name: String
        $key: String
        $description: String
        $isActive: Boolean
        $publicToCustomer: Boolean
        $canDriverView: Boolean
        $canDriverEdit: Boolean
        $updatedByUser: ID
      ) {
        updateExpenseType(
          id: $id
          data: {
            name: $name
            key: $key
            description: $description
            isActive: $isActive
            publicToCustomer: $publicToCustomer
            canDriverView: $canDriverView
            canDriverEdit: $canDriverEdit
            updatedByUser: $updatedByUser
          }
        ) {
          data {
            id
          }
        }
      }
    `;

    const { data } = await fetcher<ExpenseTypeInfo>(token.jwt, query, {
      id: Number(processedEntity.id),
      name: ensureString(processedEntity.name),
      key: ensureString(processedEntity.key),
      ...(processedEntity.description && { description: processedEntity.description }),
      isActive: processedEntity.isActive,
      publicToCustomer: processedEntity.publicToCustomer,
      canDriverView: processedEntity.canDriverView,
      canDriverEdit: processedEntity.canDriverEdit,
      ...(processedEntity.displayOrder && { displayOrder: Number(processedEntity.displayOrder) }),
      updatedByUser: Number(token.user.id),
    });

    return { status: HttpStatusCode.Ok, data: data.updateExpenseType };
  }
);
