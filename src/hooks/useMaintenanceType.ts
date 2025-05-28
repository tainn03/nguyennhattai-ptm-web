"use client";

import useSWR from "swr";

import { maintenanceTypeFetcher } from "@/services/client/maintenanceType";
import { MaintenanceTypeInfo } from "@/types/strapi";

const useMaintenanceType = (params: Partial<MaintenanceTypeInfo>) => {
  const { data, error, isLoading } = useSWR([`maintenance-types/${params.id}`, params], maintenanceTypeFetcher);

  return {
    maintenanceType: data,
    isLoading,
    error,
  };
};

export default useMaintenanceType;
