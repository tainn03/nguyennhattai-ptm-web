import * as yup from "yup";

import { YubObjectSchema } from "@/types";
import { MetaObject } from "@/types/customField";
import { BankAccountInfo, SubcontractorInfo } from "@/types/strapi";
import { errorFormat, errorMax, errorMaxLength, errorRequired, formatErrorMessage } from "@/utils/yup";

export const initialFormValues: SubcontractorInputForm = {
  code: "",
  name: "",
  taxCode: "",
  email: "",
  phoneNumber: "",
  website: "",
  businessAddress: "",
  isActive: true,
  userId: null,
  documentsId: null,
  bankAccount: {
    accountNumber: "",
    holderName: "",
    bankName: "",
    bankBranch: "",
  },
};

export type SubcontractorInputForm = MetaObject<SubcontractorInfo & { document: string; fileId: number }>;

export type SubcontractorUpdateForm = SubcontractorInfo & {
  deleteDocument: boolean;
  document: string | null;
  oldDocumentId: number | null;
  oldMemberUserId: number | null;
  lastUpdatedAt: Date | string;
};

export const subcontractorInputFormSchema = yup.object<YubObjectSchema<SubcontractorInputForm>>({
  code: yup
    .string()
    .required(errorRequired("subcontractor.code"))
    .trim()
    .max(20, errorMaxLength(20))
    .matches(/^[a-zA-Z0-9]*$/, formatErrorMessage("subcontractor.message.code_invalid")),
  name: yup.string().required(errorRequired("subcontractor.name")).trim().max(255, errorMaxLength(255)),
  taxCode: yup.string().trim().max(20, errorMaxLength(20)).nullable(),
  email: yup.string().trim().email(errorFormat("subcontractor.email")).max(255, errorMaxLength(255)).nullable(),
  phoneNumber: yup.string().trim().max(20, errorMaxLength(20)).nullable(),
  website: yup.string().trim().url(errorFormat("subcontractor.website")).max(2048, errorMaxLength(2048)).nullable(),
  businessAddress: yup.string().trim().max(255, errorMaxLength(255)).nullable(),
  description: yup.string().trim().nullable().max(500, errorMaxLength(500)),
  bankAccount: yup.object<YubObjectSchema<BankAccountInfo>>({
    accountNumber: yup.string().trim().max(20, errorMax(20)).nullable(),
    holderName: yup.string().trim().max(50, errorMax(50)).nullable(),
    bankName: yup.string().trim().max(255, errorMax(255)).nullable(),
    bankBranch: yup.string().trim().max(255, errorMax(255)).nullable(),
  }),
});
