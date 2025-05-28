"use client";

import useSWR from "swr";

import { notificationRecipientsFetcher } from "@/services/client/notificationRecipient";
import { FilterRequest } from "@/types/filter";
import { NotificationRecipientInfo } from "@/types/strapi";

const useNotifications = (params: FilterRequest<NotificationRecipientInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(["notifications", params], notificationRecipientsFetcher);

  return {
    notifications: data,
    isLoading,
    error,
    mutate,
  };
};

export default useNotifications;
