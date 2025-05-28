import { HttpStatusCode } from "axios";
import { gql } from "graphql-request";
import { isArray } from "lodash";

import { ErrorType } from "@/types";
import { FilterRequest } from "@/types/filter";
import { MutationResult } from "@/types/graphql";
import { CustomerGroupInfo } from "@/types/strapi";
import { graphQLPost } from "@/utils/api";
import { endOfDay, startOfDay } from "@/utils/date";
import { trim } from "@/utils/string";

/**
 * A function to fetch a list of customer groups from a GraphQL endpoint.
 * @param [_, params] - A tuple containing a string (not used) and params for the query.
 * @returns A Promise that resolves to a list of customer group data.
 */
export const customerGroupsFetcher = async ([_, params]: [string, FilterRequest<CustomerGroupInfo>]) => {
  const {
    page,
    pageSize,
    sort,
    organizationId,
    keywords,
    name,
    managerName,
    isActiveOptions,
    createdByUser,
    createdAtFrom,
    createdAtTo,
    updatedByUser,
    updatedAtFrom,
    updatedAtTo,
  } = trim(params);

  const isFindStatus = isArray(isActiveOptions) && isActiveOptions.length > 0;
  const createdByUserCondition = createdByUser
    ? `or: [
    {
      createdByUser: {
        detail: { firstName: { containsi: $createdByUser } }
      }
    }
    {
      createdByUser: { detail: { lastName: { containsi: $createdByUser } } }
    }
  ]`
    : "";

  const updatedByUserCondition = updatedByUser
    ? `or: [
    {
      updatedByUser: {
        detail: { firstName: { containsi: $updatedByUser } }
      }
    }
    {
      updatedByUser: { detail: { lastName: { containsi: $updatedByUser } } }
    }
  ]`
    : "";

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
  let searchParams;

  if (keywords && name) {
    graphQLParams = "$keywords: String";
    searchCondition = "name: { containsi: $keywords }";
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

  const managerNameCondition = managerName
    ? `or: [
    {
      manager: {
        member: { detail: { firstName: { containsi: $managerName } } }
      }
    }
    {
      manager: {
        member: { detail: { lastName: { containsi: $managerName } } }
      }
    }
  ]`
    : "";

  const { data, meta } = await graphQLPost<CustomerGroupInfo[]>({
    query: gql`
        query (
          $page: Int
          $pageSize: Int
          $sort: [String]
          $organizationId: Int!
          ${name ? "$name: String" : ""}
          ${graphQLParams}
          ${isFindStatus ? "$isActive: [Boolean]" : ""}
          ${createdByUser ? "$createdByUser: String" : ""}
          ${createdAtFrom ? "$createdAtFrom: DateTime" : ""}
          ${createdAtTo ? "$createdAtTo: DateTime" : ""}
          ${updatedByUser ? "$updatedByUser: String" : ""}
          ${updatedAtFrom ? "$updatedAtFrom: DateTime" : ""}
          ${updatedAtTo ? "$updatedAtTo: DateTime" : ""}
          ${managerName ? "$managerName: String" : ""}
        ) {
          customerGroups(
            pagination: { page: $page, pageSize: $pageSize }
            sort: $sort
            filters: {
              publishedAt: { ne: null }
              organizationId: { eq: $organizationId }
              ${searchCondition}
              ${isFindStatus ? "isActive: { in: $isActive }" : ""}
              ${createdByUserCondition}
              ${createdAtCondition}
              ${updatedByUserCondition}
              ${updatedAtCondition}
              ${managerNameCondition}
            }
          ) {
            data {
              id
              attributes {
                name
                isActive
                manager {
                  data {
                    id
                    attributes {
                      username
                      phoneNumber
                      email
                      member {
                        data {
                          id
                          attributes {
                            detail {
                              data {
                                id
                                attributes {
                                  firstName
                                  lastName
                                  avatar {
                                    data {
                                      attributes {
                                        url
                                        previewUrl
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
                  }
                }
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
                            avatar {
                              data {
                                attributes {
                                  url
                                  previewUrl
                                }
                              }
                            }
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
                            avatar {
                              data {
                                attributes {
                                  url
                                  previewUrl
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
      sort: isArray(sort) ? sort : [sort],
      ...(searchParams && { ...searchParams }),
      ...(isFindStatus && { isActive: isActiveOptions.map((item) => item === "true") }),
      ...(createdByUser && { createdByUser }),
      ...(createdAtFrom && { createdAtFrom: startOfDay(createdAtFrom) }),
      ...(createdAtTo && { createdAtTo: endOfDay(createdAtTo) }),
      ...(updatedByUser && { updatedByUser }),
      ...(updatedAtFrom && { updatedAtFrom: startOfDay(updatedAtFrom) }),
      ...(updatedAtTo && { updatedAtTo: endOfDay(updatedAtTo) }),
      ...(managerName && { managerName }),
    },
  });

  return { customerGroups: data?.customerGroups ?? [], pagination: meta?.pagination };
};

/**
 * A function to fetch customer group data from a GraphQL endpoint.
 * @param [_, params] - A tuple containing a string (not used) and params for the query.
 * @returns A Promise that resolves to the customer group data.
 */
export const customerGroupFetcher = async ([_, params]: [string, Partial<CustomerGroupInfo>]) => {
  const processedParams = trim(params);

  const { data } = await graphQLPost<CustomerGroupInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        customerGroups(
          filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }
        ) {
          data {
            id
            attributes {
              name
              isActive
              description
              customers(pagination: { limit: -1 }) {
                data {
                  id
                  attributes {
                    code
                    name
                    email
                    phoneNumber
                    contactName
                  }
                }
              }
              manager {
                data {
                  id
                  attributes {
                    phoneNumber
                    member {
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
    params: processedParams,
  });

  return data?.customerGroups[0];
};

/**
 * A function to fetch a single customer group by organizationId and id from a GraphQL endpoint.
 * @param organizationId - The ID of the organization.
 * @param id - The ID of the customer group to fetch.
 * @returns A Promise that resolves to the customer group data.
 */
export const getCustomerGroup = async (organizationId: number, id: number): Promise<CustomerGroupInfo | undefined> => {
  const { data } = await graphQLPost<CustomerGroupInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        customerGroups(
          filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }
        ) {
          data {
            id
            attributes {
              name
              description
              isActive
              manager {
                data {
                  id
                }
              }
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

  return data?.customerGroups[0];
};

/**
 * Checks if a customer group has been updated since a specified date.
 *
 * @param {number} organizationId - The ID of the organization to which the customer group belongs.
 * @param {number} id - The ID of the customer group to check.
 * @param {Date | string} lastUpdatedAt - The date to compare against the customer group's last updated timestamp.
 * @returns {Promise<boolean>} A promise that resolves to true if the customer group has been updated, otherwise false.
 */
export const checkCustomerGroupExclusives = async (
  organizationId: number,
  id: number,
  lastUpdatedAt: Date | string
): Promise<boolean> => {
  const { data } = await graphQLPost<CustomerGroupInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        customerGroups(
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

  return data?.customerGroups[0]?.updatedAt !== lastUpdatedAt;
};

/**
 * Delete a customer group based on the provided entity data.
 *
 * @param entity - The entity containing organizationId, id, and updatedById.
 * @param lastUpdatedAt - An optional parameter to check for exclusivity based on the last updated timestamp.
 * @returns A Promise that resolves to a MutationResult containing the result of the deletion operation.
 */
export const deleteCustomerGroup = async (
  entity: Pick<CustomerGroupInfo, "organizationId" | "id" | "updatedById">,
  lastUpdatedAt?: Date | string
): Promise<MutationResult<Partial<CustomerGroupInfo>>> => {
  const { organizationId, id, updatedById } = entity;

  // Check for exclusivity if lastUpdatedAt is provided
  if (lastUpdatedAt) {
    const isErrorExclusives = await checkCustomerGroupExclusives(organizationId, id, lastUpdatedAt);
    if (isErrorExclusives) {
      return { error: ErrorType.EXCLUSIVE };
    }
  }

  const { status, data } = await graphQLPost<CustomerGroupInfo>({
    query: gql`
      mutation ($id: ID!, $updatedById: ID!) {
        updateCustomerGroup(id: $id, data: { publishedAt: null, customers: null, updatedByUser: $updatedById }) {
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
    return { data: data.updateCustomerGroup };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * This function updates a customer group info entity.
 *
 * @param entity - The customer group entity to update (contains id, name, description, isActive, updatedById, etc.).
 * @param - The last updated timestamp for checking exclusivity (optional).
 * @returns - A promise that resolves to the result of the update operation.
 */
export const updateCustomerListInCustomerGroup = async (
  entity: Pick<CustomerGroupInfo, "id" | "updatedById" | "customers" | "organizationId">,
  lastUpdatedAt?: Date | string
): Promise<MutationResult<Partial<CustomerGroupInfo>>> => {
  const { id, customers, updatedById } = trim(entity);
  const organizationId = Number(entity.organizationId);
  // Check for exclusivity if lastUpdatedAt is provided
  if (lastUpdatedAt) {
    const isErrorExclusives = await checkCustomerGroupExclusives(organizationId, Number(id), lastUpdatedAt);
    if (isErrorExclusives) {
      return { error: ErrorType.EXCLUSIVE };
    }
  }
  const customerIds = customers?.map((item) => Number(item.id)) || [];

  const { status, data } = await graphQLPost<CustomerGroupInfo>({
    query: gql`
      mutation ($id: ID!, $updatedById: ID, $customerIds: [ID]) {
        updateCustomerGroup(id: $id, data: { updatedByUser: $updatedById, customers: $customerIds }) {
          data {
            id
          }
        }
      }
    `,
    params: {
      id,
      updatedById,
      customerIds,
    },
  });

  if (status === HttpStatusCode.Ok && data) {
    return { data: data.updateCustomerGroup };
  }

  return { error: ErrorType.UNKNOWN };
};
