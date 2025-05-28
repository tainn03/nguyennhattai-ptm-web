"use client";

import useSWR from "swr";

import { getProcessByOrder } from "@/services/client/order";

const useProcessByOrder = (orderId: number) => {
  const { data, error, isLoading, mutate } = useSWR(`process-by-order-${orderId}`, () => getProcessByOrder(orderId));

  return {
    order: data,
    isLoading,
    error,
    mutate,
  };
};

export default useProcessByOrder;
