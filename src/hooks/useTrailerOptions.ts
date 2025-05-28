"use client";

import useSWR from "swr";

import { trailerOptionsFetcher } from "@/services/client/trailer";
import { TrailerInfo } from "@/types/strapi";

const useTrailerOptions = (params: Partial<TrailerInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(["trailers", params], trailerOptionsFetcher);

  return {
    trailers: data || [],
    isLoading,
    error,
    mutate,
  };
};

export default useTrailerOptions;
