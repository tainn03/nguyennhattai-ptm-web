"use client";

import { TrailerType } from "@prisma/client";
import useSWR from "swr";

import { trailerTypesFetcher } from "@/services/client/trailerType";
import { FilterRequest } from "@/types/filter";

const useTrailerTypes = (params: FilterRequest<TrailerType>) => {
  const { data, error, isLoading, mutate } = useSWR(["trailer-types", params], trailerTypesFetcher);

  return {
    trailerTypes: data?.data || [],
    pagination: data?.meta?.pagination,
    isLoading,
    error,
    mutate,
  };
};

export default useTrailerTypes;
