import { gql } from "graphql-request";

import { prisma, PrismaClientTransaction } from "@/configs/prisma";
import { FUEL_LOG_RELATED_TYPE } from "@/constants/relatedType";
import { FuelLogInputForm } from "@/forms/fuelLog";
import { IndividualFuelLogsHistoryQueryParams } from "@/types/report";
import { FuelLogInfo } from "@/types/strapi";
import { calculateAverageConsumption } from "@/utils/fuelLog";
import { fetcher } from "@/utils/graphql";
import { isNumeric } from "@/utils/number";
import { trim } from "@/utils/string";

/**
 * Creates a new fuel log station.
 *
 * @param {PrismaClientTransaction} prisma The prisma transaction
 * @param entity - The fuel log station to create.
 * @returns The ID of the newly created fuel log station.
 */
export const createFuelLog = async (
  jwt: string,
  prisma: PrismaClientTransaction,
  entity: Omit<FuelLogInputForm, "id">,
  uploadedFuelMeterImage?: number,
  uploadedOdometerImage?: number,
  latestOdometer?: number
) => {
  const {
    createdById,
    organizationId,
    vehicle,
    driver,
    gasStation,
    date,
    liters,
    fuelCost,
    fuelType,
    odometerReading,
    latitude,
    longitude,
    notes,
  } = entity;

  let averageConsumption = 0;
  if (latestOdometer && liters) {
    averageConsumption = Math.max(
      calculateAverageConsumption(Number(odometerReading) - latestOdometer, Number(liters)),
      0
    );
  }

  const result = await prisma.fuelLog.create({
    data: {
      organizationId: Number(organizationId),
      date: date ?? new Date(),
      fuelType,
      ...(isNumeric(liters) && { liters: Number(liters) }),
      ...(isNumeric(fuelCost) && { fuelCost: Number(fuelCost) }),
      ...(isNumeric(averageConsumption) && averageConsumption < 1000 && { averageConsumption }),
      ...(isNumeric(odometerReading) && { odometerReading: Number(odometerReading) }),
      latitude,
      longitude,
      notes,
      publishedAt: new Date(),
    },
    select: { id: true },
  });

  if (!result) {
    return null;
  }

  const fuelLogId = Number(result.id);
  if (uploadedFuelMeterImage) {
    await prisma.filesRelatedMorphs.create({
      data: {
        fileId: Number(uploadedFuelMeterImage),
        relatedId: fuelLogId,
        relatedType: FUEL_LOG_RELATED_TYPE,
        field: "fuelMeterImage",
      },
    });
  }

  if (uploadedOdometerImage) {
    await prisma.filesRelatedMorphs.create({
      data: {
        fileId: Number(uploadedOdometerImage),
        relatedId: fuelLogId,
        relatedType: FUEL_LOG_RELATED_TYPE,
        field: "odometerImage",
      },
    });
  }

  const userId = Number(createdById);
  await prisma.fuelLogsCreatedByUserLinks.create({ data: { fuelLogId, userId } });
  await prisma.fuelLogsUpdatedByUserLinks.create({ data: { fuelLogId, userId } });

  vehicle?.id && (await prisma.fuelLogsVehicleLinks.create({ data: { vehicleId: Number(vehicle?.id), fuelLogId } }));
  driver?.id && (await prisma.fuelLogsDriverLinks.create({ data: { driverId: Number(driver?.id), fuelLogId } }));
  gasStation?.id &&
    (await prisma.fuelLogsGasStationLinks.create({ data: { gasStationId: Number(gasStation?.id), fuelLogId } }));

  // After fuel log (after created)
  const afterFuelLog = await getFuelLogAfterDateByVehicle(jwt, {
    id: fuelLogId,
    organizationId,
    vehicle: { id: vehicle?.id },
    date: date as Date,
  });

  // Update average consumption of after fuel log (after created)
  if (afterFuelLog) {
    const afterAverageConsumption = calculateAverageConsumption(
      Number(afterFuelLog.odometerReading) - Number(odometerReading),
      Number(liters)
    );

    await prisma.fuelLog.update({
      where: { id: Number(afterFuelLog.id) },
      data: {
        averageConsumption: afterAverageConsumption >= 0 ? afterAverageConsumption : 0,
      },
      select: { id: true },
    });
  }

  return fuelLogId;
};

/**
 * Checks if a fuel log name exists within an organization, optionally excluding a specific fuel log ID.
 *
 * @param {number} organizationId - The ID of the organization to search within.
 * @param {string} name - The fuel log name to check for.
 * @param {number | undefined} excludeId - (Optional) The ID of a fuel log to exclude from the check.
 * @returns {Promise<boolean>} A promise that resolves to true if the fuel log name exists, otherwise false.
 */
export const checkFuelLogExclusives = async (
  jwt: string,
  organizationId: number,
  id: number,
  lastUpdatedAt: Date | string
) => {
  const query = gql`
    query ($organizationId: Int!, $id: ID!) {
      fuelLogs(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
        data {
          id
          attributes {
            updatedAt
          }
        }
      }
    }
  `;

  const { data } = await fetcher<FuelLogInfo[]>(jwt, query, {
    organizationId,
    id,
  });

  return data?.fuelLogs[0]?.updatedAt !== lastUpdatedAt;
};

/**
 * Updates a fuel log's attributes within the organization.
 *
 * @param {PrismaClientTransaction} prisma The prisma transaction
 * @param {FuelLogInputForm} entity - The fuel log entity to update.
 * @returns Id of updated data
 */
export const updateFuelLog = async (
  jwt: string,
  entity: FuelLogInputForm,
  uploadedFuelMeterImage?: number,
  uploadedOdometerImage?: number,
  lastOdometer?: number
) => {
  const {
    id,
    driver,
    vehicle,
    gasStation,
    liters,
    date,
    fuelType,
    fuelCost,
    odometerReading,
    updatedById,
    oldDate,
    organizationId,
  } = entity;

  const fuelLogId = Number(id);
  let averageConsumption = 0;

  // Calculate average consumption if lastOdometer and liters are provided
  if (lastOdometer && liters) {
    averageConsumption = calculateAverageConsumption(Number(odometerReading) - lastOdometer, Number(liters));
  }

  // Update fuel log entry
  const updatedFuelLog = await prisma.fuelLog.update({
    where: { id: fuelLogId },
    data: {
      liters,
      date,
      fuelType,
      fuelCost,
      odometerReading,
      averageConsumption: Math.max(averageConsumption, 0),
    },
    select: { id: true },
  });

  // If update failed, return null
  if (!updatedFuelLog) {
    return null;
  }

  // Update associations with drivers, vehicles, gas stations, and users
  await Promise.all([
    prisma.fuelLogsDriverLinks.updateMany({ where: { fuelLogId }, data: { driverId: Number(driver?.id) } }),
    prisma.fuelLogsVehicleLinks.updateMany({ where: { fuelLogId }, data: { vehicleId: Number(vehicle?.id) } }),
    prisma.fuelLogsGasStationLinks.updateMany({ where: { fuelLogId }, data: { gasStationId: Number(gasStation?.id) } }),
    prisma.fuelLogsUpdatedByUserLinks.updateMany({ where: { fuelLogId }, data: { userId: Number(updatedById) } }),
  ]);

  // Handle uploaded images
  const handleUploadedImages = async (fieldName: string, imageId?: number) => {
    if (imageId) {
      await prisma.filesRelatedMorphs.create({
        data: {
          fileId: Number(imageId),
          relatedId: fuelLogId,
          relatedType: FUEL_LOG_RELATED_TYPE,
          field: fieldName,
        },
      });
    }
  };

  await handleUploadedImages("fuelMeterImage", uploadedFuelMeterImage);
  await handleUploadedImages("odometerImage", uploadedOdometerImage);

  // Update average consumption of subsequent fuel log entry
  const updateAverageConsumption = async (record: FuelLogInfo | null) => {
    if (record?.odometerReading && record?.liters) {
      const afterAverageConsumption = calculateAverageConsumption(
        record.odometerReading - Number(odometerReading),
        Number(record.liters)
      );

      await prisma.fuelLog.update({
        where: { id: Number(record.id) },
        data: {
          averageConsumption: Math.max(afterAverageConsumption, 0),
        },
        select: { id: true },
      });
    }
  };

  // Update average consumption of subsequent fuel log entry after the current update
  const updatedAfterFuelLog = await getFuelLogAfterDateByVehicle(jwt, {
    id,
    organizationId,
    vehicle,
    date: date as Date,
  });
  await updateAverageConsumption(updatedAfterFuelLog);

  // Update average consumption of subsequent fuel log entry before the current update
  const oldAfterFuelLog = await getFuelLogAfterDateByVehicle(jwt, {
    id,
    organizationId,
    vehicle,
    date: oldDate as Date,
  });

  if (oldAfterFuelLog) {
    const latestBeforeUpdate = await getRecentFuelLogByVehicle(jwt, {
      id: oldAfterFuelLog.id,
      organizationId,
      vehicle,
      date: oldAfterFuelLog.date,
    });

    let afterAverageConsumption = 0;
    if (latestBeforeUpdate) {
      afterAverageConsumption = calculateAverageConsumption(
        Number(oldAfterFuelLog.odometerReading) - Number(latestBeforeUpdate.odometerReading),
        Number(oldAfterFuelLog.liters)
      );
    }

    await prisma.fuelLog.update({
      where: { id: Number(oldAfterFuelLog.id) },
      data: {
        averageConsumption: Math.max(afterAverageConsumption, 0),
      },
      select: { id: true },
    });
  }

  return updatedFuelLog?.id;
};

/**
 * Retrieves the latest fuel log recorded before a given date for a specific vehicle.
 * @param {string} jwt - The JSON Web Token for authentication.
 * @param {object} entity - The entity containing details of the fuel log.
 * @returns {Promise<FuelLogInfo | null>} The latest fuel log recorded before the given date, or null if not found.
 */
export const getRecentFuelLogByVehicle = async (
  jwt: string,
  entity: Pick<Partial<FuelLogInfo>, "id" | "organizationId" | "vehicle" | "date">
) => {
  const { id, organizationId, vehicle, date } = entity;

  const query = gql`
    query (
      $organizationId: Int!
      $id: ID
      ${date ? "$date: DateTime" : ""}
      ${id ? "$exceptId: ID" : ""}
    ) {
      fuelLogs(
        filters: {
          organizationId: { eq: $organizationId }
          vehicle: { id: { eq: $id } }
          ${date ? "date: { lt: $date }" : ""}
          ${id ? "id: { ne: $exceptId }" : ""}
          publishedAt: { ne: null }
        }
        sort: ["date:desc"]
        pagination: { limit: 1 }
      ) {
        data {
          id
          attributes {
            odometerReading
            liters
          }
        }
      }
    }
  `;

  const { data } = await fetcher<FuelLogInfo[]>(jwt, query, {
    organizationId,
    id: Number(vehicle?.id),
    ...(date && { date }),
    ...(id && { exceptId: Number(id) }),
  });
  return (data.fuelLogs || []).length > 0 ? data.fuelLogs[0] : null;
};

/**
 * Retrieves the next fuel log recorded after a given date for a specific vehicle.
 * @param {string} jwt - The JSON Web Token for authentication.
 * @param {object} entity - The entity containing details of the fuel log.
 * @returns {Promise<FuelLogInfo | null>} The next fuel log recorded after the given date, or null if not found.
 */
export const getFuelLogAfterDateByVehicle = async (
  jwt: string,
  entity: Pick<Partial<FuelLogInfo>, "id" | "organizationId" | "vehicle" | "date">
) => {
  const { id, organizationId, vehicle, date } = entity;

  const query = gql`
    query ($organizationId: Int!, $id: ID, $date: DateTime, $exceptId: ID) {
      fuelLogs(
        sort: ["date:asc"]
        pagination: { limit: 1 }
        filters: {
          id: { ne: $exceptId }
          organizationId: { eq: $organizationId }
          vehicle: { id: { eq: $id } }
          date: { gt: $date }
          publishedAt: { ne: null }
        }
      ) {
        data {
          id
          attributes {
            odometerReading
            liters
            date
          }
        }
      }
    }
  `;

  const { data } = await fetcher<FuelLogInfo[]>(jwt, query, {
    organizationId,
    id: Number(vehicle?.id),
    date,
    exceptId: id,
  });
  return (data.fuelLogs || []).length > 0 ? data.fuelLogs[0] : null;
};

/**
 * Fetches and formats fuel log data for export based on provided query parameters.
 *
 * @param jwt - The JSON Web Token for authentication.
 * @param params - An object containing the following optional properties:
 * @param locale - The locale to use for formatting dates.
 * @param clientTimezone - The timezone of the client to format dates.
 * @returns An array of formatted fuel log data, with additional fields like `ordinalNumber` and `logDate`.
 */
export const getExportFuelLogs = async (
  jwt: string,
  params: Pick<
    IndividualFuelLogsHistoryQueryParams,
    "organizationId" | "startDate" | "endDate" | "driverId" | "vehicleId" | "gasStationId"
  >
): Promise<FuelLogInfo[]> => {
  const { organizationId, startDate, endDate, driverId, vehicleId, gasStationId } = trim(params);

  const query = gql`
    query (
      $organizationId: Int!
      $driverId: ID
      $vehicleId: ID
      $gasStationId: ID
      $startDate: DateTime
      $endDate: DateTime
    ) {
      fuelLogs(
        pagination: { limit: -1 }
        sort: ["date:asc"]
        filters: {
          organizationId: { eq: $organizationId }
          driver: { id: { eq: $driverId } }
          vehicle: { id: { eq: $vehicleId } }
          gasStation: { id: { eq: $gasStationId } }
          date: { gte: $startDate, lte: $endDate }
          publishedAt: { ne: null }
        }
      ) {
        data {
          attributes {
            vehicle {
              data {
                attributes {
                  vehicleNumber
                  idNumber
                  fuelConsumption
                }
              }
            }
            gasStation {
              data {
                attributes {
                  name
                }
              }
            }
            driver {
              data {
                attributes {
                  firstName
                  lastName
                }
              }
            }
            date
            liters
            fuelCost
            odometerReading
            averageConsumption
            confirmationAt
            confirmationBy {
              data {
                attributes {
                  detail {
                    data {
                      attributes {
                        firstName
                        lastName
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const { data } = await fetcher<FuelLogInfo[]>(jwt, query, {
    organizationId,
    startDate,
    endDate,
    ...(driverId && { driverId }),
    ...(vehicleId && { vehicleId }),
    ...(gasStationId && { gasStationId }),
  });

  return data.fuelLogs ?? [];
};
