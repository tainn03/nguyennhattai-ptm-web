import { gql } from "graphql-request";
import isArray from "lodash/isArray";

import { SubcontractorInputForm, SubcontractorUpdateForm } from "@/forms/subcontractor";
import { ErrorType } from "@/types";
import { ApiResult, HttpStatusCode } from "@/types/api";
import { FilterRequest } from "@/types/filter";
import { MutationResult } from "@/types/graphql";
import { OrganizationMemberInfo, SubcontractorInfo } from "@/types/strapi";
import { graphQLPost, post, put } from "@/utils/api";
import { endOfDay, startOfDay } from "@/utils/date";
import { trim } from "@/utils/string";

import { getOrganizationMembersByOrganizationIdAndUserId } from "./organizationMember";

/**
 * A function to fetch subcontractor information using a GraphQL query.
 *
 * @param params - An object containing the organizationId and id for the query.
 * @returns A Promise that resolves to the subcontractor info or undefined if not found.
 */
export const subcontractorFetcher = async ([_, params]: [string, Partial<SubcontractorInfo>]): Promise<
  SubcontractorInfo | undefined
> => {
  const { data } = await graphQLPost<SubcontractorInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        subcontractors(
          filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }
        ) {
          data {
            id
            attributes {
              code
              name
              email
              taxCode
              website
              businessAddress
              phoneNumber
              documents {
                data {
                  id
                  attributes {
                    name
                    url
                  }
                }
              }
              description
              isActive
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

  return data?.subcontractors[0];
};

/**
 * A function to fetch subcontractor information using a GraphQL query.
 *
 * @param params - An object containing the organizationId and id for the query.
 * @returns A Promise that resolves to the subcontractor info or undefined if not found.
 */
export const subcontractorsFetcher = async ([_, params]: [string, FilterRequest<SubcontractorInfo>]) => {
  const {
    page,
    pageSize,
    sort,
    keywords,
    organizationId,
    code,
    name,
    phoneNumber,
    taxCode,
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

  const searchConditionList: string[] = [];
  let searchCondition = "";
  const graphQLParamList: string[] = [];
  let graphQLParams = "";
  let searchParams = {};

  if (code) {
    graphQLParamList.push("$code: String");
    searchConditionList.push("{ code: { containsi: $code } }");
    searchParams = { ...searchParams, code };
  }

  if (name) {
    graphQLParamList.push("$name: String");
    searchConditionList.push("{ name: { containsi: $name } }");
    searchParams = { ...searchParams, name };
  }

  // In case, has filter keywords then search keywords or nam or
  if (keywords) {
    graphQLParamList.push("$keywords: String");
    searchConditionList.push("{ code: { containsi: $keywords } }");
    searchConditionList.push("{ name: { containsi: $keywords } }");
    searchParams = { ...searchParams, keywords };

    searchCondition = `or: [
    ${searchConditionList.join("\n")}
      ]`;
  } else {
    searchCondition = `and: [
      ${searchConditionList.join("\n")}
        ]`;
  }
  graphQLParams = graphQLParamList.join("\n");

  const isFindStatus = isArray(isActiveOptions) && isActiveOptions.length > 0;

  const { data, meta } = await graphQLPost<SubcontractorInfo[]>({
    query: gql`
        query (
          $page: Int
          $pageSize: Int
          $organizationId: Int!
          $sort: [String]
          ${graphQLParams}
          ${phoneNumber ? "$phoneNumber: String" : ""}
          ${taxCode ? "$taxCode: String" : ""}
          ${isFindStatus ? "$isActive: [Boolean]" : ""}
          ${createdByUser ? "$createdByUser: String" : ""}
          ${createdAtFrom ? "$createdAtFrom: DateTime" : ""}
          ${createdAtTo ? "$createdAtTo: DateTime" : ""}
          ${updatedByUser ? "$updatedByUser: String" : ""}
          ${updatedAtFrom ? "$updatedAtFrom: DateTime" : ""}
          ${updatedAtTo ? "$updatedAtTo: DateTime" : ""}
        ) {
          subcontractors(
            pagination: { page: $page, pageSize: $pageSize }
            sort: $sort
            filters: {
              publishedAt: { ne: null }
              organizationId: { eq: $organizationId }
              ${searchCondition}
              ${phoneNumber ? "phoneNumber: { containsi: $phoneNumber }" : ""}
              ${taxCode ? "taxCode: { containsi: $taxCode }" : ""}
              ${isFindStatus ? "isActive: { in: $isActive }" : ""}
              ${createdByUser ? "createdByUser: { username: { containsi: $createdByUser } }" : ""}
              ${createdAtCondition}
              ${updatedByUser ? "updatedByUser: { username: { containsi: $updatedByUser } }" : ""}
              ${updatedAtCondition}
            }
          ) {
            data {
              id
              attributes {
                code
                name
                phoneNumber
                taxCode
                isActive
                user {
                  data {
                    id
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
      ...(phoneNumber && { phoneNumber }),
      ...(taxCode && { taxCode }),
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

  return { data: data?.subcontractors ?? [], meta };
};

/**
 * A function to retrieve subcontractor information by organizationId and id using a GraphQL query.
 *
 * @param organizationId - The organization ID to filter subcontractors.
 * @param id - The ID of the subcontractor to retrieve.
 * @returns A Promise that resolves to the subcontractor info or undefined if not found.
 */
export const getSubcontractor = async (organizationId: number, id: number): Promise<SubcontractorInfo | undefined> => {
  const { data } = await graphQLPost<SubcontractorInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        subcontractors(
          filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }
        ) {
          data {
            id
            attributes {
              code
              name
              taxCode
              email
              phoneNumber
              website
              businessAddress
              documents(pagination: { limit: -1 }) {
                data {
                  id
                  attributes {
                    name
                    url
                  }
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
              description
              isActive
              createdByUser {
                data {
                  id
                }
              }
              updatedAt
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

  return data?.subcontractors[0];
};

/**
 * A function to delete a subcontractor using a GraphQL mutation.
 *
 * @param entity - An object containing organizationId, id, and updatedById for the subcontractor to be deleted.
 * @param lastUpdatedAt - An optional timestamp to check for exclusivity before deletion.
 * @returns A Promise that resolves to the result of the deletion operation.
 */
export const deleteSubcontractor = async (
  entity: Pick<SubcontractorInfo, "organizationId" | "id" | "updatedById" | "userId">,
  lastUpdatedAt?: Date | string
): Promise<MutationResult<SubcontractorInfo>> => {
  const { organizationId, userId, id, updatedById } = entity;

  // Check for exclusivity if lastUpdatedAt is provided
  if (lastUpdatedAt) {
    const isErrorExclusives = await checkSubcontractorExclusives(organizationId, id, lastUpdatedAt);
    if (isErrorExclusives) {
      return { error: ErrorType.EXCLUSIVE };
    }
  }

  let organizationMembers: OrganizationMemberInfo | undefined;

  if (userId) {
    organizationMembers = await getOrganizationMembersByOrganizationIdAndUserId(organizationId, Number(userId));
  }

  const { status, data } = await graphQLPost<SubcontractorInfo>({
    query: gql`
      mutation ($id: ID!, $updatedById: ID!, ${organizationMembers ? "$organizationMemberId: ID!" : ""}) {
        updateSubcontractor(id: $id, data: { publishedAt: null, updatedByUser: $updatedById }) {
          data {
            id
          }
        }
        ${
          organizationMembers
            ? `updateOrganizationMember(id: $organizationMemberId, data: { isLinked: false, updatedByUser: $updatedById }) {
          data {
            id
          }
        }`
            : ""
        }

      }
    `,
    params: {
      id,
      updatedById,
      ...(organizationMembers && { organizationMemberId: Number(organizationMembers.id) }),
    },
  });

  if (status === HttpStatusCode.Ok && data) {
    return { data: data.updateSubcontractor };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * A function to delete a subcontractor using a GraphQL mutation.
 *
 * @param entity - An object containing organizationId, id, and updatedById for the subcontractor to be deleted.
 * @param lastUpdatedAt - An optional timestamp to check for exclusivity before deletion.
 * @returns A Promise that resolves to the result of the deletion operation.
 */
export const checkSubcontractorExclusives = async (
  organizationId: number,
  id: number,
  lastUpdatedAt: Date | string
): Promise<boolean> => {
  const { data } = await graphQLPost<SubcontractorInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        subcontractors(
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

  return data?.subcontractors[0]?.updatedAt !== lastUpdatedAt;
};

/**
 * Fetches subcontractor options based on the specified parameters.
 *
 * @param _ - Placeholder parameter.
 * @param params - Partial subcontractor object containing the filter parameters.
 * @returns Array of subcontractor data matching the specified parameters.
 */
export const subcontractorOptionsFetcher = async ([_, params]: [string, Partial<SubcontractorInfo>]) => {
  const query = gql`
    query ($organizationId: Int) {
      subcontractors(
        pagination: { limit: -1 }
        filters: { organizationId: { eq: $organizationId }, isActive: { eq: true }, publishedAt: { ne: null } }
      ) {
        data {
          id
          attributes {
            code
            name
          }
        }
      }
    }
  `;

  const { data } = await graphQLPost<SubcontractorInfo[]>({
    query,
    params,
  });

  return data?.subcontractors ?? [];
};

/**
 * Fetch information about a subcontractor by its unique identifier.
 *
 * @param {number} organizationId - The unique identifier of the organization.
 *  @param {number} subcontractorId - The unique identifier of the subcontractor.
 * @returns {Promise<SubcontractorInfo | undefined>} Information about the subcontractor or undefined if there's an error.
 */
export const getPartialSubcontractor = async (
  organizationId: number,
  subcontractorId: number
): Promise<SubcontractorInfo | undefined> => {
  const { data } = await graphQLPost<SubcontractorInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        subcontractors(
          filters: {
            organizationId: { eq: $organizationId }
            id: { eq: $id }
            isActive: { eq: true }
            publishedAt: { ne: null }
          }
        ) {
          data {
            id
            attributes {
              name
              email
              phoneNumber
              isActive
            }
          }
        }
      }
    `,
    params: {
      id: subcontractorId,
      organizationId,
    },
  });

  return data?.subcontractors[0];
};

/**
 * A function to retrieve subcontractor name by organizationId and id using a GraphQL query.
 *
 * @param organizationId - The organization ID to filter subcontractors.
 * @param id - The ID of the subcontractor to retrieve.
 * @returns A Promise that resolves to the subcontractor info or undefined if not found.
 */
export const getSubcontractorName = async (organizationId: number, id: number): Promise<string | null | undefined> => {
  const { data } = await graphQLPost<SubcontractorInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        subcontractors(
          filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }
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
      organizationId,
      id,
    },
  });

  return data?.subcontractors[0].name;
};

/**
 * A function to retrieve list subcontractor information by organizationId and list id using a GraphQL query.
 *
 * @param organizationId - The organization ID to filter subcontractors.
 * @param ids - List ID of the subcontractor to retrieve.
 * @returns A Promise that resolves to the list subcontractor info or undefined if not found.
 */
export const getSubcontractorsByIds = async (
  organizationId: number,
  ids: number[]
): Promise<SubcontractorInfo[] | undefined> => {
  const { data } = await graphQLPost<SubcontractorInfo[]>({
    query: gql`
      query ($organizationId: Int!, $ids: [ID]) {
        subcontractors(
          filters: { organizationId: { eq: $organizationId }, id: { in: $ids }, publishedAt: { ne: null } }
        ) {
          data {
            id
            attributes {
              code
              name
            }
          }
        }
      }
    `,
    params: {
      organizationId,
      ids,
    },
  });
  return data?.subcontractors;
};

/**
 * Creates a new subcontractor via API.
 * @param {string} orgLink - The organization link for the subcontractor.
 * @param {SubcontractorInputForm} requestData - The data of the subcontractor being sent.
 * @returns {Promise<ApiResult<SubcontractorInfo>>} - The result returned from the API after creating the subcontractor.
 */
export const createSubcontractor = async (
  orgLink: string,
  requestData: SubcontractorInputForm
): Promise<ApiResult<SubcontractorInfo>> => {
  const result = await post<ApiResult<SubcontractorInfo>>(`/api${orgLink}/subcontractors/new`, requestData);
  return result;
};

/**
 * Updates a subcontractor via API.
 *
 * @param {string} orgLink - The organization link for the subcontractor.
 * @param {SubcontractorUpdateForm} requestData - The data of the subcontractor being updated.
 * @param {string | null} [encryptedId] - The optional encrypted ID of the subcontractor.
 * @returns {Promise<ApiResult<SubcontractorInfo>>} - The result returned from the API after updating the subcontractor.
 */
export const updateSubcontractor = async (
  orgLink: string,
  requestData: SubcontractorUpdateForm,
  encryptedId?: string | null
): Promise<ApiResult<SubcontractorInfo>> => {
  const result = await put<ApiResult<SubcontractorInfo>>(
    `/api${orgLink}/subcontractors/${encryptedId}/edit`,
    requestData
  );

  return result;
};
/**
 * Fetch base subcontractor data.
 * @param params - The filter parameters including organization ID, pickup date, and subcontractor IDs.
 * @returns An array of order trip data.
 */
export const subcontractorBasicInfoListFetcher = async ([_, params]: [string, FilterRequest<SubcontractorInfo>]) => {
  const { subcontractorId, organizationId, page, pageSize } = params;
  const query = gql`
    query (
      ${subcontractorId ? "$subcontractorId:  ID!" : ""}
      $organizationId: Int!
      $page: Int
      $pageSize: Int
    ) {
      subcontractors(
        pagination: { page: $page, pageSize: $pageSize }
        sort: ["updatedAt:desc"]
        filters: {
          ${subcontractorId ? "id: { eq: $subcontractorId }" : ""}
          organizationId: { eq: $organizationId }
          publishedAt: { ne: null }
        }
      ) {
        data {
          id
          attributes {
            code
            name
            phoneNumber
            isActive
          }
        }
        meta {
          pagination {
            total
            page
            pageSize
            pageCount
          }
        }
      }
    }
  `;
  const { data, meta } = await graphQLPost<SubcontractorInfo[]>({
    query,
    params: {
      ...(subcontractorId && { subcontractorId }),
      page,
      pageSize,
      organizationId,
    },
  });

  return {
    data: data?.subcontractors ?? [],
    meta,
  };
};
