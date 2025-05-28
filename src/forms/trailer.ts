import { TrailerOwnerType } from "@prisma/client";
import * as yup from "yup";

import { YubObjectSchema } from "@/types";
import { Meta, MetaObject } from "@/types/customField";
import { TrailerInfo } from "@/types/strapi";
import { errorFormat, errorMax, errorMaxLength, errorMin, errorRequired, formatErrorMessage } from "@/utils/yup";

export const initialFormValues: TrailerInputForm = {
  ownerType: TrailerOwnerType.ORGANIZATION,
  trailerNumber: "",
  idNumber: "",
  typeId: null,
  brand: "",
  yearOfManufacture: null,
  color: "",
  startUsageDate: null,
  maxLength: null,
  maxWidth: null,
  maxHeight: null,
  cubicMeterCapacity: null,
  tonPayloadCapacity: null,
  palletCapacity: null,
  registrationCertificateId: null,
  registrationDate: null,
  registrationExpirationDate: null,
  technicalSafetyCertificateId: null,
  technicalSafetyRegistrationDate: null,
  technicalSafetyExpirationDate: null,
  liabilityInsuranceCertificateId: null,
  liabilityInsuranceRegistrationDate: null,
  liabilityInsuranceExpirationDate: null,
  isActive: true,
  description: "",
  images: null,
  liabilityInsuranceCertificate: null,
  registrationCertificate: null,
  technicalSafetyCertificate: null,
};

export type TrailerInputForm = MetaObject<TrailerInfo>;

export type TrailerEditForm = TrailerInfo &
  Meta & {
    lastUpdatedAt: Date | string;
    deleteImage?: [number] | null;
    liabilityInsuranceCertificateIdOld: number | null;
    registrationCertificateIdOld: number | null;
    technicalSafetyCertificateIdOld: number | null;
    deleteRegistrationCertificate?: boolean;
    deleteTechnicalSafetyCertificate?: boolean;
    deleteLiabilityInsuranceCertificate?: boolean;
  };

export const trailerInputFormSchema = yup.object<YubObjectSchema<TrailerInputForm>>({
  trailerNumber: yup.string().trim().required(errorRequired("trailer.trailer_number")).max(20, errorMaxLength(20)),
  idNumber: yup.string().trim().max(20, errorMaxLength(20)).nullable(),
  brand: yup.string().trim().max(255, errorMaxLength(255)).nullable(),
  model: yup.string().trim().max(255, errorMaxLength(255)).nullable(),
  yearOfManufacture: yup.number().nullable(),
  color: yup.string().trim().max(20, errorMaxLength(20)).nullable(),
  startUsageDate: yup.date().typeError(errorFormat("trailer.usage_date")).nullable(),
  maxLength: yup.number().min(0, errorMin(0)).max(999999999.99, errorMax(999999999.99)).nullable(),
  maxWidth: yup.number().min(0, errorMin(0)).max(999999999.99, errorMax(999999999.99)).nullable(),
  maxHeight: yup.number().min(0, errorMin(0)).max(999999999.99, errorMax(999999999.99)).nullable(),
  cubicMeterCapacity: yup.number().min(0, errorMin(0)).max(999999999.99, errorMax(999999999.99)).nullable(),
  tonPayloadCapacity: yup.number().min(0, errorMin(0)).max(999999999.99, errorMax(999999999.99)).nullable(),
  palletCapacity: yup.number().min(0, errorMin(0)).max(999999999.99, errorMax(999999999.99)).nullable(),
  registrationDate: yup.date().typeError(errorFormat("trailer.license_registration_date")).nullable(),
  registrationExpirationDate: yup
    .date()
    .typeError(errorFormat("trailer.license_expiration_date"))
    .when("registrationDate", (registrationDate, schema) => {
      return registrationDate[0] !== null
        ? schema.min(
            registrationDate,
            formatErrorMessage("trailer.error_invalid_date", { date: "trailer.license_registration_date" })
          )
        : schema;
    })
    .nullable(),
  technicalSafetyRegistrationDate: yup
    .date()
    .typeError(errorFormat("trailer.technical_safety_registration_date"))
    .nullable(),
  technicalSafetyExpirationDate: yup
    .date()
    .typeError(errorFormat("trailer.technical_safety_expiration_date"))
    .when("technicalSafetyRegistrationDate", (technicalSafetyRegistrationDate, schema) => {
      return technicalSafetyRegistrationDate[0] !== null
        ? schema.min(
            technicalSafetyRegistrationDate,
            formatErrorMessage("trailer.error_invalid_date", { date: "trailer.technical_safety_registration_date" })
          )
        : schema;
    })
    .nullable(),
  liabilityInsuranceRegistrationDate: yup
    .date()
    .typeError(errorFormat("trailer.insurance_registration_date"))
    .nullable(),
  liabilityInsuranceExpirationDate: yup
    .date()
    .typeError(errorFormat("trailer.insurance_expiration_date"))
    .when("liabilityInsuranceRegistrationDate", (liabilityInsuranceRegistrationDate, schema) => {
      return liabilityInsuranceRegistrationDate[0] !== null
        ? schema.min(
            liabilityInsuranceRegistrationDate,
            formatErrorMessage("trailer.error_invalid_date", { date: "trailer.insurance_registration_date" })
          )
        : schema;
    })
    .nullable(),
  description: yup.string().trim().max(500, errorMaxLength(500)).nullable(),
});
