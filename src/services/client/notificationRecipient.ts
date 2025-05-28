import { gql } from "graphql-request";

import { NOTIFICATION_PAGE_SIZE } from "@/constants/notification";
import { FilterRequest } from "@/types/filter";
import { NotificationRecipientInfo } from "@/types/strapi";
import { graphQLPost } from "@/utils/api";

/**
 * Fetches notification recipients based on specified filters and pagination parameters.
 *
 * @param {[string, FilterRequest<NotificationRecipientInfo>]} param - A tuple containing the organizationId and filter parameters.
 * @returns {Promise<NotificationRecipientInfo[]>} A promise that resolves to an array of notification recipients.
 */
export const notificationRecipientsFetcher = async ([_, params]: [
  string,
  FilterRequest<NotificationRecipientInfo>,
]) => {
  const { notification, user, page, pageSize } = params;
  if (!notification?.organizationId) {
    return null;
  }

  const query = gql`
    query ($organizationId: Int, $userId: ID, $page: Int, $pageSize: Int) {
      notificationRecipients(
        filters: {
          user: { id: { eq: $userId } }
          notification: { organizationId: { eq: $organizationId }, publishedAt: { ne: null } }
          publishedAt: { ne: null }
        }
        sort: ["notification.createdAt:desc"]
        pagination: { page: $page, pageSize: $pageSize }
      ) {
        data {
          id
          attributes {
            notification {
              data {
                id
                attributes {
                  type
                  subject
                  message
                  meta
                  targetId
                  createdAt
                  createdByUser {
                    data {
                      attributes {
                        detail {
                          data {
                            attributes {
                              firstName
                              lastName
                              avatar {
                                data {
                                  attributes {
                                    url
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
            isRead
            readAt
          }
        }
      }
    }
  `;

  const { data } = await graphQLPost<NotificationRecipientInfo[]>({
    query,
    params: {
      organizationId: notification?.organizationId,
      userId: user?.id,
      page: page || 1,
      pageSize: pageSize || NOTIFICATION_PAGE_SIZE,
    },
  });

  return data?.notificationRecipients || [];
};

/**
 * Fetches the count of unread notifications for a specific user in a given organization.
 *
 * @param {[string, Partial<NotificationRecipientInfo>]} param - A tuple containing the organizationId and user information.
 * @returns {Promise<number>} A promise that resolves to the count of unread notifications.
 */
export const unreadNotificationCountFetcher = async ([_, entity]: [
  string,
  Partial<NotificationRecipientInfo>,
]): Promise<number | null> => {
  const { notification, user } = entity;
  if (!notification?.organizationId) {
    return null;
  }

  const { meta } = await graphQLPost<NotificationRecipientInfo[]>({
    query: gql`
      query ($organizationId: Int!, $userId: ID) {
        notificationRecipients(
          filters: {
            notification: { organizationId: { eq: $organizationId }, publishedAt: { ne: null } }
            user: { id: { eq: $userId } }
            isRead: { eq: false }
            publishedAt: { ne: null }
          }
          pagination: { limit: -1 }
        ) {
          meta {
            pagination {
              total
            }
          }
        }
      }
    `,
    params: {
      organizationId: notification?.organizationId,
      userId: user?.id,
    },
  });

  return meta?.pagination?.total || 0;
};
