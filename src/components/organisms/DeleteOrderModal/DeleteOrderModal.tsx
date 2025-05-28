"use client";

import { Dialog, Transition } from "@headlessui/react";
import { useTranslations } from "next-intl";
import { ChangeEvent, Fragment, useCallback, useState } from "react";

import { Button, TextField } from "@/components/molecules";
import { OrderInfo } from "@/types/strapi";

export type DeleteOrderModalProps = {
  open: boolean;
  order: OrderInfo;
  onClose?: () => void;
  onConfirm?: (order: OrderInfo) => void;
};

const DeleteOrderModal = ({ open, order, onClose, onConfirm }: DeleteOrderModalProps) => {
  const t = useTranslations();
  const [code, setCode] = useState<string>("");

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setCode(event.target.value);
  }, []);

  const handleClose = useCallback(() => {
    setCode("");
    onClose && onClose();
  }, [onClose]);

  const handleConfirm = useCallback(() => {
    setCode("");
    onConfirm && onConfirm(order);
  }, [onConfirm, order]);

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="text-left">
                  <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
                    {t("order.delete_modal.title")}
                  </Dialog.Title>
                  <div className="mt-2 space-y-2">
                    <p className="text-sm text-gray-500">
                      {t.rich("order.delete_modal.message", {
                        strong: (chunks) => <strong>{chunks}</strong>,
                        code: order?.code,
                      })}
                    </p>
                    <p className="text-sm text-gray-500">
                      {t.rich("order.delete_modal.description", {
                        strong: (chunks) => <strong>{chunks}</strong>,
                      })}
                    </p>
                    <p className="text-sm text-gray-500">{t("order.delete_modal.confirmation_message")}</p>
                  </div>
                </div>

                <div className="my-2">
                  <TextField label={t("order.code")} value={code} onChange={handleChange} autoComplete="last-name" />
                </div>

                <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                  <Button type="button" variant="outlined" color="secondary" onClick={handleClose}>
                    {t("common.cancel")}
                  </Button>
                  <Button type="button" color="error" disabled={code !== order?.code} onClick={handleConfirm}>
                    {t("order.delete_modal.delete")}
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default DeleteOrderModal;
