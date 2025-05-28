"use client";

import useSWR from "swr";

import { ordersFetcher } from "@/services/client/order";
import { FilterRequest } from "@/types/filter";
import { OrderInfo } from "@/types/strapi";

const useOrders = (params: FilterRequest<OrderInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(["orders", params], ordersFetcher);

  return {
    orders: data?.data || [],
    pagination: data?.meta?.pagination,
    isLoading,
    error,
    mutate,
  };
};

export default useOrders;
