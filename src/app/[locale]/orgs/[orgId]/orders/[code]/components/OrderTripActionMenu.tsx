"use client";

import { Menu, Transition } from "@headlessui/react";
import {
  BanknotesIcon,
  DocumentCheckIcon,
  EllipsisVerticalIcon,
  PencilSquareIcon,
  ShareIcon,
  TrashIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { Fragment } from "react";
import { LuCalendarClock, LuCalendarOff } from "react-icons/lu";

import { Link } from "@/components/atoms";
import { Authorization } from "@/components/molecules";
import { usePermission } from "@/hooks";

export type OrderTripActionMenuProps = {
  editLink?: string;
  actionPlacement?: "start" | "center" | "end";
  disabled?: boolean;
  onEdit?: () => void;
  onUpdateStatus?: () => void;
  onUpdateBillOfLading?: () => void;
  onDelete?: () => void;
  onInputSalary?: () => void;
  onUpdateSchedule?: () => void;
  onDeleteSchedule?: () => void;
  onShare?: () => void;
  isEditor: boolean;
  isVisibleNotificationSchedule: boolean;
  flagEditOwn: boolean;
};

const OrderTripActionMenu = ({
  editLink,
  actionPlacement,
  disabled,
  onEdit,
  onDelete,
  onUpdateStatus,
  onUpdateBillOfLading,
  onInputSalary,
  onUpdateSchedule,
  onDeleteSchedule,
  isVisibleNotificationSchedule,
  onShare,
  isEditor,
  flagEditOwn,
}: OrderTripActionMenuProps) => {
  const t = useTranslations();
  const { canEdit, canEditOwn, canDelete, canDeleteOwn } = usePermission("order-trip");
  const { canDetail: canDetailExpense } = usePermission("trip-driver-expense");
  const { canDetail: canDetailBillOfLading } = usePermission("bill-of-lading");

  return (
    <Menu as="div" className="relative flex justify-center">
      <div>
        <Menu.Button className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-transparent text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2">
          <EllipsisVerticalIcon className="h-5 w-5 text-gray-500" aria-hidden="true" />
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
          className={clsx(
            "absolute right-9 z-10 w-52 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none",
            {
              "bottom-0": actionPlacement === "start",
              "top-1/2 -translate-y-1/2": actionPlacement === "center",
              "top-0": actionPlacement === "end",
            }
          )}
        >
          <div className="py-1">
            {editLink && (
              <Menu.Item disabled={!(canEdit() || (canEditOwn() && flagEditOwn) || isEditor) || disabled}>
                {({ active }) => (
                  <Link
                    useDefaultStyle
                    href={editLink}
                    className={clsx("group flex w-full items-center px-4 py-2 text-sm", {
                      "bg-gray-100 text-gray-900": active,
                      "text-gray-700": !active,
                      "cursor-not-allowed opacity-50":
                        !(canEdit() || (canEditOwn() && flagEditOwn) || isEditor) || disabled,
                    })}
                  >
                    <PencilSquareIcon
                      className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500"
                      aria-hidden="true"
                    />
                    {t("common.edit")}
                  </Link>
                )}
              </Menu.Item>
            )}
            <Menu.Item disabled={!(canEdit() || (canEditOwn() && flagEditOwn) || isEditor) || !onEdit || disabled}>
              {({ active }) => (
                <button
                  onClick={onEdit}
                  className={clsx("group flex w-full items-center px-4 py-2 text-sm", {
                    "bg-gray-100 text-gray-900": active,
                    "text-gray-700": !active,
                    "cursor-not-allowed opacity-50":
                      !(canEdit() || (canEditOwn() && flagEditOwn) || isEditor) || !onEdit || disabled,
                  })}
                >
                  <PencilSquareIcon
                    className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500"
                    aria-hidden="true"
                  />
                  {t("common.edit")}
                </button>
              )}
            </Menu.Item>
            <Menu.Item
              disabled={!(canEdit() || (canEditOwn() && flagEditOwn) || isEditor) || !onUpdateStatus || disabled}
            >
              {({ active }) => (
                <button
                  onClick={onUpdateStatus}
                  className={clsx("group flex w-full items-center px-4 py-2 text-sm", {
                    "bg-gray-100 text-gray-900": active,
                    "text-gray-700": !active,
                    "cursor-not-allowed opacity-50":
                      !(canEdit() || (canEditOwn() && flagEditOwn) || isEditor) || !onUpdateStatus || disabled,
                  })}
                >
                  <TruckIcon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" aria-hidden="true" />
                  {t("order.vehicle_dispatch.vehicle_dispatch_update_status")}
                </button>
              )}
            </Menu.Item>
            <Menu.Item disabled={!canDetailBillOfLading() || !onUpdateBillOfLading || disabled}>
              {({ active }) => (
                <button
                  onClick={onUpdateBillOfLading}
                  className={clsx("group flex w-full items-center px-4 py-2 text-sm", {
                    "bg-gray-100 text-gray-900": active,
                    "text-gray-700": !active,
                    "cursor-not-allowed opacity-50": !canDetailBillOfLading() || !onUpdateBillOfLading || disabled,
                  })}
                >
                  <DocumentCheckIcon
                    className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500"
                    aria-hidden="true"
                  />
                  {t("order.vehicle_dispatch.vehicle_dispatch_update_document")}
                </button>
              )}
            </Menu.Item>
            <Menu.Item disabled={!canDetailExpense() || !onInputSalary || disabled}>
              {({ active }) => (
                <button
                  onClick={onInputSalary}
                  className={clsx("group flex w-full items-center px-4 py-2 text-sm", {
                    "bg-gray-100 text-gray-900": active,
                    "text-gray-700": !active,
                    "cursor-not-allowed opacity-50": !canDetailExpense() || !onInputSalary || disabled,
                  })}
                >
                  <BanknotesIcon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" aria-hidden="true" />
                  {t("order.vehicle_dispatch.vehicle_dispatch_update_driver_salary")}
                </button>
              )}
            </Menu.Item>
            {isVisibleNotificationSchedule && (
              <>
                <Menu.Item disabled={!(canEdit() || (canEditOwn() && flagEditOwn) || isEditor) || disabled}>
                  {({ active }) => (
                    <button
                      onClick={onUpdateSchedule}
                      className={clsx("group flex w-full items-center px-4 py-2 text-sm", {
                        "bg-gray-100 text-gray-900": active,
                        "text-gray-700": !active,
                        "cursor-not-allowed opacity-50":
                          !(canEdit() || (canEditOwn() && flagEditOwn) || isEditor) || disabled,
                      })}
                    >
                      <LuCalendarClock
                        className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500"
                        aria-hidden="true"
                      />
                      {t(
                        onUpdateSchedule && !onDeleteSchedule
                          ? "order.driver_notification_scheduled_modal.setting_schedule"
                          : "order.driver_notification_scheduled_modal.update_schedule"
                      )}
                    </button>
                  )}
                </Menu.Item>
                {onDeleteSchedule && (
                  <Menu.Item disabled={!(canEdit() || (canEditOwn() && flagEditOwn) || isEditor) || disabled}>
                    {({ active }) => (
                      <button
                        onClick={onDeleteSchedule}
                        className={clsx("group flex w-full items-center px-4 py-2 text-sm", {
                          "bg-gray-100 text-gray-900": active,
                          "text-gray-700": !active,
                          "cursor-not-allowed opacity-50":
                            !(canEdit() || (canEditOwn() && flagEditOwn) || isEditor) || disabled,
                        })}
                      >
                        <LuCalendarOff
                          className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500"
                          aria-hidden="true"
                        />
                        {t("order.driver_notification_scheduled_modal.delete_schedule")}
                      </button>
                    )}
                  </Menu.Item>
                )}
              </>
            )}
            <Authorization resource="order-trip" action="share">
              <Menu.Item disabled={disabled}>
                {({ active }) => (
                  <button
                    type="button"
                    className={clsx("group flex w-full items-center px-4 py-2 text-sm", {
                      "bg-gray-100 text-gray-900": active,
                      "text-gray-700": !active,
                      "cursor-not-allowed opacity-50": disabled,
                    })}
                    onClick={onShare}
                  >
                    <ShareIcon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" aria-hidden="true" />
                    <span>{t("common.share")}</span>
                  </button>
                )}
              </Menu.Item>
            </Authorization>
          </div>
          <div className="py-1">
            <Menu.Item
              disabled={!(canDelete() || (canDeleteOwn() && flagEditOwn) || isEditor) || !onDelete || disabled}
            >
              {({ active }) => (
                <button
                  type="button"
                  className={clsx("group flex w-full items-center px-4 py-2 text-sm", {
                    "bg-gray-100 text-red-500": active,
                    "text-red-400": !active,
                    "cursor-not-allowed opacity-50":
                      !(canDelete() || (canDeleteOwn() && flagEditOwn) || isEditor) || !onDelete || disabled,
                  })}
                  onClick={onDelete}
                >
                  <TrashIcon className="mr-3 h-5 w-5 text-red-400 group-hover:text-red-500" aria-hidden="true" />
                  {t("common.delete")}
                </button>
              )}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
};

export default OrderTripActionMenu;
