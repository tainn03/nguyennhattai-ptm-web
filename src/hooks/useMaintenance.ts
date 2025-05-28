"use client";

import useSWR from "swr";

import { maintenanceFetcher } from "@/services/client/maintenance";
import { MaintenanceInfo } from "@/types/strapi";

const useMaintenance = (params: Partial<MaintenanceInfo>) => {
  const { data, error, isLoading } = useSWR([`maintenances/${params.id}`, params], maintenanceFetcher);

  return {
    maintenance: data,
    isLoading,
    error,
  };
};

export default useMaintenance;
