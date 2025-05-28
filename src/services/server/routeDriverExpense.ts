import { PrismaClientTransaction } from "@/configs/prisma";
import { RouteDriverExpenseInfo } from "@/types/strapi";
import { trim } from "@/utils/string";

/**
 * Creates a new route driver expense.
 * @param {PrismaClientTransaction} prisma - The Prisma client transaction instance.
 * @param {Partial<RouteDriverExpenseInfo>} entity - Partial information of the route driver expense.
 * @returns {Promise<number>} A promise resolving to the ID of the created route driver expense.
 */
export const createRouteDriverExpense = async (
  prisma: PrismaClientTransaction,
  entity: Partial<RouteDriverExpenseInfo>
): Promise<number> => {
  const { organizationId, amount } = trim(entity);
  const createdRouteDriverExpense = await prisma.routeDriverExpense.create({
    data: {
      organizationId: Number(organizationId),
      amount: Number(amount),
      publishedAt: new Date(),
    },
  });
  return createdRouteDriverExpense.id;
};

/**
 * Updates an existing route driver expense.
 * @param {PrismaClientTransaction} prisma - The Prisma client transaction instance.
 * @param {Partial<RouteDriverExpenseInfo>} entity - Partial information of the route driver expense.
 * @returns {Promise<number>} A promise resolving to the ID of the updated route driver expense.
 */
export const updateRouteDriverExpense = async (
  prisma: PrismaClientTransaction,
  entity: Partial<RouteDriverExpenseInfo>
): Promise<number> => {
  const { id, organizationId, amount } = trim(entity);
  const updatedRouteDriverExpense = await prisma.routeDriverExpense.upsert({
    where: { id: id ? Number(id) : -1 },
    update: {
      amount: Number(amount),
    },
    create: {
      organizationId: Number(organizationId),
      amount: Number(amount),
      publishedAt: new Date(),
    },
    select: { id: true },
  });
  return updatedRouteDriverExpense.id;
};
