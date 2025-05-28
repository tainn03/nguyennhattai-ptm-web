"use client";

import { Menu, Transition } from "@headlessui/react";
import { EllipsisVerticalIcon, EnvelopeOpenIcon, TrashIcon } from "@heroicons/react/24/outline";
import { NotificationType } from "@prisma/client";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { Fragment, useCallback, useMemo } from "react";

import { DateTimeLabel } from "@/components/atoms";
import { Avatar } from "@/components/molecules";
import { useAuth, usePermission } from "@/hooks";
import { checkOrderIsDeleted } from "@/services/client/order";
import { ApiResult } from "@/types/api";
import {
  BillOfLadingReminderNotification,
  NotificationData,
  VehicleDocumentDriverReminder,
} from "@/types/notification";
import { NotificationRecipientInfo } from "@/types/strapi";
import { post } from "@/utils/api";
import { getAccountInfo } from "@/utils/auth";
import { getNotificationNavigationLink } from "@/utils/string";

const NOTIFICATION_ICON = "/assets/icons/notification.ico";
const MODAL_OPENED_TYPES = [
  NotificationType.BILL_OF_LADING_ACCOUNTANT_REMINDER,
  NotificationType.VEHICLE_DOCUMENT_OPERATOR_REMINDER,
];

type NotificationListItemProps = {
  data: NotificationRecipientInfo;
  onDelete: (notification: Partial<NotificationRecipientInfo>) => void;
  onMarkAsRead: (notification: Partial<NotificationRecipientInfo>) => void;
  onOpenMessage: (notification: NotificationRecipientInfo, driverUserId: number, isCanceled?: boolean) => void;
  onOpenModal?: (notification: NotificationData, type: NotificationType) => void;
};

const NotificationListItem = ({
  data,
  onDelete,
  onMarkAsRead,
  onOpenMessage,
  onOpenModal,
}: NotificationListItemProps) => {
  const t = useTranslations();
  const router = useRouter();
  const { orgLink, orgId } = useAuth();
  const { canDelete, canEdit } = usePermission("notification");
  const { canFind } = usePermission("order-trip-message");

  const accountInfo = useMemo(() => getAccountInfo(data.notification.createdByUser), [data.notification.createdByUser]);
  const isOpenModalType = useMemo(
    () => MODAL_OPENED_TYPES.some((type) => type === data.notification.type),
    [data.notification.type]
  );

  const meta = useMemo(() => {
    const metaObj = JSON.parse(JSON.stringify(data.notification.meta));

    switch (data.notification.type) {
      case NotificationType.BILL_OF_LADING_ACCOUNTANT_REMINDER:
        metaObj.trips = (metaObj?.orderTrips || [])
          .map((trip: BillOfLadingReminderNotification) => trip.tripCode)
          .join(", ");
        break;
      case NotificationType.VEHICLE_DOCUMENT_OPERATOR_REMINDER:
        metaObj.vehicleNumbers = (metaObj?.vehicles || [])
          .map((vehicle: VehicleDocumentDriverReminder) => vehicle.vehicleNumber)
          .join(", ");
    }

    return metaObj;
  }, [data.notification.meta, data.notification.type]);

  /**
   * Gets the notification navigation link.
   */
  const navigationLink = useMemo(
    () =>
      meta.orderCode
        ? getNotificationNavigationLink(orgLink, data.notification.type, {
            orderCode: meta.orderCode,
            ...(data.notification.type === NotificationType.TRIP_NEW_MESSAGE && { tripCode: meta.tripCode }),
            ...(data.notification.type === NotificationType.TRIP_STATUS_CHANGED && { tripStatus: meta?.tripStatus }),
          })
        : null,
    [data.notification.type, meta.orderCode, meta.tripCode, meta.tripStatus, orgLink]
  );

  /**
   * Handles deleting the notification.
   */
  const handleDeleteNotification = useCallback(async () => {
    onDelete(data);
  }, [data, onDelete]);

  /**
   * Handles marking the notification as read.
   */
  const handleMarkAsRead = useCallback(async () => {
    if (!data.isRead) {
      onMarkAsRead(data);
    }
  }, [data, onMarkAsRead]);

  /**
   * Handles navigating to the notification link.
   */
  const handleNavigate = useCallback(async () => {
    // Mark notification as read
    if (!data.isRead) {
      onMarkAsRead(data);
      await post<ApiResult>(`/api${orgLink}/notifications/mark-as-read`, {
        notificationRecipientId: Number(data.id),
      });
    }

    // If notification is bill of lading accountant reminder, open the modal
    if (meta && data.notification?.type && isOpenModalType) {
      onOpenModal && onOpenModal(meta, data.notification.type);
    }

    // If order is deleted, return
    const isOrderDeleted = await checkOrderIsDeleted({ organizationId: Number(orgId), code: meta.orderCode });
    if (isOrderDeleted) {
      return;
    }

    // If notification is new message, open message
    if (data.notification.type === NotificationType.TRIP_NEW_MESSAGE) {
      onOpenMessage(data, Number(meta.driverUserId), data.notification.subject?.includes("canceled"));
    } else if (navigationLink) {
      router.push(navigationLink);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, meta, isOpenModalType, orgId, navigationLink, onMarkAsRead, orgLink, onOpenModal, onOpenMessage, router]);

  return (
    <li
      key={data.id}
      className={clsx("relative flex justify-between gap-x-6 p-4", {
        "bg-blue-50": !data.isRead,
        "bg-white": data.isRead,
      })}
    >
      <div className="flex min-w-0 gap-x-4">
        <Avatar
          size="medium"
          displayName={meta?.isSystemGenerated ? t("common.app.name") : accountInfo.displayName}
          avatarURL={meta?.isSystemGenerated ? NOTIFICATION_ICON : accountInfo.avatar}
        />
        <div className="min-w-0 flex-auto">
          <p className="text-sm font-semibold leading-6 text-gray-900">
            {data.notification.type === NotificationType.TRIP_NEW_MESSAGE && !canFind() ? (
              <div
                className={clsx(
                  "cursor-not-allowed text-sm font-medium leading-6 text-gray-900 opacity-50 hover:text-gray-800"
                )}
              >
                {t(data.notification.subject, { ...meta })}
              </div>
            ) : (
              <div
                onClick={handleNavigate}
                className={clsx("text-sm font-medium leading-6 text-gray-900 hover:text-gray-800", {
                  "cursor-pointer": !!navigationLink || isOpenModalType,
                })}
              >
                {t(data.notification.subject, { ...meta })}
              </div>
            )}
          </p>
          <p className="mt-1 flex text-xs leading-5 text-gray-500">
            <span className="relative">{t(data.notification.message, { ...meta })}</span>
          </p>
          <p className="mt-1 flex text-xs leading-5 text-gray-500">
            <DateTimeLabel value={data.notification.createdAt} type="datetime" />
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-center justify-between gap-y-2">
        <Menu as="div" className="relative flex-none">
          <Menu.Button
            className={clsx(
              "group relative inline-flex h-8 w-8 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
              {
                "bg-blue-50": !data.isRead,
                "bg-white": data.isRead,
              }
            )}
          >
            <span className="flex h-full w-full items-center justify-center rounded-full">
              <EllipsisVerticalIcon className="h-5 w-5 text-gray-400 group-hover:text-gray-500" aria-hidden="true" />
            </span>
          </Menu.Button>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute right-9 top-0 z-10 w-48 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="py-1">
                <Menu.Item disabled={data.isRead || !canEdit() || false}>
                  {({ active }) => (
                    <button
                      type="button"
                      className={clsx("group flex w-full items-center px-4 py-2 text-sm", {
                        "bg-gray-100 text-gray-900": active,
                        "text-gray-700": !active,
                        "cursor-not-allowed opacity-50": data.isRead || !canEdit(),
                      })}
                      onClick={handleMarkAsRead}
                    >
                      <EnvelopeOpenIcon className="mr-3 h-5 w-5 text-gray-400 " aria-hidden="true" />
                      {t("components.notification_list_item.mark_as_read")}
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item disabled={!canDelete() || false}>
                  {({ active }) => (
                    <button
                      type="button"
                      className={clsx("group flex w-full items-center px-4 py-2 text-sm", {
                        "bg-gray-100 text-red-500": active,
                        "text-red-400": !active,
                        "cursor-not-allowed opacity-50": !canDelete(),
                      })}
                      onClick={handleDeleteNotification}
                    >
                      <TrashIcon className="mr-3 h-5 w-5 text-red-400 group-hover:text-red-500" aria-hidden="true" />
                      {t("components.notification_list_item.delete_notification")}
                    </button>
                  )}
                </Menu.Item>
              </div>
            </Menu.Items>
          </Transition>
        </Menu>
        <div
          className={clsx("flex-none rounded-full p-1", {
            "bg-gray-500/20": data.isRead,
            "bg-emerald-500/20": !data.isRead,
          })}
        >
          <div
            className={clsx("h-1.5 w-1.5 rounded-full", {
              "bg-gray-500": data.isRead,
              "bg-emerald-500": !data.isRead,
            })}
          />
        </div>
      </div>
    </li>
  );
};

export default NotificationListItem;
