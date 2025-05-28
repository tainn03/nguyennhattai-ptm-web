import { gql } from "graphql-request";

import { OrganizationInitialValueInfo } from "@/types/strapi";
import { graphQLPost } from "@/utils/api";

/**
 * Fetches the initial values for an organization based on the provided type.
 *
 * @param type - The type of organization initial values to fetch.
 */
export const organizationInitialValueFetcher = async (type: string) => {
  const { data } = await graphQLPost<OrganizationInitialValueInfo[]>({
    query: gql`
      query ($type: String!) {
        organizationInitialValues(filters: { type: { eq: $type }, publishedAt: { ne: null } }) {
          data {
            id
            attributes {
              data
            }
          }
        }
      }
    `,
    params: {
      type,
    },
  });

  return data?.organizationInitialValues ?? [];
};
