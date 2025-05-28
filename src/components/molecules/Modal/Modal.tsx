"use client";

import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Fragment, useCallback } from "react";

import { DefaultReactProps } from "@/types";
import { cn } from "@/utils/twcn";

export type ModalProps = DefaultReactProps & {
  open: boolean;
  showCloseButton?: boolean;
  divider?: boolean;
  size?: "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl" | "7xl" | "full";
  allowOverflow?: boolean;
  className?: string;
  dialogClassName?: string;
  onClose?: () => void;
  onDismiss?: () => void;
};

const Modal = ({
  open,
  showCloseButton = false,
  divider = true,
  size = "lg",
  className,
  dialogClassName,
  children,
  allowOverflow,
  onClose,
  onDismiss,
}: ModalProps) => {
  const handleClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const handleClose = useCallback(() => {
    onClose && onClose();
  }, [onClose]);

  const handleDismiss = useCallback(() => {
    onDismiss && onDismiss();
  }, [onDismiss]);

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className={cn("relative z-50", dialogClassName)} onClick={handleClick} onClose={handleDismiss}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity " />
        </Transition.Child>
        <div className="fixed inset-0 z-10 w-screen overflow-y-auto sm:p-4">
          <div className="flex min-h-full items-center justify-center text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel
                className={cn(
                  "relative w-full transform rounded-none bg-white text-left shadow-xl transition-all sm:rounded-lg",
                  className,
                  {
                    "sm:max-w-lg": size === "lg",
                    "sm:max-w-xl": size === "xl",
                    "sm:max-w-2xl": size === "2xl",
                    "sm:max-w-3xl": size === "3xl",
                    "sm:max-w-4xl": size === "4xl",
                    "sm:max-w-5xl": size === "5xl",
                    "sm:max-w-6xl": size === "6xl",
                    "sm:max-w-7xl": size === "7xl",
                    "sm:max-w-full": size === "full",
                  },
                  {
                    "overflow-visible": allowOverflow,
                    "overflow-hidden": !allowOverflow,
                  }
                )}
              >
                {showCloseButton && (
                  <div className="absolute right-0 top-0 block pr-4 pt-4">
                    <button
                      type="button"
                      className="btn-close rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2"
                      onClick={handleClose}
                    >
                      <span className="sr-only">Close</span>
                      <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </div>
                )}
                <div
                  className={cn({
                    "divide-y divide-gray-200 [&>form]:divide-y [&>form]:divide-gray-200": divider,
                  })}
                >
                  {children}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default Modal;
