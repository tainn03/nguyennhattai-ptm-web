import { OrganizationRoleType } from "@prisma/client";
import { gql } from "graphql-request";
import isArray from "lodash/isArray";

import { OWNER_ROLE } from "@/constants/organizationRole";
import { OrganizationMemberInputForm } from "@/forms/organizationMember";
import { ErrorType } from "@/types";
import { HttpStatusCode } from "@/types/api";
import { FilterRequest } from "@/types/filter";
import { MutationResult } from "@/types/graphql";
import { OrderParticipantInfo, OrganizationInfo, OrganizationMemberInfo, UserInfo } from "@/types/strapi";
import { graphQLPost } from "@/utils/api";
import { endOfDay, startOfDay } from "@/utils/date";
import { trim } from "@/utils/string";

/**
 * Fetch list of organizations associated with a user by their ID using a GraphQL query.
 *
 * @param {Pick<UserInfo, "id">} user - An object containing the user's ID.
 * @returns {Promise<(OrganizationMember & { organization: Organization & { logo?: UploadFile } })[]>} - A Promise that
 * resolves with an array of organization data associated with the user.
 */
export const organizationsByUserIdFetcher = async ([_, { id }]: [string, Pick<UserInfo, "id">]): Promise<
  OrganizationMemberInfo[]
> => {
  const { data } = await graphQLPost<OrganizationMemberInfo[]>({
    query: gql`
      query ($userId: ID!) {
        organizationMembers(
          filters: {
            organization: { publishedAt: { ne: null } }
            member: { id: { eq: $userId } }
            publishedAt: { ne: null }
          }
          pagination: { limit: -1 }
        ) {
          data {
            id
            attributes {
              organization {
                data {
                  id
                  attributes {
                    code
                    slug
                    logo {
                      data {
                        id
                        attributes {
                          url
                          previewUrl
                        }
                      }
                    }
                    name
                    email
                    internationalName
                    abbreviationName
                    taxCode
                    businessAddress
                    isActive
                  }
                }
              }
              isAdmin
              role {
                data {
                  id
                  attributes {
                    type
                    name
                  }
                }
              }
            }
          }
        }
      }
    `,
    params: {
      userId: id,
    },
  });

  return data?.organizationMembers || [];
};

/**
 * Fetches a list of organization members based on the provided organization ID.
 *
 * @param entity - An object containing the organization ID.
 * @returns A promise that resolves to an array of organization member information.
 */
export const fetchOrganizationMemberOptions = async ([_, entity]: [
  string,
  Pick<OrganizationMemberInfo, "organization" | "member">,
]): Promise<OrganizationMemberInfo[]> => {
  const { data } = await graphQLPost<OrganizationMemberInfo[]>({
    query: gql`
      query ($organizationId: ID!, $userId: ID) {
        organizationMembers(
          filters: {
            or: [{ member: { id: { eq: $userId } } }, { and: { isLinked: { eq: false } } }]
            organization: { id: { eq: $organizationId }, isActive: { eq: true }, publishedAt: { ne: null } }
            publishedAt: { ne: null }
          }
          pagination: { limit: -1 }
        ) {
          data {
            id
            attributes {
              isLinked
              member {
                data {
                  id
                  attributes {
                    username
                    detail {
                      data {
                        id
                        attributes {
                          firstName
                          lastName
                          avatar {
                            data {
                              id
                              attributes {
                                url
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
      organizationId: entity.organization.id,
      userId: entity.member.id ? entity.member.id : null,
    },
  });

  return data?.organizationMembers ?? [];
};

/**
 * Fetches a list of organization members based on the provided organization ID and roles.
 *
 * @param entity - An object containing the organization ID.
 * @returns A promise that resolves to an array of organization member information.
 */
export const fetchOrganizationMemberOptionsByRoles = async ([_, entity]: [
  string,
  Pick<OrganizationMemberInfo, "organization"> & { roles: OrganizationRoleType[] },
]): Promise<OrganizationMemberInfo[]> => {
  const { organization, roles } = trim(entity);

  const { data } = await graphQLPost<OrganizationMemberInfo[]>({
    query: gql`
      query ($organizationId: ID!, $roles: [String]) {
        organizationMembers(
          filters: {
            organization: { id: { eq: $organizationId }, isActive: { eq: true }, publishedAt: { ne: null } }
            role: { type: { in: $roles } }
            isActive: { eq: true }
            publishedAt: { ne: null }
          }
          pagination: { limit: -1 }
        ) {
          data {
            id
            attributes {
              isLinked
              member {
                data {
                  id
                  attributes {
                    username
                    detail {
                      data {
                        id
                        attributes {
                          firstName
                          lastName
                          avatar {
                            data {
                              id
                              attributes {
                                url
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
      organizationId: organization.id,
      roles,
    },
  });

  return data?.organizationMembers ?? [];
};

/**
 * Fetches an organization member based on the organization ID and user ID.
 *
 * @param {number} organizationId - The ID of the organization.
 * @param {number} id - The ID of the user.
 * @returns The organization member information if found; otherwise, returns undefined.
 */
export const getOrganizationMembersByOrganizationIdAndUserId = async (
  organizationId: number,
  id: number
): Promise<OrganizationMemberInfo | undefined> => {
  const { data } = await graphQLPost<OrganizationMemberInfo[]>({
    query: gql`
      query ($organizationId: ID!, $userId: ID!) {
        organizationMembers(
          filters: {
            organization: { id: { eq: $organizationId }, publishedAt: { ne: null } }
            member: { id: { eq: $userId } }
            publishedAt: { ne: null }
          }
          pagination: { limit: -1 }
        ) {
          data {
            id
          }
        }
      }
    `,
    params: {
      organizationId,
      userId: id,
    },
  });

  return data?.organizationMembers[0];
};

/**
 * Get Organization information based on the organization's code and a user's ID.
 * It returns an `OrganizationInfo` object if the user is a member of the organization and it's
 * in an accepted invitation status. Otherwise, it returns `undefined`.
 *
 * @param {string} orgCode - The code of the organization to retrieve.
 * @param {number} userId - The ID of the user for which to retrieve organization information.
 * @returns {Promise<OrganizationInfo | undefined>} - A promise that resolves to the organization information if found,
 * or `undefined` if not found or not in an accepted invitation status.
 */
export const getOrganizationByCodeAndUserId = async (
  orgCode: string,
  userId: number
): Promise<OrganizationInfo | undefined> => {
  const { data } = await graphQLPost<OrganizationMemberInfo[]>({
    query: gql`
      query ($orgCode: String!, $userId: ID!, $isActive: Boolean) {
        organizationMembers(
          filters: {
            organization: { code: { eq: $orgCode }, isActive: { eq: $isActive }, publishedAt: { ne: null } }
            member: { id: { eq: $userId } }
            publishedAt: { ne: null }
          }
        ) {
          data {
            id
            attributes {
              organization {
                data {
                  id
                }
              }
            }
          }
        }
      }
    `,
    params: {
      orgCode,
      userId,
      isActive: true,
    },
  });

  if (data && data.organizationMembers.length > 0) {
    return data.organizationMembers[0].organization as OrganizationInfo;
  }
};

/**
 * Checks if a driver has been updated since a specified date.
 *
 * @param {number} organizationId - The ID of the organization to which the driver belongs.
 * @param {number} id - The ID of the driver to check.
 * @param {Date | string} lastUpdatedAt - The date to compare against the driver's last updated timestamp.
 * @returns {Promise<boolean>} A promise that resolves to true if the driver has been updated, otherwise false.
 */
export const checkOrganizationMemberExclusives = async (
  organizationId: number,
  id: number,
  lastUpdatedAt: Date | string
): Promise<boolean> => {
  const { data } = await graphQLPost<OrganizationMemberInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        organizationMembers(
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

  return data?.organizationMembers[0]?.updatedAt !== lastUpdatedAt;
};

/**
 * Deletes an organization member by setting its publishedAt field to null.
 *
 * @param {number} memberId - The ID of the organization member to delete.
 * @returns {Promise<boolean>} - A Promise that resolves to a boolean indicating whether the organization member was successfully deleted.
 */
export const deleteOrganizationMember = async (memberId: number, updatedById: number): Promise<boolean> => {
  const query = gql`
    mutation ($memberId: ID!, $updatedById: ID!) {
      updateOrganizationMember(id: $memberId, data: { publishedAt: null, updatedByUser: $updatedById }) {
        data {
          id
        }
      }
    }
  `;

  const { data, status } = await graphQLPost<OrganizationMemberInputForm>({
    query,
    params: { memberId, updatedById },
  });

  return status === HttpStatusCode.Ok && !!data?.updateOrganizationMember.id;
};

/**
 * Update the role of an organization member using a GraphQL mutation.
 *
 * @param {number} id - The ID of the organization member to be updated.
 * @param {number} roleId - The ID of the new role for the organization member.
 * @param {number} updatedByUser - The ID of the user performing the update.
 * @returns {Promise<MutationResult<OrganizationMemberInfo>>} - The result of the mutation, including the updated organization member information.
 * @throws {Error} - Throws an error if there is an issue with the GraphQL mutation.
 *
 */
export const updateOrganizationMemberRole = async (
  id: number,
  roleId: number,
  updatedByUser: number
): Promise<MutationResult<OrganizationMemberInfo>> => {
  const query = gql`
    mutation ($id: ID!, $roleId: ID!, $updatedByUser: ID) {
      updateOrganizationMember(id: $id, data: { role: $roleId, updatedByUser: $updatedByUser }) {
        data {
          id
        }
      }
    }
  `;

  const { data, status } = await graphQLPost<OrganizationMemberInfo>({
    query,
    params: { id, roleId, updatedByUser },
  });

  if (status === HttpStatusCode.Ok && data) {
    return { data: data.updateOrganizationMember };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * Fetches organization members by organization ID.
 *
 * @param {number} organizationId - The ID of the organization.
 * @returns {Promise<OrderParticipantInfo[]>} - A Promise that resolves to an array of organization members with their details.
 */
export const organizationMemberOrderParticipantsFetcher = async ([_, params]: [
  string,
  Partial<OrderParticipantInfo> & { includeAllRoles?: boolean },
]): Promise<OrganizationMemberInfo[]> => {
  const { includeAllRoles, ...otherProps } = params;
  const query = gql`
    query ($organizationId: ID!) {
      organizationMembers(
        filters: {
          organization: { id: { eq: $organizationId }, publishedAt: { ne: null } }
          member: { blocked: { eq: false } }
          publishedAt: { ne: null }
          isActive: { eq: true }
        }
        pagination: { limit: -1 }
      ) {
        data {
          id
          attributes {
            isAdmin
            member {
              data {
                id
                attributes {
                  username
                  phoneNumber
                  email
                  detail {
                    data {
                      id
                      attributes {
                        firstName
                        lastName
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
            username
            phoneNumber
            email
            role {
              data {
                id
                attributes {
                  type
                  name
                }
              }
            }
          }
        }
      }
    }
  `;

  const { data } = await graphQLPost<OrganizationMemberInfo[]>({
    query,
    params: { ...otherProps },
  });

  const formatData = includeAllRoles
    ? data?.organizationMembers
    : (data?.organizationMembers ?? []).filter((item) => {
        const role = item.role?.type as OrganizationRoleType;

        return (
          (item.role === null && item.isAdmin) ||
          (!role && item.isAdmin) ||
          [
            OrganizationRoleType.MANAGER,
            OrganizationRoleType.ADMIN,
            OrganizationRoleType.DISPATCHER,
            OrganizationRoleType.DISPATCH_MANAGER,
          ].some((r) => role?.includes(r))
        );
      });

  return formatData || [];
};

/**
 * Fetches organization member information based on provided parameters.
 *
 * @param {[string, Partial<OrganizationMemberInfo>]} params - An array containing two elements:
 *   1. The first element (unused here, denoted by `_`).
 *   2. The second element, which is an object containing partial information about the organization member.
 * @returns {Promise<OrganizationMemberInfo | undefined>} - A Promise resolving to the organization member information, if found; otherwise, `undefined`.
 */
export const organizationMemberFetcher = async ([_, params]: [string, Partial<OrganizationMemberInfo>]): Promise<
  OrganizationMemberInfo | undefined
> => {
  const { data } = await graphQLPost<OrganizationMemberInfo[]>({
    query: gql`
      query ($organizationId: ID!, $id: ID!) {
        organizationMembers(
          filters: {
            organization: { id: { eq: $organizationId }, publishedAt: { ne: null } }
            id: { eq: $id }
            publishedAt: { ne: null }
          }
        ) {
          data {
            id
            attributes {
              member {
                data {
                  id
                  attributes {
                    username
                    email
                    phoneNumber
                    detail {
                      data {
                        attributes {
                          firstName
                          lastName
                          address {
                            data {
                              attributes {
                                country {
                                  data {
                                    attributes {
                                      name
                                    }
                                  }
                                }
                                city {
                                  data {
                                    attributes {
                                      name
                                    }
                                  }
                                }
                                district {
                                  data {
                                    attributes {
                                      name
                                    }
                                  }
                                }
                                ward {
                                  data {
                                    attributes {
                                      name
                                    }
                                  }
                                }
                                addressLine1
                                addressLine2
                              }
                            }
                          }
                        }
                      }
                    }
                    setting {
                      data {
                        attributes {
                          messageTokens
                        }
                      }
                    }
                  }
                }
              }
              username
              email
              isAdmin
              role {
                data {
                  id
                  attributes {
                    name
                    type
                  }
                }
              }
              description
              isActive
              createdAt
              createdByUser {
                data {
                  id
                  attributes {
                    username
                    detail {
                      data {
                        attributes {
                          firstName
                          lastName
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
                          firstName
                          lastName
                        }
                      }
                    }
                  }
                }
              }
              phoneNumber
            }
          }
        }
      }
    `,
    params: {
      organizationId: params.organization?.id,
      id: params.id,
    },
  });

  return data?.organizationMembers[0];
};

/**
 * Fetches organization members by organization ID.
 *
 * @param {number} organizationId - The ID of the organization.
 * @returns {Promise<OrganizationMemberInfo[]>} - A Promise that resolves to an array of organization members with their details.
 */
export const organizationMembersFetcher = async ([_, params]: [string, FilterRequest<OrganizationMemberInfo>]) => {
  const {
    page,
    pageSize,
    sort,
    keywords,
    organizationId,
    fullName,
    role,
    isActiveOptions,
    updatedByUser,
    updatedAtFrom,
    updatedAtTo,
  } = trim(params);

  const isFindState = isArray(isActiveOptions) && isActiveOptions.length > 0;

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

  if (keywords && fullName) {
    graphQLParams = "$keywords: String";
    searchCondition = `member: {
      or: [
        {
          detail: {
            or: [
              { firstName: { containsi: $keywords } }
              { lastName: { containsi: $keywords } }
              { firstName: { containsi: $fullName } }
              { lastName: { containsi: $fullName } }
            ]
          }
        }
        { email : { containsi: $keywords } }
        { username : { containsi: $keywords } }
        { email : { containsi: $fullName }}
        { username : { containsi: $fullName } }
      ]
    }`;
    searchParams = { keywords, fullName };
  } else if (keywords) {
    graphQLParams = "$keywords: String";
    searchCondition = `member: {
      or: [
        {
          detail: {
            or: [
              { firstName: { containsi: $keywords } }
              { lastName: { containsi: $keywords } }
            ]
          }
        }
        { email : { containsi: $keywords } }
        { username : { containsi: $keywords } }
      ]
    }`;
    searchParams = { keywords };
  } else if (fullName) {
    searchCondition = `member: {
      or: [
        {
          detail: {
            or: [
              { firstName: { containsi: $fullName } }
              { lastName: { containsi: $fullName } }
            ]
          }
        }
        { email : { containsi: $fullName } }
        { username : { containsi: $fullName } }
      ]
    }`;
    searchParams = { fullName };
  }

  const isFindRole = isArray(role) && role.length > 0;
  const isFindOwner = isFindRole && role.includes(OWNER_ROLE);
  const findRoleQuery = `role: {
                          or: [
                            { type: { in: $role } }
                            ${isFindOwner ? "{ type: { eq: null } }" : ""}
                          ]
                        }`;

  const { data, meta } = await graphQLPost<OrganizationMemberInfo[]>({
    query: gql`
      query (
          $page: Int
          $pageSize: Int
          $organizationId: ID!
          $sort: [String]
          ${graphQLParams}
          ${fullName ? " $fullName: String" : ""}
          ${isFindRole ? "$role: [String]" : ""}
          ${isFindState ? "$isActive: [Boolean]" : ""}
          ${updatedByUser ? "$updatedByUser: String" : ""}
          ${updatedAtFrom ? "$updatedAtFrom: DateTime" : ""}
          ${updatedAtTo ? "$updatedAtTo: DateTime" : ""}
      ) {
        organizationMembers(
          pagination: { page: $page, pageSize: $pageSize }
          sort: $sort
          filters: {
            ${isFindRole ? findRoleQuery : ""}
            ${isFindState ? "isActive: { in: $isActive }" : ""}
            organization: {
              id: { eq: $organizationId }
            }
            ${searchCondition}
            ${updatedByUser ? "updatedByUser: { username: { containsi: $updatedByUser } }" : ""}
            ${updatedAtCondition}
          }
        ) {
          data {
            id
            attributes {
              username
              email
              phoneNumber
              isActive
              isAdmin
              role {
                data {
                  id
                  attributes {
                    name
                    type
                  }
                }
              }
              member {
                data {
                  id
                  attributes {
                    username
                    email
                    phoneNumber
                    detail {
                      data {
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
                    setting {
                      data {
                        attributes {
                          messageTokens
                        }
                      }
                    }
                  }
                }
              }
              updatedAt
              createdByUser{
                data {
                  id
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
      ...(isFindState && { isActive: isActiveOptions.map((item) => item === "true") }),
      ...(isFindRole && { role }),
      ...(updatedByUser && { updatedByUser }),
      ...(updatedAtFrom && { updatedAtFrom: startOfDay(updatedAtFrom) }),
      ...(updatedAtTo && { updatedAtTo: endOfDay(updatedAtTo) }),
    },
  });

  return { data: data?.organizationMembers ?? [], meta };
};

/**
 * Fetches organization members by organization ID.
 *
 * @param {number} organizationId - The ID of the organization.
 * @returns {Promise<OrganizationMemberInfo[]>} - A Promise that resolves to an array of organization members with their details.
 */
export const getOrganizationMember = async (
  organizationId: number,
  id: number
): Promise<OrganizationMemberInfo | undefined> => {
  const { data } = await graphQLPost<OrganizationMemberInfo[]>({
    query: gql`
      query ($organizationId: ID!, $id: ID!) {
        organizationMembers(
          filters: { organization: { id: { eq: $organizationId } }, id: { eq: $id }, publishedAt: { ne: null } }
        ) {
          data {
            id
            attributes {
              member {
                data {
                  id
                  attributes {
                    username
                    email
                    phoneNumber
                    detail {
                      data {
                        id
                        attributes {
                          firstName
                          lastName
                          address {
                            data {
                              id
                              attributes {
                                country {
                                  data {
                                    id
                                    attributes {
                                      code
                                      name
                                    }
                                  }
                                }
                                city {
                                  data {
                                    id
                                    attributes {
                                      code
                                      name
                                    }
                                  }
                                }
                                district {
                                  data {
                                    id
                                    attributes {
                                      code
                                      name
                                    }
                                  }
                                }
                                ward {
                                  data {
                                    id
                                    attributes {
                                      code
                                      name
                                    }
                                  }
                                }
                                addressLine1
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
              username
              email
              phoneNumber
              role {
                data {
                  id
                  attributes {
                    name
                    type
                  }
                }
              }
              description
              isActive
              createdByUser {
                data {
                  id
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

  return data?.organizationMembers[0];
};
