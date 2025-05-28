"use client";

import { TrailerType } from "@prisma/client";
import useSWR from "swr";

import { trailerTypeFetcher } from "@/services/client/trailerType";

const useTrailerType = (params: Partial<TrailerType>) => {
  const { data, error, isLoading } = useSWR([`trailer-types/${params.id}`, params], trailerTypeFetcher);

  return {
    trailerType: data,
    isLoading,
    error,
  };
};

export default useTrailerType;
