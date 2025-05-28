import { BankAccount } from "@prisma/client";
import * as yup from "yup";

import { YubObjectSchema } from "@/types";
import { MetaObject } from "@/types/customField";
import { CustomerInfo } from "@/types/strapi";
import { errorFormat, errorMaxLength, errorRequired, formatErrorMessage } from "@/utils/yup";

export type CustomerInputForm = MetaObject<CustomerInfo> & {
  bankAccountId?: number | null;
  userId?: number | null;
  lastUpdatedAt?: Date | string;
  unitOfMeasureId?: number;
};

export type CustomerUpdateInputForm = {
  customer: CustomerInputForm;
  lastUpdatedAt?: Date | string;
};

export const customerInputFormSchema = yup.object<YubObjectSchema<CustomerInputForm>>({
  code: yup
    .string()
    .trim()
    .required(errorRequired("customer.customer_code"))
    .max(20, errorMaxLength(20))
    .matches(/^[a-zA-Z0-9]*$/, formatErrorMessage("customer.message.code_invalid")),
  name: yup.string().trim().required(errorRequired("customer.customer_name")).max(255, errorMaxLength(255)),
  taxCode: yup.string().trim().max(20, errorMaxLength(20)).nullable(),
  email: yup.string().trim().email(errorFormat("customer.email")).max(255, errorMaxLength(255)).nullable(),
  phoneNumber: yup.string().trim().max(20, errorMaxLength(20)).nullable(),
  website: yup.string().trim().url(errorFormat("customer.url")).max(2048, errorMaxLength(2048)).nullable(),
  businessAddress: yup.string().trim().max(255, errorMaxLength(255)).nullable(),
  contactName: yup.string().trim().max(255, errorMaxLength(255)).nullable(),
  contactPosition: yup.string().trim().max(255, errorMaxLength(255)).nullable(),
  contactEmail: yup.string().trim().email(errorFormat("customer.email")).max(255, errorMaxLength(255)).nullable(),
  contactPhoneNumber: yup.string().trim().max(20, errorMaxLength(255)).nullable(),
  bankAccount: yup.object<YubObjectSchema<BankAccount>>({
    accountNumber: yup.string().trim().max(20, errorMaxLength(20)).nullable(),
    holderName: yup.string().trim().max(50, errorMaxLength(50)).nullable(),
    bankName: yup.string().trim().max(255, errorMaxLength(255)).nullable(),
    bankBranch: yup.string().trim().max(255, errorMaxLength(255)).nullable(),
  }),
  description: yup.string().trim().max(500, errorMaxLength(500)).nullable(),
});
