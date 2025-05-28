"use client";

import useSWR from "swr";

import { orderDispatchVehicleInfoFetcher } from "@/services/client/order";
import { OrderInfo } from "@/types/strapi";

const useOrderDispatchVehicleInfo = (params: Partial<OrderInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(
    params.code ? [`order-dispatch-vehicle-info/${params.code}`, params] : null,
    orderDispatchVehicleInfoFetcher
  );

  return {
    order: data,
    isLoading,
    error,
    mutate,
  };
};

export default useOrderDispatchVehicleInfo;
