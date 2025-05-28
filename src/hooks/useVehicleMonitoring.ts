"use client";

import useSWR from "swr";

import { vehicleMonitoringFetcher } from "@/actions/vehicle";
import { FilterRequest } from "@/types/filter";
import { VehicleInfo } from "@/types/strapi";

const useVehicleMonitoring = (params: FilterRequest<VehicleInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(["vehicle-monitoring", params], vehicleMonitoringFetcher);

  return {
    vehicleMonitoring: data?.data || [],
    pagination: data?.meta?.pagination,
    isLoading,
    error,
    mutate,
  };
};

export default useVehicleMonitoring;
