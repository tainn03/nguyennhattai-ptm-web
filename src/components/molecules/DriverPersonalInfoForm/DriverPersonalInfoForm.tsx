"use client";

import { Gender } from "@prisma/client";
import clsx from "clsx";
import { useFormikContext } from "formik";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { Checkbox } from "@/components/atoms";
import { DatePicker, NumberField, RadioGroup, TextField } from "@/components/molecules";
import { RadioItem } from "@/components/molecules/RadioGroup/RadioGroup";
import OwnedByContractorConfirmModal from "@/components/organisms/OwnedByContractorConfirmModal/OwnedByContractorConfirmModal";
import { DriverInputForm } from "@/forms/driver";
import useAuth from "@/hooks/useAuth";
import useIdParam from "@/hooks/useIdParam";
import { getDriverIsOwnedBySubcontractor } from "@/services/client/driver";
import { equalId } from "@/utils/number";
import { ensureString } from "@/utils/string";
import { formatError } from "@/utils/yup";

type DriverPersonalInfoFormProps = {
  inModal?: boolean;
  editMode?: boolean;
};

const DriverPersonalInfoForm = ({ inModal, editMode }: DriverPersonalInfoFormProps) => {
  const t = useTranslations();
  const { values, touched, errors, handleChange, setFieldValue } = useFormikContext<DriverInputForm>();
  const [showItemIsSubcontractor, setShowItemIsSubcontractor] = useState(false);
  const [isOwnedBySubcontractorOpen, setIsOwnedBySubcontractorOpen] = useState(false);

  const { orgId } = useAuth(false);
  const { originId: id } = useIdParam();

  const statusOptions: RadioItem[] = [
    { value: "true", label: t("driver.status_active") },
    { value: "false", label: t("driver.status_inactive") },
  ];

  const genderOptions: RadioItem[] = [
    { value: Gender.MALE, label: t("driver.gender_male") },
    { value: Gender.FEMALE, label: t("driver.gender_female") },
    { value: Gender.UNKNOWN, label: t("driver.gender_unknown") },
  ];

  const canSetDriverIsSubcontractor = useCallback(async () => {
    if (orgId) {
      const result = await getDriverIsOwnedBySubcontractor(orgId);
      if (result.length === 0) {
        setShowItemIsSubcontractor(true);
      } else {
        if (editMode && equalId(result[0].id, id)) {
          setShowItemIsSubcontractor(true);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Fetching check box is owned subcontractor when init page.
   */
  useEffect(() => {
    canSetDriverIsSubcontractor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleActiveChange = useCallback(
    (item: RadioItem) => {
      setFieldValue("isActive", item.value === "true");
    },
    [setFieldValue]
  );

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

  const handleOwnedBySubcontractorConfirm = useCallback(
    (name: string) => () => {
      setIsOwnedBySubcontractorOpen(false);

      setFieldValue(name, !values.isOwnedBySubcontractor);
    },
    [setFieldValue, values]
  );

  const handleToggleOwnedBySubcontractorModal = useCallback(() => {
    setIsOwnedBySubcontractorOpen((prev) => !prev);
  }, []);

  return (
    <>
      <div className={clsx("sm:col-span-3")}>
        <TextField
          label={t("driver.last_name")}
          name="lastName"
          value={values.lastName}
          required
          maxLength={255}
          onChange={handleChange}
          errorText={formatError(t, touched.lastName && errors.lastName)}
        />
      </div>
      <div className={clsx("sm:col-span-2")}>
        <TextField
          label={t("driver.first_name")}
          name="firstName"
          value={values.firstName}
          required
          maxLength={255}
          onChange={handleChange}
          errorText={formatError(t, touched.firstName && errors.firstName)}
        />
      </div>
      <div className="sm:col-span-2">
        <DatePicker
          label={t("driver.date_of_birth")}
          name="dateOfBirth"
          selected={values.dateOfBirth && new Date(values.dateOfBirth)}
          onChange={handleDateChange("dateOfBirth")}
          errorText={formatError(t, touched.dateOfBirth && errors.dateOfBirth)}
        />
      </div>
      <div className="sm:col-span-3">
        <RadioGroup
          label={t("driver.gender")}
          name="gender"
          items={genderOptions}
          value={values.gender}
          onChange={handleRadioChange("gender")}
        />
      </div>
      <div className="sm:col-span-2 sm:col-start-1">
        <TextField
          label={t("driver.id_number")}
          name="idNumber"
          value={ensureString(values.idNumber)}
          maxLength={20}
          onChange={handleChange}
          errorText={formatError(t, touched.idNumber && errors.idNumber)}
        />
      </div>
      <div className="col-span-full sm:col-span-2">
        <DatePicker
          label={t("driver.issue_date")}
          name="idIssueDate"
          selected={values.idIssueDate && new Date(values.idIssueDate)}
          onChange={handleDateChange("idIssueDate")}
          errorText={formatError(t, touched.idIssueDate && errors.idIssueDate)}
        />
      </div>
      <div className="col-span-full sm:col-span-2">
        <TextField
          label={t("driver.place_of_issue")}
          name="idIssuedBy"
          value={ensureString(values.idIssuedBy)}
          maxLength={255}
          onChange={handleChange}
          errorText={formatError(t, touched.idIssuedBy && errors.idIssuedBy)}
        />
      </div>
      <div className="sm:col-span-2">
        <NumberField
          label={t("driver.experience")}
          name="experienceYears"
          suffixText={t("driver.experience_suffix_text")}
          value={values.experienceYears}
          onChange={handleChange}
          errorText={formatError(t, touched.experienceYears && errors.experienceYears)}
        />
      </div>
      {showItemIsSubcontractor && (
        <div className="col-span-full content-center">
          <Checkbox
            label={t("driver.is_owned_by_subcontractor.label_checkbox")}
            checked={values.isOwnedBySubcontractor}
            onChange={handleToggleOwnedBySubcontractorModal}
            className="col-span-full [&_label]:!whitespace-pre-wrap [&_label]:break-all"
          />
        </div>
      )}
      {!inModal && (
        <>
          <div className="col-span-full">
            <TextField
              label={t("driver.description")}
              name="description"
              value={ensureString(values.description)}
              multiline
              rows={4}
              maxLength={500}
              showCount
              onChange={handleChange}
              errorText={formatError(t, touched.description && errors.description)}
            />
          </div>
          <div className="col-span-full">
            <RadioGroup
              label={t("driver.status")}
              name="status"
              items={statusOptions}
              value={ensureString(values.isActive)}
              onChange={handleActiveChange}
            />
          </div>
        </>
      )}
      {/* Change confirmation dialog */}
      <OwnedByContractorConfirmModal
        open={isOwnedBySubcontractorOpen}
        isBelongToSubcontractor={values.isOwnedBySubcontractor}
        onClose={handleToggleOwnedBySubcontractorModal}
        onCancel={handleToggleOwnedBySubcontractorModal}
        onConfirm={handleOwnedBySubcontractorConfirm("isOwnedBySubcontractor")}
      />
    </>
  );
};

export default DriverPersonalInfoForm;
