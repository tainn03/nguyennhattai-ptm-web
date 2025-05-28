"use client";

import useSWR from "swr";

import { availableVehiclesForGroupFetcher } from "@/services/client/vehicle";
import { FilterRequest } from "@/types/filter";
import { VehicleInfo } from "@/types/strapi";

const useAvailableVehiclesForGroup = (params: FilterRequest<VehicleInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(
    params.organizationId ? ["available-vehicles-for-group", params] : null,
    availableVehiclesForGroupFetcher
  );

  return {
    vehicles: data?.vehicles || [],
    pagination: data?.pagination,
    isLoading,
    error,
    mutate,
  };
};

export default useAvailableVehiclesForGroup;
