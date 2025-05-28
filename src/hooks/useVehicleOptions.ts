"use client";

import useSWR from "swr";

import { vehicleOptionsFetcher } from "@/services/client/vehicle";
import { FilterRequest } from "@/types/filter";
import { VehicleInfo } from "@/types/strapi";

const useVehicleOptions = (params: FilterRequest<VehicleInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(
    params.organizationId ? ["vehicles-options", params] : null,
    vehicleOptionsFetcher
  );

  return {
    vehicles: data || [],
    isLoading,
    error,
    mutate,
  };
};

export default useVehicleOptions;
