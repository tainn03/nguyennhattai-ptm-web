import { gql } from "graphql-request";

import { AnyObject } from "@/types";
import { DynamicAnalysisInfo, ResourceInfo } from "@/types/strapi";
import { graphQLPost } from "@/utils/api";

/**
 * Queries the GraphQL server to fetch a list of resources that are published and active.
 * It also includes the operations associated with each resource. The result is an array of `ResourceInfo` objects.
 *
 * @param {[Partial<ResourceInfo>]} _ - An array containing a single string parameter (not used in the function).
 * @returns {Promise<ResourceInfo[]>} - A promise that resolves to an array of resource information or an empty array if none are found.
 */
export const resourcesFetcher = async ([_, organizationId]: [string, number]) => {
  const query = gql`
    query ($organizationId: ID) {
      resources(filters: { publishedAt: { ne: null }, isActive: { eq: true } }, pagination: { limit: -1 }) {
        data {
          id
          attributes {
            name
            description
            action
            operations(filters: { publishedAt: { ne: null }, isActive: { eq: true } }, pagination: { limit: -1 }) {
              data {
                id
                attributes {
                  name
                  description
                  action
                }
              }
            }
          }
        }
      }
      dynamicAnalyses(
        sort: "displayOrder:asc"
        filters: { organizations: { id: { eq: $organizationId } }, isActive: { eq: true }, publishedAt: { ne: null } }
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

  const { data } = await graphQLPost<AnyObject[]>({ query, params: { organizationId } });
  return {
    resources: (data?.resources ?? []) as ResourceInfo[],
    dynamicAnalyses: (data?.dynamicAnalyses ?? []) as DynamicAnalysisInfo[],
  };
};
