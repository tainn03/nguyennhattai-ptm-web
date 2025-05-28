"use client";

import useSWR from "swr";

import { maintenanceTypeOptionsFetcher } from "@/services/client/maintenanceType";
import { MaintenanceTypeInfo } from "@/types/strapi";

const useMaintenanceTypeOptions = (params: Partial<MaintenanceTypeInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(
    ["maintenance-type-options", params],
    maintenanceTypeOptionsFetcher
  );

  return {
    maintenanceTypes: data || [],
    isLoading,
    error,
    mutate,
  };
};

export default useMaintenanceTypeOptions;
