"use client";

import { Vehicle } from "@prisma/client";
import useSWR from "swr";

import { vehiclesForTimelineFetcher } from "@/services/client/vehicle";
import { FilterRequest } from "@/types/filter";

const useVehiclesForTimeline = (params: FilterRequest<Vehicle>) => {
  const { data, error, isLoading, mutate } = useSWR(
    params.organizationId ? ["vehicle-monitoring/vehicles", params] : null,
    vehiclesForTimelineFetcher
  );

  return {
    vehiclesTimeline: data?.data || [],
    isLoading,
    pagination: data?.meta?.pagination,
    error,
    mutate,
  };
};

export default useVehiclesForTimeline;
