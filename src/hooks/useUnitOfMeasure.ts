"use client";

import useSWR from "swr";

import { unitOfMeasureFetcher } from "@/services/client/unitOfMeasure";
import { UnitOfMeasureInfo } from "@/types/strapi";

const useUnitOfMeasure = (params: Partial<UnitOfMeasureInfo>) => {
  const { data, error, isLoading } = useSWR([`unit-of-measures/${params.id}`, params], unitOfMeasureFetcher);

  return {
    unitOfMeasure: data,
    isLoading,
    error,
  };
};

export default useUnitOfMeasure;
