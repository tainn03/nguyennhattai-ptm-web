import { HttpStatusCode } from "axios";
import { gql } from "graphql-request";

import { OrganizationSettingSalaryNoticeStepInputForm } from "@/forms/organizationSetting";
import { ErrorType } from "@/types";
import { MutationResult } from "@/types/graphql";
import { OrganizationSettingInfo } from "@/types/strapi";
import { graphQLPost } from "@/utils/api";
import { trim } from "@/utils/string";

/**
 * Fetches the order code settings for a specific organization.
 * This function sends a GraphQL query to fetch the settings related to order code generation for an organization.
 *
 * @param {Partial<OrganizationSettingInfo>} entity - An object containing the ID of the organization.
 * @returns {Promise<OrganizationSettingInfo | undefined>} - A promise that resolves to the organization's order code settings, or undefined if no settings were found.
 */
export const getOrganizationOrderCodeSetting = async (
  entity: Partial<OrganizationSettingInfo>
): Promise<OrganizationSettingInfo | undefined> => {
  const { organizationId } = entity;
  const { data } = await graphQLPost<OrganizationSettingInfo[]>({
    query: gql`
      query ($organizationId: Int!) {
        organizationSettings(filters: { organizationId: { eq: $organizationId }, publishedAt: { ne: null } }) {
          data {
            id
            attributes {
              orderCodeGenerationType
              orderCodeMaxLength
              customerCodePrefixMaxLength
              routeCodePrefixMaxLength
              updatedAt
            }
          }
        }
      }
    `,
    params: {
      organizationId,
    },
  });

  return data?.organizationSettings[0];
};

/**
 * Fetches the min bill of lading submit days settings for a specific organization.
 * This function sends a GraphQL query to fetch the settings related to min bill of lading submit days generation for an organization.
 *
 * @param {Partial<OrganizationSettingInfo>} entity - An object containing the ID of the organization.
 * @returns {Promise<OrganizationSettingInfo | undefined>} - A promise that resolves to the organization's min bill of lading submit days settings, or undefined if no settings were found.
 */
export const getOrganizationMinBOLSubmitSetting = async (
  entity: Partial<OrganizationSettingInfo>
): Promise<OrganizationSettingInfo | undefined> => {
  const { organizationId } = entity;
  const { data } = await graphQLPost<OrganizationSettingInfo[]>({
    query: gql`
      query ($organizationId: Int!) {
        organizationSettings(filters: { organizationId: { eq: $organizationId }, publishedAt: { ne: null } }) {
          data {
            id
            attributes {
              minBOLSubmitDays
              minVehicleDocumentReminderDays
              updatedAt
            }
          }
        }
      }
    `,
    params: {
      organizationId,
    },
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
export const getOrganizationSalaryNoticeStepSetting = async (
  entity: Partial<OrganizationSettingInfo>
): Promise<OrganizationSettingInfo | undefined> => {
  const { organizationId } = entity;
  const { data } = await graphQLPost<OrganizationSettingInfo[]>({
    query: gql`
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
    `,
    params: {
      organizationId,
    },
  });

  return data?.organizationSettings[0];
};

/**
 * Checks if a organization setting has been updated since a specified date.
 *
 * @param {number} organizationId - The ID of the organization to which the organization setting belongs.
 * @param {number} id - The ID of the organization setting to check.
 * @param {Date | string} lastUpdatedAt - The date to compare against the organization setting's last updated timestamp.
 * @returns {Promise<boolean>} A promise that resolves to true if the organization setting has been updated, otherwise false.
 */
export const checkOrganizationSettingExclusives = async (
  organizationId: number,
  id: number,
  lastUpdatedAt: Date | string
): Promise<boolean> => {
  const { data } = await graphQLPost<OrganizationSettingInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        organizationSettings(
          filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }
        ) {
          data {
            id
            attributes {
              updatedAt
            }
          }
        }
      }
    `,
    params: {
      organizationId,
      id,
    },
  });

  return data?.organizationSettings[0]?.updatedAt !== lastUpdatedAt;
};

/**
 * Updates the order code settings for a specific organization.
 * This function sends a GraphQL mutation to update the settings related to order code generation for an organization.
 *
 * @param {Partial<OrganizationSettingInfo>} entity - An object containing the new settings and the ID of the organization.
 * @param {Date | string} lastUpdatedAt - The last time the settings were updated.
 * @returns {Promise<MutationResult<OrganizationSettingInfo>>} - A promise that resolves to the result of the mutation.
 */
export const updateOrganizationOrderCodeSetting = async (
  entity: Partial<OrganizationSettingInfo>,
  lastUpdatedAt?: Date | string
): Promise<MutationResult<OrganizationSettingInfo>> => {
  const {
    id,
    organizationId,
    orderCodeGenerationType,
    orderCodeMaxLength,
    customerCodePrefixMaxLength,
    routeCodePrefixMaxLength,
  } = trim(entity);

  if (lastUpdatedAt && id && organizationId) {
    const isErrorExclusives = await checkOrganizationSettingExclusives(organizationId, id, lastUpdatedAt);
    if (isErrorExclusives) {
      return { error: ErrorType.EXCLUSIVE };
    }
  }

  const { status, data } = await graphQLPost<OrganizationSettingInfo>({
    query: gql`
      mutation (
        $id: ID!
        $orderCodeGenerationType: ENUM_ORGANIZATIONSETTING_ORDERCODEGENERATIONTYPE
        $orderCodeMaxLength: Int
        ${customerCodePrefixMaxLength ? "$customerCodePrefixMaxLength: Int" : ""}
        ${routeCodePrefixMaxLength ? "$routeCodePrefixMaxLength: Int" : ""}
      ) {
        updateOrganizationSetting(
          id: $id
          data: {
            orderCodeGenerationType: $orderCodeGenerationType
            orderCodeMaxLength: $orderCodeMaxLength
            ${customerCodePrefixMaxLength ? "customerCodePrefixMaxLength: $customerCodePrefixMaxLength" : ""}
            ${routeCodePrefixMaxLength ? "routeCodePrefixMaxLength: $routeCodePrefixMaxLength" : ""}
          }
        ) {
          data {
            id
          }
        }
      }
    `,
    params: {
      id,
      orderCodeGenerationType,
      orderCodeMaxLength,
      ...(customerCodePrefixMaxLength && { customerCodePrefixMaxLength }),
      ...(routeCodePrefixMaxLength && { routeCodePrefixMaxLength }),
    },
  });

  if (status === HttpStatusCode.Ok && data) {
    return { data: data.updateOrganizationSetting };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * Updates the min bill of ladings submit days settings for a specific organization.
 * This function sends a GraphQL mutation to update the settings related to min bill of ladings submit days generation for an organization.
 *
 * @param {Partial<OrganizationSettingInfo>} entity - An object containing the new settings and the ID of the organization.
 * @param {Date | string} lastUpdatedAt - The last time the settings were updated.
 * @returns {Promise<MutationResult<OrganizationSettingInfo>>} - A promise that resolves to the result of the mutation.
 */
export const updateOrganizationMinBOLSubmitDaysSetting = async (
  entity: Partial<OrganizationSettingInfo>,
  lastUpdatedAt?: Date | string
): Promise<MutationResult<OrganizationSettingInfo>> => {
  const { id, organizationId, minBOLSubmitDays, minVehicleDocumentReminderDays } = trim(entity);

  if (lastUpdatedAt && id && organizationId) {
    const isErrorExclusives = await checkOrganizationSettingExclusives(organizationId, id, lastUpdatedAt);
    if (isErrorExclusives) {
      return { error: ErrorType.EXCLUSIVE };
    }
  }

  const { status, data } = await graphQLPost<OrganizationSettingInfo>({
    query: gql`
      mutation ($id: ID!, $minBOLSubmitDays: Int, $minVehicleDocumentReminderDays: Int) {
        updateOrganizationSetting(
          id: $id
          data: { minBOLSubmitDays: $minBOLSubmitDays, minVehicleDocumentReminderDays: $minVehicleDocumentReminderDays }
        ) {
          data {
            id
          }
        }
      }
    `,
    params: {
      id,
      minBOLSubmitDays,
      minVehicleDocumentReminderDays,
    },
  });

  if (status === HttpStatusCode.Ok && data) {
    return { data: data.updateOrganizationSetting };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * Updates the salary notice step setting for an organization.
 *
 * @param entity - A partial object of type OrganizationSettingSalaryNoticeStepInputForm containing the properties to be updated.
 * @param lastUpdatedAt - Optional. A Date or string representing the last update timestamp for concurrency checks.
 * @returns A Promise that resolves to a MutationResult containing the updated OrganizationSettingSalaryNoticeStepInputForm or an error.
 */
export const updateOrganizationSalaryNoticeStepSetting = async (
  entity: Partial<OrganizationSettingSalaryNoticeStepInputForm>,
  lastUpdatedAt?: Date | string
): Promise<MutationResult<OrganizationSettingInfo>> => {
  // Destructure the necessary properties from the entity object after trimming it.
  const { id, organizationId, salaryNoticeStepId } = trim(entity);

  // Check for exclusive conflicts if lastUpdatedAt, id, and organizationId are provided.
  if (lastUpdatedAt && id && organizationId) {
    const isErrorExclusives = await checkOrganizationSettingExclusives(organizationId, id, lastUpdatedAt);
    if (isErrorExclusives) {
      return { error: ErrorType.EXCLUSIVE };
    }
  }

  // Perform the GraphQL mutation to update the organization setting.
  const { status, data } = await graphQLPost<OrganizationSettingInfo>({
    query: gql`
      mutation ($id: ID!, $salaryNoticeStepId: ID) {
        updateOrganizationSetting(id: $id, data: { salaryNoticeStep: $salaryNoticeStepId }) {
          data {
            id
          }
        }
      }
    `,
    params: {
      id,
      salaryNoticeStepId,
    },
  });

  // Check if the mutation was successful and return the result.
  if (status === HttpStatusCode.Ok && data) {
    return { data: data.updateOrganizationSetting };
  }

  // Return an unknown error if the mutation failed.
  return { error: ErrorType.UNKNOWN };
};
