import { PrismaClientTransaction } from "@/configs/prisma";
import { VehicleTrackingInfo } from "@/types/strapi";
import { isNumeric } from "@/utils/number";

/**
 * Update an existing vehicle tracking record.
 *
 * @param {string} jwt - JSON Web Token for authentication.
 * @param {VehicleTrackingInfo} entity - The vehicle information to be updated.
 * @returns {Promise<VehicleTrackingInfo | undefined>} A promise that resolves to the updated vehicle information or `undefined` if there was an error.
 */
export const upsertVehicleTracking = async (
  prisma: PrismaClientTransaction,
  entity: VehicleTrackingInfo
): Promise<number | undefined> => {
  const { organizationId, vehicleId, longitude, latitude, direction, speed, address, carStatus, instantFuel } = entity;

  const upsertVehicleTracking = await prisma.vehicleTracking.upsert({
    where: {
      vehicleId,
      organizationId,
    },
    update: {
      ...(isNumeric(longitude) && { longitude: Number(longitude) }),
      ...(isNumeric(latitude) && { latitude: Number(latitude) }),
      ...(isNumeric(direction) && { direction: Number(direction) }),
      ...(isNumeric(speed) && { speed: Number(speed) }),
      ...(address && { address }),
      ...(carStatus && { carStatus }),
      ...(isNumeric(instantFuel) && { instantFuel: Number(instantFuel) }),
      updatedAt: new Date(),
    },
    create: {
      organizationId,
      vehicleId,
      ...(isNumeric(longitude) && { longitude: Number(longitude) }),
      ...(isNumeric(latitude) && { latitude: Number(latitude) }),
      ...(isNumeric(direction) && { direction: Number(direction) }),
      ...(isNumeric(speed) && { speed: Number(speed) }),
      ...(address && { address }),
      ...(carStatus && { carStatus }),
      ...(isNumeric(instantFuel) && { instantFuel: Number(instantFuel) }),
      createdAt: new Date(),
      updatedAt: new Date(),
      publishedAt: new Date(),
    },
    select: {
      id: true,
    },
  });

  return upsertVehicleTracking.id;
};
