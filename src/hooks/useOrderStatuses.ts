"use client";

import useSWR from "swr";

import { orderStatusesFetcher } from "@/services/client/orderStatus";
import { OrderInfo } from "@/types/strapi";

const useOrderStatuses = (params: Partial<OrderInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(["orders-statuses", params], orderStatusesFetcher);

  return {
    order: data,
    isLoading,
    error,
    mutate,
  };
};

export default useOrderStatuses;
