import { HttpStatusCode } from "axios";
import { gql } from "graphql-request";

import { OrderItemInputForm } from "@/forms/orderItem";
import { ErrorType } from "@/types";
import { MutationResult } from "@/types/graphql";
import { OrderInfo, OrderItemInfo } from "@/types/strapi";
import { graphQLPost } from "@/utils/api";
import { trim } from "@/utils/string";

import { checkOrderExclusives } from "./order";

/**
 * Create a new order item.
 *
 * @param entity - Partial data for the new order item, including details like order ID, name, merchandise type ID, package dimensions, quantity, notes, and publication date.
 * @returns - The result of the order item creation.
 */
export const createOrderItem = async (entity: Partial<OrderItemInputForm>): Promise<MutationResult<OrderItemInfo>> => {
  const {
    orderId,
    name,
    merchandiseTypeId,
    packageWeight,
    packageLength,
    packageWidth,
    packageHeight,
    quantity,
    unit,
    notes,
    updatedByUser,
  } = trim(entity);

  const query = gql`
    mutation (
      $orderId: ID!
      $name: String!
      $merchandiseTypeId: ID
      $packageWeight: Float
      $packageLength: Float
      $packageWidth: Float
      $packageHeight: Float
      $quantity: Float
      $unit: String
      $notes: String
      $publishedAt: DateTime
      $updatedByUser: ID
    ) {
      createOrderItem(
        data: {
          order: $orderId
          name: $name
          merchandiseType: $merchandiseTypeId
          packageWeight: $packageWeight
          packageLength: $packageLength
          packageWidth: $packageWidth
          packageHeight: $packageHeight
          quantity: $quantity
          unit: $unit
          notes: $notes
          publishedAt: $publishedAt
        }
      ) {
        data {
          id
        }
      }
      updateOrder(id: $orderId, data: { updatedByUser: $updatedByUser }) {
        data {
          id
        }
      }
    }
  `;

  const { status, data } = await graphQLPost<OrderItemInfo>({
    query,
    params: {
      orderId,
      name,
      ...(merchandiseTypeId && { merchandiseTypeId }),
      ...(packageWeight && { packageWeight }),
      ...(packageLength && { packageLength }),
      ...(packageWidth && { packageWidth }),
      ...(packageHeight && { packageHeight }),
      ...(quantity && { quantity }),
      ...(unit && { unit }),
      ...(notes && { notes }),
      updatedByUser,
      publishedAt: new Date(),
    },
  });

  if (status === HttpStatusCode.Ok && data) {
    return { data: data.createOrderItem };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * Update an existing order item with new information.
 *
 * @param entity - Partial data for the updated order item, including details like ID, name, merchandise type ID, package dimensions, quantity, and notes.
 * @returns - The result of the order item update.
 */
export const updateOrderItem = async (entity: Partial<OrderItemInputForm>): Promise<MutationResult<OrderItemInfo>> => {
  const {
    id,
    name,
    orderId,
    merchandiseTypeId,
    packageWeight,
    packageLength,
    packageWidth,
    packageHeight,
    quantity,
    unit,
    notes,
    updatedByUser,
  } = trim(entity);

  const query = gql`
    mutation (
      $id: ID!
      $orderId: ID!
      $name: String!
      $merchandiseTypeId: ID
      $packageWeight: Float
      $packageLength: Float
      $packageWidth: Float
      $packageHeight: Float
      $quantity: Float
      $unit: String
      $notes: String
      $updatedByUser: ID
    ) {
      updateOrderItem(
        id: $id
        data: {
          name: $name
          merchandiseType: $merchandiseTypeId
          packageWeight: $packageWeight
          packageLength: $packageLength
          packageWidth: $packageWidth
          packageHeight: $packageHeight
          quantity: $quantity
          unit: $unit
          notes: $notes
        }
      ) {
        data {
          id
        }
      }
      updateOrder(id: $orderId, data: { updatedByUser: $updatedByUser }) {
        data {
          id
        }
      }
    }
  `;

  const { status, data } = await graphQLPost<OrderItemInfo>({
    query,
    params: {
      id,
      orderId,
      name,
      merchandiseTypeId,
      packageWeight,
      packageLength,
      packageWidth,
      packageHeight,
      quantity,
      unit,
      notes,
      updatedByUser,
    },
  });

  if (status === HttpStatusCode.Ok && data) {
    return { data: data.updateOrderItem };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * Delete an order item by setting its publication date to null, effectively hiding it.
 *
 * @param entity - Information about the order item to be deleted, including its ID.
 * @param lastUpdatedAt - The last updated date of the order item.
 * @returns - The result of the order item deletion.
 */
export const deleteOrderItem = async (
  entity: Pick<OrderItemInputForm, "id" | "orgId" | "orderId" | "updatedByUser">,
  lastUpdatedAt?: Date | string
): Promise<MutationResult<OrderInfo>> => {
  const { id, orgId, orderId, updatedByUser } = entity;

  if (lastUpdatedAt) {
    const isErrorExclusives = await checkOrderExclusives(Number(orgId), Number(orderId), lastUpdatedAt);
    if (isErrorExclusives) {
      return { error: ErrorType.EXCLUSIVE };
    }
  }

  const { status, data } = await graphQLPost<OrderInfo>({
    query: gql`
      mutation ($id: ID!, $orderId: ID!, $updatedByUser: ID) {
        updateOrderItem(id: $id, data: { publishedAt: null }) {
          data {
            id
          }
        }
        updateOrder(id: $orderId, data: { updatedByUser: $updatedByUser }) {
          data {
            id
          }
        }
      }
    `,
    params: {
      id,
      orgId,
      orderId,
      updatedByUser,
    },
  });

  if (status === HttpStatusCode.Ok && data) {
    return { data: data.updateOrder };
  }

  return { error: ErrorType.UNKNOWN };
};
