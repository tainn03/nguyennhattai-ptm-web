import { gql } from "graphql-request";

import { ErrorType } from "@/types";
import { HttpStatusCode } from "@/types/api";
import { MutationResult } from "@/types/graphql";
import { OrderParticipantInfo } from "@/types/strapi";
import { graphQLPost } from "@/utils/api";

/**
 * Checks if a order participant has been updated since a specified date.
 *
 * @param organizationId - The ID of the organization to which the order participant belongs.
 * @param id - The ID of the order participant to check.
 * @param lastUpdatedAt - The date to compare against the order participant's last updated timestamp.
 * @returns A promise that resolves to true if the order participant has been updated, otherwise false.
 */
export const checkOrderParticipantExclusives = async (
  organizationId: number,
  id: number,
  lastUpdatedAt: Date | string
): Promise<boolean> => {
  const { data } = await graphQLPost<OrderParticipantInfo[]>({
    query: gql`
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
    `,
    params: {
      organizationId,
      id,
    },
  });
  return data?.orderParticipants[0].updatedAt !== lastUpdatedAt;
};
/**
 * Delete a order participant based on the provided entity data.
 *
 * @param entity - The entity containing organizationId, id, and updatedById.
 * @param lastUpdatedAt - An optional parameter to check for exclusivity based on the last updated timestamp.
 * @returns A Promise that resolves to a MutationResult containing the result of the deletion operation.
 */
export const deleteOrderParticipant = async (
  entity: Pick<OrderParticipantInfo, "organizationId" | "id" | "updatedById">,
  lastUpdatedAt?: Date | string
): Promise<MutationResult<OrderParticipantInfo>> => {
  const { organizationId, id, updatedById } = entity;

  // Check for exclusivity if lastUpdatedAt is provided
  if (lastUpdatedAt) {
    const isErrorExclusives = await checkOrderParticipantExclusives(organizationId, id, lastUpdatedAt);
    if (isErrorExclusives) {
      return { error: ErrorType.EXCLUSIVE };
    }
  }

  const { status, data } = await graphQLPost<OrderParticipantInfo>({
    query: gql`
      mutation ($id: ID!, $updatedById: ID!) {
        updateOrderParticipant(id: $id, data: { publishedAt: null, updatedByUser: $updatedById }) {
          data {
            id
          }
        }
      }
    `,
    params: {
      id,
      updatedById,
    },
  });

  if (status === HttpStatusCode.Ok && data) {
    return { data: data.updateOrderParticipant };
  }

  return { error: ErrorType.UNKNOWN };
};
