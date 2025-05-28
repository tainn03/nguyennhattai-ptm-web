"use client";

import useSWR from "swr";

import { orderPlansBaseFetcher } from "@/services/client/order";
import { FilterRequest } from "@/types/filter";
import { OrderInfo } from "@/types/strapi";

const useOrderPlansBase = (params: FilterRequest<OrderInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(["order-plans-base", params], orderPlansBaseFetcher);

  return {
    orderPlansBase: data ?? [],
    isLoading,
    error,
    mutate,
  };
};

export default useOrderPlansBase;
