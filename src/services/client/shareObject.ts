import { gql } from "graphql-request";

import { ErrorType } from "@/types";
import { HttpStatusCode } from "@/types/api";
import { FilterRequest } from "@/types/filter";
import { OrderInfo, ShareObjectInfo } from "@/types/strapi";
import { graphQLPost } from "@/utils/api";
import { endOfDay } from "@/utils/date";
import { trim } from "@/utils/string";

export const createShareObject = async (entity: Partial<ShareObjectInfo>) => {
  const { createdById, ...processedEntity } = trim(entity);

  // GraphQL mutation query to create a new share object
  const query = gql`
    mutation (
      $organizationId: Int
      $targetId: Int
      $type: ENUM_SHAREOBJECT_TYPE
      $expirationDate: DateTime
      $token: String
      $meta: JSON
      $isActive: Boolean!
      $userId: ID
      $publishedAt: DateTime
    ) {
      createShareObject(
        data: {
          organizationId: $organizationId
          targetId: $targetId
          type: $type
          expirationDate: $expirationDate
          token: $token
          meta: $meta
          isActive: $isActive
          createdByUser: $userId
          updatedByUser: $userId
          publishedAt: $publishedAt
        }
      ) {
        data {
          id
        }
      }
    }
  `;
  const { status, data } = await graphQLPost<ShareObjectInfo>({
    query,
    params: {
      ...processedEntity,
      isActive: true,
      userId: createdById,
      publishedAt: new Date(),
    },
  });

  if (status === HttpStatusCode.Ok && data) {
    return { data: data.createShareObject };
  }
  return { error: ErrorType.UNKNOWN };
};

export const shareObjectFetcher = async ([_, params]: [string, FilterRequest<OrderInfo>]): Promise<
  ShareObjectInfo | undefined | null
> => {
  // Execute the GraphQL POST request with the provided query and parameters.
  const result = await graphQLPost<ShareObjectInfo[]>({
    query: gql`
      query ($id: Int, $currentDate: DateTime) {
        shareObjects(
          filters: {
            targetId: { eq: $id }
            publishedAt: { ne: null }
            isActive: { eq: true }
            or: [{ expirationDate: { eq: null } }, { expirationDate: { gte: $currentDate } }]
          }
        ) {
          data {
            id
            attributes {
              expirationDate
              token
              meta
              createdAt
              createdByUser {
                data {
                  id
                  attributes {
                    detail {
                      data {
                        attributes {
                          lastName
                          firstName
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
    `,
    params: {
      id: params.id,
      currentDate: endOfDay(new Date()),
    },
  });

  // Check if the response is successful and contains data, if so, return the first share object or null.
  if (result.status === HttpStatusCode.Ok && result.data) {
    return result.data?.shareObjects[0] || null;
  }

  // Return null if the request was not successful or no data was retrieved.
  return null;
};

export const cancelShareObject = async (shareObjectId: number, userId: number) => {
  const { status, data } = await graphQLPost<ShareObjectInfo>({
    query: gql`
      mutation ($id: ID!, $userId: ID) {
        updateShareObject(id: $id, data: { updatedByUser: $userId, isActive: false }) {
          data {
            id
          }
        }
      }
    `,
    params: {
      id: shareObjectId,
      userId,
    },
  });

  // Check if the response status is OK and data is available
  if (status === HttpStatusCode.Ok && data) {
    return { data: data.updateShareObject };
  }

  // Return an error object if the update is not successful
  return { error: ErrorType.UNKNOWN };
};
