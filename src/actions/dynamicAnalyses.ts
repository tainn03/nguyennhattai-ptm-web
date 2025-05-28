"use server";

import { DynamicAnalysis } from "@prisma/client";
import { gql } from "graphql-request";

import { STRAPI_TOKEN_KEY } from "@/configs/environment";
import { fetcher } from "@/utils/graphql";

/**
 * ## dynamicAnalysesFetcherAction Function
 * Fetches dynamic analysis data filtered by organization code for use in specific actions.
 *
 * ### Parameters
 * - `orgCode: string`: The organization code used to filter the dynamic analyses.
 *
 * ### Returns
 * - `Promise<DynamicAnalysis[]>`: A promise that resolves to an array of dynamic analysis data.
 *
 * ### Process
 * 1. **GraphQL Query Definition**: Defines a query to retrieve dynamic analyses associated with the provided `orgCode`.
 * 2. **Data Fetch Execution**: Executes the query with the `fetcher` using the `STRAPI_TOKEN_KEY`.
 * 3. **Response Handling**: Returns the fetched dynamic analyses or an empty array if no data is found.
 *
 * ### Errors
 * - Throws errors if the query fails or data retrieval encounters an issue.
 */
export const dynamicAnalysesFetcherAction = async (orgCode: string): Promise<DynamicAnalysis[]> => {
  if (!orgCode) {
    return [];
  }

  const query = gql`
    query ($orgCode: String!) {
      dynamicAnalyses(
        filters: {
          organizations: { code: { eq: $orgCode } }
          isActive: { eq: true }
          type: { eq: "REPORT" }
          publishedAt: { ne: null }
        }
        sort: "displayOrder"
        pagination: { limit: -1 }
      ) {
        data {
          id
          attributes {
            chartId
            datasetId
            reportTemplateId
            name
          }
        }
      }
    }
  `;

  const { data } = await fetcher<DynamicAnalysis[]>(STRAPI_TOKEN_KEY, query, {
    orgCode,
  });

  return data.dynamicAnalyses || [];
};
