import { OrderStatusType } from "@prisma/client";
import { gql } from "graphql-request";

import { PrismaClientTransaction } from "@/configs/prisma";
import { OrderStatusInputForm } from "@/forms/orderStatus";
import { OrderStatusInfo } from "@/types/strapi";
import { fetcher } from "@/utils/graphql";
import { trim } from "@/utils/string";

/**
 * Creates a new order status record based on the provided entity data.
 *
 * @param prisma - The Prisma client for database access.
 * @param entity - The data for creating a new order status record, excluding the ID.
 * @returns A promise that resolves to the ID of the newly created order status record.
 */
export const createOrderStatus = async (prisma: PrismaClientTransaction, data: OrderStatusInputForm) => {
  const { organizationId, type, order, createdById } = trim(data);
  const userId = Number(createdById);
  const orderId = Number(order?.id);

  const createdOrderStatusResult = await prisma.orderStatus.create({
    data: { organizationId: Number(organizationId), type: type!, publishedAt: new Date() },
  });
  const orderStatusId = createdOrderStatusResult.id;
  await prisma.order.update({ where: { id: orderId }, data: { lastStatusType: type }, select: { id: true } });
  await prisma.orderStatusesCreatedByUserLinks.create({ data: { orderStatusId, userId } });
  await prisma.orderStatusesUpdatedByUserLinks.create({ data: { orderStatusId, userId } });

  return orderStatusId;
};

/**
 * Publishes an existing order.
 *
 * @param jwt - JSON Web Token for authentication.
 * @param entity - Partial order status object along with specific parameters for creation.
 * @returns A promise resolving to the result of the mutation (new order status data or error).
 */
export const createOrderStatusByGraphQL = async (
  jwt: string,
  entity: Partial<OrderStatusInfo>
): Promise<OrderStatusInfo> => {
  const processedEntity = trim(entity);
  const query = gql`
    mutation (
      $organizationId: Int
      $order: ID!
      $type: ENUM_ORDERSTATUS_TYPE
      $lastStatusType: ENUM_ORDER_LASTSTATUSTYPE
      $createdByUser: ID
      $publishedAt: DateTime
    ) {
      createOrderStatus(
        data: {
          organizationId: $organizationId
          type: $type
          order: $order
          createdByUser: $createdByUser
          updatedByUser: $createdByUser
          publishedAt: $publishedAt
        }
      ) {
        data {
          id
        }
      }
      updateOrder(
        id: $order
        data: {
          ${processedEntity.type === OrderStatusType.NEW ? "isDraft: false" : ""}
          lastStatusType: $lastStatusType
          updatedByUser: $createdByUser
          }
      ) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<OrderStatusInfo>(jwt, query, {
    organizationId: Number(processedEntity.organizationId),
    order: processedEntity.order?.id ? Number(processedEntity.order.id) : null,
    ...(processedEntity.type && { type: processedEntity.type, lastStatusType: processedEntity.type }),
    createdByUser: Number(processedEntity.createdById),
    publishedAt: new Date().toISOString(),
  });

  return data.createOrderStatus;
};
