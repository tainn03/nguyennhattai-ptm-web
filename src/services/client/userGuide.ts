import { gql } from "graphql-request";

import { UserGuideInfo } from "@/types/strapi";
import { graphQLPost } from "@/utils/api";

/**
 * This function sends a GraphQL query to fetch user guides based on the provided target path and target element.
 * It filters the user guides to only include active ones and returns the first matching user guide if any are found.
 *
 * @param {string} targetPath - The target path to filter user guides.
 * @param {string} targetElement - The target element to filter user guides.
 * @returns {Promise<UserGuideInfo | null>} - A promise that resolves to the first matching user guide or null if none are found.
 */
export const fetchUserGuideInfo = async (
  targetPath: string,
  targetElement?: string | null
): Promise<UserGuideInfo | undefined> => {
  const query = gql`
    query ($targetPath: String!, $targetElement: String) {
      userGuides(
        filters: { targetPath: { eq: $targetPath }, targetElement: { eq: $targetElement }, isActive: { eq: true } }
      ) {
        data {
          id
          attributes {
            targetPath
            targetElement
            documentationLink
          }
        }
      }
    }
  `;

  const { data } = await graphQLPost<UserGuideInfo[]>({
    query,
    params: {
      targetPath,
      ...(targetElement && { targetElement }),
    },
  });

  return data?.userGuides[0];
};
