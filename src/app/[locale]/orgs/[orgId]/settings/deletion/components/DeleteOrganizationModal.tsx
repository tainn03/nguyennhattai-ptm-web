"use client";

import { useTranslations } from "next-intl";
import { ChangeEvent, useCallback, useState } from "react";

import { ModalActions, ModalContent, ModalHeader } from "@/components/atoms";
import { Button, Modal, TextField } from "@/components/molecules";

export type DeleteOrganizationModalProps = {
  open: boolean;
  organizationName: string;
  onClose?: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;
};

const DeleteOrganizationModal = ({
  open,
  organizationName,
  onClose,
  onCancel,
  onConfirm,
}: DeleteOrganizationModalProps) => {
  const t = useTranslations();
  const [orgName, setOrgName] = useState("");

  const handleNameChange = useCallback((value: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setOrgName(value.target.value);
  }, []);

  return (
    <Modal open={open} divider={false} onDismiss={onClose}>
      <ModalHeader title={t("org_deletion.deletion_confirmed_title")} className="border-b border-gray-200" />
      <ModalContent className="space-y-4">
        <p className="text-sm text-gray-500">
          {t.rich("org_deletion.deletion_confirmed_message", {
            strong: (chunks) => <span className="font-bold">{chunks}</span>,
            name: organizationName,
          })}
        </p>

        <p className="text-sm text-gray-500">
          {t.rich("org_deletion.title_description", {
            strong: (chunks) => <span className="font-bold">{chunks}</span>,
          })}
        </p>
        <p className="text-sm text-gray-500">{t("org_deletion.enter_name")}</p>

        <TextField
          className="my-2 mt-2"
          label={t("org_deletion.name")}
          name="name"
          value={orgName}
          required
          maxLength={255}
          onChange={handleNameChange}
        />
      </ModalContent>
      <ModalActions className="pb-4 pt-0 sm:pb-6">
        <Button className="flex-1" variant="outlined" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button
          type="submit"
          className="flex-1"
          color="error"
          onClick={onConfirm}
          disabled={orgName !== organizationName}
        >
          {t("org_deletion.title")}
        </Button>
      </ModalActions>
    </Modal>
  );
};

export default DeleteOrganizationModal;
