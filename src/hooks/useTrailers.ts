"use client";

import useSWR from "swr";

import { trailersFetcher } from "@/services/client/trailer";
import { FilterRequest } from "@/types/filter";
import { TrailerInfo } from "@/types/strapi";

const useTrailers = (params: FilterRequest<TrailerInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(["trailers", params], trailersFetcher);

  return {
    trailers: data?.data || [],
    pagination: data?.meta?.pagination,
    isLoading,
    error,
    mutate,
  };
};

export default useTrailers;
