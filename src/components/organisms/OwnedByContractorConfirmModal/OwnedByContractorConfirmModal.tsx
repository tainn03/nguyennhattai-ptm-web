"use client";

import { Dialog } from "@headlessui/react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useTranslations } from "next-intl";

import { ModalActions, ModalContent } from "@/components/atoms";
import { Button, Modal } from "@/components/molecules";

type OwnedByContractorConfirmModalProps = {
  open: boolean;
  isBelongToSubcontractor?: boolean;
  onClose?: () => void;
  onCancel?: () => void;
  onConfirm?: () => void;
};

const OwnedByContractorConfirmModal = ({
  open,
  isBelongToSubcontractor,
  onClose,
  onCancel,
  onConfirm,
}: OwnedByContractorConfirmModalProps) => {
  const t = useTranslations();

  return (
    <Modal open={open} divider={false} className="sm:!max-w-lg" onDismiss={onClose}>
      <ModalContent>
        <div className={clsx("mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100")}>
          <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" aria-hidden="true" />
        </div>
        <div className={clsx("mt-3 text-center sm:mt-5")}>
          <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
            {t("driver.is_owned_by_subcontractor.title_confirm_driver_owned_subcontractor")}
          </Dialog.Title>
          <div className="mt-2">
            <p className="text-sm text-gray-500">
              {t.rich("driver.is_owned_by_subcontractor.confirm_message", {
                strong: (chunks) => <span className="font-bold">{chunks}</span>,
                isBelongToSubcontractor: isBelongToSubcontractor
                  ? t("driver.is_owned_by_subcontractor.not_belong_to_sub")
                  : t("driver.is_owned_by_subcontractor.belong_to_sub"),
              })}
            </p>
          </div>
        </div>
      </ModalContent>
      <ModalActions className="pb-4 pt-0 sm:pb-6">
        <Button variant="outlined" color="secondary" className="min-w-[120px] flex-1" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button className="min-w-[120px] flex-1" onClick={onConfirm}>
          {t("common.yes")}
        </Button>
      </ModalActions>
    </Modal>
  );
};

export default OwnedByContractorConfirmModal;
