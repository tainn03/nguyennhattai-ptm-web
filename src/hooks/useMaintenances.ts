"use client";

import useSWR from "swr";

import { maintenancesFetcher } from "@/services/client/maintenance";
import { FilterRequest } from "@/types/filter";
import { MaintenanceInfo } from "@/types/strapi";

const useMaintenances = (params: FilterRequest<MaintenanceInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(["maintenances", params], maintenancesFetcher);

  return {
    maintenances: data?.data || [],
    pagination: data?.meta?.pagination,
    isLoading,
    error,
    mutate,
  };
};

export default useMaintenances;
