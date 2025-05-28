"use client";

import { FormikErrors, FormikTouched, getIn } from "formik";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { TextField } from "@/components/molecules";
import { AnyObject } from "@/types";
import { BankAccountInfo } from "@/types/strapi";
import { ensureString } from "@/utils/string";
import { formatError } from "@/utils/yup";

export type BankAccountFormProps = {
  column?: string;
  values?: Partial<BankAccountInfo>;
  touched?: FormikTouched<AnyObject>;
  errors?: FormikErrors<AnyObject>;
  setFieldValue: (field: string, value: string, shouldValidate?: boolean | undefined) => void;
};

const BankAccountForm = ({ column, values, errors, touched, setFieldValue }: BankAccountFormProps) => {
  const t = useTranslations();
  const parent = useMemo(() => (column ? `${column}.` : ""), [column]);

  const handleTextChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFieldValue(event.target.name, event.target.value);
  };

  return (
    <>
      <div className="sm:col-span-2">
        <TextField
          label={t("driver.account_number")}
          name={`${parent}accountNumber`}
          value={ensureString(values?.accountNumber)}
          maxLength={20}
          onChange={handleTextChange}
          errorText={formatError(
            t,
            getIn(touched, `${column}.accountNumber`) && getIn(errors, `${column}.accountNumber`)
          )}
        />
      </div>
      <div className="sm:col-span-4">
        <TextField
          label={t("driver.holder_name")}
          name={`${parent}holderName`}
          value={ensureString(values?.holderName)}
          maxLength={50}
          onChange={handleTextChange}
          errorText={formatError(t, getIn(touched, `${column}.holderName`) && getIn(errors, `${column}.holderName`))}
        />
      </div>
      <div className="sm:col-span-4">
        <TextField
          label={t("driver.bank_name")}
          name={`${parent}bankName`}
          value={ensureString(values?.bankName)}
          maxLength={255}
          onChange={handleTextChange}
          errorText={formatError(t, getIn(touched, `${column}.bankName`) && getIn(errors, `${column}.bankName`))}
        />
      </div>
      <div className="sm:col-span-2">
        <TextField
          label={t("driver.branch")}
          name={`${parent}bankBranch`}
          value={ensureString(values?.bankBranch)}
          maxLength={255}
          onChange={handleTextChange}
          errorText={formatError(t, getIn(touched, `${column}.bankBranch`) && getIn(errors, `${column}.bankBranch`))}
        />
      </div>
    </>
  );
};

export default BankAccountForm;
