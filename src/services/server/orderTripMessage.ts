import { gql } from "graphql-request";

import { PrismaClientTransaction } from "@/configs/prisma";
import { ORDER_TRIP_MESSAGE_RELATED_TYPE } from "@/constants/relatedType";
import { OrderTripMessageInputForm } from "@/forms/orderTripMessage";
import { OrderTripMessageInfo } from "@/types/strapi";
import { fetcher } from "@/utils/graphql";

/**
 * Create a new organization tripMessage using a GraphQL mutation.
 *
 * @param jwt - The JSON Web Token for authentication.
 * @param tripMessage - Information about the organization tripMessage to be created.
 * @returns - Information about the newly created organization tripMessage, or undefined if the creation fails.
 */
export const createOrderTripMessage = async (
  prisma: PrismaClientTransaction,
  tripMessage: OrderTripMessageInputForm,
  fileIds: number[],
  jwt: string
): Promise<number> => {
  const { organizationId, tripId, createdById, message, longitude, latitude, type } = tripMessage;
  const userId = Number(createdById);

  const createdOrderTripMessageResult = await prisma.orderTripMessage.create({
    data: {
      type,
      ...(message && { message }),
      longitude,
      latitude,
      publishedAt: new Date(),
      organizationId: Number(organizationId),
    },
  });

  const orderTripMessageId = createdOrderTripMessageResult.id;

  if (fileIds && fileIds.length > 0) {
    for (const [index, fileId] of fileIds.entries()) {
      await prisma.filesRelatedMorphs.create({
        data: {
          fileId: Number(fileId),
          relatedId: orderTripMessageId,
          relatedType: ORDER_TRIP_MESSAGE_RELATED_TYPE,
          field: "attachments",
          order: index,
        },
      });
    }
  }

  const orderTripMessagesId = await getOrderTripMessagesByTripId(jwt, Number(organizationId), Number(tripId));

  await prisma.orderTripMessageTripLinks.create({
    data: { orderTripMessageId, orderTripId: Number(tripId), orderTripMessageOrder: orderTripMessagesId.length + 1 },
  });
  await prisma.orderTripMessageCreatedByUserLinks.create({ data: { orderTripMessageId, userId } });
  await prisma.orderTripMessageUpdatedByUserLinks.create({ data: { orderTripMessageId, userId } });
  await prisma.orderTripMessagesReadByUsersLinks.create({ data: { userId, orderTripMessageId } });

  return orderTripMessageId;
};

/**
 * Retrieves information about an order trip message by matching the provided organization ID and user ID.
 *
 * @param jwt - The JSON Web Token for authentication.
 * @param organizationId - The ID of the organization to search within.
 * @param userId - The ID of the user to search for within the organization.
 * @returns A promise that resolves to an order trip message information object or undefined if not found.
 */
export const getOrderTripMessagesByTripId = async (
  jwt: string,
  organizationId: number,
  tripId: number
): Promise<OrderTripMessageInfo[]> => {
  const query = gql`
    query ($organizationId: Int!, $tripId: ID) {
      orderTripMessages(filters: { organizationId: { eq: $organizationId }, trip: { id: { eq: $tripId } } }) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<OrderTripMessageInfo[]>(jwt, query, {
    organizationId,
    tripId,
  });

  return data.orderTripMessages;
};
