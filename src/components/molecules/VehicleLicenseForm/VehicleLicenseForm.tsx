"use client";

import { useFormikContext } from "formik";
import { useTranslations } from "next-intl";
import { useCallback } from "react";

import { DatePicker, UploadInput } from "@/components/molecules";
import { VehicleInputForm } from "@/forms/vehicle";
import { UploadInputValue } from "@/types/file";
import { formatError } from "@/utils/yup";

export type VehicleLicenseFormProps = {
  onFileChange: (name: string, file?: UploadInputValue) => void;
};

const VehicleLicenseForm = ({ onFileChange }: VehicleLicenseFormProps) => {
  const t = useTranslations();
  const { values, touched, errors, setFieldValue } = useFormikContext<VehicleInputForm>();

  const handleDateChange = useCallback(
    (name: string) => (date: Date) => {
      setFieldValue(name, date);
    },
    [setFieldValue]
  );

  const handleFileChange = useCallback(
    (name: string) => (file?: UploadInputValue) => {
      onFileChange && onFileChange(name, file);
    },
    [onFileChange]
  );

  return (
    <>
      <div className="sm:col-span-3">
        <DatePicker
          label={t("vehicle.technical_safety_registration_date")}
          name="technicalSafetyRegistrationDate"
          placeholder="DD/MM/YYYY"
          selected={values.technicalSafetyRegistrationDate && new Date(values.technicalSafetyRegistrationDate)}
          onChange={handleDateChange("technicalSafetyRegistrationDate")}
          errorText={formatError(t, touched.technicalSafetyRegistrationDate && errors.technicalSafetyRegistrationDate)}
        />
      </div>
      <div className="sm:col-span-3">
        <DatePicker
          label={t("vehicle.technical_safety_expiration_date")}
          name="technicalSafetyExpirationDate"
          placeholder="DD/MM/YYYY"
          selected={values.technicalSafetyExpirationDate && new Date(values.technicalSafetyExpirationDate)}
          onChange={handleDateChange("technicalSafetyExpirationDate")}
          errorText={formatError(t, touched.technicalSafetyExpirationDate && errors.technicalSafetyExpirationDate)}
        />
      </div>
      <div className="col-span-full">
        <UploadInput
          value={
            !values?.technicalSafetyCertificate?.[0]
              ? undefined
              : {
                  name: values?.technicalSafetyCertificate?.[0]?.name ?? "",
                  url: values?.technicalSafetyCertificate?.[0]?.url ?? "",
                }
          }
          label={t("vehicle.technical_safety_certificate")}
          type="VEHICLE"
          name="technicalSafetyCertificate"
          onChange={handleFileChange("technicalSafetyCertificate")}
        />
      </div>

      <div className="sm:col-span-3">
        <DatePicker
          label={t("vehicle.insurance_registration_date")}
          name="liabilityInsuranceRegistrationDate"
          placeholder="DD/MM/YYYY"
          selected={values.liabilityInsuranceRegistrationDate && new Date(values.liabilityInsuranceRegistrationDate)}
          onChange={handleDateChange("liabilityInsuranceRegistrationDate")}
          errorText={formatError(
            t,
            touched.liabilityInsuranceRegistrationDate && errors.liabilityInsuranceRegistrationDate
          )}
        />
      </div>
      <div className="sm:col-span-3">
        <DatePicker
          label={t("vehicle.insurance_expiration_date")}
          name="liabilityInsuranceExpirationDate"
          placeholder="DD/MM/YYYY"
          selected={values.liabilityInsuranceExpirationDate && new Date(values.liabilityInsuranceExpirationDate)}
          onChange={handleDateChange("liabilityInsuranceExpirationDate")}
          errorText={formatError(
            t,
            touched.liabilityInsuranceExpirationDate && errors.liabilityInsuranceExpirationDate
          )}
        />
      </div>
      <div className="col-span-full">
        <UploadInput
          value={
            !values?.liabilityInsuranceCertificate?.[0]
              ? undefined
              : {
                  name: values?.liabilityInsuranceCertificate?.[0]?.name ?? "",
                  url: values?.liabilityInsuranceCertificate?.[0]?.url ?? "",
                }
          }
          label={t("vehicle.insurance")}
          type="VEHICLE"
          name="liabilityInsuranceCertificate"
          onChange={handleFileChange("liabilityInsuranceCertificate")}
        />
      </div>

      <div className="sm:col-span-3">
        <DatePicker
          label={t("vehicle.license_registration_date")}
          name="registrationDate"
          placeholder="DD/MM/YYYY"
          selected={values.registrationDate && new Date(values.registrationDate)}
          onChange={handleDateChange("registrationDate")}
          errorText={formatError(t, touched.registrationDate && errors.registrationDate)}
        />
      </div>
      <div className="sm:col-span-3">
        <DatePicker
          label={t("vehicle.license_expiration_date")}
          name="registrationExpirationDate"
          placeholder="DD/MM/YYYY"
          selected={values.registrationExpirationDate && new Date(values.registrationExpirationDate)}
          onChange={handleDateChange("registrationExpirationDate")}
          errorText={formatError(t, touched.registrationExpirationDate && errors.registrationExpirationDate)}
        />
      </div>

      <div className="col-span-full">
        <UploadInput
          value={
            !values?.registrationCertificate?.[0]
              ? undefined
              : {
                  name: values?.registrationCertificate?.[0]?.name ?? "",
                  url: values?.registrationCertificate?.[0]?.url ?? "",
                }
          }
          label={t("vehicle.license_certificate")}
          type="VEHICLE"
          name="registrationCertificate"
          onChange={handleFileChange("registrationCertificate")}
        />
      </div>
    </>
  );
};

export default VehicleLicenseForm;
