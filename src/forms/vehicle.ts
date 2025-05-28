import { VehicleOwnerType } from "@prisma/client";
import * as yup from "yup";

import { YubObjectSchema } from "@/types";
import { MetaObject } from "@/types/customField";
import { VehicleInfo } from "@/types/strapi";
import {
  errorFormat,
  errorMax,
  errorMaxLength,
  errorMin,
  errorRequired,
  errorType,
  formatErrorMessage,
} from "@/utils/yup";

export const initialFormValues: VehicleInputForm = {
  ownerType: VehicleOwnerType.ORGANIZATION,
  vehicleNumber: "",
  idNumber: "",
  typeId: null,
  brand: "",
  model: "",
  yearOfManufacture: null,
  color: "",
  startUsageDate: null,
  maxLength: null,
  maxWidth: null,
  maxHeight: null,
  cubicMeterCapacity: null,
  tonPayloadCapacity: null,
  palletCapacity: null,
  registrationDate: null,
  registrationExpirationDate: null,
  technicalSafetyRegistrationDate: null,
  technicalSafetyExpirationDate: null,
  liabilityInsuranceRegistrationDate: null,
  liabilityInsuranceExpirationDate: null,
  driverId: null,
  trailerId: null,
  isActive: true,
  description: "",
  images: null,
  liabilityInsuranceCertificate: null,
  registrationCertificate: null,
  technicalSafetyCertificate: null,
  registrationCertificateImageId: null,
  technicalSafetyCertificateImageId: null,
  liabilityInsuranceCertificateImageId: null,
  fuelConsumption: null,
};

export type VehicleInputForm = MetaObject<
  VehicleInfo & {
    idImages: Array<number> | null;
  }
>;

export type VehicleInfoUpdateForm = VehicleInfo & {
  idImages: Array<number> | null;
  lastUpdatedAt: Date | string;
  deleteImage?: [number] | null;
  deleteRegistrationCertificate?: boolean;
  deleteTechnicalSafetyCertificate?: boolean;
  deleteLiabilityInsuranceCertificate?: boolean;
};

export const vehicleInfoInputFormSchema = yup.object<YubObjectSchema<VehicleInputForm>>({
  vehicleNumber: yup.string().trim().required(errorRequired("vehicle.vehicle_number")).max(20, errorMaxLength(20)),
  idNumber: yup.string().trim().max(20, errorMaxLength(20)).nullable(),
  brand: yup.string().trim().max(255, errorMaxLength(255)).nullable(),
  model: yup.string().trim().max(255, errorMaxLength(255)).nullable(),
  yearOfManufacture: yup.number().nullable(),
  color: yup.string().trim().max(20, errorMaxLength(20)).nullable(),
  maxLength: yup
    .number()
    .typeError(errorType("number"))
    .min(0, errorMin(0))
    .max(99999999.99, errorMax(99999999.99))
    .nullable(),
  maxWidth: yup
    .number()
    .typeError(errorType("number"))
    .min(0, errorMin(0))
    .max(99999999.99, errorMax(99999999.99))
    .nullable(),
  maxHeight: yup
    .number()
    .typeError(errorType("number"))
    .min(0, errorMin(0))
    .max(99999999.99, errorMax(99999999.99))
    .nullable(),
  cubicMeterCapacity: yup
    .number()
    .typeError(errorType("number"))
    .min(0, errorMin(0))
    .max(99999999.99, errorMax(99999999.99))
    .nullable(),
  tonPayloadCapacity: yup
    .number()
    .typeError(errorType("number"))
    .min(0, errorMin(0))
    .max(99999999.99, errorMax(99999999.99))
    .nullable(),
  palletCapacity: yup
    .number()
    .typeError(errorType("number"))
    .min(0, errorMin(0))
    .max(99999999.99, errorMax(99999999.99))
    .nullable(),
  registrationDate: yup.date().typeError(errorFormat("vehicle.license_registration_date")).nullable(),
  registrationExpirationDate: yup
    .date()
    .typeError(errorFormat("vehicle.license_expiration_date"))
    .when("registrationDate", (registrationDate, schema) => {
      return registrationDate[0] !== null
        ? schema.min(
            registrationDate,
            formatErrorMessage("vehicle.error_invalid_date", { date: "vehicle.license_registration_date" })
          )
        : schema;
    })
    .nullable(),
  technicalSafetyRegistrationDate: yup
    .date()
    .typeError(errorFormat("vehicle.technical_safety_registration_date"))
    .nullable(),
  technicalSafetyExpirationDate: yup
    .date()
    .typeError(errorFormat("vehicle.technical_safety_expiration_date"))
    .when("technicalSafetyRegistrationDate", (technicalSafetyRegistrationDate, schema) => {
      return technicalSafetyRegistrationDate[0] !== null
        ? schema.min(
            technicalSafetyRegistrationDate,
            formatErrorMessage("vehicle.error_invalid_date", {
              date: "vehicle.technical_safety_registration_date",
            })
          )
        : schema;
    })
    .nullable(),
  liabilityInsuranceRegistrationDate: yup
    .date()
    .typeError(errorFormat("vehicle.insurance_registration_date"))
    .nullable(),
  liabilityInsuranceExpirationDate: yup
    .date()
    .typeError(errorFormat("vehicle.insurance_expiration_date"))
    .when("liabilityInsuranceRegistrationDate", (liabilityInsuranceRegistrationDate, schema) => {
      return liabilityInsuranceRegistrationDate[0] !== null
        ? schema.min(
            liabilityInsuranceRegistrationDate,
            formatErrorMessage("vehicle.error_invalid_date", {
              date: "vehicle.insurance_registration_date",
            })
          )
        : schema;
    })
    .nullable(),
  description: yup.string().trim().max(500, errorMaxLength(500)).nullable(),
  fuelConsumption: yup
    .number()
    .typeError(errorType("number"))
    .min(0, errorMin(0))
    .max(999.99, errorMax(999.99))
    .nullable(),
});
