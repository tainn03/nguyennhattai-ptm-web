import * as yup from "yup";

import { PATTERN_PROPERTY_NAMING } from "@/constants/regexp";
import { YubObjectSchema } from "@/types";
import { ExpenseTypeInfo } from "@/types/strapi";
import { errorMaxLength, errorRequired, formatErrorMessage } from "@/utils/yup";

export type ExpenseTypeInputForm = Partial<ExpenseTypeInfo>;

export const expenseTypeInputFormSchema = yup.object<YubObjectSchema<ExpenseTypeInputForm>>({
  name: yup.string().trim().required(errorRequired("expense_type.name")).max(255, errorMaxLength(255)),
  description: yup.string().trim().nullable().max(500, errorMaxLength(500)),
  key: yup
    .string()
    .trim()
    .required(errorRequired("expense_type.key"))
    .matches(PATTERN_PROPERTY_NAMING, formatErrorMessage("expense_type.key_error_format"))
    .max(255, errorMaxLength(255)),
});
