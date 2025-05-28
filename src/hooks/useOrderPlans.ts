"use client";

import useSWR from "swr";

import { orderPlansFetcher } from "@/services/client/order";
import { OrderInfo } from "@/types/strapi";

const useOrderPlans = (params: Partial<OrderInfo> & { keyword?: string; orderIds: number[] }) => {
  const { data, isLoading, mutate } = useSWR(
    params.orderIds.length > 0 ? ["order-plans", params] : null,
    orderPlansFetcher
  );

  return {
    orderPlans: data ?? [],
    isLoading,
    mutate,
  };
};

export default useOrderPlans;
