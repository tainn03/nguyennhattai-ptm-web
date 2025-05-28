"use client";

import { Dialog } from "@headlessui/react";
import {
  CheckIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useTranslations } from "next-intl";

import { ModalActions, ModalContent } from "@/components/atoms";
import { Button, Modal } from "@/components/molecules";
import { AlertModalProps } from "@/components/organisms/AlertModal/AlertModal";

export type ConfirmModalProps = AlertModalProps & {
  cancelButtonText?: string;
  loading?: boolean;
  onCancel?: () => void;
};

const ConfirmModal = ({
  open,
  icon,
  color = "primary",
  title,
  message,
  cancelButtonText,
  confirmButtonText,
  loading,
  onClose,
  onCancel,
  onConfirm,
}: ConfirmModalProps) => {
  const t = useTranslations();

  return (
    <Modal open={open} divider={false} className="sm:!max-w-lg" onDismiss={onClose}>
      <ModalContent>
        {icon && (
          <div
            className={clsx("mx-auto flex h-12 w-12 items-center justify-center rounded-full", {
              "bg-green-100": icon === "success",
              "bg-red-100": icon === "error",
              "bg-yellow-100": icon === "warning",
              "bg-blue-100": icon === "question",
              "bg-sky-100": icon === "info",
            })}
          >
            {icon === "success" && <CheckIcon className="h-6 w-6 text-green-600" aria-hidden="true" />}
            {icon === "error" && <ExclamationTriangleIcon className="h-6 w-6 text-red-600" aria-hidden="true" />}
            {icon === "warning" && <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" aria-hidden="true" />}
            {icon === "question" && <QuestionMarkCircleIcon className="h-6 w-6 text-blue-700" aria-hidden="true" />}
            {icon === "info" && <ExclamationCircleIcon className="h-6 w-6 text-sky-500" aria-hidden="true" />}
          </div>
        )}
        <div
          className={clsx("text-center", {
            "mt-3 sm:mt-5": !!icon,
          })}
        >
          <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
            {title}
          </Dialog.Title>
          <div className="mt-2">
            <p className="text-sm text-gray-500">{message}</p>
          </div>
        </div>
      </ModalContent>
      <ModalActions className="pb-4 pt-0 sm:pb-6">
        <Button
          variant="outlined"
          color="secondary"
          className="min-w-[120px] flex-1"
          disabled={loading}
          onClick={onCancel}
        >
          {cancelButtonText || t("common.cancel")}
        </Button>
        <Button color={color} className="min-w-[120px] flex-1" loading={loading} onClick={onConfirm}>
          {confirmButtonText || t("common.yes")}
        </Button>
      </ModalActions>
    </Modal>
  );
};

export default ConfirmModal;
