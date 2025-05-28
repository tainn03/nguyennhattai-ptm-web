import { Prisma } from "@prisma/client";

import { PrismaClientTransaction } from "@/configs/prisma";

/**
 * Create trailer types based on initial organization values.
 *
 * @param {PrismaClientTransaction} prismaClient - The Prisma client used for database operations.
 * @param {number} userId - The ID of the user creating the trailer types.
 * @param {number} organizationId - The ID of the organization associated with the trailer types.
 */
export const initialTrailerTypeValues = async (
  prismaClient: PrismaClientTransaction,
  data: Prisma.TrailerTypeCreateManyInput[],
  userId: number
) => {
  const startImportTime = Date.now();
  const importDuration = ((Date.now() - startImportTime) / 1000).toFixed(2);

  // Insert many records within the transaction
  await prismaClient.trailerType.createMany({
    data,
  });

  // get list id trailer types by id organization id
  const listIdTrailerTypes = await prismaClient.trailerType.findMany({
    where: {
      organizationId: data[0].organizationId,
    },
    select: {
      id: true,
    },
  });

  const formatListTrailerType = listIdTrailerTypes.map((item) => ({
    trailerTypeId: item.id,
    userId,
  }));

  // link user with trailer types
  await prismaClient.trailerTypesCreatedByUserLinks.createMany({
    data: formatListTrailerType,
  });
  await prismaClient.trailerTypesUpdatedByUserLinks.createMany({
    data: formatListTrailerType,
  });

  console.log(`Create success Trailer Type: ${data.length} record in ${importDuration}`);
};
