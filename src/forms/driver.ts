import { DriverContractType, Gender, UploadFile } from "@prisma/client";
import * as yup from "yup";

import { YubObjectSchema } from "@/types";
import { MetaObject } from "@/types/customField";
import { BankAccountInfo, DriverInfo } from "@/types/strapi";
import { calculateDateDifferenceInDays } from "@/utils/date";
import {
  errorFormat,
  errorMax,
  errorMaxLength,
  errorMin,
  errorRequired,
  errorType,
  formatErrorMessage,
} from "@/utils/yup";

export const initialFormValues: DriverInputForm = {
  firstName: "",
  lastName: "",
  dateOfBirth: null,
  gender: Gender.UNKNOWN,
  idNumber: null,
  idIssueDate: null,
  idIssuedBy: null,
  email: null,
  phoneNumber: null,
  addressInformationId: null,
  licenseTypeId: null,
  licenseNumber: null,
  licenseIssueDate: null,
  licenseExpiryDate: null,
  licenseFrontImageId: null,
  licenseBackImageId: null,
  experienceYears: null,
  basicSalary: null,
  contractType: DriverContractType.FIXED_TERM,
  contractStartDate: null,
  contractEndDate: null,
  contractDocumentIds: null,
  bankAccountId: null,
  description: null,
  isActive: true,
  isOwnedBySubcontractor: false,
  userId: null,
  unionDues: null,
  securityDeposit: null,
  createdById: null,
  updatedById: null,
  publishedAt: null,
  bankAccount: {
    accountNumber: "",
    holderName: "",
    bankName: "",
    bankBranch: "",
  },
  address: {
    addressLine1: "",
  },
  isDeleteLicenseFrontImage: false,
  isDeleteLicenseBackImage: false,
  isDeleteContractDocuments: false,
};

export type DriverInputForm = MetaObject<Omit<DriverInfo, "contractDocuments">> & {
  isDeleteLicenseFrontImage?: boolean;
  isDeleteLicenseBackImage?: boolean;
  isDeleteContractDocuments?: boolean;
  contractDocuments?: Partial<UploadFile>;
  isOwnedBySubcontractor?: boolean;
};

export type DriverUpdateInputForm = DriverInputForm & {
  lastUpdatedAt: Date;
};

export const driverInputFormSchema = yup.object<YubObjectSchema<DriverInputForm>>({
  firstName: yup.string().trim().required(errorRequired("driver.first_name")).max(255, errorMaxLength(255)),
  lastName: yup.string().trim().required(errorRequired("driver.last_name")).max(255, errorMaxLength(255)),
  dateOfBirth: yup
    .date()
    .nullable()
    .max(new Date(), formatErrorMessage("driver.error_date_now", { date: "driver.date_of_birth" })),
  gender: yup.string().trim().required(errorRequired("driver.gender")),
  idNumber: yup.string().trim().nullable().max(20, errorMaxLength(20)),
  idIssueDate: yup
    .date()
    .nullable()
    .max(new Date(), formatErrorMessage("driver.error_date_now", { date: "driver.issue_date" })),
  idIssuedBy: yup.string().trim().nullable().max(255, errorMaxLength(255)),
  experienceYears: yup.number().nullable().min(0, errorMin(0)).max(99999999.99, errorMax(99999999.99)),
  email: yup.string().trim().nullable().email(errorFormat("driver.email")).max(255, errorMaxLength(255)),
  phoneNumber: yup.string().trim().nullable().max(20, errorMaxLength(20)),
  licenseNumber: yup.string().trim().nullable().max(20, errorMaxLength(20)),
  basicSalary: yup
    .number()
    .nullable()
    .typeError(errorType("number"))
    .min(0, errorMin(0))
    .max(99999999.99, errorMax(99999999.99)),
  unionDues: yup
    .number()
    .nullable()
    .typeError(errorType("number"))
    .min(0, errorMin(0))
    .max(9999999.99, errorMax(9999999.99)),
  securityDeposit: yup
    .number()
    .nullable()
    .typeError(errorType("number"))
    .min(0, errorMin(0))
    .max(99999999.99, errorMax(99999999.99)),
  description: yup.string().trim().nullable().max(500, errorMaxLength(500)),
  licenseIssueDate: yup.date().nullable(),
  licenseExpiryDate: yup
    .date()
    .nullable()
    .when("licenseIssueDate", (data, schema) => {
      if (data && data[0] !== null) {
        return schema.test(
          "licenseExpiryDate",
          formatErrorMessage("driver.error_invalid_date", { date: "driver.driver_license_issue_date" }),
          (licenseExpiryDate) => {
            return licenseExpiryDate ? calculateDateDifferenceInDays(licenseExpiryDate, data[0]) >= 0 : true;
          }
        );
      }
      return schema;
    }),
  contractStartDate: yup.date().nullable(),
  contractEndDate: yup
    .date()
    .nullable()
    .when("contractStartDate", (data, schema) => {
      if (data && data[0] !== null) {
        return schema.test(
          "contractEndDate",
          formatErrorMessage("driver.error_invalid_date", { date: "driver.contract_license_start_date" }),
          (contractEndDate) => {
            return contractEndDate ? calculateDateDifferenceInDays(contractEndDate, data[0]) >= 0 : true;
          }
        );
      }
      return schema;
    }),
  bankAccount: yup.object<YubObjectSchema<BankAccountInfo>>({
    accountNumber: yup.string().trim().nullable().max(20, errorMaxLength(20)),
    holderName: yup.string().trim().nullable().max(50, errorMaxLength(50)),
    bankName: yup.string().trim().nullable().max(255, errorMaxLength(255)),
    bankBranch: yup.string().trim().nullable().max(255, errorMaxLength(255)),
  }),
  address: yup.object().shape({
    addressLine1: yup.string().trim().nullable().max(255, errorMaxLength(255)),
  }),
});

export const driverCreateModalFormSchema = yup.object<YubObjectSchema<DriverInputForm>>({
  firstName: yup.string().trim().required(errorRequired("driver.first_name")).max(255, errorMaxLength(255)),
  lastName: yup.string().trim().required(errorRequired("driver.last_name")).max(255, errorMaxLength(255)),
  dateOfBirth: yup
    .date()
    .nullable()
    .max(new Date(), formatErrorMessage("driver.error_date_now", { date: "driver.date_of_birth" })),
  gender: yup.string().trim().required(errorRequired("driver.gender")),
  idNumber: yup.string().trim().nullable().max(20, errorMaxLength(20)),
  idIssueDate: yup
    .date()
    .nullable()
    .max(new Date(), formatErrorMessage("driver.error_date_now", { date: "driver.issue_date" })),
  idIssuedBy: yup.string().trim().nullable().max(255, errorMaxLength(255)),
  experienceYears: yup.number().nullable().min(0, errorMin(0)).max(99999999.99, errorMax(99999999.99)),
  email: yup.string().trim().nullable().email(errorFormat("driver.email")).max(255, errorMaxLength(255)),
  phoneNumber: yup.string().trim().nullable().max(20, errorMaxLength(20)),
  licenseNumber: yup.string().trim().nullable().max(20, errorMaxLength(20)),
  basicSalary: yup
    .number()
    .nullable()
    .typeError(errorType("number"))
    .min(0, errorMin(0))
    .max(99999999.99, errorMax(99999999.99)),
  licenseIssueDate: yup.date().nullable(),
  licenseExpiryDate: yup
    .date()
    .nullable()
    .when("licenseIssueDate", (data, schema) => {
      if (data && data[0] !== null) {
        return schema.test(
          "licenseExpiryDate",
          formatErrorMessage("driver.error_invalid_date", { date: "driver.driver_license_issue_date" }),
          (licenseExpiryDate) => {
            return licenseExpiryDate ? calculateDateDifferenceInDays(licenseExpiryDate, data[0]) >= 0 : true;
          }
        );
      }
      return schema;
    }),
  address: yup.object().shape({
    addressLine1: yup.string().trim().nullable().max(255, errorMaxLength(255)),
  }),
});
