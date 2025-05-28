"use client";

import useSWR from "swr";

import { vehicleOptionsFetcher } from "@/services/client/vehicleType";
import { VehicleTypeInfo } from "@/types/strapi";

const useVehicleTypeOptions = (params: Partial<VehicleTypeInfo> & { excludeIds?: number[] }) => {
  const { data, error, isLoading, mutate } = useSWR(
    params.organizationId ? ["vehicle-type-options", params] : null,
    vehicleOptionsFetcher
  );

  return {
    vehicleTypes: data || [],
    isLoading,
    error,
    mutate,
  };
};

export default useVehicleTypeOptions;
