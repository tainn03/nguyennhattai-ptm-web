"use client";

import useSWR from "swr";

import { trailerFetcher } from "@/services/client/trailer";
import { TrailerInfo } from "@/types/strapi";

const useTrailer = (params: Partial<TrailerInfo>) => {
  const { data, error, isLoading } = useSWR([`trailers/${params.id}`, params], trailerFetcher);

  return {
    trailer: data,
    isLoading,
    error,
  };
};

export default useTrailer;
