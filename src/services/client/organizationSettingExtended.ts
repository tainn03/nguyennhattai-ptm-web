import { OrganizationSettingExtendedValueType } from "@prisma/client";
import { gql } from "graphql-request";

import { OrganizationSettingExtendedInfo } from "@/types/strapi";
import { graphQLPost } from "@/utils/api";
import { parseDate } from "@/utils/date";

/**
 * Fetches extended organization settings based on the provided entity information.
 *
 * @param {[string, Partial<OrganizationSettingExtended>]} params - The parameters for fetching the settings.
 * @param {string} params[0] - A string identifier (not used in the function).
 * @param {Partial<OrganizationSettingExtended>} params[1] - The entity information containing organizationId and key.
 * @returns {Promise<T | undefined>} - A promise that resolves to the fetched setting value converted to the specified type, or undefined if not found.
 *
 */
export const organizationSettingExtendedFetcher = async <T>([_, entity]: [
  string,
  Partial<OrganizationSettingExtendedInfo>,
]): Promise<T | undefined> => {
  const { organizationId, key } = entity;
  const { data } = await graphQLPost<OrganizationSettingExtendedInfo[]>({
    query: gql`
      query ($organizationId: Int!, $key: String) {
        organizationSettingExtendeds(
          filters: {
            organizationId: { eq: $organizationId }
            key: { eq: $key }
            isActive: { eq: true }
            publishedAt: { ne: null }
          }
        ) {
          data {
            id
            attributes {
              value
              valueType
            }
          }
        }
      }
    `,
    params: {
      organizationId,
      key,
    },
  });

  const setting = data?.organizationSettingExtendeds?.[0];

  if (setting) {
    const { value, valueType } = setting;
    return convertValueBasedOnType(value, valueType) as T;
  }

  return undefined;
};

/**
 * Converts a string value to a specific type based on the provided value type.
 *
 * @param {string} value - The string value to be converted.
 * @param {OrganizationSettingExtendedValueType} valueType - The type to which the value should be converted.
 * @returns {boolean | number | object | Date | string} - The converted value.
 */
const convertValueBasedOnType = (value: string | null, valueType: OrganizationSettingExtendedValueType) => {
  switch (valueType) {
    case OrganizationSettingExtendedValueType.BOOLEAN:
      return value === "true";
    case OrganizationSettingExtendedValueType.NUMBER:
      return Number(value);
    case OrganizationSettingExtendedValueType.JSON:
      return value ? JSON.parse(value) : value;
    case OrganizationSettingExtendedValueType.DATE:
      return parseDate(value, "yyyy-MM-dd");
    case OrganizationSettingExtendedValueType.DATETIME:
      return parseDate(value, "yyyy-MM-dd HH:mm:ss");
    default:
      return value;
  }
};
