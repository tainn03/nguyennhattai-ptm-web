import { CustomerType } from "@prisma/client";
import { gql } from "graphql-request";
import isArray from "lodash/isArray";

import { CustomerInputForm } from "@/forms/customer";
import { ErrorType } from "@/types";
import { ApiResult, HttpStatusCode } from "@/types/api";
import { FilterRequest } from "@/types/filter";
import { MutationResult } from "@/types/graphql";
import { CustomerInfo } from "@/types/strapi";
import { graphQLPost, post } from "@/utils/api";
import { ensureString, trim } from "@/utils/string";

/**
 * Fetch a single customer based on the provided organization ID and customer ID.
 *
 * @param {Partial<CustomerInfo>} params - An object containing filter parameters for the query, including organization ID and customer ID.
 * @returns {Promise<CustomerInfo | undefined>} A promise that resolves to the fetched customer information or null if not found.
 */
export const customerFetcher = async ([_, params]: [string, Partial<CustomerInfo>]) => {
  const { data } = await graphQLPost<CustomerInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        customers(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
          data {
            id
            attributes {
              organizationId
              code
              name
              taxCode
              email
              phoneNumber
              website
              businessAddress
              contactPosition
              contactName
              contactEmail
              contactPhoneNumber
              type
              isActive
              publishedAt
              bankAccount {
                data {
                  id
                  attributes {
                    accountNumber
                    holderName
                    bankName
                    bankBranch
                  }
                }
              }
              user {
                data {
                  id
                  attributes {
                    username
                    email
                    phoneNumber
                  }
                }
              }
              defaultUnit {
                data {
                  id
                  attributes {
                    code
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
              meta
            }
          }
        }
      }
    `,
    params,
  });

  return data?.customers[0];
};

/**
 * Fetch a list of customers from the server based on the provided filters.
 *
 * @param {string} _ - A placeholder for destructuring. Ignored in the function.
 * @param {FilterRequest<CustomerInfo>} params - The filter parameters to apply when fetching customers.
 * @returns {Promise<{ data: CustomerInfo[]; meta: MetaInfo }>} A promise that resolves to an array of customer information and metadata.
 */
export const customersFetcher = async ([_, params]: [string, FilterRequest<CustomerInfo>]) => {
  const {
    page,
    pageSize,
    sort,
    keywords,
    organizationId,
    code,
    name,
    contactName,
    phoneNumber,
    taxCode,
    isActiveOptions,
  } = trim(params);

  let searchCondition = "";
  let graphQLParams = "";
  let searchParams = {};

  if (keywords && name && code) {
    graphQLParams = "$keywords: String";
    searchCondition = `or: [
                            { code: { containsi: $keywords } }
                            { name: { containsi: $keywords } }
                            { code: { containsi: $code } }
                            { name: { containsi: $name } }
                          ]`;
    searchParams = { keywords, code, name };
  } else if (keywords && code) {
    graphQLParams = "$keywords: String";
    searchCondition = `or: [
                            { code: { containsi: $keywords } }
                            { name: { containsi: $keywords } }
                            { code: { containsi: $code } }
                          ]`;
    searchParams = { keywords, code };
  } else if (keywords && name) {
    graphQLParams = "$keywords: String";
    searchCondition = `or: [
                            { code: { containsi: $keywords } }
                            { name: { containsi: $keywords } }
                            { name: { containsi: $name } }
                          ]`;
    searchParams = { keywords, name };
  } else if (keywords) {
    graphQLParams = "$keywords: String";
    searchCondition = `or: [
                            { code: { containsi: $keywords } }
                            { name: { containsi: $keywords } }
                          ]`;
    searchParams = { keywords };
  } else if (code) {
    searchCondition = "code: { containsi: $code }";
    searchParams = { code };
  } else if (name) {
    searchCondition = "name: { containsi: $name }";
    searchParams = { name };
  }

  const { data, meta } = await graphQLPost<CustomerInfo[]>({
    query: gql`
        query (
          $page: Int
          $pageSize: Int
          $organizationId: Int!
          $sort: [String]
          ${graphQLParams}
          ${name ? "$name: String" : ""}
          ${code ? "$code: String" : ""}
          ${contactName ? "$contactName: String" : ""}
          ${phoneNumber ? "$phoneNumber: String" : ""}
          ${taxCode ? "$taxCode: String" : ""}
          ${isArray(isActiveOptions) && isActiveOptions.length > 0 ? "$isActive: [Boolean]" : ""}
        ) {
          customers(
            pagination: { page: $page, pageSize: $pageSize }
            sort: $sort
            filters: {
              publishedAt: { ne: null }
              type: { eq: "FIXED" }
              organizationId: { eq: $organizationId }
              ${searchCondition}
              ${contactName ? "contactName: { containsi: $contactName }" : ""}
              ${phoneNumber ? "phoneNumber: { containsi: $phoneNumber }" : ""}
              ${taxCode ? "taxCode: { containsi: $taxCode }" : ""}
              ${isArray(isActiveOptions) && isActiveOptions.length > 0 ? "isActive: { in: $isActive }" : ""}
            }
          ) {
            data {
              id
              attributes {
                code
                name
                taxCode
                phoneNumber
                contactName
                isActive
                updatedAt
                bankAccount {
                  data {
                    id
                  }
                }
                createdByUser {
                  data {
                    id
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
      ...(contactName && { contactName }),
      ...(phoneNumber && { phoneNumber: ensureString(phoneNumber) }),
      ...(taxCode && { taxCode: ensureString(taxCode) }),
      ...(isArray(isActiveOptions) &&
        isActiveOptions.length > 0 && { isActive: isActiveOptions.map((item) => item === "true") }),
    },
  });

  return { data: data?.customers ?? [], meta };
};

/**
 * Fetch customer information from the server based on the provided organization and customer ID.
 *
 * @param {number} organizationId - The ID of the organization to which the customer belongs.
 * @param {number} id - The ID of the customer to fetch.
 * @returns {Promise<CustomerInfo | undefined>} A promise that resolves to the customer information or null if not found.
 */
export const getCustomer = async (organizationId: number, id: number): Promise<CustomerInfo | undefined> => {
  const { data } = await graphQLPost<CustomerInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        customers(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
          data {
            id
            attributes {
              organizationId
              code
              name
              taxCode
              email
              type
              phoneNumber
              website
              businessAddress
              contactPosition
              contactName
              contactEmail
              contactPhoneNumber
              isActive
              publishedAt
              updatedAt
              createdByUser {
                data {
                  id
                }
              }
              bankAccount {
                data {
                  id
                  attributes {
                    accountNumber
                    holderName
                    bankName
                    bankBranch
                  }
                }
              }
              user {
                data {
                  id
                }
              }
              defaultUnit {
                data {
                  id
                }
              }
              meta
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

  return data?.customers[0];
};

/**
 * Delete a customer based on the provided organization ID and customer ID, and optionally checks for exclusivity with the last updated timestamp.
 *
 * @param {Pick<CustomerInfo, "organizationId" | "id" | "updatedById">} entity - Customer and organization information for deletion.
 * @param {Date | string} [lastUpdatedAt] - The last updated timestamp for concurrency control.
 * @returns {Promise<MutationResult<Customer>>} A promise that resolves to a result object with the deleted customer ID or an error.
 */
export const deleteCustomer = async (
  entity: Pick<CustomerInfo, "organizationId" | "id" | "updatedById">,
  lastUpdatedAt?: Date | string
): Promise<MutationResult<CustomerInfo>> => {
  const { organizationId, id, updatedById } = entity;

  // Check for exclusivity if lastUpdatedAt is provided
  if (lastUpdatedAt) {
    const isErrorExclusives = await checkCustomerExclusives(organizationId, id, lastUpdatedAt);
    if (isErrorExclusives) {
      return { error: ErrorType.EXCLUSIVE };
    }
  }

  const { status, data } = await graphQLPost<CustomerInfo>({
    query: gql`
      mutation ($id: ID!, $updatedById: ID!) {
        updateCustomer(id: $id, data: { publishedAt: null, updatedByUser: $updatedById }) {
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
    return { data: data.updateCustomer };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * Check if a customer's data has been exclusively updated by another user based on its last updated timestamp.
 *
 * @param {number} organizationId - The ID of the organization to which the customer belongs.
 * @param {number} id - The ID of the customer to check.
 * @param {Date | string} lastUpdatedAt - The timestamp of the customer's last update.
 * @returns {Promise<boolean>} A promise that resolves to true if the customer's data has been exclusively updated, false otherwise.
 */
export const checkCustomerExclusives = async (
  organizationId: number,
  id: number,
  lastUpdatedAt: Date | string
): Promise<boolean> => {
  const { data } = await graphQLPost<CustomerInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        customers(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
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

  return data?.customers[0]?.updatedAt !== lastUpdatedAt;
};

/**
 * Create a new customer based on the provided customer information.
 *
 * @returns {Promise<CustomerInfo[]>} A promise that resolves to the fetched customer information or undefined if not found.
 */
export const customerOptionsFetcher = async ([_, params]: [string, Partial<CustomerInfo>]): Promise<CustomerInfo[]> => {
  const { data } = await graphQLPost<CustomerInfo[]>({
    query: gql`
      query ($organizationId: Int!, $type: String) {
        customers(
          filters: {
            organizationId: { eq: $organizationId }
            type: { eq: $type }
            isActive: { eq: true }
            publishedAt: { ne: null }
          }
          pagination: { limit: -1 }
        ) {
          data {
            id
            attributes {
              name
              code
              defaultUnit {
                data {
                  id
                }
              }
              user {
                data {
                  id
                  attributes {
                    username
                    detail {
                      data {
                        id
                        attributes {
                          lastName
                          firstName
                          avatar {
                            data {
                              id
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
      }
    `,
    params: {
      ...params,
      type: CustomerType.FIXED,
    },
  });

  return data?.customers || [];
};

/**
 * Fetch customer name from the server based on the provided organization and customer ID.
 *
 * @param {number} organizationId - The ID of the organization to which the customer belongs.
 * @param {number} id - The ID of the customer to fetch.
 * @returns {Promise<CustomerInfo | undefined>} A promise that resolves to the customer name or null if not found.
 */
export const getCustomerName = async (organizationId: number, id: number): Promise<string | null | undefined> => {
  const { data } = await graphQLPost<CustomerInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        customers(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
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
      organizationId,
      id,
    },
  });

  return data?.customers[0].name;
};

/**
 * Fetch a list of active customer options for a specific organization.
 *
 * @param {object} params - An object containing organizationId.
 * @returns {Promise<CustomerInfo[]>} - An array of active customer options.
 */
export const availableCustomersForGroupFetcher = async ([_, params]: [string, FilterRequest<CustomerInfo>]) => {
  const { page, pageSize, sort, organizationId, keywords, name, code, email, phoneNumber, contactName } = trim(params);

  let searchCondition = "";
  let graphQLParams = "";
  let searchParams;

  if (keywords && name && code) {
    graphQLParams = "$keywords: String";
    searchCondition = `or:
      [
        { code: { containsi: $keywords } }
        { name: { containsi: $keywords } }
        { code: { containsi: $code } }
        { name: { containsi: $name } }
      ]`;
    searchParams = { keywords, name, code };
  } else if (keywords && code) {
    graphQLParams = "$keywords: String";
    searchCondition = `or:
      [
        { code: { containsi: $keywords } }
        { name: { containsi: $keywords } }
        { code: { containsi: $code } }
      ]`;
    searchParams = { keywords, code };
  } else if (keywords && name) {
    graphQLParams = "$keywords: String";
    searchCondition = `or:
      [
        { code: { containsi: $keywords } }
        { name: { containsi: $keywords } }
        { name: { containsi: $name } }
      ]`;
    searchParams = { keywords, name };
  } else if (keywords) {
    graphQLParams = "$keywords: String";
    searchCondition = `or:
      [
        { code: { containsi: $keywords } }
        { name: { containsi: $keywords } }
      ]`;
    searchParams = { keywords };
  } else if (code) {
    searchCondition = "code: { containsi: $code }";
    searchParams = { code };
  } else if (name) {
    searchCondition = "name: { containsi: $name }";
    searchParams = { name };
  }

  const { data, meta } = await graphQLPost<CustomerInfo[]>({
    query: gql`
      query (
        $page: Int,
        $pageSize: Int,
        $sort: [String],
        $organizationId: Int!
        $type: String
        ${name ? "$name: String" : ""}
        ${code ? "$code: String" : ""}
        ${email ? "$email: String" : ""}
        ${phoneNumber ? "$phoneNumber: String" : ""}
        ${contactName ? "$contactName: String" : ""}
        ${graphQLParams}
        ) {
        customers(
          sort: $sort
          filters: {
            publishedAt: { ne: null }
            organizationId: { eq: $organizationId }
            isActive: { eq: true }
            type: { eq: $type }
            ${searchCondition}
            ${email ? "email: { containsi: $email }" : ""}
            ${phoneNumber ? "phoneNumber: { containsi: $phoneNumber }" : ""}
            ${contactName ? "contactName: { containsi: $contactName }" : ""}
          }
          pagination: { page: $page, pageSize: $pageSize }
        ) {
          data {
            id
            attributes {
              code
              name
              email
              phoneNumber
              contactName
              customerGroups {
                data {
                  id
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
      sort: isArray(sort) ? sort : [sort],
      organizationId,
      type: CustomerType.FIXED,
      ...(searchParams && { ...searchParams }),
      ...(email && { email }),
      ...(phoneNumber && { phoneNumber }),
      ...(contactName && { contactName }),
    },
  });

  return { customers: data?.customers ?? [], pagination: meta?.pagination };
};
/**
 * Fetches customer options based on the specified parameters use for screen order monitoring.
 *
 * @returns {Promise<CustomerInfo[]>} A promise that resolves to the fetched customer information or undefined if not found.
 */
export const customerOptionsMonitoringFetcher = async ([_, params]: [string, Partial<CustomerInfo>]): Promise<
  CustomerInfo[]
> => {
  const { data } = await graphQLPost<CustomerInfo[]>({
    query: gql`
      query ($organizationId: Int!, $type: String) {
        customers(
          filters: {
            organizationId: { eq: $organizationId }
            type: { eq: $type }
            isActive: { eq: true }
            publishedAt: { ne: null }
          }
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
    params: {
      ...params,
      type: CustomerType.FIXED,
    },
  });

  return data?.customers || [];
};

/**
 * Add a customer based on the provided entity object.
 *
 * @param {string} orgLink - Customer and organization information for deletion.
 * @param {CustomerInputForm} params - The last updated timestamp for concurrency control.
 * @returns {Promise<ApiResult | undefined> } A promise that resolves to a result object with the deleted customer ID or an error.
 */
export const createCustomer = async (orgLink: string, params: CustomerInputForm): Promise<ApiResult | undefined> => {
  const rs = await post<ApiResult>(`/api${orgLink}/customers/new`, params);

  return rs;
};

/**
 * Update a customer based on the provided entity object.
 *
 * @param {string} orgLink - Customer and organization information for deletion.
 * @param {string | null | undefined} encryptedId - The last updated timestamp for concurrency control.
 * @param {CustomerInputForm} params - The last updated timestamp for concurrency control.
 * @returns {Promise<ApiResult | undefined> } A promise that resolves to a result object with the customer ID or undefine.
 */
export const updateCustomer = async (
  orgLink: string,
  encryptedId: string | null | undefined,
  params: CustomerInputForm
): Promise<ApiResult | undefined> => {
  const rs = await post<ApiResult>(`/api${orgLink}/customers/${encryptedId}/edit`, params);
  return rs;
};

/**
 * Fetch a list of customers from the server based on the provided filters.
 *
 * @param {string} _ - A placeholder for destructuring. Ignored in the function.
 * @param {FilterRequest<CustomerInfo>} params - The filter parameters to apply when fetching customers.
 * @returns {Promise<{ data: CustomerInfo[]; meta: MetaInfo }>} A promise that resolves to an array of customer information and metadata.
 */
export const customerBasicInfoListFetcher = async ([_, params]: [string, FilterRequest<CustomerInfo>]) => {
  const { page, pageSize, customerId, organizationId } = trim(params);

  const { data, meta } = await graphQLPost<CustomerInfo[]>({
    query: gql`
      query (
        $page: Int
        $pageSize: Int
        $organizationId: Int!
        ${customerId ? " $id: ID!" : ""}) {
        customers(
          pagination: { page: $page, pageSize: $pageSize }
          filters: {
            publishedAt: { ne: null }
            type: { eq: "FIXED" }
            organizationId: { eq: $organizationId }

          ${customerId ? "id: { eq: $id }" : ""}
          }
        ) {
          data {
            id
            attributes {
              code
              name
              taxCode
              phoneNumber
              businessAddress
              bankAccount {
                data {
                  id
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
      ...(customerId && { id: customerId }),
    },
  });

  return { data: data?.customers ?? [], meta };
};

/**
 * Fetch a single customer based on the provided organization ID and customer ID.
 *
 * @param {Partial<CustomerInfo>} params - An object containing filter parameters for the query, including organization ID and customer ID.
 * @returns {Promise<CustomerInfo | undefined>} A promise that resolves to the fetched customer information or null if not found.
 */
export const customerReportInfoFetcher = async ([_, params]: [string, Partial<CustomerInfo>]) => {
  const { organizationId, id } = params;

  const { data } = await graphQLPost<CustomerInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        customers(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
          data {
            id
            attributes {
              organizationId
              code
              name
              taxCode
              phoneNumber
              website
              businessAddress
              bankAccount {
                data {
                  id
                  attributes {
                    accountNumber
                    holderName
                    bankName
                    bankBranch
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
      id,
    },
  });

  return data?.customers[0];
};
