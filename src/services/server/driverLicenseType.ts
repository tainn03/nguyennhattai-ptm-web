import { Prisma } from "@prisma/client";

import { PrismaClientTransaction } from "@/configs/prisma";
import logger from "@/utils/logger";

/**
 * Create driver license types based on initial organization values.
 *
 * @param {PrismaClientTransaction} prismaClient - The Prisma client used for database operations.
 * @param {number} userId - The ID of the user creating the driver license types.
 * @param {number} organizationId - The ID of the organization associated with the driver license types.
 */
export const initialDriverLicenseTypeValues = async (
  prismaClient: PrismaClientTransaction,
  data: Prisma.DriverLicenseTypeCreateManyInput[],
  userId: number
) => {
  const startImportTime = Date.now();
  const importDuration = ((Date.now() - startImportTime) / 1000).toFixed(2);

  // Insert many records within the transaction
  await prismaClient.driverLicenseType.createMany({
    data,
  });

  // get list id driver license types by id organization id
  const listIdDriverLicenseTypes = await prismaClient.driverLicenseType.findMany({
    where: {
      organizationId: data[0].organizationId,
    },
    select: {
      id: true,
    },
  });

  const formatListDriverLicenseType = listIdDriverLicenseTypes.map((item) => ({
    driverLicenseTypeId: item.id,
    userId,
  }));

  // link user with driver license types
  await prismaClient.driverLicenseTypesCreatedByUserLinks.createMany({
    data: formatListDriverLicenseType,
  });
  await prismaClient.driverLicenseTypesUpdatedByUserLinks.createMany({
    data: formatListDriverLicenseType,
  });

  logger.debug(
    `#initialDriverLicenseTypes: Create success Driver license type: ${data.length} record in ${importDuration}s`
  );
};
