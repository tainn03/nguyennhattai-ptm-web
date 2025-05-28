import { gql } from "graphql-request";

import { OrderInfo } from "@/types/strapi";
import { graphQLPost } from "@/utils/api";

/**
 * Fetches order status based on the specified parameters.
 *
 * @param _ - Placeholder parameter.
 * @param params - Partial order status object containing the filter parameters.
 * @returns Array of order status data matching the specified parameters.
 */
export const orderStatusesFetcher = async ([_, params]: [string, Partial<OrderInfo>]) => {
  const query = gql`
    query ($organizationId: Int!, $code: String!) {
      orders(filters: { code: { eq: $code }, organizationId: { eq: $organizationId }, publishedAt: { ne: null } }) {
        data {
          id
          attributes {
            isDraft
            statuses(sort: "createdAt:asc", pagination: { limit: -1 }) {
              data {
                id
                attributes {
                  type
                  createdAt
                }
              }
            }
          }
        }
      }
    }
  `;

  const { data } = await graphQLPost<OrderInfo[]>({
    query,
    params,
  });

  return data?.orders[0];
};
