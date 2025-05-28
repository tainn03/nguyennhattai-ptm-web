"use server";

import { gql } from "graphql-request";

import { ErrorType } from "@/types";
import { MutationResult } from "@/types/graphql";
import { CustomerGroupInfo } from "@/types/strapi";
import { fetcher } from "@/utils/graphql";
import { getServerToken } from "@/utils/server";
import { ensureString, trim } from "@/utils/string";

/**
 * Checks if a customer group name exists within an organization, optionally excluding a specific customer group ID.
 *
 * @param {number} organizationId - The ID of the organization to search within.
 * @param {string} name - The customer group name to check for.
 * @param {number | undefined} excludeId - (Optional) The ID of a customer group to exclude from the check.
 * @returns {Promise<boolean>} A promise that resolves to true if the customer group name exists, otherwise false.
 */
export const checkCustomerGroupNameExists = async (
  organizationId: number,
  name: string,
  excludeId?: number
): Promise<boolean> => {
  const { jwt } = await getServerToken();

  const query = gql`
    query ($organizationId: Int!, $name: String!, $excludeId: ID) {
      customerGroups(
        filters: {
          organizationId: { eq: $organizationId }
          name: { eq: $name }
          id: { ne: $excludeId }
          publishedAt: { ne: null }
        }
      ) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<CustomerGroupInfo[]>(jwt, query, {
    ...(excludeId && { excludeId }),
    name,
    organizationId,
  });

  return (data?.customerGroups.length ?? 0) > 0;
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
  const { jwt } = await getServerToken();

  const query = gql`
    query ($organizationId: Int!, $id: ID!) {
      customerGroups(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
        data {
          id
          attributes {
            updatedAt
          }
        }
      }
    }
  `;

  const { data } = await fetcher<CustomerGroupInfo[]>(jwt, query, {
    organizationId,
    id,
  });

  return data?.customerGroups[0]?.updatedAt !== lastUpdatedAt;
};

/**
 * Creates a new customer group.
 *
 * @param entity - The customer group to create.
 * @returns The ID of the newly created customer group.
 */
export const createCustomerGroup = async (
  entity: Partial<CustomerGroupInfo>
): Promise<MutationResult<Partial<CustomerGroupInfo>>> => {
  const { jwt } = await getServerToken();
  const { organizationId, name, manager, description, isActive, createdById } = trim(entity);

  const isNameExist = await checkCustomerGroupNameExists(Number(organizationId), ensureString(name));
  if (isNameExist) {
    return { error: ErrorType.EXISTED, data: { name: "duplicate" } };
  }

  const query = gql`
    mutation (
      $organizationId: Int!
      $name: String!
      $description: String
      $isActive: Boolean!
      $publishedAt: DateTime
      $createdById: ID
      $managerId: ID
    ) {
      createCustomerGroup(
        data: {
          organizationId: $organizationId
          name: $name
          description: $description
          isActive: $isActive
          publishedAt: $publishedAt
          createdByUser: $createdById
          updatedByUser: $createdById
          manager: $managerId
        }
      ) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<CustomerGroupInfo>(jwt, query, {
    organizationId,
    name,
    ...(manager?.id && { managerId: manager.id }),
    ...(description && { description }),
    isActive,
    publishedAt: new Date().toISOString(),
    createdById,
  });

  if (data.createCustomerGroup) {
    return { data: data.createCustomerGroup };
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
export const updateCustomerGroup = async (
  entity: Partial<CustomerGroupInfo>,
  lastUpdatedAt?: Date | string
): Promise<MutationResult<Partial<CustomerGroupInfo>>> => {
  const { jwt } = await getServerToken();
  const { organizationId, id, name, description, isActive, updatedById, manager } = trim(entity);

  if (lastUpdatedAt) {
    const isErrorExclusives = await checkCustomerGroupExclusives(Number(organizationId), Number(id), lastUpdatedAt);
    if (isErrorExclusives) {
      return { error: ErrorType.EXCLUSIVE };
    }
  }

  const isNameExist = await checkCustomerGroupNameExists(Number(organizationId), ensureString(name), id);
  if (isNameExist) {
    return { error: ErrorType.EXISTED, data: { name: "duplicate" } };
  }

  const query = gql`
    mutation ($id: ID!, $name: String!, $description: String, $isActive: Boolean, $updatedById: ID, $manageId: ID) {
      updateCustomerGroup(
        id: $id
        data: {
          name: $name
          description: $description
          isActive: $isActive
          updatedByUser: $updatedById
          manager: $manageId
        }
      ) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<CustomerGroupInfo>(jwt, query, {
    id,
    name,
    description,
    isActive,
    manageId: Number(manager?.id),
    updatedById,
  });

  if (data.updateCustomerGroup) {
    return { data: data.updateCustomerGroup };
  }

  return { error: ErrorType.UNKNOWN };
};
