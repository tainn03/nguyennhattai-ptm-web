"use client";

import useSWR from "swr";

import { driverOptionsOrderMonitoringFetcher } from "@/services/client/driver";
import { DriverInfo } from "@/types/strapi";

const useDriverOptionsOrderMonitoring = (params: Partial<DriverInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(
    ["driver-options-order-monitoring", params],
    driverOptionsOrderMonitoringFetcher
  );

  return {
    drivers: data || [],
    isLoading,
    error,
    mutate,
  };
};

export default useDriverOptionsOrderMonitoring;
