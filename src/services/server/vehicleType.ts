import { Prisma } from "@prisma/client";

import { PrismaClientTransaction } from "@/configs/prisma";
import logger from "@/utils/logger";

/**
 * Create vehicle types based on initial organization values and link them to users.
 *
 * @param {PrismaClientTransaction} prismaClient - The Prisma database transaction instance.
 * @param {number} userId - The ID of the user creating the vehicle types.
 * @param {number} organizationId - The ID of the organization associated with the vehicle types.
 */
export const initialVehicleTypeValues = async (
  prismaClient: PrismaClientTransaction,
  data: Prisma.VehicleTypeCreateManyInput[],
  userId: number
) => {
  const startImportTime = Date.now();
  const importDuration = ((Date.now() - startImportTime) / 1000).toFixed(2);

  // Insert many records within the transaction
  await prismaClient.vehicleType.createMany({
    data,
  });

  // get list id maintenance types by id organization id
  const listIdVehicleTypes = await prismaClient.vehicleType.findMany({
    where: {
      organizationId: data[0].organizationId,
    },
    select: {
      id: true,
    },
  });

  const formatListVehicleType = listIdVehicleTypes.map((item) => ({
    vehicleTypeId: item.id,
    userId,
  }));

  // link user with maintenance type
  await prismaClient.vehicleTypesCreatedByUserLinks.createMany({
    data: formatListVehicleType,
  });
  await prismaClient.vehicleTypesUpdatedByUserLinks.createMany({
    data: formatListVehicleType,
  });

  logger.debug(`#initialVehicleTypes: Create success Vehicle type: ${data.length} record in ${importDuration}s`);
};
