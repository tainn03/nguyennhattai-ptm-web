import { gql } from "graphql-request";

import { PrismaClientTransaction } from "@/configs/prisma";
import { OrderParticipantInputForm } from "@/forms/orderParticipant";
import { OrderParticipantInfo } from "@/types/strapi";
import { fetcher } from "@/utils/graphql";
import { trim } from "@/utils/string";

/**
 * Checks if a order participant has been updated since a specified date.
 *
 * @param jwt - The JWT of the user making the request.
 * @param organizationId - The ID of the organization to which the order participant belongs.
 * @param id - The ID of the order participant to check.
 * @param lastUpdatedAt - The date to compare against the order participant's last updated timestamp.
 * @returns A promise that resolves to true if the order participant has been updated, otherwise false.
 */
export const checkOrderParticipantExclusives = async (
  jwt: string,
  organizationId: number,
  id: number,
  lastUpdatedAt: Date | string
): Promise<boolean> => {
  const query = gql`
    query ($id: ID!) {
      orderParticipants(filters: { id: { eq: $id }, publishedAt: { ne: null } }) {
        data {
          id
          attributes {
            updatedAt
          }
        }
      }
    }
  `;

  const { data } = await fetcher<OrderParticipantInfo[]>(jwt, query, {
    id,
    organizationId,
  });

  return data.orderParticipants[0].updatedAt !== lastUpdatedAt;
};

/**
 * Updates an existing order participant role record based on the provided entity data.
 *
 * @param prisma - The Prisma client for database access.
 * @param entity - The data for updating an existing order participant role record, including the ID.
 * @param prevCustomerType - The previous customer type of the order.
 * @returns A promise that resolves to the ID of the updated order participant role record.
 */
export const updateOrderParticipant = async (
  prisma: PrismaClientTransaction,
  entity: Partial<OrderParticipantInputForm>
): Promise<number> => {
  const { id, organizationId, role, updatedById } = entity;
  const userId = Number(updatedById);
  const orderParticipantId = Number(id);

  await prisma.orderParticipant.updateMany({
    where: { id: orderParticipantId, organizationId },
    data: { role },
  });

  await prisma.orderParticipantsUpdatedByUserLinks.updateMany({
    where: { orderParticipantId },
    data: { userId },
  });

  return orderParticipantId;
};

/**
 * Creates a new order participant role record based on the provided entity data.
 *
 * @param prisma - The Prisma client for database access.
 * @param entity - The data for creating a new order participant role record.
 * @returns A promise that resolves to the ID of the created order participant role record.
 */
export const createOrderParticipant = async (
  prisma: PrismaClientTransaction,
  entity: Partial<OrderParticipantInputForm>
): Promise<number> => {
  const { id: _, organizationId, role, user, orderId, orderParticipantOrder, createdById } = trim(entity);
  const userId = Number(user?.id);
  const createdUserId = Number(createdById);

  const createdParticipantResult = await prisma.orderParticipant.create({
    data: { organizationId: Number(organizationId), orderId: Number(orderId), role, publishedAt: new Date() },
  });
  const orderParticipantId = createdParticipantResult.id;

  await prisma.ordersParticipantsLinks.create({
    data: { orderParticipantId, orderId: Number(orderId), orderParticipantOrder: Number(orderParticipantOrder) },
  });
  await prisma.orderParticipantsUserLinks.create({ data: { orderParticipantId, userId } });
  await prisma.orderParticipantsCreatedByUserLinks.create({ data: { orderParticipantId, userId: createdUserId } });
  await prisma.orderParticipantsUpdatedByUserLinks.create({ data: { orderParticipantId, userId: createdUserId } });

  return orderParticipantId;
};

/**
 * Updates an existing order participant role record based on the provided entity data.
 *
 * @param jwt - The JSON Web Token for authentication.
 * @param entity - The data for updating an existing order participant role record, including the ID.
 * @returns A promise that resolves to the ID of the updated order participant role record.
 */
export const createOrderParticipantByGraphQL = async (
  jwt: string,
  entity: OrderParticipantInputForm
): Promise<OrderParticipantInfo> => {
  const processedEntity = trim(entity);
  const query = gql`
    mutation (
      $organizationId: Int
      $role: ENUM_ORDERPARTICIPANT_ROLE
      $user: ID
      $orderId: Int
      $createdByUser: ID
      $publishedAt: DateTime
    ) {
      createOrderParticipant(
        data: {
          organizationId: $organizationId
          role: $role
          user: $user
          orderId: $orderId
          createdByUser: $createdByUser
          updatedByUser: $createdByUser
          publishedAt: $publishedAt
        }
      ) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<OrderParticipantInfo>(jwt, query, {
    ...(processedEntity.organizationId && { organizationId: Number(processedEntity.organizationId) }),
    ...(processedEntity.role && { role: processedEntity.role }),
    ...(processedEntity.user?.id && { user: Number(processedEntity.user.id) }),
    ...(processedEntity.orderId && { orderId: Number(processedEntity.orderId) }),
    createdByUser: Number(processedEntity.createdById),
    publishedAt: new Date().toISOString(),
  });

  return data.createOrderParticipant;
};

/**
 * Updates an existing order participant role record based on the provided entity data.
 *
 * @param jwt - The JSON Web Token for authentication.
 * @param entity - The data for updating an existing order participant role record, including the ID.
 * @returns A promise that resolves to the ID of the updated order participant role record.
 */
export const updateOrderParticipantByGraphQL = async (
  jwt: string,
  entity: OrderParticipantInputForm
): Promise<OrderParticipantInfo> => {
  const { organizationId, id, role, user, orderId, updatedById } = trim(entity);
  const query = gql`
    mutation (
      $id: ID!
      $organizationId: Int
      $role: ENUM_ORDERPARTICIPANT_ROLE
      $user: ID
      $orderId: Int
      $updatedByUser: ID
    ) {
      updateOrderParticipant(
        id: $id
        data: {
          role: $role
          organizationId: $organizationId
          user: $user
          orderId: $orderId
          updatedByUser: $updatedByUser
        }
      ) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<OrderParticipantInfo>(jwt, query, {
    id,
    organizationId: organizationId ?? null,
    role: role ?? null,
    user: user ? Number(user.id) : null,
    orderId: orderId ?? null,
    updatedByUser: updatedById ? Number(updatedById) : null,
  });

  return data.updateOrderParticipant;
};

/**
 * Upsert an order participant role record based on the provided entity data.
 *
 * @param jwt - The JSON Web Token for authentication.
 * @param entity - The data for creating or updating an order participant role record.
 * @returns A promise that resolves to the created or updated order participant role record.
 */
export const upsertOrderParticipantByGraphQL = async (
  jwt: string,
  entity: OrderParticipantInputForm
): Promise<OrderParticipantInfo> => {
  if (entity.id) {
    return updateOrderParticipantByGraphQL(jwt, entity);
  }

  return createOrderParticipantByGraphQL(jwt, entity);
};

/**
 * Fetches a list of order participants based on the provided filters.
 *
 * @param jwt - The JSON Web Token for authentication.
 * @param filters - The filters to apply to the query.
 * @returns A promise that resolves to an array of order participants.
 */
export const getOrderParticipantByOrderId = async (
  jwt: string,
  filters: Pick<OrderParticipantInputForm, "organizationId" | "orderId">
): Promise<OrderParticipantInfo[]> => {
  const query = gql`
    query ($organizationId: Int, $orderId: Int) {
      orderParticipants(
        pagination: { limit: -1 }
        filters: { organizationId: { eq: $organizationId }, orderId: { eq: $orderId } }
      ) {
        data {
          id
          attributes {
            role
            user {
              data {
                id
              }
            }
          }
        }
      }
    }
  `;

  const { data } = await fetcher<OrderParticipantInfo[]>(jwt, query, filters);

  return data.orderParticipants;
};
