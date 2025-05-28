"use client";

import { Dialog, Transition } from "@headlessui/react";
import {
  CheckIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Link } from "@/components/atoms";
import { VerificationField } from "@/components/molecules";
import { AlertModalProps } from "@/components/organisms/AlertModal/AlertModal";
import { countdown } from "@/utils/date";

export type VerificationModalProps = Partial<AlertModalProps> & {
  confirmType: "email" | "phone";
  cancelButtonText?: string;
  onCancel?: () => void;
};

const VerificationModal = ({
  open,
  icon = "success",
  color = "primary",
  title = "Xác nhận mã",
  message,
  confirmType,
  cancelButtonText = "Hủy",
  confirmButtonText = "Xác nhận",
  onClose,
  onCancel,
  onConfirm,
}: VerificationModalProps) => {
  const [seconds, setSeconds] = useState(0);
  const cancelButtonRef = useRef(null);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined = undefined;
    if (open) {
      setSeconds(59);
      intervalId = setInterval(() => {
        setSeconds((prevValue) => {
          const newValue = prevValue - 1;
          if (newValue === 0) {
            clearInterval(intervalId);
          }
          return newValue;
        });
      }, 1000);
    }

    return () => {
      clearInterval(intervalId);
    };
  }, [open]);

  const handleClose = useCallback(() => {
    onClose && onClose();
  }, [onClose]);

  const notifyMessage = useMemo(() => {
    if (!message) {
      if (confirmType === "email") {
        return "Một mã xác nhận gồm 6 số đã được gửi vào địa chỉ email <strong>email@example.com</strong>. Hãy kiểm tra email và nhập mã xác nhận vào ô bên dưới để tiếp tục.";
      }
      if (confirmType === "phone") {
        return "Một mã xác nhận gồm 6 số đã được gửi vào số điện thoại <strong>+84123456789</strong>. Hãy kiểm tra điện thoại và nhập mã xác nhận vào ô bên dưới để tiếp tục.";
      }
    }
    return message || "";
  }, [confirmType, message]);

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" initialFocus={cancelButtonRef} onClose={handleClose}>
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
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md sm:p-6">
                <div>
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
                      {icon === "error" && (
                        <ExclamationTriangleIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                      )}
                      {icon === "warning" && (
                        <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" aria-hidden="true" />
                      )}
                      {icon === "question" && (
                        <QuestionMarkCircleIcon className="h-6 w-6 text-blue-600" aria-hidden="true" />
                      )}
                      {icon === "info" && <ExclamationCircleIcon className="h-6 w-6 text-sky-600" aria-hidden="true" />}
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
                      <p className="text-sm text-gray-500" dangerouslySetInnerHTML={{ __html: notifyMessage }} />
                    </div>
                    <div className="mt-10">
                      <VerificationField />
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                  <button
                    type="button"
                    className={clsx(
                      "inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:col-start-2",
                      {
                        "bg-indigo-600 hover:bg-indigo-500 focus-visible:outline-indigo-600": color === "primary",
                        "bg-red-600 hover:bg-red-500 focus-visible:outline-red-600": color === "error",
                      }
                    )}
                    onClick={onConfirm}
                  >
                    {confirmButtonText}
                  </button>
                  <button
                    type="button"
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
                    onClick={onCancel}
                    ref={cancelButtonRef}
                  >
                    {cancelButtonText}
                  </button>
                </div>

                <p className="mt-10 text-center text-sm text-gray-500">
                  Không nhận được mã xác nhân?{" "}
                  {seconds === 0 ? (
                    <Link
                      useDefaultStyle
                      href="#"
                      className="font-semibold leading-6 text-indigo-600 hover:text-indigo-500"
                    >
                      Gửi lại
                    </Link>
                  ) : (
                    <>
                      Gửi lại sau
                      <span className="ml-1">{countdown(seconds)}</span>
                    </>
                  )}
                </p>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default VerificationModal;
