"use server";

import { OrganizationSettingExtendedValueType } from "@prisma/client";
import { gql } from "graphql-request";

import { STRAPI_TOKEN_KEY } from "@/configs/environment";
import { OrganizationSettingExtendedInfo } from "@/types/strapi";
import { parseDate } from "@/utils/date";
import { fetcher } from "@/utils/graphql";
import { isTrue } from "@/utils/string";

/**
 * Fetches extended organization settings based on the provided entity information.
 *
 * @param {[string, Partial<OrganizationSettingExtended>]} params - The parameters for fetching the settings.
 * @param {string} params[0] - A string identifier (not used in the function).
 * @param {Partial<OrganizationSettingExtended>} params[1] - The entity information containing organizationId and key.
 * @returns {Promise<T | undefined>} - A promise that resolves to the fetched setting value converted to the specified type, or undefined if not found.
 *
 */
export const getOrganizationSettingExtended = async <T>(
  entity: Partial<OrganizationSettingExtendedInfo>
): Promise<T | undefined> => {
  const { organizationId, key } = entity;

  const query = gql`
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
  `;

  const { data } = await fetcher(STRAPI_TOKEN_KEY, query, {
    organizationId,
    key,
  });

  const setting = data?.organizationSettingExtendeds?.[0];

  if (setting && setting.value) {
    const { value, valueType } = setting;
    return convertValueBasedOnType(value, valueType) as T;
  }

  return undefined;
};

/**
 * Fetches extended organization settings based on the provided organization ID and keys.
 *
 * @param {number} organizationId - The ID of the organization.
 * @param {string[]} keys - The keys of the settings to fetch.
 * @returns {Promise<Record<string, unknown>>} A promise that resolves to an object containing the settings.
 */
export const getOrganizationSettingsExtended = async (
  organizationId: number,
  keys: string[]
): Promise<Record<string, unknown>> => {
  const query = gql`
    query ($organizationId: Int!, $keys: [String!]) {
      organizationSettingExtendeds(
        pagination: { limit: -1 }
        filters: {
          organizationId: { eq: $organizationId }
          key: { in: $keys }
          isActive: { eq: true }
          publishedAt: { ne: null }
        }
      ) {
        data {
          id
          attributes {
            key
            value
            valueType
          }
        }
      }
    }
  `;

  const { data } = await fetcher<OrganizationSettingExtendedInfo[]>(STRAPI_TOKEN_KEY, query, {
    organizationId,
    keys,
  });

  const settingsExtended: Record<string, unknown> = {};
  if (data?.organizationSettingExtendeds) {
    (data.organizationSettingExtendeds || []).map((setting) => {
      const { key, value, valueType } = setting;
      settingsExtended[key] = convertValueBasedOnType(value, valueType);
    });
  }
  return settingsExtended;
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
      return isTrue(value);
    case OrganizationSettingExtendedValueType.NUMBER:
      return Number(value);
    case OrganizationSettingExtendedValueType.JSON:
      return value ? JSON.parse(value) : value;
    case OrganizationSettingExtendedValueType.DATE:
      return parseDate(value, "YYYY-MM-DD");
    case OrganizationSettingExtendedValueType.DATETIME:
      return parseDate(value, "YYYY-MM-DD HH:mm:ss");
    default:
      return value;
  }
};
