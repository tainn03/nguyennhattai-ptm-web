import { gql } from "graphql-request";

import { STRAPI_TOKEN_KEY } from "@/configs/environment";
import { ShareObjectInfo } from "@/types/strapi";
import { fetcher } from "@/utils/graphql";

/**
 * Fetches the share object information associated with a given token.
 *
 * @param token - The token string used to filter the share objects.
 * @returns A promise that resolves to a ShareObjectInfo object if found,
 *          otherwise undefined or null if no data is available.
 */
export const getShareObjectByToken = async (token: string): Promise<ShareObjectInfo | undefined | null> => {
  const query = gql`
    query ($token: String) {
      shareObjects(filters: { token: { eq: $token }, publishedAt: { ne: null }, isActive: { eq: true } }) {
        data {
          id
          attributes {
            expirationDate
            meta
          }
        }
      }
    }
  `;

  // Execute the query using the fetcher function, providing the token as a variable.
  const result = await fetcher<ShareObjectInfo[]>(STRAPI_TOKEN_KEY, query, {
    token,
  });

  // Return the first share object found, or null if the data is not available.
  return result.data?.shareObjects[0] || null;
};
