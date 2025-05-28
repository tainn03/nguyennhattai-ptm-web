"use client";

import { useFormikContext } from "formik";
import { useTranslations } from "next-intl";

import { AddressInformation, TextField } from "@/components/molecules";
import { DriverInputForm } from "@/forms/driver";
import { ensureString } from "@/utils/string";
import { formatError } from "@/utils/yup";

type DriverContactFormProps = {
  inModal?: boolean;
};

const DriverContactForm = ({ inModal }: DriverContactFormProps) => {
  const t = useTranslations();
  const { values, touched, errors, handleChange, setFieldValue, getFieldMeta } = useFormikContext<DriverInputForm>();

  return (
    <>
      <div className="sm:col-span-3">
        <TextField
          label={t("driver.email")}
          name="email"
          value={ensureString(values.email)}
          maxLength={255}
          onChange={handleChange}
          errorText={formatError(t, touched.email && errors.email)}
        />
      </div>
      <div className="sm:col-span-2">
        <TextField
          label={t("driver.phone")}
          name="phoneNumber"
          value={ensureString(values.phoneNumber)}
          maxLength={20}
          onChange={handleChange}
          errorText={formatError(t, touched.phoneNumber && errors.phoneNumber)}
        />
      </div>
      {!inModal && (
        <AddressInformation
          address={values.address}
          setFieldValue={setFieldValue}
          getFieldMeta={getFieldMeta}
          parentName="address"
        />
      )}
    </>
  );
};

export default DriverContactForm;
