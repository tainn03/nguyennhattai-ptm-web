import { CustomField, CustomFieldDataType } from "@prisma/client";
import * as yup from "yup";

import { PATTERN_PROPERTY_NAMING } from "@/constants/regexp";
import { YubObjectSchema } from "@/types";
import { isValidChoiceData } from "@/utils/customField";
import { isRegexValid } from "@/utils/validation";
import { errorFormat, errorMaxLength, errorMin, errorRequired, errorType, formatErrorMessage } from "@/utils/yup";

export type CustomFieldInputForm = Partial<CustomField>;

export const customFieldInputFormSchema = yup.object<YubObjectSchema<CustomFieldInputForm>>({
  name: yup.string().trim().required(errorRequired("custom_field.name")).max(255, errorMaxLength(255)),
  key: yup
    .string()
    .trim()
    .required(errorRequired("custom_field.key"))
    .matches(PATTERN_PROPERTY_NAMING, formatErrorMessage("custom_field.key_error_format"))
    .max(255, errorMaxLength(255)),
  min: yup
    .number()
    .nullable()
    .typeError(errorType("number"))
    .when("dataType", (data, schema) => {
      if (data[0] === CustomFieldDataType.TEXT) {
        return schema.test("min", errorMin(0), (min) => (min ? Number(min) >= 0 : true));
      } else {
        return schema;
      }
    }),
  max: yup
    .number()
    .typeError(errorType("number"))
    .nullable()
    .when(["dataType", "min"], (data, schema) => {
      const dataType = data[0];
      const min = data[1];
      if (dataType === CustomFieldDataType.TEXT || dataType === CustomFieldDataType.NUMBER) {
        return min
          ? schema.test("max", errorMin(min), (max) => {
              return max ? Number(max) > Number(min) : true;
            })
          : schema;
      } else {
        return schema;
      }
    }),
  validationRegex: yup
    .string()
    .trim()
    .nullable()
    .max(255, errorMaxLength(255))
    .test("isRegExp", errorFormat("custom_field.regex"), isRegexValid),
  description: yup.string().trim().nullable().max(500, errorMaxLength(500)),
  value: yup
    .string()
    .trim()
    .nullable()
    .when(["dataType"], (data, schema) => {
      if (data[0] && data[0] === CustomFieldDataType.CHOICE) {
        return schema.test("value", formatErrorMessage("custom_field.value_error_format"), (input) => {
          return isValidChoiceData(input);
        });
      }
      return schema;
    }),
  displayOrder: yup
    .number()
    .nullable()
    .typeError(errorType("number"))
    .max(255, errorMaxLength(255))
    .min(1, errorMin(1)),
});
