"use client";

import useSWR from "swr";

import { maintenanceTypesFetcher } from "@/services/client/maintenanceType";
import { FilterRequest } from "@/types/filter";
import { MaintenanceTypeInfo } from "@/types/strapi";

const useMaintenanceTypes = (params: FilterRequest<MaintenanceTypeInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(["maintenance-types", params], maintenanceTypesFetcher);

  return {
    maintenanceTypes: data?.data || [],
    pagination: data?.meta?.pagination,
    isLoading,
    error,
    mutate,
  };
};

export default useMaintenanceTypes;
