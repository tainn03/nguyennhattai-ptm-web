import { Prisma } from "@prisma/client";
import { gql } from "graphql-request";

import { prisma, PrismaClientTransaction } from "@/configs/prisma";
import { DriverExpenseInputForm, UpdateDisplayOrderDriverExpenseForm } from "@/forms/driverExpense";
import { DriverExpenseInfo } from "@/types/strapi";
import { fetcher } from "@/utils/graphql";
import logger from "@/utils/logger";

/**
 * Fetches a list of driver expenses based on the provided filters.
 *
 * @param {Partial<DriverExpenseInfo>} params - Additional parameters to filter the driver expenses.
 * @returns {Promise<DriverExpenseInfo[]>} A promise that resolves to an array of driver expense information.
 */
export const getDriverExpenses = async (
  jwt: string,
  params: Partial<DriverExpenseInfo>
): Promise<DriverExpenseInfo[]> => {
  const query = gql`
    query ($organizationId: Int!) {
      driverExpenses(
        pagination: { limit: -1 }
        sort: "displayOrder:asc"
        filters: { organizationId: { eq: $organizationId }, isActive: { eq: true }, publishedAt: { ne: null } }
      ) {
        data {
          id
          attributes {
            name
            key
            type
            isSystem
          }
        }
      }
    }
  `;

  const { data } = await fetcher<DriverExpenseInfo[]>(jwt, query, params);
  return data?.driverExpenses ?? [];
};

/**
 * Update the display order of multiple driver expenses.
 *
 * @param entity - An array containing driver expenses to update, organizationId, and userId.
 * @returns A Promise that resolves to a boolean indicating whether the update was successful.
 */
export const updateDisplayOrderDriverExpense = async (entity: UpdateDisplayOrderDriverExpenseForm) => {
  const { driverExpenses, organizationId, updatedById } = entity;
  const driverExpenseIds = driverExpenses.map((item: DriverExpenseInputForm) => Number(item.id));

  const result = await prisma.$transaction([
    ...driverExpenses.map((item: DriverExpenseInputForm) =>
      prisma.driverExpense.update({
        where: {
          id: item.id,
          organizationId,
        },
        data: {
          displayOrder: item.displayOrder,
        },
      })
    ),
    prisma.driverExpensesUpdatedByUserLinks.updateMany({
      data: {
        userId: updatedById,
      },
      where: {
        driverExpenseId: {
          in: driverExpenseIds,
        },
      },
    }),
  ]);

  return result.length > 0;
};

/**
 * Create driver expenses and their details based on initial organization values.
 *
 * @param {PrismaClientTransaction} prismaClient - The Prisma client used for database operations.
 * @param {number} userId - The ID of the user creating the driver expenses.
 * @param {number} organizationId - The ID of the organization associated with the driver expenses.
 */
export const initialDriverExpenseValues = async (
  prismaClient: PrismaClientTransaction,
  data: Prisma.DriverExpenseCreateManyInput[],
  userId: number
) => {
  const startImportTime = Date.now();
  const importDuration = ((Date.now() - startImportTime) / 1000).toFixed(2);

  // Insert one records within the transaction
  for (const item of data) {
    const createDriveExpense = await prismaClient.driverExpense.create({
      data: item as Prisma.DriverExpenseCreateInput,
    });

    // Link driver expenses with user
    await prismaClient.driverExpensesCreatedByUserLinks.create({
      data: {
        driverExpenseId: createDriveExpense.id,
        userId,
      },
    });
    await prismaClient.driverExpensesUpdatedByUserLinks.create({
      data: {
        driverExpenseId: createDriveExpense.id,
        userId,
      },
    });
  }

  logger.debug(`#initialDriveExpense: Create success Driver expense type: ${data.length} record in ${importDuration}s`);
};
