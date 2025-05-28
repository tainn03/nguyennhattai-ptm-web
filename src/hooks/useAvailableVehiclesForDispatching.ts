"use client";

import useSWR from "swr";

import { availableVehiclesForDispatchingFetcher } from "@/services/client/vehicle";
import { FilterRequest } from "@/types/filter";
import { VehicleInfo } from "@/types/strapi";

const useAvailableVehiclesForDispatching = (params: FilterRequest<VehicleInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(
    ["available-vehicles-for-dispatching", params],
    availableVehiclesForDispatchingFetcher
  );

  return {
    vehicles: data?.data || [],
    pagination: data?.meta?.pagination,
    isLoading,
    error,
    mutate,
  };
};

export default useAvailableVehiclesForDispatching;
