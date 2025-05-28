"use client";

import useSWR from "swr";

import { fuelLogsFetcher } from "@/services/client/fuelLog";
import { FilterRequest } from "@/types/filter";
import { OrderTripInfo } from "@/types/strapi";

const useFuelLogs = (params: FilterRequest<OrderTripInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(["fuel-logs", params], fuelLogsFetcher);

  return {
    fuelLogs: data?.data || [],
    pagination: data?.meta?.pagination,
    isLoading,
    error,
    mutate,
  };
};

export default useFuelLogs;
