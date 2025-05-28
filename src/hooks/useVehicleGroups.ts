"use client";

import useSWR from "swr";

import { vehicleGroupsFetcher } from "@/services/client/vehicleGroup";
import { FilterRequest } from "@/types/filter";
import { VehicleGroupInfo } from "@/types/strapi";

const useVehicleGroups = (params: FilterRequest<VehicleGroupInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(
    params.organizationId ? ["vehicle-groups", params] : null,
    vehicleGroupsFetcher
  );

  return {
    vehicleGroups: data?.vehicleGroups || [],
    pagination: data?.pagination,
    isLoading,
    error,
    mutate,
  };
};

export default useVehicleGroups;
