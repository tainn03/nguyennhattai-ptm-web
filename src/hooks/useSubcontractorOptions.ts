"use client";

import useSWR from "swr";

import { subcontractorOptionsFetcher } from "@/services/client/subcontractor";
import { SubcontractorInfo } from "@/types/strapi";

const useSubcontractorOptions = (params: Partial<SubcontractorInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(["subcontractors", params], subcontractorOptionsFetcher);

  return {
    subcontractors: data || [],
    isLoading,
    error,
    mutate,
  };
};

export default useSubcontractorOptions;
