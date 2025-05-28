import { gql } from "graphql-request";

import { SettingInfo } from "@/types/strapi";
import { fetcher } from "@/utils/graphql";

/**
 * getSetting: Fetches the settings information from the server
 * @param jwt: JSON Web Token for authentication
 * @returns SettingInfo: Object containing settings data
 */
export const getSetting = async (jwt: string): Promise<SettingInfo> => {
  const query = gql`
    query {
      settings(filters: { publishedAt: { ne: null } }) {
        data {
          id
          attributes {
            autoActivateOrganization
            recipientEmail
          }
        }
      }
    }
  `;

  const { data } = await fetcher<SettingInfo[]>(jwt, query, {});

  return data?.settings[0];
};
