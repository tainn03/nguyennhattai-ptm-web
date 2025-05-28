"use client";

import useSWR from "swr";

import { vehiclesForTrailerFetcher } from "@/services/client/vehicle";
import { VehicleInfo } from "@/types/strapi";

const useVehiclesForTrailer = (params: Partial<VehicleInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(
    params.organizationId ? ["vehicles-for-trailer", params] : null,
    vehiclesForTrailerFetcher
  );

  return {
    vehicles: data || [],
    isLoading,
    error,
    mutate,
  };
};

export default useVehiclesForTrailer;
