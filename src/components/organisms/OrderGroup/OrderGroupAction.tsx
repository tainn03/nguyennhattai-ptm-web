"use client";

import { Menu, Transition } from "@headlessui/react";
import { EllipsisVerticalIcon, PencilSquareIcon, ShareIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { Fragment } from "react";
import { IoCheckmarkDoneOutline, IoDocumentTextOutline } from "react-icons/io5";
import { TbPackageExport, TbPackageImport } from "react-icons/tb";

import { cn } from "@/utils/twcn";

export type OrderGroupActionProps = {
  actionPlacement?: "start" | "center" | "end";
  onCancel?: () => void;
  onShare?: () => void;
  onEdit?: () => void;
  onInbound?: () => void;
  onOutbound?: () => void;
  onUpdateStatus?: () => void;
  onUpdateBillOfLading?: () => void;
};

const OrderGroupAction = ({
  actionPlacement,
  onInbound,
  onOutbound,
  onShare,
  onCancel,
  onEdit,
  onUpdateStatus,
  onUpdateBillOfLading,
}: OrderGroupActionProps) => {
  const t = useTranslations();

  if (!onShare && !onInbound && !onOutbound && !onUpdateStatus && !onEdit && !onCancel && !onUpdateBillOfLading) {
    return null;
  }

  return (
    <Menu as="div" className="relative inline-block">
      <div>
        <Menu.Button className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-transparent text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2">
          <span className="sr-only">{t("common.actions")}</span>
          <EllipsisVerticalIcon className="h-5 w-5" aria-hidden="true" />
        </Menu.Button>
      </div>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items
          className={cn(
            "absolute right-9 z-50 w-48 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none",
            {
              "bottom-0": actionPlacement === "start",
              "top-1/2 -translate-y-1/2": actionPlacement === "center",
              "top-0": actionPlacement === "end",
            }
          )}
        >
          <div className="py-1">
            {/* Edit button */}
            {onEdit && (
              <Menu.Item>
                {({ active }) => (
                  <button
                    type="button"
                    onClick={onEdit}
                    className={cn("flex w-full px-4 py-2 text-sm", {
                      "bg-gray-100 text-gray-900": active,
                      "text-gray-700": !active,
                    })}
                  >
                    <PencilSquareIcon className="mr-3 h-5 w-5 text-gray-400" aria-hidden="true" />
                    {t("common.edit")}
                  </button>
                )}
              </Menu.Item>
            )}

            {onInbound && (
              <Menu.Item>
                {({ active }) => (
                  <button
                    type="button"
                    onClick={onInbound}
                    className={cn("flex w-full px-4 py-2 text-sm", {
                      "bg-gray-100 text-gray-900": active,
                      "text-gray-700": !active,
                    })}
                  >
                    <TbPackageImport className="mr-3 h-5 w-5 text-gray-400" aria-hidden="true" />
                    {t("order_group.inbound")}
                  </button>
                )}
              </Menu.Item>
            )}

            {onOutbound && (
              <Menu.Item>
                {({ active }) => (
                  <button
                    type="button"
                    onClick={onOutbound}
                    className={cn("flex w-full px-4 py-2 text-sm", {
                      "bg-gray-100 text-gray-900": active,
                      "text-gray-700": !active,
                    })}
                  >
                    <TbPackageExport className="mr-3 h-5 w-5 text-gray-400" aria-hidden="true" />
                    {t("order_group.outbound")}
                  </button>
                )}
              </Menu.Item>
            )}

            {onUpdateStatus && (
              <Menu.Item>
                {({ active }) => (
                  <button
                    type="button"
                    onClick={onUpdateStatus}
                    className={cn("flex w-full px-4 py-2 text-sm", {
                      "bg-gray-100 text-gray-900": active,
                      "text-gray-700": !active,
                    })}
                  >
                    <IoCheckmarkDoneOutline className="mr-3 h-5 w-5 text-gray-400" aria-hidden="true" />
                    {t("order_group.update_status")}
                  </button>
                )}
              </Menu.Item>
            )}

            {onUpdateBillOfLading && (
              <Menu.Item>
                {({ active }) => (
                  <button
                    type="button"
                    onClick={onUpdateBillOfLading}
                    className={cn("flex w-full px-4 py-2 text-sm", {
                      "bg-gray-100 text-gray-900": active,
                      "text-gray-700": !active,
                    })}
                  >
                    <IoDocumentTextOutline className="mr-3 h-5 w-5 text-gray-400" aria-hidden="true" />
                    {t("order_group.update_bill_of_lading")}
                  </button>
                )}
              </Menu.Item>
            )}

            {/* Share button */}
            {onShare && (
              <Menu.Item>
                {({ active }) => (
                  <button
                    type="button"
                    onClick={onShare}
                    className={cn("flex w-full  px-4 py-2 text-sm", {
                      "bg-gray-100 text-gray-900": active,
                      "text-gray-700": !active,
                    })}
                  >
                    <ShareIcon className="mr-3 h-5 w-5 text-gray-400" aria-hidden="true" />
                    {t("common.share")}
                  </button>
                )}
              </Menu.Item>
            )}
          </div>

          {/* Cancel button */}
          {onCancel && (
            <div className="py-1">
              <Menu.Item>
                {({ active }) => (
                  <button
                    type="button"
                    onClick={onCancel}
                    className={cn("flex w-full px-4 py-2 text-sm", {
                      "bg-gray-100 text-red-500": active,
                      "text-red-400": !active,
                    })}
                  >
                    <XMarkIcon className="mr-3 h-5 w-5 text-red-400" aria-hidden="true" />
                    {t("common.cancel")}
                  </button>
                )}
              </Menu.Item>
            </div>
          )}
        </Menu.Items>
      </Transition>
    </Menu>
  );
};

export default OrderGroupAction;
