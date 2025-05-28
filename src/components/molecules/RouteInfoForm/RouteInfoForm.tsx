"use client";

import { useFormikContext } from "formik";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";

import { RadioGroup, TextField } from "@/components/molecules";
import { RadioItem } from "@/components/molecules/RadioGroup/RadioGroup";
import { RouteInputForm } from "@/forms/route";
import { ensureString } from "@/utils/string";
import { formatError } from "@/utils/yup";

type RouteInfoFormProps = { inModal?: boolean };

const RouteInfoForm = ({ inModal }: RouteInfoFormProps) => {
  const t = useTranslations();
  const { values, touched, errors, handleChange, setFieldValue } = useFormikContext<RouteInputForm>();

  const statusOptions: RadioItem[] = useMemo(
    () => [
      { value: "true", label: t("customer.route.status_active") },
      { value: "false", label: t("customer.route.status_inactive") },
    ],
    [t]
  );

  const handleActiveChange = useCallback(
    (item: RadioItem) => {
      setFieldValue("isActive", item.value === "true");
    },
    [setFieldValue]
  );

  return (
    <>
      {/* Route code */}
      <div className="col-span-2">
        <TextField
          label={t("customer.route.id")}
          name="code"
          value={values.code}
          maxLength={64}
          onChange={handleChange}
          errorText={formatError(t, touched.code && errors.code)}
          required
        />
      </div>

      {/* Route name */}
      <div className="col-span-4">
        <TextField
          label={t("customer.route.name")}
          name="name"
          value={values.name}
          maxLength={255}
          onChange={handleChange}
          errorText={formatError(t, touched.name && errors.name)}
          required
        />
      </div>
      {!inModal && (
        <>
          {/* Description */}
          <div className="col-span-full">
            <TextField
              label={t("customer.route.description")}
              multiline
              name="description"
              value={values.description || ""}
              maxLength={500}
              onChange={handleChange}
              errorText={formatError(t, touched.description && errors.description)}
            />
          </div>

          {/* Status  */}
          <div className="col-span-full">
            <RadioGroup
              label={t("customer.route.status")}
              name="status"
              items={statusOptions}
              value={ensureString(values.isActive)}
              onChange={handleActiveChange}
            />
          </div>
        </>
      )}
    </>
  );
};

export default RouteInfoForm;
