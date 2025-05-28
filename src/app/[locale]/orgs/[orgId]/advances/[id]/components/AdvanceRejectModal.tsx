import { AdvanceStatus } from "@prisma/client";
import { useTranslations } from "next-intl";
import { ChangeEvent, useCallback, useState } from "react";

import { DescriptionProperty2, ModalActions, ModalContent, ModalHeader, NumberLabel } from "@/components/atoms";
import { Button, Modal, TextField } from "@/components/molecules";
import { useAuth } from "@/hooks";
import { useNotification } from "@/redux/actions";
import { updateAdvance } from "@/services/client/advance";
import { ErrorType } from "@/types";

type AdvanceRejectModalProps = {
  open: boolean;
  id: number;
  borrower: string;
  amount: number | null;
  lastUpdatedAt?: Date | string;
  onReject?: () => void;
  onClose?: () => void;
};

const AdvanceRejectModal = ({
  open,
  id,
  borrower,
  amount,
  lastUpdatedAt,
  onReject,
  onClose,
}: AdvanceRejectModalProps) => {
  const t = useTranslations();
  const { orgId, userId } = useAuth();
  const { showNotification } = useNotification();

  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Handler function for rejecting the payment of an advance.
   */
  const handleReject = useCallback(async () => {
    if (!id) {
      return;
    }

    setIsSubmitting(true);
    const result = await updateAdvance(
      {
        id,
        organizationId: orgId,
        status: AdvanceStatus.REJECTED,
        rejectionReason,
        updatedById: userId,
      },
      lastUpdatedAt
    );

    if (result.error) {
      let message = "";
      switch (result.error) {
        case ErrorType.EXCLUSIVE:
          message = t("common.message.save_error_exclusive");
          break;
        case ErrorType.UNKNOWN:
          message = t("common.message.save_error_unknown", { name: borrower });
          break;
        default:
          break;
      }

      showNotification({
        color: "error",
        title: t("common.message.save_error_title"),
        message,
      });
    } else {
      showNotification({
        color: "success",
        title: t("common.message.save_success_title"),
      });
    }
    setIsSubmitting(false);
    onReject && onReject();
  }, [borrower, id, lastUpdatedAt, onReject, orgId, rejectionReason, showNotification, t, userId]);

  /**
   * Handler function for handling change event on the rejection reason text field.
   */
  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.value;
    if (value.length > 500) {
      event.preventDefault();
      return;
    }
    setRejectionReason(value);
  }, []);

  return (
    <Modal open={open} showCloseButton onClose={onClose} onDismiss={onClose}>
      <ModalHeader title={t("advance.reject_modal_title")} />
      <ModalContent className="space-y-3">
        <DescriptionProperty2 label={t("advance.amount")}>
          <NumberLabel value={amount} type="currency" emptyLabel={t("common.empty")} />
        </DescriptionProperty2>
        <TextField
          label={t("advance.reason_reject")}
          multiline
          showCount
          maxLength={500}
          value={rejectionReason}
          onChange={handleChange}
        />
      </ModalContent>
      <ModalActions align="right">
        <Button disabled={isSubmitting} variant="outlined" color="secondary" onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button loading={isSubmitting} onClick={handleReject}>
          {t("common.save")}
        </Button>
      </ModalActions>
    </Modal>
  );
};

export default AdvanceRejectModal;
