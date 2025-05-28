import { gql } from "graphql-request";
import isString from "lodash/isString";

import { PrismaClientTransaction } from "@/configs/prisma";
import { OrderItemInputForm } from "@/forms/orderItem";
import { OrderItemInfo } from "@/types/strapi";
import { fetcher } from "@/utils/graphql";
import { ensureString, trim } from "@/utils/string";

/**
 * Creates a new OrderItem record based on the provided entity data.
 *
 * @param prisma - The Prisma client for database access.
 * @param entity - The data for creating a new OrderItem record, excluding the ID.
 * @returns A promise that resolves to the ID of the newly created OrderItem record.
 */
export const createOrderItem = async (
  prisma: PrismaClientTransaction,
  entity: Partial<OrderItemInputForm>
): Promise<number> => {
  const { id: _, name, merchandiseType, ...otherEntities } = trim(entity);

  const createdOrderItemResult = await prisma.orderItem.create({
    data: { ...otherEntities, name: ensureString(name), publishedAt: new Date() },
  });
  const orderItemId = createdOrderItemResult.id;
  await prisma.orderItemsMerchandiseTypeLinks.create({
    data: { orderItemId, merchandiseTypeId: Number(merchandiseType?.id) },
  });

  return orderItemId;
};

/**
 * Creates a new OrderItem record with the provided data.
 *
 * @param jwt - The JSON Web Token for authentication.
 * @param entity - Partial OrderItem entity data.
 * @returns A promise that resolves to the created OrderItem or undefined.
 */
export const createOrderItemByGraphQL = async (jwt: string, entity: OrderItemInputForm): Promise<OrderItemInfo> => {
  const processedEntity = trim(entity);
  const query = gql`
    mutation (
      $organizationId: Int
      $name: String
      $order: ID
      $merchandiseType: ID
      $quantity: Float
      $unit: String
      $packageLength: Float
      $packageWidth: Float
      $packageHeight: Float
      $packageWeight: Float
      $notes: String
      $publishedAt: DateTime
    ) {
      createOrderItem(
        data: {
          organizationId: $organizationId
          order: $order
          name: $name
          merchandiseType: $merchandiseType
          quantity: $quantity
          unit: $unit
          packageLength: $packageLength
          packageWidth: $packageWidth
          packageHeight: $packageHeight
          packageWeight: $packageWeight
          notes: $notes
          publishedAt: $publishedAt
        }
      ) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<OrderItemInfo>(jwt, query, {
    ...(processedEntity.organizationId && { organizationId: Number(processedEntity.organizationId) }),
    ...(processedEntity.name && { name: processedEntity.name }),
    ...(processedEntity.order?.id && { order: processedEntity.order.id }),
    ...(processedEntity.merchandiseType && { merchandiseType: processedEntity.merchandiseType.id }),
    ...(processedEntity.quantity && { quantity: processedEntity.quantity }),
    ...(processedEntity.unit && { unit: processedEntity.unit }),
    ...(processedEntity.packageLength && { packageLength: processedEntity.packageLength }),
    ...(processedEntity.packageWidth && { packageWidth: processedEntity.packageWidth }),
    ...(processedEntity.packageHeight && { packageHeight: processedEntity.packageHeight }),
    ...(processedEntity.packageWeight && { packageWeight: processedEntity.packageWeight }),
    ...(processedEntity.notes && { notes: processedEntity.notes }),
    publishedAt: new Date().toISOString(),
  });

  return data.createOrderItem;
};

/**
 * Updates an OrderItem record based on the provided entity data.
 *
 * @param jwt - The JSON Web Token for authentication.
 * @param entity - The data for updating an OrderItem record.
 * @returns A promise that resolves to the ID of the updated OrderItem record.
 */
export const updateOrderItemByGraphQL = async (jwt: string, entity: OrderItemInputForm): Promise<OrderItemInfo> => {
  const { id, name, merchandiseType, quantity, packageLength, packageWidth, packageHeight, packageWeight, notes } =
    trim(entity);
  const query = gql`
    mutation (
      $id: ID!
      $organizationId: Int
      $name: String
      $order: ID
      $merchandiseType: ID
      $quantity: Float
      $packageLength: Float
      $packageWidth: Float
      $packageHeight: Float
      $packageWeight: Float
      $notes: String
    ) {
      updateOrderItem(
        id: $id
        data: {
          organizationId: $organizationId
          name: $name
          order: $order
          merchandiseType: $merchandiseType
          quantity: $quantity
          packageLength: $packageLength
          packageWidth: $packageWidth
          packageHeight: $packageHeight
          packageWeight: $packageWeight
          notes: $notes
        }
      ) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<OrderItemInfo>(jwt, query, {
    id,
    organizationId: entity.organizationId ?? null,
    name: name ?? null,
    merchandiseType: merchandiseType?.id ?? null,
    order: entity.order?.id ?? null,
    quantity: quantity ?? null,
    packageLength: packageLength ?? null,
    packageWidth: packageWidth ?? null,
    packageHeight: packageHeight ?? null,
    packageWeight: packageWeight ?? null,
    notes: notes ?? null,
  });

  return data.updateOrderItem;
};

/**
 * Upsert an OrderItem record based on the provided entity data.
 *
 * @param jwt - The JSON Web Token for authentication.
 * @param entity - The data for creating or updating an OrderItem record.
 * @returns A promise that resolves to the ID of the created or updated OrderItem record.
 */
export const upsertOrderItemByGraphQL = async (jwt: string, entity: OrderItemInputForm): Promise<OrderItemInfo> => {
  if (entity.id && isString(entity.id)) {
    return updateOrderItemByGraphQL(jwt, entity);
  }

  return createOrderItemByGraphQL(jwt, entity);
};
