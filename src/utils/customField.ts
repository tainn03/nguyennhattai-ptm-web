/* eslint-disable @typescript-eslint/no-explicit-any */
import { CustomFieldDataType, CustomFieldType, Prisma } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz/formatInTimeZone";
import cloneDeep from "lodash/cloneDeep";
import get from "lodash/get";
import reduce from "lodash/reduce";
import * as yup from "yup";

import { AnyObject, YubObjectSchema } from "@/types";
import { CustomFieldMetaType, Meta } from "@/types/customField";
import { CustomFieldInfo } from "@/types/strapi";
import { equalId } from "@/utils/number";
import { ensureString, isTrue, slugifyString, trim } from "@/utils/string";
import { errorFormat, errorMax, errorMaxLength, errorMin, errorRequired, formatErrorMessage } from "@/utils/yup";

/**
 * Get values of meta data by attribute name
 * @param {string} attributeName - The name of attribute in meta data object
 * @param {Prisma.JsonValue | null} metaData - The object data value
 * @returns {Meta} - The object contains values of meta data
 */
export const generateCustomFieldMeta = (
  customFields: CustomFieldInfo[],
  metaData?: Prisma.JsonValue | null
): [Meta, CustomFieldMetaType[]] => {
  let metaCustomFields: CustomFieldMetaType[] | undefined = undefined;
  if (metaData) {
    const meta = metaData as Prisma.JsonObject;
    metaCustomFields = meta["customFields"] as CustomFieldMetaType[];
  }

  const customFieldMeta: Meta = {};
  const customFieldMetaFileList: CustomFieldMetaType[] = [];
  for (const item of customFields ?? []) {
    const metaCustomField = metaCustomFields?.find((c) => equalId(item.id, c.id));
    if (metaCustomField) {
      if (metaCustomField.dataType === CustomFieldDataType.FILE) {
        customFieldMetaFileList.push(metaCustomField);
      }
      const checkType = metaCustomField.dataType === item.dataType;
      customFieldMeta[item.id] = checkType ? metaCustomField.value : null;
    } else {
      customFieldMeta[item.id] = null;
    }
  }

  return [customFieldMeta, customFieldMetaFileList];
};

/**
 * Adds or modifies a required validation for a specific key in a Yup schema.
 *
 * @param {YubObjectSchema<AnyObject>} schema - The Yup schema object to which the validation will be added.
 * @param {string} key - The key (property) for which the validation will be applied.
 * @param {string} label - The human-readable label for the key, used for error messages.
 * @param {boolean} isRequired - A boolean indicating whether the key is required or not.
 * @returns YubObjectSchema<AnyObject> - The modified Yup schema with the added validation.
 */
const addRequiredValidation = (
  schema: YubObjectSchema<AnyObject>,
  key: string,
  label: string,
  isRequired: boolean
): YubObjectSchema<AnyObject> => {
  const cloneSchema = schema;
  if (isRequired) {
    cloneSchema[key] = cloneSchema[key].required(errorRequired(label));
  } else {
    cloneSchema[key] = cloneSchema[key].nullable();
  }
  return cloneSchema;
};

/**
 * Adds or modifies length validation for a specific key in a Yup schema.
 *
 * @param {YubObjectSchema<AnyObject>} schema - The Yup schema object to which the validation will be added.
 * @param {string} key - The key (property) for which the length validation will be applied.
 * @param {number | null} min - The minimum length allowed for the key's value (null if no minimum).
 * @param {number | null} max - The maximum length allowed for the key's value (null if no maximum).
 * @returns YubObjectSchema<AnyObject> - The modified Yup schema with the added length validation.
 */
const addLengthValidation = (
  schema: YubObjectSchema<AnyObject>,
  key: string,
  min: number | null,
  max: number | null
): YubObjectSchema<AnyObject> => {
  const cloneSchema = schema;

  if (min) {
    cloneSchema[key] = cloneSchema[key].min(min, formatErrorMessage("error.min_length", { length: min }));
  }

  if (max) {
    cloneSchema[key] = cloneSchema[key].max(max, errorMaxLength(max));
  }

  return cloneSchema;
};

/**
 * Adds or modifies regex pattern validation for a specific key in a Yup schema.
 *
 * @param {YubObjectSchema<AnyObject>} schema - The Yup schema object to which the validation will be added.
 * @param {string} key - The key (property) for which the regex pattern validation will be applied.
 * @param {string} label - The human-readable label for the key, used for error messages.
 * @param {string | null} validationRegex - The regex pattern used for validation (null if no pattern).
 * @returns YubObjectSchema<AnyObject> - The modified Yup schema with the added regex pattern validation.
 */
const addRegexValidation = (
  schema: YubObjectSchema<AnyObject>,
  key: string,
  label: string,
  validationRegex: string | null
): YubObjectSchema<AnyObject> => {
  const cloneSchema = schema;

  if (validationRegex) {
    // Remove leading and trailing forward slashes
    const cleanedRegexString = validationRegex.replace(/^\/|\/$/g, "");

    cloneSchema[key] = cloneSchema[key].matches(
      new RegExp(cleanedRegexString),
      formatErrorMessage("error.invalid_format", { label: label })
    );
  }
  return cloneSchema;
};

/**
 * Adds or modifies range validation for a specific key in a Yup schema.
 *
 * @param {YubObjectSchema<AnyObject>} schema - The Yup schema object to which the validation will be added.
 * @param {string} key - The key (property) for which the range validation will be applied.
 * @param {number | null} min - The minimum value allowed for the key's value (null if no minimum).
 * @param {number | null} max - The maximum value allowed for the key's value (null if no maximum).
 * @returns YubObjectSchema<AnyObject> - The modified Yup schema with the added range validation.
 */
const addInRangeValidation = (
  schema: YubObjectSchema<AnyObject>,
  key: string,
  min: number | null,
  max: number | null
): YubObjectSchema<AnyObject> => {
  const cloneSchema = schema;

  if (min) {
    cloneSchema[key] = cloneSchema[key].min(min, errorMin(min));
  }
  if (max) {
    cloneSchema[key] = cloneSchema[key].max(max, errorMax(max));
  }
  return cloneSchema;
};

/**
 * Creates a validation schema based on the given custom fields.
 *
 * @param {CustomFieldInfo[]} customFields - The array of custom field information.
 * @return {YubObjectSchema<AnyObject>} The validation schema.
 */
export const createValidationSchema = (customFields: CustomFieldInfo[]): YubObjectSchema<AnyObject> => {
  // Initialize an empty schema object
  let schema: YubObjectSchema<AnyObject> = {};
  customFields.map((item: CustomFieldInfo) => {
    const key = ensureString(item.id);

    switch (item.dataType) {
      case CustomFieldDataType.TEXT: {
        schema[key] = yup.string().trim();
        // Check require
        schema = addRequiredValidation(schema, key, item.name, item.isRequired);
        // Check min length && max length
        schema = addLengthValidation(schema, key, item.min, item.max ?? 500);
        // Check regex
        schema = addRegexValidation(schema, key, item.name, item.validationRegex);
        break;
      }
      case CustomFieldDataType.EMAIL: {
        schema[key] = yup.string().trim();
        // Check email
        schema[key] = schema[key].email(errorFormat("customer.email"));
        // Check require
        schema = addRequiredValidation(schema, key, item.name, item.isRequired);
        // Check regex
        schema = addRegexValidation(schema, key, item.name, item.validationRegex);
        // Check min length && max length
        schema = addLengthValidation(schema, key, 0, 255);
        break;
      }
      case CustomFieldDataType.NUMBER: {
        schema[key] = yup.number().nullable();
        // Check require
        schema = addRequiredValidation(schema, key, item.name, item.isRequired);
        // Check min value && max value
        schema = addInRangeValidation(schema, key, item.min, item.max ?? 999999999.99);
        break;
      }
      case CustomFieldDataType.DATE: {
        schema[key] = yup.date().nullable();
        // Check require
        schema = addRequiredValidation(schema, key, item.name, item.isRequired);
        break;
      }
      case CustomFieldDataType.DATETIME: {
        schema[key] = yup.date().nullable();
        // Check require
        schema = addRequiredValidation(schema, key, item.name, item.isRequired);
        break;
      }
      case CustomFieldDataType.BOOLEAN: {
        schema[key] = yup.boolean().nullable();
        break;
      }
      case CustomFieldDataType.FILE: {
        schema[key] = yup.array().nullable();
        // Check require
        schema = addRequiredValidation(schema, key, item.name, item.isRequired);
        break;
      }
      case CustomFieldDataType.CHOICE: {
        schema[key] = yup.string().nullable();
        // Check require
        schema = addRequiredValidation(schema, key, item.name, item.isRequired);
        break;
      }

      default:
        break;
    }
  });

  return schema;
};

/**
 * Process custom fields from the entities object based on the provided customFields array.
 *
 * @param {CustomFieldInfo[]} customFields - An array of custom field information.
 * @param {AnyObject} entities - The object from which the custom fields will be removed.
 * @return {AnyObject} The updated entities object with the custom fields removed.
 */
export const processingCustomField = <T>(customFields: CustomFieldInfo[], entities: AnyObject): T => {
  const keysToRemove = new Set(customFields.map((field) => ensureString(field.id)));
  const updatedEntities = cloneDeep(entities);

  const customFieldData: CustomFieldMetaType[] = [];
  for (const field of customFields) {
    customFieldData.push({
      id: field.id,
      value: entities[field.id] ?? null,
      dataType: field.dataType,
      ...(field.type === CustomFieldType.ORDER_TRIP && {
        canViewByDriver: field.canViewByDriver ?? false,
        canEditByDriver: field.canEditByDriver ?? false,
      }),
    });
  }

  for (const key in updatedEntities) {
    if (keysToRemove.has(key)) {
      delete updatedEntities[key];
    }
  }

  return {
    ...updatedEntities,
    meta: {
      customFields: customFieldData,
    },
  } as T;
};

/**
 * Validates if the input string is in the correct format:
 * each line is a data point,
 * each line is split by a comma,
 * each line data must be in the format <label>,<color_code>
 * and the color_code must be a valid hex color code.
 *
 * @param input - The input string to validate.
 * @returns boolean - Returns true if the input string is valid, otherwise false.
 */
export function isValidChoiceData(input: string | null | undefined): boolean {
  if (!input) {
    return false;
  }
  const lines = input.split("\n");
  if (lines.length < 2) {
    return false;
  }
  const hexColorRegex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
  for (const line of lines) {
    const [label, colorCode] = line.split(",");
    if (trim(label) === "" || label === undefined || trim(label).length > 100) {
      return false;
    }
    if (colorCode && !hexColorRegex.test(colorCode.trim())) {
      return false;
    }
  }
  return true;
}

/**
 * Converts a string value to a specific type based on the provided value type.
 *
 * @param {string} value - The string value to be converted.
 * @param {CustomFieldDataType} valueType - The type to which the value should be converted.
 * @param {string} clientTimezone - The client timezone used for date and datetime conversion.
 * @returns {boolean | number | object | Date | string} - The converted value.
 */
const convertCustomFieldValueBasedOnType = (
  value: string | null,
  valueType: CustomFieldDataType,
  clientTimezone: string
) => {
  switch (valueType) {
    case CustomFieldDataType.BOOLEAN:
      return isTrue(value);
    case CustomFieldDataType.NUMBER:
      return Number(value);
    case CustomFieldDataType.DATE:
      return value ? formatInTimeZone(value, clientTimezone, "yyyy-MM-dd") : null;
    case CustomFieldDataType.DATETIME:
      return value ? formatInTimeZone(value, clientTimezone, "yyyy-MM-dd HH:mm:ss") : null;
    default:
      return value;
  }
};

/**
 * Transforms custom fields from the input object into a specific format.
 *
 * @param key - The key prefix to use for the transformed custom fields.
 * @param clientTimezone - Optional. The client's timezone to convert field values based on their type.
 * @param input - Optional. The input object or JSON string containing custom fields.
 * @returns A record where each key is a combination of the provided key and the custom field ID, and each value is the transformed custom field value.
 *
 */
export const transformCustomFields = (
  key: string,
  clientTimezone?: string,
  input?: AnyObject | string
): Record<string, any> => {
  // If input is a string, parse it to an object
  if (typeof input === "string") {
    try {
      input = JSON.parse(input);
    } catch (error) {
      console.error("Failed to parse input JSON", error);
      return {};
    }
  }

  // Safely get customFields array using lodash
  const customFields = get(input, "customFields", []) as CustomFieldInfo[];

  // Reduce customFields to the desired output format
  return reduce<CustomFieldInfo, Record<string, any>>(
    customFields,
    (acc, field) => {
      acc[`${slugifyString(key, { separator: "_" })}_${field.id}`] = clientTimezone
        ? convertCustomFieldValueBasedOnType(field.value, field.dataType, clientTimezone)
        : field.value;
      return acc;
    },
    {}
  );
};
