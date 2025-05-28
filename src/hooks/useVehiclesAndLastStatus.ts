"use client";

import useSWR from "swr";

import { vehiclesAndLastStatusFetcher } from "@/services/server/vehicle";
import { VehicleInfo } from "@/types/strapi";

const useVehiclesAndLastStatus = (params: Pick<VehicleInfo, "organizationId">) => {
  const { data, error, isLoading, mutate } = useSWR(
    params.organizationId ? ["vehicles-and-last-status", params] : null,
    vehiclesAndLastStatusFetcher.bind(null, params)
  );

  return {
    vehicles: data || [],
    isLoading,
    error,
    mutate,
  };
};

export default useVehiclesAndLastStatus;
