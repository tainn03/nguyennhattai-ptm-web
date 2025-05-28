"use client";

import useSWR from "swr";

import { ordersByDateFetcher } from "@/services/client/order";
import { FilterRequest } from "@/types/filter";
import { OrderInfo } from "@/types/strapi";

const useOrderByDate = (params: FilterRequest<OrderInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(
    params.orderDate ? ["order-plans-by-date", params] : null,
    ordersByDateFetcher
  );

  return {
    orders: data?.data ?? [],
    pagination: data?.meta?.pagination,
    isLoading,
    error,
    mutate,
  };
};

export default useOrderByDate;
