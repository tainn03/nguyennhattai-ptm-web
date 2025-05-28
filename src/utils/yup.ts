import { AnyObject } from "@/types";

/**
 * Formats a Yup error message with the given key and additional object properties.
 *
 * @param {string} key - The error key, e.g., "error.required".
 * @param {YupObject} object - Additional object properties to include in the formatted message.
 * @returns {string} - A JSON-formatted error message.
 */
export const formatErrorMessage = (key: string, object?: AnyObject) => {
  return JSON.stringify({ error: key, ...object });
};

/**
 * Formats a Yup error message for a required field.
 *
 * @param {string} label - The label of the required field.
 * @returns {string} - A JSON-formatted error message.
 */
export const errorRequired = (label: string) => {
  return formatErrorMessage("error.required", { label });
};

/**
 * Formats a Yup error message for a exists value.
 *
 * @param {string} name - The name of the exist field.
 * @returns {string} - A JSON-formatted error message.
 */
export const errorExists = (name: string) => {
  return formatErrorMessage("error.exists", { name });
};

/**
 * Formats a Yup error message for a maximum length constraint.
 *
 * @param {number} length - The maximum length allowed.
 * @returns {string} - A JSON-formatted error message.
 */
export const errorMaxLength = (length: number) => {
  return formatErrorMessage("error.max_length", { length });
};

/**
 * Formats a Yup error message for exceeding the maximum value.
 *
 * @param {number} max - The maximum value allowed.
 * @returns {string} - A JSON-formatted error message.
 */
export const errorMax = (max: number) => {
  return formatErrorMessage("error.max", { max });
};

/**
 * Formats a Yup error message for falling below the minimum value.
 *
 * @param {number} min - The minimum value allowed.
 * @returns {string} - A JSON-formatted error message.
 */
export const errorMin = (min: number) => {
  return formatErrorMessage("error.min", { min });
};

/**
 * Formats a Yup error message for an invalid data type.
 *
 * @param {string} type - The data type that is considered invalid.
 * @returns {string} - A JSON-formatted error message.
 */
export const errorType = (type: string) => {
  return formatErrorMessage("error.invalid_data_type", { type });
};

/**
 * Formats a Yup error message for an invalid format.
 *
 * @param {string} label - The label of the invalid format.
 * @returns {string} - A JSON-formatted error message.
 */
export const errorFormat = (label: string) => {
  return formatErrorMessage("error.invalid_format", { label });
};

/**
 * Formats a Yup error message for an invalid password format.
 *
 * @returns {string} - A JSON-formatted error message.
 */
export const errorPasswordFormat = () => {
  return formatErrorMessage("error.invalid_password");
};

/**
 * Formats a Yup error message for an invalid confirmation password.
 *
 * @returns {string} - A JSON-formatted error message.
 */
export const errorConfirmPassword = () => {
  return formatErrorMessage("error.invalid_confirm_password");
};

/**
 * Translates and formats a JSON-formatted error message using the provided translation function (t).
 *
 * @param {function} t - The translation function (e.g., from next-intl).
 * @param {string | false} error - The JSON-formatted error message.
 * @returns {string} - The translated and formatted error message.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const formatError = (t: any, error?: string | false) => {
  if (error) {
    const { error: key, ...errorObject }: AnyObject = JSON.parse(error);
    let params = {};
    Object.keys(errorObject).forEach((key) => {
      const value = typeof errorObject[key] === "string" ? t(errorObject[key]) : errorObject[key];
      params = { ...params, [key]: value };
    });
    return t(key, params);
  }
  return "";
};
