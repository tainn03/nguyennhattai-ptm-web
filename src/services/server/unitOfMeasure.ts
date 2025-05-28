import { Prisma } from "@prisma/client";
import { gql } from "graphql-request";

import { PrismaClientTransaction } from "@/configs/prisma";
import { UnitOfMeasureInfo } from "@/types/strapi";
import { fetcher } from "@/utils/graphql";
import logger from "@/utils/logger";

/**
 * Create Unit of measure based on initial organization values.
 *
 * @param {PrismaClientTransaction} prismaClient - The Prisma client instance.
 * @param {number} userId - The ID of the user creating the Unit of measure.
 * @param {number} organizationId - The ID of the organization associated with the Unit of measure.
 */
export const initialUnitOfMeasuresValues = async (
  prismaClient: PrismaClientTransaction,
  data: Prisma.UnitOfMeasureCreateManyInput[],
  userId: number
) => {
  const startImportTime = Date.now();
  const importDuration = ((Date.now() - startImportTime) / 1000).toFixed(2);

  // Insert many records within the transaction
  await prismaClient.unitOfMeasure.createMany({
    data,
  });

  // get list id unit of measure by id organization id
  const listIdUnitOfMeasures = await prismaClient.unitOfMeasure.findMany({
    where: {
      organizationId: data[0].organizationId,
    },
    select: {
      id: true,
    },
  });

  const formatListUnitOfMeasure = listIdUnitOfMeasures.map((item) => ({
    unitOfMeasureId: item.id,
    userId,
  }));

  // link user with Unit of measure
  await prismaClient.unitOfMeasuresCreatedByUserLinks.createMany({
    data: formatListUnitOfMeasure,
  });
  await prismaClient.unitOfMeasuresUpdatedByUserLinks.createMany({
    data: formatListUnitOfMeasure,
  });

  logger.debug(`#initialUnitOfMeasures: Create success Unit of measure: ${data.length} record in ${importDuration}s`);
};

/**
 * Fetch unit of measure information from the server based on the provided organization and unit of measure ID.
 *
 * @param {number} organizationId - The ID of the organization to which the unit of measure belongs.
 * @param {number} id - The ID of the unit of measure to fetch.
 * @returns {Promise<UnitOfMeasureInfo | undefined>} A promise that resolves to the unit of measure information or null if not found.
 */
export const getUnitOfMeasureNotificationData = async (
  jwt: string,
  organizationId: number,
  id: number
): Promise<UnitOfMeasureInfo | undefined> => {
  const query = gql`
    query ($organizationId: Int!, $id: ID!) {
      unitOfMeasures(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
        data {
          id
          attributes {
            code
          }
        }
      }
    }
  `;
  const { data } = await fetcher<UnitOfMeasureInfo[]>(jwt, query, { organizationId, id });

  return data?.unitOfMeasures[0];
};
