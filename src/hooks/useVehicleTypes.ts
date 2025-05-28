"use client";

import useSWR from "swr";

import { vehicleTypesFetcher } from "@/services/client/vehicleType";
import { FilterRequest } from "@/types/filter";
import { VehicleTypeInfo } from "@/types/strapi";

const useVehicleTypes = (params: FilterRequest<VehicleTypeInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(["vehicle-types", params], vehicleTypesFetcher);

  return {
    vehicleTypes: data?.data || [],
    pagination: data?.meta?.pagination,
    isLoading,
    error,
    mutate,
  };
};

export default useVehicleTypes;
