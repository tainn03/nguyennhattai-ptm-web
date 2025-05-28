import { OrderTripStatusType } from "@prisma/client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NotificationType } from "@prisma/client";
import slugify, { Options } from "@sindresorhus/slugify";
import isArray from "lodash/isArray";
import isBoolean from "lodash/isBoolean";
import isEmpty from "lodash/isEmpty";
import isNil from "lodash/isNil";
import isNumber from "lodash/isNumber";
import isObject from "lodash/isObject";
import isString from "lodash/isString";
import lodashTrim from "lodash/trim";
import { v4 as uuidv4 } from "uuid";

import { AnyObject } from "@/types";
import { AddressFormattingRulesInReport } from "@/types/organizationSettingExtended";
import { AddressInformationInfo, RoutePointInfo } from "@/types/strapi";

/**
 * Letters (both upper and lower case) and digits
 */
const RANDOM_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/**
 * Letters (upper only) and digits
 */
const RANDOM_UPPERCASE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/**
 * Generates a new random UUID using the `uuid` library.
 *
 * @returns A string representing the generated UUID.
 */
export const randomUUID = (): string => uuidv4();

/**
 * Generates a random string of the specified length using letters (both upper and lower case) and digits.
 *
 * @param length The length of the random string to generate.
 * @param uppercase The flag to use uppercase only.
 * @returns The randomly generated string.
 */
export const randomString = (length: number, uppercase?: boolean): string => {
  const randomChars = uppercase ? RANDOM_UPPERCASE_CHARS : RANDOM_CHARS;
  return Array.from({ length }, () => randomChars[Math.floor(Math.random() * randomChars.length)]).join("");
};

/**
 * Ensure that the input value is converted to a string.
 * If the value is already a string, it returns it directly.
 * If the value is an object, it converts it to a JSON string.
 * Otherwise, it uses the template string to convert the value to a string.
 *
 * @param value The value to ensure is a string.
 * @returns A string representation of the input value.
 */
export const ensureString = (value: any): string => {
  try {
    if (value !== undefined && value !== null) {
      if (typeof value === "string") {
        return value;
      }
      if (value instanceof Date) {
        return value.toISOString();
      }
      if (typeof value === "object") {
        return JSON.stringify(value);
      }
      return `${value}`;
    }
  } catch (error) {
    // If an error occurs, return an empty string.
  }
  return "";
};

/**
 * Convert a string to a color in hexadecimal format.
 *
 * @param name The string to be converted.
 * @returns A color in hexadecimal format.
 */
export const stringToColor = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `#${(0xffffff & hash).toString(16).padStart(6, "0")}`;
};

/**
 * Calculates and returns a contrasting text color based on the provided hex color.
 * It determines whether the text should be black or white, depending on the brightness of the background color.
 *
 * @param {string} hexColor - The hexadecimal color code (e.g., "#RRGGBB") for which to calculate the contrasting text color.
 * @returns {string} - The contrasting text color, either black ("#000000") or white ("#ffffff").
 */
export const contrastColor = (hexColor: string): string => {
  return parseInt(hexColor, 16) > 0xffffff / 2 ? "#000000" : "#ffffff";
};

/**
 * Converts a hexadecimal color code to its corresponding RGBA representation.
 * If the hex code is in a short format (e.g., #abc), it expands it to the full format (e.g., #aabbcc).
 * It also accepts an optional opacity value.
 *
 * @see https://gist.github.com/danieliser/b4b24c9f772066bcf0a6
 * @param {string} hexCode - The hexadecimal color code (with or without the # symbol).
 * @param {number} [opacity=1] - Optional opacity value ranging from 0 to 1 (or 0% to 100%).
 * @returns {string} The RGBA representation of the color.
 */
export const hexToRGBA = (hexCode: string, opacity: number = 1) => {
  let hex = hexCode.replace("#", "");

  if (hex.length === 3) {
    hex = `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
  }

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Backward compatibility for whole number based opacity values
  if (opacity > 1 && opacity <= 100) {
    opacity = opacity / 100;
  }

  return `rgba(${r},${g},${b},${opacity})`;
};

/**
 * Generate a two-letter avatar name from a given name.
 *
 * @param name The name to generate the avatar from.
 * @returns A two-letter avatar name in uppercase.
 */
export const avatarLetterName = (name: string): string => {
  const words = name?.split(/[-. ]/) || "";
  if (words.length > 1) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return (words[0] || "").slice(0, 2).toUpperCase();
};

/**
 * Convert an object of key-value pairs into a URL-encoded query string.
 *
 * @param obj - The data to be converted into a query string.
 * @returns The URL-encoded query string.
 */
export const objectToQueryString = (obj: AnyObject): string => {
  const searchParams = new URLSearchParams();
  Object.keys(obj)
    .sort()
    .forEach((key) => {
      searchParams.append(key, obj[key]);
    });
  return searchParams.toString();
};

/**
 * Trims leading and trailing white spaces from string values within an object.
 * If the input is a string, it trims the string itself. If the input is an object, it recursively
 * traverses the object and trims string values.
 *
 * @template T - The type of the input and output data.
 * @param {T} obj - The input data to trim.
 * @returns {T} - The trimmed input data, preserving its original type.
 */
export const trim = <T>(obj: T): T => {
  if (isString(obj)) {
    return ensureString(obj).trim() as typeof obj;
  }
  for (const key in obj) {
    const objValue = obj[key];
    if (objValue !== undefined && objValue !== null) {
      if (isArray(objValue) || isObject(objValue)) {
        trim(objValue);
        continue;
      }
      if (isString(objValue)) {
        obj[key] = lodashTrim(objValue) as typeof objValue;
        continue;
      }
    }
  }
  return obj;
};

/**
 * Generates a formatted full address string from the given address information.
 *
 * @param {Partial<AddressInformationInfo>} address - The address information object.
 * @returns {string} - The formatted full address string.
 */
export const getDetailAddress = (address?: Partial<AddressInformationInfo>) => {
  if (
    !isObject(address) ||
    isEmpty(address) ||
    (!address.addressLine1 &&
      !address.addressLine2 &&
      !address.ward?.name &&
      !address.district?.name &&
      !address.city?.name)
  ) {
    return "";
  }
  const addressParts = [
    address.addressLine1,
    address.addressLine2,
    address.ward?.name,
    address.district?.name,
    address.city?.name,
  ].filter((part) => !!part);
  return addressParts.join(", ");
};

/**
 * Formats an address object based on the provided rules.
 *
 * @param address - The address object to format.
 * @param rules - The rules to apply when formatting the address.
 * @returns The formatted address string.
 */
export const formatAddressForReport = (
  address?: Partial<AddressInformationInfo>,
  rules?: AddressFormattingRulesInReport
): string => {
  if (!rules || !isObject(rules) || isEmpty(rules)) {
    return getDetailAddress(address);
  }

  if (
    !address ||
    !isObject(address) ||
    isEmpty(address) ||
    (!address.addressLine1 &&
      !address.addressLine2 &&
      !address.ward?.name &&
      !address.district?.name &&
      !address.city?.name)
  ) {
    return "";
  }

  const formattedAddress: string[] = [];

  if (rules.addressLine1 && address.addressLine1) {
    formattedAddress.push(address.addressLine1);
  }
  if (rules.addressLine2 && address.addressLine2) {
    formattedAddress.push(address.addressLine2);
  }
  if (rules.ward && address.ward?.name) {
    formattedAddress.push(address.ward.name);
  }
  if (rules.district && address.district?.name) {
    formattedAddress.push(address.district.name);
  }
  if (rules.city && address.city?.name) {
    formattedAddress.push(address.city.name);
  }
  if (rules.postalCode && address.postalCode) {
    formattedAddress.push(address.postalCode);
  }
  if (rules.country && address.country?.name) {
    formattedAddress.push(address.country.name);
  }

  return formattedAddress.join(", ");
};

/**
 * Processes an array of strings by removing empty strings and joins the non-empty strings using a specified separator.
 *
 * @param arrayOfStrings - An array of strings to be processed and joined.
 * @param separator - The separator used to join the non-empty strings.
 * @returns A string result after processing and joining.
 */
export const joinNonEmptyStrings = (arrayOfStrings: (string | null | undefined)[], separator: string = " ") => {
  return arrayOfStrings.filter((item) => !!item).join(separator);
};

/**
 * Generates a navigation link based on the notification type and data.
 *
 * @param {NotificationType} type - The type of the notification.
 * @param {AnyObject} data - Additional data associated with the notification.
 * @returns {string | null} The generated navigation link or null if the type is not recognized.
 */
export const getNotificationNavigationLink = (orgLink: string, type?: NotificationType | null, data?: AnyObject) => {
  // Return null if the type or data is not provided
  if (!type || !data) {
    return null;
  }

  // Switch statement to determine the navigation link based on the notification type.
  switch (type) {
    // Navigation links for notifications related to orders.
    case NotificationType.NEW_ORDER:
    case NotificationType.NEW_ORDER_PARTICIPANT:
    case NotificationType.ORDER_STATUS_CHANGED:
      return `${orgLink}/orders/${data?.orderCode}?tab=information`;
    // Navigation links for notifications related to trips and bill of lading.
    case NotificationType.TRIP_STATUS_CHANGED: {
      if (
        data?.tripStatus === OrderTripStatusType.WAREHOUSE_GOING_TO_PICKUP ||
        data?.tripStatus === OrderTripStatusType.WAREHOUSE_PICKED_UP
      ) {
        return `${orgLink}/order-groups/process`;
      } else {
        return `${orgLink}/orders/${data?.orderCode}?tab=dispatch-vehicle`;
      }
    }
    case NotificationType.BILL_OF_LADING_RECEIVED:
      return `${orgLink}/orders/${data?.orderCode}?tab=dispatch-vehicle`;
    case NotificationType.TRIP_NEW_MESSAGE:
      return `${orgLink}/orders/${data?.orderCode}?tab=dispatch-vehicle&tripCode=${data?.tripCode}`;
    // Return null for unrecognized notification types.
    default:
      return null;
  }
};

/**
 * This function slugifies a given string.
 * It uses the 'slugify' library to convert the string into a URL-friendly format.
 * The function takes an optional 'options' parameter that can be used to customize the slugification process.
 *
 * @param {string} value - The string to be slugified.
 * @param {Options} [options] - Optional settings for the slugification process.
 * @returns {string} - The slugified string.
 */
export const slugifyString = (value: string, options?: Options) => {
  return slugify(value, options);
};

/**
 * Checks if the provided value is considered "true".
 *
 * This function determines whether the given value equates to a "true" value.
 * It returns false for null, undefined, objects, arrays, empty values, and empty strings.
 * It returns true for strings "true" (case insensitive) or "1", and the number 1.
 * For all other values, it converts the value to a boolean and returns the result.
 *
 * @param {any} value - The value to check.
 * @returns {boolean} - Returns true if the value is considered "true", otherwise false.
 */
export const isTrue = (value: any): boolean => {
  if (isBoolean(value)) {
    return value;
  } else if (isString(value)) {
    return value.toLowerCase() === "true" || value === "1";
  } else if (isNumber(value)) {
    return value === 1;
  } else if (isNil(value) || isObject(value) || isArray(value) || value === "") {
    return false;
  }

  return !!value;
};

/**
 * Checks if a value is considered false.
 *
 * This method is a wrapper around the `isTrue` function. It inverts the result
 * of `isTrue` to determine if the given value is false.
 *
 * @param value - The value to be checked. It can be of any type.
 * @returns A boolean indicating whether the value is considered false.
 */
export const isFalse = (value: any): boolean => {
  return !isTrue(value);
};

/**
 * Transforms a given pathname by replacing segments with corresponding keys from the params object.
 *
 * @param params - An object where keys represent the placeholders and values represent the segments to be replaced in the pathname.
 * @param pathname - The original pathname string that needs to be transformed.
 * @returns The transformed pathname with segments replaced by placeholders in the format `/[key]`.
 */
export const transformPathnameToSlug = (params: any, pathname: string): string => {
  let transformedPathname = pathname;

  for (const [key, value] of Object.entries(params)) {
    const regex = new RegExp(`/${value}`, "g");
    transformedPathname = transformedPathname.replace(regex, `/[${key}]`);
  }

  return transformedPathname;
};

/**
 * Formats a route point's details into a single string representation.
 *
 * This function takes a route point object and combines its code, name and address
 * into a formatted string. The processing steps are:
 * 1. First checks if route point exists and is not empty
 * 2. Extracts and ensures code and name are strings
 * 3. Gets formatted address string using getDetailAddress helper
 * 4. Joins all non-empty parts with " - " separator
 *
 * @param {Partial<RoutePointInfo>} routePoint - The route point object containing code, name and address
 * @returns {string} A formatted string combining route point details, or empty string if no valid data
 */
export const getDetailRoutePointAddress = (routePoint?: Partial<RoutePointInfo>) => {
  // Return empty string if routePoint is null/undefined or empty object
  if (!routePoint || isEmpty(routePoint)) {
    return "";
  }

  // Convert code and name to strings, handling null/undefined cases
  const code = ensureString(routePoint.code);
  const name = ensureString(routePoint.name);
  // Get formatted address string from address object
  const address = getDetailAddress(routePoint.address);

  // Join all non-empty parts with " - " separator
  return joinNonEmptyStrings([code, name, address], " - ");
};
