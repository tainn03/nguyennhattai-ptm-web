import { SMTPSetting } from "@prisma/client";
import { gql } from "graphql-request";

import { STRAPI_TOKEN_KEY } from "@/configs/environment";
import { fetcher } from "@/utils/graphql";

/**
 * Retrieve SMTP settings for an organization by its ID from the server.
 *
 * @param organizationId - The ID of the organization.
 * @returns A Promise that resolves to the SMTP settings for the organization or undefined if not found.
 */
export const getSmtpSettingByOrganizationId = async (organizationId: number): Promise<SMTPSetting | undefined> => {
  const query = gql`
    query ($organizationId: ID!) {
      organizations(filters: { id: { eq: $organizationId }, isActive: { eq: true }, publishedAt: { ne: null } }) {
        data {
          id
          attributes {
            setting {
              data {
                id
                attributes {
                  smtp {
                    data {
                      id
                      attributes {
                        server
                        port
                        authenticationEnabled
                        username
                        password
                        timeout
                        security
                        fromName
                        fromEmail
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;
  const { data } = await fetcher(STRAPI_TOKEN_KEY, query, { organizationId });
  return data.organizations[0]?.setting?.smtp;
};

/**
 * Retrieve SMTP settings from the server.
 *
 * @returns - A Promise that resolves to the SMTP settings or undefined if not found.
 */
export const getSmtpSetting = async (): Promise<SMTPSetting | undefined> => {
  const query = gql`
    query {
      settings {
        data {
          attributes {
            smtp {
              data {
                id
                attributes {
                  server
                  port
                  authenticationEnabled
                  username
                  password
                  timeout
                  security
                  fromName
                  fromEmail
                }
              }
            }
          }
        }
      }
    }
  `;
  const { data } = await fetcher(STRAPI_TOKEN_KEY, query);
  return data.settings[0]?.smtp;
};
