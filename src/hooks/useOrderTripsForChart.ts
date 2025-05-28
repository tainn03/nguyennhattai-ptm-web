"use client";

import useSWR from "swr";

import { orderTripsForChartFetcher } from "@/services/client/orderTrip";
import { FilterRequest } from "@/types/filter";
import { OrderTripInfo } from "@/types/strapi";

const useOrderTripsForChart = (params: FilterRequest<OrderTripInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(
    params.organizationId ? ["monitoring-order-trips", params] : null,
    orderTripsForChartFetcher
  );

  return {
    orderTripsForChart: data || [],
    isLoading,
    error,
    mutate,
  };
};

export default useOrderTripsForChart;
