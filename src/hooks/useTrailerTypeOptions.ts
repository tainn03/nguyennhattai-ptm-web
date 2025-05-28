"use client";

import useSWR from "swr";

import { trailerTypeOptions } from "@/services/client/trailerType";
import { TrailerTypeInfo } from "@/types/strapi";

const useTrailerTypeOptions = (params: Partial<TrailerTypeInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(["trailer-types", params], trailerTypeOptions);

  return {
    trailerTypes: data || [],
    isLoading,
    error,
    mutate,
  };
};

export default useTrailerTypeOptions;
