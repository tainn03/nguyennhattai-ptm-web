import * as yup from "yup";

import { PATTERN_PROPERTY_NAMING } from "@/constants/regexp";
import { YubObjectSchema } from "@/types";
import { DriverExpenseInfo } from "@/types/strapi";
import { errorMaxLength, errorRequired, formatErrorMessage } from "@/utils/yup";

export type DriverExpenseInputForm = Partial<DriverExpenseInfo>;

export type UpdateDisplayOrderDriverExpenseForm = {
  organizationId: number;
  driverExpenses: DriverExpenseInputForm[];
  updatedById: number;
};

export const driverExpenseInputFormSchema = yup.object<YubObjectSchema<DriverExpenseInputForm>>({
  name: yup.string().trim().required(errorRequired("driver_expense.name")).max(255, errorMaxLength(255)),
  description: yup.string().trim().nullable().max(500, errorMaxLength(500)),
  key: yup
    .string()
    .trim()
    .required(errorRequired("driver_expense.key"))
    .matches(PATTERN_PROPERTY_NAMING, formatErrorMessage("driver_expense.key_error_format"))
    .max(255, errorMaxLength(255)),
});
