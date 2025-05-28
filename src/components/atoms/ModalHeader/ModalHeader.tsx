"use client";

import { Dialog } from "@headlessui/react";
import clsx from "clsx";
import { ReactNode } from "react";

export type ModalHeaderProps = {
  title: ReactNode;
  subTitle?: string;
  actionComponent?: ReactNode;
  actionComponentClassName?: string;
  className?: string;
};

const ModalHeader = ({ title, subTitle, actionComponent, className, actionComponentClassName }: ModalHeaderProps) => {
  return (
    <div
      className={clsx("rounded-lg bg-gray-50 p-4 sm:px-6", className, {
        "flex flex-wrap items-center justify-between gap-x-4 gap-y-3 sm:flex-nowrap": actionComponent,
      })}
    >
      <Dialog.Title as="h3" className="space-x-2 text-base font-semibold leading-6 text-gray-900">
        <span>{title}</span>
        {subTitle && <span className="block text-sm font-normal text-gray-500 sm:inline-block">{subTitle}</span>}
      </Dialog.Title>
      {actionComponent && <div className={actionComponentClassName}>{actionComponent}</div>}
    </div>
  );
};

export default ModalHeader;
