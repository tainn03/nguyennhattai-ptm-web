"use client";

import useSWR from "swr";

import { vehicleForTrackingFetcher } from "@/services/client/vehicle";
import { VehicleInfo } from "@/types/strapi";

const useVehiclesForTracking = (params: Pick<VehicleInfo, "organizationId">) => {
  const { data, error, isLoading, mutate } = useSWR(
    params.organizationId ? ["vehicles-for-tracking", params] : null,
    vehicleForTrackingFetcher
  );

  return {
    vehicles: data || [],
    isLoading,
    error,
    mutate,
  };
};

export default useVehiclesForTracking;
