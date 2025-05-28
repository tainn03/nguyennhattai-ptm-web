import { gql } from "graphql-request";

import { PrismaClientTransaction } from "@/configs/prisma";
import { GasStationInputForm } from "@/forms/gasStation";
import { GasStationInfo } from "@/types/strapi";
import { fetcher } from "@/utils/graphql";
import { ensureString } from "@/utils/string";

/**
 * Creates a new gas station.
 *
 * @param {PrismaClientTransaction} prisma The prisma transaction
 * @param entity - The gas station to create.
 * @returns The ID of the newly created gas station.
 */
export const createGasStation = async (prisma: PrismaClientTransaction, entity: Omit<GasStationInputForm, "id">) => {
  const { createdById, name, organizationId, fuelCapacity, description, isActive, address } = entity;
  const result = await prisma.gasStation.create({
    data: {
      name: ensureString(name),
      organizationId: Number(organizationId),
      fuelCapacity,
      description,
      isActive,
      publishedAt: new Date(),
    },
  });

  if (!result) {
    return null;
  }
  const gasStationId = result.id;
  const userId = Number(createdById);
  await prisma.gasStationsAddressLinks.create({ data: { gasStationId, addressInformationId: Number(address?.id) } });
  await prisma.gasStationsCreatedByUserLinks.create({ data: { gasStationId, userId } });
  await prisma.gasStationsUpdatedByUserLinks.create({ data: { gasStationId, userId } });

  return gasStationId;
};

/**
 * Checks if a gas name exists within an organization, optionally excluding a specific gas ID.
 *
 * @param {number} organizationId - The ID of the organization to search within.
 * @param {string} name - The gas name to check for.
 * @param {number | undefined} excludeId - (Optional) The ID of a gas to exclude from the check.
 * @returns {Promise<boolean>} A promise that resolves to true if the gas name exists, otherwise false.
 */
export const checkGasStationNameExists = async (
  jwt: string,
  organizationId: number,
  name: string,
  excludeId?: number
) => {
  const query = gql`
    query (
      $organizationId: Int!
      $name: String!
      ${excludeId ? "$excludeId: ID" : ""}
    ) {
      gasStations(
        filters: {
          organizationId: { eq: $organizationId }
          name: { eq: $name }
          ${excludeId ? "id: { ne: $excludeId }" : ""}
          publishedAt: { ne: null }
        }
      ) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<GasStationInfo[]>(jwt, query, {
    ...(excludeId && { excludeId }),
    name,
    organizationId,
  });

  return data.gasStations.length > 0;
};

/**
 * Checks if a gas name exists within an organization, optionally excluding a specific gas ID.
 *
 * @param {number} organizationId - The ID of the organization to search within.
 * @param {string} name - The gas name to check for.
 * @param {number | undefined} excludeId - (Optional) The ID of a gas to exclude from the check.
 * @returns {Promise<boolean>} A promise that resolves to true if the gas name exists, otherwise false.
 */
export const checkGasStationExclusives = async (
  jwt: string,
  organizationId: number,
  id: number,
  lastUpdatedAt: Date | string
) => {
  const query = gql`
    query ($organizationId: Int!, $id: ID!) {
      gasStations(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
        data {
          id
          attributes {
            updatedAt
          }
        }
      }
    }
  `;

  const { data } = await fetcher<GasStationInfo[]>(jwt, query, {
    organizationId,
    id,
  });

  return data?.gasStations[0]?.updatedAt !== lastUpdatedAt;
};

/**
 * Updates a gas's attributes within the organization.
 *
 * @param {PrismaClientTransaction} prisma The prisma transaction
 * @param {GasStationInputForm} entity - The gas entity to update.
 * @returns Id of updated data
 */
export const updateGasStation = async (prisma: PrismaClientTransaction, entity: GasStationInputForm) => {
  const { id, name, fuelCapacity, description, isActive, updatedById } = entity;
  const gasStationId = Number(id);

  const result = await prisma.gasStation.update({
    where: { id: gasStationId },
    data: { name, fuelCapacity, description, isActive },
    select: { id: true },
  });

  await prisma.gasStationsUpdatedByUserLinks.updateMany({
    where: { gasStationId },
    data: { userId: Number(updatedById) },
  });

  return result?.id;
};
