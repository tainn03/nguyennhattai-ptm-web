import { Prisma } from "@prisma/client";

import { prisma, PrismaClientTransaction } from "@/configs/prisma";

import resourceOperationData from "./data.json";

/**
 * Import a resource record into the database using Prisma.
 *
 * @param prismaClient - The Prisma client instance with transaction support.
 * @param data - The Prisma.ResourceCreateInput representing the data to be imported.
 * @param userId - The logged in user id.
 * @returns - A Promise resolving to the ID of the successfully imported resource record.
 */
const importDataResource = async (
  prismaClient: PrismaClientTransaction,
  data: Prisma.ResourceCreateInput,
  userId: number
): Promise<number> => {
  const startTimeOfBatch = Date.now();
  const createResourceResult = await prismaClient.resource.create({
    data,
    select: { id: true },
  });

  // Link userId with createdBy and updatedBy user
  const createdOrUpdatedByUserData: Prisma.ResourcesCreatedByUserLinksCreateInput = {
    resourceId: createResourceResult.id,
    userId,
  };
  await prismaClient.resourcesCreatedByUserLinks.create({ data: createdOrUpdatedByUserData });
  await prismaClient.resourcesUpdatedByUserLinks.create({ data: createdOrUpdatedByUserData });

  const duration = ((Date.now() - startTimeOfBatch) / 1000).toFixed(2);
  console.log(`Imported resource 1 records in ${duration}s`);

  return createResourceResult.id;
};

/**
 * Import a batch of operation records into the database using Prisma.
 *
 * @param prismaClient - The Prisma client instance with transaction support.
 * @param data - An array of Prisma.OperationCreateInput representing the data to be imported.
 * @returns - A Promise resolving to the count of successfully imported operation records.
 */
const importDataOperation = async (
  prismaClient: PrismaClientTransaction,
  data: Prisma.OperationCreateInput[]
): Promise<number> => {
  const startTimeOfBatch = Date.now();

  const result = await prismaClient.operation.createMany({ data });

  const durationOperation = ((Date.now() - startTimeOfBatch) / 1000).toFixed(2);
  console.log(`Imported operation ${result.count} records in ${durationOperation}s`);

  return result.count;
};

/**
 * Main function for reading and importing resource operation to database.
 * @param userId - The logged in user id.
 */
const initialResourceOperation = async (userId: number) => {
  const startImportTime = Date.now();
  let count = resourceOperationData.length;

  await prisma.$transaction(
    async (prismaClient) => {
      for (const item of resourceOperationData) {
        const resourceFormat = {
          ...(item as Prisma.ResourceCreateInput),
          operations: item.operations,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          publishedAt: new Date(),
        };
        const { operations: _, ...resourceWithoutOperations } = resourceFormat;
        const resourceId = await importDataResource(prismaClient, resourceWithoutOperations, userId);

        const operationFormat = item.operations.map((item) => ({
          ...(item as Prisma.OperationCreateInput),
          resourceId,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          publishedAt: new Date(),
        }));
        const countOperation = await importDataOperation(prismaClient, operationFormat);

        // Link resources with operation
        const operationIds = await prismaClient.operation.findMany({
          where: {
            resourceId,
          },
          select: { id: true },
        });
        const formatResourcesOperationsLinks = operationIds.map((item, index) => ({
          operationId: item.id,
          operationOrder: index + 1,
          resourceId,
        }));
        await prismaClient.resourcesOperationsLinks.createMany({ data: formatResourcesOperationsLinks });

        // Link userId with createdBy and updatedBy user
        const createdOrUpdatedByUserData: Prisma.OperationsCreatedByUserLinksCreateInput[] = operationIds.map(
          (item) => ({
            operationId: item.id,
            userId,
          })
        );
        await prismaClient.operationsCreatedByUserLinks.createMany({ data: createdOrUpdatedByUserData });
        await prismaClient.operationsUpdatedByUserLinks.createMany({ data: createdOrUpdatedByUserData });

        count += countOperation;
      }
    },
    {
      maxWait: 10000, // default: 2000
      timeout: 30000, // default: 5000
    }
  );

  const importDuration = ((Date.now() - startImportTime) / 1000).toFixed(2);
  console.log(`[ResourceOperation] Total of records ${count} in ${importDuration}s`);

  return count;
};

export default initialResourceOperation;
