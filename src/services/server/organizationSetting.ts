import { gql } from "graphql-request";

import { OrganizationSettingInfo } from "@/types/strapi";
import { fetcher } from "@/utils/graphql";

/**
 * Fetches the order code settings for a specific organization.
 * This function sends a GraphQL query to fetch the settings related to order code generation for an organization.
 *
 * @param {Partial<OrganizationSettingInfo>} entity - An object containing the ID of the organization.
 * @param {string} jwt - The JSON Web Token for authentication.
 * @returns {Promise<OrganizationSettingInfo | undefined>} - A promise that resolves to the organization's order code settings, or undefined if no settings were found.
 */
export const getOrganizationOrderCodeSetting = async (
  jwt: string,
  entity: Partial<OrganizationSettingInfo>
): Promise<OrganizationSettingInfo> => {
  const { organizationId } = entity;
  const query = gql`
    query ($organizationId: Int!) {
      organizationSettings(filters: { organizationId: { eq: $organizationId }, publishedAt: { ne: null } }) {
        data {
          id
          attributes {
            orderCodeGenerationType
            orderCodeMaxLength
            customerCodePrefixMaxLength
            routeCodePrefixMaxLength
          }
        }
      }
    }
  `;
  const { data } = await fetcher<OrganizationSettingInfo[]>(jwt, query, {
    organizationId,
  });

  return data?.organizationSettings[0];
};

/**
 * Fetches the vehicle document settings.
 * @param {string} jwt - The JSON Web Token for authentication.
 * @returns {Promise<OrganizationSettingInfo[]>} - A promise that resolves to the vehicle document settings.
 */
export const getVehicleDocumentSettings = async (jwt: string) => {
  const query = gql`
    query {
      organizationSettings(
        sort: "minBOLSubmitDays:desc"
        pagination: { limit: -1 }
        filters: { minVehicleDocumentReminderDays: { ne: null }, publishedAt: { ne: null } }
      ) {
        data {
          id
          attributes {
            organizationId
            minVehicleDocumentReminderDays
          }
        }
      }
    }
  `;

  const { data } = await fetcher<OrganizationSettingInfo[]>(jwt, query);
  return data?.organizationSettings ?? [];
};

/**
 * Asynchronously retrieves the auto-dispatch settings for a specific organization from a GraphQL API.
 * This function uses a provided JWT for authentication and requires the organization's ID as part of the entity parameter.
 * It queries for organization settings where the 'publishedAt' field is not null to ensure only active settings are fetched.
 *
 * @param jwt The JSON Web Token used for authenticating the request.
 * @param entity An object containing partial information about the organization, specifically the 'organizationId'.
 * @returns A promise that resolves to the organization's auto-dispatch setting info, or undefined if no settings are found.
 */
export const getAutoDispatchSetting = async (
  jwt: string,
  entity: Partial<OrganizationSettingInfo>
): Promise<OrganizationSettingInfo> => {
  const { organizationId } = entity;
  const query = gql`
    query ($organizationId: Int!) {
      organizationSettings(filters: { organizationId: { eq: $organizationId }, publishedAt: { ne: null } }) {
        data {
          id
          attributes {
            autoDispatch
          }
        }
      }
    }
  `;
  const { data } = await fetcher<OrganizationSettingInfo[]>(jwt, query, {
    organizationId,
  });

  return data?.organizationSettings[0];
};

/**
 * Fetches the salary notice step settings for a specific organization.
 * This function sends a GraphQL query to fetch the settings salary notice step for an organization.
 *
 * @param {Partial<OrganizationSettingInfo>} entity - An object containing the ID of the organization.
 * @returns {Promise<OrganizationSettingInfo | undefined>} - A promise that resolves to the organization's salary notice step settings, or undefined if no settings were found.
 */
export const getSalaryNoticeStepSetting = async (
  jwt: string,
  entity: Partial<OrganizationSettingInfo>
): Promise<OrganizationSettingInfo | undefined> => {
  const { organizationId } = entity;
  const query = gql`
    query ($organizationId: Int!) {
      organizationSettings(filters: { organizationId: { eq: $organizationId }, publishedAt: { ne: null } }) {
        data {
          id
          attributes {
            salaryNoticeStep {
              data {
                id
                attributes {
                  type
                  name
                }
              }
            }
            updatedAt
          }
        }
      }
    }
  `;

  const { data } = await fetcher<OrganizationSettingInfo[]>(jwt, query, {
    organizationId,
  });

  return data?.organizationSettings[0];
};
