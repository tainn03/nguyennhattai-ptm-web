"use client";

import useSWR from "swr";

import { advancesFetcher } from "@/services/client/advance";
import { FilterRequest } from "@/types/filter";
import { AdvanceInfo } from "@/types/strapi";

const useAdvances = (params: FilterRequest<AdvanceInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(["advances", params], advancesFetcher);

  return {
    advances: data?.data || [],
    pagination: data?.meta?.pagination,
    isLoading,
    error,
    mutate,
  };
};

export default useAdvances;
