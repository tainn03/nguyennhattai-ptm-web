"use client";

import useSWR from "swr";

import { advanceFetcher } from "@/services/client/advance";
import { AdvanceInfo } from "@/types/strapi";

const useAdvance = (params: Partial<AdvanceInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(["advances", params], advanceFetcher);

  return {
    advance: data,
    isLoading,
    error,
    mutate,
  };
};

export default useAdvance;
