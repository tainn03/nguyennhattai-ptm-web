"use client";

import useSWR from "swr";

import { unitOfMeasuresFetcher } from "@/services/client/unitOfMeasure";
import { FilterRequest } from "@/types/filter";
import { UnitOfMeasureInfo } from "@/types/strapi";

const useUnitOfMeasures = (params: FilterRequest<UnitOfMeasureInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(["unit-of-measures", params], unitOfMeasuresFetcher);

  return {
    unitOfMeasures: data?.data || [],
    pagination: data?.meta?.pagination,
    isLoading,
    error,
    mutate,
  };
};

export default useUnitOfMeasures;
