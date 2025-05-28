"use client";

import useSWR from "swr";

import { vehicleFetcher } from "@/services/client/vehicle";
import { VehicleInfo } from "@/types/strapi";

const useVehicle = (params: Partial<VehicleInfo>) => {
  const { data, error, isLoading } = useSWR([`${params.id}/vehicles`, params], vehicleFetcher);

  return {
    vehicle: data,
    isLoading,
    error,
  };
};

export default useVehicle;
