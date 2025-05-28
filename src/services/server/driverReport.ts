import { OrderTripStatusType, Prisma } from "@prisma/client";
import { gql } from "graphql-request";
import moment from "moment";

import { prisma, PrismaClientTransaction } from "@/configs/prisma";
import { DriverReportInputForm, UpdateDisplayOrderForm } from "@/forms/driverReport";
import { DriverReportDetailInfo, DriverReportInfo } from "@/types/strapi";
import { fetcher } from "@/utils/graphql";
import logger from "@/utils/logger";
import { ensureString } from "@/utils/string";

/**
 * A function to check if a driver report has been updated by comparing its last update timestamp.
 * @param organizationId - The ID of the organization.
 * @param id - The ID of the driver report to check.
 * @param lastUpdatedAt - The timestamp of the last update for comparison.
 * @returns A Promise that resolves to true if the driver report has been updated, or false otherwise.
 */
export const checkDriverReportExclusives = async (
  jwt: string,
  organizationId: number,
  id: number,
  lastUpdatedAt: Date | string
): Promise<boolean> => {
  const query = gql`
    query ($organizationId: Int!, $id: ID!) {
      driverReports(filters: { organizationId: { eq: $organizationId }, id: { eq: $id } }) {
        data {
          id
          attributes {
            updatedAt
          }
        }
      }
    }
  `;
  const { data } = await fetcher<DriverReportInfo[]>(jwt, query, {
    organizationId,
    id,
  });

  if (data?.driverReports) {
    return !moment(data.driverReports[0]?.updatedAt).isSame(lastUpdatedAt);
  }

  return true;
};

/**
 * A function to check if a driver report name exists.
 * @param organizationId - The ID of the organization.
 * @param name - The name of the driver report to check.
 * @param excludeId - The ID of the driver report to exclude from the check.
 * @returns A Promise that resolves to true if the driver report name exists, or false otherwise.
 */
export const checkDriverReportNameExists = async (
  jwt: string,
  organizationId: number,
  name: string,
  excludeId?: number
): Promise<boolean> => {
  const query = gql`
    query (
      $organizationId: Int!
      $name: String!
      ${excludeId ? "$excludeId: ID" : ""}
    ) {
      driverReports(
        filters: {
          organizationId: { eq: $organizationId }
          name: { eq: $name }
          ${excludeId ? "id: { ne: $excludeId }" : ""}
        }
      ) {
        data {
          id
        }
      }
    }
  `;
  const { data } = await fetcher<DriverReportInfo[]>(jwt, query, {
    ...(excludeId && { excludeId }),
    name,
    organizationId,
  });

  return data.driverReports.length > 0;
};

/**
 * Get the maximum display order of driver reports for a specific organization.
 * @param organizationId - The ID of the organization.
 * @returns A Promise that resolves to the maximum display order of driver reports or 0 if none exist.
 */
export const getMaxDisplayOrderOfDriver = async (jwt: string, organizationId: number): Promise<number> => {
  const query = gql`
    query ($organizationId: Int!) {
      driverReports(
        pagination: { start: 0, limit: 1 }
        sort: "displayOrder:desc"
        filters: { organizationId: { eq: $organizationId } }
      ) {
        data {
          id
          attributes {
            displayOrder
          }
        }
      }
    }
  `;
  const { data } = await fetcher<DriverReportInfo[]>(jwt, query, { organizationId });
  return data.driverReports[0]?.displayOrder || 0;
};

/**
 * A function to check if a driver report is a system report.
 *
 * @param jwt - The JWT of the user.
 * @param organizationId - The ID of the organization.
 * @param id - The ID of the driver report to check.
 * @returns A Promise that resolves to true if the driver report is a system report, or false otherwise.
 */
export const checkIsSystemDriverReport = async (jwt: string, organizationId: number, id: number): Promise<boolean> => {
  const query = gql`
    query ($organizationId: Int!, $id: ID!) {
      driverReports(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, isSystem: { eq: true } }) {
        data {
          id
        }
      }
    }
  `;
  const { data } = await fetcher<DriverReportInfo[]>(jwt, query, {
    organizationId,
    id,
  });

  return data?.driverReports.length > 0;
};

/**
 * Create a new driver report and associated report details.
 * @param entity - An object containing driver report and report details data.
 * @returns A Promise that resolves to the ID of the created driver report, or undefined if there was an issue.
 */
export const createDriverReport = async (jwt: string, entity: DriverReportInputForm): Promise<number | undefined> => {
  const { organizationId, name, createdById, reportDetails, ...otherProps } = entity;
  const currentDate = new Date();

  const result = await prisma.$transaction(async (prisma) => {
    // Determine the display order for the new driver report based on the existing reports.
    const maxDisplayOrder = await getMaxDisplayOrderOfDriver(jwt, Number(organizationId));

    // Create DriverReport
    const createdReportResult = await prisma.driverReport.create({
      data: {
        ...otherProps,
        organizationId: Number(organizationId),
        name: ensureString(name),
        displayOrder: maxDisplayOrder + 1,
        publishedAt: currentDate,
      },
    });

    // Create DriverReport related data (created and updated information)
    await prisma.driverReportsCreatedByUserLinks.create({
      data: {
        driverReportId: createdReportResult.id,
        userId: Number(createdById),
      },
    });
    await prisma.driverReportsUpdatedByUserLinks.create({
      data: {
        driverReportId: createdReportResult.id,
        userId: Number(createdById),
      },
    });

    // Insert new DriverReportDetails
    const createdDetailResult: DriverReportDetailInfo[] = [];
    if (reportDetails && reportDetails.length > 0) {
      for (const item of reportDetails) {
        const result = await prisma.driverReportDetail.create({
          data: {
            organizationId: Number(organizationId),
            name: ensureString(item.name),
            description: item.description,
            displayOrder: item.displayOrder,
            publishedAt: currentDate,
          },
        });
        createdDetailResult.push(result as DriverReportDetailInfo);
      }
    }

    // Create DriverReportDetails related data
    if (createdDetailResult.length > 0) {
      await prisma.driverReportsReportDetailsLinks.createMany({
        data: createdDetailResult.map((item: DriverReportDetailInfo) => ({
          driverReportId: createdReportResult.id,
          driverReportDetailId: item.id,
          driverReportDetailOrder: Number(item.displayOrder),
        })),
      });
    }

    return createdReportResult.id;
  });

  return result;
};

/**
 * Update an existing driver report and associated report details.
 * @param entity - An object containing driver report and report details data.
 * @returns A Promise that resolves to the ID of the updated driver report, or undefined if there was an issue.
 */
export const updateDriverReport = async (entity: DriverReportInputForm): Promise<number | undefined> => {
  const { id, organizationId, name, updatedById, reportDetails, createdByUser: _, ...otherProps } = entity;

  const result = await prisma.$transaction(async (prisma) => {
    // Update DriverReport
    const updatedReportResult = await prisma.driverReport.update({
      where: {
        id: Number(id),
        organizationId,
      },
      data: {
        ...otherProps,
        name: ensureString(name),
      },
    });

    // Update DriverReport > Updated by user
    await prisma.driverReportsUpdatedByUserLinks.updateMany({
      where: {
        driverReportId: Number(id),
      },
      data: {
        userId: Number(updatedById),
      },
    });

    // Delete all DriveReportDetails and related data
    const currentReportDetails = await prisma.driverReportsReportDetailsLinks.findMany({
      where: {
        driverReportId: Number(id),
      },
    });
    const currentReportDetailsIds = currentReportDetails.map(({ driverReportDetailId }) => driverReportDetailId);
    await prisma.driverReportsReportDetailsLinks.deleteMany({
      where: {
        driverReportId: Number(id),
        driverReportDetailId: {
          in: currentReportDetailsIds,
        },
      },
    });
    await prisma.driverReportDetail.deleteMany({
      where: {
        id: {
          in: currentReportDetailsIds,
        },
      },
    });

    // Insert new DriverReportDetails
    const currentDate = new Date();
    const createdDetailResult: DriverReportDetailInfo[] = [];
    if (reportDetails && reportDetails.length > 0) {
      for (const item of reportDetails) {
        const result = await prisma.driverReportDetail.create({
          data: {
            name: ensureString(item.name),
            organizationId: Number(organizationId),
            description: item.description,
            displayOrder: item.displayOrder,
            publishedAt: currentDate,
          },
        });
        createdDetailResult.push(result as DriverReportDetailInfo);
      }
    }

    // Update DriverReportDetails related data
    if (createdDetailResult.length > 0) {
      await prisma.driverReportsReportDetailsLinks.createMany({
        data: createdDetailResult.map((item: DriverReportDetailInfo) => ({
          driverReportId: Number(id),
          driverReportDetailId: item.id,
          driverReportDetailOrder: Number(item.displayOrder),
        })),
      });
    }
    return updatedReportResult.id;
  });

  return result;
};

/**
 * Update the display order of multiple driver reports.
 *
 * @param entity - An array containing driver reports to update, organizationId, and userId.
 * @returns A Promise that resolves to a boolean indicating whether the update was successful.
 */
export const updateDisplayOrder = async (entity: UpdateDisplayOrderForm) => {
  const { driverReports, organizationId, updatedById } = entity;
  const driverReportIds = driverReports.map((item: DriverReportInputForm) => Number(item.id));

  const result = await prisma.$transaction([
    ...driverReports.map((item: DriverReportInputForm) =>
      prisma.driverReport.update({
        where: {
          id: item.id,
          organizationId,
        },
        data: {
          displayOrder: item.displayOrder,
        },
      })
    ),
    prisma.driverReportsUpdatedByUserLinks.updateMany({
      data: {
        userId: updatedById,
      },
      where: {
        driverReportId: {
          in: driverReportIds,
        },
      },
    }),
  ]);

  return result.length > 0;
};

/**
 * Create driver reports and their details based on initial organization values.
 *
 * @param {PrismaClientTransaction} prismaClient - The Prisma client used for database operations.
 * @param {number} userId - The ID of the user creating the driver reports.
 * @param {number} organizationId - The ID of the organization associated with the driver reports.
 */
export const initialDriverReportValues = async (
  prismaClient: PrismaClientTransaction,
  data: (Prisma.DriverReportCreateManyInput & {
    reportDetails: Prisma.DriverReportDetailCreateManyInput[];
  })[],
  userId: number
) => {
  const startImportTime = Date.now();
  const importDuration = ((Date.now() - startImportTime) / 1000).toFixed(2);

  // Insert one records within the transaction
  for (const item of data) {
    const { reportDetails, ...dataWithoutDetail } = item;
    const createDriveReport = await prismaClient.driverReport.create({
      data: dataWithoutDetail as Prisma.DriverReportCreateInput,
    });

    // Link driver reports with user
    await prismaClient.driverReportsCreatedByUserLinks.create({
      data: {
        driverReportId: createDriveReport.id,
        userId,
      },
    });
    await prismaClient.driverReportsUpdatedByUserLinks.create({
      data: {
        driverReportId: createDriveReport.id,
        userId,
      },
    });

    // Add driver report detail
    for (let i = 0; i < reportDetails.length; i++) {
      if (reportDetails[i].name) {
        const dataCreate = {
          ...(reportDetails[i] as Partial<Prisma.DriverReportDetailCreateInput>),
          createdAt: new Date(),
          updatedAt: new Date(),
          publishedAt: new Date(),
        };

        const createDriverReportDetail = await prismaClient.driverReportDetail.create({
          data: dataCreate as Prisma.DriverReportDetailCreateInput,
        });

        // Link driver reports detail with driver
        await prismaClient.driverReportsReportDetailsLinks.create({
          data: {
            driverReportId: createDriveReport.id,
            driverReportDetailId: createDriverReportDetail.id,
            driverReportDetailOrder: i,
          },
        });
      }
    }
  }

  logger.debug(`#initialDriveReport: Create success Driver report type: ${data.length} record in ${importDuration}s`);
};

/**
 * Retrieves information about an driver report by matching the provided organization ID and driver report type.
 *
 * @param jwt - The JSON Web Token for authentication.
 * @param organizationId - The ID of the organization to search within.
 * @param type - Driver report type to search.
 * @returns A promise that resolves to an driver report information object or undefined if not found.
 */
export const getDriverReportByType = async (
  jwt: string,
  organizationId: number,
  type: OrderTripStatusType
): Promise<DriverReportInfo | null> => {
  const query = gql`
    query ($organizationId: Int!, $type: String) {
      driverReports(filters: { organizationId: { eq: $organizationId }, type: { eq: $type } }) {
        data {
          id
          attributes {
            name
          }
        }
      }
    }
  `;

  const { data } = await fetcher<DriverReportInfo[]>(jwt, query, {
    organizationId,
    type,
  });

  return data.driverReports?.length > 0 ? data.driverReports[0] : null;
};

/**
 * Retrieves information about an driver report by matching the provided organization ID and driver report ID.
 * @param jwt - The JSON Web Token for authentication.
 * @param organizationId - The ID of the organization to search within.
 * @param type - Driver report types to search.
 * @returns A promise that resolves to an array of driver report information objects or an empty array if not found.
 */
export const getDriverReportsByTypes = async (
  jwt: string,
  organizationId: number,
  type: OrderTripStatusType[]
): Promise<DriverReportInfo[]> => {
  const query = gql`
    query ($organizationId: Int!, $type: [String]) {
      driverReports(
        filters: { organizationId: { eq: $organizationId }, type: { in: $type } }
        pagination: { limit: -1 }
      ) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<DriverReportInfo[]>(jwt, query, {
    organizationId,
    type,
  });

  return data.driverReports ?? [];
};
