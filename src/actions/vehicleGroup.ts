"use server";

import { gql } from "graphql-request";

import { ErrorType } from "@/types";
import { MutationResult } from "@/types/graphql";
import { VehicleGroupInfo } from "@/types/strapi";
import { fetcher } from "@/utils/graphql";
import { getServerToken } from "@/utils/server";
import { ensureString, trim } from "@/utils/string";

/**
 * Checks if a vehicle group name exists within an organization, optionally excluding a specific vehicle group ID.
 *
 * @param {number} organizationId - The ID of the organization to search within.
 * @param {string} name - The vehicle group name to check for.
 * @param {number | undefined} excludeId - (Optional) The ID of a vehicle group to exclude from the check.
 * @returns {Promise<boolean>} A promise that resolves to true if the vehicle group name exists, otherwise false.
 */
export const checkVehicleGroupNameExists = async (
  organizationId: number,
  name: string,
  excludeId?: number
): Promise<boolean> => {
  const { jwt } = await getServerToken();

  const query = gql`
    query ($organizationId: Int!, $name: String!, $excludeId: ID) {
      vehicleGroups(
        filters: {
          publishedAt: { ne: null }
          organizationId: { eq: $organizationId }
          name: { eq: $name }
          id: { ne: $excludeId }
        }
      ) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<VehicleGroupInfo[]>(jwt, query, {
    ...(excludeId && { excludeId }),
    name,
    organizationId,
  });

  return (data?.vehicleGroups.length ?? 0) > 0;
};

/**
 * Checks if a vehicle group has been updated since a specified date.
 *
 * @param {number} organizationId - The ID of the organization to which the vehicle group belongs.
 * @param {number} id - The ID of the vehicle group to check.
 * @param {Date | string} lastUpdatedAt - The date to compare against the vehicle group's last updated timestamp.
 * @returns {Promise<boolean>} A promise that resolves to true if the vehicle group has been updated, otherwise false.
 */
export const checkVehicleGroupExclusives = async (
  organizationId: number,
  id: number,
  lastUpdatedAt: Date | string
): Promise<boolean> => {
  const { jwt } = await getServerToken();

  const query = gql`
    query ($organizationId: Int!, $id: ID!) {
      vehicleGroups(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
        data {
          id
          attributes {
            updatedAt
          }
        }
      }
    }
  `;

  const { data } = await fetcher<VehicleGroupInfo[]>(jwt, query, {
    organizationId,
    id,
  });

  return data?.vehicleGroups[0]?.updatedAt !== lastUpdatedAt;
};

/**
 * Creates a new vehicle group.
 *
 * @param entity - The vehicle group to create.
 * @returns The ID of the newly created vehicle group.
 */
export const createVehicleGroup = async (
  entity: Partial<VehicleGroupInfo>
): Promise<MutationResult<Partial<VehicleGroupInfo>>> => {
  const { jwt } = await getServerToken();
  const { organizationId, name, manager, description, isActive, createdById } = trim(entity);

  const isNameExist = await checkVehicleGroupNameExists(Number(organizationId), ensureString(name));
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
      createVehicleGroup(
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

  const { data } = await fetcher<VehicleGroupInfo>(jwt, query, {
    organizationId,
    name,
    ...(manager?.id && { managerId: manager.id }),
    ...(description && { description }),
    isActive,
    publishedAt: new Date().toISOString(),
    createdById,
  });

  if (data.createVehicleGroup) {
    return { data: data.createVehicleGroup };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * This function updates a vehicle group info entity.
 *
 * @param entity - The vehicle group entity to update (contains id, name, description, isActive, updatedById, etc.).
 * @param - The last updated timestamp for checking exclusivity (optional).
 * @returns - A promise that resolves to the result of the update operation.
 */
export const updateVehicleGroup = async (
  entity: Partial<VehicleGroupInfo>,
  lastUpdatedAt?: Date | string
): Promise<MutationResult<Partial<VehicleGroupInfo>>> => {
  const { jwt } = await getServerToken();
  const { organizationId, id, name, description, isActive, updatedById, manager } = trim(entity);

  if (lastUpdatedAt) {
    const isErrorExclusives = await checkVehicleGroupExclusives(Number(organizationId), Number(id), lastUpdatedAt);
    if (isErrorExclusives) {
      return { error: ErrorType.EXCLUSIVE };
    }
  }

  const isNameExist = await checkVehicleGroupNameExists(Number(organizationId), ensureString(name), id);
  if (isNameExist) {
    return { error: ErrorType.EXISTED, data: { name: "duplicate" } };
  }

  const query = gql`
    mutation ($id: ID!, $name: String!, $description: String, $isActive: Boolean, $updatedById: ID, $manageId: ID) {
      updateVehicleGroup(
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

  const { data } = await fetcher<VehicleGroupInfo>(jwt, query, {
    id,
    name,
    description,
    isActive,
    manageId: Number(manager?.id),
    updatedById,
  });

  if (data.updateVehicleGroup) {
    return { data: data.updateVehicleGroup };
  }

  return { error: ErrorType.UNKNOWN };
};
