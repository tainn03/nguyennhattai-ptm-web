"use client";

import { AdvanceStatus } from "@prisma/client";
import { useFormikContext } from "formik";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";

import { DatePicker, RadioGroup, TextField } from "@/components/molecules";
import { RadioItem } from "@/components/molecules/RadioGroup/RadioGroup";
import { AdvanceInputForm } from "@/forms/advance";
import { usePermission } from "@/hooks";
import { ScreenMode } from "@/types/form";
import { ensureString } from "@/utils/string";
import { formatError } from "@/utils/yup";

type AdvanceStatusFormProps = {
  mode: ScreenMode;
  currentStatus?: AdvanceStatus;
};

const AdvanceStatusForm = ({ mode, currentStatus }: AdvanceStatusFormProps) => {
  const t = useTranslations();
  const { values, touched, errors, handleChange, setFieldValue } = useFormikContext<AdvanceInputForm>();
  const { hasPermission } = usePermission("advance");

  const [isRejected, isAccepted, isPayment] = useMemo(
    () => [
      currentStatus === AdvanceStatus.REJECTED && mode === "EDIT",
      currentStatus === AdvanceStatus.ACCEPTED && mode === "EDIT",
      currentStatus === AdvanceStatus.PAYMENT && mode === "EDIT",
    ],
    [mode, currentStatus]
  );

  const canApprove = hasPermission("approve");
  const canReject = hasPermission("reject");
  const canPay = hasPermission("pay");

  const statusOptions: RadioItem[] = useMemo(
    () => [
      { value: AdvanceStatus.PENDING, label: t("advance.status_pending"), disabled: isAccepted || isPayment },
      {
        value: AdvanceStatus.REJECTED,
        label: t("advance.status_rejected"),
        disabled: isAccepted || isPayment || !canReject,
      },
      { value: AdvanceStatus.ACCEPTED, label: t("advance.status_accepted"), disabled: isPayment || !canApprove },
      { value: AdvanceStatus.PAYMENT, label: t("advance.status_paid"), disabled: !canPay },
    ],
    [isAccepted, isPayment, t, canApprove, canReject, canPay]
  );

  const handleStatusChange = useCallback(
    (item: RadioItem) => {
      setFieldValue("status", item.value);
    },
    [setFieldValue]
  );

  const handleDateChange = useCallback(
    (date: Date | null) => {
      setFieldValue("paymentDate", date);
    },
    [setFieldValue]
  );

  return (
    <>
      <div className="col-span-full">
        <RadioGroup
          label={t("advance.status")}
          name="status"
          items={statusOptions}
          disabled={isRejected}
          value={values.status}
          onChange={handleStatusChange}
        />
      </div>
      {values.status === AdvanceStatus.REJECTED && (
        <div className="col-span-full">
          <TextField
            label={t("advance.reason_reject")}
            name="rejectionReason"
            multiline
            rows={4}
            maxLength={500}
            showCount
            disabled={isRejected}
            value={ensureString(values.rejectionReason)}
            onChange={handleChange}
            errorText={formatError(t, touched.rejectionReason && errors.rejectionReason)}
          />
        </div>
      )}
      {values.status === AdvanceStatus.PAYMENT && (
        <div className="sm:col-span-3">
          <DatePicker
            label={t("advance.payment_date")}
            name="paymentDate"
            disabled={isPayment || isRejected}
            selected={values.paymentDate && new Date(values.paymentDate)}
            onChange={handleDateChange}
            errorText={formatError(t, touched.paymentDate && errors.paymentDate)}
          />
        </div>
      )}
    </>
  );
};

export default AdvanceStatusForm;
