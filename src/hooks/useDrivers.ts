"use client";

import useSWR from "swr";

import { driversFetcher } from "@/services/client/driver";
import { FilterRequest } from "@/types/filter";
import { DriverInfo } from "@/types/strapi";

const useDrivers = (params: FilterRequest<DriverInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(["drivers", params], driversFetcher);

  return {
    drivers: data?.data || [],
    pagination: data?.meta?.pagination,
    isLoading,
    error,
    mutate,
  };
};

export default useDrivers;
