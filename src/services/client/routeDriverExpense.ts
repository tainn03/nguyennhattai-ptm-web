import { gql } from "graphql-request";

import { RouteDriverExpenseInfo } from "@/types/strapi";
import { graphQLPost } from "@/utils/api";

/**
 * Gets route driver expenses for a specific order route.
 *
 * @param params - The parameters for the request.
 * @returns {Promise<RouteDriverExpenseInfo[]>} A promise that resolves with the route driver expenses.
 */
export const getRouteDriverExpenses = async (
  params: Partial<RouteDriverExpenseInfo>
): Promise<RouteDriverExpenseInfo[]> => {
  const { organizationId, route } = params;
  const { data } = await graphQLPost<RouteDriverExpenseInfo[]>({
    query: gql`
      query ($organizationId: Int!, $routeId: ID!) {
        routeDriverExpenses(filters: { organizationId: { eq: $organizationId }, route: { id: { eq: $routeId } } }) {
          data {
            id
            attributes {
              amount
              driverExpense {
                data {
                  id
                  attributes {
                    key
                  }
                }
              }
            }
          }
        }
      }
    `,
    params: {
      organizationId,
      routeId: route?.id,
    },
  });

  return data?.routeDriverExpenses ?? [];
};
