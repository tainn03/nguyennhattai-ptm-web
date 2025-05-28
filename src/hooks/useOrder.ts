"use client";

import useSWR from "swr";

import { orderFetcher } from "@/services/client/order";
import { OrderInfo } from "@/types/strapi";

const useOrder = (params: Partial<OrderInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(
    params.code ? [`orders/${params.code}`, params] : null,
    orderFetcher
  );

  return {
    order: data,
    isLoading,
    error,
    mutate,
  };
};

export default useOrder;
