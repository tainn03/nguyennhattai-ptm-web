"use client";

import { DriverContractType } from "@prisma/client";
import { useFormikContext } from "formik";
import { useTranslations } from "next-intl";
import { useCallback } from "react";

import { DatePicker, NumberField, RadioGroup, UploadInput } from "@/components/molecules";
import { RadioItem } from "@/components/molecules/RadioGroup/RadioGroup";
import { DriverInputForm } from "@/forms/driver";
import { UploadInputValue } from "@/types/file";
import { ScreenMode } from "@/types/form";
import { ensureString } from "@/utils/string";
import { formatError } from "@/utils/yup";

export type DriverContractFormProps = {
  mode: ScreenMode;
};

const DriverContractForm = ({ mode }: DriverContractFormProps) => {
  const t = useTranslations();
  const { values, touched, errors, setFieldValue, handleChange } = useFormikContext<DriverInputForm>();

  const contractTypeOptions: RadioItem[] = [
    { value: DriverContractType.FIXED_TERM, label: t("driver.fixed_term_contract") },
    { value: DriverContractType.PERMANENT, label: t("driver.permanent_contract") },
  ];

  const handleRadioChange = useCallback(
    (name: string) => (item: RadioItem) => {
      setFieldValue(name, item.value);
    },
    [setFieldValue]
  );

  const handleDateChange = useCallback(
    (name: string) => (date: Date | null) => {
      setFieldValue(name, date);
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
      <div className="sm:col-span-3">
        <RadioGroup
          label={t("driver.contract_license_type")}
          direction="column"
          value={ensureString(values.contractType)}
          name="contractType"
          items={contractTypeOptions}
          onChange={handleRadioChange("contractType")}
        />
      </div>
      <div className="sm:col-span-2 sm:col-start-1">
        <NumberField
          label={t("driver.basic_salary")}
          name="basicSalary"
          value={values.basicSalary}
          suffixText={t("common.unit.currency")}
          onChange={handleChange}
          errorText={formatError(t, touched.basicSalary && errors.basicSalary)}
        />
      </div>
      <div className="sm:col-span-2">
        <NumberField
          label={t("driver.union_dues")}
          name="unionDues"
          value={values.unionDues}
          suffixText={t("common.unit.currency")}
          onChange={handleChange}
          errorText={formatError(t, touched.unionDues && errors.unionDues)}
        />
      </div>
      <div className="sm:col-span-2">
        <NumberField
          label={t("driver.security_deposit")}
          name="securityDeposit"
          value={values.securityDeposit}
          suffixText={t("common.unit.currency")}
          onChange={handleChange}
          errorText={formatError(t, touched.securityDeposit && errors.securityDeposit)}
        />
      </div>
      <div className="sm:col-span-2 sm:col-start-1">
        <DatePicker
          label={t("driver.contract_license_start_date")}
          name="contractStartDate"
          selected={values.contractStartDate && new Date(values.contractStartDate)}
          onChange={handleDateChange("contractStartDate")}
          errorText={formatError(t, touched.contractStartDate && errors.contractStartDate)}
        />
      </div>
      <div className="sm:col-span-2">
        <DatePicker
          label={t("driver.contract_license_end_date")}
          name="contractEndDate"
          selected={values.contractEndDate && new Date(values.contractEndDate)}
          onChange={handleDateChange("contractEndDate")}
          errorText={formatError(t, touched.contractEndDate && errors.contractEndDate)}
        />
      </div>
      <div className="sm:col-span-3">
        <UploadInput
          label={t("driver.contract")}
          type="DRIVER_CONTRACT"
          name="contractDocuments"
          value={{
            url: values.contractDocuments?.url || "",
            name: values.contractDocuments?.name || "",
          }}
          openSelectedFileLabel={t("driver.upload_contract")}
          onChange={handleFileChange("contractDocuments")}
          uploadLabel={t("components.upload_file.upload_document")}
        />
      </div>
    </>
  );
};

export default DriverContractForm;
