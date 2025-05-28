import { gql } from "graphql-request";

import { ExpenseTypeInfo } from "@/types/strapi";
import { graphQLPost } from "@/utils/api";

/**
 * Fetches a list of published expense types for a given organization from the GraphQL API.
 *
 * @param {Array} params - An array where the second element contains `organizationId` for filtering.
 * @returns {Promise<ExpenseTypeInfo[]>} - A promise that resolves to the list of expense types or an empty array if no data is found.
 */
export const expenseTypeOptionsFetcher = async ([_, params]: [string, Partial<ExpenseTypeInfo>]) => {
  const query = gql`
    query ($organizationId: Int!) {
      expenseTypes(
        filters: { organizationId: { eq: $organizationId }, publishedAt: { ne: null } }
        pagination: { limit: -1 }
      ) {
        data {
          id
          attributes {
            name
          }
        }
      }
    }
  `;

  const { data } = await graphQLPost<ExpenseTypeInfo[]>({
    query,
    params,
  });

  return data?.expenseTypes ?? [];
};
