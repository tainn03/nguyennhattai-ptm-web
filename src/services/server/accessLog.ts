import { AccessLogType } from "@prisma/client";
import { gql } from "graphql-request";

import { STRAPI_TOKEN_KEY } from "@/configs/environment";
import { AccessLogInfo } from "@/types/strapi";
import { fetcher } from "@/utils/graphql";

/**
 * Asynchronously creates an access log entry in a database using a GraphQL mutation.
 *
 * @param {Partial<AccessLogInfo>} params - A partial object of AccessLogInfo containing the access log details to be recorded.
 * @returns {Promise<AccessLogInfo | undefined | null>} - A promise that resolves to the newly created AccessLogInfo object if successful,
 *                                                        or undefined or null if the creation fails.
 */
export const createAccessLog = async (params: Partial<AccessLogInfo>): Promise<AccessLogInfo | undefined | null> => {
  const query = gql`
    mutation (
      $type: ENUM_ACCESSLOG_TYPE
      $targetId: Int
      $timestamp: DateTime
      $referrerUrl: String
      $ipAddress: String
      $userAgent: String
      $deviceType: String
      $os: String
      $browser: String
      $publishedAt: DateTime
    ) {
      createAccessLog(
        data: {
          type: $type
          targetId: $targetId
          timestamp: $timestamp
          referrerUrl: $referrerUrl
          ipAddress: $ipAddress
          userAgent: $userAgent
          deviceType: $deviceType
          os: $os
          browser: $browser
          publishedAt: $publishedAt
        }
      ) {
        data {
          id
        }
      }
    }
  `;
  const result = await fetcher<AccessLogInfo[]>(STRAPI_TOKEN_KEY, query, {
    ...params,
    type: AccessLogType.ORDER,
    publishedAt: new Date(),
  });
  return result.data?.createAccessLogs[0] || null;
};
