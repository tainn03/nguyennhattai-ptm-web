"use client";

import useSWR from "swr";

import { baseOrdersFetcher } from "@/services/client/order";
import { FilterRequest } from "@/types/filter";
import { OrderInfo } from "@/types/strapi";

const useBaseOrders = (params: FilterRequest<OrderInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(["base-orders", params], baseOrdersFetcher);

  return {
    orders: data?.data || [],
    pagination: data?.meta?.pagination,
    isLoading,
    error,
    mutate,
  };
};

export default useBaseOrders;
