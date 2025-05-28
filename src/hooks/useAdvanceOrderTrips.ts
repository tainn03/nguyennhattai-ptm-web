"use client";

import useSWR from "swr";

import { advanceOrderTripsFetcher } from "@/actions/orderTrip";
import { FilterRequest } from "@/types/filter";
import { OrderTripInfo } from "@/types/strapi";

const useAdvanceOrderTrips = (params: FilterRequest<OrderTripInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(
    params.startDate && params.endDate ? ["advance-order-trips", params] : null,
    advanceOrderTripsFetcher.bind(null, params)
  );

  return {
    orderTrips: data?.data || [],
    pagination: data?.meta?.pagination,
    isLoading,
    error,
    mutate,
  };
};

export default useAdvanceOrderTrips;
