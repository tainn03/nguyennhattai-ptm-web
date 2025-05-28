import { HttpStatusCode } from "axios";
import { gql } from "graphql-request";

import { ErrorType } from "@/types";
import { MutationResult } from "@/types/graphql";
import { OrganizationRoleInfo } from "@/types/strapi";
import { graphQLPost } from "@/utils/api";
import { ensureString, trim } from "@/utils/string";

/**
 * Fetch organization role options using a GraphQL query.
 *
 * @param {string} _ - Unused parameter, typically a placeholder for localization.
 * @param {Partial<Pick<OrganizationRoleInfo, "organizationId">>} entity - The entity containing the organizationId for filtering roles.
 * @returns {Promise<OrganizationRoleInfo[]>} - The list of organization roles available for the specified organization.
 * @throws {Error} - Throws an error if there is an issue with the GraphQL query.
 *
 */
export const fetchOrganizationRoleOptions = async ([_, entity]: [
  string,
  Partial<Pick<OrganizationRoleInfo, "organizationId">>,
]): Promise<OrganizationRoleInfo[]> => {
  const { data } = await graphQLPost<OrganizationRoleInfo[]>({
    query: gql`
      query ($organizationId: Int) {
        organizationRoles(
          filters: { organizationId: { eq: $organizationId }, publishedAt: { ne: null } }
          pagination: { limit: -1 }
        ) {
          data {
            id
            attributes {
              name
              type
            }
          }
        }
      }
    `,
    params: {
      organizationId: entity.organizationId,
    },
  });

  return data?.organizationRoles ?? [];
};

/**
 * Fetch organization roles based on specified parameters.
 *
 * @param {Array} [_, params] - Destructured array containing the organizationId and params.
 * @returns {Array} An array of organization roles.
 */
export const organizationRolesFetcher = async ([_, params]: [string, Partial<OrganizationRoleInfo>]) => {
  const { data } = await graphQLPost<OrganizationRoleInfo[]>({
    query: gql`
      query ($organizationId: Int, $isActive: Boolean) {
        organizationRoles(
          filters: { organizationId: { eq: $organizationId }, publishedAt: { ne: null }, isActive: { eq: $isActive } }
          pagination: { limit: -1 }
        ) {
          data {
            id
            attributes {
              name
              type
              description
              isActive
              permissions
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
      ...trim(params),
      isActive: true,
    },
  });

  return data?.organizationRoles ?? [];
};

/**
 * Check if an organization role with a given name exists within a specified organization.
 *
 * @param {number} organizationId - The ID of the organization.
 * @param {string} name - The name of the organization role to check.
 * @param {number} [excludeId] - (Optional) ID of the organization role to exclude from the check.
 * @returns {Promise<boolean>} A promise that resolves to true if the name exists, false otherwise.
 */
export const checkOrganizationRoleNameExists = async (
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
      organizationRoles(
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
  const { data } = await graphQLPost<OrganizationRoleInfo[]>({
    query,
    params: {
      ...(excludeId && { excludeId }),
      name,
      organizationId,
    },
  });

  return (data?.organizationRoles.length ?? 0) > 0;
};

/**
 * Check if an organization role with the given ID and last updated timestamp exists.
 *
 * @param {number} organizationId - The ID of the organization.
 * @param {number} id - The ID of the organization role to check.
 * @param {Date|string} lastUpdatedAt - The last updated timestamp of the organization role to check.
 * @returns {Promise<boolean>} A promise that resolves to true if the organization role exists and has been updated, false otherwise.
 */
export const checkOrganizationRoleExclusives = async (
  organizationId: number,
  id: number,
  lastUpdatedAt: Date | string
): Promise<boolean> => {
  const { data } = await graphQLPost<OrganizationRoleInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        organizationRoles(filters: { organizationId: { eq: $organizationId }, id: { eq: $id } }) {
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

  return data?.organizationRoles[0]?.updatedAt !== lastUpdatedAt;
};

/**
 * Create a new organization role.
 *
 * @param {Omit<OrganizationRoleInfo, "id">} entity - The organization role data excluding the ID.
 * @returns {Promise<MutationResult<OrganizationRoleInfo>>} A promise that resolves to the result of the mutation (created organization role data or error).
 */
export const createOrganizationRole = async (
  entity: Omit<OrganizationRoleInfo, "id">
): Promise<MutationResult<OrganizationRoleInfo>> => {
  const processedEntity = trim(entity);

  // Check if the organization role name already exists in the organization
  const isNameExists = await checkOrganizationRoleNameExists(processedEntity.organizationId, processedEntity.name);
  if (isNameExists) {
    return { error: ErrorType.EXISTED };
  }

  const { status, data } = await graphQLPost<OrganizationRoleInfo>({
    query: gql`
      mutation (
        $organizationId: Int!
        $name: String!
        $description: String
        $permissions: JSON
        $isActive: Boolean!
        $publishedAt: DateTime
        $createdById: ID
      ) {
        createOrganizationRole(
          data: {
            organizationId: $organizationId
            name: $name
            description: $description
            permissions: $permissions
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
      ...processedEntity,
      isActive: true,
      publishedAt: new Date(),
    },
  });

  if (status === HttpStatusCode.Ok && data) {
    return { data: data.createOrganizationRole };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * Update an existing organization role.
 *
 * @param {OrganizationRoleInfo} entity - The organization role data including the ID.
 * @param {Date | string} [lastUpdatedAt] - The last updated timestamp to check for exclusivity.
 * @returns {Promise<MutationResult<OrganizationRoleInfo>>} A promise that resolves to the result of the mutation (updated organization role data or error).
 */
export const updateOrganizationRole = async (
  entity: OrganizationRoleInfo,
  lastUpdatedAt?: Date | string
): Promise<MutationResult<OrganizationRoleInfo>> => {
  const { organizationId, ...otherEntityProps } = trim(entity);

  // Check for exclusivity if lastUpdatedAt is provided
  if (lastUpdatedAt) {
    const isErrorExclusives = await checkOrganizationRoleExclusives(organizationId, otherEntityProps.id, lastUpdatedAt);
    if (isErrorExclusives) {
      return { error: ErrorType.EXCLUSIVE };
    }
  }

  // Check if the organization role name already exists in the organization
  const isNameExists = await checkOrganizationRoleNameExists(
    Number(organizationId),
    ensureString(otherEntityProps.name),
    otherEntityProps.id
  );
  if (isNameExists) {
    return { error: ErrorType.EXISTED };
  }

  const { status, data } = await graphQLPost<OrganizationRoleInfo>({
    query: gql`
      mutation (
        $id: ID!
        $organizationId: Int!
        $name: String!
        $description: String
        $type: ENUM_ORGANIZATIONROLE_TYPE
        $permissions: JSON
        $updatedById: ID
      ) {
        updateOrganizationRole(
          id: $id
          data: {
            organizationId: $organizationId
            name: $name
            description: $description
            type: $type
            permissions: $permissions
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
      ...otherEntityProps,
      organizationId,
    },
  });

  if (status === HttpStatusCode.Ok && data) {
    return { data: data.updateOrganizationRole };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * Delete an existing organization role by setting its publishedAt to null.
 *
 * @param {Pick<OrganizationRoleInfo, "organizationId" | "id" | "updatedById">} entity - The organization role data including the ID and the ID of the user performing the update.
 * @param {Date | string} [lastUpdatedAt] - The last updated timestamp to check for exclusivity.
 * @returns {Promise<MutationResult<OrganizationRoleInfo>>} A promise that resolves to the result of the mutation (deleted organization role data or error).
 */
export const deleteOrganizationRole = async (
  entity: Pick<OrganizationRoleInfo, "organizationId" | "id" | "updatedById">,
  lastUpdatedAt?: Date | string
): Promise<MutationResult<OrganizationRoleInfo>> => {
  const { organizationId, id, updatedById } = entity;

  // Check for exclusivity if lastUpdatedAt is provided
  if (lastUpdatedAt) {
    const isErrorExclusives = await checkOrganizationRoleExclusives(organizationId, id, lastUpdatedAt);
    if (isErrorExclusives) {
      return { error: ErrorType.EXCLUSIVE };
    }
  }

  const { status, data } = await graphQLPost<OrganizationRoleInfo>({
    query: gql`
      mutation ($id: ID!, $updatedById: ID!) {
        updateOrganizationRole(id: $id, data: { publishedAt: null, updatedByUser: $updatedById }) {
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
    return { data: data.updateOrganizationRole };
  }

  return { error: ErrorType.UNKNOWN };
};
