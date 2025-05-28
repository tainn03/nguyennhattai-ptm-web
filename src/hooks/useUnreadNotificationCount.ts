"use client";

import useSWR from "swr";

import { unreadNotificationCountFetcher } from "@/services/client/notificationRecipient";
import { NotificationRecipientInfo } from "@/types/strapi";

const useUnreadNotificationCount = (params: Partial<NotificationRecipientInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(
    ["unread-notification-count", params],
    unreadNotificationCountFetcher
    /* Disabled interval request unread notification count.
    {
      refreshInterval: NOTIFICATION_FETCH_INTERVAL,
      refreshWhenHidden: true,
      refreshWhenOffline: true,
    } */
  );

  return {
    unreadNotificationCount: data,
    isLoading,
    error,
    mutate,
  };
};

export default useUnreadNotificationCount;
