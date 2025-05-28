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
export const initialOrganizationRoleValues = async (
  prismaClient: PrismaClientTransaction,
  data: Prisma.OrganizationRoleCreateManyInput[],
  userId: number
) => {
  const startImportTime = Date.now();
  const importDuration = ((Date.now() - startImportTime) / 1000).toFixed(2);

  // Insert many records within the transaction
  await prismaClient.organizationRole.createMany({
    data,
  });

  // get list id organization role by id organization id
  const listIdOrganizationRole = await prismaClient.organizationRole.findMany({
    where: {
      organizationId: data[0].organizationId,
    },
    select: {
      id: true,
    },
  });

  const formatListOrganizationRole = listIdOrganizationRole.map((item) => ({
    organizationRoleId: item.id,
    userId,
  }));

  //link user with organization role
  await prismaClient.organizationRolesCreatedByUserLinks.createMany({
    data: formatListOrganizationRole,
  });
  await prismaClient.organizationRolesUpdatedByUserLinks.createMany({
    data: formatListOrganizationRole,
  });

  logger.debug(
    `#initialOrganizationRoles: Create success Organization role: ${data.length} record in ${importDuration}s`
  );
};
