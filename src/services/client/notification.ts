import { HttpStatusCode } from "axios";
import { gql } from "graphql-request";

import { ErrorType } from "@/types";
import { MutationResult } from "@/types/graphql";
import { NotificationInfo } from "@/types/strapi";
import { graphQLPost } from "@/utils/api";

/**
 * Deletes a notification by setting its 'publishedAt' attribute to null using a GraphQL mutation.
 *
 * @param {number} id - The ID of the notification to be deleted.
 * @returns {Promise<MutationResult<NotificationInfo>>} A promise that resolves to the result of the mutation.
 */
export const deleteNotification = async (id: number): Promise<MutationResult<NotificationInfo>> => {
  const { status, data } = await graphQLPost<NotificationInfo>({
    query: gql`
      mutation ($id: ID!) {
        updateNotification(id: $id, data: { publishedAt: null }) {
          data {
            id
          }
        }
      }
    `,
    params: {
      id,
    },
  });

  if (status === HttpStatusCode.Ok && data) {
    return { data: data.updateNotification };
  }

  return { error: ErrorType.UNKNOWN };
};
