"use client";

import useSWR from "swr";

import { vehiclesFetcher } from "@/services/client/vehicle";
import { FilterRequest } from "@/types/filter";
import { VehicleInfo } from "@/types/strapi";

const useVehicles = (params: FilterRequest<VehicleInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(["vehicles", params], vehiclesFetcher);

  return {
    vehicles: data?.data || [],
    pagination: data?.meta?.pagination,
    isLoading,
    error,
    mutate,
  };
};

export default useVehicles;
