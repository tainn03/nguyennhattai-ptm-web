import { HttpStatusCode } from "axios";
import { gql } from "graphql-request";

import { ErrorType } from "@/types";
import { MutationResult } from "@/types/graphql";
import { UserSettingInfo } from "@/types/strapi";
import { graphQLPost } from "@/utils/api";

/**
 * Update last notify time of current user setting.
 *
 * @param {Pick<UserSettingInfo, "id" | "lastNotificationSentAt">} entity - The user setting entity to update.
 * @returns {Promise<UserSettingInfo | ErrorType>} A promise that resolves to the updated user setting or an error type.
 */
export const updateLastNotificationSentAt = async (
  entity: Pick<Partial<UserSettingInfo>, "id" | "lastNotificationSentAt">
): Promise<MutationResult<UserSettingInfo>> => {
  const { id, lastNotificationSentAt } = entity;

  const { status, data } = await graphQLPost<UserSettingInfo>({
    query: gql`
      mutation ($id: ID!, $lastNotificationSentAt: DateTime) {
        updateUserSetting(id: $id, data: { lastNotificationSentAt: $lastNotificationSentAt }) {
          data {
            id
          }
        }
      }
    `,
    params: {
      id,
      lastNotificationSentAt,
    },
  });

  if (status === HttpStatusCode.Ok && data) {
    return { data: data.updateUserSetting };
  }

  return { error: ErrorType.UNKNOWN };
};
