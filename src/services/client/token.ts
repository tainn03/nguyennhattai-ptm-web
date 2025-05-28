import { Token, TokenType } from "@prisma/client";
import { gql } from "graphql-request";

import { graphQLPost } from "@/utils/api";

/**
 * Retrieves invitation tokens for a given email address that are active and have not expired.
 *
 * @param {string} email - The email address for which to retrieve invitation tokens.
 * @returns {Promise<Token[]>} An array of invitation tokens that match the criteria.
 */
export const getInviteMemberToken = async (email: string): Promise<Token[]> => {
  const query = gql`
    query ($email: String, $expirationTime: DateTime, $type: String) {
      tokens(
        filters: {
          type: { eq: $type }
          data: { eq: $email }
          expirationTime: { gte: $expirationTime }
          isActive: { eq: true }
          publishedAt: { ne: null }
        }
      ) {
        data {
          id
          attributes {
            value
          }
        }
      }
    }
  `;
  const { data } = await graphQLPost<Token[]>({
    query,
    params: {
      email,
      type: TokenType.INVITATION_CODE,
      expirationTime: new Date(),
    },
  });

  return data?.tokens ?? [];
};
