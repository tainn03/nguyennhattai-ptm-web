"use client";

import useSWR from "swr";

import { orderMonitoringFetcher } from "@/services/client/order";
import { FilterRequest } from "@/types/filter";
import { OrderInfo } from "@/types/strapi";

const useOrderMonitoring = (params: FilterRequest<OrderInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(["order-monitoring", params], orderMonitoringFetcher);

  return {
    orders: data?.data || [],
    pagination: data?.meta?.pagination,
    isLoading,
    error,
    mutate,
  };
};

export default useOrderMonitoring;
