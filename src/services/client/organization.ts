import { gql } from "graphql-request";

import { ErrorType } from "@/types";
import { HttpStatusCode } from "@/types/api";
import { MutationResult } from "@/types/graphql";
import { OrganizationInfo } from "@/types/strapi";
import { graphQLPost } from "@/utils/api";

/**
 * Delete an organization by its ID.
 *
 * @param {Pick<OrganizationInfo, "id" | "name">} entity - An object containing the organization's ID and name.
 * @returns {Promise<MutationResult<OrganizationInfo>>} A promise that resolves with the result of the delete operation.
 */
export const deleteOrganization = async (
  entity: Pick<OrganizationInfo, "id" | "name" | "updatedById">
): Promise<MutationResult<OrganizationInfo>> => {
  const { status, data } = await graphQLPost<OrganizationInfo>({
    query: gql`
      mutation ($id: ID!, $updatedById: ID) {
        updateOrganization(id: $id, data: { publishedAt: null, updatedByUser: $updatedById }) {
          data {
            id
          }
        }
      }
    `,
    params: { ...entity },
  });

  if (status === HttpStatusCode.Ok && data) {
    return { data: data.updateOrganization };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * Retrieves organization data by its unique ID using a GraphQL query.
 *
 * @param {number} orgId - The ID of the organization to retrieve.
 * @returns {Promise<OrganizationInfo | undefined>} - A Promise that resolves with the organization data
 * if found, or undefined if no data is available or an error occurs.
 */
export const getOrganization = async (
  orgId: number,
  options?: { retrieveSetting?: boolean }
): Promise<OrganizationInfo | undefined> => {
  const fetchSettingQuery = options?.retrieveSetting ? "setting { data { attributes { minBOLSubmitDays } } }" : "";
  const { data } = await graphQLPost<OrganizationInfo[]>({
    query: gql`
      query ($orgId: ID!) {
        organizations(filters: { id: { eq: $orgId }, publishedAt: { ne: null } }) {
          data {
            id
            attributes {
              code
              slug
              alias
              logo {
                data {
                  id
                  attributes {
                    url
                    previewUrl
                  }
                }
              }
              ${fetchSettingQuery}
              name
              internationalName
              abbreviationName
              taxCode
              email
              phoneNumber
              website
              businessAddress
              contactName
              contactPosition
              contactEmail
              contactPhoneNumber
              createdAt
              createdByUser {
                data {
                  id
                }
              }
              updatedAt
            }
          }
        }
      }
    `,
    params: { orgId },
  });

  return data?.organizations[0];
};

/**
 *
 * organizationsByOwnerFetcher: Fetches organizations by createdById using GraphQL query
 * @param _: Unused parameter
 * @param userId: Email to search for organizations
 * @returns OrganizationInfo[]: Array of organizations associated with the email
 */
export const organizationsByOwnerFetcher = async ([_, { createdById }]: [
  string,
  Pick<OrganizationInfo, "createdById">,
]): Promise<OrganizationInfo[]> => {
  const { data } = await graphQLPost<OrganizationInfo[]>({
    query: gql`
      query ($userId: ID) {
        organizations(
          filters: { publishedAt: { ne: null }, createdByUser: { id: { eq: $userId } } }
          pagination: { limit: 1 }
        ) {
          data {
            id
            attributes {
              name
              isActive
            }
          }
        }
      }
    `,
    params: {
      userId: createdById,
    },
  });

  return data?.organizations || [];
};

/**
 * Checks if there are any organizations created by the specified user.
 *
 * @param {number} createdById - The ID of the user who created the organizations.
 * @returns {Promise<boolean>} - A promise that resolves to true if there are organizations created by the user, otherwise false.
 */
export const hasOrganizations = async (createdById: number): Promise<boolean> => {
  const data = await organizationsByOwnerFetcher(["organizations", { createdById }]);
  return data.length > 0;
};
