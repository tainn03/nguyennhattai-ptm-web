"use client";

import useSWR from "swr";

import { vehicleListBySubcontractorIdFetcher } from "@/services/client/vehicle";
import { FilterRequest } from "@/types/filter";
import { VehicleInfo } from "@/types/strapi";

const useVehicleList = (params: FilterRequest<VehicleInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(
    params.subcontractorId ? ["vehicles", params] : null,
    vehicleListBySubcontractorIdFetcher
  );

  return {
    vehicles: data?.data || [],
    pagination: data?.meta?.pagination,
    isLoading,
    error,
    mutate,
  };
};

export default useVehicleList;
