"use client";

import useSWR from "swr";

import { subcontractorFetcher } from "@/services/client/subcontractor";
import { SubcontractorInfo } from "@/types/strapi";

const useSubcontractor = (params: Partial<SubcontractorInfo>) => {
  const { data, error, isLoading } = useSWR([`subcontractors/${params.id}`, params], subcontractorFetcher);

  return {
    subcontractor: data,
    isLoading,
    error,
  };
};

export default useSubcontractor;
