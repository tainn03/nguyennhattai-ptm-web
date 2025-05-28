"use client";

import { Popover, Transition } from "@headlessui/react";
import { BellIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { CiBellOn } from "react-icons/ci";

import { Badge, Link } from "@/components/atoms";
import { Button, EmptyListSection } from "@/components/molecules";
import { NotificationList } from "@/components/organisms";
import { useAuth, useBrowserNotification, useNotifications, usePermission, useUnreadNotificationCount } from "@/hooks";
import { useNotification } from "@/redux/actions";
import { ApiResult, HttpStatusCode } from "@/types/api";
import { post } from "@/utils/api";
import { ensureString } from "@/utils/string";

const NotificationMenu = () => {
  const t = useTranslations();
  const { orgId, orgLink, userId } = useAuth();
  const { showNotification } = useNotification();
  const { requestPermission } = useBrowserNotification();
  const [isLoading, setIsLoading] = useState(false);
  const { canFind, canEdit } = usePermission("notification");

  const {
    notifications,
    mutate: mutateNotification,
    isLoading: isNotificationLoading,
  } = useNotifications({
    notification: { organizationId: orgId },
    user: { id: userId },
  });

  const { unreadNotificationCount, mutate: mutateUnreadCount } = useUnreadNotificationCount({
    notification: { organizationId: orgId },
    user: { id: userId },
  });

  const prevNotificationListRef = useRef(notifications);

  useEffect(() => {
    mutateNotification();

    if (unreadNotificationCount && unreadNotificationCount > 0) {
      prevNotificationListRef.current = notifications;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadNotificationCount]);

  /* Move this logic to hook useNatsWebsocket
  const handleNotificationClick = useCallback(
    (item: NotificationRecipientInfo) => () => {
      const meta = JSON.parse(JSON.stringify(item.notification.meta));

      if (item.notification.type) {
        const navigationLink = getNotificationNavigationLink(orgLink, item.notification.type, {
          orderCode: meta.orderCode,
          ...(item.notification.type === NotificationType.TRIP_NEW_MESSAGE && { tripCode: meta.tripCode }),
        });

        if (navigationLink) {
          router.push(navigationLink);
        }
      }
    },
    [orgLink, router]
  ); */

  useEffect(() => {
    requestPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Move this logic to hook useNatsWebsocket
   * Update last notification sent at of user setting when push notify to browser or play notify sound.
   * Reload useAuth to get new last notification sent at.
   *
  const handleUpdateLastReadNotification = useCallback(async () => {
    if (notifications) {
      const { data } = await updateLastNotificationSentAt({
        id: Number(user?.setting.id),
        lastNotificationSentAt: notifications[0].notification.createdAt || null,
      });
      data && reloadUserProfile();
    }
  }, [notifications, reloadUserProfile, user?.setting.id]); */

  /* Move this logic to hook useNatsWebsocket
  useEffect(() => {
    if (
      notifications &&
      notifications.length > 0 &&
      (!user?.setting.lastNotificationSentAt ||
        calculateDateDifferenceInMilliseconds(
          user?.setting.lastNotificationSentAt,
          notifications[0].notification.createdAt as Date
        ) < 0) &&
      unreadNotificationCount &&
      unreadNotificationCount > 0
    ) {
      const newNotifications = notifications?.filter((item) => {
        const prevNotifications = prevNotificationListRef.current;
        return !prevNotifications?.find((prev) => prev.id === item.id) && !item.isRead;
      });

      if (newNotifications && newNotifications.length > 0) {
        dispatch<boolean>({
          type: NOTIFICATION_UPDATE_HAVE_NEW_NOTIFICATION,
          payload: true,
        });

        newNotifications.forEach((item) => {
          const meta = JSON.parse(JSON.stringify(item.notification.meta));

          if (document.hidden) {
            pushNotification({
              title: t(item.notification?.subject, { ...meta }),
              body: t(item.notification?.message, { ...meta }),
              onClick: handleNotificationClick(item),
            });
          }
        });

        if (!document.hidden) {
          playSound();
        }
        handleUpdateLastReadNotification();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications]); */

  /**
   * Handles the action to mark all notifications as read.
   * Sends a request to the server to mark notifications as read, and updates the notification list and unread count accordingly.
   * Shows a notification in case of an error during the process.
   */
  const handleMarkAsReadAll = useCallback(async () => {
    if ((unreadNotificationCount || 0) === 0) {
      return;
    }
    setIsLoading(true);
    const result = await post<ApiResult>(`/api${orgLink}/notifications/mark-as-read`, {});

    if (result.status !== HttpStatusCode.Ok) {
      showNotification({
        color: "error",
        title: t("common.message.error_title"),
        message: t("common.message.save_error_unknown", { name: t("components.notification_menu.title") }),
      });
    }

    mutateNotification();
    mutateUnreadCount();
    setIsLoading(false);
  }, [mutateNotification, mutateUnreadCount, orgLink, showNotification, t, unreadNotificationCount]);

  /**
   * Handles the deletion of a notification. Invokes mutation functions to update the notification list
   * and the count of unread notifications. This function is typically called when a user deletes a notification.
   */
  const handleDeleteNotification = useCallback(() => {
    mutateNotification();
    mutateUnreadCount();
  }, [mutateNotification, mutateUnreadCount]);

  /**
   * Handles the mark as read of a notification. Invokes mutation functions to update the notification list
   * and the count of unread notifications. This function is typically called when a user deletes a notification.
   */
  const handleMarkAsRead = useCallback(() => {
    mutateNotification();
    mutateUnreadCount();
  }, [mutateNotification, mutateUnreadCount]);

  return (
    <>
      {canFind() && (
        <Popover className="relative">
          <Popover.Button className="relative rounded-full bg-white p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            <span className="absolute -inset-1.5" />
            <span className="sr-only">{t("components.notification_menu.view_notifications")}</span>
            <BellIcon className="h-6 w-6" aria-hidden="true" />
            {!!unreadNotificationCount && (unreadNotificationCount || 0) > 0 && (
              <Badge
                label={unreadNotificationCount > 99 ? "99+" : ensureString(unreadNotificationCount)}
                rounded
                color="error"
                className="absolute -top-1.5 left-4 !text-xs !ring-0"
              />
            )}
          </Popover.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Popover.Panel className="fixed right-0 z-10 mt-3 flex w-screen px-4 sm:absolute sm:-right-12 sm:max-w-sm sm:p-0">
              <div className="flex w-screen flex-auto flex-col divide-y overflow-hidden rounded-3xl bg-white text-sm leading-6 shadow-lg ring-1 ring-gray-900/5">
                <div className="flex flex-row items-center gap-6 p-4">
                  <h1 className="text-sm font-semibold leading-7 text-gray-900">
                    {t("components.notification_menu.title")}
                  </h1>
                  <Button
                    loading={isLoading}
                    size="small"
                    type="button"
                    className="ml-auto"
                    disabled={(unreadNotificationCount || 0) === 0 || isNotificationLoading || !canEdit()}
                    onClick={handleMarkAsReadAll}
                  >
                    {t("components.notification_menu.mark_all_as_read")}
                  </Button>
                </div>
                <NotificationList
                  notifications={notifications || []}
                  onDelete={handleDeleteNotification}
                  onMarkAsRead={handleMarkAsRead}
                  type="menu"
                  orgLink={orgLink}
                />
                {(notifications || []).length === 0 && (
                  <EmptyListSection
                    title={t("components.notification_menu.no_new_notifications")}
                    description={t("components.notification_menu.no_notifications")}
                    icon={CiBellOn}
                    className="!border-0 [&_p]:px-4"
                  />
                )}
                {(notifications || []).length > 0 && (
                  <div className="p-4 text-right text-sm">
                    <Link useDefaultStyle href="/users/notifications">
                      {t("components.notification_menu.load_more")}
                      <span aria-hidden="true"> &rarr;</span>
                    </Link>
                  </div>
                )}
              </div>
            </Popover.Panel>
          </Transition>
        </Popover>
      )}
    </>
  );
};

export default NotificationMenu;
