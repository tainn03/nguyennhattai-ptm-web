/* eslint-disable @typescript-eslint/no-explicit-any */

import numeral from "numeral";

import { ensureString } from "./string";

numeral.register("locale", "vi", {
  delimiters: {
    thousands: ".",
    decimal: ",",
  },
  abbreviations: {
    thousand: "k",
    million: "tr",
    billion: "ty",
    trillion: "ty",
  },
  ordinal: () => "",
  currency: {
    symbol: "₫",
  },
});

/**
 * Return a random integer between minimum and maximum (inclusive).
 *
 * @param minimum - The minimum value of the range.
 * @param maximum - The maximum value of the range.
 * @returns A random integer between minimum and maximum.
 */
export const randomInt = (minimum: number, maximum: number): number => {
  const min = Math.ceil(minimum);
  const max = Math.floor(maximum);
  return Math.floor(Math.random() * (max - min + 1) + min);
};

/**
 * Check if a value is numeric.
 * @param value - The value to check.
 * @returns True if the value is numeric, otherwise false.
 */
export const isNumeric = (value: any): boolean => {
  if (value === null || value === undefined) {
    return false;
  }

  const stringValue = ensureString(value).trim();
  if (stringValue.length === 0) {
    return false;
  }

  const numericRegex = /^-?\d*\.?\d+$/;
  return numericRegex.test(stringValue);
};

/**
 * Format a value as currency using the provided locale and currency code.
 *
 * @param value - The value to be formatted as currency (number or string).
 * @param locale - The locale to be used for formatting (default: "vi-VN").
 * @param currency - The currency code to be used for formatting (default: "₫").
 * @returns A string representing the formatted value as currency.
 */
export const formatCurrency = (value: number | string, locale: string = "vi-VN", currency: string = "VND"): string => {
  if (!isNumeric(value)) {
    return "";
  }

  const formattedNumber = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value));
  return formattedNumber;
};

/**
 * Formats a number according to the specified locale.
 *
 * @param {number | string} value - The number to format.
 * @param {string} [locale="vi-VN"] - The locale to use for formatting.
 * @returns {string} - The formatted number as a string.
 */
export const formatNumber = (value: number | string, locale: string = "vi"): string => {
  if (!isNumeric(value)) {
    return "";
  }
  return value.toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

/**
 * Compares two IDs (numbers or strings) to check if they are equal.
 * It returns true if both IDs are defined and have the same numeric value, otherwise, it returns false.
 *
 * @param {number | string | undefined | null} firstId - The first ID for comparison.
 * @param {number | string | undefined | null} secondId - The second ID for comparison.
 * @returns {boolean} - True if both IDs are defined and have the same numeric value, otherwise false.
 */
export const equalId = (firstId?: number | string | null, secondId?: number | string | null): boolean => {
  return (firstId && secondId && Number(firstId) === Number(secondId)) || false;
};
