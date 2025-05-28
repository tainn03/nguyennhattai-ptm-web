import { OrganizationRoleType } from "@prisma/client";
import { gql } from "graphql-request";

import { STRAPI_TOKEN_KEY } from "@/configs/environment";
import { prisma } from "@/configs/prisma";
import { OrganizationMemberInputForm } from "@/forms/organizationMember";
import { ApiError, HttpStatusCode } from "@/types/api";
import { OrganizationMemberInfo } from "@/types/strapi";
import { fetcher } from "@/utils/graphql";
import { ensureString, trim } from "@/utils/string";

import { createOrganizationUser } from "./user";
import { updateOrganizationUserDetail } from "./userDetail";

/**
 * Update the linking status (isLinked) of an organization member.
 *
 * @param jwt - JWT token for authentication.
 * @param organizationMemberId - The ID of the organization member to update.
 * @param isLinked - The new linking status to set.
 * @returns The updated organization member's information or undefined if the update fails.
 */
export const updateIsLinkOrganizationMember = async (
  jwt: string,
  organizationMemberId: number,
  isLinked: boolean,
  updatedById: number
): Promise<OrganizationMemberInfo | undefined> => {
  const query = gql`
    mutation ($id: ID!, $updatedById: ID, $isLinked: Boolean) {
      updateOrganizationMember(id: $id, data: { isLinked: $isLinked, updatedByUser: $updatedById }) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<OrganizationMemberInfo>(jwt, query, {
    id: organizationMemberId,
    isLinked,
    updatedById,
  });

  return data.updateOrganizationMember;
};

/**
 * Retrieves information about an organization member by matching the provided organization ID and user ID.
 *
 * @param jwt - The JSON Web Token for authentication.
 * @param organizationId - The ID of the organization to search within.
 * @param userId - The ID of the user to search for within the organization.
 * @returns A promise that resolves to an organization member information object or undefined if not found.
 */
export const getOrganizationMembersByOrganizationIdAndUserId = async (
  jwt: string,
  organizationId: number,
  userId: number
): Promise<OrganizationMemberInfo> => {
  const query = gql`
    query ($organizationId: ID!, $userId: ID!) {
      organizationMembers(filters: { organization: { id: { eq: $organizationId } }, member: { id: { eq: $userId } } }) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<OrganizationMemberInfo[]>(jwt, query, {
    organizationId,
    userId,
  });

  return data.organizationMembers[0];
};

/**
 * Retrieves detailed information about the current organization member, including their role,
 * based on the provided organization ID and user ID.
 *
 * @param {number} orgId - The unique identifier of the organization.
 * @param {number} userId - The unique identifier of the user.
 * @returns {Promise<OrganizationMemberInfo | undefined>} - A promise that resolves to detailed
 * information about the organization member, including their role, or undefined if not found.
 */
export const getCurrentOrganizationMemberIncludeRole = async (
  orgId: number,
  userId: number
): Promise<OrganizationMemberInfo | undefined> => {
  const { data } = await fetcher<OrganizationMemberInfo[]>(
    STRAPI_TOKEN_KEY,
    gql`
      query ($orgId: ID!, $userId: ID!) {
        organizationMembers(
          filters: {
            organization: { id: { eq: $orgId }, isActive: { eq: true }, publishedAt: { ne: null } }
            member: { id: { eq: $userId } }
            publishedAt: { ne: null }
          }
        ) {
          data {
            id
            attributes {
              username
              email
              phoneNumber
              isAdmin
              organization {
                data {
                  id
                  attributes {
                    createdByUser {
                      data {
                        id
                      }
                    }
                  }
                }
              }
              member {
                data {
                  id
                }
              }
              role {
                data {
                  id
                  attributes {
                    type
                    name
                    permissions
                  }
                }
              }
            }
          }
        }
      }
    `,
    {
      orgId,
      userId,
    }
  );

  return data?.organizationMembers[0];
};

/**
 * Get User by Organization ID and Identifier
 *
 * This function queries the Strapi API to retrieve user information based on a unique identifier
 * (username or email) within a specific organization. It utilizes GraphQL to filter organization
 * members by the provided organization ID, identifier, and additional criteria to ensure the user
 * is not blocked, is confirmed, and is active. If a match is found, it returns the user information.
 *
 * @param {number} organizationId - The ID of the organization where the user is a member.
 * @param {string} identifier - The unique identifier (username or email) of the user to retrieve.
 * @returns {Promise<OrganizationMemberInfo | undefined>} A promise that resolves to the Organization member information, or undefined if not found.
 */
export const getOrganizationMemberByOrganizationIdAndIdentifier = async (
  organizationId: number,
  identifier: string
): Promise<OrganizationMemberInfo | undefined> => {
  const query = gql`
    query ($identifier: String, $organizationId: ID!) {
      organizationMembers(
        filters: {
          organization: { id: { eq: $organizationId }, publishedAt: { ne: null } }
          member: { blocked: { eq: false }, confirmed: { eq: true } }
          or: [{ username: { eq: $identifier } }, { email: { eq: $identifier } }]
          isActive: { eq: true }
          publishedAt: { ne: null }
        }
      ) {
        data {
          id
          attributes {
            username
            email
            member {
              data {
                id
                attributes {
                  username
                  email
                }
              }
            }
          }
        }
      }
    }
  `;

  const { data } = await fetcher<OrganizationMemberInfo[]>(STRAPI_TOKEN_KEY, query, {
    identifier,
    organizationId,
  });
  return data?.organizationMembers[0];
};

/**
 * Checks if a username exists for an organization member.
 *
 * @param {string} jwt - The JSON Web Token for authentication.
 * @param {number} organizationId - The ID of the organization to check within.
 * @param {string} username - The username to check for existence.
 * @param {number | undefined} excludeId - (Optional) The ID to exclude from the check.
 * @returns {Promise<boolean>} - A Promise resolving to `true` if the username exists; otherwise, `false`.
 */
export const checkOrganizationMemberUsernameExists = async (
  jwt: string,
  organizationId: number,
  username: string,
  excludeId?: number
): Promise<boolean> => {
  const query = gql`
    query (
      $organizationId: ID!
      $username: String!
      ${excludeId ? "$excludeId: ID" : ""}
    ) {
      organizationMembers(
        filters: {
          publishedAt: { ne: null }
          organization: { id: { eq: $organizationId } }
          username: { eq: $username }
          ${excludeId ? "id: { ne: $excludeId }" : ""}
        }
      ) {
        data {
          id
        }
      }
    }
  `;
  const { data } = await fetcher<OrganizationMemberInfo[]>(jwt, query, {
    ...(excludeId && { excludeId }),
    username,
    organizationId,
  });

  return (data?.organizationMembers.length ?? 0) > 0;
};

/**
 * Checks if a email exists for an organization member.
 *
 * @param {string} jwt - The JSON Web Token for authentication.
 * @param {number} organizationId - The ID of the organization to check within.
 * @param {string} email - The email to check for existence.
 * @param {number | undefined} excludeId - (Optional) The ID to exclude from the check.
 * @returns {Promise<boolean>} - A Promise resolving to `true` if the email exists; otherwise, `false`.
 */
export const checkOrganizationMemberEmailExists = async (
  jwt: string,
  organizationId: number,
  email: string,
  excludeId?: number
): Promise<boolean> => {
  const query = gql`
    query (
      $organizationId: ID!
      $email: String!
      ${excludeId ? "$excludeId: ID" : ""}
    ) {
      organizationMembers(
        filters: {
          publishedAt: { ne: null }
          organization: { id: { eq: $organizationId } }
          email: { eq: $email }
          ${excludeId ? "id: { ne: $excludeId }" : ""}
        }
      ) {
        data {
          id
        }
      }
    }
  `;
  const { data } = await fetcher<OrganizationMemberInfo[]>(jwt, query, {
    ...(excludeId && { excludeId }),
    email,
    organizationId,
  });

  return (data?.organizationMembers.length ?? 0) > 0;
};

/**
 * Creates an organization member with associated details, settings, and logs.
 *
 * @param {OrganizationMemberInputForm} entity - The input form containing organization member details.
 * @param {number} createdById - The ID of the user who is creating this organization member.
 * @returns {Promise<number>} - A Promise resolving to the ID of the created organization member.
 */
export const createOrganizationMember = async (
  entity: OrganizationMemberInputForm,
  createdById: number
): Promise<number> => {
  const { organization, member, username, email, role, isAdmin, description, isActive, phoneNumber, driverId } =
    trim(entity);

  if (!member) {
    throw new ApiError(HttpStatusCode.BadRequest);
  }

  const createdUserId = await prisma.$transaction(async (prismaClient) => {
    // Create Organization member
    const createdOrganizationMemberResult = await prismaClient.organizationMember.create({
      data: {
        username: ensureString(username),
        email,
        isAdmin,
        isLinked: false,
        description,
        isActive,
        phoneNumber,
        publishedAt: new Date(),
      },
    });

    // Link Organization member with Organization
    await prismaClient.organizationMembersOrganizationLinks.create({
      data: {
        organizationMemberId: createdOrganizationMemberResult.id,
        organizationId: Number(organization?.id),
      },
    });

    // Link Organization member with role
    await prismaClient.organizationMembersRoleLinks.create({
      data: {
        organizationMemberId: createdOrganizationMemberResult.id,
        organizationRoleId: Number(role?.id),
      },
    });

    // Create log user create
    await prismaClient.organizationMembersCreatedByUserLinks.create({
      data: {
        organizationMemberId: createdOrganizationMemberResult.id,
        userId: createdById,
      },
    });

    // Create log user update
    await prismaClient.organizationMembersUpdatedByUserLinks.create({
      data: {
        organizationMemberId: createdOrganizationMemberResult.id,
        userId: createdById,
      },
    });

    // Create member
    const userId = await createOrganizationUser(prismaClient, member, Number(organization?.id), createdById);

    // Link Organization member with User (member)
    await prismaClient.organizationMembersMemberLinks.create({
      data: {
        organizationMemberId: createdOrganizationMemberResult.id,
        userId,
      },
    });

    // Return the ID of the created organization member
    return userId;
  });

  // Link Organization member with User (driver)
  if (driverId) {
    await prisma.driverUserLinks.create({ data: { userId: createdUserId, driverId: Number(driverId) } });
  }

  return createdUserId;
};

/**
 * Updates the details of an organization member including username, email, activity status,
 * description, phone number, and role.
 *
 * @param {OrganizationMemberInputForm} entity - The details of the organization member to be updated.
 * @param {number} updatedById - The ID of the user who is updating these details.
 * @returns {Promise<number>} - A Promise resolving to the ID of the updated organization member.
 */
export const updateOrganizationMember = async (
  entity: OrganizationMemberInputForm,
  updatedById: number
): Promise<number> => {
  const { id, member, username, email, isActive, description, phoneNumber, role, driverId } = trim(entity);
  const organizationMemberId = Number(id);

  // Use Prisma transaction to ensure atomic updates
  return await prisma.$transaction(async (prismaClient) => {
    // Update organization member details
    await prismaClient.organizationMember.update({
      where: {
        id: organizationMemberId,
      },
      data: {
        username: ensureString(username),
        email,
        isActive,
        description,
        phoneNumber,
      },
    });

    if (role?.id) {
      // Update organization member's role link
      await prismaClient.organizationMembersRoleLinks.updateMany({
        where: {
          organizationMemberId,
        },
        data: {
          organizationRoleId: Number(role.id),
        },
      });
    }

    // Update organization user details
    await updateOrganizationUserDetail(prismaClient, { ...member?.detail }, updatedById);

    // Delete existing driver links for the user
    await prismaClient.driverUserLinks.deleteMany({ where: { userId: Number(member?.id) } });
    // If the role is a DRIVER and a driver ID is provided, create a new driver link
    if (role?.type === OrganizationRoleType.DRIVER && driverId) {
      await prismaClient.driverUserLinks.create({ data: { driverId, userId: Number(member?.id) } });
    }

    // Update links to track who updated the organization member
    await prismaClient.organizationMembersUpdatedByUserLinks.updateMany({
      where: {
        organizationMemberId,
      },
      data: {
        userId: Number(updatedById),
      },
    });

    return organizationMemberId;
  });
};

/**
 * Retrieves detailed information about the current organization member,
 * based on the provided organization ID and role type.
 *
 * @param {number} orgId - The unique identifier of the organization.
 * @param {OrganizationRoleType[]} roles - List role to get.
 * @returns {Promise<OrganizationMemberInfo | undefined>} - A promise that resolves to detailed
 * information about the organization member, or undefined if not found.
 */
export const getOrganizationMembersByRoles = async (
  jwt: string,
  orgId: number,
  roles: OrganizationRoleType[]
): Promise<OrganizationMemberInfo[] | undefined> => {
  const { data } = await fetcher<OrganizationMemberInfo[]>(
    jwt,
    gql`
      query ($orgId: ID!, $roles: [String]) {
        organizationMembers(
          filters: {
            isActive: { eq: true }
            publishedAt: { ne: null }
            organization: { id: { eq: $orgId }, isActive: { eq: true }, publishedAt: { ne: null } }
            role: { type: { in: $roles } }
          }
        ) {
          data {
            id
            attributes {
              member {
                data {
                  id
                }
              }
            }
          }
        }
      }
    `,
    {
      orgId,
      roles,
    }
  );

  return data?.organizationMembers;
};

/**
 * Fetches the email address of an organization member by their member ID.
 * @param organizationId - The unique identifier of the organization.
 * @param memberId - The unique identifier of the member within the organization.
 * @returns A promise that resolves to the member's email address if found, or null if not found.
 */
export const getOrganizationMemberByMemberId = async (
  organizationId: number,
  memberId: number
): Promise<OrganizationMemberInfo | null> => {
  const query = gql`
    query ($organizationId: ID!, $memberId: ID) {
      organizationMembers(
        filters: {
          organization: { id: { eq: $organizationId }, publishedAt: { ne: null } }
          member: { blocked: { eq: false }, id: { eq: $memberId } }
          publishedAt: { ne: null }
          isActive: { eq: true }
        }
      ) {
        data {
          attributes {
            phoneNumber
            email
          }
        }
      }
    }
  `;

  // Execute the query using the fetcher function, providing the token as a variable.
  const result = await fetcher<OrganizationMemberInfo[]>(STRAPI_TOKEN_KEY, query, {
    organizationId,
    memberId,
  });
  return result.data?.organizationMembers[0] || null;
};
