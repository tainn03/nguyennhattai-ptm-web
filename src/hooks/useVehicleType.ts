"use client";

import useSWR from "swr";

import { vehicleTypeFetcher } from "@/services/client/vehicleType";
import { VehicleTypeInfo } from "@/types/strapi";

const useVehicleType = (params: Partial<VehicleTypeInfo>) => {
  const { data, error, isLoading } = useSWR([`vehicle-types/${params.id}`, params], vehicleTypeFetcher);

  return {
    vehicleType: data,
    isLoading,
    error,
  };
};

export default useVehicleType;
