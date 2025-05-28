import { gql } from "graphql-request";

import { PrismaClientTransaction } from "@/configs/prisma";
import { DEFAULT_LOCALE } from "@/constants/locale";
import { UserInfo } from "@/types/strapi";
import { fetcher } from "@/utils/graphql";

/**
 * Creates an organization user setting.
 *
 * @param {PrismaClientTransaction} prismaClient - The Prisma client with transaction support.
 * @param {number} organizationId - The ID of the organization for which the user setting is created.
 * @returns {Promise<number>} - A Promise resolving to the ID of the created user setting.
 */
export const createOrganizationUserSetting = async (prismaClient: PrismaClientTransaction, organizationId: number) => {
  const createdUserSetting = await prismaClient.userSetting.create({
    data: {
      organizationId,
      locale: DEFAULT_LOCALE,
      publishedAt: new Date(),
    },
  });

  return createdUserSetting.id;
};

/**
 * Retrieves message tokens for specified users within a given organization.
 *
 * @param {string} jwt - JSON Web Token for authentication.
 * @param {number} organizationId - Identifier for the organization.
 * @param {Partial<UserInfo>[]} entity - Array of user information with at least the 'id' property.
 * @returns {Promise<UserInfo[] | undefined>} - Array of user information with associated message tokens.
 */
export const getMessageTokensByUsers = async (jwt: string, organizationId: number, entity: Partial<UserInfo>[]) => {
  const user = entity.map((item) => item.id);
  const query = gql`
    query ($organizationId: Int, $user: [ID!]) {
      usersPermissionsUsers(
        filters: {
          id: { in: $user }
          setting: { organizationId: { eq: $organizationId }, messageTokens: { ne: null } }
        }
      ) {
        data {
          id
          attributes {
            setting {
              data {
                id
                attributes {
                  messageTokens
                }
              }
            }
          }
        }
      }
    }
  `;

  const { data } = await fetcher<UserInfo[]>(jwt, query, { organizationId, user });
  return data.usersPermissionsUsers;
};
