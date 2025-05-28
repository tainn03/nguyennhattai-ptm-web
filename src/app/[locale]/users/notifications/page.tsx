"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { CiBellOn } from "react-icons/ci";
import { mutate } from "swr";

import { EmptyListSection } from "@/components/molecules";
import { NotificationList } from "@/components/organisms";
import { useBreadcrumb } from "@/redux/actions";
import { notificationRecipientsFetcher } from "@/services/client/notificationRecipient";
import { NotificationRecipientInfo } from "@/types/strapi";
import { withOrg } from "@/utils/client";
import { equalId } from "@/utils/number";

export default withOrg(
  ({ userId, orgId, orgLink }) => {
    const t = useTranslations();
    const { setBreadcrumb } = useBreadcrumb();

    const [page, setPage] = useState(1);
    const [previousScrollTop, setPreviousScrollTop] = useState(0);
    const [notifications, setNotifications] = useState<NotificationRecipientInfo[]>([]);
    const divElementRef = useRef<HTMLDivElement>(null);

    /**
     * Updating the breadcrumb navigation.
     */
    useEffect(() => {
      setBreadcrumb([
        { name: t("user_notifications.account"), link: "/users/profile" },
        { name: t("user_notifications.title"), link: "/users/notifications" },
      ]);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * Fetches notifications for the specified organization and user, updating the state.
     * The fetched notifications are appended to the existing list of notification recipients.
     */
    const fetchNotification = useCallback(async () => {
      const result = await notificationRecipientsFetcher([
        "notification-recipients",
        { notification: { organizationId: orgId }, user: { id: userId }, page },
      ]);

      if (result) {
        const currentNotification = [...notifications];
        currentNotification.push(...result);
        setNotifications(currentNotification);
      }
    }, [notifications, orgId, page, userId]);

    useEffect(() => {
      fetchNotification();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    /**
     * Handles the scroll event for the specified <ul> element.
     * Updates the state to determine if the scroll position is near the bottom.
     */
    const handleScroll = useCallback(() => {
      if (divElementRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = divElementRef.current;
        const atBottom = scrollTop + clientHeight >= scrollHeight && scrollTop !== 0;
        if (atBottom) {
          setPage((prev) => prev + 1);
          scrollTop !== 0 && setPreviousScrollTop(scrollTop + 1 || 0);
        }
      }
    }, []);

    useEffect(() => {
      // Maintain scroll position after updating notification recipients
      if (divElementRef.current) {
        divElementRef.current.scrollTop = previousScrollTop;
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [notifications]);

    /**
     * Handles marking a notification as read.
     *
     * @param {number | undefined} id - The ID of the notification recipient to mark as read.
     * @returns {Function} A function to be used in event handlers.
     */
    const handleMarkAsRead = useCallback(
      (id?: number) => {
        const updatedNotificationList = notifications.map((item) => {
          if (equalId(item.notification.id, id)) {
            item.isRead = true;
          }
          return item;
        });

        mutate(["notifications", { notification: { organizationId: orgId }, user: { id: userId } }]);
        mutate(["unread-notification-count", { notification: { organizationId: orgId }, user: { id: userId } }]);
        setNotifications(updatedNotificationList);

        if (divElementRef?.current && divElementRef.current.scrollTop !== 0) {
          setPreviousScrollTop(divElementRef.current.scrollTop + 1 || 0);
        }
      },
      [notifications, orgId, userId]
    );

    /**
     * Handles deleting a notification item.
     *
     * @param {number} id - The ID of the notification to be deleted.
     * @returns {Function} A function to be used in event handlers.
     */
    const handleDeleteItem = useCallback(
      (id: number) => {
        mutate(["notifications", { notification: { organizationId: orgId }, user: { id: userId } }]);
        mutate(["unread-notification-count", { notification: { organizationId: orgId }, user: { id: userId } }]);

        const updatedNotificationList = notifications.filter((item) => !equalId(item.notification.id, id));
        setNotifications(updatedNotificationList);

        if (divElementRef?.current && divElementRef.current.scrollTop !== 0) {
          setPreviousScrollTop(divElementRef.current.scrollTop + 1 || 0);
        }
      },
      [notifications, orgId, userId]
    );

    return (
      <>
        {notifications.length > 0 && (
          <div
            onScroll={handleScroll}
            ref={divElementRef}
            className="ml-[60px] h-[80vh] w-[80vw] overflow-y-auto pr-[60px]"
          >
            <ul role="list" className="mx-auto max-w-3xl divide-y divide-gray-200">
              {/* Notification list */}
              <NotificationList
                notifications={notifications || []}
                onDelete={handleDeleteItem}
                onMarkAsRead={handleMarkAsRead}
                type="list"
                orgLink={orgLink}
              />
            </ul>
          </div>
        )}
        {/* Empty notification list */}
        {notifications.length === 0 && (
          <EmptyListSection
            title={t("user_notifications.no_new_notifications")}
            description={t("user_notifications.no_new_notifications_reminder")}
            icon={CiBellOn}
          />
        )}
      </>
    );
  },
  {
    resource: "notification",
    action: ["find"],
  }
);
