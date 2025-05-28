"use client";

import useSWR from "swr";

import { orderTripsInfoFetcher } from "@/services/client/orderTrip";
import { FilterRequest } from "@/types/filter";
import { OrderTripInfo } from "@/types/strapi";

const useOrderTripsInfoOrderMonitoring = (params: FilterRequest<OrderTripInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(
    params.isFetch ? ["order-trips-order-monitoring", params] : null,
    orderTripsInfoFetcher
  );

  return {
    orderTripsInfo: data?.data || [],
    isLoading,
    error,
    mutate,
  };
};

export default useOrderTripsInfoOrderMonitoring;
