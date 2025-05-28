"use client";

import { Menu, Transition } from "@headlessui/react";
import {
  ClipboardIcon,
  DocumentTextIcon,
  EllipsisVerticalIcon,
  PencilSquareIcon,
  ShareIcon,
  TrashIcon,
  TruckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { Fragment, MouseEvent, useCallback, useMemo } from "react";

import { Link, VisibleWithSetting } from "@/components/atoms";
import { Authorization } from "@/components/molecules";
import { OrganizationSettingExtendedKey } from "@/constants/organizationSettingExtended";
import { useAuth, usePermission } from "@/hooks";
import { OrderInfo } from "@/types/strapi";
import { equalId } from "@/utils/number";
import { getOrderStatusFlags } from "@/utils/order";

export type OrderMenuProps = {
  order: OrderInfo;
  onDeleted?: (order: OrderInfo) => void;
  onCanceled?: (order: OrderInfo) => void;
  actionPlacement?: "start" | "center" | "end";
  isEdit?: boolean;
  isView?: boolean;
  isOnPlanOrder?: boolean;
  isVisibleDelete?: boolean;
  onShare?: (order: OrderInfo) => void;
  openVehicleDispatchModal?: (orderCode: string) => () => void;
};

const OrderMenu = ({
  order,
  onDeleted,
  onCanceled,
  actionPlacement,
  isEdit,
  isView,
  onShare,
  isOnPlanOrder = false,
  isVisibleDelete = true,
  openVehicleDispatchModal,
}: OrderMenuProps) => {
  const { orgLink, userId } = useAuth();
  const t = useTranslations();
  const { canDeleteOwn, canEditOwn } = usePermission("order");
  const { isDraft, isCanceled, isCompleted } = useMemo(() => getOrderStatusFlags({ ...order }), [order]);

  const handleDelete = useCallback(
    (close: () => void) => (event: MouseEvent<HTMLButtonElement>) => {
      close();
      event.preventDefault();
      !isCompleted && onDeleted && onDeleted(order);
    },
    [isCompleted, onDeleted, order]
  );

  const handleCancel = useCallback(
    (close: () => void) => (event: MouseEvent<HTMLButtonElement>) => {
      close();
      event.preventDefault();
      !isCanceled && !isDraft && !isCompleted && onCanceled && onCanceled(order);
    },
    [isCanceled, isCompleted, isDraft, onCanceled, order]
  );

  const handleShare = useCallback(
    (close: () => void) => (event: MouseEvent<HTMLButtonElement>) => {
      close();
      event.preventDefault();
      !isCanceled && !isDraft && onShare && onShare(order);
    },
    [isCanceled, isDraft, onShare, order]
  );

  return (
    <Menu as="div" className="relative inline-block">
      <div>
        <Menu.Button className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-transparent text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2">
          <span className="sr-only">Open options</span>
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
          className={clsx(
            "absolute right-9 z-50 w-48 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none",
            {
              "bottom-0": actionPlacement === "start",
              "top-1/2 -translate-y-1/2": actionPlacement === "center",
              "top-0": actionPlacement === "end",
            }
          )}
        >
          <div className="py-1">
            {isDraft ? (
              <Authorization
                resource="order"
                action="edit"
                alwaysAuthorized={(canEditOwn() && equalId(order.createdByUser.id, userId)) || isEdit}
              >
                <Menu.Item>
                  {({ active, close }) => (
                    <Link
                      useDefaultStyle
                      href={`${orgLink}/orders/new?orderId=${order.code}`}
                      className={clsx("flex px-4 py-2 text-sm", {
                        "bg-gray-100 text-gray-900": active,
                        "text-gray-700": !active,
                      })}
                      onClick={close}
                    >
                      <PencilSquareIcon className="mr-3 h-5 w-5 text-gray-400" aria-hidden="true" />
                      <span>{t("common.edit")}</span>
                    </Link>
                  )}
                </Menu.Item>
              </Authorization>
            ) : (
              <Authorization resource="order" action="detail" alwaysAuthorized={isEdit || isView}>
                <Menu.Item disabled={isDraft}>
                  {({ active, close }) => (
                    <Link
                      useDefaultStyle
                      href={isDraft ? "#" : `${orgLink}/orders/${order.code}?tab=information`}
                      className={clsx("flex px-4 py-2 text-sm", {
                        "bg-gray-100 text-gray-900": active,
                        "text-gray-700": !active,
                        "cursor-not-allowed opacity-50": isDraft,
                      })}
                      onClick={close}
                    >
                      <DocumentTextIcon className="mr-3 h-5 w-5 text-gray-400" aria-hidden="true" />
                      <span>{t("common.detail")}</span>
                    </Link>
                  )}
                </Menu.Item>
              </Authorization>
            )}

            <VisibleWithSetting settingKey={OrganizationSettingExtendedKey.ORDER_CONSOLIDATION_ENABLED} expect={false}>
              <Authorization resource="order-trip" action="find" alwaysAuthorized={isEdit || isView}>
                <Menu.Item disabled={isDraft || isCanceled || isCompleted}>
                  {({ active, close }) =>
                    isOnPlanOrder ? (
                      <button
                        className={clsx(
                          "flex w-full px-4 py-2 text-sm font-medium leading-6 text-blue-700 hover:text-blue-600",
                          {
                            "bg-gray-100 text-gray-900": active,
                            "text-gray-700": !active,
                            "cursor-not-allowed opacity-50": isDraft || isCanceled || isCompleted,
                          }
                        )}
                        onClick={openVehicleDispatchModal && openVehicleDispatchModal(order.code)}
                      >
                        <TruckIcon className="mr-3 h-5 w-5 text-gray-400" aria-hidden="true" />
                        <span>{t("order.vehicle_dispatch.title")}</span>
                      </button>
                    ) : (
                      <Link
                        useDefaultStyle
                        href={
                          isDraft || isCanceled || isCompleted
                            ? "#"
                            : `${orgLink}/orders/${order.code}?tab=dispatch-vehicle`
                        }
                        className={clsx("flex px-4 py-2 text-sm", {
                          "bg-gray-100 text-gray-900": active,
                          "text-gray-700": !active,
                          "cursor-not-allowed opacity-50": isDraft || isCanceled || isCompleted,
                        })}
                        onClick={close}
                      >
                        <TruckIcon className="mr-3 h-5 w-5 text-gray-400" aria-hidden="true" />
                        <span>{t("order.vehicle_dispatch.title")}</span>
                      </Link>
                    )
                  }
                </Menu.Item>
              </Authorization>
            </VisibleWithSetting>

            <Menu.Item>
              {({ active, close }) => (
                <Authorization
                  resource="order"
                  action="new"
                  fallbackComponent={
                    <div className="flex cursor-not-allowed px-4 py-2 text-sm text-gray-700 opacity-50">
                      <ClipboardIcon className="mr-3 h-5 w-5 text-gray-400" aria-hidden="true" />
                      <span>{t("common.copy")}</span>
                    </div>
                  }
                >
                  <Link
                    useDefaultStyle
                    href={`${orgLink}/orders/new?copyId=${order.code}`}
                    className={clsx("flex px-4 py-2 text-sm", {
                      "bg-gray-100 text-gray-900": active,
                      "text-gray-700": !active,
                    })}
                    onClick={close}
                  >
                    <ClipboardIcon className="mr-3 h-5 w-5 text-gray-400" aria-hidden="true" />
                    <span>{t("common.copy")}</span>
                  </Link>
                </Authorization>
              )}
            </Menu.Item>

            {!isCanceled && !isDraft && (
              <Authorization resource="order" action="share">
                <Menu.Item disabled={isDraft}>
                  {({ active, close }) => (
                    <button
                      onClick={handleShare(close)}
                      className={clsx("flex w-full px-4 py-2 text-sm font-medium hover:text-blue-700", {
                        "bg-gray-100 text-gray-900": active,
                        "text-gray-700": !active,
                      })}
                    >
                      <ShareIcon className="mr-3 h-5 w-5 text-gray-400" aria-hidden="true" />
                      <span>{t("common.share")}</span>
                    </button>
                  )}
                </Menu.Item>
              </Authorization>
            )}
          </div>
          <div className="py-1">
            {!isDraft && (
              <Menu.Item disabled={isCanceled || isCompleted}>
                {({ active, close }) => (
                  <Authorization
                    resource="order"
                    action="cancel"
                    fallbackComponent={
                      <div className="flex cursor-not-allowed px-4 py-2 text-sm text-red-400 opacity-50">
                        <XMarkIcon className="mr-3 h-5 w-5 text-red-400 group-hover:text-red-500" aria-hidden="true" />
                        <span>{t("common.cancel")}</span>
                      </div>
                    }
                  >
                    <button
                      onClick={handleCancel(close)}
                      className={clsx("flex w-full px-4 py-2 text-sm", {
                        "bg-gray-100 text-red-500": active,
                        "text-red-400": !active,
                        "cursor-not-allowed opacity-50": isCanceled || isCompleted,
                      })}
                    >
                      <XMarkIcon className="mr-3 h-5 w-5 text-red-400 group-hover:text-red-500" aria-hidden="true" />
                      <span>{t("common.cancel")}</span>
                    </button>
                  </Authorization>
                )}
              </Menu.Item>
            )}
            {isVisibleDelete && (
              <Menu.Item disabled={isCompleted}>
                {({ active, close }) => (
                  <Authorization
                    resource="order"
                    action="delete"
                    alwaysAuthorized={canDeleteOwn() && equalId(order?.createdByUser?.id, userId)}
                    fallbackComponent={
                      <div className="flex cursor-not-allowed px-4 py-2 text-sm text-red-400 opacity-50">
                        <TrashIcon className="mr-3 h-5 w-5 text-red-400 group-hover:text-red-500" aria-hidden="true" />
                        <span>{t("common.delete")}</span>
                      </div>
                    }
                  >
                    <button
                      onClick={handleDelete(close)}
                      className={clsx("flex w-full px-4 py-2 text-sm", {
                        "bg-gray-100 text-red-500": active,
                        "text-red-400": !active,
                        "cursor-not-allowed opacity-50": isCompleted,
                      })}
                    >
                      <TrashIcon className="mr-3 h-5 w-5 text-red-400 group-hover:text-red-500" aria-hidden="true" />
                      <span>{t("common.delete")}</span>
                    </button>
                  </Authorization>
                )}
              </Menu.Item>
            )}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
};

export default OrderMenu;
