import { HttpStatusCode } from "axios";
import { gql } from "graphql-request";

import { OrderTripMessageInputForm } from "@/forms/orderTripMessage";
import { ErrorType } from "@/types";
import { MutationResult } from "@/types/graphql";
import { OrderTripMessageInfo } from "@/types/strapi";
import { graphQLPost } from "@/utils/api";

/**
 * Create a new organization tripMessage using a GraphQL mutation.
 *
 * @param jwt - The JSON Web Token for authentication.
 * @param tripMessage - Information about the organization tripMessage to be created.
 * @returns - Information about the newly created organization tripMessage, or undefined if the creation fails.
 */
export const createOrderTripMessage = async (
  tripMessage: OrderTripMessageInputForm,
  fileIds: number[]
): Promise<MutationResult<OrderTripMessageInfo>> => {
  const { message, organizationId, tripId, type, createdById } = tripMessage;

  const result = await graphQLPost<OrderTripMessageInfo>({
    query: gql`
      mutation (
        ${message ? "$message: String" : ""}
        $organizationId: Int
        $createdByUserId: ID!
        $publishedAt: DateTime
        $tripId: ID!
        ${type ? "$type: ENUM_ORDERTRIPMESSAGE_TYPE" : ""}
        $fileIds: [ID]
      ) {
        createOrderTripMessage(
          data: {
            ${message ? "message: $message" : ""}
            attachments: $fileIds
            organizationId: $organizationId
            createdByUser: $createdByUserId
            updatedByUser: $createdByUserId
            publishedAt: $publishedAt
            trip: $tripId
            ${type ? "type: $type" : ""}
          }
        ) {
          data {
            id
          }
        }
      }
    `,
    params: {
      ...(message && { message }),
      organizationId,
      tripId,
      ...(type && { type }),
      createdByUserId: createdById,
      publishedAt: new Date(),
      fileIds,
    },
  });

  if (result.status === HttpStatusCode.Ok && result.data) {
    return { data: result.data.id };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * Update read users of order trip message using a GraphQL mutation.
 *
 * @param tripMessage - Information about the organization tripMessage to be updated.
 * @param readByUserIds - The list read user id.
 * @returns -Id of order trip message updated or undefined if the update fails.
 */
export const updateUsersReadMessage = async (tripMessage: Partial<OrderTripMessageInfo>, readByUserIds: number[]) => {
  const { id, updatedByUser } = tripMessage;

  const result = await graphQLPost<OrderTripMessageInfo>({
    query: gql`
      mutation ($id: ID!, $updatedById: ID!, $readByUserIds: [ID]) {
        updateOrderTripMessage(id: $id, data: { readByUsers: $readByUserIds, updatedByUser: $updatedById }) {
          data {
            id
          }
        }
      }
    `,
    params: {
      id,
      updatedById: Number(updatedByUser?.id),
      readByUserIds,
    },
  });

  return result?.data?.updateOrderTripMessage?.id;
};
