"use client";

import useSWR from "swr";

import { vehicleGroupFetcher } from "@/services/client/vehicleGroup";
import { VehicleGroupInfo } from "@/types/strapi";

const useVehicleGroup = (params: Partial<VehicleGroupInfo>) => {
  const { data, error, isLoading, mutate } = useSWR([`vehicle-group/${params.id}`, params], vehicleGroupFetcher);

  return {
    vehicleGroup: data,
    isLoading,
    error,
    mutate,
  };
};

export default useVehicleGroup;
