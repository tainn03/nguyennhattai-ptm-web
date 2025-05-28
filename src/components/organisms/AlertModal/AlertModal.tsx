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

export type AlertModalProps = {
  icon?: "success" | "warning" | "error" | "info" | "question";
  color?: "primary" | "error";
  open: boolean;
  title: string;
  message: string;
  confirmButtonText?: string;
  onClose?: () => void;
  onConfirm?: () => void;
};

const AlertModal = ({
  open,
  icon,
  color = "primary",
  title,
  message,
  confirmButtonText,
  onClose,
  onConfirm,
}: AlertModalProps) => {
  const t = useTranslations();
  return (
    <Modal open={open} divider={false} className="sm:!max-w-sm" onDismiss={onClose}>
      <ModalContent>
        {icon && (
          <div
            className={clsx("mx-auto flex h-12 w-12 items-center justify-center rounded-full", {
              "bg-green-600/20": icon === "success",
              "bg-red-600/20": icon === "error",
              "bg-yellow-600/20": icon === "warning",
              "bg-blue-700/20": icon === "question",
              "bg-sky-500/20": icon === "info",
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
        <Button color={color} className="flex-1" onClick={onConfirm}>
          {confirmButtonText || t("common.yes")}
        </Button>
      </ModalActions>
    </Modal>
  );
};

export default AlertModal;
