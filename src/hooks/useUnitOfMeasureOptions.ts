"use client";

import useSWR from "swr";

import { unitOfMeasureOptionsFetcher } from "@/services/client/unitOfMeasure";
import { UnitOfMeasureInfo } from "@/types/strapi";

const useUnitOfMeasure = (params: Partial<UnitOfMeasureInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(
    params.organizationId ? ["unit-of-measure", params] : null,
    unitOfMeasureOptionsFetcher
  );

  return {
    unitOfMeasures: data || [],
    isLoading,
    error,
    mutate,
  };
};

export default useUnitOfMeasure;
