"use client";

import useSWR from "swr";

import { warehouseOptionsFetcher } from "@/actions/warehouse";
import { WarehouseInfo } from "@/types/strapi";

const useWarehouseOptions = (params: Partial<WarehouseInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(
    params.organizationId ? ["warehouse-options", params] : null,
    warehouseOptionsFetcher
  );

  return {
    warehouses: data?.data || [],
    isLoading,
    error,
    mutate,
  };
};

export default useWarehouseOptions;
