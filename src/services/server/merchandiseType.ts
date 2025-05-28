import { Prisma } from "@prisma/client";

import { PrismaClientTransaction } from "@/configs/prisma";
import logger from "@/utils/logger";

/**
 * Create merchandise types based on initial organization values.
 *
 * @param {PrismaClientTransaction} prismaClient - The Prisma client used for database operations.
 * @param {number} userId - The ID of the user creating the merchandise types.
 * @param {number} organizationId - The ID of the organization associated with the merchandise types.
 */
export const initialMerchandiseTypeValues = async (
  prismaClient: PrismaClientTransaction,
  data: Prisma.MerchandiseTypeCreateManyInput[],
  userId: number
) => {
  const startImportTime = Date.now();
  const importDuration = ((Date.now() - startImportTime) / 1000).toFixed(2);

  // Insert many records within the transaction
  await prismaClient.merchandiseType.createMany({
    data,
  });

  // get list id merchandise type by id organization id
  const listIdMerchandiseTypes = await prismaClient.merchandiseType.findMany({
    where: {
      organizationId: data[0].organizationId,
    },
    select: {
      id: true,
    },
  });

  const formatListMerchandiseType = listIdMerchandiseTypes.map((item) => ({
    merchandiseTypeId: item.id,
    userId,
  }));

  // link user with merchandise type
  await prismaClient.merchandiseTypesCreatedByUserLinks.createMany({
    data: formatListMerchandiseType,
  });
  await prismaClient.merchandiseTypesUpdatedByUserLinks.createMany({
    data: formatListMerchandiseType,
  });

  logger.debug(
    `#initialMerchandiseTypes: Create success Merchandise type: ${data.length} record in ${importDuration}s`
  );
};
