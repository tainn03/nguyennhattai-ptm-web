import { Prisma } from "@prisma/client";

import { prisma } from "@/configs/prisma";

import organizationInitialValues from "./data.json";

/**
 * Import data into the database from an array of input data.
 *
 * @param data An array of input data containing records to be imported into the database.
 * @param userId - The logged in user id.
 * @returns The total number of records successfully imported into the database.
 */
const importData = async (data: Prisma.OrganizationInitialValueCreateInput[], userId: number): Promise<number> => {
  const startTimeOfBatch = Date.now();
  return await prisma.$transaction(
    async (prismaClient) => {
      const result = await prismaClient.organizationInitialValue.createMany({ data });

      // Link userId with createdBy and updatedBy user
      const ids = await prismaClient.organizationInitialValue.findMany({
        select: { id: true },
      });
      const createdOrUpdatedByUserData: Prisma.OrganizationInitialValuesCreatedByUserLinksCreateInput[] = ids.map(
        (item) => ({
          organizationInitialValueId: item.id,
          userId,
        })
      );
      await prismaClient.organizationInitialValuesCreatedByUserLinks.createMany({ data: createdOrUpdatedByUserData });
      await prismaClient.organizationInitialValuesUpdatedByUserLinks.createMany({ data: createdOrUpdatedByUserData });

      const duration = ((Date.now() - startTimeOfBatch) / 1000).toFixed(2);
      console.log(`Imported ${result.count} records in ${duration}s`);

      return result.count;
    },
    {
      maxWait: 5000, // default: 2000
      timeout: 10000, // default: 5000
    }
  );
};

/**
 * Main function for reading and importing administrative unit data from an Excel file.
 * @param userId - The logged in user id.
 */
const initialOrganizationInitialValue = async (userId: number) => {
  // format data
  const formatValues = organizationInitialValues.map((item) => ({
    ...(item as Prisma.OrganizationInitialValueCreateInput),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedAt: new Date(),
  }));

  // Import data into MySQL
  const startImportTime = Date.now();
  const count = await importData(formatValues, userId);
  const importDuration = ((Date.now() - startImportTime) / 1000).toFixed(2);
  console.log(`[OrganizationInitialValue] Total of records ${count} in ${importDuration}s`);

  return count;
};

export default initialOrganizationInitialValue;
