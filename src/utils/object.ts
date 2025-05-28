/* eslint-disable @typescript-eslint/no-explicit-any */
import { Prisma } from "@prisma/client";
import camelCase from "lodash/camelCase";
import forEach from "lodash/forEach";
import has from "lodash/has";
import head from "lodash/head";
import isArray from "lodash/isArray";
import isDate from "lodash/isDate";
import isEmpty from "lodash/isEmpty";
import isNil from "lodash/isNil";
import isNull from "lodash/isNull";
import isNumber from "lodash/isNumber";
import isObject from "lodash/isObject";
import isString from "lodash/isString";
import isUndefined from "lodash/isUndefined";
import map from "lodash/map";

import { ensureString } from "@/utils/string";

/**
 * Deletes specified properties from an object.
 *
 * This function takes an object and an array of property names, and deletes each of these properties from the object.
 * It then returns the modified object.
 *
 * @param {T} obj - The object from which to delete properties.
 * @param {string[]} props - An array of property names to delete from the object.
 * @returns {T} - The object after deleting the specified properties.
 */
export const deleteProperties = <T extends { [key: string]: any }>(obj: T, props: string[]): T => {
  props.forEach((prop) => delete obj[prop]);
  return obj;
};

/**
 * Transforms an object by converting its keys from snake_case to camelCase and its values to strings.
 *
 * @template T The type that the transformed object should adhere to.
 * @param {Record<string, any>} obj - The object to be transformed.
 * @returns {T[]} An array of objects with camelCase keys and string values.
 */
export function transformObject<T>(obj: Record<string, any>): T[] {
  const result: Record<string, string>[] = Object.values(obj).map((item) => {
    const newItem: Record<string, string> = {};
    for (const [key, value] of Object.entries(item)) {
      // Convert key from snake_case to camelCase
      const camelCaseKey = camelCase(key);

      // Convert value to string
      let stringValue: string;
      if (isNil(value)) {
        stringValue = "";
      } else if (typeof value === "bigint") {
        stringValue = value.toString();
      } else if (isDate(value)) {
        stringValue = new Date(value).toISOString();
      } else {
        try {
          const parsedValue = JSON.parse(ensureString(value));
          if (typeof parsedValue === "object" && parsedValue !== null) {
            stringValue = JSON.stringify(parsedValue);
          } else {
            stringValue = String(value);
          }
        } catch {
          stringValue = String(value);
        }
      }

      newItem[camelCaseKey] = stringValue;
    }
    return newItem;
  });
  return result as T[];
}

/**
 * Transforms an object into a GraphQL-compatible payload by applying specific transformation rules:
 * - Removes undefined values
 * - Preserves null values
 * - Handles arrays:
 *   - Empty arrays are kept as empty arrays
 *   - Arrays of objects with IDs are transformed to arrays of IDs
 *   - Arrays of primitives (strings/numbers) are kept as-is
 * - Objects with an ID property are reduced to just their ID
 * - Other values are kept as-is
 *
 * @param obj - The source object to transform
 * @returns A new object with GraphQL-compatible values
 */
export const transformToGraphqlPayload = (obj: any): Record<string, any> => {
  const result: Record<string, any> = {};

  forEach(obj, (value, key) => {
    // Skip undefined values
    if (isUndefined(value)) return;

    // Preserve null values
    if (isNull(value)) {
      result[key] = null;
      return;
    }

    // Handle array values
    if (isArray(value)) {
      // Keep empty arrays as empty arrays
      if (isEmpty(value)) {
        result[key] = [];
        return;
      }

      const firstElement = head(value);

      // Transform arrays of objects with IDs to arrays of IDs
      if (isObject(firstElement) && !isNull(firstElement) && has(firstElement, "id")) {
        result[key] = map(value, "id");
      }
      // Keep arrays of primitives as-is
      else if (isString(firstElement) || isNumber(firstElement)) {
        result[key] = value;
      }
      return;
    }

    // Reduce objects with IDs to just their ID
    if (isObject(value)) {
      if (!isEmpty(value) && has(value, "id")) {
        result[key] = (value as { id: any }).id;
      } else {
        result[key] = null;
      }
      return;
    }

    // Keep other values as-is
    result[key] = value;
  });

  return result;
};

/**
 * Safely parses a string or JSON value into an array
 *
 * @param input - The input value to parse, can be a string or Prisma.JsonValue
 * @param defaultValue - Default array to return if parsing fails, defaults to empty array
 * @returns Parsed array of type T if successful, otherwise returns defaultValue
 */
export const safeParseArray = <T>(input: string | Prisma.JsonValue, defaultValue: T[] = []): T[] => {
  try {
    if (typeof input === "string") {
      const parsed = JSON.parse(input);
      return Array.isArray(parsed) ? parsed : defaultValue;
    }
    return Array.isArray(input) ? (input as T[]) : defaultValue;
  } catch (error) {
    return defaultValue;
  }
};
