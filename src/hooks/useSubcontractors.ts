"use client";

import useSWR from "swr";

import { subcontractorsFetcher } from "@/services/client/subcontractor";
import { FilterRequest } from "@/types/filter";
import { SubcontractorInfo } from "@/types/strapi";

const useSubcontractors = (params: FilterRequest<SubcontractorInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(["subcontractors", params], subcontractorsFetcher);

  return {
    subcontractors: data?.data || [],
    pagination: data?.meta?.pagination,
    isLoading,
    error,
    mutate,
  };
};

export default useSubcontractors;
