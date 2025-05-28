"use client";

import useSWR from "swr";

import { driverOptionsFetcher } from "@/services/client/driver";
import { FilterRequest } from "@/types/filter";
import { DriverInfo } from "@/types/strapi";

const useDriverOptions = (params: FilterRequest<DriverInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(["driver-options", params], driverOptionsFetcher);

  return {
    drivers: data || [],
    isLoading,
    error,
    mutate,
  };
};

export default useDriverOptions;
