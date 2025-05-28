"use client";

import useSWR from "swr";

import { orderTripStatusFetcher } from "@/services/client/order";
import { OrderInfo } from "@/types/strapi";

const useOrderTripStatus = (params: Partial<OrderInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(
    params.organizationId && params.code ? ["order-trip-status", params] : null,
    orderTripStatusFetcher
  );

  return {
    order: data,
    isLoading,
    error,
    mutate,
  };
};

export default useOrderTripStatus;
