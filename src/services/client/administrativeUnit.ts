import { AdministrativeUnit } from "@prisma/client";
import { gql } from "graphql-request";

import { graphQLPost } from "@/utils/api";

/**
 * Queries the GraphQL server to fetch a list of administrative units based on the provided type
 * and optional parent code. It returns an array of `AdministrativeUnit` objects sorted by name in ascending order.
 *
 * @param {[string, Pick<AdministrativeUnit, "parentCode" | "type">]} params - An array containing the organization code (not used)
 * and an object with properties 'parentCode' and 'type' specifying the parent code and type of administrative units to retrieve.
 * @returns {Promise<AdministrativeUnit[]>} - A promise that resolves to an array of administrative units or an empty array if none are found.
 */
export const administrativeUnitsFetcher = async ([_, params]: [
  string,
  Pick<AdministrativeUnit, "parentCode" | "type">,
]) => {
  const query = gql`
    query ($type: String!, $parentCode: String) {
      administrativeUnits(
        sort: "name:asc"
        filters: {
          isActive: { eq: true }
          parentCode: { eq: $parentCode }
          type: { eq: $type }
          publishedAt: { ne: null }
        }
        pagination: { limit: -1 }
      ) {
        data {
          id
          attributes {
            code
            name
          }
        }
      }
    }
  `;

  const { data } = await graphQLPost<AdministrativeUnit[]>({
    query,
    params,
  });

  return data?.administrativeUnits || [];
};
