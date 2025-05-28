import { OrganizationInitialValue } from "@prisma/client";
import { gql } from "graphql-request";

import { fetcher } from "@/utils/graphql";

/**
 * Fetches the initial values associated with organizations, such as maintenance types, driver license types, etc.
 *
 * @param {string} jwt - The JSON Web Token for authentication.
 * @returns An array of organization initial values if successful; otherwise, returns an empty array.
 */
export const getOrganizationInitialValues = async (jwt: string): Promise<OrganizationInitialValue[]> => {
  const query = gql`
    query {
      organizationInitialValues(filters: { isActive: { eq: true } }, pagination: { limit: -1 }) {
        data {
          id
          attributes {
            type
            data
            description
            isActive
            updatedAt
          }
        }
      }
    }
  `;

  const { data } = await fetcher<OrganizationInitialValue[]>(jwt, query);

  return data.organizationInitialValues || [];
};
