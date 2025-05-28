"use client";

import { useFormikContext } from "formik";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";

import { DatePicker, Select, TextField, UploadInput } from "@/components/molecules";
import { SelectItem } from "@/components/molecules/Select/Select";
import { DriverInputForm } from "@/forms/driver";
import { useDriverLicenseTypeOptions } from "@/hooks";
import { UploadInputValue } from "@/types/file";
import { ScreenMode } from "@/types/form";
import { ensureString } from "@/utils/string";
import { formatError } from "@/utils/yup";

export type DriverLicenseFormProps = {
  organizationId: number;
  mode: ScreenMode;
  inModal?: boolean;
};

const DriverLicenseForm = ({ organizationId, mode, inModal }: DriverLicenseFormProps) => {
  const t = useTranslations();
  const { driverLicenseTypes } = useDriverLicenseTypeOptions({
    organizationId,
  });

  const driverLicenseTypeOptions: SelectItem[] = useMemo(
    () =>
      driverLicenseTypes.map((licenseType) => ({
        value: ensureString(licenseType.id),
        label: licenseType.name,
      })),
    [driverLicenseTypes]
  );

  const { values, touched, errors, handleChange, setFieldValue } = useFormikContext<DriverInputForm>();

  const handleDateChange = useCallback(
    (name: string) => (date: Date | null) => {
      setFieldValue(name, date);
    },
    [setFieldValue]
  );

  const handleSelectChange = useCallback(
    (name: string) => (value: string) => {
      setFieldValue(name, Number(value));
    },
    [setFieldValue]
  );

  const handleFileChange = useCallback(
    (name: string) => (file?: UploadInputValue) => {
      setFieldValue(`${name}.name`, file?.name);
      setFieldValue(`${name}.url`, file?.url);

      if (mode === "EDIT" && !file) {
        setFieldValue(`isDelete${name.charAt(0).toUpperCase()}${name.slice(1)}`, true);
      }
    },
    [mode, setFieldValue]
  );

  return (
    <>
      <div className="sm:col-span-2">
        <Select
          label={t("driver.level")}
          name="licenseTypeId"
          value={ensureString(values.licenseTypeId)}
          items={driverLicenseTypeOptions}
          onChange={handleSelectChange("licenseTypeId")}
        />
      </div>
      <div className="sm:col-span-3">
        <TextField
          label={t("driver.driver_license_number")}
          name="licenseNumber"
          value={ensureString(values.licenseNumber)}
          maxLength={20}
          onChange={handleChange}
          errorText={formatError(t, touched.licenseNumber && errors.licenseNumber)}
        />
      </div>
      <div className="sm:col-span-2 sm:col-start-1">
        <DatePicker
          label={t("driver.driver_license_issue_date")}
          name="licenseIssueDate"
          selected={values.licenseIssueDate && new Date(values.licenseIssueDate)}
          onChange={handleDateChange("licenseIssueDate")}
          errorText={formatError(t, touched.licenseIssueDate && errors.licenseIssueDate)}
        />
      </div>
      <div className="sm:col-span-2">
        <DatePicker
          label={t("driver.driver_license_expiry_date")}
          name="licenseExpiryDate"
          selected={values.licenseExpiryDate && new Date(values.licenseExpiryDate)}
          onChange={handleDateChange("licenseExpiryDate")}
          errorText={formatError(t, touched.licenseExpiryDate && errors.licenseExpiryDate)}
        />
      </div>
      {!inModal && (
        <>
          <div className="sm:col-span-3 sm:col-start-1">
            <UploadInput
              label={t("driver.front")}
              type="DRIVER_LICENSE"
              name="licenseFrontImage"
              value={{
                url: values.licenseFrontImage?.url || "",
                name: values.licenseFrontImage?.name || "",
              }}
              onChange={handleFileChange("licenseFrontImage")}
              helperText={t("driver.front_helper_text")}
            />
          </div>
          <div className="sm:col-span-3">
            <UploadInput
              label={t("driver.back")}
              type="DRIVER_LICENSE"
              name="licenseBackImage"
              value={{
                url: values.licenseBackImage?.url || "",
                name: values.licenseBackImage?.name || "",
              }}
              onChange={handleFileChange("licenseBackImage")}
              helperText={t("driver.back_helper_text")}
            />
          </div>
        </>
      )}
    </>
  );
};

export default DriverLicenseForm;
