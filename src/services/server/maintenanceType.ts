import { Prisma } from "@prisma/client";

import { PrismaClientTransaction } from "@/configs/prisma";
import logger from "@/utils/logger";

/**
 * Create maintenance types based on initial organization values.
 *
 * @param {PrismaClientTransaction} prismaClient - The Prisma client used for database operations.
 * @param {number} userId - The ID of the user creating the maintenance types.
 * @param {number} organizationId - The ID of the organization associated with the maintenance types.
 */
export const initialMaintenanceTypeValues = async (
  prismaClient: PrismaClientTransaction,
  data: Prisma.MaintenanceTypeCreateManyInput[],
  userId: number
) => {
  const startImportTime = Date.now();
  const importDuration = ((Date.now() - startImportTime) / 1000).toFixed(2);

  // Insert many records within the transaction
  await prismaClient.maintenanceType.createMany({
    data,
  });

  // get list id maintenance types by id organization id
  const listIdMaintenanceTypes = await prismaClient.maintenanceType.findMany({
    where: {
      organizationId: data[0].organizationId,
    },
    select: {
      id: true,
    },
  });

  // format data
  const formatListMaintenanceType = listIdMaintenanceTypes.map((item) => ({
    maintenanceTypeId: item.id,
    userId,
  }));

  // link user with maintenance type
  await prismaClient.maintenanceTypesCreatedByUserLinks.createMany({
    data: formatListMaintenanceType,
  });
  await prismaClient.maintenanceTypesUpdatedByUserLinks.createMany({
    data: formatListMaintenanceType,
  });

  logger.debug(
    `#initialMaintenanceTypeValues: Create success Maintenance Type: ${data.length} record in ${importDuration}s`
  );
};
